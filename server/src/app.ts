import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
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
import { isLocalRequest } from "./localOnly.ts";

export interface ServerOptions {
  /** 0 = any free port (desktop app). */
  port?: number;
  /** Built web UI to serve from the same origin (desktop app); dev uses the Vite server instead. */
  staticDir?: string;
  /** Save on SIGINT/SIGTERM and exit (standalone); the desktop app handles quitting itself. */
  handleSignals?: boolean;
  logger?: boolean;
}

export interface RunningServer {
  port: number;
  /** Stop running tasks, save the state, close the server. */
  shutdown(): Promise<void>;
}

const STATIC_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".json": "application/json; charset=utf-8",
};

export async function startServer(opts: ServerOptions = {}): Promise<RunningServer> {
  // RUNNER=mock|claude overrides the saved mode; without it the mode from the last session is kept.
  const runnerOverride: RunnerKind | undefined =
    process.env.RUNNER === "claude" ? "claude" : process.env.RUNNER === "mock" ? "mock" : undefined;

  const store = new Store(await loadState(detectCapabilities(), runnerOverride));
  const saver = persist(store, { handleSignals: opts.handleSignals ?? true });
  const runners = { mock: new MockRunner(), claude: new ClaudeCliRunner() };
  const currentRunner = () => runners[store.state.settings.runner];
  const queue = new TaskQueue(store, currentRunner);

  const clients = new Set<WebSocket>();
  const stateMessage = (state: GameState) => JSON.stringify({ type: "state", state } satisfies ServerMessage);
  store.onChange((state) => {
    const data = stateMessage(state);
    for (const socket of clients) socket.send(data);
  });

  const app = Fastify({ logger: opts.logger === false ? false : { level: "info" } });
  await app.register(websocket);

  // Before routing, so it also covers the WebSocket upgrade and the static UI.
  app.addHook("onRequest", async (req, reply) => {
    if (!isLocalRequest(req.headers.host, req.headers.origin)) {
      return reply.status(403).send({ error: "Dostęp tylko z tego komputera (localhost)." });
    }
  });

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

  if (opts.staticDir) {
    const root = path.resolve(opts.staticDir);
    // Anything that is not an API route is the single-page UI (or one of its assets).
    app.setNotFoundHandler(async (req, reply) => {
      if (req.method !== "GET" || req.url.startsWith("/api/")) return reply.status(404).send({ error: "Nie ma takiej ścieżki." });
      const wanted = path.resolve(root, "." + decodeURIComponent(req.url.split("?")[0]));
      const inside = wanted.startsWith(root + path.sep);
      const file = inside && (await stat(wanted).catch(() => null))?.isFile() ? wanted : path.join(root, "index.html");
      reply.header("Content-Type", STATIC_TYPES[path.extname(file)] ?? "application/octet-stream");
      return reply.send(createReadStream(file));
    });
  }

  await app.listen({ port: opts.port ?? 3001, host: "127.0.0.1" });
  const address = app.server.address();
  const port = typeof address === "object" && address ? address.port : (opts.port ?? 3001);
  app.log.info(`Stan: ${STATE_FILE} (agenci: ${store.state.agents.length}, zadania: ${store.state.tasks.length})`);

  return {
    port,
    async shutdown() {
      queue.cancelAll();
      saver.flush();
      await app.close();
    },
  };
}
