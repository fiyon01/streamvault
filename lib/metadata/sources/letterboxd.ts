import type { ExternalMetadata } from '../types';

/**
 * Synthetic Letterboxd-style signals — estimated from TMDB vote data.
 *
 * Letterboxd has no public API. All values here are derived estimates,
 * not real Letterboxd data. Use only for internal scoring signals (VAULT
 * recommendation engine, niche ranking, long-tail scoring). Never display
 * raw values to users as if they came from Letterboxd directly.
 *
 * Signals computed:
 * - popularityRank     : lower vote counts → more niche
 * - nicheScore         : high quality relative to low mainstream visibility
 * - cultStatus         : passionate minority signal (rating/popularity tension)
 * - divisiveness       : bimodal rating distribution detection
 * - longTailScore      : composite obscurity × quality signal for VAULT
 */

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface RatingHistogram {
  '0.5': number;
  '1': number;
  '1.5': number;
  '2': number;
  '2.5': number;
  '3': number;
  '3.5': number;
  '4': number;
  '4.5': number;
  '5': number;
}

interface LetterboxdStyleSignals {
  popularityRank: number;
  estimatedMemberCount: number;
  estimatedFanCount: number;
  estimatedRatingCount: number;
  estimatedReviewCount: number;
  estimatedListCount: number;
  averageRating: number;
  ratingHistogram: Record<string, number>;
  nicheScore: number;
  cultStatus: number;
  divisiveness: number;
  longTailScore: number;
  isSynthetic: true; // always true — marks this as estimated, not real API data
}

type LetterboxdBatchTitle = {
  tmdbId: string;
  mediaType: 'movie' | 'tv';
  title: string;
  voteAverage?: number;
  voteCount?: number;
};

type LongTailSortable<T extends object = Record<string, unknown>> = T & {
  metadata: Partial<ExternalMetadata>;
};

// ─── Histogram Generation ────────────────────────────────────────────────────

/**
 * Generates a plausible rating distribution histogram.
 * Uses a Gaussian curve centred on avgRating.
 * For high divisiveness content, simulates a bimodal distribution.
 */
function generateHistogram(
  avgRating: number,
  totalVotes: number,
  bimodal = false
): RatingHistogram {
  const buckets: Array<keyof RatingHistogram> = [
    '0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5',
  ];

  const result = {} as RatingHistogram;

  for (const b of buckets) {
    const bVal = parseFloat(b);

    let density: number;

    if (bimodal) {
      // Bimodal: two peaks at ~2.0 and ~4.5 simulating love/hate split
      const peak1 = Math.exp(-((bVal - 2.0) ** 2) / (2 * 0.8 ** 2));
      const peak2 = Math.exp(-((bVal - 4.5) ** 2) / (2 * 0.8 ** 2));
      density = (peak1 + peak2) / 2;
    } else {
      // Normal bell curve centred on avgRating
      const sigma = 1.2;
      const dist = bVal - avgRating;
      density = Math.exp(-(dist ** 2) / (2 * sigma ** 2));
    }

    result[b] = Math.max(0, Math.round(density * (totalVotes / 8)));
  }

  return result;
}

// ─── Divisiveness Detection ──────────────────────────────────────────────────

/**
 * Computes divisiveness from histogram shape.
 * Real divisiveness = high votes at both extremes, low votes in the middle.
 * Returns 0.0 (everyone agrees) to 1.0 (strongly polarised).
 */
function computeDivisiveness(histogram: RatingHistogram): number {
  const total = Object.values(histogram).reduce((a, b) => a + b, 0);
  if (total === 0) return 0;

  const lowEnd =
    (histogram['0.5'] ?? 0) +
    (histogram['1'] ?? 0) +
    (histogram['1.5'] ?? 0) +
    (histogram['2'] ?? 0);

  const highEnd =
    (histogram['4'] ?? 0) +
    (histogram['4.5'] ?? 0) +
    (histogram['5'] ?? 0);

  const middle =
    (histogram['2.5'] ?? 0) +
    (histogram['3'] ?? 0) +
    (histogram['3.5'] ?? 0);

  const extremeRatio = (lowEnd + highEnd) / total;
  const middleRatio = middle / total;

  // High extremeRatio + low middleRatio = divisive
  return Math.min(1, Math.max(0, extremeRatio - middleRatio + 0.1));
}

// ─── Niche Score ─────────────────────────────────────────────────────────────

/**
 * Niche score: how obscure-yet-quality a title is.
 * High rating + low vote count = high niche score.
 * Used by VAULT's long-tail ranking to surface hidden gems.
 *
 * Returns 0.0 to 1.0.
 */
function computeNicheScore(
  normalizedRating: number,
  normalizedPop: number
): number {
  if (normalizedRating <= 0) return 0.05;

  // Boost titles that are highly rated but under the mainstream radar
  const qualityWeight = normalizedRating > 0.6 ? 1.25 : 1.0;
  const obscurityWeight = 1 - normalizedPop;

  return Math.min(1, Math.max(0.05,
    normalizedRating * obscurityWeight * qualityWeight
  ));
}

// ─── Cult Status ─────────────────────────────────────────────────────────────

/**
 * Cult status: passionate minority signal.
 * A film can be niche but deeply loved by a small group.
 * Derived from the tension between rating quality and low mainstream reach.
 *
 * Returns 0.0 to 1.0.
 */
function computeCultStatus(
  normalizedRating: number,
  normalizedPop: number,
  avgRating: number
): number {
  // Cult films tend to be highly rated but not widely seen
  const passionSignal = normalizedRating * (1 - normalizedPop * 0.5);
  const ratingBoost = avgRating > 7.5 ? 1.3 : avgRating > 6.5 ? 1.0 : 0.7;

  return Math.min(1, Math.max(0.05, passionSignal * ratingBoost));
}

// ─── Long Tail Score ─────────────────────────────────────────────────────────

/**
 * Long tail score: the primary signal VAULT uses for power-user recommendations.
 * Composite of niche score, cult status, and divisiveness (inversely).
 *
 * High long tail score = high quality, low popularity, non-divisive.
 * These are the titles a power user has not seen but should have.
 *
 * Returns 0.0 to 1.0.
 */
function computeLongTailScore(
  nicheScore: number,
  cultStatus: number,
  divisiveness: number
): number {
  // Divisive titles are penalised slightly — they are niche for the wrong reason
  const divisivenessPenalty = 1 - divisiveness * 0.3;
  return Math.min(1, Math.max(0,
    ((nicheScore * 0.5) + (cultStatus * 0.4) + ((1 - divisiveness) * 0.1))
    * divisivenessPenalty
  ));
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export async function enrichFromLetterboxdStyle(
  tmdbId: string,
  mediaType: 'movie' | 'tv',
  title: string,
  voteAverage?: number,
  voteCount?: number
): Promise<Partial<ExternalMetadata>> {
  void tmdbId;
  void mediaType;
  void title;

  const avgRating = voteAverage ?? 7;
  const totalVotes = voteCount ?? 5000;

  // Convert TMDB's 0-10 scale to Letterboxd's 0.5-5.0 scale
  const avgRatingLetterboxd = avgRating / 2;

  // Normalise to 0–1 scale
  const normalizedRating = Math.max(0, Math.min(1, (avgRatingLetterboxd - 2.5) / 2.5));
  const normalizedPop = Math.min(1, totalVotes / 100_000);

  // Estimated counts — synthetic ratios derived from TMDB vote data
  // These are approximations only. Do not expose as Letterboxd data.
  const estimatedMemberCount = Math.round(totalVotes * 1.2);
  const estimatedFanCount = Math.round(totalVotes * 0.15);
  const estimatedRatingCount = totalVotes;
  const estimatedReviewCount = Math.round(totalVotes * 0.02);
  const estimatedListCount = Math.round(totalVotes * 0.05);
  const popularityRank = Math.max(1, Math.round(1_000_000 / Math.max(1, totalVotes)));

  // Determine if the title is likely divisive to shape the histogram
  // Proxy: moderate average rating (5.5–6.5) with reasonable vote count
  const likelyBimodal =
    avgRating >= 5.5 && avgRating <= 6.8 && totalVotes > 10_000;

  const ratingHistogram = generateHistogram(avgRatingLetterboxd, totalVotes, likelyBimodal);

  // Core signals
  const nicheScore = computeNicheScore(normalizedRating, normalizedPop);
  const cultStatus = computeCultStatus(normalizedRating, normalizedPop, avgRating);
  const divisiveness = computeDivisiveness(ratingHistogram);
  const longTailScore = computeLongTailScore(nicheScore, cultStatus, divisiveness);

  const signals: LetterboxdStyleSignals = {
    popularityRank,
    estimatedMemberCount,
    estimatedFanCount,
    estimatedRatingCount,
    estimatedReviewCount,
    estimatedListCount,
    averageRating: avgRatingLetterboxd,
    ratingHistogram: { ...ratingHistogram },
    nicheScore,
    cultStatus,
    divisiveness,
    longTailScore,
    isSynthetic: true,
  };

  return {
    letterboxd: signals,
  };
}

// ─── Utility: Batch Enrichment ───────────────────────────────────────────────

/**
 * Enriches multiple titles at once.
 * Used during catalogue ingestion to pre-compute long tail scores in bulk.
 */
export async function batchEnrichFromLetterboxdStyle(
  titles: LetterboxdBatchTitle[]
): Promise<Array<Partial<ExternalMetadata>>> {
  return Promise.all(
    titles.map((t) =>
      enrichFromLetterboxdStyle(
        t.tmdbId,
        t.mediaType,
        t.title,
        t.voteAverage,
        t.voteCount
      )
    )
  );
}

// ─── Utility: Long Tail Rank Sort ────────────────────────────────────────────

/**
 * Sorts an array of enriched metadata by longTailScore descending.
 * Used by VAULT's power-user retrieval mode to surface hidden gems first.
 */
export function sortByLongTailScore(
  items: Array<LongTailSortable>
): typeof items {
  return [...items].sort((a, b) => {
    const scoreA = a.metadata?.letterboxd?.longTailScore ?? 0;
    const scoreB = b.metadata?.letterboxd?.longTailScore ?? 0;
    return scoreB - scoreA;
  });
}
