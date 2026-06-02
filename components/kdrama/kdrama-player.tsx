'use client';

import { useEffect, useState } from 'react';
import { BadgeCheck, Clock3, Server, ShieldCheck } from 'lucide-react';
import { recordWatchHistory } from '@/app/actions/history';
import { VideoPlayer } from '@/components/player/video-player';

type KdramaPlayerProps = {
  tmdbId: string;
  title: string;
  overview?: string | null;
  posterPath?: string | null;
  backdropPath?: string | null;
  releaseDate?: string | null;
  episodeCount?: number;
  seasons?: Array<{
    season_number: number;
    name?: string;
    episode_count?: number;
  }>;
};

export function KdramaPlayer({
  tmdbId,
  title,
  overview,
  posterPath,
  backdropPath,
  releaseDate,
  episodeCount = 16,
  seasons = [],
}: KdramaPlayerProps) {
  const validSeasons = seasons.filter((season) => season.season_number > 0 && Number(season.episode_count || 0) > 0);
  const [season, setSeason] = useState(validSeasons[0]?.season_number || 1);
  const activeSeason = validSeasons.find((item) => item.season_number === season);
  const [episode, setEpisode] = useState(1);
  const maxEpisodes = Math.max(1, Number(activeSeason?.episode_count || episodeCount || 16));

  useEffect(() => {
    setEpisode((current) => Math.min(current, maxEpisodes));
  }, [maxEpisodes]);

  useEffect(() => {
    recordWatchHistory({
      tmdbId,
      mediaType: 'tv',
      title,
      overview,
      posterPath,
      backdropPath,
      releaseDate,
      positionSeconds: 1,
      completed: false,
      isKdrama: true,
    }).catch(() => {});
  }, [tmdbId, title, overview, posterPath, backdropPath, releaseDate, season, episode]);

  const goToEpisode = (nextEpisode: number) => {
    setEpisode(Math.min(maxEpisodes, Math.max(1, nextEpisode)));
  };

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl shadow-black/50">
        <div className="flex flex-col gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
              K-drama playback
            </p>
            <h2 className="mt-0.5 text-sm font-semibold text-white">
              Season {season} / Episode {episode}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-white/60">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/25 px-3 py-1.5">
              <Server size={14} className="text-[#9ee493]" />
              Universal servers
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/25 px-3 py-1.5">
              <BadgeCheck size={14} className="text-sky-300" />
              TMDB matched
            </span>
          </div>
        </div>

        <VideoPlayer
          tmdbId={tmdbId}
          type="show"
          title={title}
          overview={overview}
          posterPath={posterPath}
          backdropPath={backdropPath}
          releaseDate={releaseDate}
          season={season}
          episode={episode}
          hasNext={episode < maxEpisodes}
          nextLabel="Next episode"
          onNext={() => goToEpisode(episode + 1)}
          className="rounded-none border-0"
        />

        <div className="flex flex-col gap-3 border-t border-white/10 bg-white/[0.03] p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            {validSeasons.length > 1 ? (
              <select
                value={season}
                onChange={(event) => {
                  setSeason(Number(event.target.value));
                  setEpisode(1);
                }}
                className="rounded-full border border-white/10 bg-black px-3 py-1.5 text-xs font-bold text-white outline-none"
              >
                {validSeasons.map((item) => (
                  <option key={item.season_number} value={item.season_number}>
                    {item.name || `Season ${item.season_number}`}
                  </option>
                ))}
              </select>
            ) : null}
            <button
              onClick={() => goToEpisode(episode - 1)}
              disabled={episode <= 1}
              className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-white/80 transition hover:bg-white/10 disabled:opacity-35"
            >
              Previous
            </button>
            <span className="text-xs text-white/45">
              {episode} / {maxEpisodes}
            </span>
            <button
              onClick={() => goToEpisode(episode + 1)}
              disabled={episode >= maxEpisodes}
              className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-white/80 transition hover:bg-white/10 disabled:opacity-35"
            >
              Next
            </button>
          </div>
          <select
            value={episode}
            onChange={(event) => goToEpisode(Number(event.target.value))}
            className="rounded-full border border-white/10 bg-black px-3 py-1.5 text-xs font-bold text-white outline-none"
          >
            {Array.from({ length: maxEpisodes }, (_, index) => index + 1).map((item) => (
              <option key={item} value={item}>
                Episode {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      <aside className="rounded-2xl border border-border bg-surface/70 p-4">
        <div className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
            Access model
          </p>
          <h3 className="mt-1 text-lg font-bold">Any TMDB K-drama</h3>
        </div>
        <div className="space-y-3 text-sm leading-6 text-muted">
          <p className="flex gap-3">
            <ShieldCheck size={17} className="mt-0.5 shrink-0 text-[#9ee493]" />
            K-drama playback now uses the same StreamVault server chain as TV shows, so it is not locked to one drama API.
          </p>
          <p className="flex gap-3">
            <Clock3 size={17} className="mt-0.5 shrink-0 text-sky-300" />
            Pick an episode, then use the player source rail if one server fails.
          </p>
          <p className="rounded-xl border border-white/10 bg-bg/60 p-3 text-xs font-semibold text-white/55">
            Server order: VidSrc.to, VidSrc.me, PrimeSrc.me, VidSrc.xyz, then ad-light backups.
          </p>
        </div>
      </aside>
    </section>
  );
}
