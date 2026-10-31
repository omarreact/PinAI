import type { EngineId, ToolName } from "./types";

export type LiveEngine = {
  id: EngineId;
  name: string;
  detail: string;
  tool: ToolName | null;
};
export const LIVE_ENGINES: LiveEngine[] = [
  { id: "openai", name: "OpenAI", detail: "Secure AI responses using your configured OpenAI model.", tool: null },
  { id: "scan", name: "Web scan", detail: "Public-page platform, CDNs, endpoints, headers and excerpts.", tool: "scan" },
  { id: "network", name: "Network", detail: "Status, redirects, timing and response headers.", tool: "headers" },
  { id: "stack", name: "Stack", detail: "CMS, framework, hosting and analytics fingerprints.", tool: "tech" },
  { id: "shell", name: "Commands", detail: "Explicit safe web commands only; no OS shell execution.", tool: null },
];
export const UNAVAILABLE_ENGINES: {name: string; detail: string}[] = [
  { name: "Local shell", detail: "Not connected. PinAI does not run arbitrary shell commands." },
  { name: "Local model", detail: "Not connected. Model weights are not stored in the browser." },
];
export const WELCOME = "Welcome to PinAI. OpenAI chat and public web diagnostics share this terminal.\n\nUse /scan https://example.com to read a public page. No arbitrary shell commands run.";
export const HELP_TEXT = `Commands:
/scan https://example.com — Public page overview
/headers https://example.com — Response headers and redirects
/tech https://example.com — CMS and framework
/apis https://example.com — Visible third-party hosts and paths
/note text — Local note
/session — Current session
/help — Commands

OpenAI mode answers development questions. Other modes only inspect public sites. You can also use the full /ai chat, which saves conversation history to your account.`;
export const ARCHITECTURE: { k: string; t: string }[] = [
  { k: "01", t: "OpenAI requests are sent server-side with your configured API key." },
  { k: "02", t: "GitHub authentication and the allowed-email list protect paid model usage." },
  { k: "03", t: "Web-analysis tools require explicit commands and enforce public-address restrictions." },
  { k: "04", t: "Local terminal notes stay on your device; /ai stores private chat history in PostgreSQL." },
];
export function engineById(id: EngineId): LiveEngine {
  return LIVE_ENGINES.find(engine => engine.id === id) ?? LIVE_ENGINES[0];
}
