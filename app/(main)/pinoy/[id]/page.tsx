import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Captions, Play, Star, Tv } from 'lucide-react';
import { PinoyPlayer } from '@/components/pinoy/pinoy-player';
import { PinoyRail } from '@/components/pinoy/pinoy-card';
import { PinoySourceCards } from '@/components/pinoy/pinoy-source-cards';
import { TrailerButton } from '@/components/ui/trailer-button';
import { tmdb } from '@/lib/tmdb/api';

type PinoyDetailPageProps = {
  params: {
    id: string;
  };
};

export async function generateMetadata({ params }: PinoyDetailPageProps) {
  const { id } = await params;
  try {
    const details = await tmdb.getDetails('tv', id);
    return {
      title: `${details.name || 'Pinoy Drama'} | StreamVault`,
    };
  } catch {
    return { title: 'Pinoy Drama | StreamVault' };
  }
}

export default async function PinoyDetailPage({ params }: PinoyDetailPageProps) {
  const { id } = await params;

  if (!/^\d+$/.test(id)) notFound();

  let details: any;
  try {
    details = await tmdb.getDetails('tv', id);
  } catch (error) {
    console.error('Pinoy details failed', error);
    notFound();
  }

  const title = details.name || details.title || 'Pinoy Drama';
  const backdrop = details.backdrop_path
    ? `https://image.tmdb.org/t/p/original${details.backdrop_path}`
    : null;
  const poster = details.poster_path
    ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
    : null;
  const episodeCount =
    Number(details.number_of_episodes || 0) ||
    Number(details.seasons?.find((season: any) => season.season_number === 1)?.episode_count || 0) ||
    120;
  const year = (details.first_air_date || '').split('-')[0];
  const similar = details.similar?.results || [];
  const videos = details.videos?.results || [];
  const trailer =
    videos.find((video: any) => video.site === 'YouTube' && video.type === 'Trailer') ||
    videos.find((video: any) => video.site === 'YouTube');
  const seasons = (details.seasons || []).filter((season: any) => season.season_number > 0);
  const networkNames = (details.networks || []).map((network: any) => network.name).filter(Boolean).join(', ');

  return (
    <div className="min-h-full bg-bg">
      <section className="relative overflow-hidden border-b border-border">
        {backdrop ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={backdrop} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/90 to-bg/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />

        <div className="relative z-10 grid gap-8 px-6 py-10 md:px-12 lg:grid-cols-[220px_minmax(0,1fr)] lg:py-14">
          <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-2xl shadow-black/40 lg:block">
            {poster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={poster} alt={title} className="aspect-[2/3] h-full w-full object-cover" />
            ) : (
              <div className="grid aspect-[2/3] place-items-center p-4 text-center text-sm text-muted">
                {title}
              </div>
            )}
          </div>

          <div className="flex flex-col justify-end">
            <Link href="/pinoy" className="mb-8 inline-flex w-fit items-center gap-2 text-sm font-bold text-muted hover:text-text">
              <ArrowLeft size={16} />
              Pinoy Drama Hub
            </Link>
            <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-accent">
              Official sources plus universal playback
            </div>
            <h1 className="max-w-4xl text-4xl font-black leading-tight md:text-6xl">{title}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted">
              {year ? (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar size={15} />
                  {year}
                </span>
              ) : null}
              {details.vote_average ? (
                <span className="inline-flex items-center gap-1.5">
                  <Star size={15} className="fill-yellow-400 text-yellow-400" />
                  {Number(details.vote_average).toFixed(1)}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <Tv size={15} />
                {episodeCount} episodes
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Captions size={15} />
                English links available
              </span>
              {details.status ? <span>{details.status}</span> : null}
              {networkNames ? <span>{networkNames}</span> : null}
            </div>
            {details.overview ? (
              <p className="mt-5 max-w-3xl text-base leading-7 text-muted">{details.overview}</p>
            ) : null}
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a
                href="#episodes"
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-black text-black transition hover:bg-white/90"
              >
                <Play size={15} className="fill-current" />
                Start watching
              </a>
              <TrailerButton youtubeKey={trailer?.key} />
              <Link
                href="/discover?vertical=pinoy&contentType=tv&originCountry=PH&originalLanguage=tl&selectedGenres=Drama&sortBy=rating"
                className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
              >
                More Pinoy dramas
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="space-y-12 px-6 py-8 md:px-12">
        <div id="episodes" className="scroll-mt-24">
          <PinoyPlayer
            tmdbId={id}
            title={title}
            overview={details.overview}
            posterPath={details.poster_path}
            backdropPath={details.backdrop_path}
            releaseDate={details.first_air_date}
            seasons={seasons}
          />
        </div>

        <PinoySourceCards title={title} />
        {seasons.length > 0 ? (
          <section className="rounded-2xl border border-border bg-surface/70 p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">Season guide</p>
                <h2 className="mt-1 text-xl font-black md:text-2xl">Episodes and structure</h2>
              </div>
              <span className="text-xs font-bold text-muted">{details.number_of_seasons || seasons.length} seasons</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {seasons.slice(0, 9).map((season: any) => (
                <div key={season.id || season.season_number} className="rounded-xl border border-white/10 bg-bg/60 p-3">
                  <p className="text-sm font-black">{season.name || `Season ${season.season_number}`}</p>
                  <p className="mt-1 text-xs text-muted">{season.episode_count || 0} episodes</p>
                  {season.overview ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/45">{season.overview}</p> : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}
        <PinoyRail title="More Filipino Dramas" items={similar} />
      </div>
    </div>
  );
}
