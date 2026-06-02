import { createClient } from '@/lib/supabase/server';
import { RankedCandidate } from './types';

export async function getSocialProofRecommendations(
  userId: string,
  limit = 15
): Promise<RankedCandidate[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('get_social_proof_recs', {
    p_user_id: userId,
    p_limit:   limit,
  });

  if (error || !data) return [];

  return (data as any[]).map(item => ({
    tmdb_id:     item.tmdb_id,
    media_type:  item.media_type,
    title:       item.title,
    finalScore:  Number(item.avg_weight) / 10,
    explanation: `${item.rater_count} viewers with your exact taste profile loved this — rated ${Number(item.avg_weight).toFixed(1)}/10 in your cluster`,
    confidence:  0.7,
    signals:     ['social_proof'],
    antiPenalty: 0,
  }));
}
