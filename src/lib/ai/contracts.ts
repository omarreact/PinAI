/** Versioned, intentionally small HTTP contract. No credentials or model keys in the browser. */
export type AiRole = "user" | "assistant";
export type AiChatMessage = { id: string; role: AiRole; content: string; createdAt: string };
export type AiConversation = { id: string; title: string; createdAt: string; updatedAt: string };
export type AiStreamRequest = { conversationId: string | null; message: string };
export type AiStreamEvent =
  | { type: "start"; conversationId: string }
  | { type: "delta"; text: string }
  | { type: "done"; conversationId: string }
  | { type: "error"; message: string };

export class AiBadRequest extends Error { constructor(message: string, public status = 400) { super(message); } }
export function validateChatInput(body: unknown): AiStreamRequest {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new AiBadRequest("Invalid request.");
  const rec = body as Record<string, unknown>;
  if (typeof rec.message !== "string") throw new AiBadRequest("A message is required.");
  const message = rec.message.trim();
  if (message.length < 1 || message.length > 6000) throw new AiBadRequest("Message must be 1–6000 characters.");
  const conversationId = rec.conversationId === null || rec.conversationId === undefined ? null : rec.conversationId;
  if (conversationId !== null && (typeof conversationId !== "string" || !/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(conversationId))) {
    throw new AiBadRequest("Invalid conversation ID.");
  }
  return { message, conversationId: conversationId as string | null };
}
export function encodeEvent(event: AiStreamEvent): string { return JSON.stringify(event) + "\n"; }
export function safeTitle(message: string): string {
  return message.replace(/\s+/g, " ").trim().slice(0, 70) || "New chat";
}

/** Bounded body reader: never allocate or parse arbitrary-size anonymous POSTs. */
export async function readBoundedJson(request: Request, maxBytes = 9000): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new AiBadRequest("JSON body required.");
  const decoder = new TextDecoder();
  let received = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new AiBadRequest("Request too large.", 413);
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  try { return JSON.parse(text) as unknown; }
  catch { throw new AiBadRequest("Invalid JSON."); }
}
