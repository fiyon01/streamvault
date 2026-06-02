-- StreamVault MASTER SCHEMA

CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- PROFILES (extends auth.users)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  theme TEXT DEFAULT 'midnight',
  preferences JSONB DEFAULT '{
    "autoplay_trailers": true,
    "autoplay_next_episode": true,
    "skip_intro_auto": false,
    "default_playback_rate": 1,
    "language": "en"
  }',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CORE CONTENT TABLES
-- ============================================
CREATE TABLE content (
  id TEXT PRIMARY KEY, -- TMDB ID
  type TEXT CHECK (type IN ('movie', 'show')),
  title TEXT NOT NULL,
  overview TEXT,
  tagline TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  tmdb_rating REAL,
  tmdb_votes INTEGER,
  popularity REAL,
  release_date DATE,
  runtime INTEGER, -- minutes (movies only)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE seasons (
  id TEXT PRIMARY KEY, -- TMDB Season ID
  content_id TEXT REFERENCES content(id) ON DELETE CASCADE,
  season_number INTEGER NOT NULL,
  title TEXT,
  overview TEXT,
  poster_path TEXT,
  air_date DATE,
  episode_count INTEGER,
  tmdb_rating REAL,
  UNIQUE(content_id, season_number)
);

CREATE TABLE episodes (
  id TEXT PRIMARY KEY, -- TMDB Episode ID
  season_id TEXT REFERENCES seasons(id) ON DELETE CASCADE,
  content_id TEXT REFERENCES content(id) ON DELETE CASCADE,
  season_number INTEGER NOT NULL,
  episode_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  overview TEXT,
  still_path TEXT,
  air_date DATE,
  runtime INTEGER,
  tmdb_rating REAL,
  tmdb_votes INTEGER,
  UNIQUE(content_id, season_number, episode_number)
);

CREATE TABLE genres (
  id INTEGER PRIMARY KEY, -- TMDB Genre ID
  name TEXT NOT NULL
);

CREATE TABLE content_genres (
  content_id TEXT REFERENCES content(id) ON DELETE CASCADE,
  genre_id INTEGER REFERENCES genres(id) ON DELETE CASCADE,
  PRIMARY KEY (content_id, genre_id)
);

CREATE TABLE cast_members (
  id TEXT PRIMARY KEY, -- TMDB Person ID
  name TEXT NOT NULL,
  profile_path TEXT
);

CREATE TABLE content_cast (
  content_id TEXT REFERENCES content(id) ON DELETE CASCADE,
  cast_id TEXT REFERENCES cast_members(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  character_name TEXT,
  order_index INTEGER,
  PRIMARY KEY (content_id, cast_id, role)
);

-- ============================================
-- FILTERING & METADATA (The Crown Jewel)
-- ============================================
CREATE TABLE content_metadata (
  content_id TEXT PRIMARY KEY REFERENCES content(id) ON DELETE CASCADE,
  season_count INTEGER DEFAULT 0,
  episode_count_per_season JSONB DEFAULT '[]',
  avg_episode_rating REAL,
  lowest_season_rating REAL,
  finale_rating REAL,
  pilot_rating REAL,
  has_filler BOOLEAN DEFAULT FALSE,
  is_completed BOOLEAN DEFAULT FALSE,
  avg_runtime_minutes INTEGER,
  content_rating TEXT, -- PG, R, TV-MA, etc.
  decade INTEGER,
  country_of_origin TEXT[],
  themes TEXT[], -- AI generated tags
  moods TEXT[], -- AI powered
  total_commitment_hours REAL,
  bingeability_score REAL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- USER INTERACTION TABLES
-- ============================================
CREATE TABLE watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content_id TEXT REFERENCES content(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, content_id)
);

CREATE TABLE watch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content_id TEXT REFERENCES content(id) ON DELETE CASCADE,
  episode_id TEXT REFERENCES episodes(id) ON DELETE CASCADE, -- null for movies
  position_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  last_watched TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, content_id, episode_id)
);

CREATE TABLE continue_watching (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content_id TEXT REFERENCES content(id) ON DELETE CASCADE,
  last_episode_id TEXT REFERENCES episodes(id) ON DELETE CASCADE,
  position_seconds INTEGER DEFAULT 0,
  last_watched TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, content_id)
);

CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content_id TEXT REFERENCES content(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, content_id)
);

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content_id TEXT REFERENCES content(id) ON DELETE CASCADE,
  review_text TEXT NOT NULL,
  helpful_votes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- AI TABLES
-- ============================================
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content_id TEXT REFERENCES content(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  recommended_content JSONB NOT NULL, -- Array of objects with reasoning
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE search_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id TEXT REFERENCES content(id) ON DELETE CASCADE,
  embedding vector(384), -- Using all-MiniLM-L6-v2 which outputs 384d
  text_chunk TEXT
);

-- ============================================
-- SOCIAL & LISTS
-- ============================================
CREATE TABLE follows (
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

CREATE TABLE user_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE list_items (
  list_id UUID REFERENCES user_lists(id) ON DELETE CASCADE,
  content_id TEXT REFERENCES content(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (list_id, content_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_content_tmdb_rating ON content(tmdb_rating);
CREATE INDEX idx_content_popularity ON content(popularity);
CREATE INDEX idx_watch_history_user ON watch_history(user_id, last_watched DESC);
CREATE INDEX idx_search_embeddings ON search_embeddings USING ivfflat (embedding vector_cosine_ops);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
-- (Skipping detailed RLS statements for brevity, assuming standard auth.uid() checks)
