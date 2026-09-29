import type { GameState } from "@agent-tycoon/shared";
import type { Outcome } from "../useOutcomes.ts";
import { AgentsTab } from "./AgentsTab.tsx";
import { TasksTab } from "./TasksTab.tsx";
import { ProjectsTab } from "./ProjectsTab.tsx";

export type TabId = "agents" | "tasks" | "projects";

interface Props {
  state: GameState | null;
  tab: TabId;
  onTab: (tab: TabId) => void;
  selectedAgentId: string | null;
  onSelectAgent: (id: string | null) => void;
  act: (fn: () => Promise<unknown>) => void;
  outcomes: Record<string, Outcome>;
  onHire: () => void;
}

export function Panels({ state, tab, onTab, selectedAgentId, onSelectAgent, act, outcomes, onHire }: Props) {
  const queued = state?.tasks.filter((t) => t.status === "backlog").length ?? 0;
  const done = state?.tasks.filter((t) => t.status === "done").length ?? 0;
  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: "agents", label: "AGENCI" },
    { id: "tasks", label: "ZADANIA", count: queued },
    { id: "projects", label: "PROJEKTY", count: done },
  ];

  return (
    <div className="panel">
      <nav aria-label="Zakładki panelu" className="panel-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            id={`tab-${t.id}`}
            aria-current={t.id === tab ? "page" : undefined}
            className={`panel-tab ${t.id === tab ? "active" : ""}`}
            onClick={() => onTab(t.id)}
          >
            {t.label}
            {!!t.count && <span className="tab-count">{t.count}</span>}
          </button>
        ))}
      </nav>
      <div className="panel-body">
        {!state && <p className="muted">Czekam na serwer…</p>}
        {state && tab === "agents" && (
          <AgentsTab state={state} selectedAgentId={selectedAgentId} onSelectAgent={onSelectAgent} act={act} outcomes={outcomes} onHire={onHire} />
        )}
        {state && tab === "tasks" && <TasksTab state={state} act={act} />}
        {state && tab === "projects" && <ProjectsTab state={state} act={act} />}
      </div>
    </div>
  );
}
