export type VideoSource = 'vidsrc' | 'vidsrc-pro' | 'superembed';

export function getVideoUrl(
  type: 'movie' | 'tv',
  tmdbId: string,
  season?: number,
  episode?: number,
  source: VideoSource = 'vidsrc'
): string {
  switch (source) {
    case 'vidsrc':
      if (type === 'movie') return `https://vidsrc.xyz/embed/movie/${tmdbId}`;
      return `https://vidsrc.xyz/embed/tv/${tmdbId}/${season}-${episode}`;
      
    case 'vidsrc-pro':
      if (type === 'movie') return `https://vidsrc.pro/embed/movie/${tmdbId}`;
      return `https://vidsrc.pro/embed/tv/${tmdbId}/${season}/${episode}`;
      
    case 'superembed':
      if (type === 'movie') return `https://multiembed.mov/directstream.php?video_id=${tmdbId}&tmdb=1`;
      return `https://multiembed.mov/directstream.php?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`;
      
    default:
      if (type === 'movie') return `https://vidsrc.xyz/embed/movie/${tmdbId}`;
      return `https://vidsrc.xyz/embed/tv/${tmdbId}/${season}-${episode}`;
  }
}
