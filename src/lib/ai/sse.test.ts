import { test } from "node:test";
import { strict as assert } from "node:assert";
import { SseParser } from "./sse.ts";
test("decodes model delta after arbitrary chunk boundaries", () => {
  const parser = new SseParser();
  assert.deepEqual(parser.push('event: response.output_text.delta\r'), []);
  const events = parser.push('\ndata: {"type":"response.output_text.delta","delta":"hello"}\r\n\r\n');
  assert.deepEqual(events, [{ type: "response.output_text.delta", delta: "hello" }]);
});
test("reads multiple events and ignores DONE frames", () => {
  const parser = new SseParser();
  assert.deepEqual(parser.push('data: {"type":"response.completed"}\n\ndata: [DONE]\n\n'), [{ type: "response.completed" }]);
});
test("limits frames to stop unexpected unbounded provider buffering", () => {
  const parser = new SseParser();
  assert.throws(() => parser.push("a".repeat(262145)), /too large/);
});
