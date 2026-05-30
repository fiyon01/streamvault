'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@/lib/utils/cn';

interface ContentCardProps {
  id: string;
  title: string;
  posterPath: string | null;
  type: 'movie' | 'tv';
  year?: string;
  rating?: number;
  metadata?: {
    season_count?: number;
    is_completed?: boolean;
    episode_count?: number;
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
  metadata,
  priority = false,
  className,
}: ContentCardProps) {
  const [imageError, setImageError] = useState(false);
  const href = type === 'movie' ? `/movie/${id}` : `/tv/${id}`;

  return (
    <Link href={href} className={cn("group block", className)}>
      <div className="relative rounded-lg overflow-hidden bg-surface transition-all duration-200 group-hover:scale-105 group-hover:shadow-xl">
        {/* Poster Image */}
        <div className="aspect-[2/3] relative bg-gradient-to-b from-gray-800 to-gray-900">
          {posterPath && !imageError ? (
            <Image
              src={`https://image.tmdb.org/t/p/w500${posterPath}`}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
              priority={priority}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl bg-gray-800">
              🎬
            </div>
          )}

          {/* Rating Badge */}
          {rating && rating > 0 && (
            <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded text-xs font-semibold flex items-center gap-0.5">
              <span>⭐</span> {rating.toFixed(1)}
            </div>
          )}

          {/* Completed Badge for TV Shows */}
          {type === 'tv' && metadata?.is_completed && (
            <div className="absolute top-2 left-2 bg-success/90 text-white text-xs px-1.5 py-0.5 rounded">
              ✓ Completed
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-2">
          <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-accent transition">
            {title}
          </h3>
          <div className="flex items-center justify-between text-xs text-muted mt-0.5">
            <span>{year || 'N/A'}</span>
            {type === 'tv' && metadata?.season_count && (
              <span>{metadata.season_count} {metadata.season_count === 1 ? 'season' : 'seasons'}</span>
            )}
          </div>
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-3">
          <button className="w-full bg-accent text-white text-sm py-1.5 rounded-lg font-medium hover:bg-accent/80 transition">
            ▶ Watch Now
          </button>
        </div>
      </div>
    </Link>
  );
}
