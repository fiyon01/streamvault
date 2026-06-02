import { MoodContext, RecommendationWeights, ContentCandidate, RankedCandidate, UserTasteProfile } from './types';
import { cosineSimilarity, profileToVector, dnaToVector, normalizeQualityScore } from './utils';
import { scoreMoodMatch } from './mood-engine';
import { computeFreshnessScore } from './freshness-engine';
import { generateExplanation } from './explanation-engine';
import { applyAntiProfile, getAntiProfile } from './anti-engine';

export async function rankCandidates(
  candidates: ContentCandidate[],
  profile: UserTasteProfile,
  mood: MoodContext,
  weights: RecommendationWeights,
  userId: string,
  limit = 20
): Promise<RankedCandidate[]> {
  const anti     = await getAntiProfile(userId);
  const filtered = applyAntiProfile(candidates, anti);

  const profileVec = profileToVector(profile);

  const scored = filtered.slice(0, 60).map(candidate => {
    const dnaVec       = candidate.content_dna ? dnaToVector(candidate.content_dna) : [];
    const dnaSim       = dnaVec.length > 0 ? cosineSimilarity(profileVec, dnaVec) : 0.5;
    const moodScore    = scoreMoodMatch(mood, candidate.content_dna?.mood_tags ?? []);
    const qualityScore = normalizeQualityScore(candidate.imdb_score);
    const freshScore   = computeFreshnessScore(profile, candidate);
    const antiPen      = candidate.antiPenalty ?? 0;

    const finalScore = (
      dnaSim       * weights.tasteDNA     +
      moodScore    * weights.moodMatch    +
      qualityScore * weights.quality      +
      freshScore   * weights.freshness    -
      antiPen
    );

    const signals: string[] = [];
    if (dnaSim > 0.7)       signals.push('taste_dna');
    if (moodScore > 0.7)    signals.push('mood_match');
    if (qualityScore > 0.7) signals.push('high_quality');
    if (candidate.content_dna?.raw_analysis?.includes('Why it matters:')) signals.push('streamvault_canon');

    return { ...candidate, finalScore, confidence: profile.confidence_score, signals, explanation: '' };
  });

  const ranked = scored
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, limit);

  // Generate explanations for top results only (API cost)
  const withExplanations = await Promise.all(
    ranked.map(async r => {
      if (r.content_dna?.raw_analysis?.includes('Why it matters:')) {
        return { ...r, explanation: r.content_dna.raw_analysis };
      }
      try {
        const exp = await generateExplanation(userId, r.tmdb_id, r.media_type as 'movie' | 'tv');
        return { ...r, explanation: exp };
      } catch {
        return { ...r, explanation: `A strong match for your taste profile.` };
      }
    })
  );

  return withExplanations;
}
