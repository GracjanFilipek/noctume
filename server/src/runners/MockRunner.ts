import { writeFile } from "node:fs/promises";
import path from "node:path";
import { TOOL_ICONS } from "@agent-tycoon/shared";
import { CancelledError, type AgentRunner, type RunOutput, type RunRequest, type RunStep } from "./AgentRunner.ts";

const THOUGHTS = ["Analizuję brief…", "Rozbijam zadanie na kroki…", "Porównuję kilka podejść…", "Dopracowuję szczegóły…"];

/** Pretends to work: emits plausible steps with delays and fakes files/verdicts. Costs nothing. */
export class MockRunner implements AgentRunner {
  private pending = new Map<string, () => void>();

  async run(req: RunRequest, onStep: (step: RunStep) => void): Promise<RunOutput> {
    const started = Date.now();
    const tool = (name: string, detail: string) =>
      onStep({ kind: "tool_use", tool: name, summary: `${TOOL_ICONS[name] ?? "🔧"} ${name}: ${detail}` });
    const done = (text: string, structured?: unknown): RunOutput => ({
      text,
      structured,
      turns: 3,
      durationMs: Date.now() - started,
      cost: 0,
    });

    onStep({ kind: "started", summary: `Start (mock ${req.model})` });
    await this.sleep(req.id);
    onStep({ kind: "thinking", summary: `💭 ${pick(THOUGHTS)}` });
    await this.sleep(req.id);

    if (/\[błąd\]|\[error\]/i.test(req.prompt)) {
      throw new Error("Mock: agent utknął (brief zawiera [błąd])");
    }

    if (req.purpose === "prompt") {
      return done(mockMasterPrompt(req.prompt));
    }

    if (req.purpose === "review") {
      tool("Glob", "**/*");
      await this.sleep(req.id);
      tool("Read", req.expectedFile ?? "wynik");
      await this.sleep(req.id);
      onStep({ kind: "tool_use", tool: "StructuredOutput", summary: "📋 Werdykt gotowy" });
      // First review of a task tends to ask for fixes, so the revision loop is visible in mock mode too.
      const firstPass = !req.prompt.includes("po poprawkach");
      const verdict = firstPass
        ? { score: 6, approved: false, notes: "(mock) Brakuje konkretów i przykładów.", fixes: ["Dodaj przykład", "Skróć wstęp"] }
        : { score: 8, approved: true, notes: "(mock) Poprawki wprowadzone, można oddać." };
      return done(JSON.stringify(verdict), verdict);
    }

    if (req.tools.includes("WebSearch")) {
      tool("WebSearch", "źródła do briefu");
      await this.sleep(req.id);
    }
    const file = req.expectedFile ?? "notatki.md";
    tool("Write", file);
    await writeFile(path.join(req.cwd, file), mockFile(file));
    await this.sleep(req.id);
    return done(`(mock) Zapisałem ${file}.`);
  }

  cancel(id: string) {
    this.pending.get(id)?.();
  }

  /** Random 1–2.5 s delay that rejects with CancelledError when the run is cancelled. */
  private sleep(id: string) {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        resolve();
      }, 1000 + Math.random() * 1500);
      this.pending.set(id, () => {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(new CancelledError());
      });
    });
  }
}

function mockFile(file: string): string {
  const note = "Wynik wygenerowany przez MockRunner — to nie jest prawdziwa praca.";
  if (file.endsWith(".html")) {
    return `<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>Mock</title>
<style>body{font-family:Georgia,serif;margin:2cm;color:#222}h1{color:#1a4b8c}</style></head>
<body><h1>Dokument (mock)</h1><p>${note}</p><ul><li>Punkt pierwszy</li><li>Punkt drugi — zażółć gęślą jaźń</li></ul></body></html>\n`;
  }
  if (file.endsWith(".csv")) return `kolumna,wartość\nprzykład,1\ninny,2\n`;
  return `# Wynik (mock)\n\n${note}\n`;
}

function mockMasterPrompt(request: string): string {
  const description = request.match(/Opis od szefa:\n([\s\S]*?)\n\n/)?.[1]?.trim() ?? "";
  return [
    "## Tożsamość",
    "Jesteś członkiem studia agentów AI (prompt wygenerowany w trybie Mock).",
    "",
    "## Specjalizacja",
    description || "(brak opisu)",
    "",
    "## Sposób pracy",
    "- Zaczynasz od zrozumienia celu i odbiorcy.",
    "- Pracujesz iteracyjnie i sprawdzasz swoje wyniki.",
    "",
    "## Standard jakości",
    "- Konkretnie, bez lania wody, z przykładami.",
  ].join("\n");
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}
