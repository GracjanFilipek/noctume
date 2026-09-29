import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Agent, GameState, Role } from "@agent-tycoon/shared";
import { Creature } from "../creatures/Creature.tsx";
import { formOf } from "../creatures/types.ts";
import { currentTask, TASK_DRAG_TYPE, visualStateOf } from "../game.ts";
import type { Outcome } from "../useOutcomes.ts";
import { PlusIcon, RoleGlyph, StateSign, SuccessSign, FailureSign } from "../ui/icons.tsx";
import { ZONES } from "../ui/roles.ts";
import { plural } from "../panels/AgentsTab.tsx";
import { Background } from "./Background.tsx";
import { Hull, type ConduitState } from "./Hull.tsx";
import { DORMANT_SLOTS, HANGAR, PODS, STAGE_H, STAGE_W, WORK_MODULES } from "./layout.ts";
import { placeAgents, type Seats } from "./placement.ts";

interface Props {
  state: GameState;
  outcomes: Record<string, Outcome>;
  selectedAgentId: string | null;
  onSelectAgent: (id: string) => void;
  onDropTask: (taskId: string, agentId: string) => void;
  onHire: () => void;
}

/**
 * The station scene (replaces the 4×3 desk grid). Layers back to front, per VisualSystem:
 * L0–L2 background · L3 hull · L4 conduits · L5 agents · L7 labels and state signs (DOM, always sharp).
 * Drawn on the mockup's 1120×840 stage and scaled to fit the available space.
 */
export function Station({ state, outcomes, selectedAgentId, onSelectAgent, onDropTask, onHire }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const seats = useRef<Seats>(new Map());

  useLayoutEffect(() => {
    const el = host.current!;
    const fit = () => setScale(Math.min(el.clientWidth / STAGE_W, el.clientHeight / STAGE_H));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const placements = useMemo(() => placeAgents(state.agents, seats.current), [state.agents]);
  const built = useMemo(() => new Set(state.agents.map((a) => a.role).filter((r) => WORK_MODULES[r].source === "added")), [state.agents]);
  const conduits = useMemo(() => conduitStates(state.agents), [state.agents]);
  const backlog = state.tasks.filter((t) => t.status === "backlog");
  const packages = backlog.map((t) => leadRole(state, t.assigneeIds));
  const podsOccupied = placements.filter((p) => p.area.kind === "pods").length;
  const dormant = DORMANT_SLOTS.filter((s) => !(s.hostFor && built.has(s.hostFor)));
  const selected = placements.find((p) => p.agent.id === selectedAgentId);

  return (
    <div ref={host} className="station-host">
      <div className="station-frame" style={{ width: STAGE_W * scale, height: STAGE_H * scale }}>
      <div className="station" style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})` }}>
        <Background />
        <Hull conduits={conduits} built={built} podsOccupied={podsOccupied} packages={packages} hangarFlow={backlog.length > 0} />

        {/* L5 agents — sorted by y so lower sprites overlap higher ones */}
        {[...placements]
          .sort((a, b) => a.at.y - b.at.y)
          .map(({ agent, at, size, pill }) => {
            const vs = visualStateOf(agent, outcomes[agent.id]);
            const task = currentTask(state, agent.id);
            const lastStep = task?.events.filter((e) => e.agentId === agent.id).at(-1)?.summary;
            return (
              <div
                key={agent.id}
                className={`agent-sprite ${agent.id === selectedAgentId ? "is-selected" : ""}`}
                style={{ transform: `translate(${at.x - size / 2}px, ${at.y - size / 2}px)`, width: size, height: size }}
                onClick={() => onSelectAgent(agent.id)}
                onDragOver={(e) => e.dataTransfer.types.includes(TASK_DRAG_TYPE) && e.preventDefault()}
                onDrop={(e) => {
                  const taskId = e.dataTransfer.getData(TASK_DRAG_TYPE);
                  if (taskId) onDropTask(taskId, agent.id);
                }}
                title={lastStep ? `${agent.name}: ${lastStep}` : agent.name}
              >
                <Creature role={agent.role} state={vs} form={formOf(agent.level)} size={size} />
                <NamePill agent={agent} vs={vs} size={size} side={pill} />
              </div>
            );
          })}

        {/* selection reticle + leader line to the panel card (AgentDetail.dc.html) */}
        {selected && (
          <svg className="layer no-hit" width={STAGE_W} height={STAGE_H} viewBox={`0 0 ${STAGE_W} ${STAGE_H}`} aria-hidden="true">
            <Reticle x={selected.at.x} y={selected.at.y} half={selected.size / 2 + 14} />
          </svg>
        )}

        {/* L7 zone labels */}
        {(Object.keys(WORK_MODULES) as Role[])
          .filter((r) => WORK_MODULES[r].source === "mockup" || built.has(r))
          .map((r) => (
            <ZoneLabel key={r} at={WORK_MODULES[r].labelAt} icon={<RoleGlyph role={r} />} name={ZONES[r].name} hint={r === "analyst" ? undefined : ZONES[r].hint} />
          ))}
        <ZoneLabel at={HANGAR.labelAt} icon={<HangarGlyph />} name="HANGAR ZLECEŃ" hint={`${backlog.length} ${plural(backlog.length, "paczka", "paczki", "paczek")}`} />
        <ZoneLabel at={PODS.labelAt} icon={<StateSign status="idle" size={10} />} name="KAPSUŁY REGENERACJI" hint={`${podsOccupied}/${PODS.centers.length}`} />

        {/* dormant modules: activation = hiring */}
        {dormant.map(({ id, rect }) => (
          <div key={id} className="dormant-slot" style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}>
            <span>MODUŁ UŚPIONY</span>
            <button type="button" aria-label="Aktywuj moduł — zatrudnij agenta" onClick={onHire}>
              <PlusIcon />
              Aktywuj
            </button>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}

function NamePill({ agent, vs, size, side }: { agent: Agent; vs: ReturnType<typeof visualStateOf>; size: number; side: "below" | "right" | "pod" }) {
  const style: React.CSSProperties = side === "right" ? { left: size + 6, top: size / 2 - 12, transform: "none" } : { top: size + 4 };
  return (
    <div className={`name-pill is-${vs} side-${side}`} style={style}>
      {vs === "success" ? <SuccessSign /> : vs === "failure" ? <FailureSign /> : <StateSign status={agent.status} color={`var(--role-${agent.role})`} />}
      <span className="name-pill-name">{agent.name}</span>
      <span className="name-pill-level">· {agent.level}</span>
    </div>
  );
}

function ZoneLabel({ at, icon, name, hint }: { at: { x: number; y: number }; icon: React.ReactNode; name: string; hint?: string }) {
  return (
    <div className="zone-label" style={{ left: at.x, top: at.y }}>
      {icon}
      <span className="zone-name">{name.toUpperCase()}</span>
      {hint && <span className="zone-hint">{hint}</span>}
    </div>
  );
}

function Reticle({ x, y, half }: { x: number; y: number; half: number }) {
  const l = x - half;
  const r = x + half;
  const t = y - half;
  const b = y + half + 12;
  return (
    <>
      <g className="at-reticle" fill="none" stroke="#E8EEE4" strokeWidth="2" strokeLinecap="round">
        <path d={`M${l} ${t + 12} V${t} H${l + 12}`} />
        <path d={`M${r - 12} ${t} H${r} V${t + 12}`} />
        <path d={`M${r} ${b - 12} V${b} H${r - 12}`} />
        <path d={`M${l + 12} ${b} H${l} V${b - 12}`} />
      </g>
      <path d={`M${r} ${t + 28} C${r + 104} ${t + 28} ${STAGE_W - 110} 120 ${STAGE_W} 120`} fill="none" stroke="#8FA597" strokeWidth="1.5" strokeDasharray="3 5" />
      <circle cx={r} cy={t + 28} r="3" fill="#E8EEE4" />
    </>
  );
}

const HangarGlyph = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
    <rect x="1" y="1" width="8" height="8" rx="2" fill="none" stroke="#AAB9AE" strokeWidth="1.6" />
    <path d="M1 5 H9" stroke="#AAB9AE" strokeWidth="1.2" />
  </svg>
);

/** A zone's conduit flows while someone of that role works there; a stuck agent breaks it. */
function conduitStates(agents: Agent[]): Record<Role, ConduitState> {
  const out = { researcher: "quiet", writer: "quiet", analyst: "quiet", developer: "quiet", reviewer: "quiet" } as Record<Role, ConduitState>;
  for (const a of agents) {
    if (a.status === "working") out[a.role] = "flow";
  }
  for (const a of agents) {
    if (a.status === "stuck" && out[a.role] !== "flow") out[a.role] = "broken";
  }
  return out;
}

function leadRole(state: GameState, ids: string[]): Role | undefined {
  const team = ids.map((id) => state.agents.find((a) => a.id === id)).filter((a): a is Agent => !!a);
  return (team.find((a) => a.role !== "reviewer") ?? team[0])?.role;
}
