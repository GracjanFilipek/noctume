import { test } from "node:test";
import assert from "node:assert/strict";
import { isLocalRequest } from "../src/localOnly.ts";

test("accepts the UI and local tools", () => {
  assert.ok(isLocalRequest("127.0.0.1:3001", undefined)); // curl, scripts
  assert.ok(isLocalRequest("localhost:5173", "http://localhost:5173")); // Vite dev proxy
  assert.ok(isLocalRequest("127.0.0.1:52811", "http://127.0.0.1:52811")); // desktop app
  assert.ok(isLocalRequest("[::1]:3001", "http://[::1]:3001"));
});

test("rejects other websites (cross-site requests and WebSocket)", () => {
  assert.ok(!isLocalRequest("127.0.0.1:3001", "https://evil.example"));
  assert.ok(!isLocalRequest("127.0.0.1:3001", "http://localhost.evil.example"));
  assert.ok(!isLocalRequest("127.0.0.1:3001", "null"));
  assert.ok(!isLocalRequest("127.0.0.1:3001", "file://"));
});

test("rejects DNS rebinding (foreign Host header)", () => {
  assert.ok(!isLocalRequest("evil.example:3001", "http://evil.example:3001"));
  assert.ok(!isLocalRequest("evil.example", undefined));
  assert.ok(!isLocalRequest("127.0.0.1.evil.example", undefined));
  assert.ok(!isLocalRequest(undefined, undefined));
});
