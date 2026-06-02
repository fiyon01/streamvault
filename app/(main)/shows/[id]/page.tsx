import { tmdb } from '@/lib/tmdb/api';
import { SeasonQualityDashboard } from '@/components/show/season-quality-dashboard';
import { CommitmentCalculator } from '@/components/show/commitment-calculator';
import { SkipGuide } from '@/components/show/skip-guide';
import { generateSkipGuide } from '@/lib/show/skip-guide';
import { getOrCreateEnhancedDNA } from '@/lib/recommendations/content-dna-enhanced';
import { ContentRow } from '@/components/ui/content-row';
import { WatchlistButton } from '@/components/ui/watchlist-button';
import { WatchButtons } from '@/components/ui/watch-buttons';
import { DetailTabs } from '@/components/music/detail-tabs';
import Image from 'next/image';
import { notFound } from 'next/navigation';

export default async function ShowDetailPage({ params }: { params: { id: string } }) {
  const resolvedParams = await params;
  const showId = resolvedParams.id;

  if (!/^\d+$/.test(showId)) notFound();

  let show: any = null;
  let dna: any = null;
  let skipGuide: any[] = [];

  try {
    show = await tmdb.getDetails('tv', showId);
  } catch (error) {
    console.error('Show detail failed:', error);
    notFound();
  }

  [dna, skipGuide] = await Promise.all([
    getOrCreateEnhancedDNA(showId, 'tv').catch((error) => {
      console.error('Show DNA failed:', error);
      return null;
    }),
    generateSkipGuide(showId, show?.name || 'Unknown Title').catch((error) => {
      console.error('Skip guide failed:', error);
      return [];
    }),
  ]);

  if (!show || show.success === false) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="text-6xl">📺</div>
          <h1 className="text-2xl font-bold">Show not found</h1>
          <p className="text-muted">This show doesn't exist or couldn't be loaded.</p>
        </div>
      </div>
    );
  }

  const showTitle = show.name;
  const finalSkipGuide = skipGuide;

  const year = show.first_air_date?.split('-')[0];
  const rating = show.vote_average?.toFixed(1);
  const statusColor = show.status === 'Ended' ? 'bg-blue-500/20 text-blue-400'
    : show.status === 'Returning Series' ? 'bg-green-500/20 text-green-400'
    : 'bg-yellow-500/20 text-yellow-400';

  const videos = show.videos?.results || [];
  const trailer = videos.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer') || videos.find((v: any) => v.site === 'YouTube');
  const youtubeKey = trailer?.key || null;

  const mappedSeasons = show.seasons
    ?.filter((s: any) => s.season_number > 0)
    .map((s: any) => ({
      seasonNumber: s.season_number,
      averageRating: s.vote_average || 0,
      episodeCount: s.episode_count,
      airDate: s.air_date,
      fillerPercentage: 0,
    })) || [];

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>

      {/* ── HERO SECTION ── */}
      <div className="relative w-full" style={{ minHeight: '80vh' }}>
        {/* Full bleed backdrop */}
        {show.backdrop_path && (
          <div className="absolute inset-0">
            <Image
              src={`https://image.tmdb.org/t/p/original${show.backdrop_path}`}
              alt={show.name}
              fill
              priority
              className="object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
          </div>
        )}

        {/* Hero Content */}
        <div className="relative z-10 flex flex-col justify-end min-h-[80vh] pb-12 px-6 md:px-12 lg:px-16 max-w-7xl mx-auto w-full">
          <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-end">

            {/* Poster */}
            {show.poster_path && (
              <div className="hidden md:block flex-shrink-0 w-48 lg:w-56 rounded-2xl overflow-hidden shadow-[0_32px_64px_rgba(0,0,0,0.8)] border border-white/10 -mb-2">
                <Image
                  src={`https://image.tmdb.org/t/p/w500${show.poster_path}`}
                  alt={show.name}
                  width={300}
                  height={450}
                  className="w-full h-auto"
                />
              </div>
            )}

            {/* Info */}
            <div className="flex-1 space-y-5 max-w-3xl">
              {/* Genres */}
              <div className="flex flex-wrap gap-2">
                {show.genres?.slice(0, 4).map((g: any) => (
                  <span key={g.id} className="text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm">
                    {g.name}
                  </span>
                ))}
              </div>

              {/* Title */}
              <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none">
                {show.name}
              </h1>

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium">
                <span className="flex items-center gap-1.5 text-yellow-400 font-bold text-base">
                  ⭐ {rating}
                </span>
                <span className="text-muted">·</span>
                <span>{year}</span>
                <span className="text-muted">·</span>
                <span>{show.number_of_seasons} Seasons</span>
                <span className="text-muted">·</span>
                <span>{show.number_of_episodes} Episodes</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${statusColor}`}>
                  {show.status}
                </span>
              </div>

              {/* AI Verdict Badge */}
              {dna?.ending_quality && (
                <div className="flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-lg px-3 py-2 w-fit">
                  <span className="text-lg">🎯</span>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-accent tracking-tighter">AI Verdict on Ending</div>
                    <div className="text-sm font-bold capitalize">{dna.ending_quality} Finale</div>
                  </div>
                </div>
              )}

              {/* Overview */}
              <div className="relative group/overview">
                <p className="text-base md:text-lg leading-relaxed text-slate-300 max-w-2xl line-clamp-4 group-hover/overview:line-clamp-none transition-all duration-300">
                  {show.overview}
                </p>
                <div className="text-xs text-accent mt-1 opacity-0 group-hover/overview:opacity-100 transition-opacity absolute -bottom-5">
                  Hover to read full description
                </div>
              </div>

              {/* CTA */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <WatchButtons tmdbId={showId} type="show" youtubeKey={youtubeKey} />
                <WatchlistButton
                  tmdbId={showId}
                  title={show.name}
                  type="tv"
                  posterPath={show.poster_path}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 pb-20 mt-12">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Season Quality Dashboard */}
            {mappedSeasons.length > 0 && (
              <section className="-mt-4">
                <SeasonQualityDashboard
                  seasons={mappedSeasons}
                  showTitle={show.name}
                  isCompleted={show.status === 'Ended'}
                />
              </section>
            )}

            {/* Tabbed Content: Overview + Soundtrack */}
            <DetailTabs
              contentId={showId}
              contentType="tv"
              title={show.name}
              isAnime={show.genres?.some((g: any) => g.name === 'Animation')}
              castSection={
                show.credits?.cast?.length > 0 ? (
                  <section className="mb-16">
                    <h2 className="text-2xl font-bold mb-6">Top Cast</h2>
                    <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
                      {show.credits.cast.slice(0, 12).map((person: any) => (
                        <div key={person.id} className="flex-shrink-0 text-center w-20 group">
                          <div className="w-20 h-20 rounded-full overflow-hidden bg-surface border-2 border-border group-hover:border-accent transition mx-auto mb-2">
                            {person.profile_path ? (
                              <Image
                                src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                                alt={person.name}
                                width={80}
                                height={80}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl bg-surface">👤</div>
                            )}
                          </div>
                          <div className="text-xs font-semibold line-clamp-1">{person.name}</div>
                          <div className="text-[10px] text-muted line-clamp-1">{person.character}</div>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null
              }
            />
          </div>

          <div className="space-y-6">
            {/* Commitment Calculator */}
            <CommitmentCalculator 
              totalEpisodes={show.number_of_episodes} 
              avgRuntime={show.episode_run_time?.[0] || 45} 
              showTitle={show.name} 
            />

            {/* Skip Guide */}
            {finalSkipGuide.length > 0 && (
              <SkipGuide guide={finalSkipGuide} showTitle={show.name} />
            )}

            {/* AI Insights Sidebar */}
            {dna && (
              <div className="bg-surface/50 border border-border rounded-xl p-6 space-y-4">
                <h3 className="font-bold flex items-center gap-2">
                  <span>🧠</span> VAULT Intelligence
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">Pacing</span>
                    <span className="font-bold capitalize">{dna.pacing_profile}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">Complexity</span>
                    <span className="font-bold capitalize">{dna.complexity_level}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">Target Audience</span>
                    <span className="font-bold capitalize">{dna.target_audience}</span>
                  </div>
                </div>
                
                <p className="text-[11px] text-muted leading-relaxed italic border-t border-border/30 pt-3">
                  "{dna.raw_analysis}"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Similar Shows */}
        {show.similar?.results?.length > 0 && (
          <section className="mt-12">
            <ContentRow
              title="You Might Also Like"
              items={show.similar.results}
              type="tv"
            />
          </section>
        )}
      </div>
    </div>
  );
}
