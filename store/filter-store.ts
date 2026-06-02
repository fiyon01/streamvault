import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── LIVE ACTION STORE ──
export interface LiveActionFilterState {
  page: number;
  contentType: 'tv' | 'movie' | 'both';
  // Quality
  minImdbRating: number;
  minVoteCount: number;
  selectedGenres: string[];
  excludeGenres: string[];
  genreLogic: 'AND' | 'OR';
  sortBy: 'popularity' | 'rating' | 'recent';
  minMovieRuntime: number;
  maxMovieRuntime: number;
  // ── TV-SPECIFIC FILTERS ──
  // Show Status
  tvStatus: 'all' | 'returning' | 'ended' | 'canceled' | 'hiatus' | 'upcoming';
  // Show Structure
  minSeasons: number;
  maxSeasons: number;
  minEpisodesPerSeason: number;
  maxEpisodesPerSeason: number;
  totalEpisodes: 'all' | 'under20' | '20to50' | '50to100' | '100plus';
  minEpisodeRuntime: number;
  maxEpisodeRuntime: number;
  seasonFormat: 'all' | 'ongoing' | 'limited' | 'miniseries' | 'anthology';
  // Release & Era
  yearFrom: number;
  yearTo: number;
  decade: 'all' | '1980s' | '1990s' | '2000s' | '2010s' | '2020s';
  originCountry: string;
  africanOnly: boolean;
  africanRegion: 'all' | 'west_africa' | 'east_africa' | 'south_africa' | 'north_africa' | 'central_africa';
  originalLanguage: string;
  network: string;
  excludeCountries: string[];
  // Audio & Subtitle
  requireDub: boolean;
  requireSub: boolean;
  dubLanguage: string;
  // Content & Audience
  maturityRating: 'all' | 'TV-Y' | 'TV-G' | 'TV-PG' | 'TV-14' | 'TV-MA';
  // Advanced Quality
  noSeasonBelow: number;
  qualityTrajectory: 'all' | 'rising' | 'stable' | 'declining';
  minHealthScore: number;
  hiddenGemMode: boolean;
  // Commitment
  minCommitmentHours: number;
  maxCommitmentHours: number;
  maxFillerPercentage: number;
  setFilter: <K extends keyof LiveActionFilterState>(key: K, value: LiveActionFilterState[K]) => void;
  resetFilters: () => void;
}

const defaultLiveAction: Omit<LiveActionFilterState, 'setFilter' | 'resetFilters'> = {
  page: 1,
  contentType: 'both',
  minImdbRating: 0,
  minVoteCount: 0,
  selectedGenres: [],
  excludeGenres: [],
  genreLogic: 'OR',
  sortBy: 'popularity',
  minMovieRuntime: 0,
  maxMovieRuntime: 0,
  tvStatus: 'all',
  minSeasons: 0,
  maxSeasons: 0,
  minEpisodesPerSeason: 0,
  maxEpisodesPerSeason: 0,
  totalEpisodes: 'all',
  minEpisodeRuntime: 0,
  maxEpisodeRuntime: 0,
  seasonFormat: 'all',
  yearFrom: 0,
  yearTo: 0,
  decade: 'all',
  originCountry: '',
  africanOnly: false,
  africanRegion: 'all',
  originalLanguage: '',
  network: '',
  excludeCountries: [],
  requireDub: false,
  requireSub: false,
  dubLanguage: '',
  maturityRating: 'all',
  noSeasonBelow: 0,
  qualityTrajectory: 'all',
  minHealthScore: 0,
  hiddenGemMode: false,
  minCommitmentHours: 0,
  maxCommitmentHours: 0,
  maxFillerPercentage: 0,
};

export const useLiveActionStore = create<LiveActionFilterState>()(
  persist((set) => ({
    ...defaultLiveAction,
    setFilter: (key, value) => set({ [key]: value }),
    resetFilters: () => set(defaultLiveAction),
  }), { name: 'streamvault-liveaction-filters' })
);

// ── ANIME STORE ──
export interface AnimeFilterState {
  contentType: 'tv' | 'movie' | 'both';
  minScore: number;
  selectedGenres: string[];
  season: 'winter' | 'spring' | 'summer' | 'fall' | 'all';
  status: 'airing' | 'complete' | 'upcoming' | 'all';
  sortBy: 'score' | 'popularity' | 'favorites';
  studioId?: string;
  demographic: string;
  source: string;
  setFilter: <K extends keyof AnimeFilterState>(key: K, value: AnimeFilterState[K]) => void;
  resetFilters: () => void;
}

const defaultAnime: Omit<AnimeFilterState, 'setFilter' | 'resetFilters'> = {
  contentType: 'both',
  minScore: 0,
  selectedGenres: [],
  season: 'all',
  status: 'all',
  sortBy: 'popularity',
  studioId: '',
  demographic: '',
  source: '',
};

export const useAnimeFilterStore = create<AnimeFilterState>()(
  persist((set) => ({
    ...defaultAnime,
    setFilter: (key, value) => set({ [key]: value }),
    resetFilters: () => set(defaultAnime),
  }), { name: 'streamvault-anime-filters' })
);

// ── CARTOON STORE ──
export interface CartoonFilterState {
  contentType: 'movie' | 'tv' | 'both';
  targetDemo: 'all' | 'adult' | 'kids';
  animationStyle: 'all' | '2d' | '3d' | 'stop-motion' | 'anime-western';
  minRating: number;
  minVoteCount: number;
  selectedGenres: string[];
  excludeGenres: string[];
  sortBy: 'popularity' | 'rating' | 'recent';
  yearFrom: number;
  yearTo: number;
  setFilter: <K extends keyof CartoonFilterState>(key: K, value: CartoonFilterState[K]) => void;
  resetFilters: () => void;
}

const defaultCartoon: Omit<CartoonFilterState, 'setFilter' | 'resetFilters'> = {
  contentType: 'both',
  targetDemo: 'all',
  animationStyle: 'all',
  minRating: 0,
  minVoteCount: 0,
  selectedGenres: [],
  excludeGenres: [],
  sortBy: 'popularity',
  yearFrom: 0,
  yearTo: 0,
};

export const useCartoonFilterStore = create<CartoonFilterState>()(
  persist((set) => ({
    ...defaultCartoon,
    setFilter: (key, value) => set({ [key]: value }),
    resetFilters: () => set(defaultCartoon),
  }), { name: 'streamvault-cartoon-filters' })
);

// Legacy export so old code doesn't crash before being refactored
export const useFilterStore = useLiveActionStore as any;
