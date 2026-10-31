import { randomUUID } from "node:crypto";
import { getSql } from "@/lib/db";
import type { AiChatMessage, AiConversation, AiRole } from "./contracts";
import { safeTitle } from "./contracts";

type ChatMessageRow = { id: string; role: AiRole; content: string; createdAt: Date | string };
type ConversationRow = { id: string; title: string; createdAt: Date | string; updatedAt: Date | string };
const timestamp = (v: Date | string): string => new Date(v).toISOString();
export async function listConversations(userId: string): Promise<AiConversation[]> {
  const db = await getSql();
  const rows = await db.query<ConversationRow>(
    'SELECT id, title, created_at AS "createdAt", updated_at AS "updatedAt" FROM ai_conversations WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 60', [userId]);
  return rows.map((r) => ({ ...r, createdAt: timestamp(r.createdAt), updatedAt: timestamp(r.updatedAt) }));
}
export async function getMessages(userId: string, conversationId: string): Promise<AiChatMessage[] | null> {
  const db = await getSql();
  const owned = await db.query<{ id: string }>("SELECT id FROM ai_conversations WHERE id = $1 AND user_id = $2", [conversationId, userId]);
  if (!owned.length) return null;
  const rows = await db.query<ChatMessageRow>(
    'SELECT id, role, content, created_at AS "createdAt" FROM ai_messages WHERE conversation_id = $1 AND user_id = $2 ORDER BY created_at ASC, id ASC LIMIT 300', [conversationId, userId]);
  return rows.map((r) => ({ ...r, createdAt: timestamp(r.createdAt) }));
}
export async function beginChat(userId: string, priorId: string | null, message: string): Promise<string | null> {
  const db = await getSql();
  if (priorId) {
    const rows = await db.query<{ id: string }>("SELECT id FROM ai_conversations WHERE id = $1 AND user_id = $2", [priorId, userId]);
    if (!rows.length) return null;
  }
  const conversationId = priorId ?? randomUUID();
  if (!priorId) await db.query("INSERT INTO ai_conversations (id, user_id, title) VALUES ($1, $2, $3)", [conversationId, userId, safeTitle(message)]);
  await db.query("INSERT INTO ai_messages (id, conversation_id, user_id, role, content) VALUES ($1, $2, $3, $4, $5)", [randomUUID(), conversationId, userId, "user", message]);
  await db.query("UPDATE ai_conversations SET updated_at = now() WHERE id = $1 AND user_id = $2", [conversationId, userId]);
  return conversationId;
}
export async function saveAssistant(userId: string, conversationId: string, text: string): Promise<void> {
  const db = await getSql();
  const owned = await db.query<{ id: string }>("SELECT id FROM ai_conversations WHERE id = $1 AND user_id = $2", [conversationId, userId]);
  if (!owned.length) throw new Error("Conversation no longer belongs to the current account.");
  await db.query("INSERT INTO ai_messages (id, conversation_id, user_id, role, content) VALUES ($1, $2, $3, $4, $5)", [randomUUID(), conversationId, userId, "assistant", text]);
  await db.query("UPDATE ai_conversations SET updated_at = now() WHERE id = $1 AND user_id = $2", [conversationId, userId]);
}
export async function getContext(userId: string, conversationId: string): Promise<{ role: AiRole; content: string }[]> {
  const db = await getSql();
  const rows = await db.query<{ role: AiRole; content: string }>(
    "SELECT role, content FROM ai_messages WHERE conversation_id = $1 AND user_id = $2 ORDER BY created_at DESC, id DESC LIMIT 18", [conversationId, userId]);
  return rows.reverse();
}
export async function deleteConversation(userId: string, conversationId: string): Promise<boolean> {
  const db = await getSql();
  const rows = await db.query<{ id: string }>("DELETE FROM ai_conversations WHERE id = $1 AND user_id = $2 RETURNING id", [conversationId, userId]);
  return rows.length > 0;
}
/** A single atomic per-user quota shared across all serverless instances. */
export async function consumeAiQuota(userId: string): Promise<boolean> {
  const db = await getSql();
  const window = new Date(Math.floor(Date.now() / 60_000) * 60_000).toISOString();
  const limit = Math.min(20, Math.max(1, Number(process.env.PINAI_AI_RPM ?? "6") || 6));
  const rows = await db.query<{ request_count: number }>(
    "INSERT INTO ai_usage_windows (user_id, window_start, request_count) VALUES ($1, $2, 1) ON CONFLICT (user_id, window_start) DO UPDATE SET request_count = ai_usage_windows.request_count + 1 WHERE ai_usage_windows.request_count < $3 RETURNING request_count",
    [userId, window, limit]);
  return rows.length > 0;
}
