import { createClient } from '@/lib/supabase/server';
import { ContentDNA, UserTasteProfile } from './types';
import { cosineSimilarity, dnaToVector, profileToVector, normalizeQualityScore } from './utils';

// ── Pillar 4: Long Tail Ranking ──

export interface LongTailScore {
  tmdbId: string;
  title: string;
  mediaType: string;
  qualityScore: number;
  tasteCompatibility: number;
  popularityIndex: number;
  longTailScore: number;
  hiddenGemScore: number;
  awardRecognition?: number;
}

/**
 * Compute the long tail score for a single content item.
 * 
 * long_tail_score = (quality_score × taste_compatibility) / log10(popularity_index + 1)
 * 
 * High quality + high taste compatibility + low popularity = high long tail score
 */
export function computeLongTailScore(
  contentDNA: ContentDNA,
  profile: UserTasteProfile,
  popularityIndex: number,
  awardRecognition = 0
): LongTailScore {
  const dnaVec = dnaToVector(contentDNA);
  const profVec = profileToVector(profile);
  const tasteCompatibility = dnaVec.length > 0 && profVec.length > 0
    ? cosineSimilarity(profVec, dnaVec)
    : 0.5;

  const qualityScore = (
    normalizeQualityScore(parseFloat(String(contentDNA.critical_consensus ?? 0.5))) * 0.3 +
    normalizeQualityScore(contentDNA.hook_strength ?? 0.5) * 0.2 +
    normalizeQualityScore(contentDNA.finale_satisfaction ?? 0.5) * 0.15 +
    normalizeQualityScore(contentDNA.audience_consensus ?? 0.5) * 0.15 +
    (awardRecognition * 0.2)
  );

  const popIndex = Math.max(1, popularityIndex);
  const longTailScore = (qualityScore * tasteCompatibility) / Math.log10(popIndex + 1);

  return {
    tmdbId: contentDNA.tmdb_id,
    title: contentDNA.title,
    mediaType: contentDNA.media_type,
    qualityScore,
    tasteCompatibility,
    popularityIndex: popIndex,
    longTailScore,
    hiddenGemScore: contentDNA.hidden_gem_score ?? 0,
    awardRecognition,
  };
}

/**
 * Rank content candidates by long-tail score for power users.
 * Persists scores to content_long_tail table.
 */
export async function rankByLongTail(
  userId: string,
  profile: UserTasteProfile,
  limit = 30
): Promise<LongTailScore[]> {
  const supabase = createClient();

  // Fetch candidates not watched by user
  const { data: contentList } = await supabase
    .from('content_dna')
    .select('*, content_metadata(total_episode_count, country_of_origin)')
    .not('tmdb_id', 'in', `(select tmdb_id from user_signals where user_id = '${userId}')`)
    .order('hook_strength', { ascending: false })
    .limit(100);

  if (!contentList || contentList.length === 0) return [];

  const scored = await Promise.all(contentList.map(async (content: any) => {
    // Check if we already have a long tail record
    const { data: ltRecord } = await supabase
      .from('content_long_tail')
      .select('*')
      .eq('tmdb_id', content.tmdb_id)
      .single();

    const popularity = ltRecord?.popularity_index ?? content.popularity_index ?? 50000;
    const awards = ltRecord?.award_recognition ?? 0;

    const score = computeLongTailScore(content as ContentDNA, profile, popularity, awards);

    // Update the record with latest taste compatibility
    await supabase.from('content_long_tail').upsert({
      tmdb_id: content.tmdb_id,
      media_type: content.media_type,
      quality_score: score.qualityScore,
      popularity_index: popularity,
      long_tail_score: score.longTailScore,
      award_recognition: awards,
      hidden_gem_score: score.hiddenGemScore,
      last_computed: new Date().toISOString(),
    });

    return score;
  }));

  return scored
    .sort((a, b) => b.longTailScore - a.longTailScore)
    .slice(0, limit);
}
