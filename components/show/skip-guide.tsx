'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';

interface SkipGuideEpisode {
  episode: string;
  reason: string;
  skip_safe: boolean;
}

interface SkipGuideProps {
  guide: SkipGuideEpisode[];
  showTitle: string;
}

export function SkipGuide({ guide, showTitle }: SkipGuideProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (guide.length === 0) return null;

  return (
    <div className="bg-surface/50 border border-border rounded-xl overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">✂️</span>
          <div className="text-left">
            <h3 className="font-bold">Streamlined Watch Guide</h3>
            <p className="text-xs text-muted">AI-identified filler episodes you can safely skip</p>
          </div>
        </div>
        <div className={cn("transition-transform", isOpen ? "rotate-180" : "")}>
          ▼
        </div>
      </button>

      {isOpen && (
        <div className="px-6 pb-6 space-y-3">
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 mb-4">
            <p className="text-sm text-accent">
              <strong>Premium Feature:</strong> These {guide.length} episodes are standalone and do not advance the main plot. Skip them to save <strong>~{Math.round(guide.length * 45 / 60)} hours</strong> of viewing time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {guide.map((ep) => (
              <div key={ep.episode} className="bg-bg/40 border border-border/50 rounded-lg p-3 flex gap-3">
                <div className="bg-surface px-2 py-1 rounded text-xs font-bold h-fit">
                  {ep.episode}
                </div>
                <div className="flex-1">
                  <div className="text-xs font-semibold mb-1">Filler Episode</div>
                  <p className="text-[11px] text-muted leading-tight">{ep.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
