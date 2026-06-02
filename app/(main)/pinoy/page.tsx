import Link from 'next/link';
import { Captions, ExternalLink, MonitorPlay, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { PinoyLiveChannels } from '@/components/pinoy/pinoy-live-channels';
import { PinoyRail } from '@/components/pinoy/pinoy-card';
import { PinoySourceCards } from '@/components/pinoy/pinoy-source-cards';
import { ContentCard } from '@/components/ui/content-card';
import { PINOY_PRIMARY_LANGUAGE } from '@/lib/pinoy/sources';
import { tmdb } from '@/lib/tmdb/api';

export const metadata = {
  title: 'Pinoy Drama | StreamVault',
};

async function safeDiscover(params: Record<string, string>, fallbackParams?: Record<string, string>) {
  try {
    const data = await tmdb.discoverTv({
      with_origin_country: 'PH',
      include_adult: 'false',
      ...params,
    });
    const results = data?.results || [];
    if (results.length || !fallbackParams) return results;
  } catch (error) {
    console.error('Pinoy discovery failed', error);
  }

  if (!fallbackParams) return [];

  try {
    const fallback = await tmdb.discoverTv({
      with_origin_country: 'PH',
      include_adult: 'false',
      ...fallbackParams,
    });
    return fallback?.results || [];
  } catch (error) {
    console.error('Pinoy fallback discovery failed', error);
    return [];
  }
}

export default async function PinoyPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [popular, topRated, recent, englishFriendly] = await Promise.all([
    safeDiscover(
      { with_original_language: PINOY_PRIMARY_LANGUAGE, sort_by: 'popularity.desc' },
      { sort_by: 'popularity.desc' }
    ),
    safeDiscover(
      { with_original_language: PINOY_PRIMARY_LANGUAGE, sort_by: 'vote_average.desc', 'vote_count.gte': '20' },
      { sort_by: 'vote_average.desc', 'vote_count.gte': '20' }
    ),
    safeDiscover(
      {
        with_original_language: PINOY_PRIMARY_LANGUAGE,
        sort_by: 'first_air_date.desc',
        'first_air_date.lte': today,
      },
      { sort_by: 'first_air_date.desc', 'first_air_date.lte': today }
    ),
    safeDiscover(
      { with_original_language: 'en', sort_by: 'popularity.desc' },
      { with_original_language: PINOY_PRIMARY_LANGUAGE, sort_by: 'popularity.desc' }
    ),
  ]);
  const pinoyMovies = await tmdb.discoverMovies({
    with_origin_country: 'PH',
    with_original_language: PINOY_PRIMARY_LANGUAGE,
    include_adult: 'false',
    sort_by: 'popularity.desc',
  }).then((data) => data?.results || []).catch(() => []);

  const hero = popular[0];
  const backdrop = hero?.backdrop_path
    ? `https://image.tmdb.org/t/p/original${hero.backdrop_path}`
    : null;

  return (
    <div className="min-h-full bg-bg">
      <section className="relative min-h-[540px] overflow-hidden border-b border-border">
        {backdrop ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={backdrop}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-45"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/80 to-bg/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent" />

        <div className="relative z-10 flex min-h-[540px] max-w-6xl flex-col justify-end px-6 pb-14 pt-24 md:px-12">
          <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-accent">
            <ShieldCheck size={14} />
            Official sources first
          </div>
          <h1 className="max-w-3xl text-4xl font-black leading-tight md:text-6xl">
            Pinoy teleseryes without the search chaos.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted md:text-lg">
            Find Filipino dramas, English-friendly options, official free platforms,
            live Pinoy TV, and TMDB-matched episodes in one clean place.
          </p>
          {hero ? (
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href={`/pinoy/${hero.id}`}
                className="rounded-full bg-white px-5 py-2.5 text-sm font-black text-black transition hover:bg-white/90"
              >
                Open {hero.name}
              </Link>
              <a
                href={`https://www.iwanttfc.com/search?q=${encodeURIComponent(hero.name || 'Pinoy drama')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Search iWantTFC
                <ExternalLink size={14} />
              </a>
              <Link
                href="/discover?vertical=pinoy&contentType=tv&originCountry=PH&originalLanguage=tl&selectedGenres=Drama&sortBy=popularity"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Advanced Pinoy filters
                <SlidersHorizontal size={14} />
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      <div className="space-y-12 px-6 py-10 md:px-12">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-surface/70 p-4">
            <MonitorPlay size={20} className="text-accent" />
            <h2 className="mt-3 text-base font-black">Free official links</h2>
            <p className="mt-2 text-sm leading-6 text-muted">iWantTFC, BlastTV, and Samsung TV Plus stay visible before any fallback.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-surface/70 p-4">
            <Captions size={20} className="text-accent" />
            <h2 className="mt-3 text-base font-black">English-friendly</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Dubbed and subtitled access is surfaced through official provider searches.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-surface/70 p-4">
            <ShieldCheck size={20} className="text-accent" />
            <h2 className="mt-3 text-base font-black">Clean fallback model</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Community sources are clearly labeled external options, not hidden surprises.</p>
          </div>
        </div>

        <PinoyRail title="Popular Pinoy Dramas" items={popular} />
        <div className="grid gap-3 md:grid-cols-3">
          <Link href="/discover?vertical=pinoy&contentType=tv&originCountry=PH&originalLanguage=tl&selectedGenres=Drama,Romance&sortBy=rating" className="rounded-2xl border border-white/10 bg-surface/70 p-4 transition hover:border-accent/40 hover:bg-accent/10">
            <h2 className="text-base font-black">Teleserye romance</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Discover stays locked to Philippine TV, Tagalog, and drama-first results.</p>
          </Link>
          <Link href="/discover?vertical=pinoy&contentType=tv&originCountry=PH&originalLanguage=tl&maxEpisodeRuntime=45&sortBy=popularity" className="rounded-2xl border border-white/10 bg-surface/70 p-4 transition hover:border-accent/40 hover:bg-accent/10">
            <h2 className="text-base font-black">Quick episode nights</h2>
            <p className="mt-2 text-sm leading-6 text-muted">For users who want an easy weeknight episode instead of a long hunt.</p>
          </Link>
          <Link href="/discover?vertical=pinoy&contentType=tv&originCountry=PH&requireDub=true&requireSub=true&sortBy=popularity" className="rounded-2xl border border-white/10 bg-surface/70 p-4 transition hover:border-accent/40 hover:bg-accent/10">
            <h2 className="text-base font-black">English-friendly</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Search with dub and subtitle intent while preserving the Pinoy catalogue.</p>
          </Link>
        </div>
        <PinoyRail title="Highest Rated Teleseryes" items={topRated} />
        <PinoyRail title="Recently Aired" items={recent} />
        <PinoyRail title="English-Friendly Starting Points" items={englishFriendly} label="English-friendly" />
        {pinoyMovies.length > 0 ? (
          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-xl font-black md:text-2xl">Filipino Movies</h2>
              <Link href="/discover?vertical=pinoy&contentType=movie&originCountry=PH&originalLanguage=tl&sortBy=popularity" className="text-xs font-black uppercase tracking-[0.16em] text-muted hover:text-white">
                More movie filters
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
              {pinoyMovies.slice(0, 12).map((item: any) => (
                <ContentCard
                  key={item.id}
                  id={String(item.id)}
                  title={item.title || item.name}
                  posterPath={item.poster_path}
                  type="movie"
                  year={(item.release_date || '').split('-')[0]}
                  rating={Number(item.vote_average || 0)}
                />
              ))}
            </div>
          </section>
        ) : null}
        <PinoySourceCards />
        <PinoyLiveChannels />
      </div>
    </div>
  );
}
