/**
 * Watch DNA Match — Group Intersection Engine
 *
 * Computes the DNA overlap (matches + tensions) between a set of users and
 * surfaces personalised group recommendations using TMDB + DeepSeek.
 */

import { createClient } from '@/lib/supabase/server';
import { callDeepSeek } from '@/lib/recommendations/deepseek';
import { tmdb } from '@/lib/tmdb/api';
import type { DNADimension, DNAIntersection, GroupRecommendation, SessionPreferences } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * The 9 canonical DNA dimensions, in index order matching the `dna_vector`
 * JSONB array stored in `user_taste_profiles`.
 */
const DNA_DIMENSIONS = [
  'pacing',     // index 0
  'morality',   // index 1
  'tone',       // index 2
  'reality',    // index 3
  'focus',      // index 4
  'stakes',     // index 5
  'structure',  // index 6
  'texture',    // index 7
  'resolution', // index 8
] as const;

type DimensionName = (typeof DNA_DIMENSIONS)[number];

/** Human-readable labels for low / high ends of each dimension */
const DIMENSION_LABELS: Record<DimensionName, { low: string; high: string }> = {
  pacing:     { low: 'slow-burn storytelling',    high: 'fast-paced, edge-of-your-seat action' },
  morality:   { low: 'morally complex characters', high: 'clear-cut heroes and villains'         },
  tone:       { low: 'dark and gritty narratives', high: 'light-hearted, feel-good stories'      },
  reality:    { low: 'grounded, realistic drama',  high: 'fantastical, world-building epics'     },
  focus:      { low: 'ensemble, plot-driven arcs', high: 'deep character studies'                },
  stakes:     { low: 'intimate, low-stakes drama', high: 'world-ending, high-stakes thrills'     },
  structure:  { low: 'non-linear, artful structure','high': 'tight, satisfying narrative arcs'   },
  texture:    { low: 'raw, minimalist aesthetics',  high: 'lush, cinematic production values'    },
  resolution: { low: 'open-ended, thought-provoking endings', high: 'cathartic, resolved finales' },
};

/** Resolution hints when the group is split on a dimension */
const TENSION_RESOLUTIONS: Record<DimensionName, string> = {
  pacing:     'Look for films with a slow build but a gripping final act.',
  morality:   'Anthology series let each viewer root for different characters.',
  tone:       'Dark comedies or bittersweet dramas often satisfy both camps.',
  reality:    'Grounded sci-fi or "magical realism" can bridge both worlds.',
  focus:      'Character-driven dramas with strong ensemble casts work well.',
  stakes:     'Thriller-dramas that start small but escalate hit the sweet spot.',
  structure:  'Films with a mystery hook offer structure AND artful storytelling.',
  texture:    'Award-winning prestige TV balances cinematic flair with raw honesty.',
  resolution: "Miniseries with definitive endings respect everyone's preferences.",
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Compute arithmetic mean of a number array. */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Compute population variance of a number array. */
function variance(values: number[], avg: number): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
}

/** Extract a score from a dna_vector (array or object). Default to 0.5 if missing. */
function extractScore(dnaVector: unknown, index: number): number {
  if (Array.isArray(dnaVector)) {
    const val = dnaVector[index];
    return typeof val === 'number' ? Math.min(1, Math.max(0, val)) : 0.5;
  }
  return 0.5;
}

/** Build a human-readable match description for a dimension. */
function buildMatchDescription(dimension: DimensionName, avg: number): string {
  const label = DIMENSION_LABELS[dimension];
  if (avg <= 0.35) {
    return `You all love ${label.low}.`;
  } else if (avg >= 0.65) {
    return `You all enjoy ${label.high}.`;
  }
  return `You share a balanced taste — neither too ${label.low.split(',')[0]} nor too ${label.high.split(',')[0]}.`;
}

/** Build a human-readable tension description for a dimension. */
function buildTensionDescription(dimension: DimensionName, scores: number[]): string {
  const label = DIMENSION_LABELS[dimension];
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  return (
    `Your group is split: some prefer ${label.low} (score ${min.toFixed(2)}) ` +
    `while others lean towards ${label.high} (score ${max.toFixed(2)}).`
  );
}

/** Compute a simple 0-1 group compatibility score for a piece of content against computed averages. */
function computeGroupScore(dims: DNADimension[]): number {
  // Higher match ratio → higher group score; tension dimensions penalise slightly.
  const matchCount = dims.filter((d) => d.isMatch).length;
  const tensionCount = dims.filter((d) => d.isTension).length;
  const base = matchCount / dims.length;
  const penalty = (tensionCount / dims.length) * 0.2;
  return Math.max(0, Math.min(1, base - penalty));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute the DNA intersection for a group of users and return ranked
 * content recommendations.
 *
 * @param userIds     Array of Supabase user IDs to include in the session.
 * @param sessionPrefs Session-level content preferences (type, runtime, mood).
 * @returns           A fully populated DNAIntersection object.
 */
export async function computeGroupIntersection(
  userIds: string[],
  sessionPrefs: SessionPreferences,
): Promise<DNAIntersection> {
  if (userIds.length === 0) {
    throw new Error('computeGroupIntersection: userIds must not be empty.');
  }

  // ------------------------------------------------------------------
  // 1. Load taste profiles from Supabase
  // ------------------------------------------------------------------
  const supabase = await createClient();

  const { data: profiles, error } = await supabase
    .from('user_taste_profiles')
    .select('user_id, dna_vector')
    .in('user_id', userIds);

  if (error) {
    throw new Error(`Failed to load taste profiles: ${error.message}`);
  }

  // Build a map so we can handle missing profiles gracefully.
  const profileMap = new Map<string, unknown>();
  for (const profile of profiles ?? []) {
    profileMap.set(profile.user_id as string, profile.dna_vector);
  }

  // ------------------------------------------------------------------
  // 2 & 3. Extract per-dimension scores for every user
  // ------------------------------------------------------------------
  const dimensions: DNADimension[] = DNA_DIMENSIONS.map((dimension, idx) => {
    const scores = userIds.map((uid) => {
      const vec = profileMap.get(uid);
      return extractScore(vec, idx);
    });

    const avg = mean(scores);
    const vari = variance(scores, avg);
    const isMatch = vari < 0.15;
    const isTension = vari >= 0.3;

    return { dimension, scores, avg, variance: vari, isMatch, isTension };
  });

  // ------------------------------------------------------------------
  // 4–5. Classify into matches and tensions
  // ------------------------------------------------------------------
  const strongMatches = dimensions
    .filter((d) => d.isMatch)
    .map((d) => ({
      dimension: d.dimension,
      score: d.avg,
      description: buildMatchDescription(d.dimension as DimensionName, d.avg),
    }));

  const tensions = dimensions
    .filter((d) => d.isTension)
    .map((d) => ({
      dimension: d.dimension,
      scores: d.scores,
      description: buildTensionDescription(d.dimension as DimensionName, d.scores),
      resolution: TENSION_RESOLUTIONS[d.dimension as DimensionName],
    }));

  // ------------------------------------------------------------------
  // 8. Discover candidate content via TMDB
  // ------------------------------------------------------------------
  const groupScore = computeGroupScore(dimensions);

  let rawCandidates: any[] = [];

  const tmdbParams: Record<string, string> = {};
  if (sessionPrefs.moodQuery) tmdbParams.with_keywords = sessionPrefs.moodQuery;
  if (sessionPrefs.runtimeMax) tmdbParams['with_runtime.lte'] = sessionPrefs.runtimeMax.toString();

  if (sessionPrefs.contentType === 'movie' || sessionPrefs.contentType === 'either') {
    const movies = await tmdb.discoverMovies(tmdbParams);
    rawCandidates.push(...(movies.results || []));
  }

  if (sessionPrefs.contentType === 'show' || sessionPrefs.contentType === 'either') {
    const shows = await tmdb.discoverTv(tmdbParams);
    rawCandidates.push(...(shows.results || []));
  }

  // Filter by runtimeMax when both types are included and a limit is set.
  if (sessionPrefs.runtimeMax !== undefined) {
    rawCandidates = rawCandidates.filter((item: any) => {
      const runtime: number = item.runtime ?? item.episode_run_time?.[0] ?? 0;
      return runtime === 0 || runtime <= sessionPrefs.runtimeMax!;
    });
  }

  // Limit to top 5 candidates for recommendation generation.
  const topCandidates = rawCandidates.slice(0, 5);

  // ------------------------------------------------------------------
  // 9–10. Build recommendations with AI explanations
  // ------------------------------------------------------------------
  const matchSummary = strongMatches
    .map((m) => m.description)
    .join(' ');

  const recommendations: GroupRecommendation[] = await Promise.all(
    topCandidates.map(async (content): Promise<GroupRecommendation> => {
      const title: string = content.title ?? content.name ?? 'this title';

      // Build a prompt that references the group's DNA matches.
      const prompt =
        `You are a film/TV recommendation assistant. ` +
        `A group of ${userIds.length} people shares these tastes: ${matchSummary || 'varied tastes'}. ` +
        `In exactly 2 sentences, explain why "${title}" is a great watch for this group. ` +
        `Be specific and enthusiastic. Do not use bullet points.`;

      let explanation: string;
      try {
        explanation = await callDeepSeek(prompt);
      } catch {
        explanation = `"${title}" aligns well with the group's shared DNA, making it an excellent pick for tonight.`;
      }

      // Build per-person rationale stubs.
      const perPersonRationale: Record<string, string> = {};
      for (const uid of userIds) {
        const userVector = profileMap.get(uid);
        // Use the first strong match as the personal hook; fall back to a generic line.
        if (strongMatches.length > 0) {
          const topMatch = strongMatches[0];
          perPersonRationale[uid] =
            `Matches your taste for ${topMatch.description.replace(/^You (all |)/, '').replace(/\.$/, '')}.`;
        } else {
          perPersonRationale[uid] = `Chosen to balance the group's diverse preferences.`;
        }
      }

      return {
        content,
        explanation,
        groupScore,
        perPersonRationale,
      };
    }),
  );

  return { strongMatches, tensions, recommendations };
}
