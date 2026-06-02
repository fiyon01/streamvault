'use client';

import { useState, useEffect } from 'react';
import { Disc3 } from 'lucide-react';

interface Track {
  track_number: number;
  title: string;
  artist: string;
  album: string;
  scene_description: string;
  spotify_url: string;
  apple_music_url: string;
  youtube_music_url: string;
}

interface Section {
  label: string;
  tracks: Track[];
}

interface SoundtrackTabProps {
  contentId: string;
  contentType: 'movie' | 'tv';
  title: string;
  isAnime?: boolean;
}

function TrackRow({ track }: { track: Track }) {
  return (
    <div className="flex items-center gap-4 py-3.5 px-4 rounded-xl hover:bg-white/[0.03] transition-colors group">
      {/* Number */}
      <span className="w-6 text-right text-sm text-white/25 font-mono shrink-0">
        {track.track_number}
      </span>

      {/* Title + info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm leading-snug truncate">{track.title}</p>
        <p className="text-xs text-white/45 truncate mt-0.5">{track.artist}</p>
        {track.scene_description && (
          <p className="text-[10px] text-white/25 italic mt-0.5">{track.scene_description}</p>
        )}
      </div>

      {/* Platform links — visible on hover */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <a
          href={track.spotify_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#1DB954]/10 text-[#1DB954] border border-[#1DB954]/20 hover:bg-[#1DB954]/20 transition-colors whitespace-nowrap"
        >
          Spotify
        </a>
        <a
          href={track.apple_music_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20 hover:bg-pink-500/20 transition-colors whitespace-nowrap"
        >
          Apple Music
        </a>
        <a
          href={track.youtube_music_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors whitespace-nowrap hidden sm:block"
        >
          YT Music
        </a>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 py-3.5 px-4">
      <div className="w-6 h-3 bg-white/5 rounded animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-white/8 rounded w-2/5 animate-pulse" />
        <div className="h-2.5 bg-white/5 rounded w-1/4 animate-pulse" />
      </div>
      <div className="flex gap-2 shrink-0">
        <div className="h-5 w-16 bg-white/5 rounded-full animate-pulse" />
        <div className="h-5 w-20 bg-white/5 rounded-full animate-pulse" />
      </div>
    </div>
  );
}

export function SoundtrackTab({ contentId, contentType, title, isAnime = false }: SoundtrackTabProps) {
  const [sections, setSections] = useState<Section[]>([]);
  const [totalTracks, setTotalTracks] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (fetched) return;
    setFetched(true);

    (async () => {
      try {
        const res = await fetch('/api/music/soundtrack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contentId, contentType, title, isAnime }),
        });
        const data = await res.json();
        setSections(data.sections || []);
        setTotalTracks(data.totalTracks || 0);
      } catch {
        setSections([]);
        setTotalTracks(0);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [contentId, contentType, title, isAnime, fetched]);

  return (
    <div className="space-y-8">
      {/* Disclaimer */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
        <Disc3 size={16} className="text-white/30 shrink-0" />
        <p className="text-xs text-white/35 leading-relaxed">
          StreamVault doesn&apos;t host this music. Links open in your preferred streaming app.
        </p>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-1">
          {[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && totalTracks === 0 && (
        <div className="py-20 flex flex-col items-center gap-4 text-center">
          <div className="text-5xl">🎵</div>
          <div>
            <p className="font-bold text-white/60 text-base">No soundtrack data available</p>
            <p className="text-sm text-white/30 mt-1 max-w-xs">
              Try searching directly on Spotify, Apple Music, or YouTube Music.
            </p>
          </div>
          <div className="flex gap-3 mt-2">
            <a
              href={`https://open.spotify.com/search/${encodeURIComponent(title + ' soundtrack')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-bold px-4 py-2 rounded-xl bg-[#1DB954]/10 text-[#1DB954] border border-[#1DB954]/20 hover:bg-[#1DB954]/20 transition-colors"
            >
              Search Spotify
            </a>
            <a
              href={`https://music.apple.com/search?term=${encodeURIComponent(title + ' soundtrack')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-bold px-4 py-2 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20 hover:bg-pink-500/20 transition-colors"
            >
              Search Apple Music
            </a>
          </div>
        </div>
      )}

      {/* Track sections */}
      {!isLoading && sections.map((section) => (
        <div key={section.label}>
          {/* Section header */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
              {section.label}
            </span>
            <span className="text-[10px] text-white/20 font-medium px-2 py-0.5 rounded-full border border-white/10">
              {section.tracks.length} tracks
            </span>
            <div className="flex-1 h-px bg-white/[0.05]" />
          </div>

          {/* Tracks */}
          <div className="space-y-0.5">
            {section.tracks.map((track) => (
              <TrackRow key={`${track.track_number}-${track.title}`} track={track} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
