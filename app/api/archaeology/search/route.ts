import { createClient } from '@/lib/supabase/server';
import { parseArchaeologyQuery, searchArchaeology } from '@/lib/archaeology/memory-engine';

export async function POST(req: Request) {
  try {
    const { rawQuery } = await req.json();
    if (!rawQuery) {
      return Response.json({ error: 'Missing query' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || 'anonymous';

    // Step 1: Parse the user's vague memory into clues using DeepSeek
    const clues = await parseArchaeologyQuery(rawQuery, userId);

    // Step 2: Search and rank matches
    const results = await searchArchaeology(clues, userId, 5);

    // Step 3: Save session
    if (userId !== 'anonymous') {
      supabase.from('archaeology_sessions').insert({
        user_id: userId,
        query: rawQuery,
        parsed_clues: clues,
        results: results.map(r => ({ contentId: r.tmdbId, score: r.matchScore }))
      }).then();
    }

    return Response.json({ success: true, clues, results });

  } catch (error: any) {
    console.error('Archaeology Search Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
