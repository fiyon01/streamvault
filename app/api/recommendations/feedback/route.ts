import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { SIGNAL_WEIGHTS } from '@/lib/recommendations/types';

type FeedbackBody = {
  tmdbId?: unknown;
  mediaType?: unknown;
  feedback?: unknown;
  title?: unknown;
  source?: unknown;
};

const signalMap: Record<string, keyof typeof SIGNAL_WEIGHTS> = {
  perfect: 'thumbs_up',
  good: 'completed_rated',
  bad: 'thumbs_down',
  wrong_mood: 'one_shot_skipped',
  already_seen: 'completed_silent',
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Feedback failed';
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as FeedbackBody;
    const tmdbId = String(body.tmdbId ?? '').trim();
    const mediaType = body.mediaType === 'tv' || body.mediaType === 'movie' || body.mediaType === 'anime'
      ? body.mediaType
      : 'movie';
    const feedback = String(body.feedback ?? '').trim();
    const title = typeof body.title === 'string' ? body.title.trim() : null;
    const source = typeof body.source === 'string' ? body.source.trim() : 'recommendation_feedback';
    const signalType = signalMap[feedback];

    if (!tmdbId) return NextResponse.json({ error: 'Missing tmdbId' }, { status: 400 });
    if (!signalType) return NextResponse.json({ error: 'Invalid feedback' }, { status: 400 });

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await supabase.from('user_signals').insert({
      user_id: user.id, tmdb_id: String(tmdbId),
      signal_type: signalType,
      signal_weight: SIGNAL_WEIGHTS[signalType],
      context: { source, media_type: mediaType, feedback },
    });

    await supabase.from('recommendation_events').insert({
      user_id: user.id,
      tmdb_id: tmdbId,
      media_type: mediaType,
      event_type: feedback === 'perfect' || feedback === 'good' || feedback === 'already_seen'
        ? 'feedback_up'
        : 'feedback_down',
      source,
      metadata: { feedback, title },
    });

    await supabase
      .from('recommendation_log')
      .update({
        user_response: feedback === 'already_seen' ? 'watched' : feedback === 'wrong_mood' ? 'ignored' : feedback === 'bad' ? 'rejected' : 'watched',
        rejection_reason: feedback === 'wrong_mood' ? 'wrong_mood' : feedback === 'bad' ? 'not_for_me' : null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('tmdb_id', tmdbId)
      .eq('user_response', 'pending');

    if (feedback === 'already_seen' && mediaType !== 'anime') {
      const admin = createAdminClient();
      const contentType = mediaType === 'tv' ? 'show' : 'movie';

      await admin.from('profiles').upsert({ id: user.id }, { onConflict: 'id' });
      await admin.from('content').upsert({
        id: tmdbId,
        type: contentType,
        title: title || `${contentType === 'show' ? 'TV' : 'Movie'} ${tmdbId}`,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
      const existing = await admin
        .from('watch_history')
        .select('id')
        .eq('user_id', user.id)
        .eq('content_id', tmdbId)
        .is('episode_id', null)
        .maybeSingle();

      const historyPayload = {
        user_id: user.id,
        content_id: tmdbId,
        episode_id: null,
        position_seconds: 1,
        completed: true,
        last_watched: new Date().toISOString(),
      };

      if (existing.data?.id) {
        await admin.from('watch_history').update(historyPayload).eq('id', existing.data.id);
      } else {
        await admin.from('watch_history').insert(historyPayload);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
