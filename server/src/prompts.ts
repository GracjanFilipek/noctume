import { FORMATS, ROLES, TIERS, type Agent, type ModelTier, type OutputFormat, type ReviewVerdict, type Role, type Task, type TaskStep } from "@agent-tycoon/shared";

export const MAX_LESSONS_IN_PROMPT = 5;
export const MAX_TURNS: Record<ModelTier, number> = { haiku: 15, sonnet: 25, opus: 30 };
export const REVIEW_MAX_TURNS = 12;

export const VERDICT_SCHEMA = {
  type: "object",
  properties: {
    score: { type: "integer", minimum: 1, maximum: 10 },
    approved: { type: "boolean" },
    notes: { type: "string" },
    fixes: { type: "array", items: { type: "string" } },
  },
  required: ["score", "approved", "notes"],
};

/** Full system prompt for a run: the agent's master prompt + fixed house rules + recent lessons. */
export function composeSystemPrompt(agent: Agent, workspaceDir: string): string {
  const parts = [
    agent.systemPrompt,
    [
      "Zasady pracy w studiu:",
      `- Pracujesz WYŁĄCZNIE w katalogu roboczym zadania: ${workspaceDir}`,
      "- Nie czytasz, nie tworzysz i nie modyfikujesz żadnych plików poza tym katalogiem. Nie używasz ścieżek typu ../ ani ścieżek absolutnych spoza niego.",
      "- Wyniki zapisujesz jako pliki w tym katalogu.",
      "- Na koniec odpowiadasz krótkim podsumowaniem: co zrobiłeś i jakie pliki powstały.",
      "- Piszesz po polsku, chyba że brief mówi inaczej.",
    ].join("\n"),
  ];
  const lessons = agent.lessons.slice(-MAX_LESSONS_IN_PROMPT);
  if (lessons.length) {
    parts.push(["Wnioski z Twoich poprzednich zadań:", ...lessons.map((l) => `- ${l}`)].join("\n"));
  }
  return parts.join("\n\n");
}

/** The file the final deliverable is written to (before any server-side conversion). */
export function deliverableFile(format: OutputFormat): string | undefined {
  switch (format) {
    case "pdf":
    case "docx":
    case "html":
      return "wynik.html";
    case "md":
      return "wynik.md";
    case "csv":
      return "wynik.csv";
    case "auto":
      return undefined;
  }
}

function formatInstructions(format: OutputFormat): string {
  const html =
    "zapisz jako wynik.html: kompletny, samodzielny dokument HTML (<!doctype html>, <meta charset=\"utf-8\">, cały CSS wbudowany w <style>, " +
    "bez zewnętrznych zasobów, skryptów i obrazków z sieci). Zadbaj o estetyczny, czytelny wygląd do druku na A4: nagłówki, akapity, listy, tabele z obramowaniem.";
  switch (format) {
    case "pdf":
      return `Dokument końcowy ${html} Studio samo zamieni go na PDF — nie próbuj tworzyć PDF-a.`;
    case "docx":
      return `Dokument końcowy ${html} Studio samo zamieni go na plik Word — nie próbuj tworzyć DOCX. Używaj prostego HTML (nagłówki, akapity, listy, tabele), bez zaawansowanego CSS.`;
    case "html":
      return `Dokument końcowy ${html}`;
    case "md":
      return "Dokument końcowy zapisz jako wynik.md (Markdown).";
    case "csv":
      return "Dane końcowe zapisz jako wynik.csv (UTF-8, przecinek jako separator, pierwszy wiersz to nagłówki). Jeśli potrzebny jest komentarz, dopisz krótki wynik.md.";
    case "auto":
      return (
        "Sam dobierz format adekwatny do zadania, nazywając plik końcowy wynik.<rozszerzenie>: " +
        "tekst/notatka → wynik.md, dane tabelaryczne → wynik.csv, dokument do wysłania lub druku → wynik.html, kod → pliki źródłowe."
      );
  }
}

function teamList(team: Agent[], me: Agent): string {
  let n = 0;
  return team
    .map((a) => {
      const reviewer = a.role === "reviewer";
      const label = `${a.name} (${ROLES[a.role].label})${reviewer ? " — oceni wynik na końcu" : ""}${a.id === me.id ? " ← TY" : ""}`;
      return reviewer ? `- ${label}` : `${++n}. ${label}`;
    })
    .join("\n");
}

function header(task: Task): string {
  return `Zadanie: ${task.title}\n\nBrief:\n${task.brief || "(brak — zinterpretuj tytuł)"}\n\nOczekiwany format wyniku: ${FORMATS[task.format].label}`;
}

function previousWork(steps: TaskStep[], team: Agent[]): string {
  const done = steps.filter((s) => s.status === "done" && s.kind !== "review");
  if (!done.length) return "";
  const lines = done.map((s) => {
    const a = team.find((t) => t.id === s.agentId);
    return `- ${a?.name ?? "?"} (${a ? ROLES[a.role].label : "?"}): ${s.summary ?? "(bez podsumowania)"}`;
  });
  return `\n\nCo już zrobili koledzy (ich pliki są w katalogu roboczym — zacznij od przejrzenia ich narzędziami Glob i Read):\n${lines.join("\n")}`;
}

export function workPrompt(task: Task, team: Agent[], me: Agent, isFinal: boolean, workerIndex: number): string {
  const solo = team.filter((a) => a.role !== "reviewer").length === 1;
  const duty = isFinal
    ? `${solo ? "Wykonujesz to zadanie samodzielnie" : "Jesteś ostatni w kolejce i odpowiadasz za wynik końcowy"}. ${formatInstructions(task.format)}`
    : `Przygotuj swój wkład dla kolejnych osób z zespołu i zapisz go w pliku notatki-${workerIndex + 1}-${slug(me.name)}.md. ` +
      "Nie twórz dokumentu końcowego — zrobi to ostatnia osoba w kolejce.";
  return `${header(task)}\n\nZespół:\n${teamList(team, me)}\n\nTwoja część: ${duty}${previousWork(task.steps, team)}`;
}

export function revisionPrompt(task: Task, verdicts: { reviewer: Agent; verdict: ReviewVerdict }[]): string {
  const reviews = verdicts
    .map(({ reviewer, verdict }) => {
      const fixes = verdict.fixes?.length ? `\n  Poprawki:\n${verdict.fixes.map((f) => `  - ${f}`).join("\n")}` : "";
      return `- ${reviewer.name}: ocena ${verdict.score}/10. ${verdict.notes}${fixes}`;
    })
    .join("\n");
  return (
    `${header(task)}\n\nRecenzja wyniku zespołu:\n${reviews}\n\n` +
    `Wprowadź poprawki w plikach wynikowych w katalogu roboczym (przeczytaj je najpierw). ${formatInstructions(task.format)} ` +
    (task.format === "pdf" || task.format === "docx" ? "Pomiń uwagi dotyczące konwersji do PDF/DOCX — to robi studio. " : "") +
    "Na koniec krótko wypisz, co zmieniłeś."
  );
}

/** Tells reviewers (and revisers) that PDF/DOCX conversion is the studio's job, so nobody penalises or attempts it. */
function conversionNote(format: OutputFormat): string {
  if (format !== "pdf" && format !== "docx") return "";
  const target = format === "pdf" ? "PDF" : "Word (DOCX)";
  return (
    `\nWAŻNE: zespół oddaje wynik.html, a studio PO recenzji automatycznie zamieni go na ${target}. ` +
    `Brak pliku ${target} NIE jest błędem — oceniasz treść i wygląd wynik.html jako dokumentu do druku. Nie proponuj konwersji.`
  );
}

export function reviewPrompt(task: Task, files: string[], round: number): string {
  return (
    `${header(task)}\n\nPliki w katalogu roboczym:\n${files.map((f) => `- ${f}`).join("\n") || "(brak plików!)"}\n\n` +
    `Oceń wynik pracy zespołu${round > 0 ? " po poprawkach" : ""}. Przeczytaj pliki narzędziem Read (nie zmieniaj ich).` +
    `${conversionNote(task.format)}\n` +
    "Kryteria: zgodność z briefem, jakość merytoryczna, konkretność, forma.\n" +
    "Zwróć werdykt: score 1–10; approved=true tylko jeśli wynik nadaje się do oddania klientowi bez zmian (zwykle score ≥ 7); " +
    "notes: 2–4 zdania uzasadnienia; fixes: lista konkretnych poprawek treści lub formy, które zespół wprowadzi edytując pliki (pusta, jeśli approved)."
  );
}

export const PROMPT_WRITER_SYSTEM =
  "Jesteś ekspertem od projektowania promptów systemowych dla agentów AI. Piszesz precyzyjne, praktyczne prompty, bez ogólników.";

export function masterPromptRequest(input: { name: string; role: Role; model: ModelTier; description: string }): string {
  return [
    "Napisz master prompt (system prompt) dla nowego agenta w studiu agentów AI.",
    "",
    `Imię: ${input.name}`,
    `Rola: ${ROLES[input.role].label}`,
    `Poziom: ${TIERS[input.model].label} (model ${input.model})`,
    "Opis od szefa:",
    input.description.trim() || "(brak — oprzyj się na roli)",
    "",
    "Wymagania:",
    "- Po polsku, w drugiej osobie („Jesteś…”).",
    "- Sekcje w Markdown: Tożsamość, Specjalizacja i wiedza, Sposób pracy (krok po kroku), Standard jakości, Czego unikać.",
    "- Konkretnie i praktycznie, 150–350 słów. Rozwiń opis szefa w szczegółowe kompetencje i nawyki pracy.",
    input.role === "reviewer"
      ? "- To recenzent: skup się na kryteriach oceny, wyłapywaniu błędów i formułowaniu konkretnych poprawek."
      : "- Agent pracuje w zespole: czyta materiały poprzedników i zostawia czytelne pliki dla następnych.",
    "- Nie opisuj narzędzi ani zasad dostępu do plików — studio dołączy je samo.",
    "Zwróć WYŁĄCZNIE treść promptu, bez wstępu i komentarzy.",
  ].join("\n");
}

/** Used when the player hires without generating a prompt. */
export function fallbackPrompt(role: Role, description: string): string {
  const base: Record<Role, string> = {
    researcher: "Jesteś researcherem w studiu agentów AI. Zbierasz rzetelne informacje, podajesz źródła i zwięzłe wnioski.",
    writer: "Jesteś copywriterem w studiu agentów AI. Piszesz klarowne, angażujące teksty po polsku, dopasowane do odbiorcy.",
    developer: "Jesteś programistą w studiu agentów AI. Piszesz czysty, działający kod i krótko opisujesz, jak go użyć.",
    analyst: "Jesteś analitykiem w studiu agentów AI. Strukturyzujesz problem, porównujesz opcje i dajesz konkretną rekomendację.",
    reviewer: "Jesteś recenzentem w studiu agentów AI. Krytycznie oceniasz jakość pracy i wskazujesz konkretne poprawki.",
  };
  return description.trim() ? `${base[role]}\n\nSpecjalizacja: ${description.trim()}` : base[role];
}

function slug(text: string) {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ł/g, "l")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "agent"
  );
}
