'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function recordWatchHistory(input: {
  tmdbId: string;
  mediaType: 'movie' | 'tv';
  title: string;
  overview?: string | null;
  posterPath?: string | null;
  backdropPath?: string | null;
  releaseDate?: string | null;
  runtime?: number | null;
  positionSeconds?: number;
  completed?: boolean;
}) {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;

  if (!userId) return { success: false, reason: 'anonymous' };

  const admin = createAdminClient();
  const contentType = input.mediaType === 'tv' ? 'show' : 'movie';

  await admin.from('profiles').upsert({ id: userId }, { onConflict: 'id' });

  const { error: contentError } = await admin.from('content').upsert({
    id: input.tmdbId,
    type: contentType,
    title: input.title || `${contentType === 'show' ? 'TV' : 'Movie'} ${input.tmdbId}`,
    overview: input.overview || null,
    poster_path: input.posterPath || null,
    backdrop_path: input.backdropPath || null,
    release_date: input.releaseDate || null,
    runtime: input.runtime || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });

  if (contentError) return { success: false, error: contentError.message };

  const { data: existing } = await admin
    .from('watch_history')
    .select('id, position_seconds, completed')
    .eq('user_id', userId)
    .eq('content_id', input.tmdbId)
    .is('episode_id', null)
    .maybeSingle();

  const positionSeconds = Math.max(
    Number(existing?.position_seconds ?? 0),
    Number(input.positionSeconds ?? 0)
  );

  const payload = {
    user_id: userId,
    content_id: input.tmdbId,
    episode_id: null,
    position_seconds: positionSeconds,
    completed: Boolean(existing?.completed || input.completed),
    last_watched: new Date().toISOString(),
  };

  const { error } = existing?.id
    ? await admin.from('watch_history').update(payload).eq('id', existing.id)
    : await admin.from('watch_history').insert(payload);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
