import { jikan } from '@/lib/jikan/api';
import { AnimeCard } from '@/components/anime/anime-card';
import { Star } from 'lucide-react';

export const metadata = {
  title: 'Top Rated Anime | StreamVault',
  description: 'The highest rated anime of all time, ranked by MyAnimeList score.',
};

export default async function TopAnimePage() {
  const data = await jikan.getTopAnime(50).catch(() => ({ data: [] }));
  const items: any[] = (data as any)?.data || [];

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>

      {/* Header */}
      <div className="px-6 md:px-14 pt-10 pb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
            <Star className="text-yellow-400 fill-yellow-400" size={20} />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">All-Time Top Rated</h1>
            <p className="text-slate-400 text-sm mt-0.5">Ranked by MyAnimeList community score · {items.length} titles</p>
          </div>
        </div>

        {/* MAL Score legend */}
        <div className="inline-flex items-center gap-6 px-5 py-3 rounded-2xl bg-white/[0.03] border border-white/5 text-sm text-slate-400">
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-400" /> MAL Score</span>
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#8B5CF6]" /> Rank position</span>
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-400" /> Airing status</span>
        </div>
      </div>

      {/* Ranked Grid */}
      <div className="px-6 md:px-14">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {items.map((item: any, index: number) => (
            <div key={item.mal_id} className="relative">
              {/* Rank badge */}
              <div className="absolute -top-2 -left-2 z-10 w-8 h-8 rounded-full bg-[#050505] border-2 border-yellow-500/50 flex items-center justify-center text-xs font-black text-yellow-400 shadow-lg">
                #{index + 1}
              </div>
              <AnimeCard
                id={item.mal_id}
                title={item.title}
                titleEnglish={item.title_english}
                imageUrl={item.images?.jpg?.large_image_url}
                score={item.score}
                episodes={item.episodes}
                status={item.status}
                isAiring={item.status === 'Currently Airing'}
                year={item.year || item.aired?.prop?.from?.year}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
