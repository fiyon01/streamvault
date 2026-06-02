import { createClient } from '@/lib/supabase/server';
import { ContentCandidate, RankedCandidate, UserTasteProfile, MoodContext, RecommendationWeights } from './types';
import { getExcludedContentIds, applyDeterministicFilter, logBatchRecommendations } from './recommendation-log';
import { rankByLongTail, LongTailScore } from './long-tail';
import { computeCoverage, getBlindSpots, BlindSpot } from './blind-spot';
import { rankCandidates } from './ranker';
import { dnaToVector, profileToVector, cosineSimilarity } from './utils';
import { getCanonCandidates } from '@/lib/canon/query';

// ── Pillar 6: Power User Detection ──

export interface PowerUserStatus {
  isPowerUser: boolean;
  triggers: string[];
  totalWatched: number;
  coverageScore: number;
}

export async function detectPowerUser(userId: string): Promise<PowerUserStatus> {
  const supabase = createClient();
  const triggers: string[] = [];

  const { data: profile } = await supabase
    .from('user_taste_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  let totalWatched = Number((profile as any)?.total_titles_watched ?? 0);
  let coverageScore = Number((profile as any)?.coverage_score ?? 0);

  const staleCoverage = !(profile as any)?.last_coverage_computed ||
    new Date((profile as any).last_coverage_computed).getTime() < Date.now() - 24 * 60 * 60 * 1000;

  if (staleCoverage || totalWatched === 0) {
    const coverage = await computeCoverage(userId).catch(() => []);
    if (coverage.length > 0) {
      coverageScore = coverage.reduce((sum, entry) => sum + entry.coveragePct, 0) / coverage.length;
    }
  }

  if (totalWatched === 0) {
    const [historyCount, signalCount] = await Promise.all([
      supabase
        .from('watch_history')
        .select('content_id', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase
        .from('user_signals')
        .select('tmdb_id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('signal_weight', 1),
    ]);
    totalWatched = Math.max(historyCount.count ?? 0, signalCount.count ?? 0);
  }

  if (totalWatched > 200) triggers.push('watch_history: 200+ titles');
  if (coverageScore > 65) triggers.push('coverage_score: 65%+ in major category');
  if ((profile as any)?.is_power_user) triggers.push('explicit power_user flag');

  return {
    isPowerUser: triggers.length > 0,
    triggers,
    totalWatched,
    coverageScore,
  };
}

// ── Retrieval Modes ──

export type RetrievalMode = 'standard' | 'power_user';

export interface RetrievalResult {
  mode: RetrievalMode;
  candidates: RankedCandidate[];
  blindSpots: BlindSpot[];
  powerUserStatus: PowerUserStatus;
  totalFiltered: number;
}

/**
 * Power User Retrieval Flow:
 * 1. Run deterministic unseen filter → exclude watched, rejected, etc.
 * 2. Apply Taste DNA compatibility to remaining catalogue
 * 3. Apply long-tail ranking
 * 4. Remove recently suggested from recommendation_log
 * 5. Return final ranked list with specific reasoning
 */
export async function retrieveCandidates(
  userId: string,
  profile: UserTasteProfile,
  mood: MoodContext,
  weights: RecommendationWeights,
  limit = 30,
): Promise<RetrievalResult> {
  const supabase = createClient();

  // 1. Detect power user
  const powerUserStatus = await detectPowerUser(userId);
  const mode: RetrievalMode = powerUserStatus.isPowerUser ? 'power_user' : 'standard';
  const isPowerUser = mode === 'power_user';

  // 2. Deterministic unseen filter (always runs)
  const excluded = await getExcludedContentIds(userId);

  // 3. Fetch candidates
  let candidates: ContentCandidate[] = [];
  let blindSpots: BlindSpot[] = [];
  let totalFiltered = 0;
  const canonCandidates = await getCanonCandidates({
    limit: isPowerUser ? 36 : 24,
    powerUser: isPowerUser,
    profile,
  });

  if (isPowerUser) {
    // Power user mode: use long-tail ranking
    const longTailResults = await rankByLongTail(userId, profile, limit * 2);

    // Get blind spots for power users
    blindSpots = await getBlindSpots(userId, 5);

    candidates = longTailResults.map((lt: LongTailScore) => ({
      tmdb_id: lt.tmdbId,
      media_type: lt.mediaType,
      title: lt.title,
      imdb_score: lt.qualityScore * 10,
      content_dna: undefined,
    }));

    // Enrich with content_dna
    const enriched = await enrichCandidatesWithDNA(candidates);
    candidates = mergeCanonFirst(canonCandidates, enriched);
  } else {
    // Standard mode: pull from content_dna with taste match
    const { data: dnaItems } = await supabase
      .from('content_dna')
      .select('*')
      .not('tmdb_id', 'in', `(select tmdb_id from user_signals where user_id = '${userId}')`)
      .order('hook_strength', { ascending: false })
      .limit(100);

    const dnaCandidates = (dnaItems ?? []).map((d: any) => ({
      tmdb_id: d.tmdb_id,
      media_type: d.media_type,
      title: d.title,
      content_dna: d,
      imdb_score: d.critical_consensus ? d.critical_consensus * 10 : 7,
    }));
    candidates = mergeCanonFirst(canonCandidates, dnaCandidates);
  }

  // 4. Apply deterministic filter
  const filtered = applyDeterministicFilter(candidates, excluded);
  totalFiltered = candidates.length - filtered.length;

  // 5. Remove recently suggested
  const { data: recentLogs } = await supabase
    .from('recommendation_log')
    .select('tmdb_id')
    .eq('user_id', userId)
    .eq('user_response', 'pending')
    .gte('recommended_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  const recentSuggested = new Set((recentLogs ?? []).map((r: any) => r.tmdb_id));
  const finalCandidates = filtered.filter(c => !recentSuggested.has(c.tmdb_id));

  // 6. Rank
  const ranked = await rankCandidates(finalCandidates, profile, mood, weights, userId, limit);

  // 7. Log recommendations
  await logBatchRecommendations(
    ranked.map(r => ({
      user_id: userId,
      tmdb_id: r.tmdb_id,
      media_type: r.media_type,
      title: r.title,
      context: isPowerUser ? 'power_user_long_tail' : 'taste_dna',
      metadata: { score: r.finalScore, mode },
    }))
  );

  return {
    mode,
    candidates: ranked,
    blindSpots,
    powerUserStatus,
    totalFiltered,
  };
}

// ── Generate Power User Summary ──

export function generatePowerUserSummary(
  result: RetrievalResult,
  profile: UserTasteProfile
): string {
  if (!result.powerUserStatus.isPowerUser) {
    return `Based on your taste profile, here are ${result.candidates.length} recommendations matched to your preferences.`;
  }

  const watched = result.powerUserStatus.totalWatched;
  const topBlindSpot = result.blindSpots[0];

  let summary = `You have seen ${watched} titles — more than most viewers. `;

  if (topBlindSpot) {
    summary += `Your biggest blind spot is ${topBlindSpot.label} (only ${Math.round(topBlindSpot.coveragePct)}% covered) — and it maps ${Math.round(topBlindSpot.tasteAffinity * 100)}% to your taste. `;
  }

  summary += `The ${result.candidates.length} recommendations below are genuinely overlooked titles matched specifically to you.`;

  return summary;
}

// ── Helpers ──

async function enrichCandidatesWithDNA(candidates: ContentCandidate[]): Promise<ContentCandidate[]> {
  const supabase = createClient();
  const tmdbIds = candidates.map(c => c.tmdb_id);

  const { data: dnaData } = await supabase
    .from('content_dna')
    .select('*')
    .in('tmdb_id', tmdbIds);

  const dnaMap = new Map((dnaData ?? []).map((d: any) => [d.tmdb_id, d]));

  return candidates.map(c => ({
    ...c,
    content_dna: dnaMap.get(c.tmdb_id) ?? c.content_dna,
  }));
}

function mergeCanonFirst(canon: ContentCandidate[], candidates: ContentCandidate[]) {
  const seen = new Set<string>();
  const merged: ContentCandidate[] = [];

  for (const candidate of [...canon, ...candidates]) {
    const key = `${candidate.media_type}:${candidate.tmdb_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(candidate);
  }

  return merged;
}
