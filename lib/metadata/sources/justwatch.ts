import type { ExternalMetadata } from '../types';

/**
 * JustWatch enrichment — streaming availability and offer data.
 *
 * IMPORTANT: JustWatch does not have an official public API.
 * This implementation uses their unofficial GraphQL endpoint which:
 * - May break without notice if JustWatch changes their API
 * - Should not be hammered — cache results aggressively (TTL: 24hrs minimum)
 * - Returns locale-specific data — always specify locale explicitly
 *
 * For production use at scale, consider the official JustWatch
 * partner/affiliate programme which provides stable API access.
 */

const JW_GRAPHQL = 'https://apis.justwatch.com/graphql';
const JUSTWATCH_ENABLED = process.env.JUSTWATCH_ENABLED === 'true';

// ─── Provider Map ─────────────────────────────────────────────────────────────
// JustWatch provider IDs for common platforms.
// IDs can vary by locale — these are en_US values.

const PROVIDER_NAMES: Record<number, string> = {
  8: 'Netflix',
  9: 'Amazon Prime Video',
  10: 'Amazon Video',
  119: 'Amazon Prime Video',
  257: 'Apple TV+',
  2: 'Apple TV',
  384: 'Max',
  283: 'Crunchyroll',
  62: 'Crunchyroll',
  189: 'Disney+',
  15: 'Hulu',
  386: 'Peacock',
  531: 'Paramount+',
  3: 'Google Play Movies',
  7: 'YouTube',
  11: 'MUBI',
  29: 'Starz',
  68: 'Microsoft Store',
  258: 'Netflix Kids',
  43: 'Starz Play Amazon Channel',
  37: 'HBO Now',
  27: 'Fandango at Home',
};

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface JWOffer {
  monetizationType: string;
  retailPrice?: number;
  currency?: string;
  presentationType: string;
  package: {
    id: number;
    packageId: number;
    clearName: string;
    technicalName: string;
  };
  standardWebURL?: string;
  deeplinkRoku?: string;
  elementCount?: number;
  availableToTime?: string;
  availableFromTime?: string;
}

interface JWSeason {
  seasonNumber: number;
  title: string;
  episodeCount: number;
}

type JWParsedOffer = NonNullable<ExternalMetadata['justwatch']>['offers'][number];

interface JWSearchEdge {
  node?: {
    id?: string;
    objectType?: string;
    content?: {
      title?: string;
      originalReleaseYear?: number;
      externalIds?: {
        tmdbId?: string | number;
      };
    };
  };
}

interface JWGenre {
  shortName?: string;
  translation?: string;
}

interface JWContent {
  ageCertification?: string;
  runtime?: number;
  genres?: JWGenre[];
  productionCountries?: string[];
  originalReleaseDate?: string;
  originalReleaseYear?: number;
  scoring?: {
    imdbScore?: number | null;
    imdbVotes?: number | null;
    tmdbScore?: number | null;
    tmdbPopularity?: number | null;
  };
}

interface JWSeasonNode {
  content?: {
    seasonNumber?: number;
    title?: string;
    episodeCount?: number;
  };
}

interface JWNode {
  content?: JWContent;
  offers?: JWOffer[];
  seasons?: JWSeasonNode[];
}

interface JWGraphQLData {
  searchTitles?: {
    edges?: JWSearchEdge[];
  };
  node?: JWNode | null;
}

interface JWGraphQLResponse {
  data?: JWGraphQLData;
  errors?: unknown[];
}

// ─── GraphQL Helpers ──────────────────────────────────────────────────────────

async function jwGraphQL(query: string, variables: Record<string, unknown>): Promise<JWGraphQLData | null> {
  try {
    const res = await fetch(JW_GRAPHQL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'App-Version': '3.8.2',
        'Device-Id': 'web',
        'User-Agent': 'StreamVault/1.0',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json() as JWGraphQLResponse;

    if (data.errors?.length) {
      return null;
    }

    return data.data ?? null;
  } catch {
    return null;
  }
}

// ─── Search Query ─────────────────────────────────────────────────────────────

const SEARCH_BY_TITLE_QUERY = `
  query GetTitlesByKeyword($searchQuery: String!, $country: Country!, $language: Language!, $first: Int!) {
    searchTitles(searchInput: { query: $searchQuery }, country: $country, language: $language, first: $first) {
      edges {
        node {
          id
          objectType
          objectId
          content(country: $country, language: $language) {
            title
            originalReleaseYear
            externalIds {
              imdbId
              tmdbId
            }
          }
        }
      }
    }
  }
`;

// ─── Detail Query ─────────────────────────────────────────────────────────────

const DETAIL_QUERY = `
  query GetTitleOffers($nodeId: ID!, $country: Country!, $language: Language!, $platform: Platform!) {
    node(id: $nodeId) {
      id
      ... on Movie {
        objectType
        objectId
        content(country: $country, language: $language) {
          title
          originalTitle
          ageCertification
          runtime
          genres { shortName translation(language: $language) }
          productionCountries
          originalReleaseYear
          originalReleaseDate
          externalIds { imdbId tmdbId }
          scoring {
            imdbScore
            imdbVotes
            tmdbScore
            tmdbPopularity
          }
        }
        watchNowOffer(country: $country, platform: $platform) {
          monetizationType
          retailPrice(currency: USD)
          currency
          presentationType
          package { id packageId clearName technicalName }
          standardWebURL
          availableToTime
        }
        offers(country: $country, platform: $platform) {
          monetizationType
          retailPrice(currency: USD)
          currency
          presentationType
          package { id packageId clearName technicalName }
          standardWebURL
          availableToTime
          availableFromTime
          elementCount
        }
      }
      ... on Show {
        objectType
        objectId
        content(country: $country, language: $language) {
          title
          originalTitle
          ageCertification
          genres { shortName translation(language: $language) }
          productionCountries
          originalReleaseYear
          originalReleaseDate
          externalIds { imdbId tmdbId }
          scoring {
            imdbScore
            imdbVotes
            tmdbScore
            tmdbPopularity
          }
        }
        seasons {
          content(country: $country, language: $language) {
            seasonNumber
            title
            episodeCount
          }
        }
        watchNowOffer(country: $country, platform: $platform) {
          monetizationType
          retailPrice(currency: USD)
          presentationType
          package { id packageId clearName technicalName }
          standardWebURL
          availableToTime
        }
        offers(country: $country, platform: $platform) {
          monetizationType
          retailPrice(currency: USD)
          currency
          presentationType
          package { id packageId clearName technicalName }
          standardWebURL
          availableToTime
          availableFromTime
          elementCount
        }
      }
    }
  }
`;

// ─── Search for JustWatch Node ID ─────────────────────────────────────────────

/**
 * Finds the JustWatch node ID for a title using their GraphQL search.
 * Matches by TMDB ID when available for highest accuracy.
 * Falls back to title + year matching.
 */
async function findJustWatchNodeId(
  tmdbId: string,
  mediaType: 'movie' | 'tv',
  title: string,
  year?: number,
  country = 'US',
  language = 'en'
): Promise<string | null> {
  const objectType = mediaType === 'movie' ? 'MOVIE' : 'SHOW';

  const data = await jwGraphQL(SEARCH_BY_TITLE_QUERY, {
    searchQuery: title,
    country,
    language,
    first: 10,
  });

  const edges = data?.searchTitles?.edges ?? [];
  if (edges.length === 0) return null;

  // First: try to match by TMDB ID — most reliable
  const tmdbMatch = edges.find((e) => {
    const externalIds = e.node?.content?.externalIds;
    return (
      e.node?.objectType === objectType &&
      String(externalIds?.tmdbId) === tmdbId
    );
  });

  if (tmdbMatch?.node?.id) return tmdbMatch.node.id;

  // Second: match by title + year
  const titleMatch = edges.find((e) => {
    const content = e.node?.content;
    const titleMatches =
      content?.title?.toLowerCase() === title.toLowerCase();
    const yearMatches =
      !year || content?.originalReleaseYear === year;
    const typeMatches = e.node?.objectType === objectType;

    return titleMatches && yearMatches && typeMatches;
  });

  if (titleMatch?.node?.id) return titleMatch.node.id;

  // Fallback: first result of correct type
  const typeMatch = edges.find((e) => e.node?.objectType === objectType);
  return typeMatch?.node?.id ?? null;
}

// ─── Parse Offers ─────────────────────────────────────────────────────────────

/**
 * Normalises JustWatch offer objects into a clean, deduplicated structure.
 * Deduplicates by provider + monetisation type + quality.
 * Sorts: flatrate first, then free/ads, then rent, then buy.
 */
function parseOffers(offers: JWOffer[]): JWParsedOffer[] {
  const ORDER: Record<string, number> = {
    flatrate: 0,
    free: 1,
    ads: 2,
    rent: 3,
    buy: 4,
  };

  const seen = new Set<string>();

  return offers
    .map((o: JWOffer) => {
      const providerName =
        o.package?.clearName ??
        PROVIDER_NAMES[o.package?.packageId] ??
        `Provider ${o.package?.packageId ?? 'unknown'}`;

      return {
        provider: providerName,
        providerId: o.package?.packageId,
        technicalName: o.package?.technicalName,
        monetizationType: o.monetizationType?.toLowerCase() ?? 'unknown',
        price: o.retailPrice ?? null,
        currency: o.currency ?? 'USD',
        url: o.standardWebURL ?? '',
        quality: o.presentationType ?? '',
        expiresAt: o.availableToTime ?? null,
        availableFrom: o.availableFromTime ?? null,
        episodeCount: o.elementCount ?? null,
      };
    })
    .filter((o) => {
      // Deduplicate by provider + type + quality
      const key = `${o.providerId}:${o.monetizationType}:${o.quality}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return Boolean(o.url); // must have a URL to be useful
    })
    .sort((a, b) => {
      const orderA = ORDER[a.monetizationType] ?? 99;
      const orderB = ORDER[b.monetizationType] ?? 99;
      return orderA - orderB;
    });
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Enriches a title with JustWatch streaming availability data.
 *
 * @param tmdbId    - TMDB ID for cross-reference matching
 * @param mediaType - 'movie' or 'tv'
 * @param title     - Title string for search fallback
 * @param year      - Release year to improve match accuracy
 * @param country   - ISO country code (default: 'US')
 * @param language  - ISO language code (default: 'en')
 */
export async function enrichFromJustWatch(
  tmdbId: string,
  mediaType: 'movie' | 'tv',
  title: string,
  year?: number,
  country = 'US',
  language = 'en'
): Promise<Partial<ExternalMetadata>> {
  if (!JUSTWATCH_ENABLED) return {};

  try {
    // ── Step 1: Find the JustWatch node ID ────────────────────────────────────
    const nodeId = await findJustWatchNodeId(
      tmdbId, mediaType, title, year, country, language
    );

    if (!nodeId) {
      return {};
    }

    // ── Step 2: Fetch full title details with offers ──────────────────────────
    const detailData = await jwGraphQL(DETAIL_QUERY, {
      nodeId,
      country,
      language,
      platform: 'WEB',
    });

    const node = detailData?.node;
    if (!node) return {};

    const content = node.content ?? {};
    const offers: JWOffer[] = node.offers ?? [];

    // ── Step 3: Parse seasons (TV only) ───────────────────────────────────────
    const seasons: JWSeason[] = (node.seasons ?? [])
      .map((s: JWSeasonNode) => ({
        seasonNumber: s.content?.seasonNumber ?? 0,
        title: s.content?.title ?? '',
        episodeCount: s.content?.episodeCount ?? 0,
      }))
      .filter((s: JWSeason) => s.seasonNumber > 0) // exclude specials (season 0)
      .sort((a: JWSeason, b: JWSeason) => a.seasonNumber - b.seasonNumber);

    // ── Step 4: Parse genres ──────────────────────────────────────────────────
    const genres = (content.genres ?? [])
      .map((g: JWGenre) => g.translation ?? g.shortName ?? '')
      .filter(Boolean);

    // ── Step 5: Availability summary ──────────────────────────────────────────
    // Quick flags for VAULT and discover filters
    const parsedOffers = parseOffers(offers);
    const isOnSubscription = parsedOffers.some((o) => o.monetizationType === 'flatrate');
    const isOnFree = parsedOffers.some(
      (o) => o.monetizationType === 'free' || o.monetizationType === 'ads'
    );
    const availableProviders = [
      ...new Set(parsedOffers.map((o) => o.provider)),
    ];

    // ── Step 6: Scoring signals ───────────────────────────────────────────────
    const scoring = content.scoring ?? {};

    return {
      justwatch: {
        nodeId,
        offers: parsedOffers,
        availableProviders,
        isOnSubscription,
        isOnFree,
        isOnRentOrBuy: parsedOffers.some(
          (o) => o.monetizationType === 'rent' || o.monetizationType === 'buy'
        ),
        ageRating: content.ageCertification ?? '',
        runtime: content.runtime ?? 0,
        genres,
        productionCountries: content.productionCountries ?? [],
        originalReleaseDate: content.originalReleaseDate ?? '',
        originalReleaseYear: content.originalReleaseYear ?? 0,
        seasons,
        scoring: {
          imdbScore: scoring.imdbScore ?? null,
          imdbVotes: scoring.imdbVotes ?? null,
          tmdbScore: scoring.tmdbScore ?? null,
          tmdbPopularity: scoring.tmdbPopularity ?? null,
        },
      },
    };
  } catch {
    return {};
  }
}

// ─── Utility: Get Streaming URL ───────────────────────────────────────────────

/**
 * Returns the best streaming URL for a title — prefers subscription,
 * then free/ad-supported, then rent, then buy.
 * Returns '' if no offers available.
 */
export function getBestStreamingUrl(
  justwatch: ExternalMetadata['justwatch'] | undefined
): string {
  if (!justwatch?.offers?.length) return '';
  // parseOffers already sorts by monetisation type priority
  return justwatch.offers[0]?.url ?? '';
}

// ─── Utility: Is Available In Country ────────────────────────────────────────

/**
 * Checks if any offers exist (i.e. title is available in the queried country).
 * Use for the cross-platform honesty feature — tell users where they can watch.
 */
export function isAvailableInCountry(
  justwatch: ExternalMetadata['justwatch'] | undefined
): boolean {
  return (justwatch?.offers?.length ?? 0) > 0;
}

// ─── Utility: Subscription Platforms ─────────────────────────────────────────

/**
 * Returns list of subscription platform names where this title is available.
 * Use for "Available on Netflix, Disney+" display on detail pages.
 */
export function getSubscriptionPlatforms(
  justwatch: ExternalMetadata['justwatch'] | undefined
): string[] {
  if (!justwatch?.offers) return [];
  return [
    ...new Set(
      justwatch.offers
        .filter((o) => o.monetizationType === 'flatrate')
        .map((o) => o.provider)
    ),
  ];
}
