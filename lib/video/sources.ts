export type VideoSource =
  | 'embed-su'
  | 'multiembed'
  | 'moviesapi'
  | 'vidsrc-to'
  | 'vidsrc-me'
  | 'primesrc'
  | 'vidsrc-xyz'
  | 'vidsrc-in';

export type VideoProvider = {
  id: VideoSource;
  label: string;
  shortLabel: string;
  groupLabel: string;
  priority: number;
  hasAds: boolean;
  adRisk: 'low' | 'high';
  qualityLabel: string;
  expectedQuality: string;
  warning?: string;
  urls: string[];
};

export function getVideoProviders(
  type: 'movie' | 'tv',
  tmdbId: string,
  season?: number,
  episode?: number
): VideoProvider[] {
  const episodeSeason = season ?? 1;
  const episodeNumber = episode ?? 1;

  const providers: VideoProvider[] = [
    {
      id: 'vidsrc-to',
      label: 'VidSrc.to',
      shortLabel: 'Play',
      groupLabel: 'Primary server',
      priority: 1,
      hasAds: true,
      adRisk: 'low',
      qualityLabel: 'Working server',
      expectedQuality: 'Auto / provider-controlled',
      urls: type === 'movie'
        ? [
            `https://vidsrc.to/embed/movie/${tmdbId}`,
          ]
        : [
            `https://vidsrc.to/embed/tv/${tmdbId}/${episodeSeason}/${episodeNumber}`,
          ],
    },
    {
      id: 'vidsrc-me',
      label: 'VidSrc.me',
      shortLabel: 'Alt',
      groupLabel: 'Second server',
      priority: 2,
      hasAds: true,
      adRisk: 'low',
      qualityLabel: 'Working backup',
      expectedQuality: 'Auto / provider-controlled',
      urls: type === 'movie'
        ? [
            `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`,
          ]
        : [
            `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=${episodeSeason}&episode=${episodeNumber}`,
          ],
    },
    {
      id: 'primesrc',
      label: 'PrimeSrc.me',
      shortLabel: 'Prime',
      groupLabel: 'Third server',
      priority: 3,
      hasAds: true,
      adRisk: 'low',
      qualityLabel: '1080p-capable backup',
      expectedQuality: 'Provider-controlled / often HD',
      urls: type === 'movie'
        ? [
            `https://primesrc.me/embed/movie?tmdb=${tmdbId}`,
            `https://primesrc.me/embed/movie/${tmdbId}`,
            `https://primesrc.me/embed/movie?id=${tmdbId}`,
            `https://primesrc.me/embed/movie?s_id=${tmdbId}`,
          ]
        : [
            `https://primesrc.me/embed/tv?tmdb=${tmdbId}&s=${episodeSeason}&e=${episodeNumber}`,
            `https://primesrc.me/embed/tv/${tmdbId}/${episodeSeason}/${episodeNumber}`,
            `https://primesrc.me/embed/tv?id=${tmdbId}&season=${episodeSeason}&episode=${episodeNumber}`,
            `https://primesrc.me/embed/tv?s_id=${tmdbId}&season=${episodeSeason}&episode=${episodeNumber}`,
          ],
    },
    {
      id: 'vidsrc-xyz',
      label: 'VidSrc.xyz',
      shortLabel: 'Alt',
      groupLabel: 'Fourth server',
      priority: 4,
      hasAds: true,
      adRisk: 'high',
      qualityLabel: 'Fallback',
      expectedQuality: 'Auto / provider-controlled',
      warning: 'Ads may appear on this external server. StreamVault will switch if the stream fails.',
      urls: type === 'movie'
        ? [
            `https://vidsrc.xyz/embed/movie/${tmdbId}`,
            `https://vidsrc.net/embed/movie/${tmdbId}`,
          ]
        : [
            `https://vidsrc.xyz/embed/tv/${tmdbId}/${episodeSeason}/${episodeNumber}`,
            `https://vidsrc.net/embed/tv/${tmdbId}/${episodeSeason}/${episodeNumber}`,
          ],
    },
    {
      id: 'embed-su',
      label: 'Embed.su',
      shortLabel: 'Clean',
      groupLabel: 'Ad-light backup',
      priority: 5,
      hasAds: false,
      adRisk: 'low',
      qualityLabel: 'Ad-light backup',
      expectedQuality: 'Source dependent',
      urls: type === 'movie'
        ? [
            `https://embed.su/embed/movie/${tmdbId}`,
            `https://embed.su/embed/movie?tmdb=${tmdbId}`,
          ]
        : [
            `https://embed.su/embed/tv/${tmdbId}/${episodeSeason}/${episodeNumber}`,
            `https://embed.su/embed/tv?tmdb=${tmdbId}&season=${episodeSeason}&episode=${episodeNumber}`,
          ],
    },
    {
      id: 'multiembed',
      label: 'MultiEmbed',
      shortLabel: 'Clean',
      groupLabel: 'Ad-light backup',
      priority: 6,
      hasAds: false,
      adRisk: 'low',
      qualityLabel: 'Ad-light backup',
      expectedQuality: 'Source dependent',
      urls: type === 'movie'
        ? [
            `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`,
          ]
        : [
            `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${episodeSeason}&e=${episodeNumber}`,
          ],
    },
    {
      id: 'moviesapi',
      label: 'MoviesAPI',
      shortLabel: 'Clean',
      groupLabel: 'Ad-light backup',
      priority: 7,
      hasAds: false,
      adRisk: 'low',
      qualityLabel: 'Ad-light backup',
      expectedQuality: 'Source dependent',
      urls: type === 'movie'
        ? [
            `https://moviesapi.club/movie/${tmdbId}`,
          ]
        : [
            `https://moviesapi.club/tv/${tmdbId}-${episodeSeason}-${episodeNumber}`,
          ],
    },
    {
      id: 'vidsrc-in',
      label: 'VidSrc.in',
      shortLabel: 'Final',
      groupLabel: 'Absolute last',
      priority: 8,
      hasAds: true,
      adRisk: 'high',
      qualityLabel: 'Last resort',
      expectedQuality: 'Auto / provider-controlled',
      warning: 'Known pop-up risk. Last resort only.',
      urls: type === 'movie'
        ? [
            `https://vidsrc.in/embed/movie/${tmdbId}`,
            `https://vidsrc.mov/embed/movie/${tmdbId}`,
            `https://vidsrc.wiki/embed/movie/${tmdbId}`,
          ]
        : [
            `https://vidsrc.in/embed/tv/${tmdbId}/${episodeSeason}/${episodeNumber}`,
            `https://vidsrc.mov/embed/tv/${tmdbId}/${episodeSeason}/${episodeNumber}`,
            `https://vidsrc.wiki/embed/tv/${tmdbId}/${episodeSeason}/${episodeNumber}`,
          ],
    },
  ];

  return providers.sort((a, b) => a.priority - b.priority);
}

export function getVideoUrl(
  type: 'movie' | 'tv',
  tmdbId: string,
  season?: number,
  episode?: number,
  source: VideoSource = 'vidsrc-to'
): string {
  const provider = getVideoProviders(type, tmdbId, season, episode)
    .find((candidate) => candidate.id === source);

  return provider?.urls[0] || getVideoProviders(type, tmdbId, season, episode)[0].urls[0];
}
