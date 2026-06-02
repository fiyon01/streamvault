-- VAULT cinematic memory and conversation metadata.
-- Keeps the existing vault_memory aggregate table for compatibility while adding
-- item-level memories and richer session/message metadata.

create table if not exists vault_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  memory text not null,
  category varchar(20) check (category in ('preference', 'restriction', 'fact', 'outcome', 'inferred')),
  confidence numeric(3,2) default 0.70,
  source varchar(20) default 'explicit',
  expires_at timestamptz null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table vault_sessions add column if not exists topic text;
alter table vault_sessions add column if not exists outcome text;
alter table vault_sessions add column if not exists message_count integer default 0;

alter table vault_messages add column if not exists content_refs text[] default '{}';
alter table vault_messages add column if not exists filter_activations jsonb default '[]';

create index if not exists idx_vault_memories_user_created on vault_memories(user_id, created_at desc);
create index if not exists idx_vault_memories_user_category on vault_memories(user_id, category);

alter table vault_memories enable row level security;

drop policy if exists "Users can manage own vault memories" on vault_memories;
create policy "Users can manage own vault memories"
on vault_memories
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
