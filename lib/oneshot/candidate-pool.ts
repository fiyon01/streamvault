import { ParsedIntent, ContentType, OneShotCandidate } from './types';
import { tmdb } from '@/lib/tmdb/api';
import { jikan } from '@/lib/jikan/api';

const GENRE_MAP: Record<string, string> = {
  action: '28', adventure: '12', comedy: '35', crime: '80',
  drama: '18', fantasy: '14', horror: '27', mystery: '9648',
  romance: '10749', 'sci-fi': '878', scifi: '878', thriller: '53',
  war: '10752', animation: '16', animated: '16', cartoon: '16', cartoons: '16', documentary: '99',
};

const ANIMATION_GENRE_ID = '16';

const JIKAN_GENRE_MAP: Record<string, string> = {
  action: '1',
  adventure: '2',
  comedy: '4',
  drama: '8',
  fantasy: '10',
  horror: '14',
  mystery: '7',
  romance: '22',
  scifi: '24',
  'sci-fi': '24',
  psychological: '40',
  thriller: '41',
  'slice of life': '36',
  cozy: '36',
  sports: '30',
  supernatural: '37',
  hype: '1',
  funny: '4',
  laugh: '4',
};

function stableHash(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function calculateScores(item: any, intent: ParsedIntent, index: number, userProfile?: any): OneShotCandidate['scores'] {
  const baseRating = item.vote_average || item.score || 7.0;
  const qualityScore = Math.min(1, Math.max(0, baseRating / 10));
  const themes = (intent.themes || []).map((theme) => theme.toLowerCase());
  const genreIds = (item.genre_ids || []).map(String);
  const itemText = `${item.title || item.name || item.title_english || ''} ${item.overview || item.synopsis || ''}`.toLowerCase();
  const queryTokens = tokenize(`${intent.searchQuery || ''} ${intent.tone || ''} ${themes.join(' ')}`);

  const textMatches = queryTokens.filter((token) => itemText.includes(token)).length;
  const textScore = queryTokens.length > 0 ? Math.min(1, textMatches / Math.min(queryTokens.length, 6)) : 0.5;
  const genreMatches = themes.filter((theme) => {
    const genreId = GENRE_MAP[theme];
    return genreId ? genreIds.includes(genreId) : itemText.includes(theme);
  }).length;
  const genreScore = themes.length > 0 ? Math.min(1, genreMatches / Math.min(themes.length, 3)) : 0.5;
  const intentScore = Math.min(1, (textScore * 0.55) + (genreScore * 0.45) + (index < 6 ? 0.08 : 0));

  const profileThemes = Object.keys(userProfile?.theme_scores || {}).map((theme) => theme.toLowerCase());
  const profileGenres = Object.keys(userProfile?.genre_scores || {}).map((genre) => genre.toLowerCase());
  const profileMatches = [...profileThemes, ...profileGenres].filter((token) => itemText.includes(token)).length;
  const tasteScore = profileMatches > 0
    ? Math.min(1, 0.55 + profileMatches * 0.12)
    : 0.55 + Math.min(0.25, qualityScore * 0.25);

  const popularity = Number(item.popularity || item.members || 0);
  const popularityScore = popularity > 0 ? Math.min(1, Math.log10(popularity + 1) / 4) : 0.45;
  const deterministicTieBreak = (stableHash(`${item.id || item.mal_id || item.title || index}`) % 100) / 1000;
  const noveltyScore = Math.min(1, (1 - popularityScore) * 0.45 + 0.4 + deterministicTieBreak);
  const finalScore = (tasteScore * 0.3) + (intentScore * 0.4) + (qualityScore * 0.2) + (noveltyScore * 0.1);
  return { tasteScore, intentScore, qualityScore, noveltyScore, finalScore };
}

function hasAnimationIntent(intent: ParsedIntent) {
  const text = `${intent.searchQuery || ''} ${intent.tone || ''} ${(intent.themes || []).join(' ')}`.toLowerCase();
  return /\b(animated|animation|cartoon|cartoons|pixar|dreamworks|nickelodeon|disney)\b/.test(text);
}

function getThemeGenreIds(intent: ParsedIntent) {
  return [...new Set(
    (intent.themes || [])
      .map((theme) => GENRE_MAP[theme.toLowerCase()])
      .filter(Boolean)
  )];
}

function isAnimatedTmdbItem(item: any) {
  return (item.genre_ids || []).map(String).includes(ANIMATION_GENRE_ID);
}

function isWesternAnimatedTmdbItem(item: any) {
  return isAnimatedTmdbItem(item) && item.original_language !== 'ja';
}

function mapTmdbToCandidate(item: any, intent: ParsedIntent, index: number, isAnime: boolean, userProfile?: any): OneShotCandidate {
  const scores = calculateScores(item, intent, index, userProfile);
  const title = item.title || item.name || item.title_english || 'Unknown Title';
  const id = (item.id || item.mal_id || index).toString();
  
  // Handle both TMDB and Jikan (Anime) image structures
  const backdrop = isAnime 
    ? (item.images?.jpg?.large_image_url || '') 
    : (item.backdrop_path || item.poster_path || '');
    
  const posterPath = isAnime 
    ? (item.images?.jpg?.image_url || '') 
    : (item.poster_path || '');

  const rating = (item.vote_average || item.score) ? (item.vote_average || item.score).toFixed(1) : 'N/A';
  const year = (item.release_date || item.first_air_date || item.aired?.from || '').slice(0, 4);

  return {
    id,
    title,
    backdrop,
    posterPath,
    rating,
    year,
    genres: '', // Enriched later if needed
    runtime: item.runtime ? item.runtime : item.episode_run_time?.[0] ? item.episode_run_time[0] : 120,
    reasoning: `A great match for your mood: "${intent.tone}" with themes of ${intent.themes?.slice(0, 2).join(' & ') || 'cinema'}.`,
    youtubeKey: isAnime ? (item.trailer?.youtube_id || '') : '', // TMDB keys fetched in a second pass
    source: isAnime ? 'jikan' : 'tmdb',
    scores,
    detailHref: isAnime ? `/anime/${id}` : item.title ? `/watch/movie/${id}` : `/watch/show/${id}`,
  };
}

async function fetchAnimeCandidates(parsedIntent: ParsedIntent) {
  const text = `${parsedIntent.searchQuery} ${parsedIntent.tone} ${parsedIntent.themes?.join(' ') || ''}`.toLowerCase();
  const matchedGenres = Object.entries(JIKAN_GENRE_MAP)
    .filter(([keyword]) => text.includes(keyword))
    .map(([, id]) => id);

  const params: Record<string, string> = {
    limit: '25',
    order_by: 'score',
    sort: 'desc',
    min_score: '7',
  };

  if (matchedGenres.length > 0) {
    params.genres = [...new Set(matchedGenres)].slice(0, 2).join(',');
  }

  const query = matchedGenres.length > 0 ? '' : parsedIntent.searchQuery;
  const response: any = await jikan.searchAnime(query, params);
  let results: any[] = response.data || [];

  if (results.length === 0) {
    const fallback: any = await jikan.getTopAnime(25);
    results = fallback.data || [];
  }

  return results;
}

async function enrichAnimeTrailers(candidates: OneShotCandidate[]) {
  await Promise.all(candidates.slice(0, 10).map(async (candidate) => {
    try {
      if (!candidate.youtubeKey) {
        const details: any = await jikan.getAnimeById(candidate.id);
        const anime = details.data;

        candidate.youtubeKey = anime?.trailer?.youtube_id || candidate.youtubeKey || '';
        candidate.backdrop = anime?.trailer?.images?.maximum_image_url || anime?.images?.jpg?.large_image_url || candidate.backdrop;
        candidate.posterPath = anime?.images?.jpg?.image_url || candidate.posterPath;
        candidate.runtime = anime?.episodes ? `${anime.episodes} eps` : candidate.runtime;
        candidate.genres = anime?.genres?.map((genre: any) => genre.name).join(' · ') || candidate.genres;
      }

      if (!candidate.youtubeKey) {
        candidate.youtubeKey = await fetchTmdbTrailerForAnimeTitle(candidate.title) || '';
      }
    } catch {
      // Keep the search result candidate if detail enrichment fails.
    }
  }));

  candidates.sort((a, b) => {
    if (a.youtubeKey && !b.youtubeKey) return -1;
    if (!a.youtubeKey && b.youtubeKey) return 1;
    return b.scores.finalScore - a.scores.finalScore;
  });
}

async function fetchTmdbTrailerForAnimeTitle(title: string) {
  try {
    const searchResp = await tmdb.search(title);
    const match = (searchResp.results || []).find((item: any) =>
      item.media_type === 'tv' || item.media_type === 'movie'
    );

    if (!match) return null;

    const mediaType = match.media_type === 'movie' ? 'movie' : 'tv';
    const details = await tmdb.getDetails(mediaType, match.id.toString());
    const videos = details.videos?.results || [];
    const trailer =
      videos.find((video: any) => video.site === 'YouTube' && video.type === 'Trailer') ||
      videos.find((video: any) => video.site === 'YouTube');

    return trailer?.key || null;
  } catch {
    return null;
  }
}

export async function buildCandidatePool(
  parsedIntent: ParsedIntent,
  contentType: ContentType,
  userId: string,
  poolSize: number = 20,
  userProfile?: any
): Promise<OneShotCandidate[]> {
  let rawResults: any[] = [];

  try {
    if (contentType === 'anime') {
      rawResults = await fetchAnimeCandidates(parsedIntent);
    } else {
      const wantsAnimation = hasAnimationIntent(parsedIntent);
      const mediaType = contentType === 'movie' ? 'movie' : 'tv';

      if (!wantsAnimation) {
        // Try search first for ordinary movie/TV requests.
        try {
          const searchResp = await tmdb.search(parsedIntent.searchQuery);
          rawResults = (searchResp.results || []).filter((r: any) =>
            !r.media_type || r.media_type === mediaType
          );
        } catch { /* fall through to discover */ }
      }

      // If search returned too few results, supplement with TMDB discover.
      // Animation requests go straight to discover so broad prompts like
      // "make me laugh" cannot fill the pool with live-action titles.
      if (rawResults.length < 5 || wantsAnimation) {
        const genreIds = getThemeGenreIds(parsedIntent);
        if (wantsAnimation && !genreIds.includes(ANIMATION_GENRE_ID)) {
          genreIds.unshift(ANIMATION_GENRE_ID);
        }
        
        const discoverParams: Record<string, string> = {
          sort_by: 'popularity.desc',
          'vote_count.gte': '200',
          'vote_average.gte': '6',
        };
        if (genreIds.length > 0) discoverParams.with_genres = genreIds.slice(0, 2).join(',');
        if (wantsAnimation && contentType === 'tv') {
          discoverParams.without_original_language = 'ja';
        }

        const discoverFn = contentType === 'tv'
          ? tmdb.discoverTv(discoverParams)
          : tmdb.discoverMovies(discoverParams);

        const discoverResp = await discoverFn;
        rawResults = [...rawResults, ...(discoverResp.results || [])];
      }

      if (wantsAnimation) {
        rawResults = rawResults.filter(isWesternAnimatedTmdbItem);
      }
    }
  } catch (error) {
    console.error('Error fetching candidates:', error);
  }

  // Fallback: if still empty, grab trending
  if (rawResults.length === 0) {
    try {
      if (contentType === 'anime') {
        const topAnime: any = await jikan.getTopAnime(poolSize);
        rawResults = topAnime.data || [];
      } else {
        const trending = await tmdb.getTrending(contentType, 'week');
        rawResults = trending.results || [];
      }
    } catch { /* last resort failed */ }
  }

  const isAnime = contentType === 'anime';
  const candidates: OneShotCandidate[] = rawResults
    .filter((item: any) => item.id || item.mal_id)
    .map((item: any, index: number) => mapTmdbToCandidate(item, parsedIntent, index, isAnime, userProfile));

  candidates.sort((a, b) => b.scores.finalScore - a.scores.finalScore);

  const finalPool = candidates
    .sort((a, b) => {
      const scoreDelta = b.scores.finalScore - a.scores.finalScore;
      if (Math.abs(scoreDelta) > 0.001) return scoreDelta;
      return stableHash(a.id) - stableHash(b.id);
    })
    .slice(0, poolSize);

  if (isAnime) {
    await enrichAnimeTrailers(finalPool);
  } else {
    // Fetch YouTube trailer keys for TMDB items in parallel
    await Promise.all(finalPool.map(async (candidate) => {
      try {
        const type = contentType === 'movie' ? 'movie' : 'tv';
        const res = await fetch(`https://api.themoviedb.org/3/${type}/${candidate.id}/videos?api_key=${process.env.TMDB_API_KEY}`);
        const data = await res.json();
        const videos = data.results || [];
        const trailer = videos.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube') || videos.find((v: any) => v.site === 'YouTube');
        if (trailer) candidate.youtubeKey = trailer.key;
      } catch (e) {
        // Skip silently if trailer fetch fails
      }
    }));
  }

  const trailerBackedPool = finalPool.filter((candidate) => Boolean(candidate.youtubeKey));
  return trailerBackedPool.length > 0 ? trailerBackedPool : finalPool;
}
