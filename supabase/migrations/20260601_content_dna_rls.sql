-- content_dna is catalogue-level intelligence.
-- Users may read it, but only trusted server code should write to it.

alter table content_dna enable row level security;

drop policy if exists "Content DNA is readable by authenticated users" on content_dna;
create policy "Content DNA is readable by authenticated users"
  on content_dna
  for select
  to authenticated
  using (true);

drop policy if exists "Content DNA is readable by anon users" on content_dna;
create policy "Content DNA is readable by anon users"
  on content_dna
  for select
  to anon
  using (true);

-- No anon/authenticated insert/update/delete policy on purpose.
-- Server writes must use SUPABASE_SERVICE_ROLE_KEY through createAdminClient(),
-- which bypasses RLS in Supabase.

