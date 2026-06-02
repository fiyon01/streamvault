'use client';

import { ContentCard } from './content-card';
import { useRef } from 'react';

interface ContentRowProps {
  title: string;
  items: any[];
  type: 'movie' | 'tv' | 'anime';
  priority?: boolean;
}

export function ContentRow({ title, items, type, priority = false }: ContentRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-4 px-6 md:px-12 relative group">
      <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
      
      <div className="relative">
        {/* Left Scroll Button */}
        <button 
          onClick={() => scroll('left')}
          className="absolute left-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-r from-bg to-transparent opacity-0 group-hover:opacity-100 transition flex items-center justify-start -ml-6 md:-ml-12 pl-2"
        >
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20 hover:bg-white/20 hover:scale-110 transition">
            &lt;
          </div>
        </button>

        {/* Scroll Container */}
        <div 
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto hide-scrollbar snap-x snap-mandatory py-4 -my-4"
        >
          {items.map((item, index) => (
            <div key={`${item.id}-${index}`} className="w-[140px] md:w-[200px] flex-shrink-0 snap-start">
              <ContentCard 
                id={item.id.toString()}
                title={item.title || item.name}
                type={type}
                posterPath={item.poster_path}
                rating={item.vote_average}
                year={(item.release_date || item.first_air_date)?.split('-')[0]}
                priority={priority && index < 6}
              />
            </div>
          ))}
        </div>

        {/* Right Scroll Button */}
        <button 
          onClick={() => scroll('right')}
          className="absolute right-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-l from-bg to-transparent opacity-0 group-hover:opacity-100 transition flex items-center justify-end -mr-6 md:-mr-12 pr-2"
        >
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20 hover:bg-white/20 hover:scale-110 transition">
            &gt;
          </div>
        </button>
      </div>
    </div>
  );
}
