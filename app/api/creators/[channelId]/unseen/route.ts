import { createClient } from '@/lib/supabase/server';
import { getUnseenVideosFromCreator } from '@/lib/youtube/creators';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ channelId: string }> },
) {
  const { channelId } = await params;
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get('limit') ?? 20);
  const longFormOnly = url.searchParams.get('longFormOnly') === 'true';

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Sign in to see unseen creator videos.' }, { status: 401 });
    }

    const videos = await getUnseenVideosFromCreator(supabase, user.id, channelId, {
      limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 50) : 20,
      longFormOnly,
    });

    return Response.json({ videos });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to load unseen videos' },
      { status: 500 },
    );
  }
}
