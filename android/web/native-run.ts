import { analyzePage } from "../../src/lib/terminal/analyze";
import { parsePlan, systemPrompt } from "../../src/lib/terminal/planner";
import { runReply } from "../../src/lib/terminal/route";
import type { FetchHit } from "../../src/lib/terminal/reader-types";
import type { ToolName, TurnInput, TurnResult } from "../../src/lib/terminal/types";
import { nativeRequest } from "./native-bridge";

export async function runTurn({ data }: { data: TurnInput }): Promise<TurnResult> {
  const readTool = async (tool: ToolName, url: string): Promise<TurnResult> => {
    const report = await analyzePage(url, tool, (address, maxBytes) =>
      nativeRequest<FetchHit>("read", { url: address, maxBytes }),
    );
    return { ok: true, reply: runReply(tool, report.finalUrl), tool, report, usedModel: false };
  };
  try {
    if (!data.text.trim() || data.text.length > 2000)
      return { ok: false, error: "Message is empty or too long." };
    if (data.tool)
      return data.url
        ? await readTool(data.tool, data.url)
        : { ok: false, error: "Send a public address with that command." };
    if (data.engine !== "grok")
      return {
        ok: true,
        reply: "Name a public site, or send /scan https://example.com.",
        tool: null,
        report: null,
        usedModel: false,
      };
    const model = await nativeRequest<{ available: boolean; content: string }>("grok", {
      messages: [
        { role: "system", content: systemPrompt(data.lastUrl, data.engine) },
        ...data.history
          .slice(-4)
          .map((item) => ({ role: item.role, content: item.text.slice(0, 400) })),
        { role: "user", content: data.text },
      ],
    });
    if (!model.available)
      return {
        ok: true,
        reply:
          "Add your xAI key using Grok key above to enable chat. Public-page commands work without a key: /scan https://example.com",
        tool: null,
        report: null,
        usedModel: false,
      };
    const plan = parsePlan(model.content);
    if (plan.intent === "tool" && plan.tool) {
      const url = plan.url || data.lastUrl;
      if (!url)
        return {
          ok: true,
          reply: plan.reply || "Send the public address to read.",
          tool: null,
          report: null,
          usedModel: true,
        };
      const result = await readTool(plan.tool, url);
      return result.ok ? { ...result, reply: plan.reply || result.reply, usedModel: true } : result;
    }
    return { ok: true, reply: plan.reply, tool: null, report: null, usedModel: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "The turn failed. Try again.",
    };
  }
}
