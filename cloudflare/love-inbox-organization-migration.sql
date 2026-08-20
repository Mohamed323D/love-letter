-- Run this once in the Cloudflare D1 Console for the existing love-inbox-messages database.
CREATE TABLE IF NOT EXISTS message_state (
  message_id TEXT PRIMARY KEY,
  is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1)),
  archived_at TEXT
);

CREATE INDEX IF NOT EXISTS message_state_by_archived ON message_state(is_archived, archived_at DESC);
