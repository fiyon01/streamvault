import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Building2 } from 'lucide-react';
import { jikan } from '@/lib/jikan/api';
import { AnimeCard } from '@/components/anime/anime-card';

const STUDIO_MAP: Record<string, { name: string; producerId: string; known: string }> = {
  mappa: { name: 'MAPPA', producerId: '569', known: 'Jujutsu Kaisen, Chainsaw Man, Attack on Titan Final Season' },
  ufotable: { name: 'Ufotable', producerId: '43', known: 'Demon Slayer, Fate/Zero, Fate/stay night' },
  'wit-studio': { name: 'Wit Studio', producerId: '858', known: 'Vinland Saga, Spy x Family, Attack on Titan S1-S3' },
  bones: { name: 'Bones', producerId: '4', known: 'Fullmetal Alchemist: Brotherhood, My Hero Academia' },
  pierrot: { name: 'Pierrot', producerId: '1', known: 'Naruto, Bleach, Black Clover' },
  'kyoto-animation': { name: 'Kyoto Animation', producerId: '2', known: 'Violet Evergarden, K-On!, A Silent Voice' },
  madhouse: { name: 'Madhouse', producerId: '11', known: 'Death Note, Hunter x Hunter, One Punch Man S1' },
  'a-1-pictures': { name: 'A-1 Pictures', producerId: '56', known: 'Sword Art Online, Kaguya-sama, Fairy Tail' },
  trigger: { name: 'TRIGGER', producerId: '803', known: 'Kill la Kill, Promare, Cyberpunk: Edgerunners' },
  'pa-works': { name: 'PA Works', producerId: '132', known: 'Angel Beats!, Shirobako, Charlotte' },
  'studio-ghibli': { name: 'Studio Ghibli', producerId: '21', known: 'Spirited Away, My Neighbor Totoro, Princess Mononoke' },
  'science-saru': { name: 'Science SARU', producerId: '1591', known: 'Devilman Crybaby, Heike Story, Scott Pilgrim Takes Off' },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const studio = STUDIO_MAP[slug];
  return {
    title: studio ? `${studio.name} Anime | StreamVault` : 'Anime Studio | StreamVault',
    description: studio ? `Browse ${studio.name} anime on StreamVault.` : 'Browse anime by studio.',
  };
}

export default async function StudioDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const studio = STUDIO_MAP[slug];
  if (!studio) notFound();

  const result = await jikan.getAnimeByProducer(studio.producerId, 24).catch(async () => {
    return jikan.searchAnime(studio.name, {
      order_by: 'score',
      sort: 'desc',
      limit: '24',
    }).catch(() => ({ data: [] }));
  }) as any;

  const anime = result.data || [];

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>
      <section className="px-6 py-8 md:px-14">
        <Link href="/anime/studios" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-white/55 transition hover:text-white">
          <ArrowLeft size={16} />
          All studios
        </Link>

        <div className="rounded-3xl border border-[#8B5CF6]/20 bg-[#8B5CF6]/10 p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-[#8B5CF6]/25 bg-black/25 text-[#8B5CF6]">
              <Building2 size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8B5CF6]">Studio catalogue</p>
              <h1 className="mt-2 text-3xl font-black text-white md:text-5xl">{studio.name}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">{studio.known}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 md:px-14">
        {anime.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {anime.map((item: any) => (
              <AnimeCard
                key={item.mal_id}
                id={item.mal_id}
                title={item.title}
                titleEnglish={item.title_english}
                imageUrl={item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || null}
                score={item.score}
                episodes={item.episodes}
                status={item.status}
                type={item.type}
                year={item.year || item.aired?.prop?.from?.year}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-8 text-center">
            <h2 className="text-xl font-black text-white">No catalogue results yet</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-white/45">
              Jikan did not return a producer catalogue for this studio. Use Advanced Filter while the studio index refreshes.
            </p>
            <Link href={`/anime/discover?studioId=${studio.producerId}`} className="mt-5 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-black text-black">
              Open Advanced Filter
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
