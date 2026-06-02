/**
 * Watch DNA Match — shared TypeScript types
 */

/** A single DNA dimension computed across a group of users */
export interface DNADimension {
  /** The name of the dimension (e.g. 'pacing', 'tone') */
  dimension: string;
  /** Individual scores for each user in the group, in the same order as the userIds array */
  scores: number[];
  /** Mean score across all users */
  avg: number;
  /** Variance of scores across all users */
  variance: number;
  /** True when variance < 0.15 — everyone agrees on this dimension */
  isMatch: boolean;
  /** True when variance >= 0.30 — there is meaningful disagreement on this dimension */
  isTension: boolean;
}

/** A content item recommended for the whole group, with per-person rationale */
export interface GroupRecommendation {
  /** Raw content object returned from TMDB (movie or TV show) */
  content: any;
  /** 2-sentence AI-generated explanation of why this fits the group's DNA */
  explanation: string;
  /** Aggregate group score (0–1) representing overall compatibility */
  groupScore: number;
  /** Short rationale string keyed by userId */
  perPersonRationale: Record<string, string>;
}

/** The full intersection result returned to the caller */
export interface DNAIntersection {
  /** Dimensions where the group strongly agrees (isMatch === true) */
  strongMatches: {
    dimension: string;
    score: number;
    description: string;
  }[];
  /** Dimensions where the group disagrees (isTension === true) */
  tensions: {
    dimension: string;
    scores: number[];
    description: string;
    resolution: string;
  }[];
  /** Top content recommendations for the group */
  recommendations: GroupRecommendation[];
}

/** Session-level viewing preferences collected before computing the intersection */
export interface SessionPreferences {
  /** Whether to search for movies, TV shows, or either */
  contentType: 'movie' | 'show' | 'either';
  /** Optional maximum runtime in minutes (movies) or minutes per episode (shows) */
  runtimeMax?: number;
  /** Optional free-text mood or theme hint forwarded to the discovery query */
  moodQuery?: string;
}

/** A single answer submitted by a guest during the DNA quiz */
export interface GuestQuizAnswer {
  /** The id of the question being answered (1-indexed) */
  questionId: number;
  /** The 0-indexed position of the chosen option within the question's options array */
  selectedOption: number;
  /** DNA signal deltas contributed by this answer */
  dnaSignal: Record<string, number>;
}
