import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  exchangeYouTubeCode,
  fetchMyYouTubeChannel,
  importYouTubeSubscriptions,
  tokenExpiry,
  youtubeRedirectUri,
} from '@/lib/youtube/oauth';

const STATE_COOKIE = 'streamvault_youtube_oauth_state';

export const maxDuration = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return Response.redirect(new URL(`/creators?youtube=error&reason=${encodeURIComponent(error)}`, req.url));
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.redirect(new URL('/login?next=/creators', req.url));
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState || !state.startsWith(`${user.id}:`)) {
    return Response.redirect(new URL('/creators?youtube=state_failed', req.url));
  }

  try {
    const db = createAdminClient();
    const tokens = await exchangeYouTubeCode(code, youtubeRedirectUri(req));
    const channel = await fetchMyYouTubeChannel(tokens.access_token ?? '');

    const existing = await db
      .from('youtube_connections')
      .select('refresh_token')
      .eq('user_id', user.id)
      .maybeSingle();

    const refreshToken = tokens.refresh_token ?? existing.data?.refresh_token ?? null;

    await db.from('youtube_connections').upsert({
      user_id: user.id,
      youtube_channel_id: channel?.id ?? null,
      youtube_channel_title: channel?.title ?? null,
      access_token: tokens.access_token,
      refresh_token: refreshToken,
      token_type: tokens.token_type ?? 'Bearer',
      scope: tokens.scope ?? null,
      expires_at: tokenExpiry(tokens.expires_in),
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    const result = await importYouTubeSubscriptions(db, user.id, tokens.access_token ?? '');

    await db
      .from('youtube_connections')
      .update({
        last_imported_at: new Date().toISOString(),
        import_count: result.imported,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    return Response.redirect(new URL(`/creators?youtube=connected&imported=${result.imported}`, req.url));
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'YouTube connection failed.';
    return Response.redirect(new URL(`/creators?youtube=error&reason=${encodeURIComponent(message)}`, req.url));
  }
}
