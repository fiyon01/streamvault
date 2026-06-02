import { createClient } from '@/lib/supabase/server';
import type { ContentCandidate, UserTasteProfile } from '@/lib/recommendations/types';
import type { CanonLane, CanonTitle } from './types';

const POWER_USER_LANES: CanonLane[] = [
  'hidden_gem_international',
  'serious_anime',
  'completed_series',
  'zero_bad_seasons',
];

const STANDARD_LANES: CanonLane[] = [
  'completed_series',
  'serious_anime',
  'hidden_gem_international',
  'short_commitment',
  'comfort_films',
];

export async function getCanonCandidates(options: {
  limit?: number;
  lane?: CanonLane;
  powerUser?: boolean;
  profile?: UserTasteProfile;
} = {}): Promise<ContentCandidate[]> {
  const supabase = createClient();
  const lanes = options.lane
    ? [options.lane]
    : options.powerUser
      ? POWER_USER_LANES
      : STANDARD_LANES;

  const { data, error } = await supabase
    .from('streamvault_canon_titles')
    .select('*')
    .eq('editorial_status', 'published')
    .in('canon_lane', lanes)
    .order('curator_confidence', { ascending: false })
    .limit(options.limit ?? 30);

  if (error || !data) {
    if (error) console.warn('[canon] query failed', error.message);
    return [];
  }

  return (data as CanonTitle[]).map((item) => ({
    tmdb_id: item.tmdb_id,
    media_type: item.media_type === 'tv' ? 'tv' : item.media_type,
    title: item.title,
    imdb_score: Math.round((item.curator_confidence ?? 0.75) * 10),
    content_dna: {
      tmdb_id: item.tmdb_id,
      media_type: item.media_type === 'tv' ? 'tv' : 'movie',
      title: item.title,
      narrative_structure: {},
      pacing: {},
      protagonist_type: {},
      moral_complexity: {},
      tone: {},
      world_type: {},
      emotional_core: {},
      stakes_level: {},
      resolution_type: {},
      themes: [item.canon_lane],
      mood_tags: item.best_watched_context ?? [],
      hook_strength: item.curator_confidence ?? 0.75,
      momentum_score: item.quality_trajectory === 'declines' ? 0.35 : 0.75,
      finale_satisfaction: item.ending_quality === 'satisfying' ? 0.9 : 0.55,
      divisiveness_score: item.ending_quality === 'divisive' ? 0.75 : 0.25,
      critical_consensus: item.curator_confidence ?? 0.75,
      audience_consensus: item.curator_confidence ?? 0.75,
      hidden_gem_score: item.canon_lane === 'hidden_gem_international' ? 0.9 : 0.55,
      comfort_rewatchability: (item.rewatch_value ?? 0) > 0.7,
      raw_analysis: buildCanonReason(item),
    },
  }));
}

export function buildCanonReason(item: CanonTitle): string {
  const parts = [
    item.verdict_summary,
    item.why_it_matters ? `Why it matters: ${item.why_it_matters}` : '',
    item.honest_warning ? `Honest warning: ${item.honest_warning}` : '',
    item.who_should_skip_it ? `Skip if: ${item.who_should_skip_it}` : '',
    item.cultural_entry_point ? `Entry point: ${item.cultural_entry_point}` : '',
  ].filter(Boolean);

  return parts.join(' ');
}
