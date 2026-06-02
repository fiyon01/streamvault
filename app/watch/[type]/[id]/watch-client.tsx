'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  EyeOff,
  ListVideo,
  MessageCircle,
  PlayCircle,
  Star,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react';
import { logUserSignal } from '@/app/actions/signals';
import { SceneMusicIdentifier } from '@/components/music/scene-music-identifier';
import { PlayerIntelligencePanel, type IntelligenceMode } from '@/components/player/player-intelligence-panel';
import { VideoPlayer } from '@/components/player/video-player';
import { cn } from '@/lib/utils/cn';

interface WatchClientProps {
  id: string;
  type: 'movie' | 'show';
  details: any;
  initialSeasonData?: any;
}

export function WatchClient({ id, type, details, initialSeasonData }: WatchClientProps) {
  const router = useRouter();
  const [season, setSeason] = useState(initialSeasonData?.season_number || 1);
  const [episode, setEpisode] = useState(1);
  const [seasonData, setSeasonData] = useState(initialSeasonData);
  const [isLoadingSeason, setIsLoadingSeason] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [activeSignal, setActiveSignal] = useState<'more' | 'less' | 'hide' | null>(null);
  const [signalMessage, setSignalMessage] = useState<string | null>(null);
  const [intelligenceRequest, setIntelligenceRequest] = useState<{ mode: IntelligenceMode; key: number } | null>(null);

  const title = details.title || details.name;
  const releaseYear = (details.release_date || details.first_air_date)?.split('-')[0];
  const rating = details.vote_average ? details.vote_average.toFixed(1) : null;
  const validSeasons = useMemo(
    () => details.seasons?.filter((item: any) => item.season_number > 0) || [],
    [details.seasons]
  );
  const sortedEpisodes = useMemo(
    () => [...(seasonData?.episodes || [])].sort((a: any, b: any) => a.episode_number - b.episode_number),
    [seasonData?.episodes]
  );
  const selectedEpisode = sortedEpisodes.find((item: any) => item.episode_number === episode) || sortedEpisodes[0];
  const runtime = type === 'movie' ? details.runtime : (selectedEpisode?.runtime || details.episode_run_time?.[0]);
  const synopsis = type === 'show' ? (selectedEpisode?.overview || details.overview) : details.overview;

  useEffect(() => {
    if (type !== 'show') return;

    if (season === initialSeasonData?.season_number) {
      setSeasonData(initialSeasonData);
      return;
    }

    const fetchSeason = async () => {
      setIsLoadingSeason(true);
      try {
        const res = await fetch(`/api/tmdb/season?tvId=${id}&season=${season}`);
        if (!res.ok) throw new Error(`Season request failed: ${res.status}`);
        const data = await res.json();
        setSeasonData(data);
      } catch (error) {
        console.error('Failed to fetch season', error);
        setSeasonData({ season_number: season, episodes: [] });
      } finally {
        setIsLoadingSeason(false);
      }
    };

    fetchSeason();
  }, [season, id, type, initialSeasonData]);

  const hasNext = () => {
    if (type === 'movie') return details.similar?.results?.length > 0;
    if (!sortedEpisodes.length) return false;

    const currentIndex = sortedEpisodes.findIndex((item: any) => item.episode_number === episode);
    const isLastEpisode = currentIndex >= sortedEpisodes.length - 1;
    const isLastSeason = season >= Math.max(...validSeasons.map((item: any) => item.season_number));

    return !(isLastEpisode && isLastSeason);
  };

  const handleNext = () => {
    if (type === 'movie') {
      const nextMovie = details.similar?.results?.[0];
      if (nextMovie) router.push(`/watch/movie/${nextMovie.id}`);
      return;
    }

    const currentIndex = sortedEpisodes.findIndex((item: any) => item.episode_number === episode);
    const nextEpisode = sortedEpisodes[currentIndex + 1];

    if (nextEpisode) {
      setEpisode(nextEpisode.episode_number);
      return;
    }

    const nextSeason = validSeasons.find((item: any) => item.season_number > season);
    if (nextSeason) {
      setSeason(nextSeason.season_number);
      setEpisode(1);
    }
  };

  const handleSignal = async (
    signal: 'more' | 'less' | 'hide',
    signalType: string,
    weight: number,
    message: string
  ) => {
    setActiveSignal(signal);
    setSignalMessage(message);

    try {
      await logUserSignal(id, type === 'show' ? 'tv' : 'movie', signalType, weight);
    } catch {
      setSignalMessage('Saved for this session. Recommendation sync can retry later.');
    }
  };

  const openPlayerTool = (mode: IntelligenceMode) => {
    setIntelligenceRequest({ mode, key: Date.now() });
    window.setTimeout(() => {
      document.getElementById('player-intelligence')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const nextLabel = type === 'movie'
    ? (details.similar?.results?.[0] ? `Play: ${details.similar.results[0].title}` : 'Up Next')
    : 'Next Episode';

  return (
    <div className="min-h-screen bg-[#020308] font-sans text-white selection:bg-accent/30 overflow-x-hidden">
      <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-3 p-3 sm:p-5 pointer-events-none">
        <button
          onClick={() => router.back()}
          className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/10 bg-black/55 px-4 py-2.5 text-sm font-bold text-white/90 shadow-2xl backdrop-blur-xl transition hover:border-white/30 hover:bg-white/15 hover:text-white"
        >
          <ArrowLeft size={18} />
          Browse
        </button>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={() => openPlayerTool('watch_party')}
            className="flex items-center gap-2 rounded-full border border-[#9ee493]/30 bg-black/55 px-3 py-2.5 text-sm font-black text-[#d8ffd4] shadow-2xl backdrop-blur-xl transition hover:bg-[#9ee493]/15 sm:px-4"
          >
            <MessageCircle size={18} />
            <span className="hidden sm:inline">Watch Party</span>
          </button>

        {type === 'show' && (
          <button
            onClick={() => setShowSidebar(true)}
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-black text-black shadow-2xl transition hover:bg-white/90"
          >
            <ListVideo size={18} />
            Episodes
          </button>
        )}
        </div>
      </div>

      <section className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden bg-black">
        {details.backdrop_path && (
          <Image
            src={`https://image.tmdb.org/t/p/original${details.backdrop_path}`}
            alt=""
            fill
            priority
            className="object-cover opacity-20 blur-2xl scale-110"
          />
        )}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.28),transparent_38%),linear-gradient(180deg,rgba(0,0,0,0.55),#020308_88%)]" />

        <div className="relative z-10 mx-auto w-full max-w-6xl px-0 pb-6 pt-20 sm:px-6 lg:px-10">
          <div className="relative mx-auto w-full overflow-hidden bg-black shadow-[0_40px_140px_rgba(0,0,0,0.85)] sm:rounded-2xl sm:border sm:border-white/10">
            <VideoPlayer
              tmdbId={id}
              type={type}
              title={title}
              overview={details.overview}
              posterPath={details.poster_path}
              backdropPath={details.backdrop_path}
              releaseDate={details.release_date || details.first_air_date || null}
              runtime={runtime ?? null}
              season={season}
              episode={episode}
              className="w-full"
              onNext={handleNext}
              hasNext={hasNext()}
              nextLabel={nextLabel}
            />
          </div>
        </div>

        <div className="relative z-10 mx-auto grid w-full max-w-[1920px] gap-6 px-5 pb-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-10">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3 text-xs font-black uppercase tracking-[0.18em] text-white/45">
              <span>{type === 'movie' ? 'Feature Film' : `Season ${season}${selectedEpisode ? ` / Episode ${selectedEpisode.episode_number}` : ''}`}</span>
              {releaseYear && <span>{releaseYear}</span>}
              {rating && <span className="inline-flex items-center gap-1 text-yellow-300"><Star size={13} className="fill-current" /> {rating}</span>}
              {Boolean(runtime) && <span>{runtime} min</span>}
            </div>

            <h1 className="text-4xl font-black leading-[0.95] tracking-tight text-white sm:text-6xl xl:text-7xl">
              {title}
            </h1>

            {type === 'show' && selectedEpisode?.name && (
              <p className="text-xl font-bold text-accent">{selectedEpisode.name}</p>
            )}

            {synopsis && (
              <p className="max-w-4xl text-base leading-relaxed text-white/62 sm:text-lg">
                {synopsis}
              </p>
            )}
          </div>

          <aside className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur-xl">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/35">Tune VAULT</p>
              <h2 className="mt-1 text-xl font-black text-white">Shape future picks</h2>
            </div>

            <div className="grid gap-2">
              <button
                onClick={() => handleSignal('more', 'thumbs_up', 3, 'Style boosted. VAULT will raise similar tone, pacing, cast, and genre signals without marking this title finished.')}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition',
                  activeSignal === 'more' ? 'border-green-400/50 bg-green-400/12 text-green-200' : 'border-white/10 bg-black/25 text-white/75 hover:bg-white/8'
                )}
              >
                <ThumbsUp size={18} />
                <span>
                  <span className="block font-bold text-white">More of this style</span>
                  <span className="text-xs text-white/45">Boost tone, pacing, cast, and genre</span>
                </span>
              </button>

              <button
                onClick={() => handleSignal('less', 'thumbs_down', -5, 'Noted. VAULT will lower this style in rows, One Shot, and chat recommendations.')}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition',
                  activeSignal === 'less' ? 'border-orange-400/50 bg-orange-400/12 text-orange-200' : 'border-white/10 bg-black/25 text-white/75 hover:bg-white/8'
                )}
              >
                <ThumbsDown size={18} />
                <span>
                  <span className="block font-bold text-white">Less of this style</span>
                  <span className="text-xs text-white/45">Reduce similar picks across VAULT</span>
                </span>
              </button>

              <button
                onClick={() => handleSignal('hide', 'hide_forever', -10, 'Hidden. This title is now a hard block unless you manually search for it.')}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition',
                  activeSignal === 'hide' ? 'border-red-400/50 bg-red-400/12 text-red-200' : 'border-white/10 bg-black/25 text-white/75 hover:bg-white/8'
                )}
              >
                <EyeOff size={18} />
                <span>
                  <span className="block font-bold text-white">Never suggest this</span>
                  <span className="text-xs text-white/45">Hard-block this title</span>
                </span>
              </button>
            </div>

            {signalMessage && (
              <p className="flex items-start gap-2 rounded-xl bg-white/7 px-3 py-2 text-xs font-medium text-white/65">
                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-green-300" />
                {signalMessage}
              </p>
            )}

            <SceneMusicIdentifier contentId={id} contentType={type === 'show' ? 'tv' : 'movie'} />
          </aside>

          <div className="lg:col-start-2">
            <PlayerIntelligencePanel
              tmdbId={id}
              type={type}
              title={title}
              season={season}
              episode={episode}
              episodeTitle={selectedEpisode?.name}
              runtime={runtime}
              synopsis={synopsis}
              requestedMode={intelligenceRequest?.mode}
              requestKey={intelligenceRequest?.key}
            />
          </div>
        </div>
      </section>

      {type === 'show' && (
        <>
          <div
            className={cn(
              'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-500',
              showSidebar ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            )}
            onClick={() => setShowSidebar(false)}
          />

          <div
            className={cn(
              'fixed bottom-0 right-0 top-0 z-50 flex w-full flex-col border-l border-white/10 bg-[#070913]/96 shadow-2xl backdrop-blur-3xl transition-transform duration-500 ease-out sm:w-[460px]',
              showSidebar ? 'translate-x-0' : 'translate-x-full'
            )}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-white/[0.04] p-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Now Watching</p>
                <h3 className="text-xl font-black tracking-wide text-white">Episodes</h3>
              </div>
              <button
                onClick={() => setShowSidebar(false)}
                className="rounded-full bg-white/5 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="shrink-0 bg-gradient-to-b from-white/5 to-transparent p-5">
              <div className="relative group">
                <select
                  value={season}
                  onChange={(event) => {
                    setSeason(Number(event.target.value));
                    setEpisode(1);
                  }}
                  className="w-full cursor-pointer appearance-none rounded-xl border border-white/20 bg-black/40 px-5 py-3.5 pr-10 font-bold text-white shadow-inner backdrop-blur-md transition hover:bg-white/10 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  {validSeasons.map((item: any) => (
                    <option key={item.id} value={item.season_number} className="bg-[#111] text-white">
                      Season {item.season_number}
                    </option>
                  ))}
                </select>
                <ChevronDown size={18} className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-white/70 transition group-hover:text-white" />
              </div>
            </div>

            <div className="custom-scrollbar relative flex-1 space-y-3 overflow-y-auto p-5">
              {isLoadingSeason && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 backdrop-blur-md">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
                </div>
              )}

              {!isLoadingSeason && sortedEpisodes.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm text-white/50">
                  No episode data is available for season {season} yet.
                </div>
              )}

              {sortedEpisodes.map((item: any) => {
                const isActive = item.episode_number === episode;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setEpisode(item.episode_number);
                      if (window.innerWidth < 640) setShowSidebar(false);
                    }}
                    className={cn(
                      'group flex w-full gap-4 rounded-2xl border p-3 text-left transition-all duration-300 hover:scale-[1.02] hover:bg-white/10',
                      isActive ? 'border-white/20 bg-white/15 shadow-2xl' : 'border-transparent bg-white/5'
                    )}
                  >
                    <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/50 shadow-inner transition-all group-hover:border-white/30">
                      {item.still_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w300${item.still_path}`}
                          alt={item.name}
                          fill
                          className={cn('object-cover transition-opacity duration-500', isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100')}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-medium text-white/30">No Image</div>
                      )}
                      <div className={cn('absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-all duration-300', isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100')}>
                        <PlayCircle size={32} className={isActive ? 'text-accent drop-shadow-lg' : 'text-white drop-shadow-lg'} />
                      </div>
                      {Boolean(item.runtime) && (
                        <div className="absolute bottom-1.5 right-1.5 rounded-md border border-white/10 bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm backdrop-blur-md">
                          {item.runtime}m
                        </div>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col justify-center py-1.5">
                      <h4 className={cn('line-clamp-1 text-sm font-bold transition-colors', isActive ? 'text-accent' : 'text-white/90 group-hover:text-white')}>
                        {item.episode_number}. {item.name}
                      </h4>
                      <p className="mt-1 line-clamp-2 text-xs font-medium leading-relaxed text-white/50">
                        {item.overview || 'No description available for this episode.'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
