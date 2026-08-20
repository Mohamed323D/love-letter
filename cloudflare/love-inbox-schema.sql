-- Love Inbox data model. Run this once in Cloudflare D1's SQL console.
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  sender_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1))
);

CREATE INDEX IF NOT EXISTS messages_by_created_at ON messages(created_at DESC);

CREATE TABLE IF NOT EXISTS message_state (
  message_id TEXT PRIMARY KEY,
  is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1)),
  archived_at TEXT
);

CREATE INDEX IF NOT EXISTS message_state_by_archived ON message_state(is_archived, archived_at DESC);
