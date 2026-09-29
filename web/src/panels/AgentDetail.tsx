import { useEffect, useRef, useState } from "react";
import { PREMIUM_TOOLS, ROLES, SAFE_TOOLS, TIERS, type Agent, type GameState } from "@agent-tycoon/shared";
import { api } from "../api.ts";
import { bunkOf, currentTask, stuckTask, taskProgress, visualStateOf } from "../game.ts";
import { Creature } from "../creatures/Creature.tsx";
import { formOf } from "../creatures/types.ts";
import type { Outcome } from "../useOutcomes.ts";
import { BackIcon, FailedBox, LessonIcon, PackageIcon, PendingDot, PowerIcon, PremiumWarning, ReviveIcon, RoleGlyph, SkillIcon, SuccessSign } from "../ui/icons.tsx";
import { BUNKS_PER_MODULE, roleVar, ZONES } from "../ui/roles.ts";
import { EventLog } from "./EventLog.tsx";
import { StatusBadge } from "./AgentsTab.tsx";
import { STATUS_LABEL } from "./TasksTab.tsx";

interface Props {
  state: GameState;
  agent: Agent;
  onBack: () => void;
  act: (fn: () => Promise<unknown>) => void;
  outcome?: Outcome;
}

const ALL_TOOLS = [...SAFE_TOOLS, ...PREMIUM_TOOLS];

export function AgentDetail({ state, agent, onBack, act, outcome }: Props) {
  const [confirmFire, setConfirmFire] = useState(false);
  const task = currentTask(state, agent.id);
  const failed = agent.status === "stuck" ? stuckTask(state, agent.id) : undefined;
  const history = state.tasks.filter((t) => t.assigneeIds.includes(agent.id) && t.id !== task?.id).reverse();
  const zone = ZONES[agent.role];
  const bunk = bunkOf(state, agent);

  return (
    <div className="detail-agent" style={roleVar(agent.role)}>
      <div className="row-between">
        <button type="button" className="btn-back" onClick={onBack}>
          <BackIcon />
          Zespół
        </button>
        <span className="caption-sm">
          {zone.name} · koja {bunk}/{Math.max(BUNKS_PER_MODULE, bunk)}
        </span>
      </div>

      {/* header */}
      <div className="creature-head">
        <div className={`avatar avatar-76 is-${agent.status}`}>
          {agent.status === "stuck" && (
            <svg width="76" height="76" viewBox="0 0 76 76" className="avatar-ring" aria-hidden="true">
              <circle className="at-ring" cx="38" cy="38" r="38" fill="none" stroke="#FF4D5E" strokeWidth="1.5" />
            </svg>
          )}
          <Creature role={agent.role} state={visualStateOf(agent, outcome)} form={formOf(agent.level)} size={62} effects={false} sign={false} />
        </div>
        <div className="grow stack-5">
          <div className="row-gap-10">
            <h2 className="creature-name">{agent.name}</h2>
            <span role="img" aria-label={`Rola: ${ROLES[agent.role].label}`} style={{ display: "flex" }}>
              <RoleGlyph role={agent.role} size={14} />
            </span>
            <div className="grow" />
            <StatusBadge status={agent.status} />
          </div>
          <span className="body-sm text-2">
            {TIERS[agent.model].label} {ROLES[agent.role].label} · model <span className="text-1">{agent.model}</span>
          </span>
          <span className="caption-sm text-body">Poziom {agent.level} · Forma {["I", "II", "III"][formOf(agent.level) - 1]}</span>
          {agent.description && <span className="caption-sm text-3">„{agent.description}”</span>}
        </div>
      </div>

      {/* current task */}
      <section className="stack-6">
        <h3 className="h-sub">BIEŻĄCE ZADANIE</h3>
        {agent.status === "stuck" ? (
          <div className="task-now is-stuck">
            <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
              <polygon points="15,2 27,15 15,28 3,15" fill="var(--role)" fillOpacity="0.18" stroke="var(--role)" strokeWidth="1.6" />
              <path d="M15 3 L13 11 L17 15 L14 22" fill="none" stroke="#FF4D5E" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
            <div className="grow stack-3 min0">
              <span className="task-now-title">{failed?.title ?? "Ostatnie zadanie"}</span>
              <span className="caption-sm text-red">› {failed?.error ?? "agent utknął"}</span>
            </div>
            <button type="button" className="btn-primary btn-icon" onClick={() => act(() => api("POST", `/agents/${agent.id}/reset`))}>
              <ReviveIcon />
              Postaw na nogi
            </button>
          </div>
        ) : task ? (
          <CurrentTask state={state} agent={agent} taskId={task.id} act={act} />
        ) : (
          <div className="task-now is-empty">
            <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
              <polygon points="15,2 27,15 15,28 3,15" fill="none" stroke="#5F7A69" strokeWidth="1.5" strokeDasharray="3 3" />
            </svg>
            <span className="body-sm text-2">Brak — przeciągnij paczkę na agenta albo przydziel w zakładce Zadania.</span>
          </div>
        )}
      </section>

      <Modules agent={agent} act={act} />
      <CorePrompt agent={agent} act={act} />

      {/* lessons */}
      <section className="stack-6">
        <h3 className="h-sub">
          LEKCJE <span className="h-sub-note">· wnioski z poprzednich zadań</span>
        </h3>
        {agent.lessons.length === 0 ? (
          <span className="body-sm text-3">Jeszcze żadnych.</span>
        ) : (
          agent.lessons.map((l, i) => (
            <div key={i} className="lesson">
              <LessonIcon />
              <span className="grow body-sm">{l}</span>
            </div>
          ))
        )}
      </section>

      {/* history */}
      <section className="stack-6">
        <h3 className="h-sub">
          HISTORIA <span className="h-sub-note">· {history.length}</span>
        </h3>
        <ul className="history">
          {history.map((t) => (
            <li key={t.id}>
              {t.status === "done" ? <SuccessSign /> : t.status === "failed" ? <FailedBox /> : <PendingDot />}
              {t.title}
              <span className="text-3">— {STATUS_LABEL[t.status]}</span>
              {t.score !== undefined && <span className="text-amber">{t.score}/10</span>}
            </li>
          ))}
        </ul>
      </section>

      {/* decommission */}
      <div className="decommission">
        <span className="caption-sm text-3">Dekomisja jest nieodwracalna.</span>
        <button type="button" className="btn-danger btn-icon" onClick={() => setConfirmFire(true)}>
          <PowerIcon />
          Zwolnij
        </button>
      </div>

      {confirmFire && (
        <div className="panel-overlay">
          <div role="alertdialog" aria-labelledby="fire-title" className="danger-dialog">
            <div className="hazard-tape" />
            <div className="stack-10 pad-x-20">
              <h2 id="fire-title" className="dialog-title">
                Zdekomisjonować agenta {agent.name}?
              </h2>
              <p className="dialog-text">
                Agent zostanie wyłączony na stałe. Jego lekcje przepadną, a koja w strefie {zone.name} wróci do uśpienia.
              </p>
            </div>
            <div className="row-end pad-x-20">
              <button type="button" className="btn-ghost" onClick={() => setConfirmFire(false)}>
                Anuluj
              </button>
              <button
                type="button"
                className="btn-danger-solid"
                onClick={() => act(() => api("DELETE", `/agents/${agent.id}`).then(onBack, (e) => (setConfirmFire(false), Promise.reject(e))))}
              >
                Zwolnij na stałe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CurrentTask({ state, agent, taskId, act }: { state: GameState; agent: Agent; taskId: string; act: Props["act"] }) {
  const task = state.tasks.find((t) => t.id === taskId)!;
  const progress = taskProgress(state, task);
  const mine = progress.currentAgent?.id === agent.id;
  const firstWorker = task.assigneeIds.map((id) => state.agents.find((a) => a.id === id)).find((a) => a && a.role !== "reviewer");
  return (
    <div className="stack-8">
      <div className="task-now">
        <PackageIcon role={firstWorker?.role} size={30} />
        <div className="grow stack-3 min0">
          <span className="task-now-title">{task.title}</span>
          <span className="caption-sm text-2">
            {mine ? `krok ${progress.step}/${progress.total} · ${progress.label}` : `czeka na swoją kolej · teraz: ${progress.currentAgent?.name ?? "kolejka"}`}
          </span>
        </div>
        <button type="button" className="btn-ghost" onClick={() => act(() => api("POST", `/tasks/${task.id}/cancel`))}>
          Anuluj
        </button>
      </div>
      <EventLog state={state} events={task.events.filter((e) => e.agentId === agent.id)} />
    </div>
  );
}

function Modules({ agent, act }: { agent: Agent; act: Props["act"] }) {
  const installed = ALL_TOOLS.filter((t) => agent.tools.includes(t)).length;
  const bashOn = agent.tools.includes("Bash");

  const toggle = (tool: string) => {
    const has = agent.tools.includes(tool);
    if (!has && PREMIUM_TOOLS.includes(tool)) {
      const ok = confirm(`⚠️ ${tool} pozwala agentowi uruchamiać dowolne polecenia powłoki na Twoim komputerze. Odblokować dla ${agent.name}?`);
      if (!ok) return;
    }
    const tools = has ? agent.tools.filter((t) => t !== tool) : [...agent.tools, tool];
    act(() => api("PATCH", `/agents/${agent.id}`, { tools }));
  };

  return (
    <section className="stack-6">
      <div className="row-between baseline">
        <h3 className="h-sub">
          MODUŁY <span className="h-sub-note">· skille</span>
        </h3>
        <span className="caption text-3">
          wpięte {installed}/{ALL_TOOLS.length}
        </span>
      </div>
      <div className="modules">
        {SAFE_TOOLS.map((tool) => {
          const on = agent.tools.includes(tool);
          return (
            <button key={tool} type="button" aria-pressed={on} className={`module ${on ? "on" : ""}`} onClick={() => toggle(tool)}>
              <SkillIcon tool={tool} />
              <span className="module-name">{tool}</span>
              <span className="module-dot" />
            </button>
          );
        })}
        {PREMIUM_TOOLS.map((tool) => (
          <button
            key={tool}
            type="button"
            aria-pressed={bashOn}
            aria-label={`${tool} — moduł premium, ${bashOn ? "wpięty" : "nieoswojony"}`}
            className={`module premium ${bashOn ? "on" : ""}`}
            onClick={() => toggle(tool)}
          >
            <SkillIcon tool={tool} />
            <span className="module-name">{tool}</span>
            <span className="module-warn">
              <PremiumWarning />
            </span>
          </button>
        ))}
      </div>
      <span className="premium-note">
        <span className="premium-tag">PREMIUM</span>Bash {bashOn ? "wpięty" : "nieoswojony"} — pełny dostęp do powłoki.
      </span>
    </section>
  );
}

function CorePrompt({ agent, act }: { agent: Agent; act: Props["act"] }) {
  const [prompt, setPrompt] = useState(agent.systemPrompt);
  useEffect(() => setPrompt(agent.systemPrompt), [agent.id, agent.systemPrompt]);
  const gutter = useRef<HTMLDivElement>(null);
  const dirty = prompt !== agent.systemPrompt;
  const lines = Math.max(3, prompt.split("\n").length);

  return (
    <section className="stack-6">
      <div className="row-between">
        <label htmlFor={`core-${agent.id}`} className="h-sub">
          RDZEŃ ŚWIADOMOŚCI <span className="h-sub-note">· system prompt</span>
        </label>
        <div className="row-gap-10">
          {dirty && <span className="caption text-phosphor-soft">● niezapisane</span>}
          <button
            type="button"
            className={dirty ? "btn-save dirty" : "btn-save"}
            disabled={!dirty}
            onClick={() => act(() => api("PATCH", `/agents/${agent.id}`, { systemPrompt: prompt }))}
          >
            Zapisz prompt
          </button>
        </div>
      </div>
      <div className="core-editor">
        <div ref={gutter} className="core-gutter" aria-hidden="true">
          {Array.from({ length: lines }, (_, i) => (
            <span key={i}>{String(i + 1).padStart(2, "0")}</span>
          ))}
        </div>
        <textarea
          id={`core-${agent.id}`}
          value={prompt}
          spellCheck={false}
          onChange={(e) => setPrompt(e.target.value)}
          onScroll={(e) => gutter.current && (gutter.current.scrollTop = e.currentTarget.scrollTop)}
        />
      </div>
    </section>
  );
}
