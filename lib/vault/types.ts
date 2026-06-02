export type VaultChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type VaultContentRef = {
  id: string;
  title: string;
  year?: string;
  type: 'movie' | 'show' | 'anime' | 'cartoon' | 'unknown';
  rating?: number | null;
  completed?: boolean;
  completionRate?: number | null;
  watchedAt?: string | null;
  signal?: string;
};

export type VaultContext = {
  user: {
    id: string;
    name: string;
    memberSince?: string | null;
    totalWatchHours: number;
    totalTitlesWatched: number;
    profileSummary: string;
    tasteCluster: string;
  };
  watchHistory: {
    recent: VaultContentRef[];
    topRated: {
      movies: VaultContentRef[];
      shows: VaultContentRef[];
      anime: VaultContentRef[];
    };
    genreBreakdown: Record<string, number>;
    countryBreakdown: Record<string, number>;
    decadeBreakdown: Record<string, number>;
    moviesWatched: number;
    showsWatched: number;
    animeWatched: number;
    isPowerUser: boolean;
  };
  preferences: {
    loved: VaultContentRef[];
    disliked: VaultContentRef[];
    neverRecommend: string[];
    savedPresets: Array<{ name: string; description?: string | null }>;
    longTermMemory: string[];
  };
  currentlyWatching: {
    active: VaultContentRef[];
    recentlyFinished: VaultContentRef | null;
    almostDone: VaultContentRef[];
  };
  session: {
    timeOfDay: string;
    dayOfWeek: string;
    inferredMood: string;
    conversationHistory: VaultChatMessage[];
    previousSessions: Array<{ date: string; topic: string; outcome?: string | null }>;
  };
  database: {
    canQuery: boolean;
    totalTitles: number;
  };
};
