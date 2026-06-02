import type { ExternalMetadata } from '../types';

const ANILIST_API = 'https://graphql.anilist.co';

const SEARCH_QUERY = `
query ($search: String, $type: MediaType) {
  Media(search: $search, type: $type) {
    id idMal
    title { romaji english native }
    format status episodes duration season seasonYear
    studios { nodes { id name isAnimationStudio } }
    genres tags { name rank isAdult }
    averageScore meanScore popularity trending favourites
    source hashtag isAdult
    startDate { year month day }
    endDate { year month day }
    relations { nodes { id relationType media { id title { romaji } } } }
    recommendations { nodes { mediaRecommendation { id title { romaji } } rating } }
  }
}
`;

type AniListDate = { year?: number; month?: number; day?: number };
type AniListMedia = {
  id?: number;
  idMal?: number;
  title?: { romaji?: string; english?: string; native?: string };
  format?: string;
  status?: string;
  episodes?: number;
  duration?: number;
  season?: string;
  seasonYear?: number;
  studios?: { nodes?: Array<{ id?: number; name?: string; isAnimationStudio?: boolean }> };
  genres?: string[];
  tags?: Array<{ name?: string; rank?: number; isAdult?: boolean }>;
  averageScore?: number;
  meanScore?: number;
  popularity?: number;
  trending?: number;
  favourites?: number;
  source?: string;
  hashtag?: string;
  isAdult?: boolean;
  startDate?: AniListDate;
  endDate?: AniListDate;
  relations?: { nodes?: Array<{ relationType?: string; media?: { id?: number; title?: { romaji?: string } } }> };
  recommendations?: { nodes?: Array<{ mediaRecommendation?: { id?: number; title?: { romaji?: string } } }> };
};

type AniListResponse = {
  data?: { Media?: AniListMedia | null };
};

async function anilistQuery(query: string, variables: Record<string, unknown>): Promise<AniListMedia | null> {
  try {
    const res = await fetch(ANILIST_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) return null;
    const data = await res.json() as AniListResponse;
    return data.data?.Media ?? null;
  } catch {
    return null;
  }
}

export async function enrichFromAniList(
  tmdbId: string,
  mediaType: 'movie' | 'tv',
  title: string,
  year?: number
): Promise<Partial<ExternalMetadata>> {
  void tmdbId;
  if (mediaType === 'movie' && !isAnimeTitle(title, year)) return {};

  const searchTitle = title.replace(/\s*\(?\d{4}\)?\s*$/, '').trim();

  try {
    const media = await anilistQuery(SEARCH_QUERY, { search: searchTitle, type: 'ANIME' });

    if (!media) return {};

    const studios = (media.studios?.nodes ?? []).map((s) => ({
      id: s.id ?? 0,
      name: s.name ?? '',
      isMain: s.isAnimationStudio ?? false,
    }));

    const tags = (media.tags ?? []).map((t) => ({
      name: t.name ?? '',
      rank: t.rank ?? 0,
      isAdult: t.isAdult ?? false,
    }));

    const relations = (media.relations?.nodes ?? []).map((r) => ({
      id: r.media?.id ?? 0,
      relationType: r.relationType ?? '',
      title: r.media?.title?.romaji ?? '',
    }));

    const recommendations = (media.recommendations?.nodes ?? []).slice(0, 10).map((r) => ({
      id: r.mediaRecommendation?.id ?? 0,
      title: r.mediaRecommendation?.title?.romaji ?? '',
      reason: '',
    }));

    return {
      anilist: {
        id: media.id ?? 0,
        idMal: media.idMal ?? 0,
        titleRomaji: media.title?.romaji ?? '',
        titleEnglish: media.title?.english ?? '',
        titleNative: media.title?.native ?? '',
        format: media.format ?? '',
        status: media.status ?? '',
        episodes: media.episodes ?? 0,
        duration: media.duration ?? 0,
        season: media.season ?? '',
        seasonYear: media.seasonYear ?? 0,
        studios,
        genres: media.genres ?? [],
        tags,
        averageScore: media.averageScore ?? 0,
        meanScore: media.meanScore ?? 0,
        popularity: media.popularity ?? 0,
        trending: media.trending ?? 0,
        favourites: media.favourites ?? 0,
        relations,
        openings: [],
        endings: [],
        source: media.source ?? '',
        hashtag: media.hashtag ?? '',
        isAdult: media.isAdult ?? false,
        startDate: {
          year: media.startDate?.year ?? 0,
          month: media.startDate?.month ?? 0,
          day: media.startDate?.day ?? 0,
        },
        endDate: {
          year: media.endDate?.year ?? 0,
          month: media.endDate?.month ?? 0,
          day: media.endDate?.day ?? 0,
        },
        recommendations,
      },
    };
  } catch {
    return {};
  }
}

function isAnimeTitle(title: string, year?: number): boolean {
  void year;
  const animeKeywords = ['anime', '-san', '-chan', '-kun', 'monogatari', 'gakuen', 'senki', 'denki', 'tachi', 'shounen', 'shoujo', 'seinen', 'isekai'];
  const nonAnimeKeywords = ['documentary', 'series', 'interview', 'concert', 'sport', 'news'];
  const lower = title.toLowerCase();
  if (nonAnimeKeywords.some(k => lower.includes(k))) return false;
  if (animeKeywords.some(k => lower.includes(k))) return true;
  return false;
}
