import { test } from "node:test";
import assert from "node:assert/strict";
import type { Agent, GameState, Task } from "@agent-tycoon/shared";
import { INTERRUPTED, normalize, recoverInterrupted } from "../src/persistence.ts";
import { initialState } from "../src/store.ts";

const fresh = () => initialState("mock", { pdf: true, docx: true });

const agent = (id: string, status: Agent["status"] = "idle"): Agent => ({
  id,
  name: id,
  role: "writer",
  model: "haiku",
  description: "",
  systemPrompt: "x",
  tools: ["Read"],
  level: 1,
  xp: 0,
  lessons: [],
  status,
  deskPosition: { x: 0, y: 0 },
});

const task = (id: string, status: Task["status"], assigneeIds: string[] = ["a"]): Task => ({
  id,
  title: id,
  brief: "",
  assigneeIds,
  format: "auto",
  status,
  steps: status === "in_progress" ? [{ agentId: "a", kind: "work", status: "running" }] : [],
  events: [],
  createdAt: 1,
});

test("a restart fails running tasks, returns queued ones to the backlog and frees working agents", () => {
  const state: GameState = { ...fresh(), agents: [agent("a", "working"), agent("b", "stuck")], tasks: [task("run", "in_progress"), task("rev", "review"), task("q", "queued"), task("done", "done")] };
  recoverInterrupted(state);
  const by = Object.fromEntries(state.tasks.map((t) => [t.id, t]));
  assert.equal(by.run.status, "failed");
  assert.equal(by.run.error, INTERRUPTED);
  assert.equal(by.run.steps[0].status, "failed");
  assert.equal(by.rev.status, "failed");
  assert.equal(by.q.status, "backlog");
  assert.equal(by.done.status, "done");
  assert.equal(state.agents[0].status, "idle");
  assert.equal(state.agents[1].status, "stuck", "stuck needs a human, not a restart");
});

test("normalize keeps valid data, fills defaults and drops broken entries", () => {
  const raw = {
    studio: { realCostUsd: 0.42 },
    settings: { runner: "claude", maxParallel: 99 },
    agents: [{ id: "a", name: "Lira", role: "writer" }, { id: "x", name: "Zły", role: "pilot" }, null],
    tasks: [{ id: "t", title: "Post", assigneeIds: ["a", "ghost"], status: "weird" }, { title: "bez id" }],
    capabilities: { pdf: false, docx: false },
  };
  const s = normalize(raw, fresh());
  assert.equal(s.studio.realCostUsd, 0.42);
  assert.equal(s.settings.runner, "claude");
  assert.equal(s.settings.maxParallel, 5);
  assert.deepEqual(s.agents.map((a) => a.name), ["Lira"]);
  assert.equal(s.agents[0].model, "haiku");
  assert.ok(s.agents[0].tools.includes("Write"), "missing tools fall back to the safe set");
  assert.deepEqual(s.tasks[0].assigneeIds, ["a"], "unknown agents leave the team");
  assert.equal(s.tasks[0].status, "backlog");
  assert.equal(s.tasks.length, 1);
  assert.deepEqual(s.capabilities, { pdf: true, docx: true }, "capabilities are re-detected, not loaded");
});

test("garbage in, fresh state out", () => {
  const s = normalize("nonsense", fresh());
  assert.deepEqual(s.agents, []);
  assert.deepEqual(s.tasks, []);
});
