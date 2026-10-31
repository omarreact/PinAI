import { createFileRoute } from "@tanstack/react-router";
import { AiBadRequest, encodeEvent, validateChatInput } from "@/lib/ai/contracts";
export const Route = createFileRoute("/api/ai/stream")({
  server: { handlers: { POST: async ({ request }) => {
    const { requireAiUser, respondAiError, AiAccessError } = await import("@/lib/ai/access.server");
    try {
      const userId = await requireAiUser(request);
      if (!process.env.OPENAI_API_KEY?.trim() || !process.env.OPENAI_MODEL?.trim()) {
        return respondAiError(new AiAccessError(503, "OpenAI is not configured for this project."));
      }
      if (!request.headers.get("content-type")?.startsWith("application/json")) {
        return Response.json({ error: "JSON required." }, { status: 415 });
      }
      const size = Number(request.headers.get("content-length") ?? "0");
      if (size > 9_000) return Response.json({ error: "Request too large." }, { status: 413 });
      let body: unknown;
      try { body = await request.json(); } catch { throw new AiBadRequest("Invalid JSON."); }
      const input = validateChatInput(body);
      const { consumeAiQuota, beginChat, getContext, saveAssistant } = await import("@/lib/ai/store.server");
      if (!(await consumeAiQuota(userId))) return Response.json({ error: "AI request limit reached. Retry shortly." }, { status: 429 });
      const conversationId = await beginChat(userId, input.conversationId, input.message);
      if (!conversationId) return Response.json({ error: "Conversation not found." }, { status: 404 });
      const history = await getContext(userId, conversationId);
      const { streamOpenAiText } = await import("@/lib/ai/openai.server");
      const encoder = new TextEncoder();
      const abort = new AbortController();
      const cancel = () => abort.abort();
      request.signal.addEventListener("abort", cancel, { once: true });
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          let text = "";
          try {
            controller.enqueue(encoder.encode(encodeEvent({ type: "start", conversationId })));
            for await (const delta of streamOpenAiText(history, abort.signal)) {
              if (abort.signal.aborted) break;
              text += delta;
              if (text.length > 16000) throw new Error("Output limit exceeded.");
              controller.enqueue(encoder.encode(encodeEvent({ type: "delta", text: delta })));
            }
            if (abort.signal.aborted) return;
            if (!text.trim()) throw new Error("Empty AI output.");
            await saveAssistant(userId, conversationId, text);
            controller.enqueue(encoder.encode(encodeEvent({ type: "done", conversationId })));
          } catch (error) {
            console.error("[pinai-ai] stream failed", error instanceof Error ? error.name : "unknown");
            if (!abort.signal.aborted) controller.enqueue(encoder.encode(encodeEvent({ type: "error", message: "The response could not be completed. Please retry." })));
          } finally {
            request.signal.removeEventListener("abort", cancel);
            try { controller.close(); } catch { /* disconnected */ }
          }
        },
        cancel,
      });
      return new Response(stream, {
        headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache, no-store, no-transform", "X-Content-Type-Options": "nosniff" },
      });
    } catch (error) {
      if (error instanceof AiBadRequest) return Response.json({ error: error.message }, { status: 400 });
      return respondAiError(error);
    }
  } } },
});