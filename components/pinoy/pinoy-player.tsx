'use client';

import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Captions, Clock3, ExternalLink, Server, ShieldCheck } from 'lucide-react';
import { recordWatchHistory } from '@/app/actions/history';
import { VideoPlayer } from '@/components/player/video-player';
import { getPinoySearchLinks } from '@/lib/pinoy/sources';

type SeasonInfo = {
  season_number: number;
  name?: string;
  episode_count?: number;
};

type PinoyPlayerProps = {
  tmdbId: string;
  title: string;
  overview?: string | null;
  posterPath?: string | null;
  backdropPath?: string | null;
  releaseDate?: string | null;
  seasons?: SeasonInfo[];
};

export function PinoyPlayer({
  tmdbId,
  title,
  overview,
  posterPath,
  backdropPath,
  releaseDate,
  seasons = [],
}: PinoyPlayerProps) {
  const validSeasons = useMemo(
    () => seasons.filter((season) => season.season_number > 0 && Number(season.episode_count || 0) > 0),
    [seasons]
  );
  const [season, setSeason] = useState(validSeasons[0]?.season_number || 1);
  const activeSeason = validSeasons.find((item) => item.season_number === season);
  const maxEpisodes = Math.max(1, Number(activeSeason?.episode_count || seasons[0]?.episode_count || 120));
  const [episode, setEpisode] = useState(1);
  const searchLinks = getPinoySearchLinks(title);

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
      isPinoyContent: true,
    }).catch(() => {});
  }, [tmdbId, title, overview, posterPath, backdropPath, releaseDate, season, episode]);

  const goToEpisode = (nextEpisode: number) => {
    setEpisode(Math.min(maxEpisodes, Math.max(1, nextEpisode)));
  };

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl shadow-black/50">
        <div className="flex flex-col gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
              Pinoy drama playback
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
              <Captions size={14} className="text-sky-300" />
              English links
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
          <div className="flex flex-wrap items-center gap-2">
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
            <button
              onClick={() => goToEpisode(episode + 1)}
              disabled={episode >= maxEpisodes}
              className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-white/80 transition hover:bg-white/10 disabled:opacity-35"
            >
              Next
            </button>
          </div>

          {maxEpisodes <= 120 ? (
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
          ) : (
            <label className="inline-flex items-center gap-2 text-xs font-bold text-white/55">
              Episode
              <input
                type="number"
                min={1}
                max={maxEpisodes}
                value={episode}
                onChange={(event) => goToEpisode(Number(event.target.value))}
                className="w-24 rounded-full border border-white/10 bg-black px-3 py-1.5 text-white outline-none"
              />
              <span>/ {maxEpisodes}</span>
            </label>
          )}
        </div>
      </div>

      <aside className="rounded-2xl border border-border bg-surface/70 p-4">
        <div className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
            Best access
          </p>
          <h3 className="mt-1 text-lg font-bold">Official first, player second</h3>
        </div>
        <div className="space-y-3 text-sm leading-6 text-muted">
          <p className="flex gap-3">
            <ShieldCheck size={17} className="mt-0.5 shrink-0 text-[#9ee493]" />
            StreamVault gives every TMDB-matched Pinoy drama episode controls and the main server fallback rail.
          </p>
          <p className="flex gap-3">
            <BadgeCheck size={17} className="mt-0.5 shrink-0 text-sky-300" />
            For the cleanest legal experience, start with official source links when available.
          </p>
          <p className="flex gap-3">
            <Clock3 size={17} className="mt-0.5 shrink-0 text-violet-300" />
            English dubbed or subtitled availability varies by source, so the links below search official providers first.
          </p>
        </div>

        <div className="mt-5 space-y-2">
          {searchLinks.slice(0, 4).map((source) => (
            <a
              key={source.name}
              href={source.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-bg/60 px-3 py-2.5 text-sm font-bold transition hover:border-accent/40 hover:bg-accent/10"
            >
              <span>{source.name}</span>
              <ExternalLink size={14} className="text-muted" />
            </a>
          ))}
        </div>
      </aside>
    </section>
  );
}

