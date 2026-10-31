import { test } from "node:test";
import { strict as assert } from "node:assert";
import { AiBadRequest, encodeEvent, readBoundedJson, safeTitle, validateChatInput } from "./contracts.ts";

test("validates and trims a first chat turn", () => {
  assert.deepEqual(validateChatInput({ conversationId: null, message: "  Help me  " }), { conversationId: null, message: "Help me" });
});
test("rejects untrusted conversation ids and excessive messages", () => {
  for (const input of [{ conversationId: "../other", message: "hi" }, { message: "x".repeat(6001) }, { message: "" }, null]) {
    assert.throws(() => validateChatInput(input), AiBadRequest);
  }
});
test("encodes NDJSON safely and generates a short title", () => {
  assert.deepEqual(JSON.parse(encodeEvent({ type: "delta", text: "a\nb" })), { type: "delta", text: "a\nb" });
  assert.equal(safeTitle("  hello\n  world "), "hello world");
});

test("reads a bounded JSON request body", async () => {
  const req = new Request("https://pinai.test/api/ai/stream", { method: "POST", body: JSON.stringify({ message: "hello" }) });
  assert.deepEqual(await readBoundedJson(req), { message: "hello" });
});
test("rejects excessively large POST bodies before JSON parsing", async () => {
  const req = new Request("https://pinai.test/api/ai/stream", { method: "POST", body: "z".repeat(9001) });
  await assert.rejects(readBoundedJson(req), (error: unknown) => error instanceof AiBadRequest && error.status === 413);
});
test("rejects malformed JSON", async () => {
  const req = new Request("https://pinai.test/api/ai/stream", { method: "POST", body: "{" });
  await assert.rejects(readBoundedJson(req), AiBadRequest);
});
