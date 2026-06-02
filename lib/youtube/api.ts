import type { YouTubeRegion, YouTubeVideo } from './types';

const YT_BASE = 'https://www.googleapis.com/youtube/v3';

type YouTubeThumbnail = { url?: string };
type YouTubeThumbnails = { high?: YouTubeThumbnail; medium?: YouTubeThumbnail; default?: YouTubeThumbnail };
type YouTubeSearchItem = {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    description?: string;
    channelId?: string;
    channelTitle?: string;
    publishedAt?: string;
    thumbnails?: YouTubeThumbnails;
  };
};
type YouTubePlaylistItem = {
  snippet?: {
    title?: string;
    description?: string;
    channelId?: string;
    publishedAt?: string;
    resourceId?: { videoId?: string };
    thumbnails?: YouTubeThumbnails;
  };
};
type YouTubeVideoDetails = {
  id?: string;
  contentDetails?: { duration?: string };
  statistics?: { viewCount?: string; likeCount?: string };
};

function apiKey() {
  return process.env.YOUTUBE_API_KEY ?? '';
}

export function hasYouTubeProvider() {
  return apiKey().length > 0;
}

export async function searchYouTubeContent(
  query: string,
  regionCode: YouTubeRegion,
  categoryId?: string,
  maxResults = 25,
): Promise<YouTubeVideo[]> {
  if (!hasYouTubeProvider()) return [];

  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    regionCode,
    maxResults: String(maxResults),
    videoEmbeddable: 'true',
    key: apiKey(),
  });
  if (categoryId) params.set('videoCategoryId', categoryId);

  const res = await fetch(`${YT_BASE}/search?${params}`, { next: { revalidate: 60 * 60 * 6 } });
  if (!res.ok) return [];

  const data = await res.json() as { items?: YouTubeSearchItem[] };
  return (data.items ?? [])
    .map((item) => toVideoFromSearchItem(item))
    .filter((video): video is YouTubeVideo => Boolean(video));
}

export async function getChannelUploads(channelId: string, maxVideos = 200): Promise<YouTubeVideo[]> {
  if (!hasYouTubeProvider()) return [];

  const channelParams = new URLSearchParams({
    part: 'contentDetails',
    id: channelId,
    key: apiKey(),
  });
  const channelRes = await fetch(`${YT_BASE}/channels?${channelParams}`, { next: { revalidate: 60 * 60 * 24 } });
  if (!channelRes.ok) return [];

  const channelData = await channelRes.json() as {
    items?: Array<{ contentDetails?: { relatedPlaylists?: { uploads?: string } } }>;
  };
  const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) return [];

  const videos: YouTubeVideo[] = [];
  let pageToken: string | undefined;

  while (videos.length < maxVideos) {
    const params = new URLSearchParams({
      part: 'snippet',
      playlistId: uploadsPlaylistId,
      maxResults: '50',
      key: apiKey(),
    });
    if (pageToken) params.set('pageToken', pageToken);

    const res = await fetch(`${YT_BASE}/playlistItems?${params}`, { next: { revalidate: 60 * 60 * 12 } });
    if (!res.ok) break;

    const data = await res.json() as { items?: YouTubePlaylistItem[]; nextPageToken?: string };
    for (const item of data.items ?? []) {
      const video = toVideoFromPlaylistItem(item, channelId);
      if (video) videos.push(video);
      if (videos.length >= maxVideos) break;
    }

    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  const durations = await enrichVideoDurations(videos.map((video) => video.videoId));
  return videos.map((video) => ({ ...video, ...durations[video.videoId] }));
}

export async function enrichVideoDurations(videoIds: string[]) {
  if (!hasYouTubeProvider() || videoIds.length === 0) return {};

  const result: Record<string, Pick<YouTubeVideo, 'durationSeconds' | 'viewCount' | 'likeCount'>> = {};
  for (const chunk of chunkArray(videoIds, 50)) {
    const params = new URLSearchParams({
      part: 'contentDetails,statistics',
      id: chunk.join(','),
      key: apiKey(),
    });

    const res = await fetch(`${YT_BASE}/videos?${params}`, { next: { revalidate: 60 * 60 * 12 } });
    if (!res.ok) continue;

    const data = await res.json() as { items?: YouTubeVideoDetails[] };
    for (const item of data.items ?? []) {
      if (!item.id) continue;
      result[item.id] = {
        durationSeconds: parseISO8601Duration(item.contentDetails?.duration ?? 'PT0S'),
        viewCount: Number(item.statistics?.viewCount ?? 0),
        likeCount: Number(item.statistics?.likeCount ?? 0),
      };
    }
  }

  return result;
}

export function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = Number.parseInt(match[1] ?? '0', 10);
  const minutes = Number.parseInt(match[2] ?? '0', 10);
  const seconds = Number.parseInt(match[3] ?? '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

function toVideoFromSearchItem(item: YouTubeSearchItem): YouTubeVideo | null {
  const videoId = item.id?.videoId;
  const snippet = item.snippet;
  if (!videoId || !snippet?.channelId || !snippet.title) return null;

  return {
    videoId,
    channelId: snippet.channelId,
    title: snippet.title,
    description: snippet.description,
    publishedAt: snippet.publishedAt,
    thumbnailUrl: bestThumbnail(snippet.thumbnails),
    youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
    creatorName: snippet.channelTitle,
  };
}

function toVideoFromPlaylistItem(item: YouTubePlaylistItem, fallbackChannelId: string): YouTubeVideo | null {
  const snippet = item.snippet;
  const videoId = snippet?.resourceId?.videoId;
  if (!videoId || !snippet?.title) return null;

  return {
    videoId,
    channelId: snippet.channelId ?? fallbackChannelId,
    title: snippet.title,
    description: snippet.description,
    publishedAt: snippet.publishedAt,
    thumbnailUrl: bestThumbnail(snippet.thumbnails),
    youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

function bestThumbnail(thumbnails?: YouTubeThumbnails) {
  return thumbnails?.high?.url ?? thumbnails?.medium?.url ?? thumbnails?.default?.url;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
