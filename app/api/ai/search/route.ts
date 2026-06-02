import { NextResponse } from 'next/server';
import { tmdb } from '@/lib/tmdb/api';
import { jikan } from '@/lib/jikan/api';
import { callDeepSeek, hasLLMProvider } from '@/lib/recommendations/deepseek';

type SearchContext = 'anime' | 'cartoons' | 'live-action';

type AiPick = {
  title: string;
  type?: 'movie' | 'tv' | 'anime';
  year?: number;
  reason?: string;
  confidence?: number;
};

type AiSearchPlan = {
  intent?: string;
  filters?: Record<string, unknown>;
  picks?: AiPick[];
};

function mapToUnifiedFormat(item: any, context: SearchContext, extra: Partial<AiPick> = {}) {
  if (context === 'anime') {
    return {
      id: item.mal_id,
      title: item.title_english || item.title,
      poster: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || null,
      media_type: item.type === 'Movie' ? 'movie' : 'tv',
      year: item.aired?.from ? item.aired.from.slice(0, 4) : 'TBA',
      rating: item.score || 0,
      context: 'anime',
      reason: extra.reason,
      confidence: extra.confidence,
    };
  }

  return {
    id: item.id,
    title: item.title || item.name,
    poster: item.poster_path,
    media_type: item.media_type || (item.name ? 'tv' : 'movie'),
    year: (item.release_date || item.first_air_date || '').slice(0, 4) || 'TBA',
    rating: item.vote_average || 0,
    context: item.original_language === 'ja' && item.genre_ids?.includes(16) ? 'anime' : context,
    reason: extra.reason,
    confidence: extra.confidence,
  };
}

function inferFilters(query: string, context: SearchContext) {
  const text = query.toLowerCase();
  const filters: Record<string, unknown> = {};
  const genres: string[] = [];

  if (context === 'anime') filters.contentType = text.includes('movie') || text.includes('film') ? 'movie' : 'tv';
  else if (context === 'cartoons') {
    filters.contentType = text.includes('movie') || text.includes('film') ? 'movie' : 'tv';
    filters.selectedGenres = ['Animation'];
  } else if (text.includes('show') || text.includes('series') || text.includes('season')) filters.contentType = 'tv';
  else if (text.includes('movie') || text.includes('film')) filters.contentType = 'movie';

  const genreMap: Array<[string, string[]]> = [
    ['Crime', ['crime', 'criminal', 'detective', 'police', 'mafia', 'gangster']],
    ['Drama', ['drama', 'prestige']],
    ['Comedy', ['comedy', 'funny', 'laugh', 'sitcom']],
    ['Action', ['action', 'fight', 'explosive']],
    ['Thriller', ['thriller', 'tense', 'suspense']],
    ['Horror', ['horror', 'scary']],
    ['Romance', ['romance', 'romantic']],
    ['Sci-Fi', ['sci-fi', 'sci fi', 'science fiction']],
    ['Fantasy', ['fantasy', 'magic']],
    ['Mystery', ['mystery', 'mind-bending', 'mind bending']],
    ['Documentary', ['documentary', 'docuseries']],
  ];

  for (const [genre, terms] of genreMap) {
    if (terms.some((term) => text.includes(term))) genres.push(genre);
  }
  if (genres.length) filters.selectedGenres = [...new Set([...(filters.selectedGenres as string[] ?? []), ...genres])];

  const seasonMatch = text.match(/(\d+)\+?\s*seasons?/);
  if (seasonMatch) filters.minSeasons = Number(seasonMatch[1]);
  if (text.includes('completed') || text.includes('proper ending') || text.includes('finished')) filters.completedOnly = true;
  if (text.includes('cancelled')) filters.status = 'cancelled';
  if (text.includes('british') || text.includes('uk')) filters.countries = ['GB'];
  if (text.includes('japanese')) filters.countries = ['JP'];
  if (text.includes('korean')) filters.countries = ['KR'];
  if (text.includes('us ') || text.includes('american')) filters.countries = ['US'];
  if (text.includes('family')) filters.contentRatings = ['G', 'PG', 'TV-G', 'TV-PG'];
  if (text.includes('critically acclaimed') || text.includes('highly rated')) filters.minImdbRating = 7.5;

  const yearRange = text.match(/(19\d{2}|20\d{2})\s*[-to]+\s*(19\d{2}|20\d{2})/);
  if (yearRange) {
    filters.yearFrom = Number(yearRange[1]);
    filters.yearTo = Number(yearRange[2]);
  } else if (text.includes('2000s')) {
    filters.yearFrom = 2000;
    filters.yearTo = 2009;
  } else if (text.includes('2010s')) {
    filters.yearFrom = 2010;
    filters.yearTo = 2019;
  } else if (text.includes('2020s')) {
    filters.yearFrom = 2020;
    filters.yearTo = new Date().getFullYear();
  }

  return filters;
}

function filtersToDiscoverUrl(filters: Record<string, unknown>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) params.set(key, value.join(','));
    else params.set(key, String(value));
  }
  return params.toString() ? `/discover?${params.toString()}` : '/discover';
}

function parseAiPlan(raw: string): AiSearchPlan | null {
  try {
    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start < 0 || end < start) return null;
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return {
      intent: typeof parsed.intent === 'string' ? parsed.intent : undefined,
      filters: parsed.filters && typeof parsed.filters === 'object' ? parsed.filters : undefined,
      picks: Array.isArray(parsed.picks) ? parsed.picks : [],
    };
  } catch {
    return null;
  }
}

async function buildAiPlan(query: string, context: SearchContext): Promise<AiSearchPlan | null> {
  if (!hasLLMProvider()) return null;

  const domain = context === 'anime'
    ? 'anime series and anime films'
    : context === 'cartoons'
      ? 'western cartoons and animated films, excluding Japanese anime unless asked'
      : 'movies and TV shows, excluding anime and western animation unless asked';

  const prompt = `You are VAULT, StreamVault's cinematic discovery engine.
User request: "${query}"
Domain: ${domain}

Return only valid JSON:
{
  "intent": "one sentence describing the user's actual desire",
  "filters": {
    "contentType": "movie|tv|both",
    "selectedGenres": ["Crime"],
    "minSeasons": 4,
    "completedOnly": true,
    "yearFrom": 2000,
    "yearTo": 2009,
    "countries": ["US"],
    "minImdbRating": 7.5
  },
  "picks": [
    {"title":"Exact title","type":"movie|tv|anime","year":2011,"reason":"Specific one-line reason this matches","confidence":0.92}
  ]
}

Rules:
- Return 5 picks.
- Respect exclusions like "not Ghibli", "already seen Breaking Bad".
- Prefer exact structural matches over famous-but-wrong picks.
- Reasons must be short, specific, and honest.`;

  const raw = await callDeepSeek([{ role: 'user', content: prompt }], { max_tokens: 650, temperature: 0.15 })
    .catch(() => '');
  return raw ? parseAiPlan(raw) : null;
}

async function standardSearch(query: string, context: SearchContext) {
  if (context === 'anime') {
    const jikanRes: any = await jikan.searchAnime(query, { limit: '8' });
    return (jikanRes.data || []).map((result: any) => mapToUnifiedFormat(result, 'anime'));
  }

  const standardResults = await tmdb.search(query);
  let filtered = (standardResults.results || []).filter((result: any) => result.media_type === 'movie' || result.media_type === 'tv');

  if (context === 'cartoons') {
    filtered = filtered.filter((result: any) => result.genre_ids?.includes(16) && result.original_language !== 'ja');
  } else if (context === 'live-action') {
    filtered = filtered.filter((result: any) => !result.genre_ids?.includes(16));
  }

  return filtered.slice(0, 8).map((result: any) => mapToUnifiedFormat(result, context));
}

async function resolveAiPicks(picks: AiPick[], context: SearchContext) {
  if (!picks.length) return [];

  if (context === 'anime') {
    const settled = await Promise.all(
      picks.map(async (pick) => {
        const result: any = await jikan.searchAnime(pick.title, { limit: '1' });
        const top = result.data?.[0];
        return top ? mapToUnifiedFormat(top, 'anime', pick) : null;
      })
    );
    return settled.filter(Boolean);
  }

  const settled = await Promise.all(
    picks.map(async (pick) => {
      const result = await tmdb.search(pick.title);
      let candidates = (result.results || []).filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv');
      if (pick.type === 'movie') candidates = candidates.filter((item: any) => item.media_type === 'movie');
      if (pick.type === 'tv') candidates = candidates.filter((item: any) => item.media_type === 'tv');
      if (context === 'cartoons') candidates = candidates.filter((item: any) => item.genre_ids?.includes(16) && item.original_language !== 'ja');
      if (context === 'live-action') candidates = candidates.filter((item: any) => !item.genre_ids?.includes(16));
      const top = candidates[0];
      return top ? mapToUnifiedFormat(top, context, pick) : null;
    })
  );

  return settled.filter(Boolean);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = String(body.query || '').trim();
    const isAi = body.isAi ?? true;
    const context = (body.context || 'live-action') as SearchContext;

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    if (!isAi) {
      return NextResponse.json({ results: await standardSearch(query, context), isAi: false });
    }

    const deterministicFilters = inferFilters(query, context);
    const plan = await buildAiPlan(query, context);
    const filters = { ...deterministicFilters, ...(plan?.filters ?? {}) };
    const resolved = await resolveAiPicks(plan?.picks ?? [], context);
    const results = resolved.length ? resolved : await standardSearch(query, context);

    const uniqueResults = Array.from(new Map(results.map((item: any) => [`${item.context}:${item.media_type}:${item.id}`, item])).values());

    return NextResponse.json({
      results: uniqueResults,
      isAi: true,
      intent: plan?.intent || `VAULT interpreted this as: ${query}`,
      filters,
      filterUrl: filtersToDiscoverUrl(filters),
    });
  } catch (error) {
    console.error('AI Search Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
