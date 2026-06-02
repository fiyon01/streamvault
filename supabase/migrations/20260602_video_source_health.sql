-- Video source health and playback-source learning.
-- Keeps the player clean-first while letting StreamVault learn which sources work.

create table if not exists video_sources_cache (
  id uuid primary key default gen_random_uuid(),
  content_id text not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  season_number integer not null default 0,
  episode_number integer not null default 0,
  source_name text not null,
  source_id text,
  source_url text not null,
  last_working timestamptz,
  last_attempted timestamptz default now(),
  success_count integer not null default 0,
  fail_count integer not null default 0,
  has_ads boolean not null default true,
  response_time_ms integer,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_id, media_type, season_number, episode_number, source_name)
);

create index if not exists idx_video_sources_cache_content
  on video_sources_cache(content_id, media_type, season_number, episode_number, last_working desc);

create index if not exists idx_video_sources_cache_source
  on video_sources_cache(source_name, last_attempted desc);

create table if not exists source_health (
  id uuid primary key default gen_random_uuid(),
  source_name text not null unique,
  source_id text,
  has_ads boolean not null default true,
  total_checks integer not null default 0,
  successful_checks integer not null default 0,
  failed_checks integer not null default 0,
  avg_response_time_ms integer,
  uptime_percentage numeric(5,2) not null default 100,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_check_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_source_health_uptime
  on source_health(uptime_percentage desc, avg_response_time_ms asc);

create table if not exists playback_source_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  anonymous_session_id text,
  content_id text not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  season_number integer not null default 0,
  episode_number integer not null default 0,
  source_name text not null,
  source_id text,
  source_url text,
  event_type text not null check (
    event_type in ('attempt', 'load', 'confirmed_working', 'timeout', 'error', 'manual_next', 'selected', 'reported_broken')
  ),
  response_time_ms integer,
  has_ads boolean not null default true,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_playback_source_events_content
  on playback_source_events(content_id, media_type, season_number, episode_number, created_at desc);

create index if not exists idx_playback_source_events_source
  on playback_source_events(source_name, event_type, created_at desc);

create index if not exists idx_playback_source_events_user
  on playback_source_events(user_id, created_at desc);

alter table video_sources_cache enable row level security;
alter table source_health enable row level security;
alter table playback_source_events enable row level security;

drop policy if exists "Users can read video source cache" on video_sources_cache;
create policy "Users can read video source cache"
  on video_sources_cache
  for select
  using (true);

drop policy if exists "Users can read source health" on source_health;
create policy "Users can read source health"
  on source_health
  for select
  using (true);

drop policy if exists "Users can insert playback source events" on playback_source_events;
create policy "Users can insert playback source events"
  on playback_source_events
  for insert
  with check (auth.uid() is null or user_id is null or auth.uid() = user_id);
