import { analyzePublicPage } from "./analyze.server";
import { toSafeMessage } from "./guard.server";
import { runReply } from "./route";
import type { ToolName, TurnInput, TurnResult } from "./types";

/**
 * Chat → tool bridge.
 * The client has already classified slash commands. This module either
 * runs one allowlisted page tool, or asks Grok to choose between a short
 * reply and one of those tools. There is no shell and no second process.
 */

const buckets = new Map<string, number[]>();

const TOOLS = new Set<ToolName>(["scan", "headers", "tech", "apis"]);

export async function executeTurn(input: TurnInput): Promise<TurnResult> {
  try {
    if (input.tool) {
      if (!input.url) {
        return { ok: false, error: "Send a public address with that command." };
      }
      return await runTool(input.tool, input.url);
    }
    if (input.engine !== "grok") {
      return {
        ok: true,
        reply: "Name a public site, or send a command such as /scan https://example.com.",
        tool: null,
        report: null,
        usedModel: false,
      };
    }
    return await planWithGrok(input);
  } catch (err) {
    console.error("terminal turn failed", err instanceof Error ? err.name : "unknown");
    return { ok: false, error: toSafeMessage(err) };
  }
}

async function runTool(tool: ToolName, url: string): Promise<TurnResult> {
  if (!allow("fetch", 8)) {
    return { ok: false, error: "Too many page reads in a short time. Wait a minute." };
  }
  const report = await analyzePublicPage(url, tool);
  const reply = runReply(tool, report.finalUrl || url);
  return { ok: true, reply, tool, report, usedModel: false };
}

async function planWithGrok(input: TurnInput): Promise<TurnResult> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return {
      ok: true,
      reply: "Grok is not available in this session. Web commands still run: /scan https://example.com",
      tool: null,
      report: null,
      usedModel: false,
    };
  }
  if (!allow("llm", 6)) {
    return {
      ok: false,
      error: "The model is pausing for a minute. A command such as /scan still runs.",
    };
  }

  const plan = await askPlanner(apiKey, input);
  if (plan.intent === "tool" && plan.tool) {
    const url = plan.url || input.lastUrl;
    if (!url) {
      return {
        ok: true,
        reply: plan.reply || "Send the public address to read.",
        tool: null,
        report: null,
        usedModel: true,
      };
    }
    const ran = await runTool(plan.tool, url);
    if (!ran.ok) return ran;
    return { ...ran, reply: plan.reply || ran.reply, usedModel: true };
  }

  return {
    ok: true,
    reply: plan.reply || "I didn't get a reply. Try /scan https://example.com.",
    tool: null,
    report: null,
    usedModel: true,
  };
}

type Plan = { intent: "chat" | "tool"; tool: ToolName | null; url: string | null; reply: string };

async function askPlanner(apiKey: string, input: TurnInput): Promise<Plan> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        temperature: 0,
        max_tokens: 220,
        messages: [
          { role: "system", content: systemPrompt(input.lastUrl, input.engine) },
          ...input.history.map((item) => ({ role: item.role, content: item.text })),
          { role: "user", content: input.text },
        ],
      }),
    });
    if (!res.ok) {
      throw new Error(`status ${res.status}`);
    }
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = body.choices?.[0]?.message?.content ?? "";
    return parsePlan(content);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { intent: "chat", tool: null, url: null, reply: "The model took too long. A /scan command still runs." };
    }
    return {
      intent: "chat",
      tool: null,
      url: null,
      reply: "The model didn't answer. Commands still run, for example /scan https://example.com.",
    };
  } finally {
    clearTimeout(timer);
  }
}

function systemPrompt(lastUrl: string | null, engine: string): string {
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

function parsePlan(raw: string): Plan {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const json = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
      const intent = json.intent === "tool" ? "tool" : "chat";
      const tool = typeof json.tool === "string" && TOOLS.has(json.tool as ToolName) ? (json.tool as ToolName) : null;
      const url = typeof json.url === "string" && json.url.trim() ? json.url.trim().slice(0, 2000) : null;
      const reply = typeof json.reply === "string" ? json.reply.replace(/\s+/g, " ").trim().slice(0, 600) : "";
      if (intent === "tool" && tool) return { intent, tool, url, reply };
      return { intent: "chat", tool: null, url: null, reply: reply || raw.trim().slice(0, 600) };
    } catch {
      // Fall through to the prose reply.
    }
  }
  const reply = raw.replace(/```[\s\S]*?```/g, " ").replace(/\s+/g, " ").trim().slice(0, 600);
  return { intent: "chat", tool: null, url: null, reply };
}

function allow(bucket: string, limit: number): boolean {
  const now = Date.now();
  const prev = (buckets.get(bucket) ?? []).filter((stamp) => now - stamp < 60_000);
  if (prev.length >= limit) {
    buckets.set(bucket, prev);
    return false;
  }
  prev.push(now);
  buckets.set(bucket, prev);
  return true;
}
