import { test } from "node:test";
import { strict as assert } from "node:assert";
import { AiBadRequest, encodeEvent, safeTitle, validateChatInput } from "./contracts.ts";

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
