import { useEffect, useRef, useState } from "react";
import type { GameState } from "@agent-tycoon/shared";

export type Outcome = "success" | "failure";

/** How long the event plays before the agent returns to its base state (VisualSystem: flash 700 ms + flight 1.2 s; failure restarts after 3 s). */
export const OUTCOME_MS: Record<Outcome, number> = { success: 1900, failure: 3000 };

export interface OutcomeEvent {
  id: number;
  kind: Outcome;
  taskId: string;
  agentIds: string[];
  at: number;
}

/**
 * Detects task completions from state changes (no API change): in_progress/review → done is a success for the team,
 * → failed is a failure (cancellations excluded). Returns the per-agent transient state and the recent events.
 */
export function useOutcomes(state: GameState | null) {
  const previous = useRef<Map<string, string> | null>(null);
  const nextId = useRef(1);
  const [events, setEvents] = useState<OutcomeEvent[]>([]);

  useEffect(() => {
    if (!state) return;
    const now = new Map(state.tasks.map((t) => [t.id, t.status]));
    const before = previous.current;
    previous.current = now;
    if (!before) return; // first snapshot: don't replay history

    const fresh: OutcomeEvent[] = [];
    for (const task of state.tasks) {
      const was = before.get(task.id);
      if (was !== "in_progress" && was !== "review") continue;
      if (task.status === "done") {
        fresh.push({ id: nextId.current++, kind: "success", taskId: task.id, agentIds: task.assigneeIds, at: Date.now() });
      } else if (task.status === "failed" && task.error !== "Anulowano") {
        fresh.push({ id: nextId.current++, kind: "failure", taskId: task.id, agentIds: task.assigneeIds, at: Date.now() });
      }
    }
    if (!fresh.length) return;
    setEvents((list) => [...list, ...fresh]);
    for (const e of fresh) {
      setTimeout(() => setEvents((list) => list.filter((x) => x.id !== e.id)), OUTCOME_MS[e.kind]);
    }
  }, [state]);

  const byAgent: Record<string, Outcome> = {};
  for (const e of events) {
    for (const id of e.agentIds) {
      // failure outranks success (VisualSystem sign priority: utknął › porażka › sukces › bezczynny)
      if (byAgent[id] !== "failure") byAgent[id] = e.kind;
    }
  }
  return { outcomes: byAgent, events };
}
