import { interpretOneShotQuery } from '@/lib/oneshot/intent-interpreter';
import { buildContentTypeCards } from '@/lib/oneshot/content-type-selector';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { rawQuery } = await req.json();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // Default mock profile if we can't fetch it
    let userProfile: any = {
      profile_summary: 'Loves high-octane action and dark thrillers.',
      primaryContentType: 'movie',
      hasAnimeHistory: true,
      hasCartoonHistory: true,
      hardBlockedGenres: []
    };

    try {
      const { data } = await supabase.from('user_taste_profiles').select('*').eq('user_id', userId).single();
      if (data) {
        userProfile = {
          ...userProfile,
          ...data,
          profile_summary: data.profile_summary || userProfile.profile_summary,
        };
      }
    } catch (e) {
      // Ignore if table not populated
    }

    // Step 1: Interpret Intent
    const parsedIntent = await interpretOneShotQuery(rawQuery, userProfile);

    // Step 2: Build Format Cards
    const contentTypeCards = buildContentTypeCards(userProfile, parsedIntent);

    // Step 3: Generate Session ID
    const sessionId = crypto.randomUUID();

    return Response.json({
      step: 'select_content_type',
      interpretation: `Looking for ${parsedIntent.themes.join(', ')}...`,
      contentTypeCards,
      sessionId
    });
  } catch (error: any) {
    console.error('OneShot Route Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
