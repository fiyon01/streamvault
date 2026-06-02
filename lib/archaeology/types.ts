export interface ParsedClues {
  estimatedYear?: number;
  contentType?: 'movie' | 'tv' | 'any';
  genreClues?: string[];
  endingClues?: string;
  searchQuery?: string;
}

export interface ArchaeologyResult {
  tmdbId: number;
  title: string;
  type: 'movie' | 'tv';
  posterPath: string | null;
  matchScore: number;
  matchReason: string;
  fromImportedHistory: boolean;
}
