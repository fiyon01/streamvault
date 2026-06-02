-- ═══════════════════════════════════════════════════
-- FEATURE 2 — VIEWING ARCHAEOLOGY
-- ═══════════════════════════════════════════════════

-- Archaeology search sessions
CREATE TABLE IF NOT EXISTS archaeology_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES auth.users(id),
  query           TEXT NOT NULL,         -- raw user description
  parsed_clues    JSONB,                 -- AI-extracted clues
  results         JSONB,                 -- ranked matches with scores
  selected_result VARCHAR(50) NULL,      -- TMDB/MAL ID of what they identified
  was_successful  BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Imported watch histories from other platforms
CREATE TABLE IF NOT EXISTS imported_histories (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES auth.users(id),
  platform        VARCHAR(20),    -- 'netflix' | 'prime' | 'hulu' | 'manual'
  raw_data        JSONB,          -- original CSV/JSON data
  processed       JSONB,          -- matched to StreamVault content IDs
  import_date     TIMESTAMPTZ DEFAULT NOW(),
  total_items     INTEGER,
  matched_items   INTEGER         -- how many we found in our DB
);
