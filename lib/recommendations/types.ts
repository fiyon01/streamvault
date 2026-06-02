// ============================================================
// StreamVault Recommendation Engine — Shared Types
// ============================================================

export interface ContentDNA {
  tmdb_id: string;
  media_type: 'movie' | 'tv';
  title: string;
  narrative_structure: Record<string, number>;
  pacing: Record<string, number>;
  protagonist_type: Record<string, number>;
  moral_complexity: Record<string, number>;
  tone: Record<string, number>;
  world_type: Record<string, number>;
  emotional_core: Record<string, number>;
  stakes_level: Record<string, number>;
  resolution_type: Record<string, number>;
  themes: string[];
  mood_tags: string[];
  hook_strength: number;
  momentum_score: number;
  finale_satisfaction: number;
  divisiveness_score: number;
  critical_consensus: number;
  audience_consensus: number;
  hidden_gem_score?: number;
  comfort_rewatchability: boolean;
  embedding?: number[] | null;
  raw_analysis?: string;
}

export interface UserTasteProfile {
  user_id: string;
  narrative_structure: Record<string, number>;
  pacing_preference: Record<string, number>;
  protagonist_affinity: Record<string, number>;
  moral_complexity: Record<string, number>;
  tone_affinity: Record<string, number>;
  world_type_affinity: Record<string, number>;
  emotional_core_affinity: Record<string, number>;
  stakes_preference: Record<string, number>;
  resolution_preference: Record<string, number>;
  genre_scores: Record<string, number>;
  theme_scores: Record<string, number>;
  avg_completion_rate: number;
  preferred_runtime_min: number;
  preferred_runtime_max: number;
  binge_tendency: number;
  min_quality_threshold: number;
  quality_sensitivity: number;
  hook_sensitivity: number;
  has_anime_history: boolean;
  anime_format_pref?: string;
  hard_blocked_genres: string[];
  hard_blocked_themes: string[];
  fatigued_franchises: { contentId: string; until: string }[];
  confidence_score: number;
  data_points: number;
  profile_summary: string;
  embedding?: number[] | null;
}

export interface UserSignal {
  id: string;
  user_id: string;
  tmdb_id: string;
  signal_type: string;
  signal_weight: number;
  context: Record<string, unknown>;
  created_at: string;
  content_dna?: ContentDNA;
}

export interface MoodContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'late_night';
  dayType: 'weekday' | 'weekend';
  explicitMood?: string;
  inferredMood?: string;
  lastWatched?: { tmdb_id: string; title: string; content_dna?: ContentDNA };
  recentMood?: string;
  moodConfidence: number;
}

export interface RecommendationWeights {
  tasteDNA: number;
  moodMatch: number;
  satisfaction: number;
  social: number;
  freshness: number;
  quality: number;
}

export interface ContentCandidate {
  tmdb_id: string;
  media_type: string;
  title: string;
  content_dna?: ContentDNA;
  imdb_score?: number;
  poster_path?: string;
  antiPenalty?: number;
}

export interface RankedCandidate extends ContentCandidate {
  finalScore: number;
  explanation: string;
  confidence: number;
  rowLabel?: string;
  signals: string[];
}

export interface HomeRow {
  label: string;
  sublabel?: string;
  type: string;
  items: RankedCandidate[];
}

export interface AntiProfile {
  hardBlockedGenres: string[];
  hardBlockedThemes: string[];
  softBlockedPatterns: Record<string, number>;
  fatiguedFranchises: string[];
  neverShowAgain: string[];
}

export interface SatisfactionPrediction {
  score: number;
  explanation: string;
  confidence: number;
}

// ── Pillar 2: Blind Spot types ──

export interface CoverageEntry {
  dimension: string;
  label: string;
  covered: number;
  totalAvailable: number;
  coveragePct: number;
  tasteAffinity: number;
}

export interface BlindSpot {
  dimension: string;
  label: string;
  coveragePct: number;
  tasteAffinity: number;
  relevanceScore: number;
  sampleTitles: string[];
  reason: string;
}

// ── Pillar 3: Recommendation Log types ──

export interface RecommendationLogEntry {
  id?: string;
  user_id: string;
  tmdb_id: string;
  media_type: string;
  title?: string;
  recommended_at?: string;
  context?: string;
  user_response?: 'pending' | 'watched' | 'ignored' | 'rejected' | 'added_to_watchlist' | 'not_interested';
  rejection_reason?: string;
  metadata?: Record<string, unknown>;
}

// ── Pillar 4: Long Tail types ──

export interface LongTailScore {
  tmdbId: string;
  title: string;
  mediaType: string;
  qualityScore: number;
  tasteCompatibility: number;
  popularityIndex: number;
  longTailScore: number;
  hiddenGemScore: number;
}

// ── Pillar 6: Power User types ──

export interface PowerUserStatus {
  isPowerUser: boolean;
  triggers: string[];
  totalWatched: number;
  coverageScore: number;
}

export type RetrievalMode = 'standard' | 'power_user';

// Signal weight constants
export const SIGNAL_WEIGHTS: Record<string, number> = {
  rewatch:                10.0,
  completed_loved:         8.0,
  completed_rated:         6.0,
  one_shot_watched:        5.0,
  thumbs_up:               5.0,
  completed_silent:        3.0,
  watched_70pct:           2.0,
  watched_40pct:           1.0,
  added_watchlist:         1.0,
  trailer_watched_full:    1.0,
  removed_watchlist:      -1.0,
  one_shot_skipped:       -1.5,
  abandoned_mid:          -2.0,
  one_shot_skipped_fast:  -3.0,
  abandoned_early:        -4.0,
  thumbs_down:            -5.0,
  not_for_me:             -6.0,
  hide_forever:          -10.0,
};

// Content DNA JSONB keys mapped to user profile keys
export const DNA_KEY_MAP: Record<string, string> = {
  narrative_structure: 'narrative_structure',
  pacing:              'pacing_preference',
  protagonist_type:    'protagonist_affinity',
  moral_complexity:    'moral_complexity',
  tone:                'tone_affinity',
  world_type:          'world_type_affinity',
  emotional_core:      'emotional_core_affinity',
  stakes_level:        'stakes_preference',
  resolution_type:     'resolution_preference',
};
