import { createClient } from '@/lib/supabase/server';
import { AntiProfile, ContentCandidate } from './types';

// ── Types ──

export interface RecommendationLogEntry {
  id?: string;
  user_id: string;
  tmdb_id: string;
  media_type: string;
  title?: string;
  recommended_at?: string;
  context?: string;
  user_response?: 'pending' | 'watched' | 'ignored' | 'rejected' | 'added_to_watchlist' | 'not_interested';
  rejection_reason?: string;
  metadata?: Record<string, unknown>;
}

const WATCHED_SIGNAL_TYPES = new Set([
  'completed_silent',
  'completion',
  'watched_70pct',
  'watched_40pct',
  'watch_start',
  'one_shot_watched',
]);

// ── Logging ──

export async function logRecommendation(
  entry: RecommendationLogEntry
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('recommendation_log').insert({
    user_id: entry.user_id,
    tmdb_id: entry.tmdb_id,
    media_type: entry.media_type,
    title: entry.title ?? null,
    context: entry.context ?? null,
    user_response: 'pending',
    metadata: entry.metadata ?? {},
  });
  if (error) console.warn('[rec-log] insert failed', error.message);
}

export async function logBatchRecommendations(
  entries: RecommendationLogEntry[]
): Promise<void> {
  if (entries.length === 0) return;
  const supabase = createClient();
  const rows = entries.map(e => ({
    user_id: e.user_id,
    tmdb_id: e.tmdb_id,
    media_type: e.media_type,
    title: e.title ?? null,
    context: e.context ?? null,
    user_response: 'pending',
    metadata: e.metadata ?? {},
  }));
  const { error } = await supabase.from('recommendation_log').insert(rows);
  if (error) console.warn('[rec-log] batch insert failed', error.message);
}

// ── Response Recording ──

export async function recordUserResponse(
  userId: string,
  tmdbId: string,
  response: RecommendationLogEntry['user_response'],
  rejectionReason?: string
): Promise<void> {
  const supabase = createClient();
  await supabase
    .from('recommendation_log')
    .update({
      user_response: response,
      rejection_reason: rejectionReason ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('tmdb_id', tmdbId)
    .eq('user_response', 'pending');
}

// ── Pillar 3: Deterministic Unseen Filter ──

interface ExcludedIds {
  watched: Set<string>;
  rejected: Set<string>;
  notInterested: Set<string>;
  recentlyIgnored: Set<string>;
  recentlyRejected: Set<string>;
  lowRated: Set<string>;
  abandonedEarly: Set<string>;
}

export async function getExcludedContentIds(userId: string): Promise<ExcludedIds> {
  const supabase = createClient();

  const thirtyDaysAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [signalsRes, logRes, historyRes, ratingsRes] = await Promise.all([
    supabase
      .from('user_signals')
      .select('tmdb_id, signal_weight, signal_type, context')
      .eq('user_id', userId),
    supabase
      .from('recommendation_log')
      .select('tmdb_id, user_response, recommended_at')
      .eq('user_id', userId)
      .gte('recommended_at', thirtyDaysAgoIso),
    supabase
      .from('watch_history')
      .select('content_id, position_seconds, completed')
      .eq('user_id', userId),
    supabase
      .from('ratings')
      .select('content_id, rating')
      .eq('user_id', userId),
  ]);

  const signals = signalsRes.data ?? [];
  const logEntries = logRes.data ?? [];
  const historyRows = historyRes.data ?? [];
  const ratingRows = ratingsRes.data ?? [];

  const watched = new Set<string>();
  const rejected = new Set<string>();
  const notInterested = new Set<string>();
  const lowRated = new Set<string>();
  const abandonedEarly = new Set<string>();

  for (const s of signals as any[]) {
    if (!s.tmdb_id) continue;
    if (WATCHED_SIGNAL_TYPES.has(String(s.signal_type))) {
      watched.add(String(s.tmdb_id));
    }
    if (s.signal_weight <= -5) rejected.add(String(s.tmdb_id));
    if (s.signal_type === 'not_for_me' || s.signal_type === 'hide_forever') notInterested.add(s.tmdb_id);
    if (s.signal_type === 'abandoned_early') abandonedEarly.add(String(s.tmdb_id));
  }

  for (const row of historyRows as any[]) {
    if (row.content_id && (row.completed || Number(row.position_seconds ?? 0) > 0)) {
      watched.add(String(row.content_id));
    }
  }

  for (const row of ratingRows as any[]) {
    if (!row.content_id) continue;
    const rating = Number(row.rating ?? 0);
    if (rating > 0) watched.add(String(row.content_id));
    if (rating > 0 && rating < 3) lowRated.add(String(row.content_id));
  }

  const recentlyIgnored = new Set<string>();
  const recentlyRejected = new Set<string>();
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  for (const log of logEntries as any[]) {
    const recTime = new Date(log.recommended_at).getTime();
    if (recTime < thirtyDaysAgo) continue;

    if (log.user_response === 'ignored') recentlyIgnored.add(log.tmdb_id);
    if (log.user_response === 'rejected') recentlyRejected.add(log.tmdb_id);
  }

  return { watched, rejected, notInterested, recentlyIgnored, recentlyRejected, lowRated, abandonedEarly };
}

export function applyDeterministicFilter(
  candidates: ContentCandidate[],
  excluded: ExcludedIds,
): ContentCandidate[] {
  return candidates.filter(c => {
    if (excluded.watched.has(c.tmdb_id)) return false;
    if (excluded.rejected.has(c.tmdb_id)) return false;
    if (excluded.notInterested.has(c.tmdb_id)) return false;
    if (excluded.recentlyIgnored.has(c.tmdb_id)) return false;
    if (excluded.recentlyRejected.has(c.tmdb_id)) return false;
    if (excluded.lowRated.has(c.tmdb_id)) return false;
    if (excluded.abandonedEarly.has(c.tmdb_id)) return false;
    return true;
  });
}

// ── Recommendation Log Cleanup ──

export async function cleanupOldLogEntries(days = 90): Promise<void> {
  const supabase = createClient();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  await supabase
    .from('recommendation_log')
    .delete()
    .lt('recommended_at', cutoff)
    .neq('user_response', 'pending');
}
