import Fastify from "fastify";
import websocket from "@fastify/websocket";
import type { WebSocket } from "ws";
import type { GameState, RunnerKind, ServerMessage } from "@agent-tycoon/shared";
import { GameError, Store } from "./store.ts";
import { loadState, persist, STATE_FILE } from "./persistence.ts";
import { TaskQueue } from "./taskQueue.ts";
import { MockRunner } from "./runners/MockRunner.ts";
import { ClaudeCliRunner } from "./runners/ClaudeCliRunner.ts";
import { registerRoutes } from "./routes.ts";
import { detectCapabilities } from "./export.ts";

const PORT = Number(process.env.PORT ?? 3001);
// RUNNER=mock|claude overrides the saved mode; without it the mode from the last session is kept.
const runnerOverride: RunnerKind | undefined =
  process.env.RUNNER === "claude" ? "claude" : process.env.RUNNER === "mock" ? "mock" : undefined;

const store = new Store(await loadState(detectCapabilities(), runnerOverride));
persist(store);
const runners = { mock: new MockRunner(), claude: new ClaudeCliRunner() };
const currentRunner = () => runners[store.state.settings.runner];
const queue = new TaskQueue(store, currentRunner);

const clients = new Set<WebSocket>();
const stateMessage = (state: GameState) => JSON.stringify({ type: "state", state } satisfies ServerMessage);
store.onChange((state) => {
  const data = stateMessage(state);
  for (const socket of clients) socket.send(data);
});

const app = Fastify({ logger: { level: "info" } });
await app.register(websocket);

app.setErrorHandler((err, _req, reply) => {
  if (err instanceof GameError) return reply.status(err.statusCode).send({ error: err.message });
  app.log.error(err);
  return reply.status(500).send({ error: "Błąd serwera." });
});

app.get("/ws", { websocket: true }, (socket) => {
  clients.add(socket);
  socket.send(stateMessage(store.state));
  socket.on("close", () => clients.delete(socket));
});

registerRoutes(app, store, queue, currentRunner);

await app.listen({ port: PORT, host: "127.0.0.1" });
app.log.info(`Stan: ${STATE_FILE} (agenci: ${store.state.agents.length}, zadania: ${store.state.tasks.length})`);
