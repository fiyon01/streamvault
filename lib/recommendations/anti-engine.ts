import { createClient } from '@/lib/supabase/server';
import { AntiProfile, ContentCandidate } from './types';

export async function getAntiProfile(userId: string): Promise<AntiProfile> {
  const supabase = createClient();

  const { data: profile } = await supabase
    .from('user_taste_profiles')
    .select('hard_blocked_genres, hard_blocked_themes, fatigued_franchises')
    .eq('user_id', userId)
    .single();

  const { data: hates } = await supabase
    .from('user_signals')
    .select('tmdb_id, signal_weight')
    .eq('user_id', userId)
    .lte('signal_weight', -5);

  return {
    hardBlockedGenres:   profile?.hard_blocked_genres ?? [],
    hardBlockedThemes:   profile?.hard_blocked_themes ?? [],
    softBlockedPatterns: {},
    fatiguedFranchises:  (profile?.fatigued_franchises ?? []).map((f: any) => f.contentId),
    neverShowAgain:      (hates ?? []).filter((s: any) => s.signal_weight <= -10).map((s: any) => s.tmdb_id),
  };
}

export function applyAntiProfile(
  candidates: ContentCandidate[],
  anti: AntiProfile
): ContentCandidate[] {
  return candidates
    .filter(c => !anti.neverShowAgain.includes(c.tmdb_id))
    .map(c => ({
      ...c,
      antiPenalty: anti.fatiguedFranchises.includes(c.tmdb_id) ? 0.3 : 0,
    }));
}
