-- ═══════════════════════════════════════════════════
-- STREAMVAULT RECOMMENDATION ENGINE MIGRATION
-- This script creates the core tables and RPCs for the recommendation engine.
-- ═══════════════════════════════════════════════════

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- ═══════════════════════════════════════════════════
-- TASTE PROFILE SYSTEM
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_taste_profiles (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID REFERENCES auth.users(id) UNIQUE,

  -- Narrative DNA (0.0 to 1.0 affinity scores)
  narrative_structure   JSONB,
  pacing_preference     JSONB,
  protagonist_affinity  JSONB,
  moral_complexity      JSONB,
  tone_affinity         JSONB,
  world_type_affinity   JSONB,
  emotional_core_affinity JSONB,
  stakes_preference     JSONB,
  resolution_preference JSONB,

  -- Genre affinity (computed from ratings)
  genre_scores          JSONB,
  theme_scores          JSONB,

  -- Commitment patterns
  avg_completion_rate   DECIMAL(3,2),
  preferred_runtime_min INTEGER,
  preferred_runtime_max INTEGER,
  binge_tendency        DECIMAL(3,2),

  -- Quality bar
  min_quality_threshold DECIMAL(3,1),
  quality_sensitivity   DECIMAL(3,2),

  -- Anime-specific
  anime_format_pref     VARCHAR(10),
  anime_filler_tolerance DECIMAL(3,2),
  anime_demographic_pref JSONB,

  -- Anti-profile (what they dislike)
  hard_blocked_genres   TEXT[],
  hard_blocked_themes   TEXT[],
  soft_blocked_genres   TEXT[],
  fatigued_franchises   JSONB,

  -- Profile quality
  confidence_score      DECIMAL(3,2),
  data_points           INTEGER,
  last_computed         TIMESTAMPTZ,

  -- Human-readable summary
  profile_summary       TEXT,
  embedding             vector(384),

  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- INTERACTION SIGNALS
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_signals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES auth.users(id),
  tmdb_id         VARCHAR(50) NOT NULL,
  
  signal_type     VARCHAR(30) NOT NULL,
  signal_weight   DECIMAL(4,2),
  context         JSONB,

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- RECOMMENDATION CACHE
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS recommendation_cache (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES auth.users(id),

  rec_type        VARCHAR(40) NOT NULL,
  results         JSONB NOT NULL,
  mood_context    JSONB,
  expires_at      TIMESTAMPTZ,
  generated_at    TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, rec_type)
);

-- ═══════════════════════════════════════════════════
-- CONTENT DNA
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS content_dna (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tmdb_id               VARCHAR(50) UNIQUE NOT NULL,
  media_type            VARCHAR(10),

  narrative_structure   JSONB,
  pacing                JSONB,
  protagonist_type      JSONB,
  moral_complexity      JSONB,
  tone                  JSONB,
  world_type            JSONB,
  emotional_core        JSONB,
  stakes_level          JSONB,
  resolution_type       JSONB,

  themes                TEXT[],
  mood_tags             TEXT[],
  comparable_titles     JSONB,

  embedding             vector(384),

  critical_consensus    DECIMAL(3,2),
  audience_consensus    DECIMAL(3,2),
  divisiveness_score    DECIMAL(3,2),

  hook_strength         DECIMAL(3,2),
  momentum_score        DECIMAL(3,2),
  finale_satisfaction   DECIMAL(3,2),

  ai_generated          BOOLEAN DEFAULT false,
  generated_at          TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- TASTE CLUSTERS & MOOD SESSIONS
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS taste_clusters (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cluster_name    VARCHAR(100),
  centroid        JSONB,
  member_count    INTEGER,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_cluster_memberships (
  user_id         UUID REFERENCES auth.users(id),
  cluster_id      UUID REFERENCES taste_clusters(id),
  similarity      DECIMAL(3,2),
  PRIMARY KEY (user_id, cluster_id)
);

CREATE TABLE IF NOT EXISTS mood_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES auth.users(id),
  session_start   TIMESTAMPTZ DEFAULT NOW(),
  session_end     TIMESTAMPTZ,
  time_of_day     VARCHAR(15),
  day_type        VARCHAR(10),
  explicit_mood   TEXT,
  inferred_mood   TEXT,
  browsed         TEXT[],
  played          TEXT[],
  abandoned       TEXT[],
  one_shot_used   BOOLEAN DEFAULT false,
  session_quality VARCHAR(10)
);

-- ═══════════════════════════════════════════════════
-- STORED PROCEDURES (RPCs)
-- ═══════════════════════════════════════════════════

-- Dummy implementation of get_taste_dna_recommendations
-- In a real setup, this would use pgvector to find content matching the user's taste DNA embedding.
DROP FUNCTION IF EXISTS get_taste_dna_recommendations;
CREATE OR REPLACE FUNCTION get_taste_dna_recommendations(
  p_user_id UUID,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  tmdb_id VARCHAR,
  media_type VARCHAR,
  title VARCHAR,
  match_score FLOAT
) AS $$
BEGIN
  -- Dummy return for now, since we rely on the row-generator fallback anyway
  RETURN QUERY SELECT c.tmdb_id, c.media_type, 'Unknown Title'::VARCHAR, 0.95::FLOAT FROM content_dna c LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Dummy implementation of get_discovery_candidates
DROP FUNCTION IF EXISTS get_discovery_candidates;
CREATE OR REPLACE FUNCTION get_discovery_candidates(
  user_embedding vector,
  min_similarity FLOAT,
  max_similarity FLOAT,
  min_quality FLOAT,
  limit_num INT
)
RETURNS TABLE (
  tmdb_id VARCHAR,
  media_type VARCHAR,
  title VARCHAR,
  match_score FLOAT
) AS $$
BEGIN
  RETURN QUERY SELECT c.tmdb_id, c.media_type, 'Unknown Title'::VARCHAR, 0.5::FLOAT FROM content_dna c LIMIT limit_num;
END;
$$ LANGUAGE plpgsql;
