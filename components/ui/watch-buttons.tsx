'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Play, Film, X } from 'lucide-react';

interface WatchButtonsProps {
  /** TMDB id of the content */
  tmdbId: string;
  /** movie | tv | show — used for routing */
  type: 'movie' | 'tv' | 'show';
  /** YouTube video key for the official trailer */
  youtubeKey: string | null;
}

function TrailerModal({ youtubeKey, onClose }: { youtubeKey: string; onClose: () => void }) {
  // Lock body scroll and listen for Escape — also pause/resume ambient music
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    window.dispatchEvent(new Event('sv-video-play'));
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = '';
      window.dispatchEvent(new Event('sv-video-pause'));
      window.removeEventListener('keydown', handler);
    };
  }, [onClose]);

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-y-0 left-0 right-0 lg:left-[var(--sidebar-w,0px)] z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-2xl animate-in fade-in duration-200 sm:p-6"
    >
      <div
        className="relative flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-black shadow-[0_0_80px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-200 sm:h-auto sm:max-w-5xl sm:aspect-video sm:rounded-2xl sm:border sm:border-white/10"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close trailer"
          className="absolute top-[max(12px,env(safe-area-inset-top))] right-3 z-10 w-11 h-11 rounded-full bg-black/75 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          <X size={20} />
        </button>

        <iframe
          key={youtubeKey}
          src={`https://www.youtube.com/embed/${youtubeKey}?autoplay=1&modestbranding=1&rel=0`}
          className="aspect-video w-full border-0 sm:h-full"
          allowFullScreen
          allow="autoplay; fullscreen"
        />
      </div>
    </div>,
    document.body
  );
}

export function WatchButtons({ tmdbId, type, youtubeKey }: WatchButtonsProps) {
  const router = useRouter();
  const [showTrailer, setShowTrailer] = useState(false);

  // Resolve the correct watch route
  const watchRoute = type === 'movie'
    ? `/watch/movie/${tmdbId}`
    : `/watch/show/${tmdbId}`;

  const closeTrailer = useCallback(() => setShowTrailer(false), []);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        {/* Watch Now → dedicated full-screen player page (no sidebar) */}
        {tmdbId && (
          <button
            onClick={() => router.push(watchRoute)}
            className="flex items-center gap-2 px-8 py-3.5 bg-accent hover:bg-accent/90 text-white font-bold rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-[0_0_30px_rgba(37,99,235,0.35)] text-base shadow-lg"
          >
            <Play size={18} className="fill-current" />
            {type === 'movie' ? 'Watch Now' : 'Watch Episodes'}
          </button>
        )}

        {/* Watch Trailer → inline overlay respecting the sidebar */}
        {youtubeKey && (
          <button
            onClick={() => setShowTrailer(true)}
            className="flex items-center gap-2 px-6 py-3.5 bg-white/10 border border-white/20 text-white font-bold rounded-xl hover:bg-white/20 transition-all text-sm backdrop-blur-sm"
          >
            <Film size={16} /> Watch Trailer
          </button>
        )}
      </div>

      {showTrailer && youtubeKey && (
        <TrailerModal youtubeKey={youtubeKey} onClose={closeTrailer} />
      )}
    </>
  );
}
