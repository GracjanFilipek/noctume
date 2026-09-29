import type { Task } from "@agent-tycoon/shared";
import { api } from "../api.ts";
import { fileUrl } from "../game.ts";

const KIND: Record<string, string> = { pdf: "PDF", docx: "DOCX", html: "HTML", md: "MD", csv: "CSV", svg: "SVG" };

/** The task's workspace files, with open / download links and a Finder shortcut. */
export function Files({ task, act }: { task: Task; act: (fn: () => Promise<unknown>) => void }) {
  const files = task.result?.files ?? [];
  if (!files.length) return <p className="caption-sm text-3">Brak plików.</p>;
  // Deliverable first: wynik.pdf/docx before its wynik.html source, notes last.
  const rank = (f: string) => (/^wynik\.(pdf|docx)$/.test(f) ? 0 : f.startsWith("wynik.") ? 1 : 2);
  const sorted = [...files].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));

  return (
    <div className="stack-8">
      <ul className="files">
        {sorted.map((f) => (
          <li key={f} className={rank(f) === 0 ? "deliverable" : ""}>
            <span className="file-kind">{KIND[f.split(".").pop() ?? ""] ?? "PLIK"}</span>
            <a href={fileUrl(task.id, f)} target="_blank" rel="noreferrer" className="grow">
              {f}
            </a>
            <a className="file-dl" href={fileUrl(task.id, f, true)} title="Pobierz" aria-label={`Pobierz ${f}`}>
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <path d="M6 1 V9 M2.5 5.5 L6 9 L9.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </li>
        ))}
      </ul>
      <div>
        <button type="button" className="btn-ghost btn-sm" onClick={() => act(() => api("POST", `/tasks/${task.id}/reveal`))}>
          Pokaż w Finderze
        </button>
      </div>
    </div>
  );
}
