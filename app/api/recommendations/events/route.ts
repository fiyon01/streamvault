import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const VALID_EVENTS = new Set([
  'impression',
  'row_impression',
  'detail_click',
  'watch_start',
  'watch_progress',
  'completion',
  'save',
  'skip',
  'feedback_up',
  'feedback_down',
  'hide',
  'why_open',
  'trailer_start',
  'trailer_progress',
  'trailer_complete',
]);

function cleanNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const events = Array.isArray(body.events) ? body.events : [body];
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const rows = events
      .filter((event: any) => event && VALID_EVENTS.has(event.eventType || event.event_type))
      .map((event: any) => ({
        user_id: user?.id ?? null,
        anonymous_session_id: event.anonymousSessionId || event.anonymous_session_id || null,
        tmdb_id: String(event.tmdbId || event.tmdb_id || ''),
        media_type: event.mediaType || event.media_type || 'movie',
        event_type: event.eventType || event.event_type,
        source: event.source || 'unknown',
        row_type: event.rowType || event.row_type || null,
        row_label: event.rowLabel || event.row_label || null,
        position: Number.isInteger(event.position) ? event.position : null,
        recommendation_score: cleanNumber(event.recommendationScore ?? event.recommendation_score),
        watch_ms: Number.isInteger(event.watchMs ?? event.watch_ms) ? (event.watchMs ?? event.watch_ms) : null,
        completion_rate: cleanNumber(event.completionRate ?? event.completion_rate),
        metadata: event.metadata ?? {},
      }))
      .filter((event: any) => event.tmdb_id && ['movie', 'tv', 'anime'].includes(event.media_type));

    if (rows.length === 0) {
      return NextResponse.json({ received: false, inserted: 0 });
    }

    const { error } = await supabase.from('recommendation_events').insert(rows);
    if (error) {
      console.warn('[rec-events] insert skipped', error.message);
      return NextResponse.json({ received: true, inserted: 0, warning: error.message });
    }

    await syncWatchHistory(rows).catch((historyError) => {
      console.warn('[watch-history] sync skipped', historyError instanceof Error ? historyError.message : historyError);
    });

    return NextResponse.json({ received: true, inserted: rows.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function syncWatchHistory(rows: Array<{
  user_id: string | null;
  tmdb_id: string;
  media_type: string;
  event_type: string;
  watch_ms: number | null;
  completion_rate: number | null;
  metadata: Record<string, unknown>;
}>) {
  const watchRows = rows.filter((row) =>
    row.user_id &&
    ['watch_start', 'watch_progress', 'completion'].includes(row.event_type) &&
    ['movie', 'tv'].includes(row.media_type)
  );

  if (watchRows.length === 0) return;

  const admin = createAdminClient();

  for (const row of watchRows) {
    const contentType = row.media_type === 'tv' ? 'show' : 'movie';
    const title = typeof row.metadata?.title === 'string' && row.metadata.title.trim()
      ? row.metadata.title.trim()
      : `${contentType === 'show' ? 'TV' : 'Movie'} ${row.tmdb_id}`;

    await admin.from('profiles').upsert({ id: row.user_id }, { onConflict: 'id' });

    await admin.from('content').upsert({
      id: row.tmdb_id,
      type: contentType,
      title,
      overview: typeof row.metadata?.overview === 'string' ? row.metadata.overview : null,
      poster_path: typeof row.metadata?.posterPath === 'string' ? row.metadata.posterPath : null,
      backdrop_path: typeof row.metadata?.backdropPath === 'string' ? row.metadata.backdropPath : null,
      release_date: typeof row.metadata?.releaseDate === 'string' && row.metadata.releaseDate
        ? row.metadata.releaseDate
        : null,
      runtime: typeof row.metadata?.runtime === 'number' ? row.metadata.runtime : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    const existing = await admin
      .from('watch_history')
      .select('id, position_seconds, completed')
      .eq('user_id', row.user_id)
      .eq('content_id', row.tmdb_id)
      .is('episode_id', null)
      .maybeSingle();

    const positionSeconds = Math.max(
      existing.data?.position_seconds ?? 0,
      row.watch_ms ? Math.round(row.watch_ms / 1000) : 0
    );

    const payload = {
      user_id: row.user_id,
      content_id: row.tmdb_id,
      episode_id: null,
      position_seconds: positionSeconds,
      completed: Boolean(existing.data?.completed || row.event_type === 'completion' || (row.completion_rate ?? 0) >= 0.95),
      last_watched: new Date().toISOString(),
    };

    if (existing.data?.id) {
      await admin.from('watch_history').update(payload).eq('id', existing.data.id);
    } else {
      await admin.from('watch_history').insert(payload);
    }
  }
}
