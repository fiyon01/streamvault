'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  Gauge,
  Layers3,
  Maximize2,
  Minimize2,
  Radio,
  RefreshCw,
  Server,
  Shield,
  ShieldAlert,
  SkipForward,
} from 'lucide-react';
import { logUserSignal } from '@/app/actions/signals';
import { recordWatchHistory } from '@/app/actions/history';
import { cn } from '@/lib/utils/cn';
import { trackRecommendationEvent } from '@/lib/recommendations/events';
import { getVideoProviders, type VideoProvider, type VideoSource } from '@/lib/video/sources';

interface VideoPlayerProps {
  tmdbId: string;
  type: 'movie' | 'show';
  title?: string;
  overview?: string | null;
  posterPath?: string | null;
  backdropPath?: string | null;
  releaseDate?: string | null;
  runtime?: number | null;
  season?: number;
  episode?: number;
  className?: string;
  onNext?: () => void;
  hasNext?: boolean;
  nextLabel?: string;
}

type SourceEventType = 'attempt' | 'load' | 'timeout' | 'error' | 'manual_next' | 'selected' | 'reported_broken';

type SourceReliability = {
  successCount: number;
  failCount: number;
  lastError?: string | null;
  uptimePercentage?: number | null;
  avgResponseTimeMs?: number | null;
  isGoodForTitle: boolean;
  isBadForTitle: boolean;
};

function getSourceSessionId() {
  if (typeof window === 'undefined') return null;

  const key = 'streamvault_source_session_id';
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const sessionId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  window.localStorage.setItem(key, sessionId);
  return sessionId;
}

function SourceIcon({ provider }: { provider: VideoProvider }) {
  if (provider.id === 'embed-su') return <Shield size={14} />;
  if (provider.id === 'multiembed') return <Layers3 size={14} />;
  if (provider.id === 'moviesapi') return <Server size={14} />;
  if (provider.id === 'vidsrc-in') return <ShieldAlert size={14} />;
  return <AlertTriangle size={14} />;
}

function sourceTone(provider: VideoProvider, isActive: boolean) {
  if (isActive) {
    return provider.adRisk === 'high'
      ? 'border-red-300/40 bg-red-300/14 text-red-50 shadow-[0_0_24px_rgba(248,113,113,0.12)]'
      : 'border-green-300/45 bg-green-300/14 text-green-50 shadow-[0_0_24px_rgba(134,239,172,0.12)]';
  }

  return provider.adRisk === 'high'
    ? 'border-red-300/12 bg-white/[0.025] text-red-100/55 hover:border-red-300/25 hover:bg-red-300/8'
    : 'border-white/10 bg-white/[0.035] text-white/62 hover:border-green-300/25 hover:bg-green-300/8 hover:text-white';
}

export function VideoPlayer({
  tmdbId,
  type,
  title,
  overview,
  posterPath,
  backdropPath,
  releaseDate,
  runtime,
  season,
  episode,
  className,
  onNext,
  hasNext,
  nextLabel = 'Up Next',
}: VideoPlayerProps) {
  const [activeSource, setActiveSource] = useState<VideoSource>('embed-su');
  const [attemptIndex, setAttemptIndex] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'ready' | 'failed'>('connecting');
  const [failoverNotice, setFailoverNotice] = useState('');
  const [sourceReliability, setSourceReliability] = useState<Record<string, SourceReliability>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const progressMarks = useRef({ started: false, forty: false, seventy: false, complete: false });
  const iframeLoaded = useRef(false);
  const sourceStartTime = useRef(Date.now());
  const sourceLoadReported = useRef(false);
  const manualSourceSelection = useRef(false);
  const playerShellRef = useRef<HTMLDivElement | null>(null);

  const episodeSeason = season ?? 1;
  const episodeNumber = episode ?? 1;

  const providers = useMemo(
    () => getVideoProviders(type === 'show' ? 'tv' : 'movie', tmdbId, episodeSeason, episodeNumber),
    [episodeNumber, episodeSeason, tmdbId, type]
  );

  const activeProvider = providers.find((provider) => provider.id === activeSource) ?? providers[0];
  const currentUrl = activeProvider.urls[attemptIndex] ?? activeProvider.urls[0];
  const activeProviderIndex = providers.findIndex((provider) => provider.id === activeProvider.id);
  const activeReliability = sourceReliability[activeProvider.id];

  const postSourceEvent = useCallback((
    provider: VideoProvider,
    sourceUrl: string,
    eventType: SourceEventType,
    metadata: Record<string, unknown> = {},
    responseTimeMs = Math.max(0, Date.now() - sourceStartTime.current)
  ) => {
    if (typeof window === 'undefined') return;

    const body = JSON.stringify({
      tmdbId,
      mediaType: type === 'show' ? 'tv' : 'movie',
      season: type === 'show' ? episodeSeason : 0,
      episode: type === 'show' ? episodeNumber : 0,
      sourceName: provider.label,
      sourceId: provider.id,
      sourceUrl,
      eventType,
      responseTimeMs,
      hasAds: provider.hasAds,
      anonymousSessionId: getSourceSessionId(),
      metadata: {
        title,
        providerPriority: provider.priority,
        providerGroup: provider.groupLabel,
        adRisk: provider.adRisk,
        attemptIndex: provider.id === activeProvider.id ? attemptIndex : 0,
        ...metadata,
      },
    });

    if ('sendBeacon' in navigator) {
      const sent = navigator.sendBeacon('/api/video/source-event', new Blob([body], { type: 'application/json' }));
      if (sent) return;
    }

    fetch('/api/video/source-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  }, [activeProvider.id, activeProvider.adRisk, attemptIndex, episodeNumber, episodeSeason, title, tmdbId, type]);

  const reportCurrentSourceEvent = useCallback((
    eventType: SourceEventType,
    metadata: Record<string, unknown> = {}
  ) => {
    postSourceEvent(activeProvider, currentUrl, eventType, metadata);
  }, [activeProvider, currentUrl, postSourceEvent]);

  const selectProvider = useCallback((providerId: VideoSource) => {
    const selectedProvider = providers.find((provider) => provider.id === providerId);
    if (selectedProvider) {
      postSourceEvent(selectedProvider, selectedProvider.urls[0], 'selected', { fromProvider: activeProvider.id }, 0);
    }

    manualSourceSelection.current = true;
    setActiveSource(providerId);
    setAttemptIndex(0);
    setConnectionStatus('connecting');
    setFailoverNotice('');
  }, [activeProvider.id, postSourceEvent, providers]);

  const advanceStream = useCallback((reason: 'timeout' | 'error' | 'manual') => {
    const reasonCopy = reason === 'manual'
      ? 'Trying the next cleanest available server.'
      : 'This source did not connect cleanly, so StreamVault is moving down the clean-first chain.';

    if (attemptIndex < activeProvider.urls.length - 1) {
      setFailoverNotice(reasonCopy);
      setAttemptIndex((current) => current + 1);
      setConnectionStatus('connecting');
      return;
    }

    const nextProvider = providers[activeProviderIndex + 1];
    if (nextProvider) {
      setFailoverNotice(reasonCopy);
      setActiveSource(nextProvider.id);
      setAttemptIndex(0);
      setConnectionStatus('connecting');
      return;
    }

    setFailoverNotice('Every configured server failed to connect. Try again in a moment or use a blocker-friendly browser.');
    setConnectionStatus('failed');
  }, [activeProvider.urls.length, activeProviderIndex, attemptIndex, providers]);

  const handleTryNext = useCallback(() => {
    reportCurrentSourceEvent('manual_next', { reason: 'user_requested_next_source' });
    advanceStream('manual');
  }, [advanceStream, reportCurrentSourceEvent]);

  const handleReportBroken = useCallback(() => {
    reportCurrentSourceEvent('reported_broken', { reason: 'user_reported_broken_source' });
    setFailoverNotice('Marked this server as broken for this title. StreamVault is trying the next source.');
    advanceStream('manual');
  }, [advanceStream, reportCurrentSourceEvent]);

  const toggleFullscreen = useCallback(async () => {
    const shell = playerShellRef.current;
    if (!shell) return;

    const documentWithWebkit = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void> | void;
    };
    const shellWithWebkit = shell as HTMLDivElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };

    try {
      if (document.fullscreenElement || documentWithWebkit.webkitFullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else {
          await documentWithWebkit.webkitExitFullscreen?.();
        }
        return;
      }

      if (shell.requestFullscreen) {
        await shell.requestFullscreen();
      } else {
        await shellWithWebkit.webkitRequestFullscreen?.();
      }
    } catch (error) {
      console.error('Fullscreen request failed:', error);
    }
  }, []);

  useEffect(() => {
    progressMarks.current = { started: true, forty: false, seventy: false, complete: false };
    recordWatchHistory({
      tmdbId,
      mediaType: type === 'show' ? 'tv' : 'movie',
      title: title || `${type === 'show' ? 'TV' : 'Movie'} ${tmdbId}`,
      overview,
      posterPath,
      backdropPath,
      releaseDate,
      runtime,
      positionSeconds: 0,
      completed: false,
    }).catch(() => {});
    trackRecommendationEvent({
      tmdbId,
      mediaType: type === 'show' ? 'tv' : 'movie',
      eventType: 'watch_start',
      source: 'watch_page',
      metadata: { title, overview, posterPath, backdropPath, releaseDate, runtime, season, episode, provider: activeSource },
    });
  }, [activeSource, backdropPath, episode, overview, posterPath, releaseDate, runtime, season, title, tmdbId, type]);

  useEffect(() => {
    let cancelled = false;

    async function loadSourceHealth() {
      const params = new URLSearchParams({
        tmdbId,
        mediaType: type === 'show' ? 'tv' : 'movie',
        season: String(type === 'show' ? episodeSeason : 0),
        episode: String(type === 'show' ? episodeNumber : 0),
      });

      try {
        const response = await fetch(`/api/video/source-health?${params}`, { cache: 'no-store' });
        if (!response.ok) return;

        const payload = await response.json() as {
          contentSources?: Array<{
            source_id?: string | null;
            source_name?: string | null;
            success_count?: number | null;
            fail_count?: number | null;
            last_error?: string | null;
          }>;
          globalSources?: Array<{
            source_id?: string | null;
            source_name?: string | null;
            uptime_percentage?: number | null;
            avg_response_time_ms?: number | null;
          }>;
        };

        if (cancelled) return;

        const contentBySource = new Map<string, NonNullable<typeof payload.contentSources>[number]>();
        for (const item of payload.contentSources ?? []) {
          if (item.source_id) contentBySource.set(item.source_id, item);
          if (item.source_name) contentBySource.set(item.source_name, item);
        }

        const globalBySource = new Map<string, NonNullable<typeof payload.globalSources>[number]>();
        for (const item of payload.globalSources ?? []) {
          if (item.source_id) globalBySource.set(item.source_id, item);
          if (item.source_name) globalBySource.set(item.source_name, item);
        }

        const nextReliability = providers.reduce<Record<string, SourceReliability>>((acc, provider) => {
          const content = contentBySource.get(provider.id) ?? contentBySource.get(provider.label);
          const global = globalBySource.get(provider.id) ?? globalBySource.get(provider.label);
          const successCount = Number(content?.success_count ?? 0);
          const failCount = Number(content?.fail_count ?? 0);

          acc[provider.id] = {
            successCount,
            failCount,
            lastError: content?.last_error,
            uptimePercentage: typeof global?.uptime_percentage === 'number' ? global.uptime_percentage : null,
            avgResponseTimeMs: typeof global?.avg_response_time_ms === 'number' ? global.avg_response_time_ms : null,
            isGoodForTitle: successCount > 0 && successCount >= failCount,
            isBadForTitle: failCount >= 2 && successCount === 0,
          };

          return acc;
        }, {});

        setSourceReliability(nextReliability);

        if (!manualSourceSelection.current && nextReliability[activeSource]?.isBadForTitle) {
          const preferredProvider = providers.find((provider) => !nextReliability[provider.id]?.isBadForTitle);
          if (preferredProvider && preferredProvider.id !== activeSource) {
            setFailoverNotice(`${activeProvider.label} was previously reported broken for this title, so StreamVault is starting with ${preferredProvider.label}.`);
            setActiveSource(preferredProvider.id);
            setAttemptIndex(0);
          }
        }
      } catch {
        // Source memory is helpful, not required for playback.
      }
    }

    loadSourceHealth();

    return () => {
      cancelled = true;
    };
  }, [activeProvider.label, activeSource, episodeNumber, episodeSeason, providers, tmdbId, type]);

  useEffect(() => {
    manualSourceSelection.current = false;
    setSourceReliability({});
    setActiveSource('embed-su');
    setAttemptIndex(0);
    setConnectionStatus('connecting');
    setFailoverNotice('');
  }, [tmdbId, season, episode]);

  useEffect(() => {
    iframeLoaded.current = false;
    sourceLoadReported.current = false;
    sourceStartTime.current = Date.now();
    setConnectionStatus('connecting');
    reportCurrentSourceEvent('attempt', {
      urlAttempt: attemptIndex + 1,
      totalProviderAttempts: activeProvider.urls.length,
    });

    const timeout = window.setTimeout(() => {
      if (!iframeLoaded.current) {
        reportCurrentSourceEvent('timeout', { timeoutMs: 12000 });
        advanceStream('timeout');
      }
    }, 12000);

    return () => window.clearTimeout(timeout);
  }, [activeProvider.urls.length, advanceStream, attemptIndex, currentUrl, reportCurrentSourceEvent]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (typeof event.data === 'string') {
        if (event.data.includes('ended') || event.data.includes('complete')) {
          if (!progressMarks.current.complete) {
            progressMarks.current.complete = true;
            recordWatchHistory({
              tmdbId,
              mediaType: type === 'show' ? 'tv' : 'movie',
              title: title || `${type === 'show' ? 'TV' : 'Movie'} ${tmdbId}`,
              overview,
              posterPath,
              backdropPath,
              releaseDate,
              runtime,
              completed: true,
            }).catch(() => {});
            trackRecommendationEvent({
              tmdbId,
              mediaType: type === 'show' ? 'tv' : 'movie',
              eventType: 'completion',
              source: 'watch_page',
              completionRate: 1,
              metadata: { title, overview, posterPath, backdropPath, releaseDate, runtime, season, episode, provider: activeSource },
            });
          }
          logUserSignal(tmdbId, type === 'show' ? 'tv' : 'movie', 'completed_silent', 3);
          if (hasNext && onNext) onNext();
        }
        return;
      }

      if (!event.data || typeof event.data !== 'object') return;

      if (event.data.type === 'video_ended' || event.data.event === 'ended') {
        if (!progressMarks.current.complete) {
          progressMarks.current.complete = true;
          recordWatchHistory({
            tmdbId,
            mediaType: type === 'show' ? 'tv' : 'movie',
            title: title || `${type === 'show' ? 'TV' : 'Movie'} ${tmdbId}`,
            overview,
            posterPath,
            backdropPath,
            releaseDate,
            runtime,
            completed: true,
          }).catch(() => {});
          trackRecommendationEvent({
            tmdbId,
            mediaType: type === 'show' ? 'tv' : 'movie',
            eventType: 'completion',
            source: 'watch_page',
            completionRate: 1,
            metadata: { title, overview, posterPath, backdropPath, releaseDate, runtime, season, episode, provider: activeSource },
          });
        }
        logUserSignal(tmdbId, type === 'show' ? 'tv' : 'movie', 'completed_silent', 3);
        if (hasNext && onNext) onNext();
      }

      if (event.data.type === 'timeupdate' && event.data.currentTime && event.data.duration) {
        const pct = event.data.currentTime / event.data.duration;

        if (pct >= 0.4 && !progressMarks.current.forty) {
          progressMarks.current.forty = true;
          recordWatchHistory({
            tmdbId,
            mediaType: type === 'show' ? 'tv' : 'movie',
            title: title || `${type === 'show' ? 'TV' : 'Movie'} ${tmdbId}`,
            overview,
            posterPath,
            backdropPath,
            releaseDate,
            runtime,
            positionSeconds: Math.round(event.data.currentTime),
            completed: false,
          }).catch(() => {});
          trackRecommendationEvent({
            tmdbId,
            mediaType: type === 'show' ? 'tv' : 'movie',
            eventType: 'watch_progress',
            source: 'watch_page',
            watchMs: Math.round(event.data.currentTime * 1000),
            completionRate: pct,
            metadata: { title, overview, posterPath, backdropPath, releaseDate, runtime, season, episode, provider: activeSource, mark: '40pct' },
          });
        }

        if (pct >= 0.70 && pct <= 0.71) {
          if (!progressMarks.current.seventy) {
            progressMarks.current.seventy = true;
            trackRecommendationEvent({
              tmdbId,
              mediaType: type === 'show' ? 'tv' : 'movie',
              eventType: 'watch_progress',
              source: 'watch_page',
              watchMs: Math.round(event.data.currentTime * 1000),
              completionRate: pct,
              metadata: { title, overview, posterPath, backdropPath, releaseDate, runtime, season, episode, provider: activeSource, mark: '70pct' },
            });
          }
          logUserSignal(tmdbId, type === 'show' ? 'tv' : 'movie', 'watched_70pct', 2);
        }

      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [activeSource, backdropPath, episode, hasNext, onNext, overview, posterPath, releaseDate, runtime, season, title, tmdbId, type]);

  useEffect(() => {
    const syncFullscreenState = () => {
      const documentWithWebkit = document as Document & { webkitFullscreenElement?: Element | null };
      setIsFullscreen(
        document.fullscreenElement === playerShellRef.current ||
        documentWithWebkit.webkitFullscreenElement === playerShellRef.current
      );
    };

    document.addEventListener('fullscreenchange', syncFullscreenState);
    document.addEventListener('webkitfullscreenchange', syncFullscreenState);
    syncFullscreenState();

    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreenState);
      document.removeEventListener('webkitfullscreenchange', syncFullscreenState);
    };
  }, []);

  return (
    <div
      ref={playerShellRef}
      className={cn(
        'relative w-full bg-black',
        isFullscreen && 'h-screen w-screen overflow-hidden',
        className
      )}
    >
      <div className={cn(
        'flex items-center justify-between gap-3 border-b border-white/10 bg-[#06070c]/95 px-3 py-2 sm:px-5',
        isFullscreen && 'hidden'
      )}>
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/45">
          <Shield size={14} className="text-accent" />
          Ad-light stream
          <span className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2 py-1 tracking-normal',
            activeProvider.adRisk === 'low'
              ? 'border-green-300/25 bg-green-300/10 text-green-100/80'
              : 'border-red-300/25 bg-red-300/10 text-red-100/80'
          )}>
            {activeProvider.adRisk === 'high' ? <ShieldAlert size={12} /> : <BadgeCheck size={12} />}
            {activeProvider.qualityLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1.5 text-[11px] font-bold text-white/40 sm:flex">
            <Radio size={13} className="text-green-300" />
            {activeProvider.label}
          </div>
          <button
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black text-white transition hover:bg-white/12"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
          </button>
        </div>
      </div>

      <div className={cn(
        'relative flex aspect-video w-full min-h-[260px] items-center justify-center overflow-hidden bg-black group lg:min-h-[min(760px,70vh)]',
        isFullscreen && 'h-screen min-h-0 aspect-auto lg:min-h-0'
      )}>
        <div className="absolute z-0 text-sm font-medium text-white/30 animate-pulse">
          {connectionStatus === 'failed' ? 'No stream connected.' : `Checking ${activeProvider.label}...`}
        </div>

        <iframe
          key={currentUrl}
          src={currentUrl}
          className="absolute inset-0 z-10 h-full w-full bg-black"
          allowFullScreen
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          onLoad={() => {
            iframeLoaded.current = true;
            if (!sourceLoadReported.current) {
              sourceLoadReported.current = true;
              reportCurrentSourceEvent('load');
            }
            setConnectionStatus('ready');
          }}
          onError={() => {
            iframeLoaded.current = false;
            reportCurrentSourceEvent('error');
            advanceStream('error');
          }}
        />

        {activeProvider.warning && (
          <div className={cn(
            'absolute left-4 top-4 z-20 max-w-md rounded-xl border p-3 text-xs font-semibold shadow-2xl backdrop-blur-xl',
            activeProvider.hasAds
              ? 'border-red-300/20 bg-red-950/75 text-red-50/80'
              : 'border-yellow-300/20 bg-black/75 text-yellow-50/80'
          )}>
            <div className="flex items-start gap-2">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-yellow-300" />
              <span>{activeProvider.warning}</span>
            </div>
          </div>
        )}

        {(failoverNotice || connectionStatus === 'failed') && (
          <div className={cn(
            'absolute left-4 z-20 max-w-md rounded-xl border border-white/10 bg-black/75 p-3 text-xs font-semibold text-white/70 shadow-2xl backdrop-blur-xl',
            activeProvider.warning ? 'top-20' : 'top-4'
          )}>
            <div className="flex items-start gap-2">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-yellow-300" />
              <span>{failoverNotice}</span>
            </div>
          </div>
        )}

      </div>

      <div className={cn(
        'flex flex-col gap-4 border-t border-white/10 bg-[#06070c] px-3 py-3 text-sm text-muted sm:px-5',
        isFullscreen && 'hidden'
      )}>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
              <Gauge size={13} className="text-[#9ee493]" />
              Clean-first servers
            </p>
            <p className="mt-1 text-xs text-white/35">
              StreamVault starts with ad-light sources, then falls back only when needed.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <p className="text-xs text-white/35">
              {activeProvider.label}
              {activeProvider.urls.length > 1 ? ` attempt ${attemptIndex + 1}/${activeProvider.urls.length}` : ''}
              {activeReliability?.isGoodForTitle ? ' · worked here before' : ''}
              {activeReliability?.isBadForTitle ? ' · previously reported broken' : ''}
            </p>
            <button
              onClick={handleReportBroken}
              className="inline-flex items-center gap-1.5 rounded-full border border-red-300/15 bg-red-300/5 px-3 py-2 text-xs font-black text-red-100/75 transition hover:border-red-300/30 hover:bg-red-300/10"
            >
              <AlertTriangle size={13} />
              Report broken
            </button>
            {hasNext && (
              <button
                onClick={onNext}
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-black shadow-xl transition hover:bg-slate-200 sm:px-5 sm:text-sm"
              >
                <span>{nextLabel}</span>
                <SkipForward size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-8">
          {providers.map((provider) => {
            const reliability = sourceReliability[provider.id];

            return (
              <button
                key={provider.id}
                onClick={() => selectProvider(provider.id)}
                className={cn(
                  'min-h-[74px] rounded-xl border px-3 py-2 text-left transition',
                  sourceTone(provider, activeSource === provider.id),
                  reliability?.isBadForTitle && activeSource !== provider.id && 'border-red-300/20 bg-red-950/10'
                )}
                title={provider.warning ?? provider.qualityLabel}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-black">
                    <SourceIcon provider={provider} />
                    {provider.shortLabel}
                  </span>
                  <span className="text-[10px] font-black text-white/32">#{provider.priority}</span>
                </span>
                <span className="mt-1 block truncate text-[11px] font-bold text-white/78">{provider.label}</span>
                <span className="mt-0.5 block truncate text-[10px] font-semibold text-white/35">{provider.groupLabel}</span>
                {reliability?.isGoodForTitle && (
                  <span className="mt-1 inline-flex rounded-full bg-green-300/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-green-100/70">
                    Works here
                  </span>
                )}
                {reliability?.isBadForTitle && (
                  <span className="mt-1 inline-flex rounded-full bg-red-300/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-red-100/70">
                    Reported bad
                  </span>
                )}
              </button>
            );
          })}
          <button
            onClick={handleTryNext}
            className="col-span-2 inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-slate-300 transition hover:bg-white/5 sm:col-span-3 lg:col-span-1"
          >
            <RefreshCw size={13} />
            Try next
          </button>
        </div>
      </div>
    </div>
  );
}
