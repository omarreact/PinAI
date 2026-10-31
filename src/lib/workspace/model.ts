export type Priority = "critical" | "high" | "normal";
export type TaskStatus = "backlog" | "in-progress" | "blocked" | "ready-for-review" | "verified";
export type WorkspaceProject = {
  id: string;
  name: string;
  repository: string;
  production: string;
  goal: string;
  guardrails: string;
};
export type WorkspaceTask = {
  id: string;
  projectId: string;
  title: string;
  details: string;
  acceptance: string;
  priority: Priority;
  status: TaskStatus;
  blocker: string;
  evidence: string[];
  updatedAt: string;
};
export type WorkspaceData = {
  version: 1;
  projects: WorkspaceProject[];
  tasks: WorkspaceTask[];
};
export type Diagnosis = {
  category: string;
  confidence: "pattern match" | "unclassified";
  meaning: string;
  nextSteps: string[];
};

export const WORKSPACE_KEY = "pinai.ai-development-workspace.v1";
const MAX_PROJECTS = 100;
const MAX_TASKS = 1000;

export const starterWorkspace: WorkspaceData = {
  version: 1,
  projects: [
    { id: "pinai", name: "PinAI", repository: "omarreact/PinAI", production: "Existing Vercel deployment — do not alter", goal: "AI-assisted development workspace plus safe Android APK", guardrails: "Preserve the original web app. Do not merge PR #2 before restoring unexpected deletions and passing validation." },
    { id: "landbd", name: "LandBD", repository: "omarreact/shohoz-jomir-hishab", production: "Vercel / Firebase", goal: "Land services and Android experience", guardrails: "Keep production on Vercel. Preserve Firebase access controls and existing document layouts; stage migrations separately." },
    { id: "pincode", name: "PINCODE IT", repository: "omarreact/pincode", production: "Vercel", goal: "Unified fast Next.js company website", guardrails: "Preserve approved design, original homepage navigation, domains and production availability." },
    { id: "pinflix", name: "PinFlix", repository: "omarreact/PinFlix_Development", production: "Vercel", goal: "Fast, responsive web and Android streaming experience", guardrails: "Separate APK builds from production web deployments. Do not change media providers without approval." },
    { id: "pincms", name: "PinCMS", repository: "omarreact/PinCMS", production: "Vercel", goal: "Visual Next.js CMS and page editor", guardrails: "Keep existing editor content and authentication working; verify changes in a test environment." },
    { id: "forex", name: "Forex Trade Technology", repository: "omarreact/Forex-Trade-Technology-Omar", production: "Vercel + independent WordPress theme", goal: "Six site designs and fully editable FSE theme", guardrails: "Preserve approved design, content, colors, typography and site functionality during FSE changes." },
    { id: "pinstore", name: "PinStore", repository: "omarreact/Store_Management_System", production: "Existing Vercel / offline-first PWA", goal: "Offline retail management with Android and desktop packaging", guardrails: "Protect local user data and backups; do not treat unsigned APK/EXE as production release." },
  ],
  tasks: [
    {
      id: "pinai-runner",
      projectId: "pinai",
      title: "Identify GitHub Actions pre-run blocker in PR #2",
      details: "The 2026-10-30 hosted APK job finished in seconds with zero steps and no assigned runner. Check both job annotations, Actions billing/minutes/budgets, repo/org Actions permissions, and runner access.",
      acceptance: "Capture exact GitHub annotation text or support/account diagnosis. Rerun the same SHA only after addressing the identified cause; record job and run links.",
      priority: "critical",
      status: "blocked",
      blocker: "Job annotations and account-level Actions settings require inspection.",
      evidence: ["https://github.com/omarreact/PinAI/actions/runs/41076761441"],
      updatedAt: "2026-10-31",
    },
    {
      id: "pinai-pr2-files",
      projectId: "pinai",
      title: "Restore unintended source deletions before PR #2 merge",
      details: "PR #2 is stacked on the inspection branch and shows approximately 74,571 removed lines, including original web app files. Review each removal against base 75b8768.",
      acceptance: "Diff confirms no unintentional removal of web routes, package lock, scripts, configs, components or platform assets. Web production build, shared tests and Android build pass from a clean checkout.",
      priority: "critical",
      status: "blocked",
      blocker: "Large destructive diff needs review and repair before merge.",
      evidence: ["https://github.com/omarreact/PinAI/pull/2"],
      updatedAt: "2026-10-31",
    },
    {
      id: "pinai-apk-qa",
      projectId: "pinai",
      title: "Run Android instrumentation and physical-device QA",
      details: "APK build, static checks and unit tests are reported locally. Emulator API 35 timed out. Verify UI, back, Keystore, URL blocking, export and network behavior on a device.",
      acceptance: "Attach successful Android instrumentation results, physical-device checklist, release-signing decision, and APK digest tied to tested commit.",
      priority: "high",
      status: "backlog",
      blocker: "",
      evidence: [],
      updatedAt: "2026-10-31",
    },
  ],
};

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected a JSON object.");
  return value as Record<string, unknown>;
}
function string(value: unknown, max = 240): string {
  if (typeof value !== "string") throw new Error("Expected text field.");
  if (value.length > max) throw new Error("Text field exceeds import size limit.");
  return value.trim();
}
function enumValue<T extends string>(value: unknown, allowed: readonly T[]): T {
  if (!allowed.includes(value as T)) throw new Error("Unknown task status or priority.");
  return value as T;
}
function id(value: unknown): string {
  const result = string(value, 80);
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(result)) throw new Error("Invalid project/task identifier.");
  return result;
}

/** Validate and copy only known fields. Never execute or blindly spread imported JSON. */
export function parseWorkspace(value: unknown): WorkspaceData {
  const root = object(value);
  if (root.version !== 1) throw new Error("Unsupported workspace backup version.");
  if (!Array.isArray(root.projects) || root.projects.length > MAX_PROJECTS) throw new Error("Invalid project collection.");
  if (!Array.isArray(root.tasks) || root.tasks.length > MAX_TASKS) throw new Error("Invalid task collection.");
  const projects = root.projects.map((raw) => {
    const p = object(raw);
    return {
      id: id(p.id),
      name: string(p.name),
      repository: string(p.repository),
      production: string(p.production, 400),
      goal: string(p.goal, 1200),
      guardrails: string(p.guardrails, 3000),
    };
  });
  const known = new Set(projects.map((p) => p.id));
  if (known.size !== projects.length) throw new Error("Duplicate project ID.");
  const tasks = root.tasks.map((raw) => {
    const t = object(raw);
    const projectId = id(t.projectId);
    if (!known.has(projectId)) throw new Error("Task references an unknown project.");
    if (!Array.isArray(t.evidence) || t.evidence.length > 30) throw new Error("Invalid evidence list.");
    return {
      id: id(t.id),
      projectId,
      title: string(t.title, 300),
      details: string(t.details, 6000),
      acceptance: string(t.acceptance, 5000),
      priority: enumValue(t.priority, ["critical", "high", "normal"] as const),
      status: enumValue(t.status, ["backlog", "in-progress", "blocked", "ready-for-review", "verified"] as const),
      blocker: string(t.blocker, 3000),
      evidence: t.evidence.map((x: unknown) => string(x, 1000)).filter(Boolean),
      updatedAt: string(t.updatedAt, 60),
    };
  });
  if (new Set(tasks.map((t) => t.id)).size !== tasks.length) throw new Error("Duplicate task ID.");
  for (const task of tasks) {
    if (task.status === "verified" && !canVerify(task)) throw new Error("Verified tasks must include acceptance criteria and evidence.");
  }
  return { version: 1, projects, tasks };
}

export function canVerify(task: Pick<WorkspaceTask, "acceptance" | "evidence">): boolean {
  return task.acceptance.trim().length > 0 && task.evidence.some((line) => line.trim().length > 0);
}
export function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
export function makeAgentBrief(project: WorkspaceProject, task: WorkspaceTask, agent: string): string {
  return [
    `# ${agent} · PinAI task brief`,
    "",
    `Project: ${project.name}`,
    `Repository: ${project.repository || "(not supplied)"}`,
    `Production environment: ${project.production || "(not supplied)"}`,
    `Goal: ${project.goal}`,
    "",
    "## Task",
    task.title,
    task.details || "(No extra context)",
    "",
    "## Non-negotiable project constraints",
    project.guardrails || "Preserve existing behavior and user data.",
    "",
    "## Delivery process",
    "1. Read the repository and reproduce/verify the current issue before changing anything.",
    "2. Distinguish CI account/runner restrictions from repository source or test failures.",
    "3. Work on an isolated branch and propose the smallest reviewable change; do not merge.",
    "4. Never modify production, DNS, account billing, secrets, authentication, or deployments without explicit approval.",
    "5. Do not invent test passes, screenshots, runner results, security claims, or live URLs.",
    "6. Keep preexisting styling, functionality, routes and dependencies unless explicitly in scope.",
    "7. Run lint, typechecks, tests, builds and the relevant device/browser checks, and link the exact commit SHA.",
    "8. Return a PR, a list of files changed, verified results, remaining gates, and rollback plan.",
    "",
    "## Definition of done",
    task.acceptance || "State measurable acceptance criteria before implementing.",
    "",
    "## Currently known blocker",
    task.blocker || "(None recorded)",
    "",
    "## Existing evidence (not automatically verified)",
    ...(task.evidence.length ? task.evidence.map((x) => `- ${x}`) : ["- No evidence supplied"]),
  ].join("\n");
}

export function diagnoseLog(log: string): Diagnosis {
  const sample = log.slice(0, 40_000);
  if (/runner_id\s*[:=]\s*0|no\s+(?:job\s+)?steps|job (?:was )?not started|minutes? (?:quota|limit)|billing|spending limit|hosted.runner|not been picked up by a runner/i.test(sample)) {
    return {
      category: "Hosted runner / project configuration",
      confidence: "pattern match",
      meaning: "The symptoms point to a job that may not have reached an executable runner. This is not proof of an exact billing, permission, or runner restriction.",
      nextSteps: ["Read check-run annotations in the GitHub Actions job.", "Check repository/organization Actions permissions, usage budgets, payment notices and runner availability.", "After confirming the cause, rerun the exact failed SHA without changing production."],
    };
  }
  if (/module_not_found|module not found|can't resolve|cannot find module|TS2307/i.test(sample)) {
    return { category: "Module resolution / build", confidence: "pattern match", meaning: "An import or dependency is unresolved; inspect the offending path and clean-install environment.", nextSteps: ["Locate the first failing import and check path casing.", "Compare package.json with the lockfile and tracked files.", "Run clean npm ci, typecheck and production build before deploying."] };
  }
  if (/emulator|AVD|VMX|SVM|boot completed|adb.*offline/i.test(sample)) {
    return { category: "Android emulator infrastructure", confidence: "pattern match", meaning: "The Android test environment appears unavailable or slow to boot; this alone does not establish an app failure.", nextSteps: ["Check emulator acceleration and available system image.", "Run instrumentation on a hardware-backed runner or physical device.", "Do not mark instrumentation passed until actual assertions run."] };
  }
  if (/ENOTFOUND|EAI_AGAIN|DNS|name resolution|timed out/i.test(sample)) {
    return { category: "Network / DNS", confidence: "pattern match", meaning: "Network or name resolution interrupted a request; verify origin reachability separately from app logic.", nextSteps: ["Capture hostname, network and exact request.", "Retest from an accessible network.", "Do not disable security checks to bypass failed DNS."] };
  }
  if (/401|403|unauthorized|forbidden|invalid token/i.test(sample)) {
    return { category: "Access / authentication", confidence: "pattern match", meaning: "Access was denied or credentials were rejected.", nextSteps: ["Identify the exact API/resource and permissions required.", "Check token scopes and expiration without logging secrets.", "Test only against a staging or read-only target."] };
  }
  return { category: "Unclassified", confidence: "unclassified", meaning: "No reliable rule matched. A source diagnosis requires the first relevant error and its context.", nextSteps: ["Capture full failing command, commit SHA and first error.", "Reproduce in a clean environment.", "Separate infrastructure, build and runtime evidence before editing code."] };
}
