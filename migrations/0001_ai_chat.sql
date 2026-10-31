-- PinAI private chat storage. Only enable on production with DATABASE_URL + real auth.
-- user_id is always obtained server-side from a verified Better Auth session.
CREATE TABLE IF NOT EXISTS ai_conversations (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_conversations_owner_updated_idx ON ai_conversations (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS ai_messages (
  id text PRIMARY KEY,
  conversation_id text NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_messages_owner_conversation_idx ON ai_messages (user_id, conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_usage_windows (
  user_id text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, window_start)
);