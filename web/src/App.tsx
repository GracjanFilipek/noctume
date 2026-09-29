import { useCallback, useEffect, useState } from "react";
import { useServer } from "./useServer.ts";
import { api } from "./api.ts";
import { useOutcomes } from "./useOutcomes.ts";
import { CharacterSheetPreview } from "./creatures/CharacterSheetPreview.tsx";
import { TopBar } from "./panels/TopBar.tsx";
import { Panels, type TabId } from "./panels/Panels.tsx";
import { Station } from "./station/Station.tsx";
import { HireModal } from "./panels/HireModal.tsx";

export function App() {
  const { state, connection } = useServer();
  const { outcomes } = useOutcomes(state);
  const [tab, setTab] = useState<TabId>("agents");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hiring, setHiring] = useState(false);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error]);

  /** Runs an API call, surfacing failures as a toast. */
  const act = useCallback(async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const selectAgent = useCallback((id: string) => {
    setSelectedAgentId(id);
    setTab("agents");
  }, []);

  /** Dropping a task card on a desk adds that agent to the task's team. */
  const addToTeam = useCallback(
    (taskId: string, agentId: string) => {
      const task = state?.tasks.find((t) => t.id === taskId);
      if (!task || task.assigneeIds.includes(agentId)) return;
      act(() => api("PATCH", `/tasks/${taskId}`, { assigneeIds: [...task.assigneeIds, agentId] }));
    },
    [act, state],
  );

  if (location.hash === "#arkusz") return <CharacterSheetPreview />;

  return (
    <div className="app">
      <TopBar state={state} connection={connection} act={act} />
      <main className="main">
        <section className="office">
          {state?.settings.runner === "mock" && (
            <div className="sim-banner">
              <svg width="16" height="10" viewBox="0 0 16 10" aria-hidden="true">
                <path d="M1 5 Q4 0 7 5 T13 5" fill="none" stroke="#8FA597" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              TRYB SYMULACJI — agenci nie wołają modelu
            </div>
          )}
          {state && (
            <Station
              state={state}
              outcomes={outcomes}
              selectedAgentId={selectedAgentId}
              onSelectAgent={selectAgent}
              onDropTask={addToTeam}
              onHire={() => setHiring(true)}
            />
          )}
        </section>
        <aside className="side">
          <Panels
            state={state}
            tab={tab}
            onTab={setTab}
            selectedAgentId={selectedAgentId}
            onSelectAgent={setSelectedAgentId}
            act={act}
            outcomes={outcomes}
            onHire={() => setHiring(true)}
          />
        </aside>
      </main>
      {hiring && state && <HireModal runner={state.settings.runner} onClose={() => setHiring(false)} act={act} />}
      {error && (
        <div className="toast" role="alert" onClick={() => setError(null)}>
          {error}
        </div>
      )}
    </div>
  );
}
