'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Brain, Clock3, Loader2, Play, RefreshCw, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { trackRecommendationEvent } from '@/lib/recommendations/events';

type Mood = 'auto' | 'relaxed' | 'energized' | 'sad' | 'bored' | 'social' | 'focused';

type MoodPick = {
  mood: Mood;
  context: { timeOfDay: string; dayType: string };
  pick: {
    tmdb_id: string;
    media_type: 'movie' | 'tv';
    title: string;
    overview: string;
    poster_path: string | null;
    backdrop_path: string | null;
    vote_average: number;
    year: string;
    watchHref: string;
    detailHref: string;
  };
  explanation: string;
  honestNote: string;
  matchScore: number;
};

const MOODS: Array<{ id: Mood; label: string }> = [
  { id: 'auto', label: 'Auto' },
  { id: 'relaxed', label: 'Relaxed' },
  { id: 'energized', label: 'Energized' },
  { id: 'sad', label: 'Sad' },
  { id: 'bored', label: 'Bored' },
  { id: 'social', label: 'Social' },
  { id: 'focused', label: 'Focused' },
];

function imageUrl(path: string | null, size = 'w780') {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : '';
}

export function MoodEngineCard() {
  const [mood, setMood] = useState<Mood>('auto');
  const [data, setData] = useState<MoodPick | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const recentPickIds = useRef<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/recommendations/mood', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mood, excludeIds: recentPickIds.current.slice(-8) }),
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || `Mood engine failed (${response.status})`);
        if (!cancelled) {
          setData(json);
          recentPickIds.current = [...recentPickIds.current, json.pick.tmdb_id].slice(-12);
          trackRecommendationEvent({
            tmdbId: json.pick.tmdb_id,
            mediaType: json.pick.media_type,
            eventType: 'impression',
            source: 'mood_engine',
            recommendationScore: json.matchScore ? json.matchScore / 100 : undefined,
            metadata: { mood: json.mood, requestedMood: mood, context: json.context },
          });
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Mood engine failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [mood, refreshKey]);

  return (
    <section className="px-6 md:px-8 lg:px-12 pt-6">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#080b10] shadow-[0_28px_90px_rgba(0,0,0,0.35)]">
        {data?.pick.backdrop_path && (
          <Image
            src={imageUrl(data.pick.backdrop_path, 'original')}
            alt=""
            fill
            priority={false}
            sizes="100vw"
            className="object-cover opacity-28"
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#05070b_0%,rgba(5,7,11,0.92)_42%,rgba(5,7,11,0.56)_100%)]" />
        <div className="relative grid gap-6 p-5 md:grid-cols-[minmax(0,1fr)_220px] md:p-7 lg:p-8">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-lg border border-[#9ee493]/25 bg-[#9ee493]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#9ee493]">
                <Brain size={13} />
                Mood Engine
              </div>
              {data && (
                <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
                  <Clock3 size={12} />
                  {data.context.timeOfDay.replace('_', ' ')} · {data.context.dayType}
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {MOODS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setMood(option.id)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-bold transition',
                    mood === option.id
                      ? 'border-white bg-white text-black'
                      : 'border-white/10 bg-black/20 text-white/50 hover:border-white/25 hover:text-white'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {loading && (
              <div className="mt-7 max-w-3xl rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                <div className="flex items-center gap-3 text-white/60">
                  <span className="relative grid h-10 w-10 place-items-center rounded-full border border-[#9ee493]/25 bg-[#9ee493]/10">
                    <Loader2 size={18} className="animate-spin text-[#9ee493]" />
                  </span>
                  <div>
                    <p className="text-sm font-black text-white">Choosing one title, not building another row.</p>
                    <p className="mt-1 text-xs font-medium text-white/42">
                      VAULT is weighing mood, time, exclusions, and recent signals.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!loading && error && (
              <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
                {error}
              </div>
            )}

            {!loading && data && (
              <div className="mt-7 max-w-3xl">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">Tonight's pick</p>
                <h2 className="mt-2 text-4xl font-black leading-tight tracking-normal text-white md:text-5xl">
                  {data.pick.title}
                </h2>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-white/48">
                  <span>{data.pick.media_type === 'tv' ? 'Series' : 'Movie'}</span>
                  <span>{data.pick.year}</span>
                  <span>{data.pick.vote_average.toFixed(1)} rated</span>
                  <span>{data.matchScore}% fit</span>
                </div>
                <p className="mt-5 max-w-2xl text-base leading-7 text-white/72">{data.explanation}</p>
                <p className="mt-3 text-sm font-semibold text-[#f9c74f]">{data.honestNote}</p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href={data.pick.watchHref}
                    onClick={() => trackRecommendationEvent({
                      tmdbId: data.pick.tmdb_id,
                      mediaType: data.pick.media_type,
                      eventType: 'watch_start',
                      source: 'mood_engine',
                      recommendationScore: data.matchScore / 100,
                      metadata: { mood: data.mood },
                    })}
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-black text-black transition hover:bg-slate-200"
                  >
                    <Play size={17} className="fill-current" />
                    Start now
                  </Link>
                  <Link
                    href={data.pick.detailHref}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-black/25 px-5 py-3 text-sm font-black text-white transition hover:border-white/35 hover:bg-white/10"
                  >
                    <Sparkles size={17} />
                    See why
                  </Link>
                  <button
                    onClick={() => setRefreshKey((value) => value + 1)}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/25 px-5 py-3 text-sm font-black text-white/55 transition hover:border-white/25 hover:text-white"
                  >
                    <RefreshCw size={16} />
                    Re-run
                  </button>
                </div>
              </div>
            )}
          </div>

          {data?.pick.poster_path && (
            <div className="hidden md:block">
              <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-white/12 bg-black shadow-2xl">
                <Image
                  src={imageUrl(data.pick.poster_path, 'w500')}
                  alt={data.pick.title}
                  fill
                  sizes="220px"
                  className="object-cover"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
