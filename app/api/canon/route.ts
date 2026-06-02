import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();

  const { data: collections, error } = await supabase
    .from('streamvault_canon_collections')
    .select(`
      id,
      slug,
      title,
      description,
      lane,
      editorial_principle,
      sort_order,
      is_featured,
      streamvault_canon_collection_items (
        rank,
        curator_blurb,
        streamvault_canon_titles (
          id,
          tmdb_id,
          media_type,
          title,
          canon_lane,
          verdict_summary,
          why_it_matters,
          who_should_watch,
          who_should_skip_it,
          honest_warning,
          cultural_entry_point,
          ending_quality,
          quality_trajectory,
          gets_good_episode,
          rewatch_value,
          commitment_minutes,
          best_watched_context,
          curator_confidence
        )
      )
    `)
    .eq('is_featured', true)
    .order('sort_order', { ascending: true });

  if (error) {
    return NextResponse.json({ collections: [], error: error.message }, { status: 200 });
  }

  return NextResponse.json({ collections: collections ?? [] });
}
