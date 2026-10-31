import assert from "node:assert/strict";
import test from "node:test";
import { routeLocal } from "../src/lib/terminal/route.ts";
import {
  buildBrief,
  freshWorkspace,
  parseWorkspace,
  transitionTask,
  triageLog,
} from "../src/lib/workbench.ts";

const task = {
  id: "t1",
  projectId: "pinai",
  title: "Restore clean build",
  acceptance: "Both typechecks pass",
  stage: "planned",
  evidence: "",
  updatedAt: new Date().toISOString(),
};
test("validation and blocked stages require evidence, implementation does not imply validation", () => {
  assert.throws(() => transitionTask(task, "validated", "  "), /Record/);
  assert.throws(() => transitionTask(task, "blocked", ""), /Record/);
  assert.equal(transitionTask(task, "implemented", "").stage, "implemented");
  assert.equal(
    transitionTask(task, "validated", "SHA abc: npm run typecheck exited 0").stage,
    "validated",
  );
});
test("backups reject dangling tasks, duplicate IDs, unsupported versions and false validation records", () => {
  const workspace = freshWorkspace();
  workspace.tasks = [task];
  assert.deepEqual(parseWorkspace(JSON.stringify(workspace)), workspace);
  for (const invalid of [
    { ...workspace, version: 2 },
    { ...workspace, projects: [] },
    { ...workspace, tasks: [{ ...task, projectId: "unknown" }] },
    { ...workspace, tasks: [task, task] },
    { ...workspace, tasks: [{ ...task, stage: "validated", evidence: "" }] },
    { ...workspace, tasks: [{ ...task, updatedAt: "not-a-date" }] },
    { ...workspace, projects: [workspace.projects[0], workspace.projects[0]] },
  ])
    assert.throws(() => parseWorkspace(JSON.stringify(invalid)));
  assert.throws(() => parseWorkspace("x".repeat(1_000_001)), /large/);
});
test("briefs include project boundaries and distinguish supplied evidence from verified results", () => {
  const brief = buildBrief(freshWorkspace().projects[0], task);
  assert.match(brief, /omarreact\/PinAI/);
  assert.match(brief, /Do not merge, deploy/);
  assert.match(brief, /untrusted input/);
  assert.match(brief, /Never claim a test passed unless it ran/);
});
test("triage does not turn a runner symptom into an invented billing cause", () => {
  const result = triageLog('{"runner_id":0,"steps":[]}');
  assert.equal(result.category, "Before runner execution");
  assert.match(result.finding, /does not identify billing/);
  assert.equal(
    triageLog("npm ci requires an existing package-lock.json").category,
    "Dependency setup",
  );
  assert.equal(
    triageLog("TS2307 cannot find module ./missing").category,
    "Missing source or dependency",
  );
  assert.equal(triageLog("sys.boot_completed=0 emulator timeout").category, "Device environment");
  assert.equal(triageLog("Some unrelated output").category, "Needs inspection");
});

test("development briefs with repository links are planned, never automatically scanned", () => {
  const result = routeLocal(
    "/plan Inspect https://github.com/omarreact/PinAI/pull/2 and fix the build",
    "grok",
    null,
  );
  assert.equal(result.type, "plan");
  assert.equal(routeLocal("/scan https://example.com", "grok", null).type, "run");
});
