import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Bot, Plus, Send, ShieldCheck, Trash2, LoaderCircle, MessageSquareText, LockKeyhole } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import type { AiChatMessage, AiConversation, AiStreamEvent } from "@/lib/ai/contracts";

const linkStyle = "rounded-xl border border-zinc-800 px-3 py-2 text-sm text-zinc-300 transition hover:border-cyan-600 hover:text-white";
const buttonStyle = "rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40";

async function jsonOrError<T>(response: Response): Promise<T> {
  const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "The request failed.");
  return data;
}
function displayDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "" : date.toLocaleDateString();
}
function newClientMessage(content: string): AiChatMessage {
  return { id: crypto.randomUUID(), role: "user", content, createdAt: new Date().toISOString() };
}

export function PinAiChat() {
  const [ready, setReady] = useState<boolean | null>(null);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mobileHistory, setMobileHistory] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async () => {
    const data = await jsonOrError<{ conversations: AiConversation[] }>(await fetch("/api/ai/conversations", { cache: "no-store", credentials: "same-origin" }));
    setConversations(data.conversations);
    setAuthenticated(true);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const status = await jsonOrError<{ ready: boolean }>(await fetch("/api/ai/status", { cache: "no-store" }));
        if (!mounted) return;
        setReady(status.ready);
        if (!status.ready) return;
        await loadList();
      } catch (err) {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : "Unable to load chat.";
        if (/sign in|unauthorized/i.test(message)) setAuthenticated(false);
        else setError(message);
      }
    })();
    return () => { mounted = false; abort.current?.abort(); };
  }, [loadList]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function openConversation(id: string) {
    if (busy) return;
    setError("");
    setMobileHistory(false);
    try {
      const data = await jsonOrError<{ messages: AiChatMessage[] }>(await fetch(`/api/ai/conversations/${encodeURIComponent(id)}`, { cache: "no-store", credentials: "same-origin" }));
      setActiveId(id);
      setMessages(data.messages);
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn't load conversation."); }
  }

  function createNewChat() {
    if (busy) return;
    setActiveId(null);
    setMessages([]);
    setError("");
    setMobileHistory(false);
  }

  async function removeConversation(id: string) {
    if (busy || !window.confirm("Delete this conversation and its messages? This cannot be undone.")) return;
    try {
      const result = await fetch(`/api/ai/conversations/${encodeURIComponent(id)}`, { method: "DELETE", credentials: "same-origin" });
      await jsonOrError(result);
      if (activeId === id) { setActiveId(null); setMessages([]); }
      await loadList();
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn't delete conversation."); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || busy || ready !== true || authenticated !== true) return;
    setDraft("");
    setBusy(true);
    setError("");
    const currentId = activeId;
    const assistantId = crypto.randomUUID();
    const controller = new AbortController();
    abort.current = controller;
    setMessages((prev) => [...prev, newClientMessage(message), { id: assistantId, role: "assistant", content: "", createdAt: new Date().toISOString() }]);
    let completed = false;
    try {
      const response = await fetch("/api/ai/stream", {
        method: "POST", credentials: "same-origin", signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: currentId, message }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error || "Unable to start AI chat.");
      }
      if (!response.body) throw new Error("Streaming isn't available on this connection.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pending = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        pending += decoder.decode(value, { stream: true });
        const lines = pending.split("\n");
        pending = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const item = JSON.parse(line) as AiStreamEvent;
          if (item.type === "start") setActiveId(item.conversationId);
          if (item.type === "delta") {
            setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: m.content + item.text } : m));
          }
          if (item.type === "done") { setActiveId(item.conversationId); completed = true; }
          if (item.type === "error") throw new Error(item.message);
        }
      }
      if (!completed) throw new Error("Response interrupted. Reload the conversation to check saved messages.");
      await loadList();
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "AI chat failed.");
    } finally {
      setBusy(false);
      if (abort.current === controller) abort.current = null;
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#080d16] font-sans text-zinc-100">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0c1422] px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <a href="/terminal" className={linkStyle} aria-label="Open PinAI terminal"><ArrowLeft className="size-4" /></a>
          <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-700 shadow-lg shadow-cyan-950/40"><Bot className="size-5" /></span>
          <div><h1 className="font-semibold tracking-tight">PinAI <span className="text-cyan-400">Chat</span></h1><p className="text-xs text-zinc-400">Private developer assistant</p></div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 text-xs text-zinc-400 sm:flex"><ShieldCheck className="size-4 text-cyan-400" /> Scoped access</span>
          <a href="/terminal" className={linkStyle}>Terminal</a>
          <a href="/workspace" className={linkStyle}>Workspace</a>
          <a href="/browser-studio/index.html" className={linkStyle}>Studio</a>
          <button type="button" onClick={() => setMobileHistory((v) => !v)} className={`md:hidden ${buttonStyle}`}>History</button>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-[1500px] flex-1 overflow-hidden">
        <aside className={`${mobileHistory ? "flex" : "hidden"} w-full shrink-0 flex-col border-r border-white/10 bg-[#0a1120] p-4 md:flex md:w-72`}>
          <button type="button" className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-700 p-3 text-sm font-semibold text-white transition hover:bg-cyan-600 disabled:opacity-50" disabled={busy || ready !== true} onClick={createNewChat}><Plus className="size-4" /> New conversation</button>
          <h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Recent chats</h2>
          <div className="flex-1 space-y-1 overflow-y-auto">
            {conversations.length === 0 && <p className="px-2 py-4 text-sm text-zinc-500">No saved conversations yet.</p>}
            {conversations.map((chat) => (
              <div key={chat.id} className={`flex items-center gap-1 rounded-lg ${chat.id === activeId ? "bg-cyan-950/60" : "hover:bg-white/5"}`}>
                <button type="button" onClick={() => void openConversation(chat.id)} disabled={busy} className="min-w-0 flex-1 px-3 py-3 text-left">
                  <span className="block truncate text-sm">{chat.title}</span><span className="text-xs text-zinc-500">{displayDate(chat.updatedAt)}</span>
                </button>
                <button type="button" aria-label={`Delete ${chat.title}`} onClick={() => void removeConversation(chat.id)} disabled={busy} className="mr-2 rounded-md p-2 text-zinc-500 hover:bg-red-950/40 hover:text-red-300"><Trash2 className="size-4" /></button>
              </div>
            ))}
          </div>
        </aside>
        <main className={`${mobileHistory ? "hidden" : "flex"} min-w-0 flex-1 flex-col md:flex`}>
          {ready === null && <div className="grid flex-1 place-items-center text-zinc-400"><span className="flex items-center gap-2"><LoaderCircle className="size-5 animate-spin" /> Checking secure connection…</span></div>}
          {ready === false && (
            <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
              <LockKeyhole className="size-12 text-amber-400" />
              <h2 className="text-xl font-semibold">AI chat setup required</h2>
              <p className="text-sm leading-6 text-zinc-400">This feature is disabled until an OpenAI key, a persistent database, real authentication and an approved account list are configured on the server. No paid model calls are possible in this state.</p>
              <a href="https://github.com/omarreact/PinAI" className={linkStyle}>View project configuration</a>
            </div>
          )}
          {ready === true && authenticated === false && (
            <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
              <LockKeyhole className="size-12 text-cyan-400" />
              <h2 className="text-xl font-semibold">Sign in to PinAI</h2>
              <p className="text-sm text-zinc-400">A verified account on the server allowlist is required before chat history or model access is available.</p>
              <button type="button" onClick={() => void authClient.signIn.social({ provider: "github", callbackURL: "/ai", errorCallbackURL: "/ai" }).then((r) => { if (r.error) throw new Error(r.error.message ?? "GitHub sign-in failed."); if (r.data?.url) window.location.href = r.data.url; }).catch((e: unknown) => setError(e instanceof Error ? e.message : "Sign-in failed."))} className={`w-full ${buttonStyle}`}>Continue with GitHub</button>
            </div>
          )}
          {ready === true && authenticated === true && (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 md:px-10">
                <div className="mx-auto max-w-3xl space-y-6">
                  {!messages.length && <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center"><MessageSquareText className="size-10 text-cyan-500" /><h2 className="text-xl font-semibold">What are you building?</h2><p className="max-w-md text-sm leading-6 text-zinc-400">Ask about TypeScript, APIs, architecture, or debugging. Repository access and code execution are not connected in this first release.</p></div>}
                  {messages.map((message) => <article key={message.id} className={`rounded-2xl border px-4 py-4 md:px-5 ${message.role === "user" ? "ml-5 border-cyan-800/40 bg-cyan-950/20" : "mr-5 border-white/10 bg-white/[0.035]"}`}>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">{message.role === "user" ? "You" : "PinAI"}</div>
                    <p className="whitespace-pre-wrap break-words text-sm leading-7 text-zinc-200">{message.content || (busy ? "Thinking…" : "")}</p>
                  </article>)}
                </div>
              </div>
              <div className="border-t border-white/10 bg-[#0c1422] px-4 py-4 md:px-8">
                <form onSubmit={(event) => void submit(event)} className="mx-auto flex max-w-3xl items-end gap-3">
                  <label htmlFor="pinai-chat-prompt" className="sr-only">Message PinAI</label>
                  <textarea id="pinai-chat-prompt" value={draft} maxLength={6000} rows={2} disabled={busy} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Describe your question or development problem…" className="max-h-40 min-h-14 flex-1 resize-y rounded-2xl border border-zinc-700 bg-[#111e30] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-cyan-500" />
                  <button aria-label="Send message" type="submit" disabled={busy || !draft.trim()} className="grid size-12 place-items-center rounded-2xl bg-cyan-700 text-white hover:bg-cyan-600 disabled:opacity-40">{busy ? <LoaderCircle className="size-5 animate-spin" /> : <Send className="size-5" />}</button>
                </form>
                <p className="mx-auto mt-2 max-w-3xl text-xs text-zinc-500">AI can make mistakes. No GitHub writes, shell access or deployments are available in this mode.</p>
              </div>
            </>
          )}
          {!!error && <div role="alert" className="border-t border-red-800/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}<button type="button" className="ml-3 underline" onClick={() => setError("")}>Dismiss</button></div>}
        </main>
      </div>
    </div>
  );
}
