'use server';

import { createClient } from '@/lib/supabase/server';
import { getOrCreateContentDNA } from '@/lib/recommendations/content-dna';
import { computeTasteDNA } from '@/lib/recommendations/taste-dna';

function normalizeSignal(signalType: string, weight: number) {
  if (signalType === 'rate_up') return { signalType: 'thumbs_up', weight: 5 };
  if (signalType === 'rate_down') return { signalType: 'thumbs_down', weight: -5 };
  if (signalType === 'hide') return { signalType: 'hide_forever', weight: -10 };
  return { signalType, weight };
}

export async function logUserSignal(
  tmdbId: string,
  mediaType: 'movie' | 'tv',
  rawSignalType: string,
  rawWeight: number
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, reason: 'anonymous' };
  }

  const { signalType, weight } = normalizeSignal(rawSignalType, rawWeight);
  const contentId = String(tmdbId);

  try {
    await getOrCreateContentDNA(contentId, mediaType);
  } catch (error) {
    console.error('Failed to extract DNA, but will still log signal', error);
  }

  const { data: existingSignal } = await supabase
    .from('user_signals')
    .select('id, signal_weight')
    .eq('user_id', user.id)
    .eq('tmdb_id', contentId)
    .single();

  if (existingSignal) {
    const newWeight = signalType === 'rewatch'
      ? Math.min(10, Number(existingSignal.signal_weight || 0) + weight)
      : weight;

    await supabase
      .from('user_signals')
      .update({
        signal_type: signalType,
        signal_weight: newWeight,
        context: { source: 'watch_page' },
      })
      .eq('id', existingSignal.id);
  } else {
    await supabase
      .from('user_signals')
      .insert({
        user_id: user.id,
        tmdb_id: contentId,
        signal_type: signalType,
        signal_weight: weight,
        context: { source: 'watch_page' },
      });
  }

  await supabase
    .from('recommendation_cache')
    .delete()
    .eq('user_id', user.id);

  computeTasteDNA(user.id).catch(console.error);

  return { success: true };
}

