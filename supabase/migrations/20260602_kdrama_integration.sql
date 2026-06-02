-- StreamVault K-drama integration
-- K-drama uses TMDB metadata plus the universal StreamVault playback source rail.

alter table content
  add column if not exists is_kdrama boolean default false,
  add column if not exists kdrama_details jsonb default '{
    "original_title": null,
    "network": null,
    "episode_count": null,
    "air_dates": null,
    "rating_platforms": {
      "viki": null,
      "imdb": null,
      "mydramalist": null
    },
    "source_urls": {
      "viki": null,
      "kocowa": null,
      "youtube": null
    }
  }'::jsonb;

create table if not exists kdrama_sources (
  id uuid primary key default gen_random_uuid(),
  content_id text references content(id) on delete cascade,
  episode_number integer not null default 1,
  source_name text not null,
  source_url text not null,
  stream_url text,
  has_ads boolean default false,
  is_embeddable boolean default true,
  last_working timestamptz default now(),
  success_count integer default 1,
  fail_count integer default 0,
  created_at timestamptz default now(),
  unique(content_id, episode_number, source_name)
);

create index if not exists idx_kdrama_sources_content
  on kdrama_sources(content_id, episode_number, last_working desc);

create table if not exists user_kdrama_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  content_id text references content(id) on delete cascade,
  notes text,
  added_at timestamptz default now(),
  unique(user_id, content_id)
);

create index if not exists idx_user_kdrama_favorites_user
  on user_kdrama_favorites(user_id, added_at desc);

alter table kdrama_sources enable row level security;
alter table user_kdrama_favorites enable row level security;

drop policy if exists "K-drama sources are readable" on kdrama_sources;
create policy "K-drama sources are readable"
  on kdrama_sources for select
  using (true);

drop policy if exists "Users manage their K-drama favorites" on user_kdrama_favorites;
create policy "Users manage their K-drama favorites"
  on user_kdrama_favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
