'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Sparkles, Play, Info, ThumbsUp, ThumbsDown, EyeOff, X, Loader2, Brain, Users, Gem, Zap } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { trackRecommendationEvent } from '@/lib/recommendations/events';

interface RecItem {
  tmdb_id: string;
  media_type: string;
  title: string;
  poster_path?: string;
  imdb_score?: number;
  explanation?: string;
  signals?: string[];
  confidence?: number;
  finalScore?: number;
}

interface RecRow {
  label: string;
  sublabel?: string;
  type: string;
  items: RecItem[];
}

const ROW_ICON: Record<string, React.ReactNode> = {
  taste_dna:    <Brain size={14} />,
  social_proof: <Users size={14} />,
  hidden_gem:   <Gem size={14} />,
  mood:         <Zap size={14} />,
};

function WhyThisOverlay({
  item,
  onClose,
  onSignal,
}: {
  item: RecItem;
  onClose: () => void;
  onSignal: (type: string) => void;
}) {
  return (
    <div
      className="absolute inset-0 z-40 bg-black/95 backdrop-blur-sm rounded-xl flex flex-col p-3 animate-in fade-in duration-200"
      onClick={e => e.stopPropagation()}
    >
      <button
        onClick={onClose}
        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-white/40 hover:text-white transition-colors"
      >
        <X size={14} />
      </button>

      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles size={12} className="text-accent" />
        <span className="text-[10px] uppercase tracking-widest font-bold text-white/40">Why This?</span>
      </div>

      {item.explanation ? (
        <p className="text-xs text-white/90 leading-relaxed flex-1 border-l-2 border-accent pl-2 italic">
          &ldquo;{item.explanation}&rdquo;
        </p>
      ) : (
        <p className="text-xs text-white/60 flex-1">Analyzing DNA overlap&hellip;</p>
      )}

      {/* DNA signals */}
      {item.signals && item.signals.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {item.signals.map(s => (
            <span key={s} className="text-[9px] px-1.5 py-0.5 bg-accent/20 text-accent rounded-full font-medium capitalize">
              {s.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}

      {/* Match confidence bar */}
      {item.finalScore !== undefined && (
        <div className="mt-2">
          <div className="flex justify-between text-[9px] text-white/30 mb-1">
            <span>DNA Match</span>
            <span>{Math.round((item.finalScore) * 100)}%</span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent to-blue-400 rounded-full transition-all"
              style={{ width: `${Math.round((item.finalScore) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Quick signal buttons */}
      <div className="flex gap-1.5 mt-3">
        <button
          onClick={() => onSignal('thumbs_up')}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 text-[10px] font-bold transition-colors"
        >
          <ThumbsUp size={10} /> Love it
        </button>
        <button
          onClick={() => onSignal('thumbs_down')}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-[10px] font-bold transition-colors"
        >
          <ThumbsDown size={10} /> Not for me
        </button>
        <button
          onClick={() => onSignal('hide_forever')}
          className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold transition-colors"
        >
          <EyeOff size={10} />
        </button>
      </div>
    </div>
  );
}

function RecCard({ item, row, position }: { item: RecItem; row: RecRow; position: number }) {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [imageError, setImageError] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const [signalSent, setSignalSent] = useState('');

  const watchHref  = item.media_type === 'tv' ? `/watch/show/${item.tmdb_id}` : `/watch/movie/${item.tmdb_id}`;
  const detailHref = item.media_type === 'tv' ? `/shows/${item.tmdb_id}` : `/movies/${item.tmdb_id}`;

  const track = useCallback((eventType: Parameters<typeof trackRecommendationEvent>[0]['eventType'], metadata?: Record<string, unknown>) => {
    trackRecommendationEvent({
      tmdbId: item.tmdb_id,
      mediaType: item.media_type === 'tv' ? 'tv' : 'movie',
      eventType,
      source: 'home_recommendation_row',
      rowType: row.type,
      rowLabel: row.label,
      position,
      recommendationScore: item.finalScore,
      metadata,
    });
  }, [item, position, row]);

  useEffect(() => {
    const node = cardRef.current;
    if (!node) return;

    let seen = false;
    const observer = new IntersectionObserver(([entry]) => {
      if (!seen && entry.isIntersecting && entry.intersectionRatio >= 0.55) {
        seen = true;
        track('impression');
        observer.disconnect();
      }
    }, { threshold: [0.55] });

    observer.observe(node);
    return () => observer.disconnect();
  }, [track]);

  const sendSignal = useCallback(async (signalType: string) => {
    setSignalSent(signalType);
    setShowWhy(false);
    track(signalType === 'hide_forever' ? 'hide' : signalType === 'thumbs_up' ? 'feedback_up' : 'feedback_down', { signalType });
    try {
      await fetch('/api/recommendations/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmdbId: item.tmdb_id, mediaType: item.media_type, signalType }),
      });
    } catch (e) {
      console.error('Signal failed', e);
    }
  }, [item, track]);

  if (signalSent === 'hide_forever') return null;

  return (
    <div ref={cardRef} className="group relative flex-none w-36 md:w-44">
      <div className="relative rounded-xl overflow-hidden bg-[#0a0f16] border border-white/5 transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_24px_rgba(139,92,246,0.2)] group-hover:border-accent/30">

        {/* Poster */}
        <div className="aspect-[2/3] relative">
          <Link href={detailHref} className="absolute inset-0 z-0" aria-label={item.title} />

          {item.poster_path && !imageError ? (
            <Image
              src={`https://image.tmdb.org/t/p/w342${item.poster_path}`}
              alt={item.title}
              fill
              className="object-cover pointer-events-none"
              sizes="(max-width: 768px) 144px, 176px"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-accent/20 to-blue-600/20 flex items-center justify-center text-3xl pointer-events-none">
              🎬
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10" />

          {/* Hover CTAs */}
          <div className="absolute bottom-0 left-0 right-0 p-2 z-20 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 flex flex-col gap-1">
            <button
              onClick={(e) => {
                e.preventDefault();
                track('watch_start', { href: watchHref });
                router.push(watchHref);
              }}
              className="w-full bg-accent text-white text-[10px] py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 hover:bg-accent/90 transition-colors"
            >
              <Play size={10} className="fill-white" /> Watch
            </button>
            <div className="flex gap-1">
              <Link
                href={detailHref}
                onClick={() => track('detail_click', { href: detailHref })}
                className="flex-1 bg-black/60 backdrop-blur border border-white/15 text-white text-[9px] py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 hover:bg-white/10 transition-colors"
              >
                <Info size={9} /> Details
              </Link>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  track('why_open');
                  setShowWhy(true);
                }}
                className="w-8 bg-black/60 backdrop-blur border border-white/15 text-accent text-[9px] py-1.5 rounded-lg font-bold flex items-center justify-center hover:bg-accent/10 transition-colors"
                title="Why was this recommended?"
              >
                <Sparkles size={10} />
              </button>
            </div>
          </div>

          {/* Why This overlay */}
          {showWhy && (
            <WhyThisOverlay
              item={item}
              onClose={() => setShowWhy(false)}
              onSignal={sendSignal}
            />
          )}

          {/* Sent signal flash */}
          {signalSent && signalSent !== 'hide_forever' && (
            <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center z-50 pointer-events-none animate-in fade-in duration-200">
              <ThumbsUp size={24} className="text-green-400" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-2">
          <h3 className="font-semibold text-xs text-white line-clamp-1 group-hover:text-accent transition-colors">
            {item.title}
          </h3>
          {item.imdb_score && item.imdb_score > 0 && (
            <p className="text-[10px] text-white/40 mt-0.5">⭐ {item.imdb_score.toFixed(1)}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function RecRow({ row }: { row: RecRow }) {
  const rowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = rowRef.current;
    if (!node || row.items.length === 0) return;

    let seen = false;
    const observer = new IntersectionObserver(([entry]) => {
      if (!seen && entry.isIntersecting && entry.intersectionRatio >= 0.35) {
        seen = true;
        trackRecommendationEvent({
          tmdbId: row.items[0].tmdb_id,
          mediaType: row.items[0].media_type === 'tv' ? 'tv' : 'movie',
          eventType: 'row_impression',
          source: 'home_recommendation_row',
          rowType: row.type,
          rowLabel: row.label,
          position: 0,
          metadata: { itemCount: row.items.length },
        });
        observer.disconnect();
      }
    }, { threshold: [0.35] });

    observer.observe(node);
    return () => observer.disconnect();
  }, [row]);

  return (
    <div ref={rowRef} className="px-6 md:px-14 lg:px-20">
      {/* Row header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          {ROW_ICON[row.type] && (
            <span className="text-accent">{ROW_ICON[row.type]}</span>
          )}
          <h2 className="text-white font-bold text-base md:text-lg leading-tight">{row.label}</h2>
        </div>
        {row.sublabel && (
          <p className="text-white/40 text-xs italic mt-0.5 max-w-2xl leading-relaxed">
            &ldquo;{row.sublabel}&rdquo;
          </p>
        )}
      </div>

      {/* Horizontal scroll */}
      <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
        {row.items.map((item, index) => (
          <RecCard key={`${item.tmdb_id}-${row.type}`} item={item} row={row} position={index} />
        ))}
      </div>
    </div>
  );
}

export default function PersonalizedRows() {
  const [rows, setRows]       = useState<RecRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/recommendations/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        if (!res.ok) throw new Error('Not authorized');
        const data = await res.json();
        setRows(data.rows ?? []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="px-6 md:px-14 lg:px-20 py-8 flex items-center gap-3 text-white/40">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm">Building your personalized recommendations&hellip;</span>
      </div>
    );
  }

  if (error || rows.length === 0) return null;

  return (
    <div className="space-y-12 py-4">
      {rows.map((row, i) => <RecRow key={`${row.type}-${i}`} row={row} />)}
    </div>
  );
}
