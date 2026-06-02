'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';

export interface ContentTypeCard {
  type: 'movie' | 'tv_show' | 'anime' | 'cartoon' | 'surprise';
  label: string;
  sublabel: string;
  emoji: string;
  visible: boolean;
  highlighted: boolean;
}

interface ContentTypeSelectorProps {
  cards: ContentTypeCard[];
  interpretation: string;
  onSelect: (type: string) => void;
}

export function ContentTypeSelector({ cards, interpretation, onSelect }: ContentTypeSelectorProps) {
  const [mounted, setMounted] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="w-full max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden">
        {/* Decorative Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-[500px] bg-[#8B5CF6]/10 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative z-10 space-y-8">
          <div className="text-center space-y-2">
            <p className="text-slate-400 text-sm md:text-base font-medium flex items-center justify-center gap-2">
              <span className="animate-pulse">✨</span> {interpretation}
            </p>
            <h2 className="text-2xl md:text-3xl font-black text-white">
              What format are you in the mood for?
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 justify-center">
            {cards.filter(c => c.visible).map((card, idx) => (
              <button
                key={card.type}
                onClick={() => onSelect(card.type)}
                onMouseEnter={() => setHoveredCard(card.type)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{ animationDelay: `${idx * 60}ms` }}
                className={cn(
                  'relative group flex flex-col items-center justify-center p-6 rounded-2xl border transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 fill-mode-both text-center',
                  card.highlighted 
                    ? 'bg-[#8B5CF6]/20 border-[#8B5CF6]/50 shadow-[0_0_20px_rgba(139,92,246,0.3)]' 
                    : 'bg-black/40 border-white/10 hover:bg-white/5 hover:border-white/20'
                )}
              >
                {card.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#8B5CF6] text-white text-[10px] font-bold uppercase px-3 py-1 rounded-full shadow-lg whitespace-nowrap">
                    Best Match
                  </div>
                )}
                <span className={cn(
                  "text-4xl md:text-5xl mb-3 transition-transform duration-300",
                  hoveredCard === card.type ? "scale-110" : ""
                )}>
                  {card.emoji}
                </span>
                <span className="text-white font-bold text-base md:text-lg">
                  {card.label}
                </span>
                <span className="text-slate-400 text-xs md:text-sm mt-1">
                  {card.sublabel}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
