'use server';

import { tmdb } from '@/lib/tmdb/api';
import { jikan } from '@/lib/jikan/api';

const GENRE_MAP: Record<string, string> = {
  action: '28', adventure: '12', animation: '16', comedy: '35',
  crime: '80', documentary: '99', drama: '18', family: '10751',
  fantasy: '14', horror: '27', mystery: '9648', romance: '10749',
  scifi: '878', 'sci-fi': '878', thriller: '53', war: '10752', western: '37',
};

const TV_GENRE_MAP: Record<string, string> = {
  action: '10759', comedy: '35', drama: '18', scifi: '10765',
  'sci-fi': '10765', mystery: '9648', documentary: '99', family: '10751',
  animation: '16', cartoon: '16',
};

// Anime / Japanese animation keywords that should trigger Jikan API
const ANIME_KEYWORDS = [
  'anime', 'manga', 'shounen', 'seinen', 'shoujo', 'josei', 'isekai',
  'mecha', 'hype', 'cozy slice', 'psychological anime', 'dark anime',
  'romance anime', 'martial arts anime', 'film night anime', 'highly rated anime',
  'anime film', 'jujutsu', 'demon slayer', 'naruto', 'attack on titan',
  'one piece', 'dragon ball', 'my hero', 'chainsaw man',
];

function detectMediaType(query: string): 'anime' | 'movie' | 'tv' {
  const q = query.toLowerCase();
  if (ANIME_KEYWORDS.some((kw) => q.includes(kw))) return 'anime';
  if (q.includes('show') || q.includes('series') || q.includes('tv') ||
      q.includes('season') || q.includes('episode') || q.includes('cartoon')) return 'tv';
  return 'movie';
}

// ── ANIME via Jikan ──────────────────────────────────────────────
async function getAnimePicks(query: string, historyIds: number[]) {
  const q = query.toLowerCase();

  // Map mood keywords to Jikan genre IDs
  const JIKAN_GENRE_MAP: Record<string, string> = {
    action: '1', adventure: '2', comedy: '4', drama: '8', fantasy: '10',
    horror: '14', mystery: '7', romance: '22', scifi: '24', 'sci-fi': '24',
    thriller: '41', psychological: '40', 'slice of life': '36', sports: '30',
    supernatural: '37', hype: '1', cozy: '36', dark: '40', film: '2',
    isekai: '62', martial: '17',
  };

  const matchedGenres: string[] = [];
  for (const [kw, id] of Object.entries(JIKAN_GENRE_MAP)) {
    if (q.includes(kw)) matchedGenres.push(id);
  }

  const params: Record<string, string> = {
    order_by: 'score', sort: 'desc', min_score: '7', limit: '10', type: 'tv',
  };
  if (matchedGenres.length) params.genres = matchedGenres.slice(0, 2).join(',');
  if (q.includes('film') || q.includes('movie')) params.type = 'movie';

  const data = await jikan.searchAnime('', params).catch(() => ({ data: [] }));
  let results: any[] = (data as any)?.data || [];

  // Filter history
  results = results.filter((r: any) => !historyIds.includes(r.mal_id));
  if (!results.length) return { success: false, error: 'No anime found for this mood.' };

  const picks = results.slice(0, 5).map((item: any) => ({
    id: item.mal_id,
    type: 'anime',
    title: item.title_english || item.title,
    titleJp: item.title,
    year: (item.year || item.aired?.prop?.from?.year || '').toString(),
    runtime: item.episodes ? `${item.episodes} eps` : 'Ongoing',
    genres: item.genres?.map((g: any) => g.name).join(' · ') || '',
    rating: item.score?.toFixed(1) || 'N/A',
    backdrop: item.images?.jpg?.large_image_url || null,
    youtubeKey: item.trailer?.youtube_id || null,
    malScore: item.score,
    reasoning: `Vault AI matched this anime to your mood "${query}". Rated ${item.score?.toFixed(1) || 'N/A'} on MyAnimeList with ${item.members?.toLocaleString() || 'many'} fans.`,
    detailHref: `/anime/${item.mal_id}`,
    source: 'jikan' as const,
  }));

  // Filter picks that have either a trailer or at least a backdrop
  const validPicks = picks.filter((p: any) => p.backdrop || p.youtubeKey);
  return validPicks.length
    ? { success: true, picks: validPicks }
    : { success: false, error: 'No anime trailers found for this mood.' };
}

// ── MOVIES / TV via TMDB ─────────────────────────────────────────
async function getTmdbPicks(query: string, historyIds: number[], mediaType: 'movie' | 'tv') {
  const q = query.toLowerCase();
  const genreMap = mediaType === 'tv' ? TV_GENRE_MAP : GENRE_MAP;

  const matchedGenres: string[] = [];
  for (const [key, id] of Object.entries(genreMap)) {
    if (q.includes(key)) matchedGenres.push(id);
  }

  let initialResults: any[] = [];

  if (matchedGenres.length > 0) {
    const fetchFn = mediaType === 'tv' ? tmdb.discoverTv : tmdb.discoverMovies;
    const data = await fetchFn({
      with_genres: matchedGenres.join(','),
      without_genres: matchedGenres.includes('16') ? '' : '16', // Exclude animation by default
      sort_by: 'popularity.desc',
      'vote_average.gte': '6.0',
      'vote_count.gte': '500',
    });
    initialResults = data.results || [];
  } else {
    const data = await tmdb.search(query);
    initialResults = (data.results || []).filter(
      (r: any) => (r.media_type === mediaType || (!r.media_type && (r.title || r.name))) && !r.genre_ids?.includes(16)
    );
  }

  let validResults = initialResults.filter((r: any) => !historyIds.includes(r.id));
  if (!validResults.length) validResults = initialResults;
  validResults = validResults.slice(0, 5);

  if (!validResults.length) return { success: false, error: 'No content found for your mood.' };

  const detailedPicks = await Promise.all(
    validResults.map(async (item: any) => {
      try {
        const type = item.title ? 'movie' : 'tv';
        const details = await tmdb.getDetails(type, item.id.toString());

        const videos = details.videos?.results || [];
        const trailer =
          videos.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer') ||
          videos.find((v: any) => v.site === 'YouTube');

        const genresStr = details.genres?.map((g: any) => g.name).join(' · ') || '';

        let runtimeStr = '';
        if (type === 'movie' && details.runtime) {
          const h = Math.floor(details.runtime / 60);
          const m = details.runtime % 60;
          runtimeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
        } else if (type === 'tv' && details.number_of_seasons) {
          runtimeStr = `${details.number_of_seasons} Season${details.number_of_seasons > 1 ? 's' : ''}`;
        }

        return {
          id: details.id,
          type,
          title: details.title || details.name,
          year: (details.release_date || details.first_air_date || '').split('-')[0],
          runtime: runtimeStr,
          genres: genresStr,
          rating: details.vote_average?.toFixed(1),
          backdrop: details.backdrop_path,
          youtubeKey: trailer?.key || null,
          reasoning: `Vault AI selected this ${type === 'movie' ? 'film' : 'series'} because it strongly matches your request: "${query}".`,
          detailHref: type === 'tv' ? `/shows/${details.id}` : `/movies/${details.id}`,
          source: 'tmdb' as const,
        };
      } catch {
        return null;
      }
    })
  );

  const finalPicks = detailedPicks.filter((p: any) => p !== null && (p.youtubeKey || p.backdrop));
  if (!finalPicks.length) return { success: false, error: 'Failed to find content for these picks.' };

  return { success: true, picks: finalPicks };
}

// ── PUBLIC EXPORT ────────────────────────────────────────────────
export async function getOneShotPicks(query: string, historyIds: number[] = []) {
  try {
    const mediaType = detectMediaType(query);

    if (mediaType === 'anime') {
      return await getAnimePicks(query, historyIds);
    }
    return await getTmdbPicks(query, historyIds, mediaType);
  } catch (error: any) {
    console.error('OneShot Engine Error:', error);
    return { success: false, error: error.message };
  }
}
