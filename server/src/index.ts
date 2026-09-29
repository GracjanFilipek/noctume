import Fastify from "fastify";
import websocket from "@fastify/websocket";
import type { WebSocket } from "ws";
import type { GameState, RunnerKind, ServerMessage } from "@agent-tycoon/shared";
import { GameError, Store, initialState } from "./store.ts";
import { TaskQueue } from "./taskQueue.ts";
import { MockRunner } from "./runners/MockRunner.ts";
import { ClaudeCliRunner } from "./runners/ClaudeCliRunner.ts";
import { registerRoutes } from "./routes.ts";
import { detectCapabilities } from "./export.ts";

const PORT = Number(process.env.PORT ?? 3001);
const runner: RunnerKind = process.env.RUNNER === "claude" ? "claude" : "mock";

const store = new Store(initialState(runner, detectCapabilities()));
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
