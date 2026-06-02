export type CanonLane =
  | 'completed_series'
  | 'hidden_gem_international'
  | 'serious_anime'
  | 'short_commitment'
  | 'zero_bad_seasons'
  | 'first_episode_hooks'
  | 'comfort_films';

export interface CanonTitle {
  id: string;
  tmdb_id: string;
  media_type: 'movie' | 'tv' | 'anime' | 'cartoon' | 'documentary';
  title: string;
  canon_lane: CanonLane;
  editorial_status: 'draft' | 'reviewed' | 'published' | 'retired';
  verdict_summary: string;
  why_it_matters?: string | null;
  who_should_watch?: string | null;
  who_should_skip_it?: string | null;
  honest_warning?: string | null;
  cultural_entry_point?: string | null;
  ending_quality?: 'satisfying' | 'divisive' | 'unresolved' | 'open' | 'ambiguous' | 'not_applicable' | null;
  quality_trajectory?: 'improves' | 'consistent' | 'declines' | 'mixed' | 'not_applicable' | null;
  gets_good_episode?: number | null;
  rewatch_value?: number | null;
  commitment_minutes?: number | null;
  best_watched_context?: string[] | null;
  curator_confidence?: number | null;
  source_quality?: 'human' | 'human_plus_ai' | 'community_verified' | 'ai_draft';
}

export interface CanonCollection {
  id: string;
  slug: string;
  title: string;
  description: string;
  lane: CanonLane;
  editorial_principle: string;
  sort_order: number;
  is_featured: boolean;
}
