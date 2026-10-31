import { HELP_TEXT, engineById } from "./engines";
import type { EngineId, ToolName } from "./types";

/**
 * Decides a turn before any model call.
 * Slash commands and obvious "read this site" sentences stay local so a
 * page tool does not spend a planner request, and so a shell-looking
 * string is never passed to a real process.
 */
export type LocalDecision =
  | { type: "help" }
  | { type: "session" }
  | { type: "clear" }
  | { type: "note"; text: string }
  | { type: "need-url"; tool: ToolName }
  | { type: "run"; tool: ToolName; url: string }
  | { type: "hint"; text: string }
  | { type: "plan" };

const URL_RE = /https?:\/\/[^\s<>"'`]+/i;
const DOMAIN_RE = /\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>"'`]*)?/i;

export function extractUrl(text: string, aggressive: boolean): string | null {
  const explicit = text.match(URL_RE);
  if (explicit) return trimTail(explicit[0]);
  if (!aggressive) return null;
  const domain = text.match(DOMAIN_RE);
  if (!domain) return null;
  return "https://" + trimTail(domain[0]);
}

function trimTail(value: string): string {
  return value.replace(/[),.;]+$/g, "");
}

function refersToLast(text: string): boolean {
  return /\b(again|rescan|same site|that site|this site|previous site|last site)\b/i.test(text);
}

function isHelp(text: string): boolean {
  return /^(help|\?|\/help|what can you (do|run)|which commands|commands)\??$/i.test(text.trim());
}

function isArchitecture(text: string): boolean {
  return /how (does|do) (this|it|the session|you) work/i.test(text);
}

function isConceptual(text: string): boolean {
  if (extractUrl(text, false)) return false;
  const namedSite = Boolean(extractUrl(text, true));
  const aboutARead = /\b(site|page|url|domain|website|headers?|scan|stack|cdn|api)\b/i.test(text);
  if (namedSite && aboutARead) return false;
  return /^(what|why|how|explain|define|who)\b/i.test(text.trim());
}

/** A verb that clearly asks for a page tool, not a definition. */
function obviousTool(text: string): ToolName | null {
  const t = text.toLowerCase();
  if (/\b(response header|network tab|headers?)\b/.test(t) && /\b(header|network)\b/.test(t)) {
    if (/\bheaders?\b/.test(t) && !/\b(scan|stack|cms|endpoint|cdn|api)\b/.test(t)) return "headers";
  }
  if (/\b(stack|cms|fingerprint|framework|wordpress|shopify)\b/.test(t) && /\b(scan|detect|identify|running|use|uses|on)\b/.test(t)) {
    return "tech";
  }
  if (/\b(endpoints?|cdns?|apis?)\b/.test(t) && /\b(find|list|extract|show|scan|on|from)\b/.test(t)) {
    return "apis";
  }
  if (/\b(scan|analyze|analyse|inspect|fetch|download)\b/.test(t)) return "scan";
  if (/\bheaders?\b/.test(t)) return "headers";
  if (/\b(tech stack|fingerprint|what cms|which cms)\b/.test(t)) return "tech";
  return null;
}

function parseSlash(text: string): { name: string; rest: string } | null {
  const match = text.trim().match(/^\/([a-z]+)(?:\s+([\s\S]*))?$/i);
  if (!match) return null;
  return { name: match[1].toLowerCase(), rest: (match[2] ?? "").trim() };
}

const SLASH_TOOL: Record<string, ToolName> = {
  scan: "scan",
  fetch: "scan",
  read: "scan",
  headers: "headers",
  header: "headers",
  network: "headers",
  tech: "tech",
  stack: "tech",
  apis: "apis",
  api: "apis",
  endpoints: "apis",
};

export function routeLocal(text: string, engine: EngineId, lastUrl: string | null): LocalDecision {
  const trimmed = text.trim();
  if (!trimmed) return { type: "hint", text: "Type a site or a command." };

  if (isHelp(trimmed)) return { type: "help" };
  if (isArchitecture(trimmed)) {
    return {
      type: "hint",
      text: "Open Session for the four steps. Short version: the chat picks one public-page tool, the read runs once, and the session goes idle again.",
    };
  }

  const slash = parseSlash(trimmed);
  if (slash) {
    if (slash.name === "help") return { type: "help" };
    if (slash.name === "session" || slash.name === "status") return { type: "session" };
    if (slash.name === "clear") return { type: "clear" };
    if (slash.name === "note") {
      if (!slash.rest) return { type: "hint", text: "Add a line after /note. It stays on this device." };
      return { type: "note", text: slash.rest.slice(0, 280) };
    }
    const tool = SLASH_TOOL[slash.name];
    if (!tool) {
      return {
        type: "hint",
        text: "Unknown command. " + HELP_TEXT.split("\n\n").slice(0, 1).join("\n"),
      };
    }
    const url = extractUrl(slash.rest, true) ?? (slash.rest ? null : lastUrl);
    if (!url) return { type: "need-url", tool };
    return { type: "run", tool, url };
  }

  if (engine === "shell") {
    const url = extractUrl(trimmed, false);
    const tool = obviousTool(trimmed);
    if (tool && url) return { type: "run", tool, url };
    return {
      type: "hint",
      text: "Command mode does not guess. Try /scan https://example.com, /headers, /tech, /apis, /note, or /help.",
    };
  }

  const live = engineById(engine);
  const tool = obviousTool(trimmed) ?? live.tool;
  const aggressive = engine !== "openai" || tool !== null;
  const url = extractUrl(trimmed, aggressive && !isConceptual(trimmed));

  if (engine === "openai") {
    if (isConceptual(trimmed) && !extractUrl(trimmed, false)) return { type: "plan" };
    if (tool && url) return { type: "run", tool, url };
    if (tool && !url && refersToLast(trimmed) && lastUrl) return { type: "run", tool, url: lastUrl };
    if (tool && !url && !isConceptual(trimmed) && obviousTool(trimmed)) return { type: "need-url", tool };
    return { type: "plan" };
  }

  const chosen = obviousTool(trimmed) ?? live.tool ?? "scan";
  if (url) return { type: "run", tool: chosen, url };
  if (refersToLast(trimmed) && lastUrl) return { type: "run", tool: chosen, url: lastUrl };
  if (isConceptual(trimmed)) {
    return {
      type: "hint",
      text: "This engine reads sites, it does not chat. Switch to OpenAI for a plain answer, or send a public address.",
    };
  }
  return { type: "need-url", tool: chosen };
}

export function helpText(): string {
  return HELP_TEXT;
}

export function hostLabel(value: string): string {
  try {
    return new URL(value).host;
  } catch {
    return value;
  }
}

const NEED_URL: Record<ToolName, string> = {
  scan: "Send the public address to read. Example: example.com",
  headers: "Send the public address whose headers you want.",
  tech: "Send the public address to fingerprint.",
  apis: "Send the public address to search for endpoints and CDNs.",
};

export function needUrlText(tool: ToolName): string {
  return NEED_URL[tool];
}

export function runReply(tool: ToolName, url: string): string {
  const host = hostLabel(url);
  if (tool === "headers") return `One GET to ${host}. Headers are from that response, not a guess.`;
  if (tool === "tech") return `Fingerprint for ${host}, taken from the HTML and response headers.`;
  if (tool === "apis") return `Hosts and paths named on ${host}. Listed from the page. robots.txt is the only extra fetch.`;
  return `Read ${host}. The card is the page, not a model guess.`;
}
