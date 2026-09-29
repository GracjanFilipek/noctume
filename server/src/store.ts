import type { Agent, Capabilities, GameState, RunnerKind, Task } from "@agent-tycoon/shared";

export class GameError extends Error {
  constructor(message: string, readonly statusCode = 400) {
    super(message);
  }
}

export function initialState(runner: RunnerKind, capabilities: Capabilities): GameState {
  return {
    studio: { reputation: 0, realCostUsd: 0 },
    agents: [],
    tasks: [],
    settings: { runner, maxParallel: 2 },
    capabilities,
  };
}

/** Holds the game state; mutate it in place, then call changed() to notify listeners (coalesced). */
export class Store {
  private listeners = new Set<(state: GameState) => void>();
  private scheduled = false;

  constructor(readonly state: GameState) {}

  onChange(fn: (state: GameState) => void) {
    this.listeners.add(fn);
  }

  changed() {
    if (this.scheduled) return;
    this.scheduled = true;
    setTimeout(() => {
      this.scheduled = false;
      for (const fn of this.listeners) fn(this.state);
    }, 50);
  }

  agent(id: string | undefined): Agent {
    const agent = this.state.agents.find((a) => a.id === id);
    if (!agent) throw new GameError("Nie ma takiego agenta.", 404);
    return agent;
  }

  task(id: string): Task {
    const task = this.state.tasks.find((t) => t.id === id);
    if (!task) throw new GameError("Nie ma takiego zadania.", 404);
    return task;
  }
}
