-- VAULT Intelligence Engine — Full Schema
-- Pilars 1-6 of the VAULT Intelligence Roadmap

-- ═══════════════════════════════════════════════════════════════════
-- PILLAR 3: Recommendation Log
-- ═══════════════════════════════════════════════════════════════════
create table if not exists recommendation_log (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  tmdb_id         text not null,
  media_type      text not null check (media_type in ('movie', 'tv', 'anime')),
  title           text,
  recommended_at  timestamptz not null default now(),
  context         text,            -- e.g. 'taste_dna', 'mood', 'hidden_gem', 'blind_spot'
  user_response   text default 'pending'
                    check (user_response in ('pending','watched','ignored','rejected','added_to_watchlist','not_interested')),
  rejection_reason text,
  metadata         jsonb default '{}',
  updated_at       timestamptz default now()
);

create index if not exists idx_rec_log_user_pending
  on recommendation_log(user_id, user_response, recommended_at desc);

-- ═══════════════════════════════════════════════════════════════════
-- PILLAR 1: Enhanced Content DNA (additional columns)
-- ═══════════════════════════════════════════════════════════════════
alter table content_dna add column if not exists
  pacing_profile             varchar(20),    -- 'slow_burn','balanced','relentless'
  complexity_level           varchar(20),    -- 'casual','moderate','demanding'
  emotional_weight           varchar(20),    -- 'heavy','balanced','light'
  narrative_arc              varchar(30),    -- 'episodic','serialized','anthology','hybrid','procedural'
  cultural_specificity       numeric(3,2),   -- 0.0 = universal, 1.0 = deeply local
  rewatchability_score       numeric(3,2),
  ending_quality             varchar(20),    -- 'satisfying','divisive','unresolved','open','ambiguous'
  quality_trajectory         varchar(20),    -- 'improves','consistent','declines','mixed'
  hidden_gem_score           numeric(3,2),   -- quality relative to popularity
  premiere_quality           numeric(3,2),   -- pilot / first-episode strength
  finale_quality             numeric(3,2),   -- series finale / final-act strength
  recommended_viewing_order  varchar(30),    -- 'release','chronological','skip_filler','any'
  target_audience            varchar(50),    -- 'adults','teens','family','mature','all_ages'
  series_type                varchar(20);    -- 'limited','ongoing','anthology','mini_series'

-- ═══════════════════════════════════════════════════════════════════
-- PILLAR 5: Expanded Taste DNA (additional profile columns)
-- ═══════════════════════════════════════════════════════════════════
alter table user_taste_profiles add column if not exists
  -- Structural preferences
  preferred_episode_length_min   integer default 0,
  preferred_episode_length_max   integer default 0,
  preferred_season_count_min     integer default 0,
  preferred_season_count_max     integer default 0,
  serialized_preference          numeric(3,2) default 0.5,  -- 0 = episodic, 1 = serialized
  completed_preference           numeric(3,2) default 0.5,  -- 0 = fine with ongoing, 1 = must be completed
  binge_tendency                 numeric(3,2) default 0.5,

  -- Tonal preferences
  dark_light_position            numeric(3,2) default 0.5,  -- 0 = light, 1 = dark
  cerebral_preference            numeric(3,2) default 0.5,
  emotional_tolerance            numeric(3,2) default 0.5,
  humor_style                    varchar(20),               -- 'none','light','dark','absurdist','wholesome'
  intensity_threshold            numeric(3,2) default 0.5,

  -- Origin preferences
  preferred_countries            text[] default '{}',
  preferred_decades              integer[] default '{}',
  preferred_networks             text[] default '{}',
  preferred_studios              text[] default '{}',
  sub_preference                 varchar(10) default 'either', -- 'sub','dub','either'
  language_comfort               text[] default '{}',

  -- Narrative patterns
  preferred_protagonist          varchar(30),               -- 'hero','antihero','ensemble','villain'
  avoided_themes                 text[] default '{}',
  preferred_ending_type          varchar(20),               -- 'satisfying','open','ambiguous','bittersweet'
  pacing_tolerance               numeric(3,2) default 0.5,  -- 0 = must be fast, 1 = patient

  -- Behavior patterns
  abandonment_rate               numeric(3,2) default 0,
  avg_episodes_before_abandon    integer default 10,
  slow_start_tolerance           boolean default true,
  rewatch_tendency               numeric(3,2) default 0,

  -- Power user flags
  total_titles_watched           integer default 0,
  coverage_score                 numeric(4,2) default 0,    -- 0-100% coverage of major categories
  is_power_user                  boolean default false,
  last_coverage_computed         timestamptz;

-- ═══════════════════════════════════════════════════════════════════
-- PILLAR 2: Blind Spot Analysis (coverage tracking)
-- ═══════════════════════════════════════════════════════════════════
create table if not exists user_coverage (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  dimension       text not null,           -- 'country','decade','genre','director','language','network','studio','animation_style'
  label           text not null,           -- e.g. 'US', '1990s', 'Crime', 'Christopher Nolan'
  covered         integer default 0,       -- titles watched in this category
  total_available integer default 0,       -- total titles in catalogue for this category
  coverage_pct    numeric(5,2) default 0,  -- percentage covered
  taste_affinity  numeric(3,2) default 0.5,-- how well this category matches user taste DNA
  last_updated    timestamptz default now(),
  unique(user_id, dimension, label)
);

create index if not exists idx_user_coverage_low
  on user_coverage(user_id, dimension, coverage_pct asc);

-- ═══════════════════════════════════════════════════════════════════
-- PILLAR 4: Long Tail Rankings
-- ═══════════════════════════════════════════════════════════════════
create table if not exists content_long_tail (
  tmdb_id           text primary key,
  media_type        text not null,
  quality_score     numeric(4,2) default 0,
  popularity_index  numeric(8,2) default 100000,
  long_tail_score   numeric(8,4) default 0,
  award_recognition numeric(3,2) default 0,
  critical_consensus numeric(3,2) default 0,
  hidden_gem_score  numeric(3,2) default 0,
  last_computed     timestamptz default now()
);

create index if not exists idx_long_tail_score
  on content_long_tail(long_tail_score desc);
