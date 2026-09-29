import { spawn } from "node:child_process";
import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import type { RunnerKind } from "@agent-tycoon/shared";
import { fireAgent, generateMasterPrompt, hireAgent, updateAgent, type HireInput } from "./agents.ts";
import type { AgentRunner } from "./runners/AgentRunner.ts";
import { GameError, type Store } from "./store.ts";
import type { TaskInput, TaskQueue } from "./taskQueue.ts";
import { workspaceDir } from "./workspace.ts";

type IdParams = { Params: { id: string } };

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".html": "text/html; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
};

export function registerRoutes(app: FastifyInstance, store: Store, queue: TaskQueue, runner: () => AgentRunner) {
  app.get("/api/state", async () => store.state);

  // --- agents ---
  app.post<{ Body: HireInput }>("/api/agents/generate-prompt", async (req) => ({
    systemPrompt: await generateMasterPrompt(store, runner(), req.body ?? ({} as HireInput)),
  }));

  app.post<{ Body: HireInput }>("/api/agents", async (req) => hireAgent(store, req.body ?? ({} as HireInput)));

  app.patch<IdParams & { Body: { systemPrompt?: string; tools?: string[] } }>("/api/agents/:id", async (req) =>
    updateAgent(store, req.params.id, req.body ?? {}),
  );

  app.post<IdParams>("/api/agents/:id/reset", async (req) => {
    const agent = store.agent(req.params.id);
    if (agent.status === "stuck") agent.status = "idle";
    store.changed();
    queue.pump();
    return agent;
  });

  app.delete<IdParams>("/api/agents/:id", async (req) => {
    fireAgent(store, req.params.id, queue.busyAgentIds());
    return { ok: true };
  });

  // --- tasks ---
  app.post<{ Body: TaskInput & { start?: boolean } }>("/api/tasks", async (req) => {
    const task = queue.createTask(req.body ?? {});
    if (req.body?.start) queue.start(task.id);
    return task;
  });

  app.patch<IdParams & { Body: TaskInput }>("/api/tasks/:id", async (req) => queue.updateTask(req.params.id, req.body ?? {}));

  app.post<IdParams>("/api/tasks/:id/start", async (req) => {
    queue.start(req.params.id);
    return { ok: true };
  });

  app.post<IdParams>("/api/tasks/:id/cancel", async (req) => {
    queue.cancel(req.params.id);
    return { ok: true };
  });

  app.delete<IdParams>("/api/tasks/:id", async (req) => {
    queue.deleteTask(req.params.id);
    return { ok: true };
  });

  /** Serves a file from the task's workspace only; ?download=1 forces a download. */
  app.get<{ Params: { id: string; "*": string }; Querystring: { download?: string } }>(
    "/api/tasks/:id/files/*",
    async (req, reply) => {
      const task = store.task(req.params.id);
      const root = workspaceDir(task.id);
      const file = path.resolve(root, req.params["*"]);
      if (!file.startsWith(root + path.sep)) throw new GameError("Niedozwolona ścieżka.", 403);
      const info = await stat(file).catch(() => null);
      if (!info?.isFile()) throw new GameError("Nie ma takiego pliku.", 404);
      const name = encodeURIComponent(path.basename(file));
      reply
        .header("Content-Type", CONTENT_TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream")
        .header("Content-Disposition", `${req.query.download ? "attachment" : "inline"}; filename*=UTF-8''${name}`);
      return reply.send(createReadStream(file));
    },
  );

  app.post<IdParams>("/api/tasks/:id/reveal", async (req) => {
    const dir = workspaceDir(store.task(req.params.id).id);
    if (process.platform !== "darwin") throw new GameError("„Pokaż w Finderze” działa tylko na macOS.");
    if (!existsSync(dir)) throw new GameError("Ten projekt nie ma jeszcze katalogu.", 404);
    spawn("open", [dir], { stdio: "ignore", detached: true }).unref();
    return { ok: true };
  });

  // --- settings ---
  app.patch<{ Body: { runner?: RunnerKind; maxParallel?: number } }>("/api/settings", async (req) => {
    const { settings } = store.state;
    const { runner: kind, maxParallel } = req.body ?? {};
    if (kind !== undefined) {
      if (kind !== "mock" && kind !== "claude") throw new GameError("Nieznany tryb.");
      settings.runner = kind;
    }
    if (maxParallel !== undefined) {
      if (!Number.isInteger(maxParallel) || maxParallel < 1 || maxParallel > 5) {
        throw new GameError("Limit równoległości: 1–5.");
      }
      settings.maxParallel = maxParallel;
    }
    store.changed();
    queue.pump();
    return settings;
  });
}
