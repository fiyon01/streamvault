'use client';

import { useState, useEffect } from 'react';
import { VideoPlayer } from '@/components/player/video-player';
import { getSeasonEpisodes } from '@/app/actions/tmdb';
import { cn } from '@/lib/utils/cn';
import Image from 'next/image';

interface Episode {
  id: number;
  episode_number: number;
  season_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  runtime: number;
  vote_average: number;
}

interface ShowViewerProps {
  tmdbId: string;
  seasons: {
    season_number: number;
    episode_count: number;
    name: string;
  }[];
}

export function ShowViewer({ tmdbId, seasons }: ShowViewerProps) {
  const validSeasons = seasons.filter(s => s.season_number > 0);
  
  const [activeSeason, setActiveSeason] = useState(validSeasons[0]?.season_number || 1);
  const [activeEpisode, setActiveEpisode] = useState(1);
  
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadEpisodes() {
      setIsLoading(true);
      const data = await getSeasonEpisodes(tmdbId, activeSeason);
      setEpisodes(data);
      setIsLoading(false);
    }
    loadEpisodes();
  }, [tmdbId, activeSeason]);

  return (
    <div className="space-y-8">
      {/* Player Section */}
      <section id="player" className="scroll-mt-24">
        <h2 className="text-2xl font-bold mb-6">
          Watch: Season {activeSeason} Episode {activeEpisode}
        </h2>
        <VideoPlayer 
          tmdbId={tmdbId} 
          type="show" 
          season={activeSeason} 
          episode={activeEpisode} 
        />
      </section>

      {/* Season Selector Tabs */}
      <section>
        <div className="flex gap-2 overflow-x-auto pb-2 border-b border-border hide-scrollbar">
          {validSeasons.map((s) => (
            <button
              key={s.season_number}
              onClick={() => {
                setActiveSeason(s.season_number);
                setActiveEpisode(1);
              }}
              className={cn(
                "px-4 py-2 font-medium whitespace-nowrap transition border-b-2",
                activeSeason === s.season_number 
                  ? "border-accent text-accent" 
                  : "border-transparent text-muted hover:text-text"
              )}
            >
              Season {s.season_number}
            </button>
          ))}
        </div>

        {/* Episode Grid */}
        <div className="mt-6">
          {isLoading ? (
            <div className="flex gap-4">
               {/* Skeletons */}
               {[1,2,3].map(i => (
                 <div key={i} className="flex-1 h-32 bg-white/5 animate-pulse rounded-xl" />
               ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {episodes.map((ep) => (
                <button
                  key={ep.episode_number}
                  onClick={() => {
                    setActiveEpisode(ep.episode_number);
                    window.scrollTo({ top: document.getElementById('player')?.offsetTop || 0, behavior: 'smooth' });
                  }}
                  className={cn(
                    "flex gap-3 p-2 rounded-lg border transition text-left group items-center",
                    activeEpisode === ep.episode_number
                      ? "bg-accent/10 border-accent"
                      : "bg-surface border-border hover:bg-surface/80 hover:border-white/20"
                  )}
                >
                  <div className="text-xl font-mono text-muted w-8 text-center flex-shrink-0 group-hover:text-text transition">
                    {ep.episode_number}
                  </div>
                  <div className="w-24 aspect-video bg-bg rounded overflow-hidden flex items-center justify-center flex-shrink-0 relative">
                    {ep.still_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w300${ep.still_path}`}
                        alt={ep.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <span className="text-[10px] text-muted">No Image</span>
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <span className="text-white text-xs">▶</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 py-1">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-medium text-sm truncate">{ep.name}</h4>
                      <span className="text-[10px] text-muted whitespace-nowrap">{ep.runtime || 45}m</span>
                    </div>
                    <p className="text-[11px] text-muted mt-0.5 line-clamp-1">{ep.overview || "No description available."}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
