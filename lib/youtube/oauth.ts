import type { SupabaseClient } from '@supabase/supabase-js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const YT_BASE = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_READONLY_SCOPE = 'https://www.googleapis.com/auth/youtube.readonly';

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

type SubscriptionItem = {
  snippet?: {
    title?: string;
    description?: string;
    resourceId?: { channelId?: string };
    thumbnails?: {
      high?: { url?: string };
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
};

type ChannelItem = {
  id?: string;
  snippet?: {
    title?: string;
  };
};

export type ImportedYouTubeChannel = {
  channelId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
};

export function hasYouTubeOAuthProvider() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function youtubeRedirectUri(req: Request) {
  const configured = process.env.YOUTUBE_OAUTH_REDIRECT_URI;
  if (configured) return configured;

  const url = new URL(req.url);
  return `${url.origin}/api/youtube/callback`;
}

export function buildYouTubeAuthorizeUrl(req: Request, state: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? '',
    redirect_uri: youtubeRedirectUri(req),
    response_type: 'code',
    scope: YOUTUBE_READONLY_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params}`;
}

export async function exchangeYouTubeCode(code: string, redirectUri: string) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const data = await res.json() as TokenResponse;
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'YouTube token exchange failed.');
  }

  return data;
}

export async function refreshYouTubeAccessToken(refreshToken: string) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      grant_type: 'refresh_token',
    }),
  });

  const data = await res.json() as TokenResponse;
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Unable to refresh YouTube access token.');
  }

  return data;
}

export function tokenExpiry(expiresIn?: number) {
  const seconds = Math.max(Number(expiresIn ?? 3600) - 60, 60);
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export async function fetchMyYouTubeChannel(accessToken: string) {
  const params = new URLSearchParams({
    part: 'snippet',
    mine: 'true',
    maxResults: '1',
  });

  const res = await fetch(`${YT_BASE}/channels?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });

  if (!res.ok) return null;
  const data = await res.json() as { items?: ChannelItem[] };
  const channel = data.items?.[0];
  return channel?.id ? { id: channel.id, title: channel.snippet?.title ?? 'YouTube account' } : null;
}

export async function fetchYouTubeSubscriptions(accessToken: string, limit = 200): Promise<ImportedYouTubeChannel[]> {
  const channels: ImportedYouTubeChannel[] = [];
  let pageToken: string | undefined;

  while (channels.length < limit) {
    const params = new URLSearchParams({
      part: 'snippet',
      mine: 'true',
      maxResults: '50',
    });
    if (pageToken) params.set('pageToken', pageToken);

    const res = await fetch(`${YT_BASE}/subscriptions?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });

    const data = await res.json() as { items?: SubscriptionItem[]; nextPageToken?: string; error?: { message?: string } };
    if (!res.ok) {
      throw new Error(data.error?.message || 'Unable to import YouTube subscriptions.');
    }

    for (const item of data.items ?? []) {
      const channelId = item.snippet?.resourceId?.channelId;
      const title = item.snippet?.title;
      if (!channelId || !title) continue;
      channels.push({
        channelId,
        title,
        description: item.snippet?.description,
        thumbnailUrl: item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.medium?.url ?? item.snippet?.thumbnails?.default?.url,
      });
      if (channels.length >= limit) break;
    }

    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  return channels;
}

export async function importYouTubeSubscriptions(
  supabase: SupabaseClient,
  userId: string,
  accessToken: string,
  limit = 200,
) {
  const channels = await fetchYouTubeSubscriptions(accessToken, limit);
  if (!channels.length) return { imported: 0, channels };

  const creatorRows = channels.map((channel) => ({
    channel_id: channel.channelId,
    name: channel.title,
    description: channel.description ?? null,
    thumbnail_url: channel.thumbnailUrl ?? null,
    category: 'lifestyle',
    tags: ['youtube_import'],
    is_featured: false,
    is_canon: false,
    updated_at: new Date().toISOString(),
  }));

  const importedRows = channels.map((channel) => ({
    user_id: userId,
    channel_id: channel.channelId,
    title: channel.title,
    description: channel.description ?? null,
    thumbnail_url: channel.thumbnailUrl ?? null,
    imported_at: new Date().toISOString(),
    is_followed: true,
  }));

  const followRows = channels.map((channel) => ({
    user_id: userId,
    channel_id: channel.channelId,
    notification_enabled: true,
  }));

  const { error: creatorsError } = await supabase
    .from('youtube_creators')
    .upsert(creatorRows, { onConflict: 'channel_id' });
  if (creatorsError) throw creatorsError;

  const { error: importedError } = await supabase
    .from('user_youtube_imported_channels')
    .upsert(importedRows, { onConflict: 'user_id,channel_id' });
  if (importedError) throw importedError;

  const { error: followsError } = await supabase
    .from('user_creator_follows')
    .upsert(followRows, { onConflict: 'user_id,channel_id' });
  if (followsError) throw followsError;

  return { imported: channels.length, channels };
}
