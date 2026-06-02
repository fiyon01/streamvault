export type VideoSource =
  | 'embed-su'
  | 'multiembed'
  | 'moviesapi'
  | 'vidsrc-to'
  | 'vidsrc-me'
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
      id: 'embed-su',
      label: 'Embed.su',
      shortLabel: 'Clean',
      groupLabel: 'Primary',
      priority: 1,
      hasAds: false,
      adRisk: 'low',
      qualityLabel: 'No ads documented',
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
      groupLabel: 'Backup',
      priority: 2,
      hasAds: false,
      adRisk: 'low',
      qualityLabel: 'No ads documented',
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
      groupLabel: 'Backup',
      priority: 3,
      hasAds: false,
      adRisk: 'low',
      qualityLabel: 'No ads documented',
      urls: type === 'movie'
        ? [
            `https://moviesapi.club/movie/${tmdbId}`,
          ]
        : [
            `https://moviesapi.club/tv/${tmdbId}-${episodeSeason}-${episodeNumber}`,
          ],
    },
    {
      id: 'vidsrc-to',
      label: 'VidSrc.to',
      shortLabel: 'Risk',
      groupLabel: 'Last resort',
      priority: 4,
      hasAds: true,
      adRisk: 'high',
      qualityLabel: 'Pop-up risk',
      warning: 'This source may show pop-ups. Use only if the cleaner sources fail.',
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
      shortLabel: 'Risk',
      groupLabel: 'Last resort',
      priority: 5,
      hasAds: true,
      adRisk: 'high',
      qualityLabel: 'Pop-up risk',
      warning: 'This source may show pop-ups. Use only if the cleaner sources fail.',
      urls: type === 'movie'
        ? [
            `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`,
          ]
        : [
            `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=${episodeSeason}&episode=${episodeNumber}`,
          ],
    },
    {
      id: 'vidsrc-xyz',
      label: 'VidSrc.xyz',
      shortLabel: 'Risk',
      groupLabel: 'Last resort',
      priority: 6,
      hasAds: true,
      adRisk: 'high',
      qualityLabel: 'Pop-up risk',
      warning: 'This source may show pop-ups. Use only if the cleaner sources fail.',
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
      id: 'vidsrc-in',
      label: 'VidSrc.in',
      shortLabel: 'Final',
      groupLabel: 'Absolute last',
      priority: 7,
      hasAds: true,
      adRisk: 'high',
      qualityLabel: 'Last resort',
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
  source: VideoSource = 'embed-su'
): string {
  const provider = getVideoProviders(type, tmdbId, season, episode)
    .find((candidate) => candidate.id === source);

  return provider?.urls[0] || getVideoProviders(type, tmdbId, season, episode)[0].urls[0];
}
