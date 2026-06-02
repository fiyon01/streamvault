import { createAdminClient } from '@/lib/supabase/admin';
import { getSeedCreator } from '@/lib/youtube/creator-catalogue';
import { getChannelUploads, hasYouTubeProvider } from '@/lib/youtube/api';
import { seedCreatorCatalogue, upsertCreatorVideos } from '@/lib/youtube/creators';

export const maxDuration = 60;

type CreatorIndexMeta = {
  category: string;
  tags: string[];
  isCanon: boolean;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ channelId: string }> },
) {
  const { channelId } = await params;
  return Response.json({
    channelId,
    status: 'ready',
    method: 'POST',
    message: 'POST this route to index official uploads for this creator after YOUTUBE_API_KEY is configured.',
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ channelId: string }> },
) {
  const { channelId } = await params;
  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 100), 1), 200);

  if (!hasYouTubeProvider()) {
    return Response.json({ error: 'YOUTUBE_API_KEY is not configured.' }, { status: 400 });
  }

  const seed = getSeedCreator(channelId);

  try {
    const admin = createAdminClient();
    let creatorMeta: CreatorIndexMeta | null = seed
      ? {
          category: seed.category,
          tags: seed.tags,
          isCanon: seed.isCanon ?? false,
        }
      : null;

    if (seed) {
      await seedCreatorCatalogue(admin);
    } else {
      const { data: creator, error: creatorError } = await admin
        .from('youtube_creators')
        .select('channel_id,category,tags,is_canon')
        .eq('channel_id', channelId)
        .maybeSingle();

      if (creatorError) throw creatorError;
      if (!creator) {
        return Response.json({ error: 'Creator is not followed or imported in StreamVault yet.' }, { status: 404 });
      }

      creatorMeta = {
        category: creator.category ?? 'lifestyle',
        tags: Array.isArray(creator.tags) ? creator.tags : ['youtube_import'],
        isCanon: Boolean(creator.is_canon),
      };
    }

    if (!creatorMeta) {
      return Response.json({ error: 'Creator metadata is missing.' }, { status: 500 });
    }

    const videos = await getChannelUploads(channelId, limit);
    if (!videos.length) {
      return Response.json({ indexed: 0, channelId, message: 'No public uploads were returned by YouTube for this channel.' });
    }

    const tagged = videos.map((video) => ({
      ...video,
      category: creatorMeta.category,
      tags: creatorMeta.tags,
      streamvaultScore: scoreVideo(video.durationSeconds ?? 0, video.viewCount ?? 0, creatorMeta.isCanon),
      isCurated: creatorMeta.isCanon,
    }));

    const indexed = await upsertCreatorVideos(admin, tagged);
    await admin
      .from('youtube_creators')
      .update({ last_indexed_at: new Date().toISOString(), video_count: indexed })
      .eq('channel_id', channelId);

    return Response.json({ indexed, channelId });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to index creator channel' },
      { status: 500 },
    );
  }
}

function scoreVideo(durationSeconds: number, viewCount: number, canonCreator: boolean) {
  const durationScore = durationSeconds >= 600 ? 0.25 : 0.1;
  const viewScore = Math.min(0.45, Math.log10(Math.max(viewCount, 1)) / 20);
  const canonScore = canonCreator ? 0.2 : 0;
  return Math.min(0.999, Number((durationScore + viewScore + canonScore).toFixed(3)));
}
