import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { importYouTubeSubscriptions, refreshYouTubeAccessToken, tokenExpiry } from '@/lib/youtube/oauth';

export const maxDuration = 60;

type ConnectionRow = {
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
};

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Sign in to import YouTube subscriptions.' }, { status: 401 });
  }

  const db = (() => {
    try {
      return createAdminClient();
    } catch {
      return supabase;
    }
  })();

  const { data: connection, error } = await db
    .from('youtube_connections')
    .select('access_token,refresh_token,expires_at')
    .eq('user_id', user.id)
    .maybeSingle<ConnectionRow>();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!connection?.access_token && !connection?.refresh_token) {
    return Response.json({ error: 'Connect YouTube first.' }, { status: 400 });
  }

  try {
    let accessToken = connection.access_token ?? '';
    const expiresAt = connection.expires_at ? new Date(connection.expires_at).getTime() : 0;

    if (!accessToken || expiresAt < Date.now() + 60_000) {
      if (!connection.refresh_token) {
        return Response.json({ error: 'YouTube connection expired. Reconnect YouTube.' }, { status: 401 });
      }

      const refreshed = await refreshYouTubeAccessToken(connection.refresh_token);
      accessToken = refreshed.access_token ?? '';
      await db
        .from('youtube_connections')
        .update({
          access_token: accessToken,
          expires_at: tokenExpiry(refreshed.expires_in),
          token_type: refreshed.token_type ?? 'Bearer',
          scope: refreshed.scope ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
    }

    const result = await importYouTubeSubscriptions(db, user.id, accessToken);

    await db
      .from('youtube_connections')
      .update({
        last_imported_at: new Date().toISOString(),
        import_count: result.imported,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    return Response.json({ imported: result.imported });
  } catch (caught) {
    return Response.json(
      { error: caught instanceof Error ? caught.message : 'Unable to import YouTube subscriptions.' },
      { status: 500 },
    );
  }
}
