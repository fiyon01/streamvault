-- First-session taste calibration.
-- Captures the 5 loved, 3 overrated, 1 abandoned framework as durable taste data.

create table if not exists user_taste_calibrations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  loved_titles text[] not null default '{}',
  overrated_titles text[] not null default '{}',
  abandoned_title text,
  abandoned_reason text,
  standards_summary text,
  completed_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_user_taste_calibrations_completed
  on user_taste_calibrations (completed_at desc);

alter table user_taste_calibrations enable row level security;

drop policy if exists "users read own taste calibration" on user_taste_calibrations;
create policy "users read own taste calibration" on user_taste_calibrations
  for select using (auth.uid() = user_id);

drop policy if exists "users upsert own taste calibration" on user_taste_calibrations;
create policy "users upsert own taste calibration" on user_taste_calibrations
  for insert with check (auth.uid() = user_id);

drop policy if exists "users update own taste calibration" on user_taste_calibrations;
create policy "users update own taste calibration" on user_taste_calibrations
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
