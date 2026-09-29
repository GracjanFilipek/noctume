import type { AgentEventKind, ModelTier } from "@agent-tycoon/shared";

/** Why a run happens; lets MockRunner fake a plausible outcome. Real runners ignore it. */
export type RunPurpose = "work" | "review" | "prompt";

/** One self-contained model run. Prompts are composed by the caller, so runners stay backend-agnostic. */
export interface RunRequest {
  /** Key for cancel(). */
  id: string;
  purpose: RunPurpose;
  cwd: string;
  model: ModelTier;
  prompt: string;
  systemPrompt: string;
  /** Tools the run may use at all ([] = none). */
  tools: string[];
  maxTurns: number;
  /** When set, the run must return an object matching this JSON Schema in `structured`. */
  jsonSchema?: object;
  /** File the run is expected to produce (used by MockRunner to fake output). */
  expectedFile?: string;
}

export interface RunStep {
  kind: AgentEventKind;
  summary: string;
  tool?: string;
}

export interface RunOutput {
  text: string;
  structured?: unknown;
  turns?: number;
  durationMs?: number;
  cost?: number;
}

/** Executes runs. Implementations: MockRunner, ClaudeCliRunner (later: ApiRunner). */
export interface AgentRunner {
  run(req: RunRequest, onStep: (step: RunStep) => void): Promise<RunOutput>;
  cancel(id: string): void;
}

/** Thrown by run() when the run was cancelled via cancel(). */
export class CancelledError extends Error {
  constructor() {
    super("Anulowano");
  }
}
