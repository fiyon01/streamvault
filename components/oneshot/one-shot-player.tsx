'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  Play, ArrowRight, ArrowLeft, Heart, ThumbsUp, ThumbsDown,
  Volume2, VolumeX, Sparkles, ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { getOneShotPicks } from '@/app/actions/oneshot';
import { trackRecommendationEvent } from '@/lib/recommendations/events';

export function OneShotPlayer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || 'Surprise me';
  const format = searchParams.get('format') || 'movie';
  const sessionId = searchParams.get('session') || '';

  const [picks, setPicks]                 = useState<any[]>([]);
  const [currentIndex, setCurrentIndex]   = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMuted, setIsMuted]             = useState(true);
  const [isAILoading, setIsAILoading]     = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [infoCollapsed, setInfoCollapsed] = useState(false);
  const [feedback, setFeedback]           = useState<'up' | 'down' | null>(null);
  const [savedToWatchlist, setSavedToWatchlist] = useState(false);

  useEffect(() => {
    async function loadPicks() {
      try {
        setIsAILoading(true);
        const res = await fetch('/api/ai/oneshot/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, format, sessionId })
        });
        const data = await res.json();
        
        if (data.step === 'show_result' && data.pool && data.pool.length > 0) {
          // Add the explanation to the first pick
          if (data.pick) {
            data.pick.reasoning = data.explanation || data.pick.reasoning;
          }
          // The API returned the whole pool, we'll store it in state for fast local "Next" 
          // or we could hit a /next endpoint. For now, local pool works.
          setPicks(data.pool);
        } else {
          setError(data.error || data.fallback?.message || 'No recommendations found.');
        }
      } catch {
        setError('Failed to contact Vault Core.');
      } finally {
        setIsAILoading(false);
      }
    }
    loadPicks();
  }, [query, format, sessionId]);

  // Reset feedback/watchlist when pick changes
  useEffect(() => {
    setFeedback(null);
    setSavedToWatchlist(false);
  }, [currentIndex]);

  useEffect(() => {
    const current = picks[currentIndex];
    if (!current) return;
    trackRecommendationEvent({
      tmdbId: current.id,
      mediaType: current.source === 'jikan' || format === 'anime' ? 'anime' : current.detailHref?.includes('/watch/show/') ? 'tv' : 'movie',
      eventType: 'impression',
      source: 'one_shot',
      rowType: format,
      rowLabel: query,
      position: currentIndex,
      recommendationScore: current.scores?.finalScore,
      metadata: { sessionId, hasTrailer: Boolean(current.youtubeKey) },
    });
  }, [currentIndex, format, picks, query, sessionId]);

  useEffect(() => {
    const current = picks[currentIndex];
    if (!current?.youtubeKey) return;
    trackRecommendationEvent({
      tmdbId: current.id,
      mediaType: current.source === 'jikan' || format === 'anime' ? 'anime' : current.detailHref?.includes('/watch/show/') ? 'tv' : 'movie',
      eventType: 'trailer_start',
      source: 'one_shot',
      rowType: format,
      rowLabel: query,
      position: currentIndex,
      recommendationScore: current.scores?.finalScore,
      metadata: { sessionId, youtubeKey: current.youtubeKey },
    });
  }, [currentIndex, format, picks, query, sessionId]);

  const handleNext = useCallback(() => {
    if (picks.length <= 1) return;
    const current = picks[currentIndex];
    if (current) {
      trackRecommendationEvent({
        tmdbId: current.id,
        mediaType: current.source === 'jikan' || format === 'anime' ? 'anime' : current.detailHref?.includes('/watch/show/') ? 'tv' : 'movie',
        eventType: 'skip',
        source: 'one_shot',
        rowType: format,
        rowLabel: query,
        position: currentIndex,
        recommendationScore: current.scores?.finalScore,
        metadata: { sessionId },
      });
    }
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % picks.length);
      setIsTransitioning(false);
    }, 350);
  }, [currentIndex, format, picks, query, sessionId]);

  const handleWatchNow = useCallback(() => {
    const current = picks[currentIndex];
    if (!current) return;
    trackRecommendationEvent({
      tmdbId: current.id,
      mediaType: current.source === 'jikan' || format === 'anime' ? 'anime' : current.detailHref?.includes('/watch/show/') ? 'tv' : 'movie',
      eventType: 'watch_start',
      source: 'one_shot',
      rowType: format,
      rowLabel: query,
      position: currentIndex,
      recommendationScore: current.scores?.finalScore,
      metadata: { sessionId, href: current.detailHref },
    });
    // Save to history
    const historyStr = localStorage.getItem('vault_history');
    const historyIds = historyStr ? JSON.parse(historyStr) : [];
    if (!historyIds.includes(current.id)) {
      historyIds.push(current.id);
      localStorage.setItem('vault_history', JSON.stringify(historyIds));
    }
    router.push(current.detailHref || `/movies/${current.id}`);
  }, [picks, currentIndex, router, format, query, sessionId]);

  const handleWatchlist = useCallback(() => {
    const current = picks[currentIndex];
    if (current) {
      trackRecommendationEvent({
        tmdbId: current.id,
        mediaType: current.source === 'jikan' || format === 'anime' ? 'anime' : current.detailHref?.includes('/watch/show/') ? 'tv' : 'movie',
        eventType: 'save',
        source: 'one_shot',
        rowType: format,
        rowLabel: query,
        position: currentIndex,
        recommendationScore: current.scores?.finalScore,
        metadata: { sessionId },
      });
    }
    setSavedToWatchlist(true);
  }, [currentIndex, format, picks, query, sessionId]);

  // ── LOADING STATE ─────────────────────────────────────────────────
  if (isAILoading) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#050505] flex flex-col items-center justify-center text-white">
        <div className="relative w-24 h-24 mb-10">
          <div className="absolute inset-0 rounded-full border-4 border-[#8B5CF6]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-t-[#8B5CF6] border-r-[#00BFFF] border-b-transparent border-l-transparent animate-spin" />
          <div className="absolute inset-3 rounded-full bg-[#8B5CF6]/10 flex items-center justify-center">
            <Sparkles size={24} className="text-[#8B5CF6]" />
          </div>
        </div>
        <h2 className="text-3xl font-black mb-3">Vault AI Processing</h2>
        <p className="text-slate-400 text-lg font-medium text-center max-w-sm">
          Analyzing your request and fetching the perfect match…
        </p>
        <p className="text-slate-600 text-sm mt-3 italic">"{query}"</p>
      </div>
    );
  }

  // ── ERROR STATE ───────────────────────────────────────────────────
  if (error || picks.length === 0) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#050505] flex flex-col items-center justify-center text-white gap-6">
        <div className="text-6xl">😕</div>
        <h2 className="text-3xl font-black text-red-400">Nothing Found</h2>
        <p className="text-slate-400 max-w-sm text-center">{error || 'No content matched your mood. Try a different search.'}</p>
        <button
          onClick={() => router.back()}
          className="px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-slate-200 transition"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const currentPick = picks[currentIndex];
  const youtubeUrl = currentPick.youtubeKey
    ? `https://www.youtube.com/embed/${currentPick.youtubeKey}?autoplay=1&controls=0&mute=${isMuted ? '1' : '0'}&loop=1&playlist=${currentPick.youtubeKey}&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3`
    : null;

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white overflow-hidden select-none">

      {/* ── BACKGROUND / TRAILER LAYER ──────────────────────────── */}
      <div className={cn(
        'absolute inset-0 transition-opacity duration-350',
        isTransitioning ? 'opacity-0' : 'opacity-100'
      )}>
        {youtubeUrl ? (
          /* Real YouTube trailer */
          <div className="absolute inset-0 scale-[1.3] md:scale-[1.12] pointer-events-none">
            <iframe
              src={youtubeUrl}
              allow="autoplay; encrypted-media"
              className="w-full h-full"
              title="Vault One-Shot Trailer"
            />
          </div>
        ) : currentPick.backdrop ? (
          /* Fallback: TMDB/MAL backdrop image with subtle zoom animation */
          currentPick.source === 'jikan' ? (
            // Native image avoids Next's optimizer proxy timing out on MAL CDN.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentPick.backdrop}
              alt={currentPick.title}
              className="absolute inset-0 h-full w-full object-cover animate-[subtleZoom_12s_ease-in-out_infinite_alternate]"
            />
          ) : (
            <Image
              src={`https://image.tmdb.org/t/p/original${currentPick.backdrop}`}
              alt={currentPick.title}
              fill
              className="object-cover animate-[subtleZoom_12s_ease-in-out_infinite_alternate]"
              priority
            />
          )
        ) : null}

        {/* Cinematic gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent pointer-events-none" />
      </div>

      {/* ── TOP BAR — always visible, never toggles ──────────────── */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-4 md:p-6">
        {/* Exit — always works */}
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 px-4 py-2.5 bg-black/50 backdrop-blur-md rounded-full border border-white/15 text-white font-bold hover:bg-white/10 transition-all hover:scale-105 text-sm"
        >
          <ArrowLeft size={16} /> Exit
        </button>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          {/* Mute toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="w-10 h-10 flex items-center justify-center bg-black/50 backdrop-blur-md rounded-full border border-white/15 hover:bg-white/10 transition-all hover:scale-110"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>

          {/* Pick counter */}
          <div className="px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-full border border-white/15 text-xs font-bold text-slate-300">
            {currentIndex + 1} / {picks.length}
          </div>
        </div>
      </div>

      {/* ── BOTTOM INFO PANEL — always anchored at bottom ────────── */}
      {/* This panel NEVER disappears. Only the inner content collapses. */}
      <div className="absolute bottom-0 left-0 right-0 z-30">

        {/* Collapse toggle pill — sits above the panel */}
        <div className="flex justify-center mb-2">
          <button
            onClick={() => setInfoCollapsed((v) => !v)}
            className="flex items-center gap-2 px-4 py-1.5 bg-black/50 backdrop-blur-md rounded-full border border-white/10 text-xs font-bold text-slate-400 hover:text-white transition-all"
          >
            {infoCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {infoCollapsed ? 'Show Details' : 'Hide Details'}
          </button>
        </div>

        {/* The panel itself */}
        <div className={cn(
          'bg-gradient-to-t from-black/95 via-black/80 to-transparent backdrop-blur-sm transition-all duration-500 overflow-hidden',
          isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0',
          infoCollapsed ? 'max-h-0 py-0' : 'max-h-[60vh] py-6 md:py-8'
        )}>
          <div className="max-w-4xl mx-auto px-5 md:px-10 space-y-5">

            {/* Title Row */}
            <div>
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none">
                  {currentPick.title}
                </h1>
                {currentPick.source === 'jikan' && (
                  <span className="flex-shrink-0 px-2.5 py-1 bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[#8B5CF6] text-[10px] font-black uppercase tracking-widest rounded-full mt-2">
                    🎌 Anime
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-sm font-medium text-slate-300">
                <span className="text-yellow-400 font-bold">★ {currentPick.rating}</span>
                <span className="text-slate-600">•</span>
                <span>{currentPick.year}</span>
                <span className="text-slate-600">•</span>
                <span>{currentPick.runtime}</span>
                <span className="text-slate-600">•</span>
                <span className="line-clamp-1 max-w-[200px]">{currentPick.genres}</span>
              </div>
            </div>

            {/* AI Reasoning */}
            <div className="relative bg-white/5 backdrop-blur-md border border-[#8B5CF6]/25 rounded-2xl px-5 py-4 overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#00BFFF] to-[#8B5CF6] rounded-l-2xl" />
              <div className="flex items-start gap-3">
                <Sparkles size={14} className="text-[#8B5CF6] shrink-0 mt-0.5" />
                <p className="text-slate-200 text-sm md:text-base leading-relaxed">
                  {currentPick.reasoning}
                </p>
              </div>
            </div>

            {/* Primary CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleWatchNow}
                className="flex-1 bg-white hover:bg-slate-100 text-black px-8 py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_30px_rgba(255,255,255,0.2)]"
              >
                <Play size={22} className="fill-current" /> Watch Now
              </button>
              <button
                onClick={handleNext}
                disabled={picks.length <= 1}
                className="flex-1 bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-40 text-white px-8 py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_30px_rgba(139,92,246,0.3)]"
              >
                Next Suggestion <ArrowRight size={22} />
              </button>
            </div>

            {/* Secondary actions */}
            <div className="flex items-center justify-center gap-6 pb-2">
              <button
                onClick={handleWatchlist}
                className={cn(
                  'flex items-center gap-2 text-sm font-bold transition-all hover:scale-110',
                  savedToWatchlist ? 'text-[#00BFFF]' : 'text-slate-400 hover:text-white'
                )}
              >
                <Heart size={17} className={savedToWatchlist ? 'fill-current' : ''} />
                {savedToWatchlist ? 'Saved!' : 'Watchlist'}
              </button>

              <button
                onClick={() => {
                  const current = picks[currentIndex];
                  if (current) {
                    trackRecommendationEvent({
                      tmdbId: current.id,
                      mediaType: current.source === 'jikan' || format === 'anime' ? 'anime' : current.detailHref?.includes('/watch/show/') ? 'tv' : 'movie',
                      eventType: 'feedback_up',
                      source: 'one_shot',
                      rowType: format,
                      rowLabel: query,
                      position: currentIndex,
                      recommendationScore: current.scores?.finalScore,
                      metadata: { sessionId },
                    });
                  }
                  setFeedback('up');
                  handleNext();
                }}
                className={cn(
                  'flex items-center gap-2 text-sm font-bold transition-all hover:scale-110',
                  feedback === 'up' ? 'text-green-400' : 'text-slate-400 hover:text-green-400'
                )}
              >
                <ThumbsUp size={17} /> Good pick
              </button>

              <button
                onClick={() => {
                  const current = picks[currentIndex];
                  if (current) {
                    trackRecommendationEvent({
                      tmdbId: current.id,
                      mediaType: current.source === 'jikan' || format === 'anime' ? 'anime' : current.detailHref?.includes('/watch/show/') ? 'tv' : 'movie',
                      eventType: 'feedback_down',
                      source: 'one_shot',
                      rowType: format,
                      rowLabel: query,
                      position: currentIndex,
                      recommendationScore: current.scores?.finalScore,
                      metadata: { sessionId },
                    });
                  }
                  setFeedback('down');
                  handleNext();
                }}
                className={cn(
                  'flex items-center gap-2 text-sm font-bold transition-all hover:scale-110',
                  feedback === 'down' ? 'text-red-400' : 'text-slate-400 hover:text-red-400'
                )}
              >
                <ThumbsDown size={17} /> Not for me
              </button>

              <button
                onClick={handleWatchNow}
                className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-all hover:scale-110"
              >
                <ExternalLink size={15} /> Details
              </button>
            </div>
          </div>
        </div>

        {/* When collapsed: show a thin persistent bar with the title + CTAs */}
        {infoCollapsed && (
          <div className="bg-black/80 backdrop-blur-md border-t border-white/10 px-5 py-3 flex items-center justify-between gap-4">
            <span className="font-black text-white text-base truncate">{currentPick.title}</span>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleWatchNow}
                className="flex items-center gap-2 px-5 py-2 bg-white text-black rounded-xl font-bold text-sm hover:bg-slate-200 transition"
              >
                <Play size={14} className="fill-current" /> Watch
              </button>
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-5 py-2 bg-[#8B5CF6] text-white rounded-xl font-bold text-sm hover:bg-[#7C3AED] transition"
              >
                Next <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Subtle zoom keyframe for backdrop images */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes subtleZoom {
          from { transform: scale(1); }
          to   { transform: scale(1.08); }
        }
      `}} />
    </div>
  );
}
