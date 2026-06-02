import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ videoId: string }> },
) {
  const { videoId } = await params;
  const body = await req.json().catch(() => ({}));
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Sign in to track creator watch history.' }, { status: 401 });
  }

  const channelId = typeof body.channelId === 'string' ? body.channelId : null;
  if (!channelId) {
    return Response.json({ error: 'channelId is required.' }, { status: 400 });
  }

  const db = (() => {
    try {
      return createAdminClient();
    } catch {
      return supabase;
    }
  })();

  const { error } = await db
    .from('user_youtube_history')
    .upsert({
      user_id: user.id,
      video_id: videoId,
      channel_id: channelId,
      watch_duration_seconds: Number(body.watchDurationSeconds ?? 0),
      completed: Boolean(body.completed),
      rating: body.rating ? Number(body.rating) : null,
      hidden: Boolean(body.hidden),
      watched_at: new Date().toISOString(),
    }, { onConflict: 'user_id,video_id' });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ tracked: true });
}
