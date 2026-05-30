-- Run this in your Supabase SQL editor

-- ============================================
-- PROFILES (extends auth.users)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{
    "default_theme": "midnight",
    "autoplay_trailers": true,
    "autoplay_next_episode": true,
    "skip_intro_auto": true,
    "default_playback_rate": 1,
    "language": "en"
  }',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CONTENT CACHE (TMDB data)
-- ============================================
CREATE TABLE content (
  id TEXT PRIMARY KEY, -- TMDB ID
  type TEXT CHECK (type IN ('movie', 'tv')),
  title TEXT NOT NULL,
  overview TEXT,
  tagline TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  vote_average REAL,
  vote_count INTEGER,
  popularity REAL,
  release_date TEXT,
  runtime INTEGER, -- minutes (movies only)
  
  -- TV-specific metadata (stored as JSON)
  metadata JSONB DEFAULT '{
    "season_count": 0,
    "episode_count": 0,
    "status": "returning series",
    "is_completed": false,
    "seasons": []
  }',
  
  -- Enhanced metadata for filtering
  enhanced_metadata JSONB DEFAULT '{
    "season_ratings": [],
    "lowest_season_rating": 0,
    "highest_season_rating": 0,
    "avg_season_rating": 0,
    "finale_rating": 0,
    "pilot_rating": 0,
    "filler_percentage": 0,
    "total_hours": 0,
    "episodes_per_season_avg": 0,
    "genres": [],
    "content_rating": null,
    "year": null,
    "decade": null
  }',
  
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast filtering
CREATE INDEX idx_content_type ON content(type);
CREATE INDEX idx_content_vote_average ON content(vote_average);
CREATE INDEX idx_content_release_date ON content(release_date);
CREATE INDEX idx_content_metadata ON content USING gin(enhanced_metadata);

-- ============================================
-- WATCHLIST
-- ============================================
CREATE TABLE watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content_id TEXT REFERENCES content(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  UNIQUE(user_id, content_id)
);

CREATE INDEX idx_watchlist_user ON watchlist(user_id);

-- ============================================
-- WATCH HISTORY (for resume playback)
-- ============================================
CREATE TABLE watch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content_id TEXT REFERENCES content(id) ON DELETE CASCADE,
  season_number INTEGER DEFAULT 1,
  episode_number INTEGER DEFAULT 1,
  progress_seconds INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  completed BOOLEAN DEFAULT FALSE,
  last_watched TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  watch_count INTEGER DEFAULT 1,
  UNIQUE(user_id, content_id, season_number, episode_number)
);

CREATE INDEX idx_history_user ON watch_history(user_id);
CREATE INDEX idx_history_last_watched ON watch_history(last_watched DESC);

-- ============================================
-- RATINGS (1-10 scale)
-- ============================================
CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content_id TEXT REFERENCES content(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 10),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, content_id)
);

CREATE INDEX idx_ratings_user ON ratings(user_id);

-- ============================================
-- USER LISTS (custom playlists)
-- ============================================
CREATE TABLE user_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  cover_image TEXT,
  item_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID REFERENCES user_lists(id) ON DELETE CASCADE,
  content_id TEXT REFERENCES content(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  notes TEXT,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(list_id, content_id)
);

-- ============================================
-- FILTER PRESETS (saved searches)
-- ============================================
CREATE TABLE filter_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- AI CHAT HISTORY
-- ============================================
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content_id TEXT REFERENCES content(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- WAITLIST (for landing page)
-- ============================================
CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  referred_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Profiles: users can read/update their own
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Content: anyone can read (public)
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Content is readable by all" ON content FOR SELECT USING (true);

-- Watchlist: users own their data
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own watchlist" ON watchlist FOR ALL USING (auth.uid() = user_id);

-- Watch history: users own their data
ALTER TABLE watch_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own watch history" ON watch_history FOR ALL USING (auth.uid() = user_id);

-- Ratings: users own their ratings
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own ratings" ON ratings FOR ALL USING (auth.uid() = user_id);

-- User lists: users own their lists
ALTER TABLE user_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own lists" ON user_lists FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view public lists" ON user_lists FOR SELECT USING (is_public = true);

-- Filter presets: users own their presets
ALTER TABLE filter_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own presets" ON filter_presets FOR ALL USING (auth.uid() = user_id);

-- AI conversations: users own their chats
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own AI chats" ON ai_conversations FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_ratings_updated_at BEFORE UPDATE ON ratings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (NEW.id, split_part(NEW.email, '@', 1));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
