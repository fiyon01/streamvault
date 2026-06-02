import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SIGNAL_WEIGHTS } from '@/lib/recommendations/types';
import { getOrCreateContentDNA } from '@/lib/recommendations/content-dna';
import { computeTasteDNA } from '@/lib/recommendations/taste-dna';

export async function POST(req: Request) {
  try {
    const { tmdbId, mediaType, signalType, context } = await req.json();
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const weight = SIGNAL_WEIGHTS[signalType];
    if (weight === undefined) return NextResponse.json({ error: 'Unknown signal type' }, { status: 400 });

    // Ensure content DNA exists
    await getOrCreateContentDNA(String(tmdbId), mediaType);

    // Upsert signal
    const { data: existing } = await supabase
      .from('user_signals')
      .select('id, signal_weight')
      .eq('user_id', user.id)
      .eq('tmdb_id', String(tmdbId))
      .single();

    if (existing) {
      let newWeight = weight;
      if (signalType === 'rewatch') newWeight = Math.min(10, existing.signal_weight + weight);
      await supabase.from('user_signals')
        .update({ signal_type: signalType, signal_weight: newWeight, context: context ?? {} })
        .eq('id', existing.id);
    } else {
      await supabase.from('user_signals').insert({
        user_id: user.id, tmdb_id: String(tmdbId),
        signal_type: signalType, signal_weight: weight,
        context: context ?? {},
      });
    }

    // Invalidate recommendation cache
    await supabase.from('recommendation_cache')
      .delete().eq('user_id', user.id).eq('rec_type', 'taste_dna');

    // Async profile recompute (fire and forget)
    computeTasteDNA(user.id).catch(console.error);

    return NextResponse.json({ received: true, weight });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
