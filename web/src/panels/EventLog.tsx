import { useEffect, useRef } from "react";
import type { AgentEvent, GameState } from "@agent-tycoon/shared";
import { agentLabel } from "../game.ts";

const time = (at: number) => new Date(at).toLocaleTimeString("pl-PL");

/** Live list of agent events that sticks to the bottom as new ones arrive. Shows who acted when several agents did. */
export function EventLog({ state, events }: { state: GameState; events: AgentEvent[] }) {
  const ref = useRef<HTMLOListElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [events.length]);

  if (events.length === 0) return <p className="muted">Brak zdarzeń.</p>;
  const multi = new Set(events.map((e) => e.agentId)).size > 1;
  return (
    <ol className="event-log" ref={ref}>
      {events.map((e, i) => (
        <li key={i} className={`ev ev-${e.kind}`}>
          <span className="muted">{time(e.at)}</span> {multi && <strong>{agentLabel(state, e.agentId)}:</strong>} {e.summary}
        </li>
      ))}
    </ol>
  );
}
