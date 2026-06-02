import type { SupabaseClient } from '@supabase/supabase-js';
import { CREATOR_CATALOGUE } from './creator-catalogue';
import type { CreatorSeed, YouTubeCreator, YouTubeVideo } from './types';

type CreatorRow = {
  channel_id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  country: string | null;
  category: string | null;
  tags: string[] | null;
  subscriber_count: number | null;
  video_count: number | null;
  is_featured: boolean | null;
  is_canon: boolean | null;
};

type VideoRow = {
  video_id: string;
  channel_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
  duration_seconds: number | null;
  youtube_url: string;
  view_count: number | null;
  like_count: number | null;
  tags: string[] | null;
  category: string | null;
  streamvault_score: number | null;
  is_curated: boolean | null;
  youtube_creators?: Pick<CreatorRow, 'name' | 'thumbnail_url' | 'category'> | Array<Pick<CreatorRow, 'name' | 'thumbnail_url' | 'category'>> | null;
};

export async function seedCreatorCatalogue(supabase: SupabaseClient) {
  const rows = CREATOR_CATALOGUE.map(seedToRow);
  const { error } = await supabase
    .from('youtube_creators')
    .upsert(rows, { onConflict: 'channel_id' });

  if (error) throw error;
  return rows.length;
}

export async function listCreators(
  supabase: SupabaseClient,
  options: { category?: string; country?: string; limit?: number } = {},
): Promise<YouTubeCreator[]> {
  let query = supabase
    .from('youtube_creators')
    .select('channel_id,name,description,thumbnail_url,country,category,tags,subscriber_count,video_count,is_featured,is_canon')
    .order('is_canon', { ascending: false })
    .order('is_featured', { ascending: false })
    .order('name', { ascending: true })
    .limit(options.limit ?? 60);

  if (options.category) query = query.eq('category', options.category);
  if (options.country) query = query.eq('country', options.country);

  const { data, error } = await query;
  if (error) throw error;
  return (data as CreatorRow[] | null ?? []).map(mapCreator);
}

export async function getCreatorByChannelId(
  supabase: SupabaseClient,
  channelId: string,
): Promise<YouTubeCreator | null> {
  const { data, error } = await supabase
    .from('youtube_creators')
    .select('channel_id,name,description,thumbnail_url,country,category,tags,subscriber_count,video_count,is_featured,is_canon')
    .eq('channel_id', channelId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapCreator(data as CreatorRow) : null;
}

export async function getCreatorVideos(
  supabase: SupabaseClient,
  channelId: string,
  options: { limit?: number; longFormOnly?: boolean } = {},
): Promise<YouTubeVideo[]> {
  let query = supabase
    .from('youtube_videos')
    .select('video_id,channel_id,title,description,thumbnail_url,published_at,duration_seconds,youtube_url,view_count,like_count,tags,category,streamvault_score,is_curated')
    .eq('channel_id', channelId)
    .order('is_curated', { ascending: false })
    .order('streamvault_score', { ascending: false, nullsFirst: false })
    .order('published_at', { ascending: false })
    .limit(options.limit ?? 100);

  if (options.longFormOnly) query = query.eq('is_long_form', true);

  const { data, error } = await query;
  if (error) throw error;
  return (data as VideoRow[] | null ?? []).map(mapVideo);
}

export async function getUnseenVideosFromCreator(
  supabase: SupabaseClient,
  userId: string,
  channelId: string,
  options: { limit?: number; longFormOnly?: boolean } = {},
): Promise<YouTubeVideo[]> {
  const { data: watched } = await supabase
    .from('user_youtube_history')
    .select('video_id')
    .eq('user_id', userId)
    .eq('channel_id', channelId)
    .or('completed.eq.true,watch_duration_seconds.gt.60');

  const watchedIds = (watched as Array<{ video_id: string }> | null ?? []).map((row) => row.video_id);

  let query = supabase
    .from('youtube_videos')
    .select('video_id,channel_id,title,description,thumbnail_url,published_at,duration_seconds,youtube_url,view_count,like_count,tags,category,streamvault_score,is_curated')
    .eq('channel_id', channelId)
    .order('is_curated', { ascending: false })
    .order('streamvault_score', { ascending: false, nullsFirst: false })
    .order('view_count', { ascending: false, nullsFirst: false })
    .order('published_at', { ascending: false })
    .limit(options.limit ?? 20);

  if (watchedIds.length) query = query.not('video_id', 'in', `(${watchedIds.map(quoteForPostgrest).join(',')})`);
  if (options.longFormOnly) query = query.eq('is_long_form', true);

  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as VideoRow[] | null ?? []).map(mapVideo);
}

export async function getUnseenAcrossFollowedCreators(
  supabase: SupabaseClient,
  userId: string,
  options: { limit?: number; longFormOnly?: boolean } = {},
): Promise<YouTubeVideo[]> {
  const { data: follows } = await supabase
    .from('user_creator_follows')
    .select('channel_id')
    .eq('user_id', userId);

  const channelIds = (follows as Array<{ channel_id: string }> | null ?? []).map((row) => row.channel_id);
  if (!channelIds.length) return [];

  const { data: watched } = await supabase
    .from('user_youtube_history')
    .select('video_id')
    .eq('user_id', userId)
    .or('completed.eq.true,watch_duration_seconds.gt.120');

  const watchedIds = (watched as Array<{ video_id: string }> | null ?? []).map((row) => row.video_id);

  let query = supabase
    .from('youtube_videos')
    .select('video_id,channel_id,title,description,thumbnail_url,published_at,duration_seconds,youtube_url,view_count,like_count,tags,category,streamvault_score,is_curated,youtube_creators(name,thumbnail_url,category)')
    .in('channel_id', channelIds)
    .order('is_curated', { ascending: false })
    .order('streamvault_score', { ascending: false, nullsFirst: false })
    .order('published_at', { ascending: false })
    .limit(options.limit ?? 30);

  if (watchedIds.length) query = query.not('video_id', 'in', `(${watchedIds.map(quoteForPostgrest).join(',')})`);
  if (options.longFormOnly) query = query.eq('is_long_form', true);

  const { data, error } = await query;
  if (error) throw error;
  return (data as VideoRow[] | null ?? []).map(mapVideo);
}

export async function upsertCreatorVideos(
  supabase: SupabaseClient,
  videos: YouTubeVideo[],
) {
  if (!videos.length) return 0;

  const rows = videos.map((video) => ({
    video_id: video.videoId,
    channel_id: video.channelId,
    title: video.title,
    description: video.description ?? null,
    thumbnail_url: video.thumbnailUrl ?? null,
    published_at: video.publishedAt ?? null,
    duration_seconds: video.durationSeconds ?? 0,
    youtube_url: video.youtubeUrl,
    view_count: video.viewCount ?? null,
    like_count: video.likeCount ?? null,
    tags: video.tags ?? null,
    category: video.category ?? null,
    streamvault_score: video.streamvaultScore ?? null,
    is_curated: video.isCurated ?? false,
    indexed_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('youtube_videos')
    .upsert(rows, { onConflict: 'video_id' });

  if (error) throw error;
  return rows.length;
}

function seedToRow(seed: CreatorSeed) {
  return {
    channel_id: seed.channelId,
    name: seed.name,
    country: seed.country,
    category: seed.category,
    tags: seed.tags,
    is_canon: seed.isCanon ?? false,
    is_featured: seed.isCanon ?? false,
  };
}

function mapCreator(row: CreatorRow): YouTubeCreator {
  return {
    channelId: row.channel_id,
    name: row.name,
    description: row.description ?? undefined,
    thumbnailUrl: row.thumbnail_url ?? undefined,
    country: row.country ?? undefined,
    category: row.category ?? undefined,
    tags: row.tags ?? undefined,
    subscriberCount: row.subscriber_count ?? undefined,
    videoCount: row.video_count ?? undefined,
    isFeatured: row.is_featured ?? false,
    isCanon: row.is_canon ?? false,
  };
}

function mapVideo(row: VideoRow): YouTubeVideo {
  const creator = Array.isArray(row.youtube_creators) ? row.youtube_creators[0] : row.youtube_creators;

  return {
    videoId: row.video_id,
    channelId: row.channel_id,
    title: row.title,
    description: row.description ?? undefined,
    thumbnailUrl: row.thumbnail_url ?? undefined,
    publishedAt: row.published_at ?? undefined,
    durationSeconds: row.duration_seconds ?? undefined,
    youtubeUrl: row.youtube_url,
    viewCount: row.view_count ?? undefined,
    likeCount: row.like_count ?? undefined,
    tags: row.tags ?? undefined,
    category: row.category ?? undefined,
    streamvaultScore: row.streamvault_score ?? undefined,
    isCurated: row.is_curated ?? false,
    creatorName: creator?.name,
    creatorThumbnail: creator?.thumbnail_url ?? undefined,
  };
}

function quoteForPostgrest(value: string) {
  return `"${value.replace(/"/g, '\\"')}"`;
}
