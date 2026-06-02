import { tmdb } from '@/lib/tmdb/api';
import { ContentRow } from '@/components/ui/content-row';

export const metadata = {
  title: 'Adult Animation | StreamVault',
  description: 'Arcane, Invincible, Rick & Morty, BoJack Horseman — animated shows for mature audiences.',
};

export default async function AdultAnimationPage() {
  const [
    topRatedP1, topRatedP2,
    popularP1, popularP2,
    comedyAnimP1,
    darkAnimP1,
    scifiAnimP1,
  ] = await Promise.all([
    tmdb.discoverTv({ with_genres: '16', sort_by: 'vote_average.desc', 'vote_count.gte': '300', 'vote_average.gte': '7', page: '1' }),
    tmdb.discoverTv({ with_genres: '16', sort_by: 'vote_average.desc', 'vote_count.gte': '300', 'vote_average.gte': '7', page: '2' }),
    tmdb.discoverTv({ with_genres: '16', sort_by: 'popularity.desc', 'vote_average.gte': '6', page: '1' }),
    tmdb.discoverTv({ with_genres: '16', sort_by: 'popularity.desc', 'vote_average.gte': '6', page: '2' }),
    // Comedy animation
    tmdb.discoverTv({ with_genres: '16,35', sort_by: 'vote_average.desc', 'vote_count.gte': '200', page: '1' }),
    // Dark/Drama animation
    tmdb.discoverTv({ with_genres: '16,18', sort_by: 'vote_average.desc', 'vote_count.gte': '200', page: '1' }),
    // Sci-fi animation
    tmdb.discoverTv({ with_genres: '16,10765', sort_by: 'vote_average.desc', 'vote_count.gte': '100', page: '1' }),
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
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-blue-900/10" />
        <div className="absolute top-0 right-0 w-[400px] h-[200px] bg-purple-500/5 blur-[60px] pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-black uppercase tracking-widest">
            🌙 Adult Animation
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight">
            Animation for<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
              Grown-Ups
            </span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl leading-relaxed">
            Arcane, Invincible, Rick & Morty, BoJack Horseman — animated shows that prove the medium is for everyone.
          </p>
        </div>
      </div>

      <div className="space-y-16">
        <ContentRow title="🔥 Trending Adult Animation" items={normTv(merge(popularP1, popularP2))} type="tv" />
        <ContentRow title="⭐ Top Rated All-Time" items={normTv(merge(topRatedP1, topRatedP2))} type="tv" />
        <ContentRow title="😂 Comedy Animation" items={normTv(comedyAnimP1?.results || [])} type="tv" />
        <ContentRow title="🎭 Drama & Dark Themes" items={normTv(darkAnimP1?.results || [])} type="tv" />
        <ContentRow title="🚀 Sci-Fi Animation" items={normTv(scifiAnimP1?.results || [])} type="tv" />
      </div>
    </div>
  );
}
