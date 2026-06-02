-- StreamVault Pinoy drama integration
-- Filipino teleseryes use TMDB metadata, official/free source links, live TV metadata, and universal playback.

alter table content
  add column if not exists is_pinoy_content boolean default false,
  add column if not exists pinoy_details jsonb default '{
    "content_kind": null,
    "primary_language": null,
    "english_access": {
      "dubbed": false,
      "subtitled": false,
      "notes": null
    },
    "official_sources": {
      "iwanttfc": null,
      "blasttv": null,
      "samsung_tv_plus": null
    }
  }'::jsonb;

create table if not exists pinoy_sources (
  id uuid primary key default gen_random_uuid(),
  content_id text references content(id) on delete cascade,
  source_name text not null,
  source_url text not null,
  source_type text not null default 'official',
  has_ads boolean default true,
  english_access text,
  last_checked_at timestamptz,
  created_at timestamptz default now(),
  unique(content_id, source_name)
);

create index if not exists idx_pinoy_sources_content
  on pinoy_sources(content_id, source_type);

alter table pinoy_sources enable row level security;

drop policy if exists "Pinoy sources are readable" on pinoy_sources;
create policy "Pinoy sources are readable"
  on pinoy_sources for select
  using (true);
