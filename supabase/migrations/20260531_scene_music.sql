-- StreamVault Music Integration - Scene Identifiers

CREATE TABLE IF NOT EXISTS scene_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id VARCHAR(50) NOT NULL, -- TMDB ID or custom ID
  content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('movie', 'tv_episode')),
  timestamp_start INTEGER NOT NULL, -- in seconds
  timestamp_end INTEGER NOT NULL, -- in seconds
  song_title VARCHAR(255) NOT NULL,
  artist_name VARCHAR(255) NOT NULL,
  spotify_track_id VARCHAR(100),
  apple_music_url TEXT,
  contributed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified BOOLEAN DEFAULT false,
  upvotes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- ensure start < end
  CONSTRAINT valid_timestamp CHECK (timestamp_start < timestamp_end)
);

CREATE INDEX IF NOT EXISTS idx_scene_songs_content ON scene_songs(content_id, content_type);
CREATE INDEX IF NOT EXISTS idx_scene_songs_timestamp ON scene_songs(timestamp_start, timestamp_end);
