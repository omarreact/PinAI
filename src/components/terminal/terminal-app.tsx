import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, SendHorizontal, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { LIVE_ENGINES, engineById } from "@/lib/terminal/engines";
import { helpText, hostLabel, needUrlText, routeLocal, runReply } from "@/lib/terminal/route";
import { runTurn } from "@/lib/terminal/run";
import { useTerminal } from "@/lib/terminal/store";
import type { EngineId, Message, WebReport } from "@/lib/terminal/types";
import { messageMatches, previousReport } from "@/lib/terminal/report-utils";
import { ReportCard } from "./report-card";
import { ArchitectureList, EngineSheet, SessionSheet } from "./sheets";

const SUGGESTIONS: { label: string; engine?: EngineId; text?: string }[] = [
  { label: "Read wordpress.org", text: "/scan https://wordpress.org" },
  { label: "Headers", engine: "network" },
  { label: "Stack", engine: "stack" },
  { label: "APIs", text: "/apis https://wordpress.org" },
  { label: "Help", text: "/help" },
];

export function TerminalApp({
  initialDraft = "",
  embedded = false,
}: {
  initialDraft?: string;
  embedded?: boolean;
}) {
  const engineId = useTerminal((state) => state.engineId);
  const messages = useTerminal((state) => state.messages);
  const turns = useTerminal((state) => state.turns);
  const setEngine = useTerminal((state) => state.setEngine);
  const engine = engineById(engineId);
  const busy = messages.some((message) => message.pending);
  const latest = [...messages].reverse().find((message) => message.report)?.report ?? null;

  const [engineOpen, setEngineOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [draft, setDraft] = useState(initialDraft);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const visibleMessages = messages
    .map((message, index) => ({ message, index }))
    .filter(({ message }) => messageMatches(message, searchQuery));

  useEffect(() => {
    void useTerminal.persist.rehydrate()?.then(() => {
      const id = useTerminal.getState().engineId;
      if (!LIVE_ENGINES.some((item) => item.id === id)) useTerminal.getState().setEngine("grok");
      useTerminal.setState({
        messages: useTerminal.getState().messages.filter((message) => !message.pending),
      });
    });
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const nodes = el.querySelectorAll<HTMLElement>("[data-message]");
    const last = nodes[nodes.length - 1];
    if (!last) {
      el.scrollTop = el.scrollHeight;
      return;
    }
    const tooTall = last.offsetHeight > el.clientHeight * 0.85;
    if (!tooTall) {
      el.scrollTop = el.scrollHeight;
      return;
    }
    const top = last.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop;
    el.scrollTop = Math.max(0, top - 8);
  }, [messages]);

  useEffect(() => {
    if (window.matchMedia("(min-width: 768px)").matches) inputRef.current?.focus();
  }, [engineId]);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const focusComposer = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        event.key !== "/" ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        target?.closest("input, textarea, select, [contenteditable='true'], [role='dialog']")
      )
        return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener("keydown", focusComposer);
    return () => document.removeEventListener("keydown", focusComposer);
  }, []);

  async function send(text: string) {
    const value = text.trim();
    if (!value || busy) return;
    const state = useTerminal.getState();
    if (state.messages.some((message) => message.pending)) return;
    const decision = routeLocal(value, state.engineId, state.lastUrl);
    const user: Message = { id: uid(), role: "user", text: value };
    state.append(user);
    setDraft("");
    setSearchQuery("");
    setSearchOpen(false);
    if (inputRef.current) inputRef.current.style.height = "auto";

    if (decision.type === "help") {
      state.append({ id: uid(), role: "assistant", text: helpText() });
      state.bump();
      return;
    }
    if (decision.type === "session") {
      const now = useTerminal.getState();
      state.append({
        id: uid(),
        role: "assistant",
        text: `Engine ${engineById(now.engineId).name}. Turns ${now.turns}. Last site ${now.lastUrl ? hostLabel(now.lastUrl) : "none"}. Notes ${now.notes.length}.`,
      });
      return;
    }
    if (decision.type === "clear") {
      state.clear();
      return;
    }
    if (decision.type === "note") {
      state.addNote(decision.text);
      state.append({ id: uid(), role: "assistant", text: "Noted on this device." });
      state.bump();
      return;
    }
    if (decision.type === "hint") {
      state.append({ id: uid(), role: "assistant", text: decision.text });
      return;
    }
    if (decision.type === "need-url") {
      state.append({ id: uid(), role: "assistant", text: needUrlText(decision.tool) });
      return;
    }

    const pendingId = uid();
    const pendingText = decision.type === "plan" ? "Asking Grok" : "Reading the page";
    state.append({ id: pendingId, role: "assistant", text: pendingText, pending: true });

    try {
      const history = useTerminal
        .getState()
        .messages.filter((message) => !message.pending && !message.id.startsWith("welcome"))
        .slice(-5, -1)
        .map((message) => ({ role: message.role, text: message.text.slice(0, 400) }));

      const result = await runTurn({
        data: {
          text: value,
          engine: /^\/plan\s/i.test(value) ? "grok" : state.engineId,
          lastUrl: state.lastUrl,
          tool: decision.type === "run" ? decision.tool : null,
          url: decision.type === "run" ? decision.url : null,
          history,
        },
      });

      if (!useTerminal.getState().messages.some((message) => message.id === pendingId)) return;

      if (!result.ok) {
        useTerminal
          .getState()
          .patch(pendingId, { pending: false, failed: true, text: result.error });
        return;
      }

      useTerminal.getState().patch(pendingId, {
        pending: false,
        failed: false,
        text:
          result.reply || (result.tool ? runReply(result.tool, result.report?.finalUrl ?? "") : ""),
        tool: result.tool,
        report: result.report,
      });
      useTerminal.getState().bump();
      if (result.report?.finalUrl) useTerminal.getState().setLastUrl(result.report.finalUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : "The turn failed.";
      if (!useTerminal.getState().messages.some((item) => item.id === pendingId)) return;
      useTerminal.getState().patch(pendingId, { pending: false, failed: true, text: message });
    }
  }

  function onSuggestion(item: (typeof SUGGESTIONS)[number]) {
    if (item.engine) {
      setEngine(item.engine);
      inputRef.current?.focus();
      return;
    }
    if (item.text) void send(item.text);
  }

  return (
    <div
      className={cn(
        "flex overflow-hidden bg-background text-foreground",
        embedded ? "h-full" : "h-dvh",
      )}
    >
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border md:flex">
        <div className="safe-top px-4 py-5">
          <div className="flex items-center gap-2">
            <span className={busy ? "dot dot-busy" : "dot"} aria-hidden="true" />
            <h1 className="text-lg font-medium tracking-tight">Terminal</h1>
          </div>
          <p className="mt-1 font-mono text-xs text-faint">Mobile</p>
        </div>
        <nav className="flex flex-1 flex-col gap-2 overflow-y-auto px-3" aria-label="Engines">
          {LIVE_ENGINES.map((item) => {
            const selected = item.id === engineId;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={selected ? "true" : undefined}
                onClick={() => setEngine(item.id)}
                className={cn(
                  "press rounded-md border px-3 py-3 text-left",
                  selected ? "border-foreground bg-subtle" : "border-transparent hover:bg-subtle",
                )}
              >
                <div className="text-sm font-medium">{item.name}</div>
                <p className="mt-1 text-xs text-muted">{item.detail}</p>
              </button>
            );
          })}
        </nav>
        <div className="border-t border-border px-4 py-4">
          <div className="font-mono text-xs text-faint">Turns</div>
          <div className="mt-1 text-sm tabular-nums">{turns}</div>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="safe-top flex items-center gap-2 border-b border-border px-3 py-2 md:px-4">
          <div className="flex min-w-0 items-center gap-2 md:hidden">
            <span className={busy ? "dot dot-busy" : "dot"} aria-hidden="true" />
            <span className="text-sm font-medium">Terminal</span>
          </div>
          <button
            type="button"
            className="press flex h-11 min-w-0 flex-1 items-center justify-between rounded-md border border-border bg-card px-3 md:hidden"
            onClick={() => setEngineOpen(true)}
          >
            <span className="truncate text-sm font-medium">{engine.name}</span>
            <ChevronDown className="size-4 text-faint" aria-hidden="true" />
          </button>
          <div className="hidden min-w-0 flex-1 md:block">
            <div className="text-sm font-medium">{engine.name}</div>
            <div className="text-xs text-muted">{busy ? "Running" : "Idle"}</div>
          </div>
          <button
            type="button"
            aria-label="Search session"
            aria-expanded={searchOpen}
            aria-controls="session-search"
            className="press inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-border bg-card"
            onClick={() => {
              setSearchOpen((open) => !open);
              setSearchQuery("");
            }}
          >
            <Search className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Session"
            className="press inline-flex size-11 items-center justify-center rounded-md border border-border bg-card"
            onClick={() => setSessionOpen(true)}
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
          </button>
        </header>

        {searchOpen ? (
          <div
            id="session-search"
            className="flex items-center gap-2 border-b border-border px-3 py-2 md:px-4"
          >
            <label className="sr-only" htmlFor="session-search-input">
              Search messages and reports
            </label>
            <input
              id="session-search-input"
              ref={searchRef}
              type="search"
              value={searchQuery}
              placeholder="Search messages, sites or technologies"
              className="h-11 min-w-0 flex-1 rounded-md border border-border bg-subtle px-3 text-base text-foreground outline-none focus:border-foreground"
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setSearchOpen(false);
                  setSearchQuery("");
                  inputRef.current?.focus();
                }
              }}
            />
            <span className="shrink-0 font-mono text-xs text-muted" role="status">
              {visibleMessages.length}/{messages.length}
            </span>
            <button
              type="button"
              aria-label="Close session search"
              className="press inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-border"
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery("");
                inputRef.current?.focus();
              }}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        ) : null}

        <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto" data-testid="transcript">
          <div
            className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-3 py-4 md:px-5"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
          >
            {visibleMessages.map(({ message, index }) => (
              <MessageView
                key={message.id}
                message={message}
                last={index === messages.length - 1}
                previous={
                  message.report ? previousReport(messages, index, message.report) : undefined
                }
                busy={busy}
                onRerun={
                  message.report
                    ? () => void send(`/${message.report!.mode} ${message.report!.requestedUrl}`)
                    : undefined
                }
                onRetry={
                  message.failed && messages[index - 1]?.role === "user"
                    ? () => void send(messages[index - 1].text)
                    : undefined
                }
              />
            ))}
            {visibleMessages.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted" role="status">
                No messages match this search. Try another word or close search.
              </p>
            ) : null}
          </div>
        </div>

        <div className="safe-bottom border-t border-border">
          <div className="scroll-x mx-auto flex w-full max-w-2xl gap-2 px-3 py-2 md:px-5">
            {SUGGESTIONS.map((item) => (
              <button
                key={item.label}
                type="button"
                className="press h-11 shrink-0 rounded-md border border-border bg-card px-3 text-sm"
                onClick={() => onSuggestion(item)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <form
            className="mx-auto flex w-full max-w-2xl items-end gap-2 px-3 pb-3 md:px-5"
            onSubmit={(event) => {
              event.preventDefault();
              void send(draft);
            }}
          >
            <label className="sr-only" htmlFor="terminal-input">
              Message
            </label>
            <textarea
              id="terminal-input"
              ref={inputRef}
              data-testid="composer"
              rows={1}
              maxLength={6000}
              value={draft}
              placeholder={placeholder(engine.id)}
              enterKeyHint="send"
              autoCapitalize="off"
              autoCorrect="off"
              className="max-h-32 min-h-11 flex-1 resize-none rounded-md border border-border bg-subtle px-3 py-3 text-base text-foreground outline-none placeholder:text-faint focus:border-foreground"
              onChange={(event) => {
                setDraft(event.target.value);
                const el = event.target;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send(draft);
                }
              }}
            />
            <button
              type="submit"
              aria-label="Send"
              disabled={busy || draft.trim().length === 0}
              className="press inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40"
            >
              <SendHorizontal className="size-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      </section>

      <aside className="hidden w-80 shrink-0 flex-col border-l border-border lg:flex">
        <div className="safe-top border-b border-border px-5 py-5">
          <h2 className="text-sm font-medium">Latest read</h2>
          {latest ? (
            <div className="mt-3">
              <div className="break-all text-sm font-medium">{hostLabel(latest.finalUrl)}</div>
              <p className="mt-1 font-mono text-xs tabular-nums text-muted">
                {latest.status} · {latest.ms} ms
              </p>
              <ul className="mt-3 flex flex-col gap-1">
                {latest.stack.slice(0, 6).map((hit) => (
                  <li key={`${hit.group}-${hit.name}`} className="text-sm text-muted">
                    {hit.group} / {hit.name}
                  </li>
                ))}
                {latest.stack.length === 0 ? (
                  <li className="text-sm text-muted">No platform marker.</li>
                ) : null}
              </ul>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">
              No page yet. A read shows up here after the first card.
            </p>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <h2 className="text-sm font-medium">How a turn runs</h2>
          <div className="mt-4">
            <ArchitectureList />
          </div>
        </div>
      </aside>

      {engineOpen ? <EngineSheet open={engineOpen} onOpenChange={setEngineOpen} /> : null}
      {sessionOpen ? <SessionSheet open={sessionOpen} onOpenChange={setSessionOpen} /> : null}
    </div>
  );
}

function MessageView({
  message,
  last,
  previous,
  onRerun,
  onRetry,
  busy,
}: {
  message: Message;
  last?: boolean;
  previous?: WebReport;
  onRerun?: () => void;
  onRetry?: () => void;
  busy?: boolean;
}) {
  const mine = message.role === "user";
  return (
    <div
      data-message={last ? "last" : "true"}
      className={cn("msg-in flex", mine ? "justify-end" : "justify-start")}
    >
      <div className={cn("min-w-0", mine ? "max-w-xs" : "w-full")}>
        <div
          className={cn(
            "rounded-lg px-3 py-3 text-sm leading-normal",
            mine
              ? "bg-primary text-primary-foreground"
              : cn(
                  "w-fit max-w-full border bg-card text-foreground",
                  message.failed ? "border-danger" : "border-border",
                ),
            message.pending && "text-muted",
          )}
        >
          <p className="whitespace-pre-wrap break-words">{message.text}</p>
          {onRetry ? (
            <button
              type="button"
              className="press mt-3 min-h-11 rounded-md border border-border px-3 text-sm disabled:opacity-40"
              disabled={busy}
              onClick={onRetry}
            >
              Retry request
            </button>
          ) : null}
        </div>
        {message.report ? (
          <ReportCard report={message.report} previous={previous} onRerun={onRerun} busy={busy} />
        ) : null}
      </div>
    </div>
  );
}

function placeholder(engine: EngineId): string {
  if (engine === "grok") return "Ask, or name a public site";
  if (engine === "network") return "Site to inspect headers";
  if (engine === "stack") return "Site to fingerprint";
  if (engine === "shell") return "/scan https://example.com";
  return "https:// or a domain";
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
