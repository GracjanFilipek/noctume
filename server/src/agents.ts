import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { OFFICE, ROLES, SAFE_TOOLS, TIERS, type Agent, type ModelTier, type Role } from "@agent-tycoon/shared";
import type { AgentRunner } from "./runners/AgentRunner.ts";
import { fallbackPrompt, masterPromptRequest, PROMPT_WRITER_SYSTEM } from "./prompts.ts";
import { GameError, type Store } from "./store.ts";

export interface HireInput {
  name: string;
  role: Role;
  model: ModelTier;
  description?: string;
  systemPrompt?: string;
}

/** The model that writes master prompts: good enough to be worth it, cheap enough to not think twice. */
const PROMPT_WRITER_MODEL: ModelTier = "sonnet";

function validate(input: HireInput) {
  const name = input.name?.trim();
  if (!name) throw new GameError("Podaj imię agenta.");
  if (!(input.role in ROLES)) throw new GameError("Nieznana rola.");
  if (!(input.model in TIERS)) throw new GameError("Nieznany poziom.");
  return name;
}

/** Expands the player's short description into a detailed master prompt (no tools, one shot). */
export async function generateMasterPrompt(store: Store, runner: AgentRunner, input: HireInput): Promise<string> {
  const name = validate(input);
  const out = await runner.run(
    {
      id: `prompt-${randomUUID()}`,
      purpose: "prompt",
      cwd: tmpdir(),
      model: PROMPT_WRITER_MODEL,
      prompt: masterPromptRequest({ ...input, name, description: input.description ?? "" }),
      systemPrompt: PROMPT_WRITER_SYSTEM,
      tools: [],
      maxTurns: 2,
    },
    () => {},
  );
  if (out.cost) {
    store.state.studio.realCostUsd += out.cost;
    store.changed();
  }
  const prompt = out.text.trim();
  if (!prompt) throw new GameError("Model nie zwrócił promptu — spróbuj jeszcze raz.");
  return prompt;
}

export function hireAgent(store: Store, input: HireInput): Agent {
  const name = validate(input);
  const description = input.description?.trim() ?? "";
  const agent: Agent = {
    id: randomUUID(),
    name,
    role: input.role,
    model: input.model,
    description,
    systemPrompt: input.systemPrompt?.trim() || fallbackPrompt(input.role, description),
    tools: [...SAFE_TOOLS],
    level: 1,
    xp: 0,
    lessons: [],
    status: "idle",
    deskPosition: freeDesk(store.state.agents),
  };
  store.state.agents.push(agent);
  store.changed();
  return agent;
}

export function updateAgent(store: Store, id: string, patch: { systemPrompt?: string; tools?: string[] }) {
  const agent = store.agent(id);
  if (patch.systemPrompt !== undefined) agent.systemPrompt = patch.systemPrompt;
  if (patch.tools !== undefined) agent.tools = patch.tools.filter((t) => typeof t === "string");
  store.changed();
  return agent;
}

export function fireAgent(store: Store, id: string, busy: Set<string>) {
  store.agent(id);
  if (busy.has(id)) throw new GameError("Agent jest w zespole trwającego zadania — najpierw je anuluj.");
  const { state } = store;
  state.agents = state.agents.filter((a) => a.id !== id);
  for (const task of state.tasks) {
    if (!task.assigneeIds.includes(id)) continue;
    if (task.status === "backlog" || task.status === "queued" || task.status === "failed") {
      task.assigneeIds = task.assigneeIds.filter((a) => a !== id);
      if (task.status === "queued" && !task.assigneeIds.length) task.status = "backlog";
    }
  }
  store.changed();
}

function freeDesk(agents: Agent[]) {
  for (let y = 0; y < OFFICE.rows; y++) {
    for (let x = 0; x < OFFICE.cols; x++) {
      if (!agents.some((a) => a.deskPosition.x === x && a.deskPosition.y === y)) return { x, y };
    }
  }
  throw new GameError("Biuro jest pełne — brak wolnych biurek.");
}
