import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Agent, GameState, Role } from "@agent-tycoon/shared";
import { Creature } from "../creatures/Creature.tsx";
import { currentTask, TASK_DRAG_TYPE, visualStateOf } from "../game.ts";
import type { Outcome } from "../useOutcomes.ts";
import { PackageIcon, PlusIcon, RoleGlyph, StateSign, SuccessSign, FailureSign } from "../ui/icons.tsx";
import { setDrag, useDrag, type Drag } from "../dragState.ts";
import { ZONES } from "../ui/roles.ts";
import { ROLES } from "@agent-tycoon/shared";
import { plural } from "../panels/AgentsTab.tsx";
import { Background } from "./Background.tsx";
import { Hull, type ConduitState } from "./Hull.tsx";
import { HANGAR, PODS, STAGE_H, STAGE_W, WORK_MODULES } from "./layout.ts";
import { planStation, type StationMemory } from "./placement.ts";

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
  const memory = useRef<StationMemory>({ seats: new Map(), annexes: new Map() });
  const drag = useDrag();
  const [hover, setHover] = useState<string | null>(null);

  useLayoutEffect(() => {
    const el = host.current!;
    const fit = () => setScale(Math.min(el.clientWidth / STAGE_W, el.clientHeight / STAGE_H));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const plan = useMemo(() => planStation(state.agents, memory.current), [state.agents]);
  const { placements, podsOccupied, dormant } = plan;
  /** VisualSystem: from 7 agents the rest show only their state sign (names on the selected, the stuck and on hover). */
  const compactNames = state.agents.length >= 7;
  const built = useMemo(() => new Set(state.agents.map((a) => a.role).filter((r) => WORK_MODULES[r].source === "added")), [state.agents]);
  const conduits = useMemo(() => conduitStates(state.agents), [state.agents]);
  const backlog = state.tasks.filter((t) => t.status === "backlog");
  const selected = placements.find((p) => p.agent.id === selectedAgentId);
  const target = drag && hover ? placements.find((p) => p.agent.id === hover) : undefined;
  const dragged = drag ? state.tasks.find((t) => t.id === drag.taskId) : undefined;
  const endDrag = () => {
    setHover(null);
    setDrag(null);
  };
  const hangarHint =
    drag?.source === "hangar" ? `${backlog.length - 1} w doku · 1 w ręku` : `${backlog.length} ${plural(backlog.length, "paczka", "paczki", "paczek")}`;

  return (
    <div ref={host} className="station-host">
      <Background />
      <div className="station-frame" style={{ width: STAGE_W * scale, height: STAGE_H * scale }}>
      <div className="station" style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})` }}>
        <Hull
          conduits={conduits}
          built={built}
          podsOccupied={podsOccupied}
          podsII={plan.podsII}
          annexes={plan.annexes}
          dormant={dormant}
          hangarFlow={backlog.length > 0}
          hangarActive={!!drag}
        />

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
                data-agent-id={agent.id}
                data-stage-x={at.x}
                data-stage-y={at.y - size / 6}
                className={`agent-sprite ${agent.id === selectedAgentId ? "is-selected" : ""}`}
                style={{ transform: `translate(${at.x - size / 2}px, ${at.y - size / 2}px)`, width: size, height: size }}
                onClick={() => onSelectAgent(agent.id)}
                onDragOver={(e) => e.dataTransfer.types.includes(TASK_DRAG_TYPE) && e.preventDefault()}
                onDragEnter={(e) => e.dataTransfer.types.includes(TASK_DRAG_TYPE) && setHover(agent.id)}
                onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setHover((h) => (h === agent.id ? null : h))}
                onDrop={(e) => {
                  const taskId = e.dataTransfer.getData(TASK_DRAG_TYPE);
                  if (taskId) onDropTask(taskId, agent.id);
                  endDrag();
                }}
                title={lastStep ? `${agent.name}: ${lastStep}` : agent.name}
              >
                <Creature role={agent.role} state={vs} size={size} />
                <NamePill agent={agent} vs={vs} size={size} side={pill} compact={compactNames && agent.id !== selectedAgentId && vs !== "stuck"} />
              </div>
            );
          })}

        {/* packages waiting in the Hangar — lift one and drop it on an agent */}
        {backlog.slice(0, HANGAR.slots.length).map((task, i) => {
          const { x, y } = HANGAR.slots[i];
          const role = leadRole(state, task.assigneeIds);
          const lifted = drag?.taskId === task.id;
          return (
            <div
              key={task.id}
              className={`hangar-pkg ${lifted ? "is-lifted" : "at-bob"}`}
              style={{ left: x - 18, top: y - 18, animationDelay: `${i * 0.5}s` }}
              draggable
              title={`${task.title} — przeciągnij na agenta`}
              onDragStart={(e) => {
                e.dataTransfer.setData(TASK_DRAG_TYPE, task.id);
                e.dataTransfer.effectAllowed = "copy";
                setDrag({ taskId: task.id, role, source: "hangar", slot: i });
              }}
              onDragEnd={endDrag}
            >
              <PackageIcon role={lifted ? undefined : role} />
            </div>
          );
        })}

        {drag && target && dragged && <DropFeedback drag={drag} target={target} inTeam={dragged.assigneeIds.includes(target.agent.id)} />}

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
        <ZoneLabel at={HANGAR.labelAt} icon={<HangarGlyph />} name="HANGAR ZLECEŃ" hint={hangarHint} active={!!drag} />
        <ZoneLabel at={PODS.labelAt} icon={<StateSign status="idle" size={10} />} name="KAPSUŁY REGENERACJI" hint={`${podsOccupied}/${plan.podCapacity}`} />

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

function NamePill({
  agent,
  vs,
  size,
  side,
  compact,
}: {
  agent: Agent;
  vs: ReturnType<typeof visualStateOf>;
  size: number;
  side: "below" | "right" | "pod";
  compact: boolean;
}) {
  const style: React.CSSProperties = side === "right" ? { left: size + 6, top: size / 2 - 12, transform: "none" } : { top: size + 4 };
  return (
    <div className={`name-pill is-${vs} side-${side} ${compact ? "is-compact" : ""}`} style={style}>
      {vs === "success" ? <SuccessSign /> : vs === "failure" ? <FailureSign /> : <StateSign status={agent.status} color={`var(--role-${agent.role})`} />}
      <span className="name-pill-name">{agent.name}</span>
    </div>
  );
}

function ZoneLabel({ at, icon, name, hint, active }: { at: { x: number; y: number }; icon: React.ReactNode; name: string; hint?: string; active?: boolean }) {
  return (
    <div className={`zone-label ${active ? "is-active" : ""}`} style={{ left: at.x, top: at.y }}>
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

/**
 * While a package hovers over an agent (Tasks.dc.html): a pulsing drop outline, a beam from where the package
 * came from, and "Upuść → …". The mockup's "pasuje: <rola>" needs a required role, which tasks don't have.
 */
function DropFeedback({ drag, target, inTeam }: { drag: Drag; target: { agent: Agent; at: { x: number; y: number }; size: number }; inTeam: boolean }) {
  const { x, y } = target.at;
  const color = drag.role ? `var(--role-${drag.role})` : "#B8A0FF";
  const from = drag.source === "hangar" && drag.slot !== undefined ? HANGAR.slots[drag.slot] : { x: STAGE_W, y: 405 };
  const midX = (from.x + x) / 2;
  const w = target.size + 32;
  const h = target.size + 44;
  return (
    <>
      <svg className="layer no-hit" width={STAGE_W} height={STAGE_H} viewBox={`0 0 ${STAGE_W} ${STAGE_H}`} aria-hidden="true">
        <path className="at-flow" d={`M${from.x} ${from.y} C${midX} ${from.y} ${midX} ${y} ${x} ${y}`} fill="none" stroke={color} strokeWidth="2" strokeDasharray="4 8" strokeLinecap="round" opacity="0.8" />
        <rect className="at-pulse" x={x - w / 2} y={y - h / 2 + 6} width={w} height={h} rx="36" fill="none" stroke="#E8EEE4" strokeWidth="2" strokeDasharray="6 5" />
      </svg>
      <div
        className="drop-hint no-hit"
        style={{
          // Near the right edge the hint flips to the left of the target so it never leaves the stage.
          ...(x + target.size / 2 + HINT_W > STAGE_W ? { right: STAGE_W - (x - target.size / 2 - 12) } : { left: x + target.size / 2 + 12 }),
          top: y - 24,
          borderColor: color,
        }}
      >
        {inTeam ? (
          <span>
            {target.agent.name} już jest w zespole tej paczki
          </span>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M6 1 V9 M2.5 5.5 L6 9 L9.5 5.5" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Upuść → {target.agent.name} dołącza do zespołu</span>
            <span style={{ color }}>· {ROLES[target.agent.role].label}</span>
          </>
        )}
      </div>
    </>
  );
}

/** Approximate width of the drop hint, used to keep it on the stage. */
const HINT_W = 330;

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
