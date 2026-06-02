import { createClient } from '@/lib/supabase/server';
import { UserTasteProfile, ContentCandidate } from './types';
import { normalizeQualityScore } from './utils';

export function computeFreshnessScore(
  profile: UserTasteProfile,
  candidate: ContentCandidate
): number {
  // For now, freshness = quality score (higher quality = more worth surfacing)
  // Future: compare candidate DNA to profile DNA, find "stretch" content 0.3-0.6 similarity
  const q = normalizeQualityScore(candidate.imdb_score);
  return q * 0.8 + 0.1; // clamp between 0.1 and 0.9
}

export async function getHiddenGems(
  userId: string,
  limit = 10
): Promise<ContentCandidate[]> {
  const supabase = createClient();

  // Hidden gems = AI-analyzed content NOT widely known by the user's cluster
  // For now, we pull from content_dna that has low vote counts but high hook_strength
  const { data } = await supabase
    .from('content_dna')
    .select('tmdb_id, media_type, title, mood_tags, hook_strength')
    .gt('hook_strength', 0.65)
    .not('tmdb_id', 'in', `(select tmdb_id from user_signals where user_id = '${userId}')`)
    .order('hook_strength', { ascending: false })
    .limit(limit);

  return (data ?? []).map((d: any) => ({
    tmdb_id:    d.tmdb_id,
    media_type: d.media_type,
    title:      d.title,
  }));
}
