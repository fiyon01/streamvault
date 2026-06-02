-- Metadata enrichment cache columns used by VAULT's external source pipeline.
-- These keep source integrations runtime-safe even when only part of the source stack returns data.

alter table content_metadata add column if not exists status varchar(50);
alter table content_metadata add column if not exists has_free boolean default false;
alter table content_metadata add column if not exists availability_providers text[] default '{}';
alter table content_metadata add column if not exists external_metadata jsonb default '{}';
alter table content_metadata add column if not exists last_enriched_at timestamptz;

create index if not exists idx_content_metadata_last_enriched
  on content_metadata(last_enriched_at desc);
