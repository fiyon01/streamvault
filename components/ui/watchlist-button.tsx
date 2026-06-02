'use client';

import { useState, useEffect, useTransition } from 'react';
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from '@/app/actions/watchlist';
import { cn } from '@/lib/utils/cn';

interface WatchlistButtonProps {
  tmdbId: string;
  title: string;
  type: 'movie' | 'tv';
  posterPath: string | null;
  className?: string;
  compact?: boolean;
}

export function WatchlistButton({ tmdbId, title, type, posterPath, className, compact }: WatchlistButtonProps) {
  const [inWatchlist, setInWatchlist] = useState(false);
  const [checked, setChecked] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    isInWatchlist(tmdbId).then((result) => {
      if (!cancelled) {
        setInWatchlist(result);
        setChecked(true);
      }
    });
    return () => { cancelled = true; };
  }, [tmdbId]);

  const handleToggle = () => {
    // Optimistic update
    const next = !inWatchlist;
    setInWatchlist(next);

    startTransition(async () => {
      if (next) {
        const result = await addToWatchlist({
          tmdb_id: tmdbId,
          title,
          type,
          poster_path: posterPath || '',
        });
        if (!result.success) setInWatchlist(!next); // Revert on fail
      } else {
        const result = await removeFromWatchlist(tmdbId);
        if (!result.success) setInWatchlist(!next); // Revert on fail
      }
    });
  };

  if (!checked) {
    // Show skeleton while checking
    return (
      <button
        disabled
        className={cn(
          'px-8 py-3 font-bold rounded-lg border bg-white/5 border-white/10 text-white/40 flex items-center gap-2 opacity-50',
          compact && 'px-4 py-2 text-sm',
          className
        )}
      >
        <span className="text-lg animate-spin">↻</span>
        {!compact && 'Checking...'}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={cn(
        'px-8 py-3 font-bold rounded-lg border transition-all flex items-center gap-2 backdrop-blur-md disabled:opacity-60',
        inWatchlist
          ? 'bg-accent/20 border-accent text-accent hover:bg-red-500/20 hover:border-red-500 hover:text-red-400'
          : 'bg-white/10 text-white border-white/20 hover:bg-white/20',
        compact && 'px-4 py-2 text-sm',
        className
      )}
    >
      <span className="text-lg transition-transform duration-200" style={{ transform: inWatchlist ? 'scale(1.2)' : 'scale(1)' }}>
        {isPending ? '↻' : inWatchlist ? '✓' : '+'}
      </span>
      {inWatchlist ? (compact ? 'Saved' : 'In Watchlist') : (compact ? 'Save' : 'Add to Watchlist')}
    </button>
  );
}
