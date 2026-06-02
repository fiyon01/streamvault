-- African Content + YouTube Creator Hub foundation.
-- TMDB remains the spine; these columns add local/canon signals and legal YouTube surfaces.

alter table content_metadata add column if not exists is_nollywood boolean default false;
alter table content_metadata add column if not exists nollywood_tier varchar(30);
alter table content_metadata add column if not exists nigerian_awards text[];
alter table content_metadata add column if not exists original_language_detail varchar(50);
alter table content_metadata add column if not exists production_company text[];

alter table content_metadata add column if not exists is_african_content boolean default false;
alter table content_metadata add column if not exists african_region varchar(30);
alter table content_metadata add column if not exists african_broadcaster varchar(100);
alter table content_metadata add column if not exists east_african_content boolean default false;
alter table content_metadata add column if not exists swahili_available boolean default false;
alter table content_metadata add column if not exists kenyan_broadcaster varchar(100);

alter table content_metadata add column if not exists is_comedy_special boolean default false;
alter table content_metadata add column if not exists comedian_name varchar(200);
alter table content_metadata add column if not exists comedy_origin_country varchar(5);

alter table content_metadata add column if not exists is_sports_content boolean default false;
alter table content_metadata add column if not exists sport_type varchar(50);
alter table content_metadata add column if not exists featured_team text[];
alter table content_metadata add column if not exists featured_league varchar(100);
alter table content_metadata add column if not exists sports_country varchar(5);

alter table content_metadata add column if not exists is_music_content boolean default false;
alter table content_metadata add column if not exists music_genre text[];
alter table content_metadata add column if not exists featured_artist text[];
alter table content_metadata add column if not exists spotify_artist_id varchar(50);
alter table content_metadata add column if not exists lastfm_artist_url varchar(200);

alter table content_metadata add column if not exists is_faith_content boolean default false;
alter table content_metadata add column if not exists faith_tradition varchar(50);
alter table content_metadata add column if not exists faith_content_rating varchar(20);

alter table content_metadata add column if not exists is_kids_content boolean default false;
alter table content_metadata add column if not exists kids_age_range varchar(20);
alter table content_metadata add column if not exists common_sense_rating integer;
alter table content_metadata add column if not exists educational_tags text[];

alter table content_metadata add column if not exists youtube_video_id varchar(20);
alter table content_metadata add column if not exists youtube_channel_id varchar(50);
alter table content_metadata add column if not exists is_youtube_content boolean default false;

create index if not exists idx_cm_is_nollywood on content_metadata (is_nollywood) where is_nollywood = true;
create index if not exists idx_cm_is_african on content_metadata (is_african_content) where is_african_content = true;
create index if not exists idx_cm_african_region on content_metadata (african_region) where african_region is not null;
create index if not exists idx_cm_is_kids on content_metadata (is_kids_content) where is_kids_content = true;
create index if not exists idx_cm_is_faith on content_metadata (is_faith_content) where is_faith_content = true;
create index if not exists idx_cm_is_sports on content_metadata (is_sports_content) where is_sports_content = true;
create index if not exists idx_cm_is_youtube on content_metadata (is_youtube_content) where is_youtube_content = true;
create index if not exists idx_cm_music_genre on content_metadata using gin (music_genre);
create index if not exists idx_cm_educational_tags on content_metadata using gin (educational_tags);
create index if not exists idx_cm_featured_artist on content_metadata using gin (featured_artist);
create index if not exists idx_cm_nollywood_tier on content_metadata (nollywood_tier) where nollywood_tier is not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'chk_african_region') then
    alter table content_metadata add constraint chk_african_region check (
      african_region is null or african_region in
      ('west_africa', 'east_africa', 'south_africa', 'north_africa', 'central_africa')
    );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chk_nollywood_tier') then
    alter table content_metadata add constraint chk_nollywood_tier check (
      nollywood_tier is null or nollywood_tier in
      ('new_nollywood', 'classic_nollywood', 'yoruba', 'hausa', 'igbo', 'diaspora')
    );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chk_faith_tradition') then
    alter table content_metadata add constraint chk_faith_tradition check (
      faith_tradition is null or faith_tradition in ('christian', 'islamic', 'interfaith')
    );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chk_kids_age_range') then
    alter table content_metadata add constraint chk_kids_age_range check (
      kids_age_range is null or kids_age_range in ('2-5', '6-9', '10-13', 'family')
    );
  end if;
end $$;

create table if not exists youtube_creators (
  id serial primary key,
  channel_id varchar(50) unique not null,
  name varchar(200) not null,
  description text,
  thumbnail_url varchar(500),
  country varchar(5),
  category varchar(50),
  tags text[],
  subscriber_count bigint,
  video_count integer,
  is_featured boolean default false,
  is_canon boolean default false,
  last_indexed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists youtube_videos (
  id serial primary key,
  video_id varchar(20) unique not null,
  channel_id varchar(50) references youtube_creators(channel_id) on delete cascade,
  title varchar(500) not null,
  description text,
  thumbnail_url varchar(500),
  published_at timestamptz,
  duration_seconds integer default 0,
  is_long_form boolean generated always as (duration_seconds > 600) stored,
  is_feature_length boolean generated always as (duration_seconds > 3600) stored,
  youtube_url varchar(200) not null,
  view_count bigint,
  like_count integer,
  tags text[],
  category varchar(50),
  streamvault_score numeric(4,3),
  is_curated boolean default false,
  created_at timestamptz default now(),
  indexed_at timestamptz default now()
);

create table if not exists user_youtube_history (
  id serial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id varchar(20) references youtube_videos(video_id) on delete cascade,
  channel_id varchar(50) references youtube_creators(channel_id) on delete cascade,
  watched_at timestamptz default now(),
  watch_duration_seconds integer default 0,
  completed boolean default false,
  rating integer check (rating is null or rating between 1 and 5),
  hidden boolean default false
);

create table if not exists user_creator_follows (
  user_id uuid not null references auth.users(id) on delete cascade,
  channel_id varchar(50) references youtube_creators(channel_id) on delete cascade,
  followed_at timestamptz default now(),
  notification_enabled boolean default true,
  primary key (user_id, channel_id)
);

create index if not exists idx_yt_videos_channel on youtube_videos (channel_id, published_at desc);
create index if not exists idx_yt_videos_long_form on youtube_videos (is_long_form, channel_id) where is_long_form = true;
create index if not exists idx_yt_videos_feature on youtube_videos (is_feature_length, channel_id) where is_feature_length = true;
create index if not exists idx_yt_videos_tags on youtube_videos using gin (tags);
create index if not exists idx_yt_creators_category on youtube_creators (category);
create index if not exists idx_yt_creators_country on youtube_creators (country);
create index if not exists idx_yt_history_user on user_youtube_history (user_id, watched_at desc);
create index if not exists idx_yt_history_video on user_youtube_history (user_id, video_id);
create unique index if not exists idx_yt_history_user_video_unique on user_youtube_history (user_id, video_id);

alter table youtube_creators enable row level security;
alter table youtube_videos enable row level security;
alter table user_youtube_history enable row level security;
alter table user_creator_follows enable row level security;

drop policy if exists "youtube creators are readable" on youtube_creators;
create policy "youtube creators are readable" on youtube_creators
  for select using (true);

drop policy if exists "youtube videos are readable" on youtube_videos;
create policy "youtube videos are readable" on youtube_videos
  for select using (true);

drop policy if exists "users manage own youtube history" on user_youtube_history;
create policy "users manage own youtube history" on user_youtube_history
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users manage own creator follows" on user_creator_follows;
create policy "users manage own creator follows" on user_creator_follows
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
