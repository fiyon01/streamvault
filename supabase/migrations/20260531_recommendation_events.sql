-- Recommendation analytics events for ranking calibration.
-- This records impressions, clicks, saves, skips, watch starts, trailer time,
-- and completions without overwriting stronger user_signals.

create table if not exists recommendation_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  anonymous_session_id text,
  tmdb_id text not null,
  media_type text not null check (media_type in ('movie', 'tv', 'anime')),
  event_type text not null,
  source text not null default 'unknown',
  row_type text,
  row_label text,
  position integer,
  recommendation_score numeric(8,5),
  watch_ms integer,
  completion_rate numeric(5,4),
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create index if not exists idx_recommendation_events_user_created
  on recommendation_events(user_id, created_at desc);

create index if not exists idx_recommendation_events_content
  on recommendation_events(tmdb_id, media_type, event_type);

create index if not exists idx_recommendation_events_source
  on recommendation_events(source, row_type, event_type);

alter table recommendation_events enable row level security;

drop policy if exists "Anyone can insert recommendation events" on recommendation_events;
create policy "Anyone can insert recommendation events"
  on recommendation_events
  for insert
  with check (true);

