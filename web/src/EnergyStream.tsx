import { useEffect, useRef, useState } from "react";
import type { OutcomeEvent } from "./useOutcomes.ts";
import { STAGE_W } from "./station/layout.ts";

/** Flash first (700 ms), then the energy flies to the counter (1.2 s, ease-out), then "+1" by the counter. */
const FLASH_MS = 500;
const FLIGHT_MS = 1200;
const LINGER_MS = 1200;

interface Flight {
  id: number;
  path: string;
  end: { x: number; y: number };
}

/**
 * Success → an energy orb flies from the delivering agent on the station to the PROJEKTY tab counter
 * (VisualSystem: "kula energii leci do licznika"; the credits counter of the mockup became Projects).
 * Drawn in a fixed full-window layer, because it crosses from the scaled scene into the panel.
 */
export function EnergyStream({ events }: { events: OutcomeEvent[] }) {
  const [flights, setFlights] = useState<Flight[]>([]);
  const launched = useRef(new Set<number>());

  useEffect(() => {
    for (const e of events) {
      if (e.kind !== "success" || launched.current.has(e.id)) continue;
      launched.current.add(e.id);
      const sprite = document.querySelector<HTMLElement>(`[data-agent-id="${e.sourceAgentId}"]`);
      const stage = document.querySelector(".station")?.getBoundingClientRect();
      const to = (document.querySelector("#tab-projects .tab-count") ?? document.querySelector("#tab-projects"))?.getBoundingClientRect();
      if (!sprite || !stage || !to) continue;
      // The agent's target point on the stage (not its mid-transition box), mapped through the stage scale.
      const scale = stage.width / STAGE_W;
      const sx = stage.left + Number(sprite.dataset.stageX) * scale;
      const sy = stage.top + Number(sprite.dataset.stageY) * scale;
      const ex = to.left + to.width / 2;
      const ey = to.top + to.height / 2;
      // Rise first, then arc over to the counter.
      const path = `M${sx} ${sy} C${sx} ${sy - 140} ${ex - 160} ${ey + 40} ${ex} ${ey}`;
      const flight = { id: e.id, path, end: { x: ex, y: ey } };
      setFlights((f) => [...f, flight]);
      setTimeout(() => setFlights((f) => f.filter((x) => x.id !== e.id)), FLASH_MS + FLIGHT_MS + LINGER_MS);
    }
  }, [events]);

  if (!flights.length) return null;
  return (
    <div className="energy-layer" aria-hidden="true">
      {flights.map((f) => (
        <div key={f.id}>
          <svg className="energy-svg">
            <path className="at-flow energy-trail" d={f.path} fill="none" stroke="#FFB547" strokeWidth="3" strokeDasharray="4 8" strokeLinecap="round" />
          </svg>
          <div
            className="energy-orb"
            style={{ offsetPath: `path("${f.path}")`, animationDelay: `${FLASH_MS}ms`, animationDuration: `${FLIGHT_MS}ms` }}
          />
          <div className="energy-plus" style={{ left: f.end.x + 14, top: f.end.y - 13, animationDelay: `${FLASH_MS + FLIGHT_MS - 150}ms` }}>
            +1
          </div>
        </div>
      ))}
    </div>
  );
}
