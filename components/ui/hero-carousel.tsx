'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Play, Info } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface HeroItem {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  backdrop_path: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  status?: string;
}

export function HeroCarousel({ items, type }: { items: HeroItem[], type: 'movie' | 'tv' }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const safeItems = items.slice(0, 5).filter(i => i.backdrop_path);

  useEffect(() => {
    if (safeItems.length <= 1 || isHovered) return;

    const timer = setInterval(() => {
      setCurrentIndex((current) => (current + 1) % safeItems.length);
    }, 8000); // 8 second rotation

    return () => clearInterval(timer);
  }, [safeItems.length, isHovered]);

  if (safeItems.length === 0) return null;

  return (
    <div 
      className="relative w-full h-[65vh] md:h-[75vh] overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {safeItems.map((item, index) => {
        const isActive = index === currentIndex;
        const title = item.title || item.name;
        const year = (item.release_date || item.first_air_date || '').split('-')[0];
        
        return (
          <div
            key={item.id}
            className={cn(
              "absolute inset-0 transition-opacity duration-1000 ease-in-out",
              isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            )}
          >
            {/* Background Image with slow zoom animation */}
            <div className={cn("absolute inset-0 transition-transform duration-[10000ms] ease-out", isActive ? "scale-105" : "scale-100")}>
              <Image
                src={`https://image.tmdb.org/t/p/original${item.backdrop_path}`}
                alt={title || 'Backdrop'}
                fill
                priority={index === 0}
                className="object-cover object-top"
              />
            </div>
            
            {/* Multi-layer gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#05050f] via-[#05050f]/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#05050f] via-[#05050f]/20 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.4))]" />

            {/* Content Container */}
            <div className="absolute inset-0 flex flex-col justify-end pb-16 px-6 md:px-14 lg:px-20 max-w-5xl z-20">
              <div className={cn(
                "space-y-4 transition-all duration-700 transform",
                isActive ? "translate-y-0 opacity-100 delay-300" : "translate-y-8 opacity-0"
              )}>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="px-3 py-1 rounded-full text-[10px] md:text-xs font-black tracking-widest uppercase border border-white/20 bg-white/10 text-white backdrop-blur-md shadow-lg">
                    🔥 Trending {type === 'movie' ? 'Movie' : 'Show'}
                  </span>
                  <span className="text-yellow-400 font-black text-sm drop-shadow-md">⭐ {item.vote_average?.toFixed(1)}</span>
                  <span className="text-white/70 font-bold text-sm drop-shadow-md">{year}</span>
                  {item.status && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-blue-500/20 text-blue-400 border-blue-500/30">
                      {item.status}
                    </span>
                  )}
                </div>
                
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter text-white drop-shadow-2xl leading-[1.1]">
                  {title}
                </h1>
                
                <p className="text-slate-300 text-sm md:text-base lg:text-lg max-w-2xl line-clamp-2 md:line-clamp-3 leading-relaxed drop-shadow-lg font-medium">
                  {item.overview}
                </p>
                
                <div className="flex items-center gap-3 pt-4">
                  <Link
                    href={`/${type === 'movie' ? 'movies' : 'shows'}/${item.id}`}
                    className="flex items-center gap-2 px-6 md:px-8 py-3.5 bg-white text-black font-black rounded-xl hover:scale-105 transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:shadow-[0_0_40px_rgba(255,255,255,0.5)]"
                  >
                    <Play size={18} className="fill-black" /> Watch Now
                  </Link>
                  <Link
                    href={`/${type === 'movie' ? 'movies' : 'shows'}/${item.id}`}
                    className="flex items-center gap-2 px-6 py-3.5 bg-black/40 border border-white/20 text-white font-bold rounded-xl backdrop-blur-xl hover:bg-white/10 transition-colors duration-300"
                  >
                    <Info size={18} /> Details
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Carousel Indicators */}
      {safeItems.length > 1 && (
        <div className="absolute bottom-6 right-6 md:right-14 lg:right-20 flex gap-2 z-30">
          {safeItems.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className="relative h-1.5 rounded-full overflow-hidden transition-all duration-300"
              style={{ width: currentIndex === idx ? '32px' : '12px' }}
            >
              <div className="absolute inset-0 bg-white/20" />
              {currentIndex === idx && (
                <div 
                  className="absolute inset-y-0 left-0 bg-white"
                  style={{
                    animation: isHovered ? 'none' : 'progress 8s linear forwards'
                  }}
                />
              )}
            </button>
          ))}
        </div>
      )}

      <style jsx global>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}
