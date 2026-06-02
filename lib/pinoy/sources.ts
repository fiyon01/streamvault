export type PinoySource = {
  name: string;
  description: string;
  sourceType: 'official' | 'live' | 'community';
  hasAds: boolean;
  href: string;
  searchHref?: (query: string) => string;
  englishAccess?: string;
};

export const PINOY_ORIGIN_COUNTRY = 'PH';
export const PINOY_PRIMARY_LANGUAGE = 'tl';

export const IPHTV_M3U_URL =
  'https://raw.githubusercontent.com/Harleythetech/IPHTV/refs/heads/main/ph.m3u';

export const PINOY_OFFICIAL_SOURCES: PinoySource[] = [
  {
    name: 'iWantTFC',
    description: 'Official ABS-CBN platform for teleseryes, movies, originals, and live TV.',
    sourceType: 'official',
    hasAds: true,
    href: 'https://www.iwanttfc.com',
    searchHref: (query) => `https://www.iwanttfc.com/search?q=${encodeURIComponent(query)}`,
    englishAccess: 'Many international releases include English subtitles. Some titles require free or premium access.',
  },
  {
    name: 'BlastTV',
    description: 'Free Filipino-made entertainment app with Pinoy shows, movies, anime, K-drama, sports, and dubbed content.',
    sourceType: 'official',
    hasAds: true,
    href: 'https://blasttv.ph',
    searchHref: (query) => `https://www.google.com/search?q=${encodeURIComponent(`${query} BlastTV`)}`,
    englishAccess: 'Includes Tagalog-dubbed and mixed-language catalogues where available.',
  },
  {
    name: 'Samsung TV Plus PH',
    description: 'Free live and on-demand channels for supported Samsung users.',
    sourceType: 'official',
    hasAds: false,
    href: 'https://www.samsung.com/ph/tv-plus/',
    searchHref: (query) => `https://www.google.com/search?q=${encodeURIComponent(`${query} Samsung TV Plus Philippines`)}`,
    englishAccess: 'English availability depends on the channel or programme.',
  },
];

export const PINOY_COMMUNITY_FALLBACKS: PinoySource[] = [
  {
    name: 'PinoyFlix',
    description: 'Community fallback for recent teleserye episodes. Opens externally.',
    sourceType: 'community',
    hasAds: true,
    href: 'https://pinoyflixteleserye.su',
    searchHref: (query) => `https://www.google.com/search?q=${encodeURIComponent(`${query} PinoyFlix`)}`,
    englishAccess: 'Subtitle and dubbing support is not guaranteed.',
  },
  {
    name: 'PinoyTambayan',
    description: 'Community fallback often used by OFW viewers. Opens externally.',
    sourceType: 'community',
    hasAds: true,
    href: 'https://pinoytambayan.su',
    searchHref: (query) => `https://www.google.com/search?q=${encodeURIComponent(`${query} PinoyTambayan`)}`,
    englishAccess: 'Subtitle and dubbing support is not guaranteed.',
  },
  {
    name: 'KapamilyaTV',
    description: 'Kapamilya-focused community fallback. Opens externally.',
    sourceType: 'community',
    hasAds: true,
    href: 'https://kapamilyatv.su',
    searchHref: (query) => `https://www.google.com/search?q=${encodeURIComponent(`${query} KapamilyaTV`)}`,
    englishAccess: 'Subtitle and dubbing support is not guaranteed.',
  },
];

export function getPinoySearchLinks(title: string) {
  return [
    ...PINOY_OFFICIAL_SOURCES.map((source) => ({
      ...source,
      href: source.searchHref?.(title) || source.href,
    })),
    ...PINOY_COMMUNITY_FALLBACKS.map((source) => ({
      ...source,
      href: source.searchHref?.(title) || source.href,
    })),
  ];
}

