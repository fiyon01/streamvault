export type ContentType = 'movie' | 'tv' | 'anime';
export interface ContentTypeCard {
  type: string;
  label: string;
  sublabel: string;
  emoji: string;
  visible: boolean;
  highlighted: boolean;
}
export interface ParsedIntent {
  themes: string[];
  tone: string;
  searchQuery: string;
  contentType: ContentType;
}

export interface CandidateScores {
  tasteScore: number;
  intentScore: number;
  qualityScore: number;
  noveltyScore: number;
  finalScore: number;
}

export interface OneShotCandidate {
  id: string;
  title: string;
  backdrop: string;
  youtubeKey?: string;
  runtime?: number | string;
  scores: CandidateScores;
  explanation?: string;
  posterPath?: string;
  rating?: string;
  year?: string;
  genres?: string;
  reasoning?: string;
  source?: string;
  detailHref?: string;
}

export interface ActiveOneShotSession {
  sessionId: string;
  userId: string;
  intent: ParsedIntent;
  originalQuery: string;
  pool: OneShotCandidate[];
  currentIndex: number;
  skips: { candidateId: string; timeSpentMs: number; reason?: string }[];
  status: 'active' | 'completed' | 'abandoned';
}
