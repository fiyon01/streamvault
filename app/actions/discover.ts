'use server';

import { AnimeFilterState, CartoonFilterState, LiveActionFilterState } from '@/store/filter-store';
import { jikan } from '@/lib/jikan/api';
import { tmdb } from '@/lib/tmdb/api';

type SerializableLiveActionFilters = Omit<LiveActionFilterState, 'setFilter' | 'resetFilters'>;

const MOVIE_GENRE_MAP: Record<string, string> = {
  Action: '28',
  Adventure: '12',
  Animation: '16',
  Comedy: '35',
  Crime: '80',
  Documentary: '99',
  Drama: '18',
  Family: '10751',
  Fantasy: '14',
  History: '36',
  Horror: '27',
  Music: '10402',
  Mystery: '9648',
  Romance: '10749',
  'Sci-Fi': '878',
  Thriller: '53',
  War: '10752',
  Western: '37',
};

const TV_GENRE_MAP: Record<string, string> = {
  Action: '10759',
  Adventure: '10759',
  Animation: '16',
  Comedy: '35',
  Crime: '80',
  Documentary: '99',
  Drama: '18',
  Family: '10751',
  Fantasy: '10765',
  History: '',
  Horror: '',
  Music: '',
  Mystery: '9648',
  Romance: '',
  'Sci-Fi': '10765',
  Thriller: '',
  War: '10768',
  Western: '37',
};

const NETWORK_IDS: Record<string, string> = {
  HBO: '49',
  Netflix: '213',
  Amazon: '1024',
  Hulu: '453',
  'Disney+': '2739',
  'Apple TV+': '2552',
  BBC: '4',
  AMC: '174',
  Showtime: '67',
  FX: '88',
  NBC: '6',
  CBS: '16',
  ABC: '2',
  Fox: '19',
  NHK: '85',
  tvN: '1410',
  'Netflix KR': '213',
};

const DISCOVER_PAGE_SIZE = 20;
const STRICT_TV_PAGE_WINDOW = 2;
const STRICT_TV_DETAIL_LIMIT = 36;
const AFRICAN_COUNTRY_GROUPS: Record<SerializableLiveActionFilters['africanRegion'], string[]> = {
  all: ['NG', 'KE', 'TZ', 'UG', 'ZA', 'GH', 'EG', 'ET'],
  west_africa: ['NG', 'GH'],
  east_africa: ['KE', 'TZ', 'UG', 'ET'],
  south_africa: ['ZA'],
  north_africa: ['EG'],
  central_africa: ['CM', 'CD'],
};

function buildGenreParam(
  genres: string[],
  map: Record<string, string>,
  logic: 'AND' | 'OR'
) {
  const ids = genres.map((genre) => map[genre]).filter(Boolean);
  if (ids.length === 0) return undefined;
  return logic === 'OR' ? ids.join('|') : ids.join(',');
}

function addExcludedGenres(params: Record<string, string>, ids: string[]) {
  if (ids.length === 0) return;
  params.without_genres = [params.without_genres, ids.join(',')].filter(Boolean).join(',');
}

function hasStrictTvFilters(filters: SerializableLiveActionFilters) {
  return filters.minSeasons > 0 ||
    filters.maxSeasons > 0 ||
    filters.totalEpisodes !== 'all' ||
    filters.minEpisodesPerSeason > 0 ||
    filters.maxEpisodesPerSeason > 0 ||
    filters.noSeasonBelow > 0 ||
    filters.hiddenGemMode ||
    filters.minCommitmentHours > 0 ||
    filters.maxCommitmentHours > 0 ||
    filters.excludeCountries.length > 0 ||
    filters.requireDub ||
    filters.requireSub ||
    filters.dubLanguage !== '' ||
    filters.maxFillerPercentage > 0 ||
    filters.qualityTrajectory !== 'all' ||
    filters.minHealthScore > 0;
}

function normalizeMovie(item: any) {
  return {
    id: item.id,
    title: item.title,
    poster_path: item.poster_path,
    vote_average: item.vote_average,
    release_date: item.release_date,
    runtime: item.runtime,
    type: 'movie' as const,
  };
}

function normalizeShow(item: any) {
  return {
    id: item.id,
    title: item.name || item.title,
    poster_path: item.poster_path,
    vote_average: item.vote_average,
    release_date: item.first_air_date || item.release_date,
    type: 'tv' as const,
    metadata: {
      season_count: item.number_of_seasons,
      episode_count: item.number_of_episodes,
      min_ep_per_season: item.min_ep_per_season,
      max_ep_per_season: item.max_ep_per_season,
      total_runtime_hours: item.total_runtime_hours,
      status: item.status,
    },
  };
}

export async function discoverLiveAction(filters: SerializableLiveActionFilters) {
  const commonParams: Record<string, string> = {};
  const movieParams: Record<string, string> = { without_genres: '16' };
  const tvParams: Record<string, string> = { without_genres: '16' };

  if (filters.minImdbRating > 0) {
    commonParams['vote_average.gte'] = filters.minImdbRating.toString();
  }

  const minVotes = filters.minVoteCount > 0 ? filters.minVoteCount : (filters.minImdbRating > 0 ? 50 : 0);
  if (minVotes > 0) commonParams['vote_count.gte'] = minVotes.toString();

  const movieGenres = buildGenreParam(filters.selectedGenres, MOVIE_GENRE_MAP, filters.genreLogic);
  const tvGenres = buildGenreParam(filters.selectedGenres, TV_GENRE_MAP, filters.genreLogic);
  if (movieGenres) movieParams.with_genres = movieGenres;
  if (tvGenres) tvParams.with_genres = tvGenres;

  addExcludedGenres(movieParams, filters.excludeGenres.map((genre) => MOVIE_GENRE_MAP[genre]).filter(Boolean));
  addExcludedGenres(tvParams, filters.excludeGenres.map((genre) => TV_GENRE_MAP[genre] || MOVIE_GENRE_MAP[genre]).filter(Boolean));

  switch (filters.sortBy) {
    case 'rating':
      commonParams.sort_by = 'vote_average.desc';
      if (!commonParams['vote_count.gte']) commonParams['vote_count.gte'] = '200';
      break;
    case 'recent':
      movieParams.sort_by = 'primary_release_date.desc';
      tvParams.sort_by = 'first_air_date.desc';
      break;
    default:
      commonParams.sort_by = 'popularity.desc';
  }

  const setYearRange = (from: number, to: number) => {
    movieParams['primary_release_date.gte'] = `${from}-01-01`;
    movieParams['primary_release_date.lte'] = `${to}-12-31`;
    tvParams['first_air_date.gte'] = `${from}-01-01`;
    tvParams['first_air_date.lte'] = `${to}-12-31`;
  };

  if (filters.decade !== 'all') {
    const decadeStart: Record<string, number> = {
      '1980s': 1980,
      '1990s': 1990,
      '2000s': 2000,
      '2010s': 2010,
      '2020s': 2020,
    };
    const start = decadeStart[filters.decade];
    setYearRange(start, start + 9);
  } else {
    if (filters.yearFrom > 0) {
      movieParams['primary_release_date.gte'] = `${filters.yearFrom}-01-01`;
      tvParams['first_air_date.gte'] = `${filters.yearFrom}-01-01`;
    }
    if (filters.yearTo > 0) {
      movieParams['primary_release_date.lte'] = `${filters.yearTo}-12-31`;
      tvParams['first_air_date.lte'] = `${filters.yearTo}-12-31`;
    }
  }

  if (filters.originCountry) {
    movieParams.with_origin_country = filters.originCountry;
    tvParams.with_origin_country = filters.originCountry;
  }
  if (filters.originalLanguage) commonParams.with_original_language = filters.originalLanguage;
  if (filters.network) tvParams.with_networks = NETWORK_IDS[filters.network] || filters.network;

  if (filters.minMovieRuntime > 0) movieParams['with_runtime.gte'] = filters.minMovieRuntime.toString();
  if (filters.maxMovieRuntime > 0) movieParams['with_runtime.lte'] = filters.maxMovieRuntime.toString();
  if (filters.minEpisodeRuntime > 0) tvParams['with_runtime.gte'] = filters.minEpisodeRuntime.toString();
  if (filters.maxEpisodeRuntime > 0) tvParams['with_runtime.lte'] = filters.maxEpisodeRuntime.toString();

  Object.assign(movieParams, commonParams);
  Object.assign(tvParams, commonParams);

  const statusMap: Record<string, string> = {
    returning: '0',
    planned: '1',
    upcoming: '2',
    ended: '3',
    canceled: '4',
    hiatus: '5',
  };
  if (filters.tvStatus !== 'all' && statusMap[filters.tvStatus]) {
    tvParams.with_status = statusMap[filters.tvStatus];
  }

  const formatMap: Record<string, string> = {
    miniseries: '1',
    limited: '2',
    anthology: '6',
  };
  if (filters.seasonFormat !== 'all' && formatMap[filters.seasonFormat]) {
    tvParams.with_type = formatMap[filters.seasonFormat];
  }

  if (filters.maturityRating !== 'all') {
    tvParams.certification_country = 'US';
    tvParams.certification = filters.maturityRating;
  }

  const strictTv = hasStrictTvFilters(filters);

  try {
    const fetchMoviePage = async () =>
      tmdb.discoverMovies({ ...movieParams, page: (filters.page || 1).toString() });

    const fetchAfricanMoviePages = async () => {
      const countries = AFRICAN_COUNTRY_GROUPS[filters.africanRegion] ?? AFRICAN_COUNTRY_GROUPS.all;
      const pages = await Promise.all(
        countries.map((country) =>
          tmdb.discoverMovies({
            ...movieParams,
            with_origin_country: country,
            page: (filters.page || 1).toString(),
          }).catch(() => ({ results: [] }))
        )
      );
      return pages.flatMap((page: any) => page.results || []);
    };

    const fetchTvPages = async () => {
      const pagesToFetch = strictTv ? STRICT_TV_PAGE_WINDOW : 1;
      const startPage = ((filters.page || 1) - 1) * pagesToFetch + 1;
      const pages = await Promise.all(
        Array.from({ length: pagesToFetch }, (_, index) =>
          tmdb.discoverTv({ ...tvParams, page: (startPage + index).toString() }).catch(() => ({ results: [] }))
        )
      );
      return pages.flatMap((page: any) => page.results || []);
    };

    const fetchAfricanTvPages = async () => {
      const countries = AFRICAN_COUNTRY_GROUPS[filters.africanRegion] ?? AFRICAN_COUNTRY_GROUPS.all;
      const pagesToFetch = strictTv ? STRICT_TV_PAGE_WINDOW : 1;
      const startPage = ((filters.page || 1) - 1) * pagesToFetch + 1;
      const pages = await Promise.all(
        countries.flatMap((country) =>
          Array.from({ length: pagesToFetch }, (_, index) =>
            tmdb.discoverTv({
              ...tvParams,
              with_origin_country: country,
              page: (startPage + index).toString(),
            }).catch(() => ({ results: [] }))
          )
        )
      );
      return pages.flatMap((page: any) => page.results || []);
    };

    const enrichAndFilterTv = async (tvShows: any[]) => {
      if (!strictTv) return tvShows.map((item) => ({ ...item, title: item.name, type: 'tv' }));

      const showsToEnrich = tvShows.slice(0, STRICT_TV_DETAIL_LIMIT);
      const detailedShows = await Promise.all(
        showsToEnrich.map(async (show) => {
          try {
            const details = await tmdb.getDetails('tv', show.id.toString());
            const seasons = (details.seasons || []).filter((season: any) => season.season_number > 0);
            const episodeCounts = seasons.map((season: any) => season.episode_count || 0).filter((count: number) => count > 0);
            const seasonScores = seasons.map((season: any) => season.vote_average || 0).filter((score: number) => score > 0);
            const firstScore = seasonScores[0] || 0;
            const lastScore = seasonScores[seasonScores.length - 1] || 0;
            const qualityTrajectory = seasonScores.length < 2
              ? 'stable'
              : lastScore > firstScore + 0.3
                ? 'rising'
                : lastScore < firstScore - 0.3
                  ? 'declining'
                  : 'stable';

            return {
              ...show,
              number_of_seasons: details.number_of_seasons || seasons.length || 0,
              number_of_episodes: details.number_of_episodes || 0,
              episode_run_time: details.episode_run_time?.[0] || 0,
              origin_country: details.origin_country || show.origin_country || [],
              min_ep_per_season: episodeCounts.length > 0 ? Math.min(...episodeCounts) : 0,
              max_ep_per_season: episodeCounts.length > 0 ? Math.max(...episodeCounts) : 0,
              min_season_score: seasonScores.length > 0 ? Math.min(...seasonScores) : 0,
              quality_trajectory: qualityTrajectory,
              total_runtime_hours: details.number_of_episodes && details.episode_run_time?.[0]
                ? (details.number_of_episodes * details.episode_run_time[0]) / 60
                : 0,
              vote_count: show.vote_count || details.vote_count || 0,
            };
          } catch {
            return show;
          }
        })
      );

      return detailedShows.filter((show) => {
        if (filters.minSeasons > 0 && (show.number_of_seasons || 0) < filters.minSeasons) return false;
        if (filters.maxSeasons > 0 && (show.number_of_seasons || 0) > filters.maxSeasons) return false;

        const totalEpisodes = show.number_of_episodes || 0;
        if (filters.totalEpisodes === 'under20' && totalEpisodes >= 20) return false;
        if (filters.totalEpisodes === '20to50' && (totalEpisodes < 20 || totalEpisodes > 50)) return false;
        if (filters.totalEpisodes === '50to100' && (totalEpisodes < 50 || totalEpisodes > 100)) return false;
        if (filters.totalEpisodes === '100plus' && totalEpisodes < 100) return false;

        if (filters.minEpisodesPerSeason > 0 && (show.min_ep_per_season || 0) < filters.minEpisodesPerSeason) return false;
        if (filters.maxEpisodesPerSeason > 0 && (show.max_ep_per_season || 0) > filters.maxEpisodesPerSeason) return false;

        if (filters.noSeasonBelow > 0 && show.min_season_score > 0 && show.min_season_score < filters.noSeasonBelow) return false;
        if (filters.qualityTrajectory !== 'all' && show.quality_trajectory !== filters.qualityTrajectory) return false;

        if (filters.minCommitmentHours > 0 && (show.total_runtime_hours || 0) < filters.minCommitmentHours) return false;
        if (filters.maxCommitmentHours > 0 && (show.total_runtime_hours || 0) > filters.maxCommitmentHours) return false;

        if (filters.hiddenGemMode && ((show.vote_average || 0) < 7.5 || (show.vote_count || 0) > 50000)) return false;

        if (filters.excludeCountries.length > 0) {
          const originCountries = show.origin_country || [];
          if (originCountries.some((country: string) => filters.excludeCountries.includes(country))) return false;
        }

        return true;
      }).map((item) => ({ ...item, title: item.name, type: 'tv' }));
    };

    const filterMovies = (movies: any[]) => {
      let filtered = movies.map((item) => ({ ...item, type: 'movie' }));

      if (filters.hiddenGemMode) {
        filtered = filtered.filter((item) => (item.vote_average || 0) >= 7.5 && (item.vote_count || 0) <= 50000);
      }
      if (filters.excludeCountries.length > 0) {
        filtered = filtered.filter((item) => {
          const originCountries = item.origin_country || [];
          return !originCountries.some((country: string) => filters.excludeCountries.includes(country));
        });
      }

      return filtered;
    };

    let results: any[] = [];
    const useAfricanAggregate = filters.africanOnly && !filters.originCountry;

    if (filters.contentType === 'movie') {
      const movies = useAfricanAggregate ? await fetchAfricanMoviePages() : (await fetchMoviePage()).results || [];
      results = filterMovies(movies);
    } else if (filters.contentType === 'tv') {
      results = await enrichAndFilterTv(useAfricanAggregate ? await fetchAfricanTvPages() : await fetchTvPages());
    } else {
      const [movieRows, tvShows] = await Promise.all([
        useAfricanAggregate ? fetchAfricanMoviePages() : fetchMoviePage().then((res) => res.results || []),
        useAfricanAggregate ? fetchAfricanTvPages() : fetchTvPages(),
      ]);
      const movies = filterMovies(movieRows);
      const shows = await enrichAndFilterTv(tvShows);

      if (filters.sortBy === 'rating') {
        results = [...movies, ...shows].sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
      } else if (filters.sortBy === 'recent') {
        results = [...movies, ...shows].sort((a, b) => {
          const aTime = new Date(a.release_date || a.first_air_date || 0).getTime();
          const bTime = new Date(b.release_date || b.first_air_date || 0).getTime();
          return bTime - aTime;
        });
      } else {
        results = [...movies, ...shows].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      }
    }

    return results
      .slice(0, DISCOVER_PAGE_SIZE)
      .map((item) => item.type === 'tv' ? normalizeShow(item) : normalizeMovie(item));
  } catch (err) {
    console.error('TMDB Live Action Discovery Error:', err);
    return [];
  }
}

// Anime discovery
export async function discoverAnime(filters: AnimeFilterState) {
  try {
    const params: Record<string, string> = { limit: '20' };

    if (filters.contentType === 'movie') params.type = 'movie';
    if (filters.contentType === 'tv') params.type = 'tv';
    if (filters.minScore > 0) params.min_score = filters.minScore.toString();
    if (filters.status !== 'all') params.status = filters.status;
    if (filters.studioId) params.producers = filters.studioId;

    const jikanGenres: Record<string, string> = {
      Action: '1',
      Adventure: '2',
      Comedy: '4',
      Drama: '8',
      Fantasy: '10',
      'Sci-Fi': '24',
      Romance: '22',
      'Slice of Life': '36',
    };

    if (filters.selectedGenres.length > 0) {
      const genreIds = filters.selectedGenres.map((genre) => jikanGenres[genre]).filter(Boolean);
      if (genreIds.length > 0) params.genres = genreIds.join(',');
    }

    if (filters.sortBy === 'score') {
      params.order_by = 'score';
      params.sort = 'desc';
    } else if (filters.sortBy === 'favorites') {
      params.order_by = 'favorites';
      params.sort = 'desc';
    } else {
      params.order_by = 'popularity';
      params.sort = 'asc';
    }

    let results: any[] = [];
    if (filters.season !== 'all') {
      const year = new Date().getFullYear().toString();
      const seasonRes: any = await jikan.getSeason(year, filters.season);
      results = (seasonRes.data || []).filter((item: any) => {
        if (filters.contentType === 'movie' && item.type !== 'Movie') return false;
        if (filters.contentType === 'tv' && item.type !== 'TV') return false;
        if (filters.minScore > 0 && (item.score || 0) < filters.minScore) return false;
        return true;
      });
    } else {
      const res: any = await jikan.searchAnime('', params);
      results = res.data || [];
    }

    if (filters.demographic) {
      const demoLower = filters.demographic.toLowerCase();
      results = results.filter((item: any) =>
        (item.demographics || []).some((demo: any) => demo.name.toLowerCase().includes(demoLower))
      );
    }

    if (filters.source) {
      const sourceLower = filters.source.toLowerCase();
      results = results.filter((item: any) => (item.source || '').toLowerCase().includes(sourceLower));
    }

    return results.map((item: any) => ({
      id: item.mal_id,
      title: item.title_english || item.title,
      poster_path: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url,
      vote_average: item.score || 0,
      release_date: item.aired?.from ? item.aired.from.slice(0, 10) : '',
      type: 'anime',
    }));
  } catch (error) {
    console.error('Jikan Anime Discovery Error:', error);
    return [];
  }
}

// Cartoon discovery
export async function discoverCartoons(filters: CartoonFilterState) {
  const params: Record<string, string> = { with_genres: '16' };

  if (filters.minRating > 0) {
    params['vote_average.gte'] = filters.minRating.toString();
    params['vote_count.gte'] = '50';
  }
  if (filters.minVoteCount > 0) params['vote_count.gte'] = filters.minVoteCount.toString();

  if (filters.selectedGenres.length > 0) {
    const genreIds = filters.selectedGenres.map((genre) => MOVIE_GENRE_MAP[genre]).filter(Boolean);
    if (genreIds.length > 0) params.with_genres = `16,${genreIds.join(',')}`;
  }
  if (filters.excludeGenres.length > 0) {
    const excludeIds = filters.excludeGenres.map((genre) => MOVIE_GENRE_MAP[genre]).filter(Boolean);
    params.without_genres = excludeIds.join(',');
  }

  if (filters.targetDemo === 'adult') {
    params.without_genres = [params.without_genres, '10751,10762'].filter(Boolean).join(',');
  } else if (filters.targetDemo === 'kids') {
    params.with_genres += ',10751|10762';
  }

  if (filters.animationStyle === 'stop-motion') params.with_keywords = '10051';
  if (filters.animationStyle === 'anime-western') params.with_keywords = '210024';

  if (filters.yearFrom > 0) {
    params['primary_release_date.gte'] = `${filters.yearFrom}-01-01`;
    params['first_air_date.gte'] = `${filters.yearFrom}-01-01`;
  }
  if (filters.yearTo > 0) {
    params['primary_release_date.lte'] = `${filters.yearTo}-12-31`;
    params['first_air_date.lte'] = `${filters.yearTo}-12-31`;
  }

  if (filters.sortBy === 'rating') {
    params.sort_by = 'vote_average.desc';
    params['vote_count.gte'] = '200';
  } else if (filters.sortBy === 'recent') {
    params.sort_by = 'primary_release_date.desc';
  } else {
    params.sort_by = 'popularity.desc';
  }

  try {
    let results: any[] = [];

    if (filters.contentType === 'movie') {
      const res = await tmdb.discoverMovies(params);
      results = (res.results || []).map((item: any) => ({ ...item, type: 'movie' }));
    } else if (filters.contentType === 'tv') {
      const res = await tmdb.discoverTv(params);
      results = (res.results || []).map((item: any) => ({ ...item, title: item.name, type: 'tv' }));
    } else {
      const [moviesRes, tvRes] = await Promise.all([
        tmdb.discoverMovies(params),
        tmdb.discoverTv(params),
      ]);
      const movies = (moviesRes.results || []).map((item: any) => ({ ...item, type: 'movie' }));
      const shows = (tvRes.results || []).map((item: any) => ({ ...item, title: item.name, type: 'tv' }));
      results = [...movies, ...shows].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    }

    if (filters.animationStyle !== 'all') {
      results = results.filter((item) => item.original_language !== 'ja');
    }

    return results.map((item) => ({
      id: item.id,
      title: item.title,
      poster_path: item.poster_path,
      vote_average: item.vote_average,
      release_date: item.release_date || item.first_air_date,
      type: item.type,
    }));
  } catch (err) {
    console.error('TMDB Cartoon Discovery Error:', err);
    return [];
  }
}

export const discoverContent = discoverLiveAction as any;
