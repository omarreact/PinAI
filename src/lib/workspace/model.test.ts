import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canVerify, diagnoseLog, makeAgentBrief, parseWorkspace, starterWorkspace } from "./model.ts";

describe("PinAI workspace schema and safety", () => {
  it("round-trips the initial workspace", () => {
    const output = parseWorkspace(JSON.parse(JSON.stringify(starterWorkspace)));
    assert.deepEqual(output, starterWorkspace);
  });
  it("rejects unknown versions", () => {
    assert.throws(() => parseWorkspace({ ...starterWorkspace, version: 2 }), /Unsupported/);
  });
  it("rejects forged verified tasks without evidence", () => {
    const bad = structuredClone(starterWorkspace);
    bad.tasks[0].status = "verified";
    bad.tasks[0].evidence = [];
    assert.equal(canVerify(bad.tasks[0]), false);
    assert.throws(() => parseWorkspace(bad), /Verified tasks/);
  });
  it("rejects bad references and duplicate project IDs", () => {
    const bad = structuredClone(starterWorkspace);
    bad.tasks[0].projectId = "not-in-projects";
    assert.throws(() => parseWorkspace(bad), /unknown project/);
    const duplicated = structuredClone(starterWorkspace);
    duplicated.projects.push({ ...duplicated.projects[0] });
    assert.throws(() => parseWorkspace(duplicated), /Duplicate project/);
  });
  it("rejects excessive imported tasks", () => {
    const bad = structuredClone(starterWorkspace);
    bad.tasks = Array.from({ length: 1001 }, (_, n) => ({ ...bad.tasks[0], id: `task-${n}` }));
    assert.throws(() => parseWorkspace(bad), /Invalid task collection/);
  });
  it("includes project guardrails, acceptance and existing evidence in agent handoff", () => {
    const prompt = makeAgentBrief(starterWorkspace.projects[0], starterWorkspace.tasks[0], "Codex");
    assert.match(prompt, /Preserve the original web app/);
    assert.match(prompt, /do not merge/i);
    assert.match(prompt, /Definition of done/);
    assert.match(prompt, /41076761441/);
  });
  it("does not claim an exact root cause from an unassigned runner", () => {
    const result = diagnoseLog("runner_id: 0; steps: []");
    assert.match(result.category, /Hosted runner/);
    assert.match(result.meaning, /not proof/i);
  });
  it("separates a missing module from infrastructure", () => {
    const result = diagnoseLog("module_not_found: Can't resolve './widget'");
    assert.match(result.category, /Module resolution/);
  });
});
