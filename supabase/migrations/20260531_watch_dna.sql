-- ═══════════════════════════════════════════════════
-- FEATURE 3 — WATCH DNA MATCH
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS watch_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_code    VARCHAR(8) UNIQUE NOT NULL,
  created_by      UUID REFERENCES auth.users(id),
  session_type    VARCHAR(10) DEFAULT 'group',
  -- 'couple' | 'group' | 'family'

  -- Participants (up to 6)
  participants    JSONB DEFAULT '[]',
  -- [{userId, name, joined, profileLoaded, guestToken?}]

  -- Preferences for this session
  content_type    VARCHAR(10) DEFAULT 'either',
  -- 'movie' | 'show' | 'either'
  runtime_max     INTEGER,
  mood_query      TEXT,

  -- Results
  intersection    JSONB,
  recommendations JSONB,
  selected_content VARCHAR(50) NULL,

  status          VARCHAR(10) DEFAULT 'waiting',
  -- 'waiting' | 'active' | 'decided' | 'watching' | 'expired'

  expires_at      TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Guest taste profiles (temporary, expires with session)
CREATE TABLE IF NOT EXISTS guest_taste_profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guest_token     VARCHAR(64) UNIQUE NOT NULL,
  session_id      UUID REFERENCES watch_sessions(id) ON DELETE CASCADE,
  quiz_answers    JSONB,
  computed_dna    JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
