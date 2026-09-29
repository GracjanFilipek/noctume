export type Role = "researcher" | "writer" | "developer" | "analyst" | "reviewer";
export type ModelTier = "haiku" | "sonnet" | "opus";
export type AgentStatus = "idle" | "working" | "stuck";

export interface Agent {
  id: string;
  name: string;
  role: Role;
  model: ModelTier; // junior / mid / senior
  /** Short description written by the player at hiring; the master prompt is generated from it. */
  description: string;
  systemPrompt: string;
  tools: string[];
  level: number;
  xp: number;
  lessons: string[];
  status: AgentStatus;
  deskPosition: { x: number; y: number };
}

export type TaskStatus = "backlog" | "queued" | "in_progress" | "review" | "done" | "failed";

export type OutputFormat = "auto" | "pdf" | "docx" | "html" | "md" | "csv";

export type AgentEventKind = "started" | "thinking" | "text" | "tool_use" | "tool_result" | "result" | "error";

export interface AgentEvent {
  taskId: string;
  agentId: string;
  kind: AgentEventKind;
  /** Short, human-readable summary shown in bubbles and logs. */
  summary: string;
  /** Tool name for tool_use events. */
  tool?: string;
  at: number;
}

export type StepKind = "work" | "review" | "revision";

/** One agent's turn on a team task. */
export interface TaskStep {
  agentId: string;
  kind: StepKind;
  status: "running" | "done" | "failed";
  summary?: string;
  verdict?: ReviewVerdict;
  turns?: number;
  durationMs?: number;
  cost?: number;
}

export interface ReviewVerdict {
  score: number; // 1–10
  approved: boolean;
  notes: string;
  fixes?: string[];
}

export interface TaskResult {
  text: string;
  files: string[];
  turns?: number;
  durationMs?: number;
  cost?: number;
}

export interface Task {
  id: string;
  title: string;
  brief: string;
  /** Ordered team. Non-reviewers work in this order; reviewers review at the end. */
  assigneeIds: string[];
  format: OutputFormat;
  status: TaskStatus;
  steps: TaskStep[];
  events: AgentEvent[];
  result?: TaskResult;
  error?: string;
  /** Average of the final reviewer verdicts, if the team had reviewers. */
  score?: number;
  createdAt: number;
}

export interface Studio {
  reputation: number;
  /** Sum of real (estimated) CLI cost in USD, if reported. */
  realCostUsd: number;
}

export type RunnerKind = "mock" | "claude";

export interface Settings {
  runner: RunnerKind;
  maxParallel: number;
}

/** What this machine can convert documents to (detected at server start). */
export interface Capabilities {
  pdf: boolean;
  docx: boolean;
}

export interface GameState {
  studio: Studio;
  agents: Agent[];
  tasks: Task[];
  settings: Settings;
  capabilities: Capabilities;
}

/** Server → client messages over WebSocket. */
export type ServerMessage = { type: "state"; state: GameState };
