import { FORMATS, type GameState } from "@agent-tycoon/shared";
import { agentById } from "../game.ts";
import { Files } from "./Files.tsx";
import { ResultStats, Steps } from "./TasksTab.tsx";

export function ProjectsTab({ state, act }: { state: GameState; act: (fn: () => Promise<unknown>) => void }) {
  const done = state.tasks.filter((t) => t.status === "done").reverse();

  return (
    <div className="stack-12">
      <div className="stack-4">
        <h2 className="h-section">PROJEKTY</h2>
        <span className="caption-sm text-3">ukończone paczki i ich pliki</span>
      </div>
      {done.length === 0 && <p className="body-sm text-3">Brak ukończonych projektów.</p>}
      {done.map((t) => (
        <article key={t.id} className="project stack-8">
          <div className="row-between">
            <h3 className="project-title">{t.title}</h3>
            {t.score !== undefined && <span className="score">{t.score}/10</span>}
          </div>
          <span className="caption-sm text-2">
            {t.assigneeIds.map((id, i) => {
              const a = agentById(state, id);
              return (
                <span key={id} style={a ? { color: `var(--role-${a.role})` } : undefined}>
                  {i > 0 && <span className="text-3"> → </span>}
                  {a?.name ?? "(zwolniony)"}
                </span>
              );
            })}
            <span className="text-3"> · {FORMATS[t.format].label}</span>
          </span>
          <Files task={t} act={act} />
          <details>
            <summary>Szczegóły</summary>
            <div className="stack-8">
              <pre className="result">{t.result?.text}</pre>
              <Steps state={state} task={t} />
              {t.result && <ResultStats result={t.result} />}
            </div>
          </details>
        </article>
      ))}
    </div>
  );
}
