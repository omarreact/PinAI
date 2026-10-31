import assert from "node:assert/strict";
import test from "node:test";
import { parsePlan, systemPrompt } from "../src/lib/terminal/planner.ts";

test("the shared planner accepts only supported public-page tools", () => {
  const plan = parsePlan(
    '{"intent":"tool","tool":"headers","url":"https://example.com","reply":"Reading headers"}',
  );
  assert.equal(plan.tool, "headers");
  assert.equal(plan.intent, "tool");
  assert.equal(parsePlan('{"intent":"tool","tool":"shell","reply":"No"}').intent, "chat");
});
test("planner prose and malformed output remain bounded plain replies", () => {
  const plan = parsePlan("```json\ninvalid\n```\n" + "x".repeat(10000));
  assert.equal(plan.tool, null);
  assert.ok(plan.reply.length <= 4000);
  assert.ok(!plan.reply.includes("```"));
});
test("planner prompt carries the previous page and preserves tool boundaries", () => {
  const prompt = systemPrompt("https://example.com/", "grok");
  assert.match(prompt, /Previous site: https:\/\/example.com\//);
  assert.match(prompt, /only public page reads/);
});
