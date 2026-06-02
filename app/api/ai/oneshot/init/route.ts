import { interpretOneShotQuery } from '@/lib/oneshot/intent-interpreter';
import { buildCandidatePool } from '@/lib/oneshot/candidate-pool';
import { generateOneShotExplanation } from '@/lib/oneshot/explanation-generator';
import { handleZeroResults } from '@/lib/oneshot/fallback-handler';
import { createClient } from '@/lib/supabase/server';
import { ContentType } from '@/lib/oneshot/types';

function normalizeContentType(format: string | undefined, fallback: ContentType): ContentType {
  if (format === 'animated' || format === 'animation' || format === 'cartoons') return 'tv';
  if (format === 'anime') return 'anime';
  if (format === 'tv_show' || format === 'tv' || format === 'cartoon') return 'tv';
  if (format === 'movie') return 'movie';
  if (format === 'surprise') return fallback;
  return fallback;
}

export async function POST(req: Request) {
  try {
    const { query, format, sessionId } = await req.json();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || 'anonymous';

    // Get Taste Profile
    let userProfile: any = { profile_summary: 'General viewer', primaryContentType: format };
    if (userId !== 'anonymous') {
      const { data } = await supabase.from('user_taste_profiles').select('*').eq('user_id', userId).single();
      if (data) userProfile = { ...userProfile, ...data };
    }

    // Since we don't have the parsedIntent saved in the DB yet from step 1 (for stateless simplicity here),
    // we just re-interpret it quickly or rely on the query. In a production system, we'd fetch it from the DB via sessionId.
    const parsedIntent = await interpretOneShotQuery(query, userProfile);
    const contentType = normalizeContentType(format, parsedIntent.contentType);
    const wantsAnimation = ['cartoon', 'cartoons', 'animated', 'animation'].includes(format || '');
    if (wantsAnimation) {
      parsedIntent.themes = [...new Set([...(parsedIntent.themes || []), 'animation', 'cartoon'])];
      const searchText = `${parsedIntent.searchQuery || ''} ${query || ''}`.toLowerCase();
      if (!searchText.includes('animated') && !searchText.includes('cartoon') && !searchText.includes('animation')) {
        parsedIntent.searchQuery = `animated cartoon ${parsedIntent.searchQuery || query || 'comedy'}`.trim();
      }
    }

    // Build pool
    const pool = await buildCandidatePool(parsedIntent, contentType, userId, 20, userProfile);

    if (pool.length === 0) {
      const fallback = await handleZeroResults(parsedIntent);
      return Response.json({ step: 'fallback', fallback });
    }

    const firstPick = pool[0];
    const explanation = await generateOneShotExplanation(userId, firstPick, parsedIntent, userProfile);

    // Save session asynchronously (don't await)
    supabase.from('oneshot_active_sessions').insert({
      session_id: sessionId,
      user_id: userId !== 'anonymous' ? userId : null,
      query,
      parsed_intent: parsedIntent,
      content_type: contentType,
      candidate_pool: pool.map(c => c.id),
      current_index: 0
    }).then();

    supabase.from('oneshot_suggestion_history').insert({
      user_id: userId !== 'anonymous' ? userId : null,
      content_id: firstPick.id,
      query_context: query
    }).then();

    return Response.json({
      step: 'show_result',
      pick: firstPick,
      explanation,
      sessionId,
      poolSize: pool.length,
      currentIndex: 0,
      pool
    });
  } catch (error: any) {
    console.error('OneShot Init Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
