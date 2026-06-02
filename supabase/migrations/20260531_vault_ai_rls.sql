-- VAULT AI row-level security policies

ALTER TABLE vault_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own vault sessions" ON vault_sessions;
CREATE POLICY "Users can manage own vault sessions"
ON vault_sessions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own vault messages" ON vault_messages;
CREATE POLICY "Users can read own vault messages"
ON vault_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM vault_sessions
    WHERE vault_sessions.id = vault_messages.session_id
      AND vault_sessions.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can add own vault messages" ON vault_messages;
CREATE POLICY "Users can add own vault messages"
ON vault_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM vault_sessions
    WHERE vault_sessions.id = vault_messages.session_id
      AND vault_sessions.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can manage own vault memory" ON vault_memory;
CREATE POLICY "Users can manage own vault memory"
ON vault_memory
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
