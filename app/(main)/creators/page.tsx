import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, Bell, Clapperboard, Clock, Film, Globe2, Search, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CREATOR_CATALOGUE } from '@/lib/youtube/creator-catalogue';
import { listCreators } from '@/lib/youtube/creators';
import type { YouTubeCreator } from '@/lib/youtube/types';
import { CreatorFollowButton } from '@/components/creators/creator-follow-button';
import { YouTubeImportPanel } from '@/components/creators/youtube-import-panel';

export const metadata: Metadata = {
  title: 'Creator Hub',
  description: 'YouTube creators treated like real StreamVault catalogues: followed creators, unseen videos, long-form content, and African comedy discovery.',
};

function seedCreators(options: { category?: string; country?: string } = {}): YouTubeCreator[] {
  return CREATOR_CATALOGUE
    .filter((creator) => !options.category || creator.category === options.category)
    .filter((creator) => !options.country || creator.country === options.country)
    .map((creator) => ({
    channelId: creator.channelId,
    name: creator.name,
    country: creator.country,
    category: creator.category,
    tags: creator.tags,
    isCanon: creator.isCanon ?? false,
    isFeatured: creator.isCanon ?? false,
  }));
}

function categoryLabel(category?: string) {
  return (category ?? 'creator')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function CreatorsPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string; country?: string }>;
}) {
  const resolvedParams = await searchParams;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const category = resolvedParams?.category;
  const country = resolvedParams?.country;

  const dbCreators = await listCreators(supabase, { category, country, limit: 80 }).catch(() => []);
  const seed = seedCreators({ category, country });
  const creatorMap = new Map<string, YouTubeCreator>();
  const seedNames = new Set(seed.map((creator) => creator.name.toLowerCase()));
  for (const creator of seed) creatorMap.set(creator.channelId, creator);
  for (const creator of dbCreators) {
    if (seedNames.has(creator.name.toLowerCase()) && !seed.some((item) => item.channelId === creator.channelId)) continue;
    creatorMap.set(creator.channelId, creator);
  }
  const creators = [...creatorMap.values()].sort((a, b) => Number(b.isCanon) - Number(a.isCanon) || a.name.localeCompare(b.name));
  const { data: follows } = user
    ? await readCreatorFollows(user.id)
    : { data: [] };
  const followed = new Set((follows as Array<{ channel_id: string }> | null ?? []).map((row) => row.channel_id));
  const hasYouTubeKey = Boolean(process.env.YOUTUBE_API_KEY);

  const categories = [
    { label: 'All', href: '/creators' },
    { label: 'Nigerian Comedy', href: '/creators?category=nigerian_comedy' },
    { label: 'Kenyan Creators', href: '/creators?category=kenyan_creator' },
    { label: 'Food & Travel', href: '/creators?category=food_travel' },
    { label: 'Music', href: '/creators?category=music' },
    { label: 'Sports', href: '/creators?category=sports' },
    { label: 'Tanzania', href: '/creators?country=TZ' },
    { label: 'Uganda', href: '/creators?country=UG' },
  ];

  return (
    <div className="min-h-screen pb-24">
      <section className="px-6 py-8 md:px-12 lg:px-16">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(158,228,147,0.10)_45%,rgba(99,102,241,0.08))] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.35)] md:p-7">
          <div className="max-w-4xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#9ee493]/25 bg-[#9ee493]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#9ee493]">
              <Clapperboard size={13} />
              YouTube as an intelligent content surface
            </div>
            <h1 className="max-w-3xl text-3xl font-black tracking-tight text-white md:text-5xl">
              Creator catalogues sorted by what you missed.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/60 md:text-base">
              Follow creators once. StreamVault indexes their official videos, tracks what you have watched, and puts the best unseen videos first. This is creator loyalty browsing without the YouTube maze.
            </p>
            <p className="mt-3 max-w-3xl text-xs leading-relaxed text-white/42">
              StreamVault can track creators you follow here. It cannot see your existing YouTube subscriptions until YouTube import is connected, so this hub becomes your clean, intentional creator watch queue.
            </p>
            {!hasYouTubeKey && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-xs font-bold text-amber-100/80">
                <Bell size={13} />
                Follow works after the creator tables are migrated. Video indexing needs YOUTUBE_API_KEY.
              </p>
            )}
          </div>

          <YouTubeImportPanel />

          <div className="mt-7 grid gap-3 md:grid-cols-3">
            {[
              { label: 'Unseen first', value: 'Per creator', icon: Search },
              { label: 'Long-form ready', value: '10 min to feature', icon: Clock },
              { label: 'African first', value: 'NG, KE, TZ, UG, ZA, GH, ET, EG', icon: Globe2 },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <Icon size={18} className="text-[#9ee493]" />
                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/35">{label}</p>
                <p className="mt-1 text-lg font-black text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 md:px-12 lg:px-16">
        <div className="flex gap-2 overflow-x-auto pb-3">
          {categories.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-xs font-black text-white/65 transition hover:border-[#9ee493]/30 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-5 px-6 md:px-12 lg:px-16">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {creators.map((creator) => (
            <div key={creator.channelId} className="flex min-h-[270px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b0d14] transition hover:border-[#9ee493]/25 hover:bg-[#10141d]">
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start gap-4">
                  <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-black/30 text-[#9ee493]">
                      {creator.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={creator.thumbnailUrl} alt={creator.name} className="h-full w-full object-cover" />
                      ) : (
                        <Clapperboard size={22} />
                      )}
                  </div>
                  <div className="min-w-0 flex-1">
                      <h2 className="line-clamp-2 text-xl font-black leading-tight text-white">{creator.name}</h2>
                      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/35">
                        {categoryLabel(creator.category)} {creator.country ? `- ${creator.country}` : ''}
                      </p>
                  </div>
                </div>

                <p className="mt-4 line-clamp-3 min-h-[3.75rem] text-xs leading-relaxed text-white/48">
                  {creator.description || 'Indexed creator catalogue. Follow to build an unseen-first catch-up queue.'}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {(creator.tags ?? []).slice(0, 4).map((tag) => (
                    <span key={tag} className="rounded-full border border-white/8 bg-black/20 px-2 py-1 text-[10px] font-bold text-white/42">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 px-5 py-3">
                <div className="flex items-center gap-2 text-[11px] font-bold text-white/40">
                  <Film size={13} />
                  {creator.videoCount ? `${creator.videoCount} videos` : 'Ready to index'}
                  {creator.isCanon && <span className="rounded-full bg-[#9ee493]/10 px-2 py-0.5 text-[#9ee493]">Canon</span>}
                </div>
                <div className="flex items-center gap-2">
                  {user && <CreatorFollowButton channelId={creator.channelId} initialFollowing={followed.has(creator.channelId)} />}
                  <Link href={`/creators/${creator.channelId}`} className="inline-flex items-center gap-1 rounded-full border border-[#9ee493]/20 px-3 py-1.5 text-xs font-black text-[#9ee493] transition hover:bg-[#9ee493]/10">
                    Open
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {creators.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-8 text-center">
            <Sparkles className="mx-auto text-white/25" />
            <h2 className="mt-3 text-xl font-black text-white">No creators indexed yet</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-white/45">
              Seed the creator catalogue from `/api/creators`, then index official channels as the YouTube API key becomes available.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

async function readCreatorFollows(userId: string) {
  try {
    const admin = createAdminClient();
    return admin.from('user_creator_follows').select('channel_id').eq('user_id', userId);
  } catch {
    const supabase = createClient();
    return supabase.from('user_creator_follows').select('channel_id').eq('user_id', userId);
  }
}
