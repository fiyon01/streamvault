'use client';

export type RecommendationEventType =
  | 'impression'
  | 'row_impression'
  | 'detail_click'
  | 'watch_start'
  | 'watch_progress'
  | 'completion'
  | 'save'
  | 'skip'
  | 'feedback_up'
  | 'feedback_down'
  | 'hide'
  | 'why_open'
  | 'trailer_start'
  | 'trailer_progress'
  | 'trailer_complete';

export interface RecommendationEventInput {
  tmdbId: string;
  mediaType: 'movie' | 'tv' | 'anime';
  eventType: RecommendationEventType;
  source: string;
  rowType?: string;
  rowLabel?: string;
  position?: number;
  recommendationScore?: number;
  watchMs?: number;
  completionRate?: number;
  metadata?: Record<string, unknown>;
}

const SESSION_KEY = 'streamvault_rec_session_id';

function uuidv4(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (typeof crypto !== 'undefined' && crypto.getRandomValues)
      ? (crypto.getRandomValues(new Uint8Array(1))[0] & 15)
      : (Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getAnonymousSessionId() {
  if (typeof window === 'undefined') return undefined;
  let sessionId = window.localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = uuidv4();
    window.localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

export function trackRecommendationEvent(event: RecommendationEventInput) {
  if (typeof window === 'undefined') return;

  const payload = JSON.stringify({
    ...event,
    anonymousSessionId: getAnonymousSessionId(),
  });

  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: 'application/json' });
    navigator.sendBeacon('/api/recommendations/events', blob);
    return;
  }

  fetch('/api/recommendations/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

