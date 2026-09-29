import { useEffect, useRef, useState } from "react";
import { FORMATS, ROLES, type Agent, type GameState, type OutputFormat, type Task, type TaskStatus } from "@agent-tycoon/shared";
import { api } from "../api.ts";
import { agentById, agentLabel, TASK_DRAG_TYPE, taskProgress } from "../game.ts";
import { ChevronDown, DragHandle, PackageIcon, PlusIcon, RoleGlyph, SuccessSign } from "../ui/icons.tsx";
import { EventLog } from "./EventLog.tsx";
import { Files } from "./Files.tsx";
import { TeamPicker } from "./TeamPicker.tsx";
import { plural } from "./AgentsTab.tsx";

export const STATUS_LABEL: Record<TaskStatus, string> = {
  backlog: "w kolejce",
  queued: "czeka na start",
  in_progress: "w toku",
  review: "recenzja",
  done: "ukończone",
  failed: "nieudane",
};

type Filter = "queue" | "running" | "finished";
const FILTERS: { id: Filter; label: string; statuses: TaskStatus[] }[] = [
  { id: "queue", label: "W kolejce", statuses: ["backlog"] },
  { id: "running", label: "W toku", statuses: ["queued", "in_progress", "review"] },
  { id: "finished", label: "Zakończone", statuses: ["done", "failed"] },
];

const EDITABLE: TaskStatus[] = ["backlog", "failed", "done"];
/** How long a freshly delivered task is announced at the top of the Hangar. */
const DELIVERED_WINDOW_MS = 60_000;

interface Props {
  state: GameState;
  act: (fn: () => Promise<unknown>) => void;
}

export function TasksTab({ state, act }: Props) {
  const [filter, setFilter] = useState<Filter>("queue");
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const counts = Object.fromEntries(FILTERS.map((f) => [f.id, state.tasks.filter((t) => f.statuses.includes(t.status)).length]));
  const visible = state.tasks.filter((t) => FILTERS.find((f) => f.id === filter)!.statuses.includes(t.status)).reverse();
  const queued = counts.queue;

  return (
    <div className="stack-12">
      <div className="row-between end">
        <div className="stack-4">
          <h2 className="h-section">HANGAR ZLECEŃ</h2>
          <span className="caption-sm text-3">
            {queued} {plural(queued, "paczka", "paczki", "paczek")} w kolejce
          </span>
        </div>
        <button type="button" className="btn-outline btn-icon" onClick={() => setCreating((c) => !c)} aria-expanded={creating}>
          <PlusIcon color="#B5F2C6" />
          Nowa paczka
        </button>
      </div>

      {creating && <NewTaskForm state={state} act={act} onDone={() => setCreating(false)} />}

      <div role="group" aria-label="Filtr zadań" className="segmented">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label} · {counts[f.id]}
          </button>
        ))}
      </div>

      <Delivered state={state} />

      {filter === "queue" && (
        <span className="hint">
          <DragHandle color="#7E8F83" />
          Przeciągnij paczkę na agenta na mapie albo użyj „Przydziel”.
        </span>
      )}

      {visible.length === 0 && <p className="body-sm text-3">Pusto.</p>}
      {visible.map((t) => (
        <div key={t.id} className="stack-8">
          <PackageCard
            state={state}
            task={t}
            open={t.id === openId}
            dragging={dragging === t.id}
            onOpen={() => setOpenId(t.id === openId ? null : t.id)}
            onDrag={(on) => setDragging(on ? t.id : null)}
            act={act}
          />
          {t.id === openId && <TaskDetail state={state} task={t} act={act} onClose={() => setOpenId(null)} />}
        </div>
      ))}
    </div>
  );
}

/** "Delivered just now" banner — real result data only (who, what, review score, files). */
function Delivered({ state }: { state: GameState }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);
  const last = state.tasks
    .filter((t) => t.status === "done" && t.events.length)
    .sort((a, b) => b.events.at(-1)!.at - a.events.at(-1)!.at)[0];
  if (!last || now - last.events.at(-1)!.at > DELIVERED_WINDOW_MS) return null;
  const names = last.assigneeIds.map((id) => agentById(state, id)?.name).filter(Boolean).join(", ");
  const details = [
    last.score !== undefined && `ocena ${last.score}/10`,
    last.result && `${last.result.files.length} ${plural(last.result.files.length, "plik", "pliki", "plików")}`,
  ].filter(Boolean);
  return (
    <div className="delivered">
      <SuccessSign size={26} />
      <div className="grow stack-4">
        <span className="body strong">
          {names} {last.assigneeIds.length > 1 ? "dostarczyli" : "dostarczył(a)"}: {last.title}
        </span>
        {details.length > 0 && <span className="caption-sm text-amber-soft">{details.join(" · ")}</span>}
      </div>
    </div>
  );
}

function team(state: GameState, task: Task): Agent[] {
  return task.assigneeIds.map((id) => agentById(state, id)).filter((a): a is Agent => !!a);
}

function PackageCard({
  state,
  task,
  open,
  dragging,
  onOpen,
  onDrag,
  act,
}: Props & { task: Task; open: boolean; dragging: boolean; onOpen: () => void; onDrag: (on: boolean) => void }) {
  const members = team(state, task);
  const lead = members.find((a) => a.role !== "reviewer") ?? members[0];
  const editable = EDITABLE.includes(task.status);
  const running = task.status === "in_progress" || task.status === "review";
  const progress = running ? taskProgress(state, task) : undefined;

  return (
    <div
      className={`package ${dragging ? "is-dragging" : ""} ${open ? "is-open" : ""} is-${task.status}`}
      style={lead ? ({ "--role": `var(--role-${lead.role})` } as React.CSSProperties) : undefined}
      draggable={editable}
      onDragStart={(e) => {
        e.dataTransfer.setData(TASK_DRAG_TYPE, task.id);
        onDrag(true);
      }}
      onDragEnd={() => onDrag(false)}
    >
      {editable && <DragHandle color={dragging ? "var(--role, #B8A0FF)" : "#5E7166"} />}
      <button type="button" className="package-main" onClick={onOpen} aria-expanded={open}>
        <PackageIcon role={dragging ? undefined : lead?.role} />
        <div className="grow min0 stack-5">
          <span className="package-title">{task.title}</span>
          <span className="caption-sm text-2">
            {members.length ? (
              <>
                zespół:{" "}
                {members.map((a, i) => (
                  <span key={a.id} style={{ color: `var(--role-${a.role})` }}>
                    {i > 0 && <span className="text-3"> → </span>}
                    {a.name}
                  </span>
                ))}
              </>
            ) : (
              "brak zespołu"
            )}
          </span>
          <span className="package-meta">
            <span>{FORMATS[task.format].label}</span>
            {progress && (
              <span className="text-2">
                krok {progress.step}/{progress.total} · {progress.currentAgent?.name}: {progress.label}
              </span>
            )}
            {task.status === "queued" && <span className="text-2">czeka na wolny zespół</span>}
            {task.status === "failed" && <span className="text-red">nieudane</span>}
            {task.score !== undefined && <span className="text-amber">ocena {task.score}/10</span>}
          </span>
        </div>
      </button>
      {dragging ? (
        <span className="caption-sm" style={{ color: "var(--role, #B8A0FF)" }}>
          w wiązce…
        </span>
      ) : (
        editable && <AssignMenu state={state} task={task} act={act} />
      )}
    </div>
  );
}

/** "Przydziel ▾" — adds an agent to the package's team (same effect as dropping it on the agent). */
function AssignMenu({ state, task, act }: Props & { task: Task }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const candidates = state.agents.filter((a) => !task.assigneeIds.includes(a.id));

  return (
    <div className="menu-anchor" ref={ref}>
      <button type="button" className="btn-outline btn-icon" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Przydziel
        <ChevronDown color="#B5F2C6" />
      </button>
      {open && (
        <div className="menu" role="menu">
          {candidates.length === 0 && <span className="menu-empty">Wszyscy agenci są już w zespole.</span>}
          {candidates.map((a) => (
            <button
              key={a.id}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                act(() => api("PATCH", `/tasks/${task.id}`, { assigneeIds: [...task.assigneeIds, a.id] }));
              }}
            >
              <RoleGlyph role={a.role} />
              {a.name}
              <span className="text-3">{ROLES[a.role].label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskDetail({ state, task, act, onClose }: Props & { task: Task; onClose: () => void }) {
  const editable = EDITABLE.includes(task.status);
  const running = task.status === "queued" || task.status === "in_progress" || task.status === "review";
  const patch = (body: object) => act(() => api("PATCH", `/tasks/${task.id}`, body));

  return (
    <div className="task-detail stack-10">
      <div className="row-between">
        <span className="caption-sm text-3">Status: {STATUS_LABEL[task.status]}</span>
        <button type="button" className="btn-ghost btn-sm" onClick={onClose}>
          Zwiń
        </button>
      </div>
      <p className="brief">{task.brief || <span className="text-3">(bez briefu)</span>}</p>

      <h4 className="h-sub">ZESPÓŁ</h4>
      <TeamPicker agents={state.agents} value={task.assigneeIds} disabled={!editable} onChange={(assigneeIds) => patch({ assigneeIds })} />
      <div className="row-gap-8">
        <FormatSelect state={state} value={task.format} disabled={!editable} onChange={(format) => patch({ format })} />
        <div className="grow" />
        {editable && (
          <button type="button" className="btn-primary" onClick={() => act(() => api("POST", `/tasks/${task.id}/start`))}>
            {task.status === "backlog" ? "Start" : "Uruchom ponownie"}
          </button>
        )}
        {running && (
          <button type="button" className="btn-ghost" onClick={() => act(() => api("POST", `/tasks/${task.id}/cancel`))}>
            Anuluj
          </button>
        )}
      </div>

      {task.error && <p className="error-line">› {task.error}</p>}
      <Steps state={state} task={task} />

      {task.result && (
        <>
          <h4 className="h-sub">WYNIK</h4>
          <pre className="result">{task.result.text}</pre>
          <Files task={task} act={act} />
          <ResultStats result={task.result} />
        </>
      )}
      <h4 className="h-sub">LOG</h4>
      <EventLog state={state} events={task.events} />
      {!running && (
        <div className="row-end">
          <button type="button" className="btn-danger" onClick={() => act(() => api("DELETE", `/tasks/${task.id}`).then(onClose))}>
            Usuń paczkę
          </button>
        </div>
      )}
    </div>
  );
}

export function Steps({ state, task }: { state: GameState; task: Task }) {
  if (!task.steps.length) return null;
  const label = { work: "praca", review: "recenzja", revision: "poprawki" };
  return (
    <>
      <h4 className="h-sub">PRZEBIEG</h4>
      <ol className="steps">
        {task.steps.map((s, i) => (
          <li key={i} className={`step is-${s.status}`}>
            <span className="step-dot" />
            <div className="grow stack-4">
              <span className="body-sm">
                {agentLabel(state, s.agentId)} <span className="text-3">— {label[s.kind]}</span>
              </span>
              {s.verdict && (
                <div className={`verdict ${s.verdict.approved ? "ok" : "bad"}`}>
                  <span className="strong">
                    {s.verdict.score}/10 {s.verdict.approved ? "· akceptuje" : "· do poprawy"}
                  </span>{" "}
                  {s.verdict.notes}
                  {s.verdict.fixes && s.verdict.fixes.length > 0 && (
                    <ul>
                      {s.verdict.fixes.map((f, j) => (
                        <li key={j}>{f}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}

function FormatSelect({ state, value, disabled, onChange }: { state: GameState; value: OutputFormat; disabled?: boolean; onChange: (f: OutputFormat) => void }) {
  return (
    <select className="select" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as OutputFormat)} title="Format wyniku">
      {Object.entries(FORMATS).map(([id, f]) => {
        const unavailable = !!f.needs && !state.capabilities[f.needs];
        return (
          <option key={id} value={id} disabled={unavailable}>
            Format: {f.label}
            {unavailable ? " (niedostępny)" : ""}
          </option>
        );
      })}
    </select>
  );
}

function NewTaskForm({ state, act, onDone }: Props & { onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [format, setFormat] = useState<OutputFormat>("auto");
  const [members, setMembers] = useState<string[]>([]);
  const [startNow, setStartNow] = useState(true);

  // Drop agents that were fired meanwhile.
  useEffect(() => setMembers((t) => t.filter((id) => state.agents.some((a) => a.id === id))), [state.agents]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    act(async () => {
      await api("POST", "/tasks", { title, brief, format, assigneeIds: members, start: startNow && members.length > 0 });
      setTitle("");
      setBrief("");
      onDone();
    });
  };

  return (
    <form className="form-card stack-10" onSubmit={submit}>
      <h3 className="h-sub">NOWA PACZKA</h3>
      <input className="input" placeholder="Tytuł" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className="input" placeholder="Brief: co ma powstać, dla kogo, w jakim stylu?" rows={3} value={brief} onChange={(e) => setBrief(e.target.value)} />
      <span className="caption-sm text-2">Zespół — kliknij w kolejności pracy:</span>
      <TeamPicker agents={state.agents} value={members} onChange={setMembers} />
      <div className="row-gap-8">
        <FormatSelect state={state} value={format} onChange={setFormat} />
        <label className="check">
          <input type="checkbox" checked={startNow} onChange={(e) => setStartNow(e.target.checked)} /> start od razu
        </label>
        <div className="grow" />
        <button type="submit" className="btn-primary">
          Dodaj
        </button>
      </div>
    </form>
  );
}

export function ResultStats({ result }: { result: NonNullable<Task["result"]> }) {
  const parts = [
    result.turns !== undefined && `${result.turns} tur`,
    result.durationMs !== undefined && `${(result.durationMs / 1000).toFixed(1)} s`,
    result.cost !== undefined && `koszt API (szac.) $${result.cost.toFixed(4)}`,
  ].filter(Boolean);
  return parts.length ? <p className="caption-sm text-3">{parts.join(" · ")}</p> : null;
}
