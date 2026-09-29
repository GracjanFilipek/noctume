import { randomUUID } from "node:crypto";
import { FORMATS, type OutputFormat, type Task } from "@agent-tycoon/shared";
import { CancelledError, type AgentRunner } from "./runners/AgentRunner.ts";
import { runPipeline } from "./pipeline.ts";
import { GameError, type Store } from "./store.ts";
import { resetWorkspace } from "./workspace.ts";

interface Running {
  runner: AgentRunner;
  runId?: string;
  cancelled: boolean;
}

export interface TaskInput {
  title?: string;
  brief?: string;
  format?: OutputFormat;
  assigneeIds?: string[];
}

/** Starts queued tasks while respecting maxParallel; a running task reserves its whole team. */
export class TaskQueue {
  private running = new Map<string, Running>();

  constructor(
    private store: Store,
    private getRunner: () => AgentRunner,
  ) {}

  createTask(input: TaskInput): Task {
    const task: Task = {
      id: randomUUID(),
      title: "",
      brief: "",
      assigneeIds: [],
      format: "auto",
      status: "backlog",
      steps: [],
      events: [],
      createdAt: Date.now(),
    };
    this.applyInput(task, input);
    if (!task.title) throw new GameError("Podaj tytuł zadania.");
    this.store.state.tasks.push(task);
    this.store.changed();
    return task;
  }

  updateTask(taskId: string, input: TaskInput) {
    const task = this.store.task(taskId);
    if (task.status !== "backlog" && task.status !== "failed" && task.status !== "done") {
      throw new GameError("Zadania w toku nie można edytować.");
    }
    this.applyInput(task, input);
    this.store.changed();
    return task;
  }

  start(taskId: string) {
    const task = this.store.task(taskId);
    if (task.status !== "backlog" && task.status !== "failed" && task.status !== "done") {
      throw new GameError("To zadanie już jest w kolejce albo w toku.");
    }
    const team = task.assigneeIds.map((id) => this.store.agent(id));
    if (!team.length) throw new GameError("Dodaj do zadania przynajmniej jednego agenta.");
    if (!team.some((a) => a.role !== "reviewer")) {
      throw new GameError("Zespół potrzebuje kogoś, kto wykona pracę — recenzent tylko ocenia.");
    }
    const needs = FORMATS[task.format].needs;
    if (needs && !this.store.state.capabilities[needs]) {
      throw new GameError(`Eksport ${FORMATS[task.format].label} jest niedostępny na tym komputerze.`);
    }
    task.status = "queued";
    task.error = undefined;
    this.store.changed();
    this.pump();
  }

  cancel(taskId: string) {
    const task = this.store.task(taskId);
    if (task.status === "queued") {
      task.status = "backlog";
      this.store.changed();
      return;
    }
    const running = this.running.get(taskId);
    if (!running) throw new GameError("Tego zadania nie da się anulować.");
    running.cancelled = true;
    if (running.runId) running.runner.cancel(running.runId);
  }

  deleteTask(taskId: string) {
    const task = this.store.task(taskId);
    if (task.status === "queued" || this.running.has(taskId)) throw new GameError("Najpierw anuluj zadanie.");
    this.store.state.tasks = this.store.state.tasks.filter((t) => t.id !== taskId);
    this.store.changed();
  }

  /** Agents reserved by a running task (working now or waiting for their turn). */
  busyAgentIds(): Set<string> {
    const ids = new Set<string>();
    for (const taskId of this.running.keys()) {
      for (const id of this.store.task(taskId).assigneeIds) ids.add(id);
    }
    return ids;
  }

  pump() {
    const { state } = this.store;
    const queued = state.tasks.filter((t) => t.status === "queued").sort((a, b) => a.createdAt - b.createdAt);
    for (const task of queued) {
      if (this.running.size >= state.settings.maxParallel) break;
      task.assigneeIds = task.assigneeIds.filter((id) => state.agents.some((a) => a.id === id));
      if (!task.assigneeIds.length) {
        task.status = "backlog";
        continue;
      }
      const busy = this.busyAgentIds();
      if (task.assigneeIds.some((id) => busy.has(id))) continue;
      void this.run(task);
    }
    this.store.changed();
  }

  private async run(task: Task) {
    const { store } = this;
    const entry: Running = { runner: this.getRunner(), cancelled: false };
    // Synchronous bookkeeping first, so pump() sees the team as busy.
    this.running.set(task.id, entry);
    task.status = "in_progress";
    task.steps = [];
    task.events = [];
    task.result = undefined;
    task.score = undefined;
    store.changed();

    try {
      await resetWorkspace(task.id);
      await runPipeline(store, entry.runner, task, {
        onRun: (runId) => (entry.runId = runId),
        isCancelled: () => entry.cancelled,
      });
      task.status = "done";
    } catch (err) {
      const cancelled = entry.cancelled || err instanceof CancelledError;
      task.status = "failed";
      task.error = cancelled ? "Anulowano" : err instanceof Error ? err.message : String(err);
      const culprit = task.steps.at(-1);
      task.events.push({
        taskId: task.id,
        agentId: culprit?.agentId ?? task.assigneeIds[0],
        kind: "error",
        summary: cancelled ? "⏹️ Anulowano" : `❗ ${task.error}`,
        at: Date.now(),
      });
      for (const agent of store.state.agents) {
        if (agent.status !== "working" || !task.assigneeIds.includes(agent.id)) continue;
        agent.status = !cancelled && agent.id === culprit?.agentId ? "stuck" : "idle";
      }
    } finally {
      this.running.delete(task.id);
      store.changed();
      this.pump();
    }
  }

  private applyInput(task: Task, input: TaskInput) {
    if (input.title !== undefined) task.title = String(input.title).trim();
    if (input.brief !== undefined) task.brief = String(input.brief).trim();
    if (input.format !== undefined) {
      if (!(input.format in FORMATS)) throw new GameError("Nieznany format wyniku.");
      task.format = input.format;
    }
    if (input.assigneeIds !== undefined) {
      if (!Array.isArray(input.assigneeIds)) throw new GameError("Zły skład zespołu.");
      const ids = [...new Set(input.assigneeIds)];
      for (const id of ids) this.store.agent(id); // validates
      task.assigneeIds = ids;
    }
  }
}
