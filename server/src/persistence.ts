import { existsSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { FORMATS, ROLES, SAFE_TOOLS, TIERS, type Agent, type Capabilities, type GameState, type RunnerKind, type Task } from "@agent-tycoon/shared";
import { initialState, type Store } from "./store.ts";
import { NOCTUME_HOME } from "./workspace.ts";

export const DATA_DIR = path.join(NOCTUME_HOME, "data");
export const STATE_FILE = path.join(DATA_DIR, "state.json");
const SAVE_DELAY_MS = 300;

export const INTERRUPTED = "Przerwane — NOCTUME została zamknięta lub zrestartowana w trakcie pracy.";

/**
 * Loads the saved state (or starts fresh). Capabilities are always re-detected; the runner comes from the file
 * unless RUNNER is set explicitly. A corrupt file is kept aside as state.corrupt-<time>.json, never overwritten.
 */
export async function loadState(capabilities: Capabilities, runnerOverride?: RunnerKind): Promise<GameState> {
  const fresh = initialState(runnerOverride ?? "mock", capabilities);
  if (!existsSync(STATE_FILE)) return fresh;
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(STATE_FILE, "utf8"));
  } catch (err) {
    const aside = path.join(DATA_DIR, `state.corrupt-${Date.now()}.json`);
    await rename(STATE_FILE, aside);
    console.warn(`[stan] Nie da się odczytać ${STATE_FILE} (${(err as Error).message}). Odłożony jako ${aside}; start od zera.`);
    return fresh;
  }
  const state = normalize(raw, fresh);
  if (runnerOverride) state.settings.runner = runnerOverride;
  recoverInterrupted(state);
  return state;
}

/**
 * Saves after every change (debounced), one write at a time, atomically (temp file + rename),
 * and synchronously on shutdown so the last change survives a restart.
 */
export function persist(store: Store, { handleSignals = true }: { handleSignals?: boolean } = {}) {
  let timer: NodeJS.Timeout | undefined;
  let writing = false;
  let again = false;

  const snapshot = () => JSON.stringify(withoutRuntime(store.state), null, 2);

  const save = async () => {
    if (writing) {
      again = true;
      return;
    }
    writing = true;
    try {
      mkdirSync(DATA_DIR, { recursive: true });
      const tmp = `${STATE_FILE}.tmp`;
      await writeFile(tmp, snapshot());
      await rename(tmp, STATE_FILE);
    } catch (err) {
      console.error("[stan] Zapis nie powiódł się:", err);
    } finally {
      writing = false;
      if (again) {
        again = false;
        void save();
      }
    }
  };

  store.onChange(() => {
    clearTimeout(timer);
    timer = setTimeout(save, SAVE_DELAY_MS);
  });

  const flush = () => {
    clearTimeout(timer);
    try {
      mkdirSync(DATA_DIR, { recursive: true });
      const tmp = `${STATE_FILE}.tmp`;
      writeFileSync(tmp, snapshot());
      renameSync(tmp, STATE_FILE);
    } catch (err) {
      console.error("[stan] Zapis przy zamykaniu nie powiódł się:", err);
    }
  };
  // Standalone server: save on Ctrl+C / tsx restarts. The desktop app calls flush() itself on quit.
  if (handleSignals) {
    for (const signal of ["SIGINT", "SIGTERM"] as const) {
      process.once(signal, () => {
        flush();
        process.exit(0);
      });
    }
  }
  return { flush };
}

/** Capabilities describe this machine, not the save; they are re-detected on every start. */
function withoutRuntime(state: GameState): Omit<GameState, "capabilities"> {
  const { capabilities: _ignored, ...rest } = state;
  return rest;
}

/**
 * A restart kills every running `claude` process, so nothing can still be in flight:
 * running tasks fail with a clear reason, queued ones go back to the backlog (a restart never starts paid runs
 * on its own), and working agents are idle again. Stuck agents stay stuck — that needs a human.
 */
export function recoverInterrupted(state: GameState) {
  for (const task of state.tasks) {
    if (task.status === "in_progress" || task.status === "review") {
      task.status = "failed";
      task.error = INTERRUPTED;
      for (const step of task.steps) if (step.status === "running") step.status = "failed";
      task.events.push({ taskId: task.id, agentId: task.assigneeIds[0] ?? "", kind: "error", summary: `❗ ${INTERRUPTED}`, at: Date.now() });
    } else if (task.status === "queued") {
      task.status = "backlog";
    }
  }
  for (const agent of state.agents) if (agent.status === "working") agent.status = "idle";
}

/** Accepts older or hand-edited files: unknown fields are dropped, missing ones get defaults. */
export function normalize(raw: unknown, fresh: GameState): GameState {
  const r = (raw ?? {}) as Partial<GameState>;
  const studio = r.studio ?? fresh.studio;
  const settings = r.settings ?? fresh.settings;
  const agents = Array.isArray(r.agents) ? r.agents.filter(isObject).map(normalizeAgent).filter((a): a is Agent => !!a) : [];
  const agentIds = new Set(agents.map((a) => a.id));
  const tasks = Array.isArray(r.tasks) ? r.tasks.filter(isObject).map((t) => normalizeTask(t, agentIds)).filter((t): t is Task => !!t) : [];
  return {
    studio: { reputation: num(studio.reputation, 0), realCostUsd: num(studio.realCostUsd, 0) },
    agents,
    tasks,
    settings: {
      runner: settings.runner === "claude" ? "claude" : "mock",
      maxParallel: Math.min(5, Math.max(1, Math.round(num(settings.maxParallel, 2)))),
    },
    capabilities: fresh.capabilities,
  };
}

function normalizeAgent(a: Partial<Agent>): Agent | undefined {
  if (typeof a.id !== "string" || typeof a.name !== "string" || !a.role || !(a.role in ROLES)) return undefined;
  return {
    id: a.id,
    name: a.name,
    role: a.role,
    model: a.model && a.model in TIERS ? a.model : "haiku",
    description: typeof a.description === "string" ? a.description : "",
    systemPrompt: typeof a.systemPrompt === "string" ? a.systemPrompt : "",
    tools: Array.isArray(a.tools) ? a.tools.filter((t) => typeof t === "string") : [...SAFE_TOOLS],
    level: num(a.level, 1),
    xp: num(a.xp, 0),
    lessons: Array.isArray(a.lessons) ? a.lessons.filter((l) => typeof l === "string") : [],
    status: a.status === "stuck" || a.status === "working" ? a.status : "idle",
    deskPosition: a.deskPosition && typeof a.deskPosition.x === "number" ? a.deskPosition : { x: 0, y: 0 },
  };
}

function normalizeTask(t: Partial<Task>, agentIds: Set<string>): Task | undefined {
  if (typeof t.id !== "string" || typeof t.title !== "string") return undefined;
  const statuses = ["backlog", "queued", "in_progress", "review", "done", "failed"];
  return {
    id: t.id,
    title: t.title,
    brief: typeof t.brief === "string" ? t.brief : "",
    // Agents fired while the server was down (or missing from the file) drop out of the team.
    assigneeIds: Array.isArray(t.assigneeIds) ? t.assigneeIds.filter((id) => agentIds.has(id)) : [],
    format: t.format && t.format in FORMATS ? t.format : "auto",
    status: t.status && statuses.includes(t.status) ? t.status : "backlog",
    steps: Array.isArray(t.steps) ? t.steps : [],
    events: Array.isArray(t.events) ? t.events : [],
    result: t.result,
    error: t.error,
    score: t.score,
    createdAt: num(t.createdAt, Date.now()),
  };
}

function isObject(v: unknown): v is Record<string, never> {
  return typeof v === "object" && v !== null;
}

function num(v: unknown, fallback: number) {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
