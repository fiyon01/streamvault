-- StreamVault Recommendation Engine — Full Schema v2
-- Run this in your Supabase SQL Editor AFTER the v1 migration.
-- Drops and recreates recommendation tables with the full spec.

-- ═══════════════════════════════════════════════════
-- EXTENSIONS
-- ═══════════════════════════════════════════════════
create extension if not exists vector;
create extension if not exists "uuid-ossp";

-- ═══════════════════════════════════════════════════
-- DROP OLD TABLES (clean slate for v2)
-- ═══════════════════════════════════════════════════
drop table if exists user_cluster_memberships cascade;
drop table if exists taste_clusters cascade;
drop table if exists user_taste_dna cascade;
drop table if exists user_signals cascade;
drop table if exists content_dna cascade;

-- ═══════════════════════════════════════════════════
-- CONTENT DNA
-- Richer per-content analysis by DeepSeek.
-- Uses tmdb_id as key since we don't have a local content table.
-- ═══════════════════════════════════════════════════
create table content_dna (
  tmdb_id               text primary key,
  media_type            text not null check (media_type in ('movie', 'tv')),
  title                 text,

  -- Narrative DNA (JSONB maps — each key 0.0 to 1.0)
  narrative_structure   jsonb default '{}',
  -- {"linear": 0.8, "nonlinear": 0.3, "anthology": 0.1, "episodic": 0.4, "serialized": 0.9}

  pacing                jsonb default '{}',
  -- {"slow_burn": 0.9, "moderate": 0.4, "fast": 0.2, "frenetic": 0.1}

  protagonist_type      jsonb default '{}',
  -- {"hero": 0.2, "antihero": 0.9, "villain_lead": 0.1, "ensemble": 0.7}

  moral_complexity      jsonb default '{}',
  -- {"black_white": 0.1, "grey": 0.95, "pitch_black": 0.5}

  tone                  jsonb default '{}',
  -- {"hopeful": 0.2, "cynical": 0.8, "darkly_comic": 0.7, "tragic": 0.5, "redemptive": 0.4}

  world_type            jsonb default '{}',
  -- {"real_world": 0.7, "heightened": 0.6, "full_fantasy": 0.1, "scifi": 0.2, "historical": 0.3}

  emotional_core        jsonb default '{}',
  -- {"found_family": 0.9, "revenge": 0.5, "survival": 0.4, "identity": 0.8, "power": 0.9, "love": 0.3}

  stakes_level          jsonb default '{}',
  -- {"personal": 0.6, "community": 0.8, "civilizational": 0.3}

  resolution_type       jsonb default '{}',
  -- {"satisfying": 0.3, "ambiguous": 0.8, "tragic": 0.5}

  -- AI-extracted arrays
  themes                text[] default '{}',
  -- ["found family", "institutional corruption", "moral decay"]

  mood_tags             text[] default '{}',
  -- ["intense", "slow_burn", "thought_provoking", "dark", "rewatchable"]

  -- Quality signals (0.0 to 1.0)
  hook_strength         numeric(3,2) default 0.5,
  momentum_score        numeric(3,2) default 0.5,
  finale_satisfaction   numeric(3,2) default 0.5,
  divisiveness_score    numeric(3,2) default 0.3,
  critical_consensus    numeric(3,2) default 0.5,
  audience_consensus    numeric(3,2) default 0.5,
  comfort_rewatchability boolean default false,

  -- HuggingFace semantic embedding (384-dim for sentence-transformers/all-MiniLM-L6-v2)
  embedding             vector(384),

  -- Raw analysis text from DeepSeek
  raw_analysis          text,

  ai_generated          boolean default false,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

create index if not exists content_dna_embedding_idx on content_dna
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ═══════════════════════════════════════════════════
-- USER TASTE PROFILES
-- The full psychological model of what a user loves.
-- ═══════════════════════════════════════════════════
create table user_taste_profiles (
  user_id               uuid primary key references auth.users(id) on delete cascade,

  -- Mirrors content_dna JSONB structure for direct comparison
  narrative_structure   jsonb default '{}',
  pacing_preference     jsonb default '{}',
  protagonist_affinity  jsonb default '{}',
  moral_complexity      jsonb default '{}',
  tone_affinity         jsonb default '{}',
  world_type_affinity   jsonb default '{}',
  emotional_core_affinity jsonb default '{}',
  stakes_preference     jsonb default '{}',
  resolution_preference jsonb default '{}',

  -- Computed genre & theme scores
  genre_scores          jsonb default '{}',
  -- {"Crime": 9.2, "Drama": 8.8, "Thriller": 8.5}
  theme_scores          jsonb default '{}',
  -- {"Found Family": 9.5, "Corruption": 9.0}

  -- Commitment & quality patterns
  avg_completion_rate   numeric(3,2) default 0.5,
  preferred_runtime_min integer default 20,
  preferred_runtime_max integer default 150,
  binge_tendency        numeric(3,2) default 0.5,
  min_quality_threshold numeric(3,1) default 6.5,
  quality_sensitivity   numeric(3,2) default 0.5,
  hook_sensitivity      numeric(3,2) default 0.5,

  -- Anime-specific
  anime_format_pref     text check (anime_format_pref in ('sub', 'dub', 'either')) default 'either',
  anime_filler_tolerance numeric(3,2) default 0.5,
  anime_demographic_pref jsonb default '{}',
  has_anime_history     boolean default false,

  -- Anti-profile
  hard_blocked_genres   text[] default '{}',
  hard_blocked_themes   text[] default '{}',
  soft_blocked_patterns jsonb default '[]',
  fatigued_franchises   jsonb default '[]',

  -- Semantic embedding (weighted avg of loved content embeddings)
  embedding             vector(384),

  -- Profile quality
  confidence_score      numeric(3,2) default 0.0,
  data_points           integer default 0,
  last_computed         timestamptz,

  -- Human-readable DeepSeek summary
  profile_summary       text default '',

  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

create index if not exists user_taste_profiles_embedding_idx on user_taste_profiles
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ═══════════════════════════════════════════════════
-- USER SIGNALS
-- The 14 weighted interaction signals.
-- ═══════════════════════════════════════════════════
create table user_signals (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  tmdb_id         text not null references content_dna(tmdb_id) on delete cascade,
  episode_tmdb_id text null,

  signal_type     text not null,
  -- Valid types (comment reference):
  -- POSITIVE: 'rewatch'(10) | 'completed_loved'(8) | 'completed_rated'(6)
  --           'completed_silent'(3) | 'watched_70pct'(2) | 'one_shot_watched'(5)
  --           'thumbs_up'(5) | 'added_watchlist'(1) | 'trailer_watched_full'(1)
  -- NEGATIVE: 'abandoned_early'(-4) | 'abandoned_mid'(-2) | 'thumbs_down'(-5)
  --           'not_for_me'(-6) | 'hide_forever'(-10) | 'one_shot_skipped_fast'(-3)
  --           'one_shot_skipped'(-1.5) | 'removed_watchlist'(-1)

  signal_weight   numeric(5,2) not null,
  context         jsonb default '{}',
  -- {"session_mood": "late_night", "watch_percentage": 0.67, "days_since_started": 3}

  created_at      timestamptz default now()
);

create index idx_user_signals_user_id on user_signals(user_id);
create index idx_user_signals_tmdb_id on user_signals(tmdb_id);
create index idx_user_signals_user_content on user_signals(user_id, tmdb_id);

-- ═══════════════════════════════════════════════════
-- RECOMMENDATION CACHE
-- Per-user, per-type cached results with TTLs.
-- ═══════════════════════════════════════════════════
create table recommendation_cache (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references auth.users(id) on delete cascade,
  rec_type        text not null,
  -- 'taste_dna'(6hr) | 'mood_*'(30min) | 'social_proof'(2hr) |
  -- 'hidden_gem'(12hr) | 'cold_start'(24hr) | 'post_finish'(2hr)
  results         jsonb not null default '[]',
  mood_context    jsonb default '{}',
  expires_at      timestamptz not null,
  generated_at    timestamptz default now(),
  unique(user_id, rec_type)
);

create index idx_rec_cache_user_type on recommendation_cache(user_id, rec_type);

-- ═══════════════════════════════════════════════════
-- TASTE CLUSTERS
-- Groups of users with similar DNA profiles.
-- ═══════════════════════════════════════════════════
create table taste_clusters (
  id              uuid primary key default uuid_generate_v4(),
  cluster_name    text,        -- e.g. "Dark Crime Slow-Burn Completionists"
  centroid        jsonb default '{}',
  centroid_embedding vector(384),
  member_count    integer default 0,
  updated_at      timestamptz default now()
);

create table user_cluster_memberships (
  user_id         uuid references auth.users(id) on delete cascade,
  cluster_id      uuid references taste_clusters(id) on delete cascade,
  similarity      numeric(3,2) default 0.0,
  is_primary      boolean default false,
  primary key (user_id, cluster_id)
);

-- ═══════════════════════════════════════════════════
-- MOOD SESSIONS
-- Tracks context at each viewing session.
-- ═══════════════════════════════════════════════════
create table mood_sessions (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references auth.users(id) on delete cascade,
  session_start   timestamptz default now(),
  session_end     timestamptz,
  time_of_day     text check (time_of_day in ('morning', 'afternoon', 'evening', 'late_night')),
  day_type        text check (day_type in ('weekday', 'weekend')),
  explicit_mood   text,
  inferred_mood   text,
  browsed         text[] default '{}',
  played          text[] default '{}',
  abandoned       text[] default '{}',
  one_shot_used   boolean default false,
  session_quality text check (session_quality in ('found', 'browsed_only', 'abandoned_all'))
);

create index idx_mood_sessions_user_id on mood_sessions(user_id);

-- ═══════════════════════════════════════════════════
-- ONBOARDING CALIBRATION
-- Stores responses from the cold-start taste calibration flow.
-- ═══════════════════════════════════════════════════
create table onboarding_responses (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade,
  tmdb_id     text not null,
  response    text not null check (response in ('love_it', 'seen_it', 'not_for_me', 'never_heard')),
  created_at  timestamptz default now(),
  unique(user_id, tmdb_id)
);

-- ═══════════════════════════════════════════════════
-- POSTGRES FUNCTIONS
-- ═══════════════════════════════════════════════════

-- Find content whose embedding is closest to a user's taste profile
create or replace function get_taste_dna_recommendations(
  p_user_id   uuid,
  p_limit     int default 20
)
returns table(
  tmdb_id               text,
  media_type            text,
  title                 text,
  mood_tags             text[],
  themes                text[],
  comfort_rewatchability boolean,
  cosine_distance       float8
)
language plpgsql security definer as $$
declare
  v_embedding vector(384);
begin
  select embedding into v_embedding
    from user_taste_profiles where user_id = p_user_id;
  if v_embedding is null then return; end if;

  return query
  select
    c.tmdb_id, c.media_type, c.title,
    c.mood_tags, c.themes, c.comfort_rewatchability,
    c.embedding <=> v_embedding as cosine_distance
  from content_dna c
  -- Exclude content the user has already hidden or rated down
  where not exists (
    select 1 from user_signals s
    where s.user_id = p_user_id
      and s.tmdb_id = c.tmdb_id
      and s.signal_weight <= -5
  )
  -- Must have an embedding
  and c.embedding is not null
  order by c.embedding <=> v_embedding asc
  limit p_limit;
end;
$$;

-- Find users similar to a given user (for social proof)
create or replace function get_similar_users(
  p_user_id   uuid,
  p_limit     int default 50
)
returns table(user_id uuid, cosine_distance float8)
language plpgsql security definer as $$
declare
  v_embedding vector(384);
begin
  select embedding into v_embedding
    from user_taste_profiles where user_id = p_user_id;
  if v_embedding is null then return; end if;

  return query
  select p.user_id, p.embedding <=> v_embedding as cosine_distance
  from user_taste_profiles p
  where p.user_id <> p_user_id
    and p.embedding is not null
    and p.confidence_score > 0.3
  order by p.embedding <=> v_embedding asc
  limit p_limit;
end;
$$;

-- Get what similar users loved (social proof)
create or replace function get_social_proof_recs(
  p_user_id   uuid,
  p_limit     int default 15
)
returns table(
  tmdb_id     text,
  media_type  text,
  title       text,
  avg_weight  float8,
  rater_count bigint
)
language plpgsql security definer as $$
begin
  return query
  with similar_users as (
    select su.user_id
    from get_similar_users(p_user_id, 100) su
    where su.cosine_distance < 0.4  -- only close matches (cosine dist < 0.4 = good similarity)
  ),
  loved_by_similar as (
    select s.tmdb_id, avg(s.signal_weight) as avg_weight, count(distinct s.user_id) as rater_count
    from user_signals s
    inner join similar_users su on su.user_id = s.user_id
    where s.signal_weight >= 5.0   -- only strong positive signals
    and s.tmdb_id not in (
      select tmdb_id from user_signals
      where user_id = p_user_id
    )
    group by s.tmdb_id
    having count(distinct s.user_id) >= 2
  )
  select l.tmdb_id, c.media_type, c.title, l.avg_weight, l.rater_count
  from loved_by_similar l
  join content_dna c on c.tmdb_id = l.tmdb_id
  order by l.avg_weight * ln(l.rater_count + 1) desc
  limit p_limit;
end;
$$;
