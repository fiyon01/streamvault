import { tmdb } from '@/lib/tmdb/api';
import { ContentRow } from '@/components/ui/content-row';
import Link from 'next/link';
import { Ghost, Skull, Baby, Star, ChevronRight } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cartoons',
  description: 'Western animation, adult cartoons, classic series and more — all in one place.',
  openGraph: {
    title: 'Cartoons | StreamVault',
    description: 'Western animation, adult cartoons, classic series and more — all in one place.',
  },
};

export default async function CartoonsPage() {
  // Fetch multiple pages for each category to get rich results
  const [
    adultP1, adultP2, adultP3,
    kidsP1, kidsP2, kidsP3,
    classicP1, classicP2, classicP3,
    filmsP1, filmsP2, filmsP3,
    adultSwimP1,
    nickelodeonP1,
    dcP1,
    adventureP1,
    pixarP1,
    stopMotionP1,
    animeWesternP1
  ] = await Promise.all([
    // Adult animation (pg1-3)
    tmdb.discoverTv({ with_genres: '16', sort_by: 'popularity.desc', 'vote_average.gte': '7', page: '1' }),
    tmdb.discoverTv({ with_genres: '16', sort_by: 'popularity.desc', 'vote_average.gte': '7', page: '2' }),
    tmdb.discoverTv({ with_genres: '16', sort_by: 'popularity.desc', 'vote_average.gte': '7', page: '3' }),
    // Kids animation (pg1-3)
    tmdb.discoverTv({ with_genres: '16,10762', sort_by: 'popularity.desc', page: '1' }),
    tmdb.discoverTv({ with_genres: '16,10762', sort_by: 'popularity.desc', page: '2' }),
    tmdb.discoverTv({ with_genres: '16,10762', sort_by: 'popularity.desc', page: '3' }),
    // Classic animation
    tmdb.discoverTv({ with_genres: '16', sort_by: 'vote_average.desc', 'first_air_date.lte': '2010-01-01', 'vote_count.gte': '200', page: '1' }),
    tmdb.discoverTv({ with_genres: '16', sort_by: 'vote_average.desc', 'first_air_date.lte': '2010-01-01', 'vote_count.gte': '200', page: '2' }),
    tmdb.discoverTv({ with_genres: '16', sort_by: 'vote_average.desc', 'first_air_date.lte': '2010-01-01', 'vote_count.gte': '200', page: '3' }),
    // Animated films (pg1-3)
    tmdb.discoverMovies({ with_genres: '16', sort_by: 'popularity.desc', 'vote_average.gte': '5', page: '1' }),
    tmdb.discoverMovies({ with_genres: '16', sort_by: 'popularity.desc', 'vote_average.gte': '5', page: '2' }),
    tmdb.discoverMovies({ with_genres: '16', sort_by: 'popularity.desc', 'vote_average.gte': '5', page: '3' }),
    // Adult Swim style — animation + comedy
    tmdb.discoverTv({ with_genres: '16,35', sort_by: 'vote_average.desc', 'vote_count.gte': '300', page: '1' }),
    // Nickelodeon/Disney style — animation + kids
    tmdb.discoverTv({ with_genres: '16,10751', sort_by: 'popularity.desc', page: '1' }),
    // Superhero / Action animation
    tmdb.discoverTv({ with_genres: '16,10759', sort_by: 'popularity.desc', 'vote_average.gte': '6', page: '1' }),
    // Adventure animation
    tmdb.discoverTv({ with_genres: '16,10759', sort_by: 'vote_average.desc', 'vote_count.gte': '200', page: '1' }),
    // Pixar/Disney mega-hits
    tmdb.discoverMovies({ with_genres: '16', sort_by: 'vote_average.desc', 'vote_count.gte': '3000' }),
    // Stop-Motion (keyword 10051)
    tmdb.discoverMovies({ with_keywords: '10051', sort_by: 'popularity.desc' }),
    // Anime-style Western (Arcane/Castlevania - keyword 210024 is adult animation, or 210024 anime-inspired)
    tmdb.discoverTv({ with_genres: '16', with_keywords: '210024', sort_by: 'popularity.desc' })
  ]);

  const merge = (...pages: any[]) => {
    const items = pages.reduce((acc, p) => [...acc, ...(p?.results || [])], []);
    const seen = new Set<number>();
    return items.filter((i: any) => { if (seen.has(i.id)) return false; seen.add(i.id); return true; });
  };

  const normTv = (items: any[]) => items.map((s: any) => ({ ...s, title: s.title || s.name }));
  const normMovie = (items: any[]) => items;

  const adultAnim    = normTv(merge(adultP1, adultP2, adultP3));
  const kidsAnim     = normTv(merge(kidsP1, kidsP2, kidsP3));
  const classicAnim  = normTv(merge(classicP1, classicP2, classicP3));
  const animFilms    = normMovie(merge(filmsP1, filmsP2, filmsP3));
  const adultSwim    = normTv(adultSwimP1?.results || []);
  const nickelodeon  = normTv(nickelodeonP1?.results || []);
  const dcSuperhero  = normTv(dcP1?.results || []);
  const adventure    = normTv(adventureP1?.results || []);
  const pixarDisney  = normMovie(pixarP1?.results || []);
  const stopMotion   = normMovie(stopMotionP1?.results || []);
  const animeWestern = normTv(animeWesternP1?.results || []);

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>

      {/* Hero Header */}
      <div className="relative px-6 md:px-14 pt-10 pb-14 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-orange-600/10" />
        <div className="absolute top-0 right-0 w-[500px] h-[300px] bg-orange-500/5 blur-[80px] pointer-events-none" />
        <div className="relative z-10 space-y-6">
          <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight">
            🎨 Cartoons &<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
              Animation
            </span>
          </h1>
          <p className="text-slate-400 text-xl max-w-2xl leading-relaxed">
            From Arcane to Gravity Falls, Rick & Morty to Spirited Away. Animation is not just for kids — this is where art meets storytelling.
          </p>

          {/* Sub-section links */}
          <div className="flex flex-wrap gap-4">
            {[
              { label: '🌙 Adult Animation', href: '/cartoons/adult',   color: 'hover:border-purple-500/50 hover:text-purple-400' },
              { label: '📺 Classic Cartoons', href: '/cartoons/classic', color: 'hover:border-blue-500/50 hover:text-blue-400' },
              { label: '🧒 Kids & Family',    href: '/cartoons/kids',    color: 'hover:border-green-500/50 hover:text-green-400' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-5 py-3 rounded-full bg-white/5 border border-white/10 text-slate-300 font-bold text-sm transition-all hover:scale-105 ${link.color}`}
              >
                {link.label} <ChevronRight size={14} />
              </Link>
            ))}
          </div>

          {/* Discover Mood Pills */}
          <div className="flex flex-wrap gap-3 mt-8 pt-6 border-t border-white/5">
            <span className="text-white/40 text-sm font-bold flex items-center mr-2">Browse by Mood:</span>
            {[
              { label: '🤣 Adult Humor',    href: '/discover?contentType=tv&selectedGenres=Animation,Comedy' },
              { label: '🦸 Action Heroes',  href: '/discover?contentType=tv&selectedGenres=Animation,Action' },
              { label: '🧒 Kids & Family',   href: '/discover?contentType=tv&selectedGenres=Animation,Family' },
              { label: '🎬 Animated Films', href: '/discover?contentType=movie&selectedGenres=Animation' },
              { label: '🌏 World Anime',    href: '/discover?contentType=tv&animationMode=anime-only' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 rounded-full bg-white/[0.03] border border-white/10 text-slate-300 font-bold text-xs transition-all hover:scale-105 hover:bg-white/10 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-16">
        <ContentRow title="🔥 Trending Animation" items={normTv([...(adultP1?.results || []).slice(0, 10), ...(kidsP1?.results || []).slice(0, 10)])} type="tv" />
        <ContentRow title="🌙 Adult Animation" items={adultAnim} type="tv" />
        <ContentRow title="🎬 Animated Masterpieces (Pixar & Disney)" items={pixarDisney} type="movie" />
        <ContentRow title="😂 Comedy Cartoons" items={adultSwim} type="tv" />
        <ContentRow title="🦸 Action & Superhero" items={dcSuperhero} type="tv" />
        <ContentRow title="⚔️ Anime-Inspired Western Epics" items={animeWestern} type="tv" />
        <ContentRow title="🧒 Kids & Family TV" items={kidsAnim} type="tv" />
        <ContentRow title="🏡 Nickelodeon & Disney Style" items={nickelodeon} type="tv" />
        <ContentRow title="🗺️ Adventure Cartoons" items={adventure} type="tv" />
        <ContentRow title="📺 Classic Cartoons" items={classicAnim} type="tv" />
        <ContentRow title="🎨 Stop-Motion Wonders" items={stopMotion} type="movie" />
        <ContentRow title="🎥 All Animated Films" items={animFilms} type="movie" />
      </div>
    </div>
  );
}
