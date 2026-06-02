import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, Clapperboard, Clock, Database, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSeedCreator } from '@/lib/youtube/creator-catalogue';
import { getCreatorByChannelId, getCreatorVideos, getUnseenVideosFromCreator } from '@/lib/youtube/creators';
import type { YouTubeCreator } from '@/lib/youtube/types';
import { CreatorFollowButton } from '@/components/creators/creator-follow-button';
import { CreatorIndexButton } from '@/components/creators/creator-index-button';
import { CreatorVideoCard } from '@/components/creators/creator-video-card';

export const metadata: Metadata = {
  title: 'Creator',
  description: 'Creator catalogue with unseen-first StreamVault sorting.',
};

function seedToCreator(channelId: string): YouTubeCreator | null {
  const seed = getSeedCreator(channelId);
  if (!seed) return null;
  return {
    channelId: seed.channelId,
    name: seed.name,
    country: seed.country,
    category: seed.category,
    tags: seed.tags,
    isCanon: seed.isCanon ?? false,
  };
}

function categoryLabel(category?: string) {
  return (category ?? 'creator')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function CreatorDetailPage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = await params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const creator = await getCreatorByChannelId(supabase, channelId).catch(() => null) ?? seedToCreator(channelId);
  const [allVideos, unseenVideos] = await Promise.all([
    getCreatorVideos(supabase, channelId, { limit: 80 }).catch(() => []),
    user ? getUnseenVideosFromCreator(supabase, user.id, channelId, { limit: 24 }).catch(() => []) : Promise.resolve([]),
  ]);
  const { data: follow } = user
    ? await readCreatorFollow(user.id, channelId)
    : { data: null };

  if (!creator) {
    return (
      <div className="min-h-screen px-6 py-10 md:px-12">
        <Link href="/creators" className="inline-flex items-center gap-2 text-sm font-bold text-white/55 hover:text-white">
          <ArrowLeft size={15} />
          Back to creators
        </Link>
        <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.035] p-8">
          <h1 className="text-2xl font-black text-white">Creator not indexed yet</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/50">
            Add this channel to the StreamVault creator catalogue, then index its official uploads.
          </p>
        </div>
      </div>
    );
  }

  const primaryVideos = unseenVideos.length ? unseenVideos : allVideos;

  return (
    <div className="min-h-screen pb-24">
      <section className="px-6 py-8 md:px-12 lg:px-16">
        <Link href="/creators" className="inline-flex items-center gap-2 text-sm font-bold text-white/55 transition hover:text-white">
          <ArrowLeft size={15} />
          Creator Hub
        </Link>

        <div className="mt-6 overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.055),rgba(158,228,147,0.10)_45%,rgba(0,0,0,0.18))] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.35)] md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-3xl border border-white/10 bg-black/30 text-[#9ee493]">
                {creator.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={creator.thumbnailUrl} alt={creator.name} className="h-full w-full object-cover" />
                ) : (
                  <Clapperboard size={28} />
                )}
              </div>
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#9ee493]/25 bg-[#9ee493]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#9ee493]">
                  {categoryLabel(creator.category)}
                </div>
                <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">{creator.name}</h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">
                  {creator.description || 'A creator catalogue treated like a real StreamVault library: videos, duration, watch status, and unseen-first sorting.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {user && <CreatorFollowButton channelId={channelId} initialFollowing={Boolean(follow)} />}
              <CreatorIndexButton channelId={channelId} />
            </div>
          </div>

          <div className="mt-7 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <EyeOff size={17} className="text-[#9ee493]" />
              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Unseen</p>
              <p className="mt-1 text-2xl font-black text-white">{unseenVideos.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <Database size={17} className="text-[#9ee493]" />
              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Indexed</p>
              <p className="mt-1 text-2xl font-black text-white">{allVideos.length || creator.videoCount || 0}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <Clock size={17} className="text-[#9ee493]" />
              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Priority</p>
              <p className="mt-1 text-2xl font-black text-white">Unseen first</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 md:px-12 lg:px-16">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9ee493]">
              {unseenVideos.length ? 'Your gap list' : 'Creator catalogue'}
            </p>
            <h2 className="mt-1 text-2xl font-black text-white">
              {unseenVideos.length ? 'Videos you have not watched yet' : 'Indexed videos'}
            </h2>
          </div>
          <Link href="/creators" className="text-xs font-black text-white/45 transition hover:text-white">All creators</Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {primaryVideos.map((video) => (
            <CreatorVideoCard key={video.videoId} video={video} />
          ))}
        </div>

        {primaryVideos.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-8">
            <h2 className="text-xl font-black text-white">No videos indexed yet</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/45">
              Use the index endpoint after adding `YOUTUBE_API_KEY`. StreamVault will fetch official uploads, durations, thumbnails, and make them available for unseen-first browsing.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

async function readCreatorFollow(userId: string, channelId: string) {
  try {
    const admin = createAdminClient();
    return admin
      .from('user_creator_follows')
      .select('channel_id')
      .eq('user_id', userId)
      .eq('channel_id', channelId)
      .maybeSingle();
  } catch {
    const supabase = createClient();
    return supabase
      .from('user_creator_follows')
      .select('channel_id')
      .eq('user_id', userId)
      .eq('channel_id', channelId)
      .maybeSingle();
  }
}
