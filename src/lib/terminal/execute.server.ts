import { analyzePublicPage } from "./analyze.server";
import { toSafeMessage } from "./guard.server";
import { runReply } from "./route";
import { consumeAiQuota } from "@/lib/ai/store.server";
import { streamOpenAiText } from "@/lib/ai/openai.server";
import type { ToolName, TurnInput, TurnResult } from "./types";

const TOOLS = new Set<ToolName>(["scan", "headers", "tech", "apis"]);
const readBuckets = new Map<string, number[]>();

/** No model-authorized tool execution. Public-web commands are explicit and SSRF-guarded. */
export async function executeTurn(input: TurnInput, userId: string): Promise<TurnResult> {
  try {
    if (input.tool) {
      if (!input.url) return { ok: false, error: "Provide a public URL for that command." };
      if (!TOOLS.has(input.tool)) return { ok: false, error: "Unsupported tool." };
      if (!allowRead(userId)) return { ok: false, error: "Web read limit reached. Retry shortly." };
      const report = await analyzePublicPage(input.url, input.tool);
      return { ok: true, reply: runReply(input.tool, report.finalUrl || input.url),
        tool: input.tool, report, usedModel: false };
    }
    if (input.engine !== "openai") {
      return { ok: true, reply: "Send a public site or a /scan, /headers, /tech or /apis command.",
        tool: null, report: null, usedModel: false };
    }
    if (!process.env.OPENAI_API_KEY?.trim() || !process.env.OPENAI_MODEL?.trim()) {
      return { ok: false, error: "OpenAI is not configured on the server." };
    }
    if (!(await consumeAiQuota(userId))) {
      return { ok: false, error: "AI request limit reached. Retry shortly." };
    }
    const history = input.history.map(x => ({ role: x.role, content: x.text }));
    history.push({ role: "user", content: input.text });
    const abort = AbortSignal.timeout(55000);
    let text = "";
    for await (const chunk of streamOpenAiText(history, abort)) {
      text += chunk;
      if (text.length > 16000) throw new Error("Response too long.");
    }
    return { ok: true, reply: text.trim() || "The model returned no text.",
      tool: null, report: null, usedModel: true };
  } catch (err) {
    console.error("[pinai-terminal] turn failed", err instanceof Error ? err.name : "unknown");
    return { ok: false, error: toSafeMessage(err) };
  }
}
function allowRead(userId: string): boolean {
  const now = Date.now();
  const prev = (readBuckets.get(userId) ?? []).filter(stamp => now - stamp < 60000);
  if (prev.length >= 8) { readBuckets.set(userId, prev); return false; }
  prev.push(now); readBuckets.set(userId, prev); return true;
}
