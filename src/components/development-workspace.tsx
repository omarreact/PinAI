import { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCheck, FolderGit2, Plus, TerminalSquare } from "lucide-react";
import { TerminalApp } from "./terminal/terminal-app";
import { downloadText } from "@/lib/terminal/download";
import {
  buildBrief,
  freshWorkspace,
  parseWorkspace,
  stages,
  transitionTask,
  triageLog,
} from "@/lib/workbench";
import type { Project, Stage, Workspace, WorkTask } from "@/lib/workbench";

const STORAGE = "pinai-development-workspace-v1";
const field =
  "min-h-11 w-full rounded-md border border-border bg-subtle px-3 py-2 text-base text-foreground";
const button =
  "press min-h-11 rounded-md border border-border px-4 py-2 text-sm disabled:opacity-40";

export function DevelopmentWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace>(freshWorkspace);
  const [ready, setReady] = useState(false);
  const [projectId, setProjectId] = useState("pinai");
  const [view, setView] = useState<"work" | "assistant">("work");
  const [assistantDraft, setAssistantDraft] = useState("");
  const [notice, setNotice] = useState("");
  const [brief, setBrief] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [pendingImport, setPendingImport] = useState<Workspace | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const project = workspace.projects.find((item) => item.id === projectId) ?? workspace.projects[0];

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) setWorkspace(parseWorkspace(raw));
    } catch {
      setNotice(
        "Saved workspace could not be read. It has not been overwritten. Export or reload before saving a new workspace.",
      );
    }
    setReady(true);
  }, []);

  function save(next: Workspace) {
    try {
      parseWorkspace(JSON.stringify(next));
      localStorage.setItem(STORAGE, JSON.stringify(next));
      setWorkspace(next);
      setNotice("Saved on this device.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not save. Export a backup and try again.",
      );
    }
  }

  async function exportBackup() {
    try {
      await downloadText(
        "PinAI-workspace.json",
        JSON.stringify(workspace, null, 2),
        "application/json",
      );
      setNotice("Backup sent to your download or save dialog.");
    } catch {
      setNotice("Export failed. Please try again.");
    }
  }

  return (
    <div className="flex h-dvh min-w-0 flex-col bg-background text-foreground">
      <header className="safe-top flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <FolderGit2 className="size-5" />
          <span className="font-medium">PinAI</span>
          <span className="text-sm text-muted">Development workspace</span>
        </div>
        <nav className="flex gap-2" aria-label="Workspace views">
          <button
            className={button}
            aria-current={view === "work" ? "page" : undefined}
            onClick={() => setView("work")}
          >
            Projects
          </button>
          <button
            className={button}
            aria-current={view === "assistant" ? "page" : undefined}
            onClick={() => setView("assistant")}
          >
            <span className="flex items-center gap-2">
              <TerminalSquare className="size-4" />
              Assistant & page tools
            </span>
          </button>
        </nav>
      </header>
      {view === "assistant" ? (
        <div className="min-h-0 flex-1">
          <TerminalApp initialDraft={assistantDraft} embedded />
        </div>
      ) : (
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted">
                  Context → task → evidence
                </p>
                <h1 className="mt-2 text-2xl font-medium">What are we shipping next?</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted">
                  Keep each project’s decisions together. Prepare a precise brief, track the work,
                  and record what was actually tested.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className={button} disabled={!ready} onClick={() => void exportBackup()}>
                  Export backup
                </button>
                <button
                  className={button}
                  disabled={!ready}
                  onClick={() => setImportOpen((open) => !open)}
                >
                  Import backup
                </button>
              </div>
            </div>
            <input
              ref={importRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-label="Import workspace backup"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                try {
                  if (file.size > 1_000_000) throw new Error("Backup exceeds 1 MB.");
                  const imported = parseWorkspace(await file.text());
                  setPendingImport(imported);
                } catch (error) {
                  setNotice(error instanceof Error ? error.message : "Invalid backup.");
                }
              }}
            />
            {importOpen ? (
              <section
                className="space-y-3 rounded-lg border border-border p-4"
                aria-label="Import backup"
              >
                <h2 className="font-medium">Restore a workspace backup</h2>
                <p className="text-sm text-muted">
                  Paste backup JSON on Android, or choose a file in your browser. Review before
                  replacing this device’s workspace.
                </p>
                <textarea
                  aria-label="Backup JSON"
                  className={`${field} min-h-24 font-mono text-sm`}
                  maxLength={1_000_000}
                  value={importText}
                  onChange={(event) => {
                    setImportText(event.target.value);
                    setPendingImport(null);
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    className={button}
                    onClick={() => {
                      try {
                        setPendingImport(parseWorkspace(importText));
                      } catch (error) {
                        setNotice(error instanceof Error ? error.message : "Invalid backup.");
                      }
                    }}
                  >
                    Review pasted backup
                  </button>
                  <button className={button} onClick={() => importRef.current?.click()}>
                    Choose file (browser)
                  </button>
                </div>
                {pendingImport ? (
                  <div className="space-y-2">
                    <p className="text-sm">
                      Replace current data with {pendingImport.projects.length} projects and{" "}
                      {pendingImport.tasks.length} tasks? Export first to preserve your current
                      work.
                    </p>
                    <button
                      className={button}
                      onClick={() => {
                        save(pendingImport);
                        setProjectId(pendingImport.projects[0].id);
                        setBrief("");
                        setPendingImport(null);
                        setImportOpen(false);
                      }}
                    >
                      Replace workspace with reviewed backup
                    </button>
                  </div>
                ) : null}
              </section>
            ) : null}
            <p role="status" className="text-sm text-muted">
              {notice ||
                "Project profiles are editable starting context, not live status. No GitHub or deployment account is connected here."}
            </p>
            <div className="grid gap-6 md:grid-cols-3">
              <aside className="space-y-4">
                <label className="block text-sm">
                  Project
                  <select
                    className={`${field} mt-2`}
                    value={project.id}
                    onChange={(event) => {
                      setProjectId(event.target.value);
                      setBrief("");
                    }}
                  >
                    {workspace.projects.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className={`${button} w-full`}
                  disabled={!ready || workspace.projects.length >= 100}
                  onClick={() => {
                    const next = {
                      id: crypto.randomUUID(),
                      name: "New project",
                      repository: "",
                      context: "",
                      constraints: "Keep production unchanged until explicitly authorized.",
                    };
                    save({ ...workspace, projects: [...workspace.projects, next] });
                    setProjectId(next.id);
                  }}
                >
                  <span className="flex items-center justify-center gap-2">
                    <Plus className="size-4" />
                    Add project
                  </span>
                </button>
                <ProjectEditor
                  key={project.id + project.context + project.name}
                  project={project}
                  disabled={!ready}
                  onSave={(updated) =>
                    save({
                      ...workspace,
                      projects: workspace.projects.map((item) =>
                        item.id === updated.id ? updated : item,
                      ),
                    })
                  }
                />
                <div className="rounded-lg border border-border p-4 text-sm text-muted">
                  <p className="font-medium text-foreground">Your working agreement</p>
                  <p className="mt-2">
                    Preserve approved design. Use isolated branches. Keep production stable.
                    Separate implemented, validated and deployed. Bring evidence to every handoff.
                  </p>
                  <p className="mt-2">
                    Stored on this device. Export backups for transfer. Do not paste credentials or
                    private keys.
                  </p>
                </div>
              </aside>
              <section className="space-y-5 md:col-span-2" aria-label="Project tasks">
                <TaskComposer
                  key={project.id}
                  disabled={!ready || workspace.tasks.length >= 500}
                  onAdd={(title, acceptance) => {
                    const task: WorkTask = {
                      id: crypto.randomUUID(),
                      projectId: project.id,
                      title,
                      acceptance,
                      stage: "planned",
                      evidence: "",
                      updatedAt: new Date().toISOString(),
                    };
                    save({ ...workspace, tasks: [task, ...workspace.tasks] });
                    setBrief(buildBrief(project, task));
                  }}
                />
                <div className="flex items-center justify-between">
                  <h2 className="font-medium">Work queue</h2>
                  <span className="text-sm text-muted">
                    {
                      workspace.tasks.filter(
                        (task) => task.projectId === project.id && task.stage === "validated",
                      ).length
                    }{" "}
                    validated · manually recorded
                  </span>
                </div>
                {workspace.tasks.filter((task) => task.projectId === project.id).length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted">
                    No tasks yet. Start with one concrete outcome and its acceptance checks.
                  </div>
                ) : null}
                {workspace.tasks
                  .filter((task) => task.projectId === project.id)
                  .map((task) => (
                    <TaskCard
                      key={task.id + task.updatedAt}
                      task={task}
                      onSave={(updated) =>
                        save({
                          ...workspace,
                          tasks: workspace.tasks.map((item) =>
                            item.id === updated.id ? updated : item,
                          ),
                        })
                      }
                      onBrief={() => setBrief(buildBrief(project, task))}
                    />
                  ))}
                {brief ? (
                  <section
                    className="space-y-3 rounded-lg border border-border bg-card p-4"
                    aria-label="Coding agent brief"
                  >
                    <h2 className="font-medium">Ready for your coding agent</h2>
                    <p className="text-sm text-muted">
                      Generated locally from your inputs. Review before sharing with an AI service.
                    </p>
                    <textarea
                      aria-label="Editable task brief"
                      className={`${field} min-h-64 font-mono text-sm`}
                      value={brief}
                      onChange={(event) => setBrief(event.target.value)}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        className={button}
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(brief);
                            setNotice("Brief copied.");
                          } catch {
                            setNotice("Clipboard unavailable. Select and copy the brief above.");
                          }
                        }}
                      >
                        Copy brief
                      </button>
                      <button
                        className={button}
                        disabled={brief.length > 5994}
                        onClick={() => {
                          setAssistantDraft("/plan " + brief);
                          setView("assistant");
                          setNotice(
                            brief.length > 5994
                              ? "Assistant draft limited to 6,000 characters; copy the full brief for an external coding agent."
                              : "Review the draft before sending.",
                          );
                        }}
                      >
                        Review in assistant <ArrowRight className="ml-1 inline size-4" />
                      </button>
                    </div>
                    {brief.length > 5994 ? (
                      <p className="text-sm text-muted">
                        The existing assistant accepts 6,000 characters. Copy the full brief for
                        your coding agent.
                      </p>
                    ) : null}
                  </section>
                ) : null}
                <LogTriage />
              </section>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}

function ProjectEditor({
  project,
  disabled,
  onSave,
}: {
  project: Project;
  disabled: boolean;
  onSave: (project: Project) => void;
}) {
  const [draft, setDraft] = useState(project);
  return (
    <form
      className="space-y-3 rounded-lg border border-border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(draft);
      }}
    >
      <h2 className="font-medium">Project context</h2>
      {(
        [
          ["name", "Name", 100],
          ["repository", "Repository (owner/name)", 200],
          ["context", "What we are building", 4000],
          ["constraints", "Decisions to preserve", 4000],
        ] as const
      ).map(([key, label, max]) => (
        <label className="block text-sm" key={key}>
          {label}
          {key === "context" || key === "constraints" ? (
            <textarea
              className={`${field} mt-1 min-h-24`}
              maxLength={max}
              value={draft[key]}
              onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
            />
          ) : (
            <input
              className={`${field} mt-1`}
              required={key === "name"}
              maxLength={max}
              value={draft[key]}
              onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
            />
          )}
        </label>
      ))}
      <button className={button} disabled={disabled || !draft.name.trim()}>
        Save context
      </button>
    </form>
  );
}

function TaskComposer({
  disabled,
  onAdd,
}: {
  disabled: boolean;
  onAdd: (title: string, acceptance: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [acceptance, setAcceptance] = useState("");
  return (
    <form
      className="space-y-3 rounded-lg border border-border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!title.trim()) return;
        onAdd(title.trim(), acceptance.trim());
        setTitle("");
        setAcceptance("");
      }}
    >
      <h2 className="font-medium">One clear next task</h2>
      <label className="block text-sm">
        Outcome
        <input
          className={`${field} mt-1`}
          required
          maxLength={500}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Fix the Android build from a clean checkout"
        />
      </label>
      <label className="block text-sm">
        How will we know it works?
        <textarea
          className={`${field} mt-1 min-h-24`}
          maxLength={4000}
          value={acceptance}
          onChange={(event) => setAcceptance(event.target.value)}
          placeholder="Build the exact commit; test the affected behavior; record unresolved checks."
        />
      </label>
      <button
        className={`${button} bg-primary text-primary-foreground`}
        disabled={disabled || !title.trim()}
      >
        Create task & brief
      </button>
    </form>
  );
}

function TaskCard({
  task,
  onSave,
  onBrief,
}: {
  task: WorkTask;
  onSave: (task: WorkTask) => void;
  onBrief: () => void;
}) {
  const [stage, setStage] = useState<Stage>(task.stage);
  const [evidence, setEvidence] = useState(task.evidence);
  const [error, setError] = useState("");
  return (
    <article className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium">{task.title}</h3>
        <span className="text-xs text-muted">{task.stage}</span>
      </div>
      <p className="whitespace-pre-wrap text-sm text-muted">
        {task.acceptance || "Acceptance checks not yet recorded."}
      </p>
      <label className="block text-sm">
        Stage
        <select
          className={`${field} mt-1`}
          value={stage}
          onChange={(event) => setStage(event.target.value as Stage)}
        >
          {stages.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Evidence / blocker
        <textarea
          className={`${field} mt-1 min-h-24`}
          maxLength={12000}
          value={evidence}
          onChange={(event) => setEvidence(event.target.value)}
          placeholder="Commit, command or check, observed result, source link, and anything still unverified."
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          className={button}
          onClick={() => {
            try {
              onSave(transitionTask(task, stage, evidence));
              setError("");
            } catch (failure) {
              setError(failure instanceof Error ? failure.message : "Update failed.");
            }
          }}
        >
          <CheckCheck className="mr-1 inline size-4" />
          Save progress
        </button>
        <button className={button} onClick={onBrief}>
          Build brief from saved task
        </button>
      </div>
      <p className="text-xs text-muted">
        Validated is your recorded assessment, not an automatic CI result. Deployment is not
        performed here.
      </p>
    </article>
  );
}

function LogTriage() {
  const [log, setLog] = useState("");
  const result = triageLog(log);
  return (
    <section className="space-y-3 rounded-lg border border-border p-4">
      <h2 className="font-medium">Failure triage</h2>
      <p className="text-sm text-muted">
        Local pattern matching. No upload or live repository access.
      </p>
      <label className="block text-sm">
        Error excerpt
        <textarea
          className={`${field} mt-1 min-h-24 font-mono text-sm`}
          maxLength={20000}
          value={log}
          onChange={(event) => setLog(event.target.value)}
          placeholder="Paste a sanitized error or job summary"
        />
      </label>
      {log.trim() ? (
        <div className="space-y-2 text-sm">
          <p className="font-medium">{result.category}</p>
          <p>{result.finding}</p>
          <p className="text-muted">Next: {result.next}</p>
        </div>
      ) : null}
    </section>
  );
}
