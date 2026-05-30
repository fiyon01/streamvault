import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FilterState {
  // Content type
  contentType: 'movie' | 'tv' | 'both';
  
  // TV specific
  minSeasons: number;
  maxSeasons: number | null;
  completedOnly: boolean;
  currentlyAiring: boolean;
  cancelledFilter: 'include' | 'exclude' | 'warn';
  minEpisodesPerSeason: number;
  consistentEpisodeCount: boolean;
  
  // Quality filters
  minSeasonRating: number;
  noSeasonBelow: number | null;
  finaleBetterThanPilot: boolean;
  maxFillerPercentage: number | null;
  
  // Movie specific
  maxRuntime: number | null;
  minRuntime: number | null;
  oscarWinner: boolean;
  oscarNominated: boolean;
  
  // General
  minImdbRating: number;
  selectedDecades: number[];
  selectedGenres: string[];
  selectedLanguages: string[];
  contentRatings: string[];
  
  // Advanced
  maxTotalHours: number | null;
  pacing: 'slow' | 'medium' | 'fast' | 'action' | null;
  hiddenGem: boolean;
  
  // UI
  filterLogic: 'AND' | 'OR';
  sortBy: 'rating' | 'recent' | 'popularity' | 'runtime' | 'total-hours';
  sortDirection: 'asc' | 'desc';
  
  // Actions
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;
  clearCategory: (category: keyof FilterState) => void;
}

const defaultFilters: Omit<FilterState, 'setFilter' | 'resetFilters' | 'clearCategory'> = {
  contentType: 'both',
  minSeasons: 1,
  maxSeasons: null,
  completedOnly: false,
  currentlyAiring: true,
  cancelledFilter: 'include',
  minEpisodesPerSeason: 0,
  consistentEpisodeCount: false,
  minSeasonRating: 0,
  noSeasonBelow: null,
  finaleBetterThanPilot: false,
  maxFillerPercentage: null,
  maxRuntime: null,
  minRuntime: null,
  oscarWinner: false,
  oscarNominated: false,
  minImdbRating: 0,
  selectedDecades: [],
  selectedGenres: [],
  selectedLanguages: [],
  contentRatings: [],
  maxTotalHours: null,
  pacing: null,
  hiddenGem: false,
  filterLogic: 'AND',
  sortBy: 'rating',
  sortDirection: 'desc',
};

export const useFilterStore = create<FilterState>()(
  persist(
    (set) => ({
      ...defaultFilters,
      
      setFilter: (key, value) => set({ [key]: value }),
      
      resetFilters: () => set(defaultFilters),
      
      clearCategory: (category) => {
        const defaultValue = defaultFilters[category as keyof typeof defaultFilters];
        set({ [category]: defaultValue });
      },
    }),
    {
      name: 'streamvault-filters',
    }
  )
);
