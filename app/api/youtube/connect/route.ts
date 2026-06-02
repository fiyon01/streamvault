import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { buildYouTubeAuthorizeUrl, hasYouTubeOAuthProvider } from '@/lib/youtube/oauth';

const STATE_COOKIE = 'streamvault_youtube_oauth_state';

export async function GET(req: Request) {
  if (!hasYouTubeOAuthProvider()) {
    return Response.redirect(new URL('/creators?youtube=not_configured', req.url));
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.redirect(new URL('/login?next=/creators', req.url));
  }

  const state = `${user.id}:${crypto.randomUUID()}`;
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10,
  });

  return Response.redirect(buildYouTubeAuthorizeUrl(req, state));
}
