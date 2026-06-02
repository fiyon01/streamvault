'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Zap, Play } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function CinematicRow({ items }: { items: any[] }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const handleScroll = () => {
    if (!rowRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
    setShowLeft(scrollLeft > 20);
    setShowRight(scrollLeft < scrollWidth - clientWidth - 20);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (!rowRef.current) return;
    const clientWidth = rowRef.current.clientWidth;
    const scrollAmount = direction === 'left' ? -clientWidth / 2 : clientWidth / 2;
    rowRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  return (
    <div className="relative group/row">
      {/* Scroll Chevrons */}
      <button
        onClick={() => scroll('left')}
        className={cn(
          "absolute left-4 top-1/2 -translate-y-1/2 z-30 w-14 h-14 bg-black/60 backdrop-blur-md text-white rounded-full flex items-center justify-center opacity-0 transition-all duration-300 hover:scale-110 hover:bg-[#6366f1] hidden md:flex",
          showLeft && "group-hover/row:opacity-100"
        )}
      >
        <ChevronLeft size={32} />
      </button>

      <button
        onClick={() => scroll('right')}
        className={cn(
          "absolute right-4 top-1/2 -translate-y-1/2 z-30 w-14 h-14 bg-black/60 backdrop-blur-md text-white rounded-full flex items-center justify-center opacity-0 transition-all duration-300 hover:scale-110 hover:bg-[#6366f1] hidden md:flex",
          showRight && "group-hover/row:opacity-100"
        )}
      >
        <ChevronRight size={32} />
      </button>

      <div 
        ref={rowRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto hide-scrollbar gap-8 px-6 md:px-12 pb-16 pt-8 snap-x relative z-20 scroll-smooth"
      >
        {items.map((item: any, i: number) => (
          <div key={i} className="group relative w-[320px] md:w-[400px] h-[480px] md:h-[600px] rounded-[2rem] overflow-hidden flex-shrink-0 snap-center border border-white/10 shadow-2xl transition-all duration-700 hover:scale-[1.02] hover:shadow-[0_0_50px_rgba(139,92,246,0.3)]">
            {item.poster_path && (
              <Image src={`https://image.tmdb.org/t/p/w780${item.poster_path}`} alt="poster" fill className="object-cover transition-transform duration-1000 group-hover:scale-110" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-[#020202]/40 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
            
            {/* Premium Card UI */}
            <div className="absolute inset-0 p-8 flex flex-col justify-end translate-y-8 group-hover:translate-y-0 transition-transform duration-500">
              <div className="flex gap-2 mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                <span className="px-3 py-1 bg-[#00BFFF]/20 border border-[#00BFFF]/50 text-[#00BFFF] text-xs font-bold rounded-full backdrop-blur-md">98% Match</span>
                <span className="px-3 py-1 bg-white/10 border border-white/20 text-white text-xs font-bold rounded-full backdrop-blur-md flex items-center gap-1">
                  <Zap size={12} className="text-yellow-400" /> High Octane
                </span>
              </div>
              <h3 className="text-3xl font-black text-white mb-2 line-clamp-1">{item.title || item.name}</h3>
              <p className="text-sm text-slate-300 line-clamp-3 mb-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-200">
                <span className="text-[#8B5CF6] font-bold">AI Note:</span> Matches your recent interest in visually stunning sci-fi thrillers.
              </p>
              <button className="w-full py-4 bg-white text-black rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors opacity-0 group-hover:opacity-100 duration-500 delay-300">
                <Play size={16} className="fill-current" /> Watch Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
