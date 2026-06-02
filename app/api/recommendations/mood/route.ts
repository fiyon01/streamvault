import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { tmdb } from '@/lib/tmdb/api';
import { callDeepSeek, hasLLMProvider } from '@/lib/recommendations/deepseek';

type Mood = 'auto' | 'relaxed' | 'energized' | 'sad' | 'bored' | 'social' | 'focused';

function getTimeOfDay(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 22) return 'evening';
  return 'late_night';
}

function getDayType(date = new Date()) {
  return [0, 6].includes(date.getDay()) ? 'weekend' : 'weekday';
}

function inferMood(explicitMood: Mood, date = new Date()): Mood {
  if (explicitMood !== 'auto') return explicitMood;
  const timeOfDay = getTimeOfDay(date);
  const dayType = getDayType(date);
  if (timeOfDay === 'late_night') return 'focused';
  if (dayType === 'weekend' && timeOfDay === 'morning') return 'relaxed';
  if (dayType === 'weekend' && timeOfDay === 'evening') return 'social';
  if (timeOfDay === 'afternoon') return 'energized';
  return 'bored';
}

function moodParams(mood: Mood, mediaType: 'movie' | 'tv') {
  const params: Record<string, string> = {
    sort_by: 'popularity.desc',
    'vote_average.gte': '7',
    'vote_count.gte': mediaType === 'movie' ? '1200' : '500',
  };

  switch (mood) {
    case 'relaxed':
      params.with_genres = mediaType === 'movie' ? '35|10751|18' : '35|10751|18';
      break;
    case 'energized':
      params.with_genres = mediaType === 'movie' ? '28|12|878' : '10759|10765';
      break;
    case 'sad':
      params.with_genres = mediaType === 'movie' ? '35|10751|10749' : '35|18';
      params.without_genres = mediaType === 'movie' ? '27,53' : '';
      break;
    case 'social':
      params.with_genres = mediaType === 'movie' ? '35|12|9648' : '35|9648';
      break;
    case 'focused':
      params.with_genres = mediaType === 'movie' ? '878|9648|53' : '10765|9648|18';
      break;
    case 'bored':
    default:
      params.with_genres = mediaType === 'movie' ? '53|9648|80' : '9648|80|18';
      break;
  }

  Object.keys(params).forEach((key) => {
    if (!params[key]) delete params[key];
  });
  return params;
}

function normalize(item: any, mediaType: 'movie' | 'tv') {
  const title = item.title || item.name || 'Untitled';
  const date = item.release_date || item.first_air_date || '';

  return {
    tmdb_id: String(item.id),
    media_type: mediaType,
    title,
    overview: item.overview || '',
    poster_path: item.poster_path || null,
    backdrop_path: item.backdrop_path || null,
    vote_average: item.vote_average || 0,
    year: date.slice(0, 4) || 'TBA',
    watchHref: mediaType === 'tv' ? `/watch/show/${item.id}` : `/watch/movie/${item.id}`,
    detailHref: mediaType === 'tv' ? `/shows/${item.id}` : `/movies/${item.id}`,
  };
}

function scoreCandidate(item: any, mood: Mood, mediaType: 'movie' | 'tv') {
  const rating = Number(item.vote_average ?? 0) / 10;
  const popularity = Math.min(Number(item.popularity ?? 0) / 900, 1);
  const recency = Number((item.release_date || item.first_air_date || '2000').slice(0, 4)) >= 2010 ? 0.08 : 0;
  const tvBoost = mediaType === 'tv' && ['focused', 'bored', 'social'].includes(mood) ? 0.08 : 0;
  const genreIds: number[] = item.genre_ids || [];
  const moodGenreBoost =
    mood === 'sad' && genreIds.some((id) => [35, 10751, 10749].includes(id)) ? 0.18 :
    mood === 'energized' && genreIds.some((id) => [28, 12, 878, 10759, 10765].includes(id)) ? 0.18 :
    mood === 'focused' && genreIds.some((id) => [878, 9648, 53, 10765, 18].includes(id)) ? 0.18 :
    mood === 'social' && genreIds.some((id) => [35, 12, 9648].includes(id)) ? 0.16 :
    mood === 'relaxed' && genreIds.some((id) => [35, 10751, 18].includes(id)) ? 0.16 :
    mood === 'bored' && genreIds.some((id) => [53, 9648, 80, 18].includes(id)) ? 0.16 :
    0;

  return rating * 0.5 + popularity * 0.2 + recency + tvBoost + moodGenreBoost;
}

async function userSeenIds(userId: string | undefined) {
  if (!userId) return new Set<string>();
  try {
    const admin = createAdminClient();
    const [history, negative] = await Promise.all([
      admin.from('watch_history').select('content_id').eq('user_id', userId).limit(200),
      admin.from('user_signals').select('tmdb_id').eq('user_id', userId).lt('signal_weight', 0).limit(200),
    ]);
    return new Set([
      ...(history.data || []).map((row: any) => String(row.content_id)),
      ...(negative.data || []).map((row: any) => String(row.tmdb_id)),
    ]);
  } catch {
    return new Set<string>();
  }
}

async function buildExplanation(pick: ReturnType<typeof normalize>, mood: Mood, context: { timeOfDay: string; dayType: string }) {
  const fallback = `Based on your ${context.timeOfDay.replace('_', ' ')} ${context.dayType} context, **${pick.title}** is the cleanest call: strong rating, immediate hook, and enough texture to justify pressing play now. You can sample one episode or one sitting without turning this into a browsing spiral.`;
  if (!hasLLMProvider()) return fallback;

  try {
    return await callDeepSeek(
      [
        {
          role: 'system',
          content: 'You are VAULT. Give one confident, honest, specific recommendation explanation in 2 sentences. No preamble.',
        },
        {
          role: 'user',
          content: `Mood: ${mood}. Context: ${context.timeOfDay} ${context.dayType}. Pick: ${pick.title} (${pick.year}). Overview: ${pick.overview}`,
        },
      ],
      { max_tokens: 120, temperature: 0.55 }
    );
  } catch {
    return fallback;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const explicitMood = (body.mood || 'auto') as Mood;
    const excludeIds = new Set<string>((Array.isArray(body.excludeIds) ? body.excludeIds : []).map(String));
    const mood = inferMood(explicitMood);
    const timeOfDay = getTimeOfDay();
    const dayType = getDayType();

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const seen = await userSeenIds(user?.id);

    const [movies, shows] = await Promise.all([
      tmdb.discoverMovies(moodParams(mood, 'movie')).catch(() => ({ results: [] })),
      tmdb.discoverTv(moodParams(mood, 'tv')).catch(() => ({ results: [] })),
    ]);

    const candidates = [
      ...(movies.results || []).map((item: any) => ({ item, mediaType: 'movie' as const, score: scoreCandidate(item, mood, 'movie') })),
      ...(shows.results || []).map((item: any) => ({ item, mediaType: 'tv' as const, score: scoreCandidate(item, mood, 'tv') })),
    ]
      .filter((candidate) => {
        const candidateId = String(candidate.item?.id ?? '');
        return candidateId &&
          !seen.has(candidateId) &&
          !excludeIds.has(candidateId) &&
          candidate.item.poster_path &&
          candidate.item.backdrop_path;
      })
      .sort((a, b) => b.score - a.score);

    const selected = candidates[0] ?? null;
    if (!selected) {
      return NextResponse.json({ error: 'No mood pick available' }, { status: 404 });
    }

    const pick = normalize(selected.item, selected.mediaType);
    const explanation = await buildExplanation(pick, mood, { timeOfDay, dayType });

    return NextResponse.json({
      mood,
      requestedMood: explicitMood,
      context: { timeOfDay, dayType },
      pick,
      explanation,
      honestNote: mood === 'focused'
        ? 'This is not background noise. Give it attention or save it.'
        : 'This is meant to end the search, not start another one.',
      matchScore: Math.round(selected.score * 100),
    });
  } catch (error) {
    console.error('Mood recommendation error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Mood engine failed' }, { status: 500 });
  }
}
