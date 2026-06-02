import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateHomeRows } from '@/lib/recommendations/row-generator';

export async function POST(req: Request) {
  try {
    const { moodQuery } = await req.json();
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check cache first (taste_dna row: 6hr TTL)
    const { data: cached } = await supabase
      .from('recommendation_cache')
      .select('results, generated_at')
      .eq('user_id', user.id)
      .eq('rec_type', moodQuery ? 'mood' : 'taste_dna')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cached && !moodQuery) {
      return NextResponse.json({ rows: cached.results, cached: true });
    }

    const rows = await generateHomeRows(user.id, moodQuery);

    // Cache the result
    const ttlHours = moodQuery ? 0.5 : 6;
    await supabase.from('recommendation_cache').upsert({
      user_id:      user.id,
      rec_type:     moodQuery ? 'mood' : 'taste_dna',
      results:      rows,
      expires_at:   new Date(Date.now() + ttlHours * 3600_000).toISOString(),
    });

    return NextResponse.json({ rows, cached: false });
  } catch (e: any) {
    console.error('generate route error', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
