import { OFFICE, ROLES, TIERS, type Agent, type AgentStatus, type GameState } from "@agent-tycoon/shared";
import { currentTask, sortedAgents, stuckTask, taskProgress, visualStateOf } from "../game.ts";
import { Creature } from "../creatures/Creature.tsx";
import { formOf } from "../creatures/types.ts";
import type { Outcome } from "../useOutcomes.ts";
import { DormantModuleIcon, FailureSign, IdleSign, StateSign, StuckSign, SuccessSign, WorkingSign } from "../ui/icons.tsx";
import { roleVar } from "../ui/roles.ts";
import { AgentDetail } from "./AgentDetail.tsx";

export const MAX_AGENTS = OFFICE.cols * OFFICE.rows;

interface Props {
  state: GameState;
  selectedAgentId: string | null;
  onSelectAgent: (id: string | null) => void;
  act: (fn: () => Promise<unknown>) => void;
  outcomes: Record<string, Outcome>;
  onHire: () => void;
}

export function AgentsTab({ state, selectedAgentId, onSelectAgent, act, outcomes, onHire }: Props) {
  const selected = state.agents.find((a) => a.id === selectedAgentId);
  if (selected) return <AgentDetail state={state} agent={selected} onBack={() => onSelectAgent(null)} act={act} outcome={outcomes[selected.id]} />;

  const dormant = MAX_AGENTS - state.agents.length;

  return (
    <div className="stack-12">
      <div className="section-head">
        <h2 className="h-section">ZESPÓŁ</h2>
        <div className="bunks" title="Zajęte koje stacji">
          <div className="bunk-row">
            {Array.from({ length: MAX_AGENTS }, (_, i) => {
              const agent = state.agents[i];
              return agent ? (
                <div key={i} className="bunk filled" style={roleVar(agent.role)} />
              ) : (
                <div key={i} className="bunk" />
              );
            })}
          </div>
          <span className="caption">
            {state.agents.length}/{MAX_AGENTS} koi
          </span>
        </div>
      </div>

      {sortedAgents(state).map((a) => (
        <AgentCard key={a.id} state={state} agent={a} outcome={outcomes[a.id]} onOpen={() => onSelectAgent(a.id)} />
      ))}

      <div className="dormant-card">
        <DormantModuleIcon />
        <div className="grow stack-4">
          <span className="dormant-title">{dormant > 0 ? `${dormant} ${plural(dormant, "uśpiony moduł", "uśpione moduły", "uśpionych modułów")}` : "Stacja pełna"}</span>
          <span className="text-2 body-sm">
            {dormant > 0 ? "Każde zatrudnienie aktywuje nowy moduł i rozbudowuje stację." : "Zwolnij agenta, żeby zwolnić koję."}
          </span>
        </div>
        <button type="button" className="btn-primary" disabled={dormant <= 0} onClick={onHire}>
          Zatrudnij
        </button>
      </div>

      <StateLegend />
    </div>
  );
}

function AgentCard({ state, agent, outcome, onOpen }: { state: GameState; agent: Agent; outcome?: Outcome; onOpen: () => void }) {
  const task = currentTask(state, agent.id);
  const failed = agent.status === "stuck" ? stuckTask(state, agent.id) : undefined;
  const progress = task ? taskProgress(state, task) : undefined;

  return (
    <button type="button" className={`agent-card is-${agent.status}`} style={roleVar(agent.role)} onClick={onOpen} data-agent-status={agent.status}>
      <div className={`avatar avatar-60 is-${agent.status}`}>
        <Creature role={agent.role} state={visualStateOf(agent, outcome)} form={formOf(agent.level)} size={agent.status === "idle" ? 46 : 50} effects={false} sign={false} />
      </div>
      <div className="agent-card-body">
        <div className="row-between">
          <span className="agent-name">{agent.name}</span>
          <StatusBadge status={agent.status} />
        </div>
        <span className="text-2 body-sm">
          {TIERS[agent.model].label} {ROLES[agent.role].label} · {agent.model} · poz. {agent.level}
        </span>
        {agent.status === "stuck" && (
          <span className="body-sm text-red">
            {failed ? `${failed.title} — ${failed.error ?? "błąd"}. ` : ""}Postaw na nogi →
          </span>
        )}
        {agent.status === "working" && task && progress && (
          <>
            <span className="body-sm">{task.title}</span>
            <div className="progress-row">
              <div className="progress">
                <div className="progress-fill" style={{ width: `${Math.round(progress.fraction * 100)}%` }} />
              </div>
              <span className="caption">
                krok {progress.step}/{progress.total} · {progress.label}
              </span>
            </div>
          </>
        )}
        {agent.status === "idle" && (
          <span className="text-2 body-sm">
            {task ? `Czeka w zespole: ${task.title}` : "Odpoczywa — czeka na paczkę."}
          </span>
        )}
      </div>
    </button>
  );
}

const BADGES: Record<AgentStatus, string> = { idle: "BEZCZYNNY", working: "PRACUJE", stuck: "UTKNĄŁ" };

export function StatusBadge({ status }: { status: AgentStatus }) {
  return (
    <span className={`badge badge-${status}`}>
      <StateSign status={status} />
      {BADGES[status]}
    </span>
  );
}

function StateLegend() {
  return (
    <div className="legend">
      <span className="legend-title">STANY</span>
      <div className="legend-items">
        <span>
          <IdleSign />
          bezczynny
        </span>
        <span>
          <WorkingSign />
          pracuje
        </span>
        <span>
          <StuckSign />
          utknął
        </span>
        <span>
          <SuccessSign />
          sukces
        </span>
        <span>
          <FailureSign />
          porażka
        </span>
      </div>
    </div>
  );
}

export function plural(n: number, one: string, few: string, many: string) {
  if (n === 1) return one;
  const mod10 = n % 10;
  const mod100 = n % 100;
  return mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? few : many;
}
