-- Enable pgvector for ultra-fast DNA matching
create extension if not exists vector;

-- 1. CONTENT DNA TABLE
-- Dimensions Order (0.0 to 1.0):
-- [1] Pacing, [2] Morality, [3] Tone, [4] Reality, [5] Focus, 
-- [6] Stakes, [7] Structure, [8] Texture, [9] Resolution
create table if not exists content_dna (
  tmdb_id text primary key,
  media_type text not null,
  title text,
  dna_vector vector(9),
  comfort_rewatchability boolean default false,
  raw_analysis text, -- The deep-dive explanation from DeepSeek
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2. USER SIGNALS TABLE
-- Records explicit and implicit actions
create table if not exists user_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  tmdb_id text references content_dna(tmdb_id) on delete cascade,
  signal_type text not null, -- 'watch', 'rewatch', 'hide', 'rate_up', 'rate_down'
  weight numeric not null, -- -10 to +10
  created_at timestamp with time zone default now()
);

-- Index for fast lookups per user
create index if not exists idx_user_signals_user_id on user_signals(user_id);

-- 3. USER TASTE DNA TABLE
-- The constantly evolving vector representing a user's exact taste
create table if not exists user_taste_dna (
  user_id uuid primary key references auth.users(id) on delete cascade,
  dna_vector vector(9),
  total_signal_weight numeric default 0,
  updated_at timestamp with time zone default now()
);

-- 4. TASTE CLUSTERS TABLE
-- Groupings of similar users for cluster-based "Trending" rows
create table if not exists taste_clusters (
  cluster_id uuid primary key default gen_random_uuid(),
  name text not null,
  core_dna vector(9),
  updated_at timestamp with time zone default now()
);

create table if not exists user_clusters (
  user_id uuid references auth.users(id) on delete cascade,
  cluster_id uuid references taste_clusters(cluster_id) on delete cascade,
  affinity_score numeric,
  primary key (user_id, cluster_id)
);

-- 5. MATCHING ALGORITHM (RPC)
-- Uses L2 distance (<->) to find the closest Content DNA to User Taste DNA
create or replace function get_content_recommendations(p_user_id uuid, p_limit int default 10)
returns table(tmdb_id text, media_type text, title text, comfort_rewatchability boolean, distance float8)
language plpgsql
security definer
as $$
declare
  v_user_dna vector(9);
begin
  -- Get user's taste vector
  select dna_vector into v_user_dna from user_taste_dna where user_id = p_user_id;
  
  if v_user_dna is null then
    return;
  end if;

  -- Return closest matching content that the user hasn't explicitly hidden (weight < 0)
  return query
  select 
    c.tmdb_id, 
    c.media_type, 
    c.title, 
    c.comfort_rewatchability, 
    c.dna_vector <-> v_user_dna as distance
  from content_dna c
  left join user_signals s on s.tmdb_id = c.tmdb_id and s.user_id = p_user_id and s.weight <= -5
  where s.id is null -- Exclude hidden/hated content
  order by c.dna_vector <-> v_user_dna asc
  limit p_limit;
end;
$$;

-- 6. RECALCULATE TASTE DNA FUNCTION
-- To be called after a new signal is inserted
create or replace function update_user_taste_dna(p_user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_new_dna vector(9);
  v_total_weight numeric;
begin
  -- Calculate weighted average of vectors
  -- For each dimension i, new_val = sum(weight * content_val_i) / sum(weight)
  -- Since pgvector doesn't natively support aggregate weighted average easily, 
  -- we can extract it or use a simplified approach:
  -- Actually, avg(vector) works in pgvector, but not weighted_avg.
  -- As a v1, we will handle the precise weighting calculation in the Next.js Server Action 
  -- and just run an UPDATE on user_taste_dna.
end;
$$;
