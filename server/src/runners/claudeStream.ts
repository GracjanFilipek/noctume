import { TOOL_ICONS } from "@agent-tycoon/shared";
import type { RunStep } from "./AgentRunner.ts";

/** One step parsed from a `claude -p --output-format stream-json` line. */
export type StreamStep = RunStep;

export interface StreamResult {
  isError: boolean;
  /** e.g. "success", "error_max_turns", "error_during_execution" */
  subtype: string;
  text: string;
  /** Present when the run used --json-schema. */
  structured?: unknown;
  turns?: number;
  durationMs?: number;
  costUsd?: number;
}

export interface ParsedLine {
  steps: StreamStep[];
  result?: StreamResult;
}

const SHORT = 140;

/** Maps one JSON line of the CLI stream to UI steps (and the final result, if this line carries it). */
export function parseStreamLine(line: string): ParsedLine {
  let msg: any;
  try {
    msg = JSON.parse(line);
  } catch {
    return { steps: [] };
  }

  switch (msg?.type) {
    case "system":
      if (msg.subtype === "init") {
        return { steps: [{ kind: "started", summary: `Start (${msg.model ?? "?"}), narzędzia: ${(msg.tools ?? []).join(", ") || "brak"}` }] };
      }
      return { steps: [] };

    case "assistant":
      return { steps: contentBlocks(msg).flatMap(assistantBlock) };

    case "user":
      return { steps: contentBlocks(msg).flatMap(toolResultBlock) };

    case "result":
      return {
        steps: [],
        result: {
          isError: Boolean(msg.is_error) || msg.subtype !== "success",
          subtype: String(msg.subtype ?? "unknown"),
          text: typeof msg.result === "string" ? msg.result : "",
          structured: msg.structured_output ?? undefined,
          turns: num(msg.num_turns),
          durationMs: num(msg.duration_ms),
          costUsd: num(msg.total_cost_usd),
        },
      };

    default:
      return { steps: [] };
  }
}

function assistantBlock(block: any): StreamStep[] {
  switch (block?.type) {
    case "text":
      return block.text?.trim() ? [{ kind: "text", summary: `💬 ${short(block.text)}` }] : [];
    case "thinking":
      return [{ kind: "thinking", summary: `💭 ${short(block.thinking ?? "myśli…")}` }];
    case "tool_use": {
      const name = String(block.name ?? "narzędzie");
      if (name === "StructuredOutput") return [{ kind: "tool_use", tool: name, summary: "📋 Werdykt gotowy" }];
      const detail = toolDetail(block.input);
      return [{ kind: "tool_use", tool: name, summary: `${TOOL_ICONS[name] ?? "🔧"} ${name}${detail ? `: ${detail}` : ""}` }];
    }
    default:
      return [];
  }
}

/** Only failed tool calls are interesting to the player (notably permission denials). */
function toolResultBlock(block: any): StreamStep[] {
  if (block?.type !== "tool_result" || !block.is_error) return [];
  const content = Array.isArray(block.content)
    ? block.content.map((c: any) => c?.text ?? "").join(" ")
    : String(block.content ?? "");
  return [{ kind: "tool_result", summary: `⛔ ${short(content)}` }];
}

function toolDetail(input: any): string {
  if (!input || typeof input !== "object") return "";
  const value = input.file_path ?? input.path ?? input.pattern ?? input.query ?? input.url ?? input.command ?? input.description;
  return typeof value === "string" ? short(value, 80) : "";
}

function contentBlocks(msg: any): any[] {
  return Array.isArray(msg?.message?.content) ? msg.message.content : [];
}

function short(text: string, max = SHORT) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}
