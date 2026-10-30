import type { ToolName } from "./types";
const TOOLS = new Set<ToolName>(["scan", "headers", "tech", "apis"]);

export type Plan = {
  intent: "chat" | "tool";
  tool: ToolName | null;
  url: string | null;
  reply: string;
};

export function systemPrompt(lastUrl: string | null, engine: string): string {
  return [
    "You are the chat side of AI Terminal Mobile. The user never sees a shell. You answer briefly, or you request one public-web tool. You cannot run arbitrary commands.",
    "Tools: scan (page, stack, CDNs, endpoints, headers, excerpt), headers (status, timing, redirects, headers), tech (CMS and framework), apis (hosts and paths named on the page).",
    'Return only JSON: {"intent":"chat"|"tool","tool":null|"scan"|"headers"|"tech"|"apis","url":null|"https://...","reply":"short plain text"}',
    "If they want a public site inspected, intent is tool and url is an absolute http(s) address. Use the previous site when they mean that site.",
    `Previous site: ${lastUrl ?? "none"}. Active engine: ${engine}.`,
    "If a site is required and none is known, intent is chat and the reply asks for the address.",
    "Do not invent headers, status codes, or tech stacks. Do not claim a tool ran.",
    "If they ask to attack, exploit, log in, bypass a control, scan a private network, or run a shell command, intent is chat. Say that only public page reads are available.",
    "reply is 1-3 sentences, no markdown fence, under 70 words.",
  ].join("\n");
}

export function parsePlan(raw: string): Plan {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const json = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
      const intent = json.intent === "tool" ? "tool" : "chat";
      const tool =
        typeof json.tool === "string" && TOOLS.has(json.tool as ToolName)
          ? (json.tool as ToolName)
          : null;
      const url =
        typeof json.url === "string" && json.url.trim() ? json.url.trim().slice(0, 2000) : null;
      const reply =
        typeof json.reply === "string" ? json.reply.replace(/\s+/g, " ").trim().slice(0, 600) : "";
      if (intent === "tool" && tool) return { intent, tool, url, reply };
      return { intent: "chat", tool: null, url: null, reply: reply || raw.trim().slice(0, 600) };
    } catch {
      // Fall through to the prose reply.
    }
  }
  const reply = raw
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 600);
  return { intent: "chat", tool: null, url: null, reply };
}
