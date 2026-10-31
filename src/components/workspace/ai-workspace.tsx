import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle, ArrowLeft, ArrowUpRight, CheckCircle2, Clipboard, Code2,
  Download, FileCheck2, FolderKanban, GitPullRequest, Plus, SearchCheck,
  ShieldCheck, Upload, WandSparkles,
} from "lucide-react";
import {
  canVerify, diagnoseLog, makeAgentBrief, makeId, parseWorkspace, starterWorkspace, WORKSPACE_KEY,
  type Priority, type TaskStatus, type WorkspaceData, type WorkspaceProject, type WorkspaceTask,
} from "@/lib/workspace/model";

type Panel = "overview" | "tasks" | "brief" | "diagnose" | "backup";
const panels: { id: Panel; label: string }[] = [
  { id: "overview", label: "Projects" },
  { id: "tasks", label: "Task queue" },
  { id: "brief", label: "Agent brief" },
  { id: "diagnose", label: "Error triage" },
  { id: "backup", label: "Backup" },
];
const statusLabel: Record<TaskStatus, string> = {
  backlog: "Backlog",
  "in-progress": "In progress",
  blocked: "Blocked",
  "ready-for-review": "Review",
  verified: "Verified (manual)",
};
const priorityLabel: Record<Priority, string> = { critical: "Critical", high: "High", normal: "Normal" };
const surface = "rounded-xl border border-border bg-card";
const input = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-faint focus:border-signal";
const button = "press rounded-lg border border-border bg-subtle px-3 py-2 text-sm hover:border-faint";
const label = "mb-1.5 block text-xs font-medium text-muted";

export function AiWorkspace() {
  const [data, setData] = useState<WorkspaceData>(starterWorkspace);
  const [hydrated, setHydrated] = useState(false);
  const [storageRecovery, setStorageRecovery] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState("pinai");
  const [activeTaskId, setActiveTaskId] = useState("pinai-runner");
  const [panel, setPanel] = useState<Panel>("overview");
  const [newProjectName, setNewProjectName] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [agent, setAgent] = useState("GitHub Copilot / Codex");
  const [log, setLog] = useState("");
  const [message, setMessage] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(WORKSPACE_KEY);
      if (saved) {
        const parsed = parseWorkspace(JSON.parse(saved) as unknown);
        setData(parsed);
        if (parsed.projects.length) setActiveProjectId(parsed.projects[0].id);
        if (parsed.tasks.length) setActiveTaskId(parsed.tasks[0].id);
      }
    } catch {
      setStorageRecovery(true);
      setMessage("Local workspace data is invalid. Its original bytes are preserved; changes will not be saved until you explicitly reset it.");
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || storageRecovery) return;
    try {
      window.localStorage.setItem(WORKSPACE_KEY, JSON.stringify(data));
    } catch {
      setMessage("This browser could not save workspace data. Export a backup to avoid losing changes.");
    }
  }, [data, hydrated, storageRecovery]);

  const activeProject = data.projects.find((p) => p.id === activeProjectId) ?? data.projects[0];
  const tasksForProject = useMemo(
    () => data.tasks.filter((t) => t.projectId === activeProject?.id).sort((a, b) => a.priority === b.priority ? 0 : ["critical", "high", "normal"].indexOf(a.priority) - ["critical", "high", "normal"].indexOf(b.priority)),
    [data.tasks, activeProject?.id],
  );
  const activeTask = data.tasks.find((t) => t.id === activeTaskId && t.projectId === activeProject?.id) ?? tasksForProject[0];
  const brief = activeProject && activeTask ? makeAgentBrief(activeProject, activeTask, agent) : "";
  const diagnosis = useMemo(() => diagnoseLog(log), [log]);
  const blocked = data.tasks.filter((t) => t.status === "blocked").length;
  const review = data.tasks.filter((t) => t.status === "ready-for-review").length;
  const verified = data.tasks.filter((t) => t.status === "verified").length;

  function changeProject(id: string) {
    setActiveProjectId(id);
    setActiveTaskId(data.tasks.find((t) => t.projectId === id)?.id ?? "");
  }

  function updateProject(patch: Partial<WorkspaceProject>) {
    if (!activeProject) return;
    setData((state) => ({ ...state, projects: state.projects.map((p) => p.id === activeProject.id ? { ...p, ...patch } : p) }));
  }

  function updateTask(patch: Partial<WorkspaceTask>) {
    if (!activeTask) return;
    const updated = { ...activeTask, ...patch };
    if (updated.status === "verified" && !canVerify(updated)) {
      setMessage("Add acceptance criteria and at least one evidence reference before marking a task verified.");
      return;
    }
    setMessage("");
    setData((state) => ({
      ...state,
      tasks: state.tasks.map((t) => t.id === activeTask.id ? { ...t, ...patch, updatedAt: new Date().toISOString().slice(0, 10) } : t),
    }));
  }

  function addProject() {
    const name = newProjectName.trim();
    if (!name) return;
    const project: WorkspaceProject = { id: makeId("project"), name: name.slice(0, 240), repository: "", production: "", goal: "", guardrails: "Do not change production, credentials or DNS without approval." };
    setData((state) => ({ ...state, projects: [...state.projects, project] }));
    setNewProjectName("");
    changeProjectAfterAdd(project.id);
  }
  function changeProjectAfterAdd(id: string) { setActiveProjectId(id); setActiveTaskId(""); setMessage(""); }

  function removeProject() {
    if (!activeProject || !window.confirm(`Remove "${activeProject.name}" and its local tasks? Export a backup first if you need them.`)) return;
    const remaining = data.projects.filter((p) => p.id !== activeProject.id);
    const tasks = data.tasks.filter((t) => t.projectId !== activeProject.id);
    setData((state) => ({ ...state, projects: remaining, tasks }));
    setActiveProjectId(remaining[0]?.id ?? "");
    setActiveTaskId(tasks.find((t) => t.projectId === remaining[0]?.id)?.id ?? "");
    setMessage("Project and its local tasks removed. Production repositories were not changed.");
  }
  function removeTask() {
    if (!activeTask || !window.confirm("Remove this local task? Export a backup first if you need it.")) return;
    const tasks = data.tasks.filter((t) => t.id !== activeTask.id);
    setData((state) => ({ ...state, tasks }));
    setActiveTaskId(tasks.find((t) => t.projectId === activeProject?.id)?.id ?? "");
    setMessage("Local task removed. No GitHub issue or repository was changed.");
  }

  function addTask() {
    const title = newTaskTitle.trim();
    if (!title || !activeProject) return;
    const task: WorkspaceTask = {
      id: makeId("task"), projectId: activeProject.id, title: title.slice(0, 300),
      details: "", acceptance: "", priority: "normal", status: "backlog", blocker: "",
      evidence: [], updatedAt: new Date().toISOString().slice(0, 10),
    };
    setData((state) => ({ ...state, tasks: [...state.tasks, task] }));
    setActiveTaskId(task.id);
    setNewTaskTitle("");
    setPanel("tasks");
  }

  function downloadRecovery() {
    const source = window.localStorage.getItem(WORKSPACE_KEY);
    if (!source) return;
    const objectUrl = URL.createObjectURL(new Blob([source], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = "pinai-unreadable-recovery.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  function resetRecovery() {
    if (!window.confirm("You are about to replace the invalid local data with the starter workspace. Have you downloaded the raw recovery backup?")) return;
    window.localStorage.removeItem(WORKSPACE_KEY);
    setStorageRecovery(false);
    setData(structuredClone(starterWorkspace));
    setMessage("Local storage reset. Starter projects and tasks are now editable.");
  }

  function taskFromDiagnosis() {
    if (!activeProject || !log.trim()) return;
    const task: WorkspaceTask = {
      id: makeId("task"),
      projectId: activeProject.id,
      title: `Investigate: ${diagnosis.category}`,
      details: [diagnosis.meaning, ...diagnosis.nextSteps].join("\n"),
      acceptance: "Capture the actual error, exact commit and a successful repeatable validation result.",
      priority: "high",
      status: "backlog",
      blocker: "Diagnosis is unconfirmed; investigate before changing source.",
      evidence: [],
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    setData((state) => ({ ...state, tasks: [...state.tasks, task] }));
    setActiveTaskId(task.id);
    setPanel("tasks");
    setMessage("Diagnostic checklist added as a local task; the raw log was not saved.");
  }

  async function copyBrief() {
    try {
      await navigator.clipboard.writeText(brief);
      setMessage("Agent brief copied. Review it before pasting into a coding agent.");
    } catch {
      setMessage("Clipboard access unavailable. Select the brief text and copy it manually.");
    }
  }

  function exportWorkspace() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `pinai-workspace-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    setMessage("Workspace backup generated. Keep the file private if it contains project details.");
  }

  async function importWorkspace(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw new Error("Backup exceeds the 1 MB limit.");
      const parsed = parseWorkspace(JSON.parse(await file.text()) as unknown);
      if (!window.confirm("Replace the workspace stored on this device with this backup? Export your current workspace first.")) return;
      setData(parsed);
      setActiveProjectId(parsed.projects[0]?.id ?? "");
      setActiveTaskId(parsed.tasks[0]?.id ?? "");
      setMessage("Validated backup imported on this device.");
    } catch (error) {
      setMessage(error instanceof Error ? `Import rejected: ${error.message}` : "Invalid workspace backup.");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-5 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
          <div className="flex items-center gap-3">
            <a href="/" aria-label="Back to PinAI terminal" className="press rounded-lg border border-border bg-card p-2.5 hover:border-faint"><ArrowLeft className="size-4" /></a>
            <div className="flex size-10 items-center justify-center rounded-xl bg-subtle"><Code2 className="size-5 text-signal" /></div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">PinAI <span className="font-normal text-muted">/ Development</span></h1>
              <p className="text-xs text-muted">Local-first AI workflow control center</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a href="/browser-studio/index.html" className={button}>Open Browser Studio ↗</a>
            <span className="rounded-full border border-border px-3 py-1.5 text-xs text-muted"><ShieldCheck className="mr-1 inline size-3.5 text-signal" /> No production writes</span>
            <button onClick={exportWorkspace} className={button} type="button"><Download className="mr-1 inline size-4" /> Export</button>
          </div>
        </header>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric icon={<FolderKanban className="size-4" />} name="Projects" value={data.projects.length} />
          <Metric icon={<AlertTriangle className="size-4" />} name="Blocked tasks" value={blocked} />
          <Metric icon={<GitPullRequest className="size-4" />} name="Awaiting review" value={review} />
          <Metric icon={<FileCheck2 className="size-4" />} name="Manually verified" value={verified} />
        </div>

        {message && <div role="status" className="mt-4 flex flex-wrap items-start gap-2 rounded-lg border border-border bg-subtle px-4 py-3 text-sm text-muted"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><span className="min-w-0 flex-1">{message}</span>{storageRecovery && <><button type="button" onClick={downloadRecovery} className={button}>Download raw backup</button><button type="button" onClick={resetRecovery} className={button}>Reset local storage</button></>}<button className="text-faint hover:text-foreground" type="button" onClick={() => setMessage("")} aria-label="Dismiss message">×</button></div>}

        <div className="mt-6 grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className={`${surface} h-fit p-3`}>
            <div className="mb-3 flex items-center justify-between px-2"><h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Your projects</h2><span className="font-mono text-xs text-faint">{data.projects.length}</span></div>
            <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
              {data.projects.map((p) => {
                const selected = p.id === activeProject?.id;
                return <button type="button" key={p.id} onClick={() => changeProject(p.id)} aria-pressed={selected} className={`press min-w-36 rounded-lg border px-3 py-3 text-left lg:min-w-0 ${selected ? "border-signal bg-subtle" : "border-transparent hover:bg-subtle"}`}>
                  <div className="truncate text-sm font-medium">{p.name}</div>
                  <div className="mt-1 truncate font-mono text-[11px] text-faint">{p.repository || "No repository yet"}</div>
                </button>;
              })}
            </div>
            <form className="mt-4 flex gap-2 border-t border-border pt-4" onSubmit={(e) => { e.preventDefault(); addProject(); }}>
              <label className="sr-only" htmlFor="new-project">New project name</label>
              <input id="new-project" className={input} value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} maxLength={240} placeholder="New project" />
              <button type="submit" className={button} disabled={!newProjectName.trim()} aria-label="Add project"><Plus className="size-4" /></button>
            </form>
          </aside>

          <main className="min-w-0">
            <nav aria-label="Workspace sections" className="scroll-x flex gap-2 overflow-x-auto border-b border-border pb-3">
              {panels.map((item) => <button type="button" key={item.id} onClick={() => setPanel(item.id)} aria-current={panel === item.id ? "page" : undefined} className={`press shrink-0 rounded-lg px-3 py-2.5 text-sm ${panel === item.id ? "bg-foreground font-medium text-background" : "text-muted hover:bg-subtle hover:text-foreground"}`}>{item.label}</button>)}
            </nav>

            {panel === "overview" && (
              <section className="mt-5 space-y-5">
                {activeProject ? (
                  <div className={`${surface} p-4 sm:p-5`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div><p className="text-xs uppercase tracking-wider text-faint">Project profile</p><h2 className="mt-1 text-xl font-medium">{activeProject.name}</h2></div>
                      {/^([\w.-]+)\/([\w.-]+)$/.test(activeProject.repository) && <a href={`https://github.com/${activeProject.repository}`} target="_blank" rel="noopener noreferrer" className="text-sm text-signal hover:underline">Open repository <ArrowUpRight className="inline size-4" /></a>}
                    </div>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <Field title="Repository (owner/name)"><input className={input} value={activeProject.repository} onChange={(e) => updateProject({ repository: e.target.value })} maxLength={240} /></Field>
                      <Field title="Production / hosting"><input className={input} value={activeProject.production} onChange={(e) => updateProject({ production: e.target.value })} maxLength={400} /></Field>
                      <div className="sm:col-span-2"><Field title="Project objective"><textarea rows={2} className={input} value={activeProject.goal} onChange={(e) => updateProject({ goal: e.target.value })} maxLength={1200} /></Field></div>
                      <div className="sm:col-span-2"><Field title="Non-negotiable instructions"><textarea rows={4} className={input} value={activeProject.guardrails} onChange={(e) => updateProject({ guardrails: e.target.value })} maxLength={3000} /></Field></div>
                    </div>
                    <div className="mt-4 flex justify-end"><button type="button" onClick={removeProject} className="rounded-lg px-3 py-2 text-xs text-danger hover:bg-subtle">Delete local project…</button></div>
                  </div>
                ) : <p className="py-8 text-muted">Add a project to begin.</p>}
                <div className={`${surface} p-4 sm:p-5`}>
                  <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-medium">Priority work</h2><button type="button" className="text-sm text-signal hover:underline" onClick={() => setPanel("tasks")}>Manage queue</button></div>
                  <div className="mt-3 divide-y divide-border">
                    {tasksForProject.slice(0, 5).map((t) => <button key={t.id} type="button" onClick={() => { setActiveTaskId(t.id); setPanel("tasks"); }} className="flex w-full items-center justify-between gap-3 py-3 text-left hover:text-signal"><span className="min-w-0 truncate text-sm">{t.title}</span><span className="shrink-0 text-xs text-faint">{statusLabel[t.status]}</span></button>)}
                    {!tasksForProject.length && <p className="py-5 text-sm text-muted">No tasks for this project yet.</p>}
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-faint">Profiles, notes and task evidence are stored in this browser only. They are not live GitHub statuses. No AI provider is called automatically.</p>
              </section>
            )}

            {panel === "tasks" && (
              <section className="mt-5 space-y-5">
                <form className={`${surface} flex flex-wrap gap-2 p-4`} onSubmit={(e) => { e.preventDefault(); addTask(); }}>
                  <label className="sr-only" htmlFor="new-task">Task title</label>
                  <input id="new-task" className={`${input} min-w-52 flex-1`} maxLength={300} value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Add a development task…" />
                  <button className={button} type="submit" disabled={!newTaskTitle.trim() || !activeProject}><Plus className="mr-1 inline size-4" /> New task</button>
                </form>
                <div className="grid gap-4 xl:grid-cols-[minmax(200px,0.7fr)_minmax(0,1.3fr)]">
                  <div className={`${surface} h-fit p-2`}>
                    {tasksForProject.map((t) => <button key={t.id} type="button" onClick={() => setActiveTaskId(t.id)} className={`w-full rounded-lg p-3 text-left ${activeTask?.id === t.id ? "bg-subtle" : "hover:bg-subtle/70"}`}>
                      <div className="text-sm font-medium">{t.title}</div><div className="mt-2 flex items-center gap-2 text-xs text-faint"><span>{priorityLabel[t.priority]}</span><span>·</span><span>{statusLabel[t.status]}</span></div>
                    </button>)}
                    {!tasksForProject.length && <p className="p-4 text-sm text-muted">Create the first task above.</p>}
                  </div>
                  {activeTask ? <div className={`${surface} min-w-0 space-y-4 p-4 sm:p-5`}>
                    <div className="flex items-center justify-between gap-3"><h2 className="font-medium">Task details</h2><button type="button" onClick={removeTask} className="text-xs text-danger hover:underline">Delete local task…</button></div>
                    <Field title="Title"><input className={input} value={activeTask.title} onChange={(e) => updateTask({ title: e.target.value })} maxLength={300} /></Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field title="Priority"><select className={input} value={activeTask.priority} onChange={(e) => updateTask({ priority: e.target.value as Priority })}><option value="critical">Critical</option><option value="high">High</option><option value="normal">Normal</option></select></Field>
                      <Field title="Status"><select className={input} value={activeTask.status} onChange={(e) => updateTask({ status: e.target.value as TaskStatus })}>{(Object.keys(statusLabel) as TaskStatus[]).map((key) => <option value={key} key={key}>{statusLabel[key]}</option>)}</select></Field>
                    </div>
                    <Field title="Context / steps"><textarea className={input} rows={5} maxLength={6000} value={activeTask.details} onChange={(e) => updateTask({ details: e.target.value })} /></Field>
                    <Field title="Definition of done"><textarea className={input} rows={4} maxLength={5000} value={activeTask.acceptance} onChange={(e) => updateTask({ acceptance: e.target.value })} placeholder="What must be demonstrated before this task is complete?" /></Field>
                    <Field title="Current blocker"><textarea className={input} rows={2} maxLength={3000} value={activeTask.blocker} onChange={(e) => updateTask({ blocker: e.target.value })} /></Field>
                    <Field title="Evidence (one URL, commit SHA, log or QA note per line)"><textarea className={input} rows={4} maxLength={16000} value={activeTask.evidence.join("\n")} onChange={(e) => updateTask({ evidence: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 30) })} /></Field>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><p className="text-xs text-faint">Verification is manually recorded, not automatically proven.</p><button type="button" className={button} onClick={() => setPanel("brief")}><WandSparkles className="mr-1 inline size-4" /> Prepare agent brief</button></div>
                  </div> : null}
                </div>
              </section>
            )}

            {panel === "brief" && <section className="mt-5 space-y-4">
              <div className={`${surface} p-4 sm:p-5`}>
                <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-medium">Coding-agent handoff</h2><p className="mt-1 text-xs text-muted">Prompt synthesized from the selected project, task and guardrails.</p></div><button type="button" onClick={() => void copyBrief()} disabled={!brief} className={button}><Clipboard className="mr-1 inline size-4" /> Copy brief</button></div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Field title="Target coding agent"><select className={input} value={agent} onChange={(e) => setAgent(e.target.value)}><option>GitHub Copilot / Codex</option><option>ChatGPT coding agent</option><option>Generic coding agent</option></select></Field>
                  <Field title="Task"><select className={input} value={activeTask?.id ?? ""} onChange={(e) => setActiveTaskId(e.target.value)}>{tasksForProject.length ? tasksForProject.map((t) => <option key={t.id} value={t.id}>{t.title}</option>) : <option value="">Create a task first</option>}</select></Field>
                </div>
                <textarea aria-label="Generated agent brief" value={brief || "Create and select a task first."} readOnly rows={21} spellCheck={false} className={`${input} mt-4 font-mono text-xs leading-relaxed`} />
              </div>
              <p className="text-xs text-faint">This generates a reviewable instruction, not an autonomous tool execution. Pasting it into your selected agent is an explicit separate action.</p>
            </section>}

            {panel === "diagnose" && <section className="mt-5 space-y-4">
              <div className={`${surface} space-y-4 p-4 sm:p-5`}>
                <div><h2 className="font-medium">CI / build / device error triage</h2><p className="mt-1 text-sm text-muted">Paste a sanitized failure excerpt. Classification is deterministic and may be incomplete.</p></div>
                <Field title="Log excerpt (remove tokens, passwords, headers and private data)"><textarea className={`${input} font-mono text-xs`} rows={10} maxLength={40000} value={log} onChange={(e) => setLog(e.target.value)} placeholder="Example: runner_id: 0; steps: []" /></Field>
                {log.trim() && <div className="rounded-xl border border-border bg-subtle p-4"><div className="flex items-center gap-2"><SearchCheck className="size-4 text-signal" /><h3 className="font-medium">{diagnosis.category}</h3></div><p className="mt-2 text-sm text-muted">{diagnosis.meaning}</p><ol className="mt-3 list-inside list-decimal space-y-2 text-sm text-muted">{diagnosis.nextSteps.map((step) => <li key={step}>{step}</li>)}</ol><p className="mt-3 text-xs text-faint">Classification: {diagnosis.confidence}. No external AI or GitHub requests were made.</p><button type="button" className={`${button} mt-3`} onClick={taskFromDiagnosis}><Plus className="mr-1 inline size-4" /> Add to task queue</button></div>}
              </div>
            </section>}

            {panel === "backup" && <section className={`${surface} mt-5 space-y-5 p-4 sm:p-5`}>
              <div><h2 className="font-medium">Backup and restore</h2><p className="mt-1 text-sm text-muted">All project profiles, tasks and evidence are stored locally in your browser. There is no account sync or backend storage.</p></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={exportWorkspace} className={`${button} flex items-center justify-center gap-2 py-4`}><Download className="size-4" /> Download JSON backup</button>
                <button type="button" onClick={() => importRef.current?.click()} className={`${button} flex items-center justify-center gap-2 py-4`}><Upload className="size-4" /> Import validated JSON backup</button>
              </div>
              <input ref={importRef} type="file" accept=".json,application/json" className="hidden" aria-label="Import workspace backup" onChange={(e) => void importWorkspace(e.target.files?.[0])} />
              <div className="rounded-lg border border-border bg-subtle p-4 text-sm text-muted"><CheckCircle2 className="mr-2 inline size-4 text-signal" /> Import checks schema, task/project references, duplicate IDs and verified-task evidence. Import replaces local data only after confirmation.</div>
              <p className="text-xs leading-relaxed text-faint">Do not save access tokens or API keys in project notes, tasks or exported backups. A backup file may reveal repository names and internal plans; store it securely.</p>
            </section>}
          </main>
        </div>
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 text-xs text-faint"><span>PinAI · Development workspace · Local draft</span><span>GitHub changes and CI statuses require separate authenticated verification.</span></footer>
      </div>
    </div>
  );
}

function Metric({ name, value, icon }: { name: string; value: number; icon: ReactNode }) {
  return <div className={`${surface} p-3 sm:p-4`}><div className="flex items-center gap-2 text-xs text-muted">{icon}{name}</div><div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div></div>;
}
function Field({ title, children }: { title: string; children: ReactNode }) {
  return <label className="block"><span className={label}>{title}</span>{children}</label>;
}
