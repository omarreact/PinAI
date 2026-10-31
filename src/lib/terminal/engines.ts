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
    detail: "Development advice and public-page reads. No connected code executor.",
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
  "Bring a task brief from Projects, or use /plan followed by your development question. Chat requires the configured Grok service. It can advise, but cannot access private repositories, run builds or deploy.\n\n/scan https://example.com reads one public page. Project tasks and evidence stay on this device until you choose to share them.";

export const HELP_TEXT = `Commands, one job at a time:

/plan your development task
  Ask for development advice without treating links in the task as scan commands

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

Use Read again on a report to compare it with the previous read of the same page. Reports and sessions can be saved as JSON or Markdown. Search the session from the header; press / outside a text field to focus the composer.

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
