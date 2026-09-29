import { ROLES, type Agent, type GameState, type Task } from "@agent-tycoon/shared";

const ACTIVE: Task["status"][] = ["in_progress", "review"];

/** The running task this agent is on (working now or waiting for their turn). */
export function currentTask(state: GameState, agentId: string): Task | undefined {
  return state.tasks.find((t) => ACTIVE.includes(t.status) && t.assigneeIds.includes(agentId));
}

export function agentById(state: GameState, id: string | undefined): Agent | undefined {
  return state.agents.find((a) => a.id === id);
}

export function agentLabel(state: GameState, id: string): string {
  const a = agentById(state, id);
  return a ? `${ROLES[a.role].emoji} ${a.name}` : "(zwolniony)";
}

export function fileUrl(taskId: string, file: string, download = false) {
  const path = file.split("/").map(encodeURIComponent).join("/");
  return `/api/tasks/${taskId}/files/${path}${download ? "?download=1" : ""}`;
}

export const TASK_DRAG_TYPE = "application/x-task-id";

const STATUS_ORDER = { stuck: 0, working: 1, idle: 2 } as const;

/** Team list order: what needs attention first (stuck), then working, then idle; hiring order within. */
export function sortedAgents(state: GameState): Agent[] {
  return [...state.agents].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
}

/** The failed task this agent's step broke, if it is the reason the agent is stuck. */
export function stuckTask(state: GameState, agentId: string): Task | undefined {
  return [...state.tasks]
    .reverse()
    .find((t) => t.status === "failed" && t.steps.at(-1)?.agentId === agentId && t.steps.at(-1)?.status === "failed");
}

const STEP_LABEL = { work: "praca", review: "recenzja", revision: "poprawki" } as const;

/** Real progress of a team task: which step of the pipeline is running (no invented percentages). */
export function taskProgress(state: GameState, task: Task) {
  const team = task.assigneeIds.map((id) => agentById(state, id)).filter((a): a is Agent => !!a);
  const planned = team.filter((a) => a.role !== "reviewer").length + team.filter((a) => a.role === "reviewer").length;
  const total = Math.max(planned, task.steps.length, 1);
  const current = task.steps.at(-1);
  const step = Math.max(task.steps.length, 1);
  return {
    step,
    total,
    fraction: (task.steps.filter((s) => s.status === "done").length + (current?.status === "running" ? 0.5 : 0)) / total,
    label: current ? STEP_LABEL[current.kind] : "w kolejce",
    currentAgent: current ? agentById(state, current.agentId) : undefined,
  };
}

/** Station bunk (1-based) of an agent within its role's work module. */
export function bunkOf(state: GameState, agent: Agent): number {
  return state.agents.filter((a) => a.role === agent.role).findIndex((a) => a.id === agent.id) + 1;
}

/** What the creature shows: stuck always wins, then a running success/failure event, then the base state. */
export function visualStateOf(agent: Agent, outcome?: "success" | "failure"): "idle" | "working" | "stuck" | "success" | "failure" {
  if (agent.status === "stuck") return "stuck";
  return outcome ?? agent.status;
}
