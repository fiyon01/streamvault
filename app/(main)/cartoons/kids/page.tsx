import { tmdb } from '@/lib/tmdb/api';
import { ContentRow } from '@/components/ui/content-row';

export const metadata = {
  title: 'Kids & Family | StreamVault',
  description: 'The best animated shows and movies for kids and families — SpongeBob, Pixar, DreamWorks, Disney and more.',
};

export default async function KidsCartoonsPage() {
  const [
    kidsShowsP1, kidsShowsP2,
    familyMoviesP1, familyMoviesP2,
    familyTvP1,
    preschoolP1,
    classicKidsP1,
    adventureKidsP1,
  ] = await Promise.all([
    tmdb.discoverTv({ with_genres: '16,10762', sort_by: 'popularity.desc', page: '1' }),
    tmdb.discoverTv({ with_genres: '16,10762', sort_by: 'popularity.desc', page: '2' }),
    tmdb.discoverMovies({ with_genres: '16,10751', sort_by: 'popularity.desc', 'vote_average.gte': '5', page: '1' }),
    tmdb.discoverMovies({ with_genres: '16,10751', sort_by: 'popularity.desc', 'vote_average.gte': '5', page: '2' }),
    // Family TV (broader — includes live action family shows)
    tmdb.discoverTv({ with_genres: '10751,16', sort_by: 'vote_average.desc', 'vote_count.gte': '200', page: '1' }),
    // Pre-school / very young kids
    tmdb.discoverTv({ with_genres: '10762', sort_by: 'popularity.desc', page: '1' }),
    // Classic kids shows (pre-2010)
    tmdb.discoverTv({ with_genres: '16,10762', sort_by: 'vote_average.desc', 'first_air_date.lte': '2010-01-01', 'vote_count.gte': '100', page: '1' }),
    // Adventure/action for kids
    tmdb.discoverTv({ with_genres: '16,10759,10751', sort_by: 'popularity.desc', page: '1' }),
  ]);

  const merge = (p1: any, p2: any) => {
    const items = [...(p1?.results || []), ...(p2?.results || [])];
    const seen = new Set<number>();
    return items.filter(i => { if (seen.has(i.id)) return false; seen.add(i.id); return true; });
  };

  const normTv = (items: any[]) => items.map((s: any) => ({ ...s, title: s.title || s.name }));

  const kidsShows   = normTv(merge(kidsShowsP1, kidsShowsP2));
  const familyMovies = merge(familyMoviesP1, familyMoviesP2);
  const familyTv    = normTv(familyTvP1?.results || []);
  const preschool   = normTv(preschoolP1?.results || []);
  const classicKids = normTv(classicKidsP1?.results || []);
  const adventureKids = normTv(adventureKidsP1?.results || []);

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>

      {/* Header */}
      <div className="relative px-6 md:px-14 pt-10 pb-14 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-yellow-500/10" />
        <div className="absolute top-0 right-0 w-[400px] h-[200px] bg-green-500/5 blur-[60px] pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-black uppercase tracking-widest">
            🧒 Kids & Family
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight">
            For the Whole<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-yellow-400">
              Family
            </span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl leading-relaxed">
            SpongeBob, Phineas & Ferb, Pixar, DreamWorks, and hundreds more — entertainment that brings everyone together.
          </p>
        </div>
      </div>

      <div className="space-y-16">
        <ContentRow title="🎬 Family Films" items={familyMovies} type="movie" />
        <ContentRow title="📺 Kids Shows" items={kidsShows} type="tv" />
        <ContentRow title="🗺️ Action & Adventure for Kids" items={adventureKids} type="tv" />
        <ContentRow title="🏡 Family TV" items={familyTv} type="tv" />
        <ContentRow title="🌟 Pre-School & Little Ones" items={preschool} type="tv" />
        <ContentRow title="📼 Classic Kids Shows" items={classicKids} type="tv" />
      </div>
    </div>
  );
}
