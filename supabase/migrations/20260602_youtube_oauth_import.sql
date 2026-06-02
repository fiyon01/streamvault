-- YouTube OAuth import foundation.
-- Stores a user's connected YouTube account and imported subscriptions so Creator Hub can
-- become an unseen-first queue for creators the user already follows.

create table if not exists youtube_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  youtube_channel_id varchar(50),
  youtube_channel_title varchar(200),
  access_token text,
  refresh_token text,
  token_type varchar(30),
  scope text,
  expires_at timestamptz,
  connected_at timestamptz default now(),
  last_imported_at timestamptz,
  import_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists user_youtube_imported_channels (
  user_id uuid not null references auth.users(id) on delete cascade,
  channel_id varchar(50) not null,
  title varchar(200) not null,
  description text,
  thumbnail_url varchar(500),
  imported_at timestamptz default now(),
  is_followed boolean default true,
  primary key (user_id, channel_id)
);

create index if not exists idx_youtube_connections_last_imported
  on youtube_connections (last_imported_at desc);

create index if not exists idx_user_youtube_imported_channels_user
  on user_youtube_imported_channels (user_id, imported_at desc);

alter table youtube_connections enable row level security;
alter table user_youtube_imported_channels enable row level security;

drop policy if exists "users read own youtube connection" on youtube_connections;
create policy "users read own youtube connection" on youtube_connections
  for select using (auth.uid() = user_id);

drop policy if exists "users delete own youtube connection" on youtube_connections;
create policy "users delete own youtube connection" on youtube_connections
  for delete using (auth.uid() = user_id);

drop policy if exists "users read own imported youtube channels" on user_youtube_imported_channels;
create policy "users read own imported youtube channels" on user_youtube_imported_channels
  for select using (auth.uid() = user_id);

drop policy if exists "users delete own imported youtube channels" on user_youtube_imported_channels;
create policy "users delete own imported youtube channels" on user_youtube_imported_channels
  for delete using (auth.uid() = user_id);
