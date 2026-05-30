const TMDB_API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

async function fetchFromTMDB(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.append('api_key', TMDB_API_KEY || '');
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  const response = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
    },
    next: { revalidate: 3600 } // Cache for 1 hour
  });

  if (!response.ok) {
    throw new Error(`TMDB API Error: ${response.statusText}`);
  }

  return response.json();
}

export const tmdb = {
  getTrending: (mediaType: 'movie' | 'tv' | 'all' = 'all', timeWindow: 'day' | 'week' = 'week') => {
    return fetchFromTMDB(`/trending/${mediaType}/${timeWindow}`);
  },
  
  getDetails: (mediaType: 'movie' | 'tv', id: string) => {
    return fetchFromTMDB(`/${mediaType}/${id}`, { append_to_response: 'videos,credits,similar' });
  },
  
  getSeasonDetails: (tvId: string, seasonNumber: number) => {
    return fetchFromTMDB(`/tv/${tvId}/season/${seasonNumber}`);
  },
  
  search: (query: string, page = '1') => {
    return fetchFromTMDB('/search/multi', { query, page });
  },

  discoverMovies: (params: Record<string, string> = {}) => {
    return fetchFromTMDB('/discover/movie', params);
  },

  discoverTv: (params: Record<string, string> = {}) => {
    return fetchFromTMDB('/discover/tv', params);
  }
};
