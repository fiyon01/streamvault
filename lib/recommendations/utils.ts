import { ContentDNA, UserTasteProfile, DNA_KEY_MAP } from './types';

// ─── Vector Math Utilities ────────────────────────────────────────────────────

/**
 * Flatten a ContentDNA JSONB object into a comparable numeric vector.
 * Each sub-object contributes its average value as a single dimension.
 */
export function dnaToVector(dna: Partial<ContentDNA>): number[] {
  const keys = [
    'narrative_structure', 'pacing', 'protagonist_type',
    'moral_complexity', 'tone', 'world_type',
    'emotional_core', 'stakes_level', 'resolution_type'
  ] as const;
  return keys.map(k => averageObject((dna as any)[k] ?? {}));
}

/**
 * Flatten a UserTasteProfile JSONB object into the same shape as dnaToVector.
 */
export function profileToVector(profile: Partial<UserTasteProfile>): number[] {
  const keys = [
    'narrative_structure', 'pacing_preference', 'protagonist_affinity',
    'moral_complexity', 'tone_affinity', 'world_type_affinity',
    'emotional_core_affinity', 'stakes_preference', 'resolution_preference'
  ] as const;
  return keys.map(k => averageObject((profile as any)[k] ?? {}));
}

function averageObject(obj: Record<string, number>): number {
  const vals = Object.values(obj);
  if (vals.length === 0) return 0.5;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/**
 * Cosine similarity between two numeric vectors (0 = perpendicular, 1 = identical)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Compute weighted average of multiple ContentDNA objects.
 */
export function averageContentDNA(
  items: { dna: Partial<ContentDNA>; weight: number }[]
): Record<string, Record<string, number>> {
  const keys = Object.keys(DNA_KEY_MAP);
  const result: Record<string, Record<string, number>> = {};
  let totalWeight = 0;

  for (const key of keys) {
    result[key] = {};
  }

  for (const { dna, weight } of items) {
    totalWeight += weight;
    for (const key of keys) {
      const obj = (dna as any)[key] ?? {};
      for (const [subKey, val] of Object.entries(obj)) {
        result[key][subKey] = (result[key][subKey] ?? 0) + (val as number) * weight;
      }
    }
  }

  if (totalWeight > 0) {
    for (const key of keys) {
      for (const subKey of Object.keys(result[key])) {
        result[key][subKey] = parseFloat((result[key][subKey] / totalWeight).toFixed(3));
      }
    }
  }

  return result;
}

/**
 * Apply negative signals as penalty adjustments to the aggregated DNA.
 */
export function applyNegativePenalties(
  dna: Record<string, Record<string, number>>,
  negativeItems: { dna: Partial<ContentDNA>; weight: number }[]
): Record<string, Record<string, number>> {
  const result = structuredClone(dna);
  for (const { dna: negDNA, weight } of negativeItems) {
    const penalty = Math.abs(weight) * 0.05; // Scale down penalty
    for (const key of Object.keys(DNA_KEY_MAP)) {
      const obj = (negDNA as any)[key] ?? {};
      for (const [subKey, val] of Object.entries(obj)) {
        if (result[key]?.[subKey] !== undefined) {
          // If we disliked content with high val on this dimension, lower our affinity
          if ((val as number) > 0.6) {
            result[key][subKey] = Math.max(0, result[key][subKey] - penalty);
          }
        }
      }
    }
  }
  return result;
}

/**
 * Find the top N JSONB sub-keys that are most similar between profile and content DNA.
 */
export function getTopMatchingDimensions(
  profile: Partial<UserTasteProfile>,
  content: Partial<ContentDNA>,
  topN = 3
): string[] {
  const profileKeys: Record<string, string> = {
    pacing_preference:     'pacing',
    protagonist_affinity:  'protagonist_type',
    moral_complexity:      'moral_complexity',
    tone_affinity:         'tone',
    world_type_affinity:   'world_type',
    emotional_core_affinity: 'emotional_core',
    stakes_preference:     'stakes_level',
    resolution_preference: 'resolution_type',
  };

  const scores: { dim: string; score: number }[] = [];

  for (const [profKey, dnaKey] of Object.entries(profileKeys)) {
    const profObj = (profile as any)[profKey] ?? {};
    const dnaObj  = (content as any)[dnaKey] ?? {};
    const keys    = Object.keys({ ...profObj, ...dnaObj });
    if (keys.length === 0) continue;
    let dotScore = 0;
    for (const k of keys) {
      dotScore += (profObj[k] ?? 0) * (dnaObj[k] ?? 0);
    }
    scores.push({ dim: profKey.replace(/_affinity|_preference/, '').replace(/_/g, ' '), score: dotScore });
  }

  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(s => s.dim);
}

/**
 * Find shared theme strings between user profile and content DNA.
 */
export function getSharedThemes(
  profile: Partial<UserTasteProfile>,
  content: Partial<ContentDNA>
): string[] {
  const profileThemes = Object.keys(profile.theme_scores ?? {});
  const contentThemes = content.themes ?? [];
  return contentThemes.filter(t =>
    profileThemes.some(pt => pt.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(pt.toLowerCase()))
  );
}

/**
 * Score how well a runtime fits within a user's preferred range.
 */
export function scoreRuntimeFit(runtime: number, min: number, max: number): number {
  if (runtime >= min && runtime <= max) return 1.0;
  if (runtime < min) return Math.max(0, 1 - (min - runtime) / min);
  return Math.max(0, 1 - (runtime - max) / max);
}

/**
 * Normalize any 0–10 score (TMDB/IMDb) to a 0–1 quality metric.
 */
export function normalizeQualityScore(score?: number): number {
  if (!score) return 0.5;
  return Math.min(1, Math.max(0, (score - 5) / 5));
}
