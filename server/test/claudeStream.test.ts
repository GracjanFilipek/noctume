import { test } from "node:test";
import assert from "node:assert/strict";
import { parseStreamLine } from "../src/runners/claudeStream.ts";

const line = (o: unknown) => JSON.stringify(o);

test("init becomes a started step listing tools", () => {
  const { steps } = parseStreamLine(line({ type: "system", subtype: "init", model: "claude-haiku-4-5", tools: ["Read", "Write"] }));
  assert.equal(steps[0].kind, "started");
  assert.match(steps[0].summary, /Read, Write/);
});

test("assistant text, thinking and tool_use map to steps", () => {
  const { steps } = parseStreamLine(
    line({
      type: "assistant",
      message: {
        content: [
          { type: "thinking", thinking: "Hmm, plan" },
          { type: "text", text: "Zaczynam." },
          { type: "tool_use", name: "Write", input: { file_path: "/w/ideas.md", content: "x" } },
        ],
      },
    }),
  );
  assert.deepEqual(
    steps.map((s) => s.kind),
    ["thinking", "text", "tool_use"],
  );
  assert.equal(steps[2].tool, "Write");
  assert.equal(steps[2].summary, "✍️ Write: /w/ideas.md");
});

test("failed tool results surface, successful ones are quiet", () => {
  const denied = parseStreamLine(
    line({ type: "user", message: { content: [{ type: "tool_result", is_error: true, content: "Permission denied" }] } }),
  );
  assert.equal(denied.steps[0].summary, "⛔ Permission denied");
  const ok = parseStreamLine(line({ type: "user", message: { content: [{ type: "tool_result", content: "ok" }] } }));
  assert.equal(ok.steps.length, 0);
});

test("result carries turns, duration and cost", () => {
  const { result } = parseStreamLine(
    line({ type: "result", subtype: "success", is_error: false, result: "Gotowe", num_turns: 3, duration_ms: 1200, total_cost_usd: 0.01 }),
  );
  assert.deepEqual(result, { isError: false, subtype: "success", text: "Gotowe", structured: undefined, turns: 3, durationMs: 1200, costUsd: 0.01 });
});

test("is_error with subtype success (e.g. not logged in) is an error", () => {
  const { result } = parseStreamLine(line({ type: "result", subtype: "success", is_error: true, result: "Not logged in" }));
  assert.equal(result?.isError, true);
});

test("max turns is an error subtype", () => {
  const { result } = parseStreamLine(line({ type: "result", subtype: "error_max_turns", is_error: false, num_turns: 15 }));
  assert.equal(result?.isError, true);
  assert.equal(result?.subtype, "error_max_turns");
});

test("garbage lines are ignored", () => {
  assert.deepEqual(parseStreamLine("not json"), { steps: [] });
});

test("structured output from --json-schema is exposed", () => {
  const { result } = parseStreamLine(
    line({ type: "result", subtype: "success", is_error: false, result: "{}", structured_output: { score: 8, approved: true, notes: "ok" } }),
  );
  assert.deepEqual(result?.structured, { score: 8, approved: true, notes: "ok" });
});
