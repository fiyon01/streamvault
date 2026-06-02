'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Clock3, Flame, Sparkles, Trash2 } from 'lucide-react';
import { ContentCard } from '@/components/ui/content-card';
import { removeFromWatchlist } from '@/app/actions/watchlist';
import { cn } from '@/lib/utils/cn';

interface WatchlistItem {
  id: string;
  tmdb_id: string;
  title: string;
  type: string;
  poster_path: string;
  added_at: string;
  release_date?: string;
  runtime?: number | null;
  rating?: number;
}

interface WatchlistGridProps {
  items: WatchlistItem[];
}

function ageInDays(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)));
}

function formatDate(dateStr: string) {
  const diffDays = ageInDays(dateStr);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

function estimateHours(item: WatchlistItem) {
  if (item.type === 'movie') return Math.max(1, Math.round((item.runtime || 110) / 60));
  return 10;
}

function scoreTonight(item: WatchlistItem) {
  const rating = item.rating || 0;
  const shortBoost = estimateHours(item) <= 2 ? 1.2 : 0;
  const freshnessPenalty = Math.min(ageInDays(item.added_at) / 365, 1.5);
  const showBoost = item.type === 'tv' ? 0.35 : 0;
  return rating + shortBoost + showBoost - freshnessPenalty;
}

function posterUrl(path?: string | null) {
  if (!path) return '';
  return path.startsWith('http') ? path : `https://image.tmdb.org/t/p/w342${path}`;
}

function hrefsFor(item: WatchlistItem) {
  if (item.tmdb_id.startsWith('mal-')) {
    const animeId = item.tmdb_id.replace(/^mal-/, '');
    return {
      detail: `/anime/${animeId}`,
      watch: `/anime/${animeId}`,
      label: item.type === 'movie' ? 'Anime Film' : 'Anime',
    };
  }

  return {
    detail: `/${item.type === 'tv' ? 'shows' : 'movies'}/${item.tmdb_id}`,
    watch: `/watch/${item.type === 'tv' ? 'show' : 'movie'}/${item.tmdb_id}`,
    label: item.type === 'tv' ? 'Series' : 'Movie',
  };
}

function WatchlistCard({ item, onRemove, removing }: { item: WatchlistItem; onRemove: (tmdbId: string) => void; removing: string | null }) {
  const hrefs = hrefsFor(item);

  if (item.tmdb_id.startsWith('mal-')) {
    return (
      <div className="group relative">
        <Link href={hrefs.detail} className="block overflow-hidden rounded-xl border border-white/8 bg-surface transition group-hover:scale-105 group-hover:border-[#8B5CF6]/35">
          <div className="relative aspect-[2/3] bg-white/[0.03]">
            {item.poster_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={posterUrl(item.poster_path)} alt={item.title} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-white/25">Anime</div>
            )}
          </div>
          <div className="p-2">
            <h3 className="line-clamp-1 text-sm font-bold text-white group-hover:text-[#8B5CF6]">{item.title}</h3>
            <p className="mt-0.5 text-xs text-muted">{hrefs.label}</p>
          </div>
        </Link>
        <button
          onClick={() => onRemove(item.tmdb_id)}
          className={cn(
            'absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white opacity-0 backdrop-blur-md transition-all hover:scale-110 hover:bg-red-500 group-hover:opacity-100',
            removing === item.tmdb_id && 'opacity-100 animate-spin'
          )}
          title="Remove from watchlist"
        >
          {removing === item.tmdb_id ? <Clock3 size={15} /> : <Trash2 size={15} />}
        </button>
        <div className="mt-1.5 px-1 text-[11px] text-muted">
          Added {formatDate(item.added_at)}
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      <ContentCard
        id={item.tmdb_id}
        title={item.title}
        type={item.type as 'movie' | 'tv'}
        posterPath={item.poster_path}
        rating={item.rating || 0}
        year={(item.release_date || '').slice(0, 4)}
      />
      <button
        onClick={() => onRemove(item.tmdb_id)}
        className={cn(
          'absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white opacity-0 backdrop-blur-md transition-all hover:scale-110 hover:bg-red-500 group-hover:opacity-100',
          removing === item.tmdb_id && 'opacity-100 animate-spin'
        )}
        title="Remove from watchlist"
      >
        {removing === item.tmdb_id ? <Clock3 size={15} /> : <Trash2 size={15} />}
      </button>
      <div className="mt-1.5 px-1 text-[11px] text-muted">
        Added {formatDate(item.added_at)}
      </div>
    </div>
  );
}

function Lane({ title, subtitle, items, onRemove, removing }: {
  title: string;
  subtitle: string;
  items: WatchlistItem[];
  onRemove: (tmdbId: string) => void;
  removing: string | null;
}) {
  if (!items.length) return null;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-black text-white">{title}</h2>
        <p className="mt-1 text-sm text-white/45">{subtitle}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {items.map((item) => (
          <WatchlistCard key={item.id} item={item} onRemove={onRemove} removing={removing} />
        ))}
      </div>
    </section>
  );
}

export function WatchlistGrid({ items: initialItems }: WatchlistGridProps) {
  const [items, setItems] = useState(initialItems);
  const [removing, setRemoving] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const tonight = [...items].sort((a, b) => scoreTonight(b) - scoreTonight(a))[0] ?? null;
    const short = items.filter((item) => item.type === 'movie' && estimateHours(item) <= 2);
    const readyToBinge = items.filter((item) => item.type === 'tv');
    const stale = items.filter((item) => ageInDays(item.added_at) > 180);
    const rest = items.filter((item) =>
      item.id !== tonight?.id &&
      !short.some((shortItem) => shortItem.id === item.id) &&
      !readyToBinge.some((show) => show.id === item.id) &&
      !stale.some((staleItem) => staleItem.id === item.id)
    );

    return { tonight, short, readyToBinge, stale, rest };
  }, [items]);

  const handleRemove = async (tmdbId: string) => {
    setRemoving(tmdbId);
    const result = await removeFromWatchlist(tmdbId);
    if (result.success) {
      setItems(prev => prev.filter(item => item.tmdb_id !== tmdbId));
    }
    setRemoving(null);
  };

  return (
    <div className="space-y-12">
      {grouped.tonight && (
        <section className="overflow-hidden rounded-2xl border border-[#9ee493]/20 bg-[#9ee493]/10 p-5 md:p-6">
          <div className="grid gap-5 md:grid-cols-[120px_minmax(0,1fr)_auto] md:items-center">
            <div className="relative hidden aspect-[2/3] overflow-hidden rounded-xl border border-white/10 bg-black/35 md:block">
              {grouped.tonight.poster_path ? (
                <Image
                  src={posterUrl(grouped.tonight.poster_path)}
                  alt={grouped.tonight.title}
                  fill
                  sizes="120px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#9ee493]/20 to-[#6366f1]/20 text-white/35">
                  <Sparkles size={26} />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-[#9ee493]/25 bg-[#9ee493]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#9ee493]">
                <Sparkles size={13} />
                Tonight's Watchlist Pick
              </div>
              <h2 className="text-3xl font-black leading-tight text-white">{grouped.tonight.title}</h2>
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-white/45">
                <span>{hrefsFor(grouped.tonight).label}</span>
                {(grouped.tonight.release_date || '').slice(0, 4) && <span>{(grouped.tonight.release_date || '').slice(0, 4)}</span>}
                {Boolean(grouped.tonight.rating) && <span>{(grouped.tonight.rating || 0).toFixed(1)} rated</span>}
                <span>{grouped.tonight.type === 'tv' ? 'Ready to binge' : `~${estimateHours(grouped.tonight)} hour commitment`}</span>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/58">
                VAULT picked this from your own list because it has the best mix of rating, commitment, and freshness. This is the anti-graveyard move: choose one and start.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href={hrefsFor(grouped.tonight).watch}
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-black text-black transition hover:bg-slate-200"
                >
                  <Flame size={16} />
                  Start now
                </Link>
                <Link
                  href={hrefsFor(grouped.tonight).detail}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/10"
                >
                  Details
                </Link>
              </div>
            </div>
            <div className="text-sm font-bold text-white/45 md:text-right">
              <div>{grouped.tonight.type === 'tv' ? 'Ready to binge' : `~${estimateHours(grouped.tonight)} hour commitment`}</div>
              <div>Added {formatDate(grouped.tonight.added_at)}</div>
            </div>
          </div>
        </section>
      )}

      <Lane
        title="Short Commitment"
        subtitle="Movies you can finish tonight without turning it into a project."
        items={grouped.short}
        onRemove={handleRemove}
        removing={removing}
      />
      <Lane
        title="Ready To Binge"
        subtitle="Shows on your list that deserve an intentional session."
        items={grouped.readyToBinge}
        onRemove={handleRemove}
        removing={removing}
      />
      <Lane
        title="Still Want These?"
        subtitle="Added over 6 months ago. Keep them if they still matter, clear them if they became clutter."
        items={grouped.stale}
        onRemove={handleRemove}
        removing={removing}
      />
      <Lane
        title="Everything Else"
        subtitle="The rest of your saved titles."
        items={grouped.rest}
        onRemove={handleRemove}
        removing={removing}
      />
    </div>
  );
}
