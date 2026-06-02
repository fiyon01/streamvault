-- ═══════════════════════════════════════════════════
-- STREAMVAULT ONE-SHOT ROBUSTNESS MIGRATION
-- Adds tables for tracking One-Shot sessions, suggestions, and preferences
-- ═══════════════════════════════════════════════════

-- Active session state
CREATE TABLE IF NOT EXISTS oneshot_active_sessions (
  session_id        VARCHAR(50) PRIMARY KEY,
  user_id           UUID REFERENCES auth.users(id),
  query             TEXT,
  parsed_intent     JSONB,
  content_type      VARCHAR(20),
  candidate_pool    TEXT[],    -- ordered array of content_ids
  current_index     INTEGER DEFAULT 0,
  skipped_fast      TEXT[] DEFAULT '{}',
  skipped_normal    TEXT[] DEFAULT '{}',
  expanded_details  TEXT[] DEFAULT '{}',
  pool_refreshed    BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  expires_at        TIMESTAMPTZ DEFAULT NOW() + INTERVAL '2 hours'
);

-- Track every One-Shot suggestion (prevents repetition)
CREATE TABLE IF NOT EXISTS oneshot_suggestion_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES auth.users(id),
  content_id      VARCHAR(50), -- TMDB or MAL ID
  query_context   TEXT,
  shown_at        TIMESTAMPTZ DEFAULT NOW(),
  was_watched     BOOLEAN DEFAULT false
);

-- Index for fast exclusion lookups
CREATE INDEX IF NOT EXISTS idx_oneshot_history_user_shown ON oneshot_suggestion_history (user_id, shown_at);

-- User's One-Shot preferences (remembered across sessions)
-- Since user_preferences might not exist, we'll create a lightweight table for it or alter it if it does
-- We'll just create a dedicated table for oneshot prefs to avoid conflicts with core auth
CREATE TABLE IF NOT EXISTS oneshot_user_preferences (
  user_id                 UUID PRIMARY KEY REFERENCES auth.users(id),
  preferred_type          VARCHAR(20),  -- most commonly selected content type
  last_type               VARCHAR(20),  -- last selected (for pre-highlighting)
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);
