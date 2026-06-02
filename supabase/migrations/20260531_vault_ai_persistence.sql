-- VAULT AI Persistence & Memory Overhaul

-- 1. Vault Sessions
-- Groups a conversation into a single thread.
CREATE TABLE IF NOT EXISTS vault_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT 'New Conversation',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Vault Messages
-- Individual messages inside a session.
CREATE TABLE IF NOT EXISTS vault_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID REFERENCES vault_sessions(id) ON DELETE CASCADE,
  role        VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Vault Long-Term Memory
-- Stores aggregated preferences, tastes, and learned context about the user.
CREATE TABLE IF NOT EXISTS vault_memory (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  learned_context  TEXT DEFAULT '',
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast retrieval
CREATE INDEX IF NOT EXISTS idx_vault_sessions_user_id ON vault_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_messages_session_id ON vault_messages(session_id);

-- Trigger to update session updated_at
CREATE OR REPLACE FUNCTION update_vault_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE vault_sessions SET updated_at = NOW() WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_vault_session_timestamp ON vault_messages;
CREATE TRIGGER trg_update_vault_session_timestamp
AFTER INSERT OR UPDATE ON vault_messages
FOR EACH ROW EXECUTE FUNCTION update_vault_session_timestamp();
