export interface ExternalMetadata {
  // TVDb
  tvdb?: {
    seriesId: string;
    episodeCount: number;
    seasonCount: number;
    genres: string[];
    status: string;
    network: string;
    airsDayOfWeek: string;
    airsTime: string;
    firstAired: string;
    lastAired: string;
    runtime: number;
    rating: string;
    imdbId: string;
    zap2itId: string;
    awards: { name: string; year: number; won: boolean }[];
    characters: { name: string; actor: string; role: string }[];
  };

  // AniList
  anilist?: {
    id: number;
    idMal: number;
    titleRomaji: string;
    titleEnglish: string;
    titleNative: string;
    format: string;
    status: string;
    episodes: number;
    duration: number;
    season: string;
    seasonYear: number;
    studios: { id: number; name: string; isMain: boolean }[];
    genres: string[];
    tags: { name: string; rank: number; isAdult: boolean }[];
    averageScore: number;
    meanScore: number;
    popularity: number;
    trending: number;
    favourites: number;
    relations: { id: number; relationType: string; title: string }[];
    openings: string[];
    endings: string[];
    source: string;
    hashtag: string;
    isAdult: boolean;
    startDate: { year: number; month: number; day: number };
    endDate: { year: number; month: number; day: number };
    recommendations: { id: number; title: string; reason: string }[];
  };

  // MusicBrainz
  musicbrainz?: {
    releaseGroupId: string;
    releaseId: string;
    primaryRelease: { id: string; title: string; date: string; label: string; trackCount: number; country: string };
    artists: { id: string; name: string; type: string }[];
    releases: { id: string; title: string; date: string; label: string; trackCount: number; country: string }[];
    recordings: { id: string; title: string; artist: string; length: number; trackNumber?: number }[];
    workRelationships: { type: string; target: string; targetType: string }[];
    soundtrackTags: { name: string; count: number }[];
  };

  // Wikidata
  wikidata?: {
    wikidataId: string;
    awards: { award: string; awardId: string; year: number; category: string; won: boolean }[];
    nominatedFor: { award: string; awardId: string; year: number; category: string }[];
    boxOffice: number;
    budget: number;
    collection: string;
    franchise: string;
    followedBy: string;
    precededBy: string;
    basedOn: string;
    inspiredBy: string;
    publicationDate: string;
    countryOfOrigin: string[];
    originalNetwork: string;
    numberOfSeasons: number;
    numberOfEpisodes: number;
    setInPeriod: string;
    historicalEvent: string;
    realPersonPortrayed: string[];
  };

  // Fanart.tv
  fanart?: {
    clearLogo: string;
    hdLogo: string;
    hdClearLogo: string;
    clearArt: string;
    discArt: string[];
    poster: string[];
    background: string[];
    banner: string[];
    thumb: string[];
    seasonPoster: { season: number; url: string }[];
    seasonBanner: { season: number; url: string }[];
    seasonThumb: { season: number; url: string }[];
    soundtrack: { title: string; url: string }[];
    characterArt: { name: string; url: string }[];
  };

  // JustWatch
  justwatch?: {
    nodeId: string;
    offers: {
      provider: string;
      providerId?: number;
      technicalName?: string;
      monetizationType: string;
      price?: number | null;
      currency?: string;
      url: string;
      quality: string;
      expiresAt?: string | null;
      availableFrom?: string | null;
      episodeCount?: number | null;
    }[];
    availableProviders: string[];
    isOnSubscription: boolean;
    isOnFree: boolean;
    isOnRentOrBuy: boolean;
    ageRating: string;
    runtime: number;
    genres: string[];
    productionCountries: string[];
    originalReleaseDate: string;
    originalReleaseYear: number;
    seasons: { seasonNumber: number; title: string; episodeCount: number }[];
    scoring: {
      imdbScore: number | null;
      imdbVotes: number | null;
      tmdbScore: number | null;
      tmdbPopularity: number | null;
    };
  };

  // Community contributions
  community?: {
    rating?: number;
    filler_percentage?: number;
    quality_trajectory?: 'improves' | 'consistent' | 'declines' | 'mixed';
    pacing: number;
    tone: number;
    complexity: number;
    endingQuality: number;
    rewatchability: number;
    episodeWhereItGetsGood: number;
    emotionalWeight: number;
    slowBurnScore: number;
    bingeWorthiness: number;
    totalVotes: number;
    topTags: { tag: string; count: number }[];
    reviews: { userId: string; text: string; rating: number; helpful: number }[];
    bestSeasons: { seasonNumber: number; averageRating: number }[];
    worstSeasons: { seasonNumber: number; averageRating: number }[];
  };

  // Letterboxd-style signals
  letterboxd?: {
    popularityRank: number;
    estimatedMemberCount: number;
    estimatedFanCount: number;
    estimatedRatingCount: number;
    estimatedReviewCount: number;
    estimatedListCount: number;
    averageRating: number;
    ratingHistogram: Record<string, number>;
    nicheScore: number;
    cultStatus: number;
    divisiveness: number;
    longTailScore: number;
    isSynthetic: boolean;
  };
}

export interface EnrichmentResult {
  tmdbId: string;
  mediaType: 'movie' | 'tv';
  title: string;
  sources: string[];
  metadata: ExternalMetadata;
  enrichedAt: string;
}

export const METADATA_SOURCES = [
  'tvdb', 'anilist', 'musicbrainz', 'wikidata',
  'fanart', 'justwatch', 'community', 'letterboxd',
] as const;

export type MetadataSource = typeof METADATA_SOURCES[number];
