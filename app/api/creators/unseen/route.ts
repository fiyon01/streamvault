import { createClient } from '@/lib/supabase/server';
import { getUnseenAcrossFollowedCreators } from '@/lib/youtube/creators';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get('limit') ?? 30);
  const longFormOnly = url.searchParams.get('longFormOnly') !== 'false';

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Sign in to see unseen creator videos.' }, { status: 401 });
    }

    const videos = await getUnseenAcrossFollowedCreators(supabase, user.id, {
      limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 60) : 30,
      longFormOnly,
    });

    return Response.json({ videos });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to load creator catch-up' },
      { status: 500 },
    );
  }
}
