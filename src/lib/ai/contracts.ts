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

export class AiBadRequest extends Error {}
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
