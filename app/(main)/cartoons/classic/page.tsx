import { tmdb } from '@/lib/tmdb/api';
import { ContentRow } from '@/components/ui/content-row';

export const metadata = {
  title: 'Classic Cartoons | StreamVault',
  description: 'Avatar, Batman TAS, Gravity Falls, Gargoyles — the golden age of animation.',
};

export default async function ClassicCartoonsPage() {
  const [
    goldenAgeP1, goldenAgeP2,
    nineties90sP1, nineties90sP2,
    twoThousandsP1, twoThousandsP2,
    classicKidsP1,
    classicActionP1,
  ] = await Promise.all([
    // All-time classics (before 2000)
    tmdb.discoverTv({ with_genres: '16', sort_by: 'vote_average.desc', 'first_air_date.lte': '2000-01-01', 'vote_count.gte': '100', page: '1' }),
    tmdb.discoverTv({ with_genres: '16', sort_by: 'vote_average.desc', 'first_air_date.lte': '2000-01-01', 'vote_count.gte': '100', page: '2' }),
    // 90s cartoons
    tmdb.discoverTv({ with_genres: '16', sort_by: 'vote_average.desc', 'first_air_date.gte': '1990-01-01', 'first_air_date.lte': '1999-12-31', 'vote_count.gte': '100', page: '1' }),
    tmdb.discoverTv({ with_genres: '16', sort_by: 'popularity.desc', 'first_air_date.gte': '1990-01-01', 'first_air_date.lte': '1999-12-31', page: '1' }),
    // 2000s cartoons
    tmdb.discoverTv({ with_genres: '16', sort_by: 'vote_average.desc', 'first_air_date.gte': '2000-01-01', 'first_air_date.lte': '2010-12-31', 'vote_count.gte': '100', page: '1' }),
    tmdb.discoverTv({ with_genres: '16', sort_by: 'popularity.desc', 'first_air_date.gte': '2000-01-01', 'first_air_date.lte': '2010-12-31', page: '1' }),
    // Classic kids
    tmdb.discoverTv({ with_genres: '16,10762', sort_by: 'vote_average.desc', 'first_air_date.lte': '2005-01-01', 'vote_count.gte': '100', page: '1' }),
    // Classic action
    tmdb.discoverTv({ with_genres: '16,10759', sort_by: 'vote_average.desc', 'first_air_date.lte': '2010-01-01', 'vote_count.gte': '100', page: '1' }),
  ]);

  const merge = (p1: any, p2: any) => {
    const items = [...(p1?.results || []), ...(p2?.results || [])];
    const seen = new Set<number>();
    return items.filter(i => { if (seen.has(i.id)) return false; seen.add(i.id); return true; });
  };

  const normTv = (items: any[]) => items.map((s: any) => ({ ...s, title: s.title || s.name }));

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>

      {/* Header */}
      <div className="relative px-6 md:px-14 pt-10 pb-14 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-cyan-900/10" />
        <div className="absolute top-0 right-0 w-[400px] h-[200px] bg-blue-500/5 blur-[60px] pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-widest">
            📺 Classic Cartoons
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight">
            The Golden<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              Age of Animation
            </span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl leading-relaxed">
            Avatar, Batman TAS, Gravity Falls, Gargoyles, Dexter's Lab — the cartoons that defined generations.
          </p>
        </div>
      </div>

      <div className="space-y-16">
        <ContentRow title="🏆 All-Time Classics" items={normTv(merge(goldenAgeP1, goldenAgeP2))} type="tv" />
        <ContentRow title="📼 90s Cartoons" items={normTv(merge(nineties90sP1, nineties90sP2))} type="tv" />
        <ContentRow title="💿 2000s Golden Era" items={normTv(merge(twoThousandsP1, twoThousandsP2))} type="tv" />
        <ContentRow title="🦸 Classic Action Cartoons" items={normTv(classicActionP1?.results || [])} type="tv" />
        <ContentRow title="🧒 Classic Kids Favorites" items={normTv(classicKidsP1?.results || [])} type="tv" />
      </div>
    </div>
  );
}
