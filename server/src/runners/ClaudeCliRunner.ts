import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import { CancelledError, type AgentRunner, type RunOutput, type RunRequest, type RunStep } from "./AgentRunner.ts";
import { parseStreamLine, type StreamResult } from "./claudeStream.ts";

const TIMEOUT_MS = Number(process.env.TASK_TIMEOUT_MS ?? 10 * 60_000);
const KILL_GRACE_MS = 3000;

/**
 * Tools whose use is confined to the run's cwd via path-scoped permission rules.
 * Paths starting with "./" are resolved against the process cwd (the workspace).
 * Edit(...) rules cover every file-editing tool (Edit, Write); Read(...) rules cover Read, Glob and Grep.
 */
const FILE_RULES: Record<string, string> = {
  Read: "Read(./**)",
  Glob: "Read(./**)",
  Grep: "Read(./**)",
  Edit: "Edit(./**)",
  Write: "Edit(./**)",
};

/** Runs a request as a headless `claude -p` child process in req.cwd. */
export class ClaudeCliRunner implements AgentRunner {
  private children = new Map<string, { child: ChildProcess; cancelled: boolean }>();

  async run(req: RunRequest, onStep: (step: RunStep) => void): Promise<RunOutput> {
    const child = spawn(claudeBin(), buildArgs(req), {
      cwd: req.cwd,
      env: childEnv(),
      stdio: ["ignore", "pipe", "pipe"],
    });
    const entry = { child, cancelled: false };
    this.children.set(req.id, entry);

    let result: StreamResult | undefined;
    let stderr = "";
    child.stderr!.on("data", (chunk) => {
      stderr = (stderr + chunk).slice(-4000);
    });
    createInterface({ input: child.stdout! }).on("line", (line) => {
      const parsed = parseStreamLine(line);
      for (const step of parsed.steps) onStep(step);
      if (parsed.result) result = parsed.result;
    });

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      kill(child);
    }, TIMEOUT_MS);

    try {
      const exitCode = await new Promise<number | null>((resolve, reject) => {
        child.on("error", reject); // e.g. ENOENT: claude binary not found
        child.on("close", resolve);
      });

      if (entry.cancelled) throw new CancelledError();
      if (timedOut) throw new Error(`Przekroczono limit czasu (${Math.round(TIMEOUT_MS / 60000)} min).`);
      if (!result) throw new Error(`claude zakończył się kodem ${exitCode} bez wyniku. ${stderr.trim()}`.trim());
      if (result.isError) throw new Error(describeFailure(result));

      return {
        text: result.text,
        structured: result.structured,
        turns: result.turns,
        durationMs: result.durationMs,
        cost: result.costUsd,
      };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        throw new Error("Nie znaleziono programu `claude`. Ustaw CLAUDE_BIN albo dodaj go do PATH.");
      }
      throw err;
    } finally {
      clearTimeout(timer);
      this.children.delete(req.id);
    }
  }

  cancel(id: string) {
    const entry = this.children.get(id);
    if (!entry) return;
    entry.cancelled = true;
    kill(entry.child);
  }
}

export function buildArgs(req: RunRequest): string[] {
  const allowed = [...new Set(req.tools.map((t) => FILE_RULES[t] ?? t))];
  const args = [
    "-p",
    req.prompt,
    "--output-format",
    "stream-json",
    "--verbose",
    "--model",
    req.model,
    "--append-system-prompt",
    req.systemPrompt,
    // --tools limits which tools exist at all: without "Bash" here the agent has no shell.
    "--tools",
    req.tools.join(","), // "" disables all tools
    // dontAsk: anything not pre-approved below is denied instead of waiting for a human.
    "--permission-mode",
    "dontAsk",
    "--max-turns",
    String(req.maxTurns),
    "--strict-mcp-config",
    "--disable-slash-commands",
    "--no-session-persistence",
  ];
  if (allowed.length) args.push("--allowedTools", allowed.join(","));
  if (!req.tools.includes("Bash")) args.push("--disallowedTools", "Bash");
  if (req.jsonSchema) args.push("--json-schema", JSON.stringify(req.jsonSchema));
  return args;
}

function describeFailure(result: StreamResult): string {
  if (result.subtype === "error_max_turns") return `Agent przekroczył limit tur (${result.turns ?? "?"}).`;
  return result.text || `Błąd wykonania (${result.subtype}).`;
}

/**
 * `claude` from CLAUDE_BIN, else PATH, else the usual install locations. An app started from the Dock does not
 * get the terminal's PATH, so the native installer, Homebrew and global npm folders are checked explicitly.
 */
export function claudeBin(): string {
  if (process.env.CLAUDE_BIN) return process.env.CLAUDE_BIN;
  const home = homedir();
  const dirs = [
    ...(process.env.PATH ?? "").split(path.delimiter).filter(Boolean),
    path.join(home, ".local", "bin"),
    path.join(home, ".claude", "local"),
    "/opt/homebrew/bin",
    "/usr/local/bin",
    path.join(home, ".npm-global", "bin"),
  ];
  for (const dir of dirs) {
    const candidate = path.join(dir, "claude");
    if (existsSync(candidate)) return candidate;
  }
  return "claude";
}

/** Subscription only: never let an API key in the environment switch the agent to API billing. */
function childEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  // Don't look like a nested session if the server itself was started from Claude Code.
  delete env.CLAUDECODE;
  delete env.CLAUDE_CODE_ENTRYPOINT;
  return env;
}

function kill(child: ChildProcess) {
  const running = () => child.exitCode === null && child.signalCode === null;
  if (!running()) return;
  child.kill("SIGTERM");
  setTimeout(() => running() && child.kill("SIGKILL"), KILL_GRACE_MS).unref();
}
