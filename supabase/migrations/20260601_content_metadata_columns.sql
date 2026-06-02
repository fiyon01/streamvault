-- Content Metadata - missing columns for the Advanced Filter Engine.
-- Postgres requires ADD COLUMN IF NOT EXISTS per column.

alter table content_metadata add column if not exists min_episodes_per_season integer;
alter table content_metadata add column if not exists max_episodes_per_season integer;
alter table content_metadata add column if not exists avg_episodes_per_season numeric(4,1);
alter table content_metadata add column if not exists total_episode_count integer;
alter table content_metadata add column if not exists avg_episode_runtime integer;
alter table content_metadata add column if not exists total_runtime_hours numeric(6,1);
alter table content_metadata add column if not exists min_season_score numeric(3,1);
alter table content_metadata add column if not exists max_season_score numeric(3,1);
alter table content_metadata add column if not exists quality_trajectory varchar(10);
alter table content_metadata add column if not exists is_airing boolean default false;
alter table content_metadata add column if not exists is_cancelled boolean default false;
alter table content_metadata add column if not exists is_renewed boolean default false;
alter table content_metadata add column if not exists network varchar(100);
alter table content_metadata add column if not exists has_dub boolean default false;
alter table content_metadata add column if not exists has_sub boolean default true;
alter table content_metadata add column if not exists dub_languages text[];
alter table content_metadata add column if not exists sub_languages text[];
alter table content_metadata add column if not exists filler_percentage integer default 0;
alter table content_metadata add column if not exists anime_source varchar(30);
alter table content_metadata add column if not exists studio text[];
alter table content_metadata add column if not exists demographic varchar(20);
alter table content_metadata add column if not exists content_subtype varchar(30);
