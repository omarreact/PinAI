import type { EngineId, ToolName } from "./types";

export type LiveEngine = {
  id: EngineId;
  name: string;
  detail: string;
  /** Default page tool when this engine is handed a bare address. */
  tool: ToolName | null;
};

export const LIVE_ENGINES: LiveEngine[] = [
  {
    id: "grok",
    name: "Grok",
    detail: "Plain language. Reads a public page only when you ask it to.",
    tool: null,
  },
  {
    id: "scan",
    name: "Web scan",
    detail: "One public page: platform, CDNs, endpoints, headers, and an excerpt.",
    tool: "scan",
  },
  {
    id: "network",
    name: "Network",
    detail: "Status, timing, redirects, and response headers for a single GET.",
    tool: "headers",
  },
  {
    id: "stack",
    name: "Stack",
    detail: "CMS, framework, host, and analytics fingerprints.",
    tool: "tech",
  },
  {
    id: "shell",
    name: "Command",
    detail: "Only the commands you type. No model call between turns.",
    tool: null,
  },
];

export const UNAVAILABLE_ENGINES: { name: string; detail: string }[] = [
  {
    name: "OpenAI CLI",
    detail: "Not connected. This session does not store an OpenAI key or spawn that CLI.",
  },
  {
    name: "Hugging Face CLI",
    detail: "Not connected. Hub downloads and model pulls do not run from the chat.",
  },
  {
    name: "Local runner",
    detail: "Not connected. Weights are not kept on this device.",
  },
];

export const WELCOME =
  "The session is idle. Talk normally, or send a command.\n\n/scan https://example.com reads one public page and returns the platform, CDNs, endpoints, and response headers in this thread.\n\nNothing here keeps a shell open.";

export const HELP_TEXT = `Commands, one job at a time:

/scan https://example.com
  Page, stack, CDNs, endpoints, headers, excerpt

/headers https://example.com
  Status, timing, redirects, response headers

/tech https://example.com
  CMS, framework, host, analytics

/apis https://example.com
  Third-party hosts and paths named on the page

/note a line to keep
/session
/help

Grok accepts a normal sentence. Web scan, Network, and Stack treat a domain as the job. Command runs only what you type.

Private networks, raw shell, and other vendors' CLIs are not part of this session.`;

export const ARCHITECTURE: { k: string; t: string }[] = [
  {
    k: "01",
    t: "Chat is the only control. A sentence and a command land in the same thread.",
  },
  {
    k: "02",
    t: "A command runs as itself. With Grok selected, a short planner either answers or picks one public-page tool.",
  },
  {
    k: "03",
    t: "The page is read once, off the keyboard, and comes back as a card. The job ends when the card lands.",
  },
  {
    k: "04",
    t: "History stays on this device. Private addresses and raw shell commands never run.",
  },
];

export function engineById(id: EngineId): LiveEngine {
  return LIVE_ENGINES.find((engine) => engine.id === id) ?? LIVE_ENGINES[0];
}
