-- StreamVault Canon
-- TMDB is the identifier layer. The canon is StreamVault's editorial judgment.

create table if not exists streamvault_canon_titles (
  id uuid primary key default gen_random_uuid(),
  tmdb_id text not null,
  media_type text not null check (media_type in ('movie', 'tv', 'anime', 'cartoon', 'documentary')),
  title text not null,
  canon_lane text not null check (
    canon_lane in (
      'completed_series',
      'hidden_gem_international',
      'serious_anime',
      'short_commitment',
      'zero_bad_seasons',
      'first_episode_hooks',
      'comfort_films'
    )
  ),
  editorial_status text not null default 'draft'
    check (editorial_status in ('draft', 'reviewed', 'published', 'retired')),
  verdict_summary text not null,
  why_it_matters text,
  who_should_watch text,
  who_should_skip_it text,
  honest_warning text,
  cultural_entry_point text,
  ending_quality text check (ending_quality is null or ending_quality in ('satisfying', 'divisive', 'unresolved', 'open', 'ambiguous', 'not_applicable')),
  quality_trajectory text check (quality_trajectory is null or quality_trajectory in ('improves', 'consistent', 'declines', 'mixed', 'not_applicable')),
  gets_good_episode integer,
  rewatch_value numeric(3,2) default 0.5 check (rewatch_value >= 0 and rewatch_value <= 1),
  commitment_minutes integer,
  best_watched_context text[] default '{}',
  curator_confidence numeric(3,2) default 0.75 check (curator_confidence >= 0 and curator_confidence <= 1),
  source_quality text not null default 'human'
    check (source_quality in ('human', 'human_plus_ai', 'community_verified', 'ai_draft')),
  notes jsonb default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tmdb_id, media_type, canon_lane)
);

create index if not exists idx_streamvault_canon_lane
  on streamvault_canon_titles(canon_lane, editorial_status, curator_confidence desc);

create index if not exists idx_streamvault_canon_title_lookup
  on streamvault_canon_titles(tmdb_id, media_type);

create table if not exists streamvault_canon_collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  lane text not null,
  editorial_principle text not null,
  sort_order integer default 0,
  is_featured boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists streamvault_canon_collection_items (
  collection_id uuid not null references streamvault_canon_collections(id) on delete cascade,
  canon_title_id uuid not null references streamvault_canon_titles(id) on delete cascade,
  rank integer not null default 100,
  curator_blurb text,
  primary key (collection_id, canon_title_id)
);

insert into streamvault_canon_collections (slug, title, description, lane, editorial_principle, sort_order, is_featured)
values
  (
    'completed-series-worth-finishing',
    'Completed Series Worth Finishing',
    'Shows with proper endings, defensible commitments, and no hidden quality-collapse traps.',
    'completed_series',
    'If StreamVault says commit, the ending and journey have been judged honestly.',
    10,
    true
  ),
  (
    'hidden-gem-international',
    'Hidden-Gem International',
    'International films and shows that map to serious watcher taste but are buried by normal discovery.',
    'hidden_gem_international',
    'Foreign-language friction should be removed by context, not ignored.',
    20,
    true
  ),
  (
    'anime-for-serious-watchers',
    'Anime For Serious Watchers',
    'Anime and anime films for people who want strong endings, low filler, adult themes, and real craft.',
    'serious_anime',
    'The first anime recommendation must never be a lazy 500-episode obligation.',
    30,
    true
  )
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  lane = excluded.lane,
  editorial_principle = excluded.editorial_principle,
  sort_order = excluded.sort_order,
  is_featured = excluded.is_featured,
  updated_at = now();

alter table content_dna add column if not exists cultural_entry_point text;
alter table content_dna add column if not exists editorial_verdict text;
alter table content_dna add column if not exists canon_lane text;

