'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Star, Tv, Film, ShieldCheck, Play } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useState } from 'react';

interface AnimeCardProps {
  id: number;
  title: string;
  titleEnglish?: string;
  imageUrl: string | null;
  score?: number;
  episodes?: number;
  status?: string;
  type?: string;
  fillerPercent?: number;
  isAiring?: boolean;
  year?: number;
  className?: string;
}

export function AnimeCard({
  id,
  title,
  titleEnglish,
  imageUrl,
  score,
  episodes,
  status,
  type,
  fillerPercent,
  isAiring,
  year,
  className,
}: AnimeCardProps) {
  const [imgError, setImgError] = useState(false);
  const router = useRouter();
  const displayTitle = titleEnglish || title;
  const href = `/anime/${id}`;

  const isFillerFree = fillerPercent !== undefined && fillerPercent <= 5;

  return (
    <div className={cn('group block relative', className)}>
      <div className="relative rounded-xl overflow-hidden bg-[#0a0f16] border border-white/5 transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_30px_rgba(139,92,246,0.25)] group-hover:border-[#8B5CF6]/30">

        {/* Poster Container */}
        <div className="aspect-[2/3] relative">
          {/* Clickable area for the poster */}
          <Link href={href} className="absolute inset-0 z-0" aria-label={`View details for ${displayTitle}`} />

          {imageUrl && !imgError ? (
            // Native image avoids Next's optimizer proxy, which can timeout on MAL CDN.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={displayTitle}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover pointer-events-none"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#8B5CF6]/20 to-[#00BFFF]/20 flex items-center justify-center text-4xl pointer-events-none">
              🎌
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

          {/* Top badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none z-10">
            {isAiring && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/90 rounded-full text-[10px] font-black text-white uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Airing
              </span>
            )}
            {isFillerFree && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-[#00BFFF]/90 rounded-full text-[10px] font-black text-white uppercase tracking-wider">
                <ShieldCheck size={10} /> Filler-Free
              </span>
            )}
          </div>

          {/* MAL Score badge */}
          {score && score > 0 && (
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded-lg text-xs font-bold text-yellow-400 pointer-events-none z-10">
              <Star size={10} className="fill-yellow-400 text-yellow-400" />
              {score.toFixed(1)}
            </div>
          )}

          {/* Hover CTA */}
          <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 flex flex-col gap-1.5 z-20">
            <button
              onClick={(e) => { e.preventDefault(); router.push(href); }}
              className="w-full bg-[#8B5CF6] text-white text-sm py-2 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-[#7C3AED] transition-colors"
            >
              <Play size={14} className="fill-white" /> Watch Now
            </button>
            <Link
              href={href}
              className="w-full bg-black/60 backdrop-blur border border-white/20 text-white text-[11px] uppercase tracking-wider py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 hover:bg-white/10 transition-colors"
            >
              <Film size={12} /> Details
            </Link>
          </div>
        </div>

        {/* Info — clicking info goes to detail page */}
        <Link href={href} className="block p-2.5 space-y-1 z-10 relative">
          <h3 className="font-bold text-sm text-white line-clamp-2 leading-tight group-hover:text-[#8B5CF6] transition-colors">
            {displayTitle}
          </h3>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>{year || 'N/A'}</span>
            <div className="flex items-center gap-1">
              {type === 'Movie' ? <Film size={10} /> : <Tv size={10} />}
              {episodes ? <span>{episodes} eps</span> : null}
            </div>
          </div>
          {fillerPercent !== undefined && fillerPercent > 5 && (
            <div className="flex items-center gap-1">
              <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full',
                    fillerPercent > 40 ? 'bg-red-500' :
                    fillerPercent > 20 ? 'bg-orange-400' :
                    fillerPercent > 5  ? 'bg-yellow-400' : 'bg-green-500'
                  )}
                  style={{ width: `${fillerPercent}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500">{fillerPercent}% filler</span>
            </div>
          )}
        </Link>
      </div>
    </div>
  );
}
