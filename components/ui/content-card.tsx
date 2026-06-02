'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { cn } from '@/lib/utils/cn';
import { Check, Play, Plus, Star, Film, Sparkles } from 'lucide-react';
import { generateWhyThisExplanation } from '@/app/actions/explanations';
import { addToWatchlist } from '@/app/actions/watchlist';
import { AddToListButton } from '@/components/ui/add-to-list-button';

interface ContentCardProps {
  id: string;
  title: string;
  posterPath: string | null;
  type: 'movie' | 'tv' | 'anime';
  year?: string;
  rating?: number;
  runtime?: number;
  metadata?: {
    season_count?: number;
    is_completed?: boolean;
    episode_count?: number;
    status?: string;
  };
  priority?: boolean;
  className?: string;
}

export function ContentCard({
  id,
  title,
  posterPath,
  type,
  year,
  rating,
  runtime,
  metadata,
  priority = false,
  className,
}: ContentCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanationText, setExplanationText] = useState('');
  const [saved, setSaved] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const router = useRouter();

  // ── Routing: handle all three content types ──
  const detailHref = type === 'movie'
    ? `/movies/${id}`
    : type === 'anime'
      ? `/anime/${id}`
      : `/shows/${id}`;

  const watchHref = type === 'movie'
    ? `/watch/movie/${id}`
    : type === 'anime'
      ? `/watch/anime/${id}`
      : `/watch/show/${id}`;

  // ── Image source: external URL vs TMDB path ──
  const imageSrc = posterPath
    ? (posterPath.startsWith('http') ? posterPath : `https://image.tmdb.org/t/p/w500${posterPath}`)
    : null;

  // ── Use native <img> for external URLs (bypasses Next.js proxy that MAL blocks) ──
  const isExternal = posterPath?.startsWith('http') ?? false;

  // Status mapping
  const statusLabel = metadata?.status === 'Returning Series' ? 'Airing' 
    : metadata?.status === 'Ended' ? 'Ended' 
    : metadata?.status === 'Canceled' ? 'Canceled' 
    : metadata?.is_completed ? 'Ended'
    : null;

  const statusColor = statusLabel === 'Airing' ? 'bg-green-500/80'
    : statusLabel === 'Ended' ? 'bg-blue-500/80'
    : 'bg-red-500/80';

  const handleExplain = async () => {
    setShowExplanation(true);
    if (explanationText) return;
    setIsExplaining(true);
    try {
      const text = await generateWhyThisExplanation(id, type === 'anime' ? 'tv' : type);
      setExplanationText(text);
    } catch {
      setExplanationText("We couldn't generate an explanation right now.");
    } finally {
      setIsExplaining(false);
    }
  };

  const handleSave = () => {
    setSaved(true);
    startSaving(async () => {
      const result = await addToWatchlist({
        tmdb_id: type === 'anime' ? `mal-${id}` : id,
        title,
        type: type === 'anime' ? 'tv' : type,
        poster_path: posterPath || '',
      });
      if (!result.success) setSaved(false);
    });
  };

  return (
    <div className={cn('group block relative', className)}>
      <div className="relative rounded-xl overflow-hidden bg-surface transition-all duration-300 group-hover:scale-105 group-hover:shadow-2xl group-hover:shadow-black/60">

        {/* ── Poster Container ── */}
        <div className="aspect-[2/3] relative overflow-hidden">

          {/* Shimmer skeleton — visible while loading or when no image */}
          <div
            className={cn(
              'absolute inset-0 z-0 transition-opacity duration-500',
              imageSrc && !imageError && !imageLoaded
                ? 'opacity-100'
                : 'opacity-0'
            )}
          >
            <div className="w-full h-full bg-gradient-to-br from-white/[0.04] to-white/[0.02] animate-shimmer" />
          </div>

          {/* No-poster fallback — anime-aware */}
          {(!imageSrc || imageError) && (
            <div className="absolute inset-0 z-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-white/[0.04] to-white/[0.02]">
              <span className="text-4xl">
                {type === 'anime' ? '⛩️' : type === 'movie' ? '🎬' : '📺'}
              </span>
              <span className="text-[10px] text-white/20 font-medium px-3 text-center leading-snug">
                {title}
              </span>
            </div>
          )}

          {/* ── Poster image ── */}
          {imageSrc && !imageError && (
            isExternal ? (
              // Native img for external URLs (MAL CDN blocks Next.js proxy)
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageSrc}
                alt={title}
                loading={priority ? 'eager' : 'lazy'}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                className={cn(
                  'absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-500 z-10',
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                )}
              />
            ) : (
              // Next/Image for TMDB paths (benefits from optimization)
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageSrc}
                alt={title}
                loading={priority ? 'eager' : 'lazy'}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                className={cn(
                  'absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-500 z-10',
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                )}
              />
            )
          )}

          {/* Clickable overlay for routing */}
          <Link href={detailHref} className="absolute inset-0 z-20" aria-label={`View details for ${title}`} />

          {/* Runtime / Info Badge (Top Left) */}
          {(type === 'movie' && runtime) ? (
            <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] font-bold z-30 pointer-events-none border border-white/10">
              {Math.floor(runtime / 60)}h {runtime % 60}m
            </div>
          ) : (type === 'tv' && metadata?.season_count) && (
            <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] font-bold z-30 pointer-events-none border border-white/10">
              {metadata.season_count} {metadata.season_count === 1 ? 'Season' : 'Seasons'}
            </div>
          )}

          {/* Rating Badge (Top Right) */}
          {rating != null && rating > 0 && (
            <div className="absolute top-2 right-2 bg-yellow-500 text-black px-1.5 py-0.5 rounded text-[10px] font-black flex items-center gap-0.5 z-30 pointer-events-none shadow-lg">
              <Star size={10} className="fill-black text-black" />
              <span>{rating.toFixed(1)}</span>
            </div>
          )}

          {/* Status Badge (Bottom Right, above CTAs) */}
          {statusLabel && (
            <div className={cn("absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider text-white z-30 pointer-events-none shadow-md", statusColor)}>
              {statusLabel}
            </div>
          )}

          {/* Anime badge (Alternative Top Left if no runtime/seasons) */}
          {type === 'anime' && !metadata?.season_count && (
            <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-pink-500/80 text-white z-30 pointer-events-none">
              Anime
            </div>
          )}

          <button
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              handleSave();
            }}
            disabled={isSaving || saved}
            className="absolute left-2 top-11 z-40 grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-black/65 text-white opacity-0 backdrop-blur-md transition hover:bg-white hover:text-black group-hover:opacity-100 disabled:opacity-100"
            title={saved ? 'Saved to watchlist' : 'Add to watchlist'}
          >
            {saved ? <Check size={15} /> : <Plus size={15} />}
          </button>

          <AddToListButton
            id={id}
            title={title}
            type={type}
            posterPath={posterPath}
            className="absolute left-2 top-20 z-50 opacity-0 transition group-hover:opacity-100"
          />

          {/* Dark overlay on hover */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30 pointer-events-none" />

          {/* Hover CTAs */}
          <div className="absolute bottom-0 left-0 right-0 p-2.5 z-40 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 flex flex-col gap-1.5">
            <button
              onClick={(e) => { e.preventDefault(); router.push(watchHref); }}
              className="w-full bg-accent text-white text-xs py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 shadow-lg hover:bg-accent/90 transition-colors"
            >
              <Play size={12} className="fill-white" /> Watch Now
            </button>
            <Link
              href={detailHref}
              className="w-full bg-black/60 backdrop-blur border border-white/20 text-white text-[10px] uppercase tracking-wider py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 hover:bg-white/10 transition-colors"
            >
              <Film size={11} /> Details
            </Link>
          </div>
        </div>

        {/* Info below poster */}
        <div className="p-2 relative z-20">
          <Link href={detailHref} className="block">
            <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-accent transition">
              {title}
            </h3>
            <div className="flex items-center justify-between text-xs text-muted mt-0.5">
              <span>{year || ''}</span>
              {type === 'tv' && metadata?.season_count && (
                <span>{metadata.season_count} {metadata.season_count === 1 ? 'season' : 'seasons'}</span>
              )}
            </div>
          </Link>

          {/* Why This? Explainer Button */}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleExplain(); }}
            className="absolute right-2 top-2 text-white/40 hover:text-accent transition-colors"
            title="Why was this recommended?"
          >
            <Sparkles size={14} />
          </button>
        </div>

        {/* Why This Explanation Overlay */}
        {showExplanation && (
          <div className="absolute inset-0 bg-black/92 z-50 p-4 flex flex-col items-center justify-center text-center animate-in fade-in duration-200 rounded-xl">
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowExplanation(false); }}
              className="absolute top-2 right-2 text-white/50 hover:text-white text-lg leading-none"
            >
              ×
            </button>
            <Sparkles className="text-accent mb-2" size={20} />
            <h4 className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Why This?</h4>
            {isExplaining ? (
              <div className="text-xs text-white/60 animate-pulse">Analyzing taste DNA...</div>
            ) : (
              <p className="text-sm font-medium text-white/90 leading-relaxed italic border-l-2 border-accent pl-3 text-left">
                &quot;{explanationText}&quot;
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
