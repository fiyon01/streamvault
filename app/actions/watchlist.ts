'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { tmdb } from '@/lib/tmdb/api';

type WatchlistInput = {
  tmdb_id: string;
  title: string;
  type: string;
  poster_path: string;
};

type WatchlistContent = {
  id: string;
  title: string | null;
  type: string | null;
  poster_path: string | null;
  release_date?: string | null;
  runtime?: number | null;
  tmdb_rating?: number | null;
};

type WatchlistRow = {
  id: string;
  content_id: string;
  added_at: string;
  content: WatchlistContent | WatchlistContent[] | null;
};

function normalizeContent(content: WatchlistRow['content']) {
  return Array.isArray(content) ? content[0] : content;
}

async function enrichMissingWatchlistContent(item: {
  id: string;
  tmdb_id: string;
  title: string;
  type: string;
  poster_path: string;
  release_date: string;
  runtime: number | null;
  rating: number;
  added_at: string;
}) {
  if (item.poster_path && item.rating && (item.type === 'tv' || item.runtime)) return item;

  try {
    const details = await tmdb.getDetails(item.type === 'tv' ? 'tv' : 'movie', item.tmdb_id);
    return {
      ...item,
      title: item.title !== 'Untitled' ? item.title : (details.title || details.name || item.title),
      poster_path: item.poster_path || details.poster_path || '',
      release_date: item.release_date || details.release_date || details.first_air_date || '',
      runtime: item.runtime || details.runtime || details.episode_run_time?.[0] || null,
      rating: item.rating || details.vote_average || 0,
    };
  } catch {
    return item;
  }
}

export async function getWatchlist() {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;

  if (!userId) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('watchlist')
    .select('id, content_id, added_at, content:content_id(id, title, type, poster_path, release_date, runtime, tmdb_rating)')
    .eq('user_id', userId)
    .order('added_at', { ascending: false });

  if (error) {
    console.error('Error fetching watchlist:', error);
    return [];
  }

  const normalized = ((data || []) as WatchlistRow[]).map((item) => {
    const content = normalizeContent(item.content);

    return {
      id: item.id,
      tmdb_id: item.content_id,
      title: content?.title || 'Untitled',
      type: content?.type === 'show' ? 'tv' : 'movie',
      poster_path: content?.poster_path || '',
      release_date: content?.release_date || '',
      runtime: content?.runtime || null,
      rating: content?.tmdb_rating || 0,
      added_at: item.added_at,
    };
  });

  return Promise.all(normalized.map(enrichMissingWatchlistContent));
}

export async function addToWatchlist(item: WatchlistInput) {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;

  if (!userId) {
    return { success: false, error: 'Please sign in to use your watchlist.' };
  }

  const admin = createAdminClient();
  const contentType = item.type === 'tv' ? 'show' : 'movie';

  await admin.from('profiles').upsert({ id: userId }, { onConflict: 'id' });

  const { error: contentError } = await admin
    .from('content')
    .upsert(
      {
        id: item.tmdb_id,
        title: item.title,
        type: contentType,
        poster_path: item.poster_path || null,
      },
      { onConflict: 'id' }
    );

  if (contentError) {
    console.error('Error saving watchlist content:', contentError);
    return { success: false, error: contentError.message };
  }

  // Upsert to avoid duplicate key errors
  const { error } = await admin
    .from('watchlist')
    .upsert(
      {
        user_id: userId,
        content_id: item.tmdb_id,
      },
      { onConflict: 'user_id,content_id', ignoreDuplicates: true }
    );

  if (error) {
    console.error('Error adding to watchlist:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function removeFromWatchlist(tmdbId: string) {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;

  if (!userId) {
    return { success: false, error: 'Please sign in to use your watchlist.' };
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from('watchlist')
    .delete()
    .eq('user_id', userId)
    .eq('content_id', tmdbId);

  if (error) {
    console.error('Error removing from watchlist:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function isInWatchlist(tmdbId: string): Promise<boolean> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;

  if (!userId) return false;

  const admin = createAdminClient();
  const { data } = await admin
    .from('watchlist')
    .select('id')
    .eq('user_id', userId)
    .eq('content_id', tmdbId)
    .maybeSingle();

  return !!data;
}
