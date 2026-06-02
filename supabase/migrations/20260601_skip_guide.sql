create table if not exists show_skip_guides (
  tmdb_id text primary key,
  guide_json jsonb not null default '[]',
  updated_at timestamptz default now()
);

create index if not exists idx_show_skip_guides_tmdb on show_skip_guides(tmdb_id);
