import Link from 'next/link';
import { ExternalLink, SlidersHorizontal, ShieldCheck } from 'lucide-react';
import { KdramaRail } from '@/components/kdrama/kdrama-card';
import { tmdb } from '@/lib/tmdb/api';

export const metadata = {
  title: 'K-Drama | StreamVault',
};

async function safeDiscover(params: Record<string, string>) {
  try {
    const data = await tmdb.discoverTv({
      with_origin_country: 'KR',
      with_original_language: 'ko',
      include_adult: 'false',
      ...params,
    });
    return data?.results || [];
  } catch (error) {
    console.error('K-drama discovery failed', error);
    return [];
  }
}

export default async function KdramaPage() {
  const [popular, topRated, recent, netflixStyle] = await Promise.all([
    safeDiscover({ sort_by: 'popularity.desc' }),
    safeDiscover({ sort_by: 'vote_average.desc', 'vote_count.gte': '250' }),
    safeDiscover({ sort_by: 'first_air_date.desc', 'first_air_date.lte': new Date().toISOString().slice(0, 10) }),
    safeDiscover({ sort_by: 'popularity.desc', with_networks: '213' }),
  ]);

  const hero = popular[0];
  const backdrop = hero?.backdrop_path
    ? `https://image.tmdb.org/t/p/original${hero.backdrop_path}`
    : null;

  return (
    <div className="min-h-full bg-bg">
      <section className="relative min-h-[520px] overflow-hidden border-b border-border">
        {backdrop ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={backdrop}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-45"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/75 to-bg/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent" />

        <div className="relative z-10 flex min-h-[520px] max-w-6xl flex-col justify-end px-6 pb-14 pt-24 md:px-12">
          <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-accent">
            <ShieldCheck size={14} />
            Universal server playback
          </div>
          <h1 className="max-w-3xl text-4xl font-black leading-tight md:text-6xl">
            Korean dramas with a cleaner source chain.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted md:text-lg">
            StreamVault treats Korean dramas like real TV titles: TMDB discovery, episode selection,
            and the same server fallback rail used by the main watch page.
          </p>
          {hero ? (
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href={`/kdrama/${hero.id}`}
                className="rounded-full bg-white px-5 py-2.5 text-sm font-black text-black transition hover:bg-white/90"
              >
                Open {hero.name}
              </Link>
              <a
                href={`https://www.viki.com/search?q=${encodeURIComponent(hero.name || 'kdrama')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Viki fallback
                <ExternalLink size={14} />
              </a>
              <Link
                href="/discover?vertical=kdrama&contentType=tv&originCountry=KR&originalLanguage=ko&selectedGenres=Drama&sortBy=popularity"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Advanced K-drama filters
                <SlidersHorizontal size={14} />
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      <div className="space-y-12 px-6 py-10 md:px-12">
        <KdramaRail title="Popular Korean Dramas" items={popular} />
        <div className="grid gap-3 md:grid-cols-3">
          <Link href="/discover?vertical=kdrama&contentType=tv&originCountry=KR&originalLanguage=ko&selectedGenres=Drama,Romance&sortBy=rating" className="rounded-2xl border border-white/10 bg-surface/70 p-4 transition hover:border-accent/40 hover:bg-accent/10">
            <h2 className="text-base font-black">Romance K-dramas</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Open Discover already locked to Korean TV drama and romance.</p>
          </Link>
          <Link href="/discover?vertical=kdrama&contentType=tv&originCountry=KR&originalLanguage=ko&selectedGenres=Drama,Crime&sortBy=rating" className="rounded-2xl border border-white/10 bg-surface/70 p-4 transition hover:border-accent/40 hover:bg-accent/10">
            <h2 className="text-base font-black">Crime and revenge</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Find serious Korean thrillers without generic US shows mixing in.</p>
          </Link>
          <Link href="/discover?vertical=kdrama&contentType=tv&originCountry=KR&originalLanguage=ko&requireSub=true&sortBy=popularity" className="rounded-2xl border border-white/10 bg-surface/70 p-4 transition hover:border-accent/40 hover:bg-accent/10">
            <h2 className="text-base font-black">Subtitle-friendly</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Keep the Korean-drama intent and ask for subtitle signals.</p>
          </Link>
          <Link href="/discover?vertical=kdrama&contentType=movie&originCountry=KR&originalLanguage=ko&selectedGenres=Drama&sortBy=rating" className="rounded-2xl border border-white/10 bg-surface/70 p-4 transition hover:border-accent/40 hover:bg-accent/10">
            <h2 className="text-base font-black">Korean films</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Open Korean movie discovery for users who want a complete story tonight.</p>
          </Link>
        </div>
        <KdramaRail title="Highest Rated" items={topRated} />
        <KdramaRail title="Recently Aired" items={recent} />
        <KdramaRail title="Netflix Korean Picks" items={netflixStyle} />
      </div>
    </div>
  );
}
