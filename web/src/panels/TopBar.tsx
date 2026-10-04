import type { GameState, RunnerKind } from "@agent-tycoon/shared";
import type { Connection } from "../useServer.ts";
import { api } from "../api.ts";
import { ActiveIcon, ChevronDown, ChevronUp, ClaudeIcon, ConnectionIcon, CostIcon, MockIcon } from "../ui/icons.tsx";

const CONNECTION: Record<Connection, { label: string; color: string }> = {
  connecting: { label: "łączenie…", color: "#7E8F83" },
  open: { label: "połączono", color: "#7BE495" },
  closed: { label: "brak połączenia", color: "#FF4D5E" },
};

/** The server accepts a parallelism limit of 1–5. */
const LIMIT_MIN = 1;
const LIMIT_MAX = 5;

interface Props {
  state: GameState | null;
  connection: Connection;
  act: (fn: () => Promise<unknown>) => void;
}

export function TopBar({ state, connection, act }: Props) {
  const running = state?.tasks.filter((t) => t.status === "in_progress" || t.status === "review").length ?? 0;
  const settings = state?.settings;
  const limit = settings?.maxParallel ?? 2;
  const conn = CONNECTION[connection];

  const setRunner = (runner: RunnerKind) => {
    if (runner === settings?.runner) return;
    if (runner === "claude" && !confirm("Tryb Claude uruchamia prawdziwe wywołania `claude -p` i zużywa limity subskrypcji. Włączyć?")) return;
    act(() => api("PATCH", "/settings", { runner }));
  };
  const setLimit = (maxParallel: number) => act(() => api("PATCH", "/settings", { maxParallel }));

  return (
    <header className="hud">
      <div className="hud-logo">
        <span>NOCTUA</span>
      </div>

      <div className="hud-reading" title="Ile te wywołania kosztowałyby po stawkach API. Na subskrypcji nic nie płacisz — to miara zużycia limitu.">
        <CostIcon />
        <div className="hud-reading-text">
          <span className="hud-label">KOSZT API (REALNY)</span>
          <span className="hud-value">${state ? state.studio.realCostUsd.toFixed(2) : "–"}</span>
        </div>
      </div>

      <div className="hud-reading" title="Zadania w toku / limit równoległości">
        <ActiveIcon active={running > 0} />
        <div className="hud-reading-text">
          <span className="hud-label">AKTYWNI / LIMIT</span>
          <span className="hud-value">
            {running} <span className="hud-dim">/</span> {limit}
          </span>
        </div>
        <div className="hud-stepper">
          <button type="button" aria-label="Zwiększ limit równoległości" disabled={!settings || limit >= LIMIT_MAX} onClick={() => setLimit(limit + 1)}>
            <ChevronUp />
          </button>
          <button type="button" aria-label="Zmniejsz limit równoległości" disabled={!settings || limit <= LIMIT_MIN} onClick={() => setLimit(limit - 1)}>
            <ChevronDown />
          </button>
        </div>
      </div>

      <div className="grow" />

      <div role="group" aria-label="Tryb wykonania" className="hud-mode">
        <button type="button" aria-pressed={settings?.runner === "mock"} onClick={() => setRunner("mock")}>
          <MockIcon />
          Mock
        </button>
        <button type="button" aria-pressed={settings?.runner === "claude"} onClick={() => setRunner("claude")}>
          <ClaudeIcon />
          Claude
        </button>
      </div>

      <div className="hud-conn" style={{ color: conn.color }}>
        <ConnectionIcon color={conn.color} />
        <span>{conn.label}</span>
      </div>
    </header>
  );
}
