'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimeCard } from './anime-card';

interface AnimeRowProps {
  title: string;
  subtitle?: string;
  items: any[];
}

export function AnimeRow({ title, subtitle, items }: AnimeRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (scrollRef.current) {
      const amt = scrollRef.current.clientWidth * 0.8;
      scrollRef.current.scrollBy({ left: dir === 'left' ? -amt : amt, behavior: 'smooth' });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-4 px-6 md:px-12 group/row">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-white">{title}</h2>
          {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-[#8B5CF6]/40 transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scroll('right')}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-[#8B5CF6]/40 transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto hide-scrollbar snap-x snap-mandatory pb-4"
      >
        {items.map((item: any) => {
          const jikanImg = item.images?.jpg?.large_image_url || item.images?.jpg?.image_url;
          return (
            <div key={item.mal_id} className="w-[150px] md:w-[185px] flex-shrink-0 snap-start">
              <AnimeCard
                id={item.mal_id}
                title={item.title}
                titleEnglish={item.title_english}
                imageUrl={jikanImg}
                score={item.score}
                episodes={item.episodes}
                status={item.status}
                type={item.type}
                isAiring={item.status === 'Currently Airing'}
                year={item.year || item.aired?.prop?.from?.year}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
