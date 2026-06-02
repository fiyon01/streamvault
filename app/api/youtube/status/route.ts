import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hasYouTubeOAuthProvider } from '@/lib/youtube/oauth';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({
      configured: hasYouTubeOAuthProvider(),
      connected: false,
      importedCount: 0,
    });
  }

  const db = (() => {
    try {
      return createAdminClient();
    } catch {
      return supabase;
    }
  })();

  const [{ data: connection }, { count }] = await Promise.all([
    db
      .from('youtube_connections')
      .select('youtube_channel_title,last_imported_at,import_count,connected_at')
      .eq('user_id', user.id)
      .maybeSingle(),
    db
      .from('user_youtube_imported_channels')
      .select('channel_id', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ]);

  return Response.json({
    configured: hasYouTubeOAuthProvider(),
    connected: Boolean(connection),
    channelTitle: connection?.youtube_channel_title ?? null,
    connectedAt: connection?.connected_at ?? null,
    lastImportedAt: connection?.last_imported_at ?? null,
    importCount: connection?.import_count ?? 0,
    importedCount: count ?? 0,
  });
}
