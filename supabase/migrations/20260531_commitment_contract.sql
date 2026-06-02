-- ═══════════════════════════════════════════════════
-- FEATURE 1 — THE COMMITMENT CONTRACT
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS viewing_contracts (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID REFERENCES auth.users(id),
  content_id          VARCHAR(50), -- TMDB/MAL ID since content might not be in our DB yet

  -- Contract type
  mode                VARCHAR(10) NOT NULL,
  -- 'casual' | 'committed' | 'binge'

  -- Watching schedule (for committed mode)
  watch_days          TEXT[],          -- ['thursday', 'saturday']
  watch_time_start    TIME,            -- 20:00 (8PM)
  watch_time_end      TIME,            -- 23:00 (11PM)
  timezone            VARCHAR(50),     -- 'Africa/Nairobi'

  -- Binge plan (for binge mode)
  binge_start_date    DATE,
  binge_end_date      DATE,
  binge_plan          JSONB,

  -- Progress tracking
  episodes_watched    INTEGER DEFAULT 0,
  last_watched_at     TIMESTAMPTZ,
  on_track            BOOLEAN DEFAULT true,
  streak_days         INTEGER DEFAULT 0,

  -- Notification state
  last_nudge_sent     TIMESTAMPTZ,
  nudge_count         INTEGER DEFAULT 0,
  nudge_paused_until  TIMESTAMPTZ,    -- user can snooze nudges

  -- Status
  status              VARCHAR(15) DEFAULT 'active',
  -- 'active' | 'completed' | 'abandoned' | 'paused'

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, content_id)
);

-- Natural break points per episode (AI-computed)
CREATE TABLE IF NOT EXISTS episode_break_points (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id      VARCHAR(50),
  season_number   INTEGER,
  episode_number  INTEGER,
  break_type      VARCHAR(20),
  break_score     DECIMAL(3,2),  -- 0=terrible stopping point, 1=perfect
  break_note      TEXT,
  ai_generated    BOOLEAN DEFAULT true,
  generated_at    TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(content_id, season_number, episode_number)
);

-- User watch schedule (learned over time)
CREATE TABLE IF NOT EXISTS user_watch_schedules (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES auth.users(id) UNIQUE,
  schedule        JSONB,
  confidence      DECIMAL(3,2),   -- 0=guessing, 1=well established pattern
  data_points     INTEGER,        -- number of sessions used to compute
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
