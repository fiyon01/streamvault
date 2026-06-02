import type { ExternalMetadata } from '../types';

const FANART_API_KEY = process.env.FANART_API_KEY ?? '';
const FANART_BASE = 'https://webservice.fanart.tv/v3';

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface FanartImage {
  url: string;
  lang?: string;
  likes?: number;
  season?: string;
}

interface FanartCharacter {
  name?: string;
  url?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extracts image URLs from a Fanart.tv image array.
 * Prefers English-language images, falls back to language-neutral ("00" or ""),
 * then any available. Sorts by likes descending before slicing.
 */
function extractUrls(
  images: FanartImage[] | undefined,
  limit: number,
  preferredLang = 'en'
): string[] {
  if (!images || images.length === 0) return [];

  const sorted = [...images].sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));

  // Prefer preferred language first, then language-neutral, then anything
  const preferred = sorted.filter((i: FanartImage) => i.lang === preferredLang);
  const neutral = sorted.filter((i: FanartImage) => i.lang === '00' || i.lang === '');
  const rest = sorted.filter(
    (i: FanartImage) => i.lang !== preferredLang && i.lang !== '00' && i.lang !== ''
  );

  return [...preferred, ...neutral, ...rest]
    .slice(0, limit)
    .map((i: FanartImage) => i.url)
    .filter(Boolean);
}

/**
 * Extracts season-specific images (posters or banners).
 * Filters out season 0 (specials) by default.
 * Returns sorted by season number ascending.
 */
function extractSeasonImages(
  images: FanartImage[] | undefined,
  includeSpecials = false,
  preferredLang = 'en'
): Array<{ season: number; url: string }> {
  if (!images || images.length === 0) return [];

  return images
    .filter((s: FanartImage) => {
      const seasonNum = parseInt(s.season ?? '0', 10);
      if (!includeSpecials && seasonNum === 0) return false;
      return Boolean(s.url) && (s.lang === preferredLang || s.lang === '00' || s.lang === '');
    })
    .sort((a, b) => parseInt(a.season ?? '0', 10) - parseInt(b.season ?? '0', 10))
    .map((s: FanartImage) => ({
      season: parseInt(s.season ?? '0', 10),
      url: s.url ?? '',
    }))
    .filter((s: { season: number; url: string }) => s.url);
}

// ─── Main Export ─────────────────────────────────────────────────────────────

/**
 * Enriches a title with Fanart.tv artwork metadata.
 *
 * IMPORTANT: Fanart.tv uses TMDB IDs for movies but TVDB IDs for TV shows.
 * Always pass tvdbId for TV content — omitting it will silently return empty results.
 *
 * @param tmdbId      - TMDB ID (used for movies)
 * @param mediaType   - 'movie' or 'tv'
 * @param tvdbId      - TVDB ID (required for TV shows)
 * @param preferredLang - ISO 639-1 language code for artwork preference (default: 'en')
 */
export async function enrichFromFanart(
  tmdbId: string,
  mediaType: 'movie' | 'tv',
  tvdbId?: string,
  preferredLang = 'en'
): Promise<Partial<ExternalMetadata>> {
  if (!FANART_API_KEY) return {};

  if (mediaType === 'tv' && !tvdbId) {
    return {};
  }

  // Fanart.tv uses TVDB IDs for TV, TMDB IDs for movies.
  const id = mediaType === 'tv' ? tvdbId : tmdbId;

  try {
    const endpoint = mediaType === 'movie' ? 'movies' : 'tv';
    const res = await fetch(
      `${FANART_BASE}/${endpoint}/${id}?api_key=${FANART_API_KEY}`
    );

    if (!res.ok) {
      if (res.status === 404) {
        // Not found is expected for titles without Fanart.tv entries — not an error
        return {};
      }
      console.warn(`[fanart] Request failed: ${res.status} for ${endpoint}/${id}`);
      return {};
    }

    const data = await res.json();

    // ── Logos ────────────────────────────────────────────────────────────────
    // TV uses hdtvlogo, movies use hdmovielogo / hdlogo
    const hdLogoKey = mediaType === 'tv' ? 'hdtvlogo' : 'hdmovielogo';
    const hdLogo =
      data[hdLogoKey]?.[0]?.url ??
      data.hdlogo?.[0]?.url ??
      '';

    // Clear logos: SD and HD are separate assets
    const clearLogo = data.clearlogo?.[0]?.url ?? '';
    const hdClearLogo = data.hdclearlogo?.[0]?.url ?? '';

    // ── Posters ──────────────────────────────────────────────────────────────
    const posterKey = mediaType === 'tv' ? 'tvposter' : 'movieposter';
    const posters = extractUrls(
      data[posterKey] ?? data.posters,
      10,
      preferredLang
    );

    // ── Backgrounds ──────────────────────────────────────────────────────────
    const backgroundKey = mediaType === 'tv' ? 'showbackground' : 'moviebackground';
    const backgrounds = extractUrls(
      data[backgroundKey] ?? data.hdbackgrounds ?? data.backgrounds,
      5,
      preferredLang
    );

    // ── Banners ──────────────────────────────────────────────────────────────
    const bannerKey = mediaType === 'tv' ? 'tvbanner' : 'moviebanner';
    const banners = extractUrls(
      data[bannerKey] ?? data.banners,
      5,
      preferredLang
    );

    // ── Thumbs ───────────────────────────────────────────────────────────────
    // TV uses tvthumbs, movies use moviethumb — different keys, not interchangeable
    const thumbs = mediaType === 'tv'
      ? extractUrls(data.tvthumbs, 5, preferredLang)
      : extractUrls(data.moviethumb, 5, preferredLang);

    // ── Season Art (TV only) ─────────────────────────────────────────────────
    const seasonPosters = mediaType === 'tv'
      ? extractSeasonImages(data.seasonposter, false, preferredLang)
      : [];

    const seasonBanners = mediaType === 'tv'
      ? extractSeasonImages(data.seasonbanner, false, preferredLang)
      : [];

    const seasonThumbs = mediaType === 'tv'
      ? extractSeasonImages(data.seasonthumb, false, preferredLang)
      : [];

    // ── Character Art ────────────────────────────────────────────────────────
    const characterArt = ((data.characters ?? []) as FanartCharacter[])
      .slice(0, 20)
      .map((c: FanartCharacter) => ({
        name: c.name ?? '',
        url: c.url ?? '',
      }))
      .filter((c: { name: string; url: string }) => c.url);

    // ── Disc Art (movies only) ───────────────────────────────────────────────
    const discArt = mediaType === 'movie'
      ? extractUrls(data.moviedisc, 3, preferredLang)
      : [];

    // ── Art (movies only) ────────────────────────────────────────────────────
    const clearArt = mediaType === 'movie'
      ? (data.movieart?.[0]?.url ?? '')
      : (data.clearart?.[0]?.url ?? '');

    return {
      fanart: {
        clearLogo,
        hdClearLogo,
        hdLogo,
        clearArt,
        discArt,
        poster: posters,
        background: backgrounds,
        banner: banners,
        thumb: thumbs,
        seasonPoster: seasonPosters,
        seasonBanner: seasonBanners,
        seasonThumb: seasonThumbs,
        soundtrack: [],
        characterArt,
      },
    };
  } catch (err) {
    console.error(`[fanart] Unexpected error for ${mediaType}/${id}:`, err);
    return {};
  }
}

// ─── Utility: Best Available Logo ────────────────────────────────────────────

/**
 * Returns the single best logo URL from fanart metadata.
 * Priority: hdClearLogo → hdLogo → clearLogo → ''.
 * Use this when you need one logo URL for display (e.g. hero banner).
 */
export function getBestLogo(
  fanart: ExternalMetadata['fanart'] | undefined
): string {
  if (!fanart) return '';
  return fanart.hdClearLogo || fanart.hdLogo || fanart.clearLogo || '';
}

// ─── Utility: Best Available Background ──────────────────────────────────────

/**
 * Returns the single best background URL.
 * Use for hero/banner display where one image is needed.
 */
export function getBestBackground(
  fanart: ExternalMetadata['fanart'] | undefined
): string {
  if (!fanart) return '';
  return fanart.background?.[0] ?? '';
}

// ─── Utility: Season Poster Lookup ───────────────────────────────────────────

/**
 * Returns the poster URL for a specific season number.
 * Falls back to the show's main poster if no season-specific art exists.
 */
export function getSeasonPoster(
  fanart: ExternalMetadata['fanart'] | undefined,
  seasonNumber: number
): string {
  if (!fanart) return '';
  const match = fanart.seasonPoster?.find((s: { season: number; url: string }) => s.season === seasonNumber);
  return match?.url ?? fanart.poster?.[0] ?? '';
}
