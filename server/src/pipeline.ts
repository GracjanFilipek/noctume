import { REVIEW_TOOLS, type Agent, type ReviewVerdict, type StepKind, type Task, type TaskStep } from "@agent-tycoon/shared";
import { CancelledError, type AgentRunner, type RunOutput, type RunRequest } from "./runners/AgentRunner.ts";
import {
  composeSystemPrompt,
  deliverableFile,
  MAX_TURNS,
  REVIEW_MAX_TURNS,
  reviewPrompt,
  revisionPrompt,
  VERDICT_SCHEMA,
  workPrompt,
} from "./prompts.ts";
import { convertDeliverable } from "./export.ts";
import type { Store } from "./store.ts";
import { listWorkspaceFiles, workspaceDir } from "./workspace.ts";

/** How many times the author may fix the work after a negative review. */
export const MAX_REVISIONS = 1;
const MAX_EVENTS = 300;

export interface PipelineHooks {
  /** Called before each run so the queue can cancel the one in flight. */
  onRun(runId: string): void;
  isCancelled(): boolean;
}

/**
 * Runs a team task: workers in order (sharing one workspace), then reviewers;
 * if any reviewer rejects, the last worker revises once and the reviewers look again.
 * Finally converts the deliverable (PDF/DOCX) server-side.
 */
export async function runPipeline(store: Store, runner: AgentRunner, task: Task, hooks: PipelineHooks) {
  const team = task.assigneeIds.map((id) => store.agent(id));
  const workers = team.filter((a) => a.role !== "reviewer");
  const reviewers = team.filter((a) => a.role === "reviewer");
  const cwd = workspaceDir(task.id);
  const deliverable = deliverableFile(task.format);

  const push = (agentId: string, kind: Task["events"][number]["kind"], summary: string, tool?: string) => {
    task.events.push({ taskId: task.id, agentId, kind, summary, tool, at: Date.now() });
    if (task.events.length > MAX_EVENTS) task.events.splice(0, task.events.length - MAX_EVENTS);
    store.changed();
  };

  /** One agent's run on this task, recorded as a TaskStep. */
  const step = async (agent: Agent, kind: StepKind, req: Omit<RunRequest, "id" | "cwd" | "model" | "systemPrompt">) => {
    if (hooks.isCancelled()) throw new CancelledError();
    const record: TaskStep = { agentId: agent.id, kind, status: "running" };
    task.steps.push(record);
    agent.status = "working";
    push(agent.id, "started", `▶️ ${agent.name}: ${STEP_LABEL[kind]}`);

    const runId = `${task.id}:${task.steps.length}`;
    hooks.onRun(runId);
    let out: RunOutput;
    try {
      out = await runner.run(
        { ...req, id: runId, cwd, model: agent.model, systemPrompt: composeSystemPrompt(agent, cwd) },
        (s) => push(agent.id, s.kind, s.summary, s.tool),
      );
    } catch (err) {
      record.status = "failed";
      throw err;
    }
    record.status = "done";
    record.summary = out.text.trim().slice(0, 1500);
    record.turns = out.turns;
    record.durationMs = out.durationMs;
    record.cost = out.cost;
    if (out.cost) store.state.studio.realCostUsd += out.cost;
    agent.status = "idle";
    push(agent.id, "result", `✅ ${agent.name}: ${STEP_LABEL[kind]} — gotowe (${out.turns ?? "?"} tur)`);
    return { out, record };
  };

  for (const [i, agent] of workers.entries()) {
    const isFinal = i === workers.length - 1;
    await step(agent, "work", {
      purpose: "work",
      prompt: workPrompt(task, team, agent, isFinal, i),
      tools: agent.tools,
      maxTurns: MAX_TURNS[agent.model],
      expectedFile: isFinal ? (deliverable ?? "wynik.md") : `notatki-${i + 1}.md`,
    });
  }

  const author = workers.at(-1)!;
  for (let round = 0; reviewers.length > 0; round++) {
    task.status = "review";
    store.changed();
    const files = await listWorkspaceFiles(task.id);
    const verdicts: { reviewer: Agent; verdict: ReviewVerdict }[] = [];
    for (const reviewer of reviewers) {
      const { out, record } = await step(reviewer, "review", {
        purpose: "review",
        prompt: reviewPrompt(task, files, round),
        tools: REVIEW_TOOLS,
        maxTurns: REVIEW_MAX_TURNS,
        jsonSchema: VERDICT_SCHEMA,
        expectedFile: deliverable,
      });
      const verdict = toVerdict(out);
      record.verdict = verdict;
      verdicts.push({ reviewer, verdict });
      push(reviewer.id, "text", `🧐 ${verdict.score}/10 ${verdict.approved ? "✔ akceptuję" : "✘ do poprawy"} — ${verdict.notes}`);
    }
    task.score = Math.round((verdicts.reduce((s, v) => s + v.verdict.score, 0) / verdicts.length) * 10) / 10;
    if (verdicts.every((v) => v.verdict.approved) || round >= MAX_REVISIONS) break;

    task.status = "in_progress";
    store.changed();
    await step(author, "revision", {
      purpose: "work",
      prompt: revisionPrompt(task, verdicts),
      tools: author.tools,
      maxTurns: MAX_TURNS[author.model],
      expectedFile: deliverable ?? "wynik.md",
    });
  }

  if (deliverable && (task.format === "pdf" || task.format === "docx")) {
    push(author.id, "tool_use", `🖨️ Eksport do ${task.format.toUpperCase()}…`);
    const created = await convertDeliverable(task.format, cwd, deliverable);
    push(author.id, "result", `📄 Gotowy plik: ${created}`);
  }

  const lastWork = [...task.steps].reverse().find((s) => s.kind !== "review");
  const sum = (key: "turns" | "durationMs" | "cost") => task.steps.reduce((acc, s) => acc + (s[key] ?? 0), 0);
  task.result = {
    text: lastWork?.summary ?? "",
    files: await listWorkspaceFiles(task.id),
    turns: sum("turns"),
    durationMs: sum("durationMs"),
    cost: sum("cost"),
  };
}

const STEP_LABEL: Record<StepKind, string> = { work: "praca", review: "recenzja", revision: "poprawki" };

function toVerdict(out: RunOutput): ReviewVerdict {
  let raw: any = out.structured;
  if (!raw) {
    try {
      raw = JSON.parse(out.text);
    } catch {
      raw = {};
    }
  }
  const score = Math.min(10, Math.max(1, Math.round(Number(raw.score) || 1)));
  return {
    score,
    approved: raw.approved === true,
    notes: typeof raw.notes === "string" && raw.notes ? raw.notes : "(recenzent nie podał uzasadnienia)",
    fixes: Array.isArray(raw.fixes) ? raw.fixes.filter((f: unknown) => typeof f === "string") : undefined,
  };
}
