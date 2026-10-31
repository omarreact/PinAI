import { createServerFn } from "@tanstack/react-start";
import type { EngineId, HistoryItem, ToolName, TurnInput, TurnResult } from "./types";

const ENGINES: EngineId[] = ["openai", "scan", "network", "stack", "shell"];
const TOOLS: ToolName[] = ["scan", "headers", "tech", "apis"];

export const runTurn = createServerFn({ method: "POST" })
  .validator((input: unknown): TurnInput => {
    if (!input || typeof input !== "object") throw new Error("Bad request");
    const data = input as Record<string, unknown>;
    const text = typeof data.text === "string" ? data.text.trim() : "";
    if (!text || text.length > 2000) throw new Error("Message is empty or too long.");
    if (typeof data.engine !== "string" || !ENGINES.includes(data.engine as EngineId)) {
      throw new Error("Unknown engine.");
    }
    const tool =
      data.tool === null || data.tool === undefined
        ? null
        : typeof data.tool === "string" && TOOLS.includes(data.tool as ToolName)
          ? (data.tool as ToolName)
          : null;
    if (data.tool != null && tool === null) throw new Error("Unknown tool.");
    const url = cleanUrl(data.url);
    const lastUrl = cleanUrl(data.lastUrl);
    return {
      text,
      engine: data.engine as EngineId,
      lastUrl,
      tool: data.tool == null ? null : tool,
      url,
      history: cleanHistory(data.history),
    };
  })
  .handler(async ({ data }): Promise<TurnResult> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const req = getRequest();
    if (!req) return { ok: false, error: "Request context unavailable." };
    try {
      const { requireAiUser } = await import("@/lib/ai/access.server");
      const userId = await requireAiUser(req);
      const { executeTurn } = await import("./execute.server");
      return executeTurn(data, userId);
    } catch (error) {
      const status = error instanceof Error && "status" in error
        ? Number((error as {status: unknown}).status) : 500;
      return { ok: false, error: status === 401 ? "Sign in with GitHub to use the terminal."
        : status === 403 ? "This account is not authorized."
        : "The terminal is unavailable until secure login is configured." };
    }
  });

function cleanUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || text.length > 2000) return null;
  return text;
}

function cleanHistory(value: unknown): HistoryItem[] {
  if (!Array.isArray(value)) return [];
  const out: HistoryItem[] = [];
  for (const item of value.slice(-4)) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const role = rec.role === "assistant" ? "assistant" : rec.role === "user" ? "user" : null;
    const text = typeof rec.text === "string" ? rec.text.slice(0, 400) : "";
    if (role && text) out.push({ role, text });
  }
  return out;
}
