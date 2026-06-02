import type { SupabaseClient } from '@supabase/supabase-js';
import type { VaultChatMessage, VaultContentRef, VaultContext } from './types';

type AnyRecord = Record<string, any>;

const EMPTY_BREAKDOWN: Record<string, number> = {};

function timeOfDay(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 22) return 'evening';
  return 'late night';
}

function dayOfWeek(date = new Date()) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date);
}

function inferMood(date = new Date()) {
  const hour = date.getHours();
  const weekend = [0, 6].includes(date.getDay());
  if (hour >= 22 || hour < 2) return weekend ? 'late-night binge mode' : 'late-night, probably wants something gripping';
  if (weekend && hour >= 18) return 'weekend prime-time discovery';
  if (hour < 12) return 'low-friction morning browse';
  return 'focused discovery';
}

function displayName(profile: AnyRecord | null, fallback: string) {
  const raw = profile?.username || profile?.full_name || profile?.name || fallback;
  return String(raw).split('@')[0] || 'friend';
}

function yearFromDate(date?: string | null) {
  return date ? String(date).slice(0, 4) : undefined;
}

function typeFromContent(content?: AnyRecord | null): VaultContentRef['type'] {
  if (content?.type === 'movie') return 'movie';
  if (content?.type === 'show' || content?.type === 'tv') return 'show';
  return 'unknown';
}

function contentToRef(content: AnyRecord | null | undefined, extra: Partial<VaultContentRef> = {}): VaultContentRef | null {
  if (!content?.id && !extra.id) return null;

  return {
    id: String(extra.id ?? content?.id),
    title: String(extra.title ?? content?.title ?? content?.name ?? `TMDB ${extra.id ?? content?.id}`),
    type: extra.type ?? typeFromContent(content),
    year: extra.year ?? yearFromDate(content?.release_date ?? content?.first_air_date),
    ...extra,
  };
}

function increment(map: Record<string, number>, key?: string | null) {
  if (!key) return;
  map[key] = (map[key] ?? 0) + 1;
}

async function maybeSingle<T>(query: PromiseLike<{ data: T | null; error: any }>): Promise<T | null> {
  const result = await query;
  if (result.error) return null;
  return result.data ?? null;
}

async function maybeList<T>(query: PromiseLike<{ data: T[] | null; error: any }>): Promise<T[]> {
  const result = await query;
  if (result.error) return [];
  return result.data ?? [];
}

async function maybeCount(query: PromiseLike<{ count: number | null; error: any }>): Promise<number> {
  const result = await query;
  if (result.error) return 0;
  return result.count ?? 0;
}

async function getContentByIds(admin: SupabaseClient, ids: string[]) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) return new Map<string, AnyRecord>();

  const rows = await maybeList<AnyRecord>(
    admin
      .from('content')
      .select('id,type,title,poster_path,release_date,tmdb_rating,tmdb_votes,popularity')
      .in('id', uniqueIds)
  );

  return new Map(rows.map((row) => [String(row.id), row]));
}

function summarizeMemory(memoryText?: string | null) {
  if (!memoryText?.trim()) return [];
  return memoryText
    .split(/\n+/)
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 12);
}

function topEntries(map: Record<string, number>, limit = 8) {
  return Object.fromEntries(
    Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
  );
}

export async function buildVaultContext(
  admin: SupabaseClient,
  user: { id: string; email?: string | null; created_at?: string | null },
  conversationHistory: VaultChatMessage[]
): Promise<VaultContext> {
  const [
    profile,
    tasteProfile,
    memory,
    sessions,
    historyRows,
    ratingRows,
    signalRows,
    continueRows,
    calibration,
    totalTitles,
  ] = await Promise.all([
    maybeSingle<AnyRecord>(admin.from('profiles').select('username,created_at,preferences').eq('id', user.id).maybeSingle()),
    maybeSingle<AnyRecord>(admin.from('user_taste_profiles').select('*').eq('user_id', user.id).maybeSingle()),
    maybeSingle<AnyRecord>(admin.from('vault_memory').select('learned_context,updated_at').eq('user_id', user.id).maybeSingle()),
    maybeList<AnyRecord>(
      admin
        .from('vault_sessions')
        .select('title,updated_at,created_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(5)
    ),
    maybeList<AnyRecord>(
      admin
        .from('watch_history')
        .select('content_id,position_seconds,completed,last_watched')
        .eq('user_id', user.id)
        .order('last_watched', { ascending: false })
        .limit(60)
    ),
    maybeList<AnyRecord>(
      admin
        .from('ratings')
        .select('content_id,rating,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(80)
    ),
    maybeList<AnyRecord>(
      admin
        .from('user_signals')
        .select('tmdb_id,signal_type,signal_weight,context,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(80)
    ),
    maybeList<AnyRecord>(
      admin
        .from('continue_watching')
        .select('content_id,position_seconds,last_watched')
        .eq('user_id', user.id)
        .order('last_watched', { ascending: false })
        .limit(10)
    ),
    maybeSingle<AnyRecord>(
      admin
        .from('user_taste_calibrations')
        .select('loved_titles,overrated_titles,abandoned_title,abandoned_reason,standards_summary,updated_at')
        .eq('user_id', user.id)
        .maybeSingle()
    ),
    maybeCount(admin.from('content').select('id', { count: 'exact', head: true })),
  ]);

  const ids = [
    ...historyRows.map((row) => row.content_id),
    ...ratingRows.map((row) => row.content_id),
    ...signalRows.map((row) => row.tmdb_id),
    ...continueRows.map((row) => row.content_id),
  ].map((id) => String(id ?? ''));
  const contentById = await getContentByIds(admin, ids);

  const ratingById = new Map<string, number>();
  for (const row of ratingRows) {
    if (row.content_id) ratingById.set(String(row.content_id), Number(row.rating));
  }

  const recent = historyRows
    .map((row) => {
      const id = String(row.content_id ?? '');
      const ref = contentToRef(contentById.get(id), {
        id,
        completed: Boolean(row.completed),
        completionRate: row.completed ? 1 : null,
        watchedAt: row.last_watched ?? null,
        rating: ratingById.get(id) ?? null,
      });
      return ref;
    })
    .filter(Boolean)
    .slice(0, 20) as VaultContentRef[];

  const rated = ratingRows
    .map((row) => {
      const id = String(row.content_id ?? '');
      return contentToRef(contentById.get(id), { id, rating: Number(row.rating) });
    })
    .filter(Boolean) as VaultContentRef[];

  const calibratedLoved = Array.isArray(calibration?.loved_titles)
    ? calibration.loved_titles
        .map((title: string, index: number) => contentToRef(null, {
          id: `calibration:loved:${index}:${title}`,
          title,
          type: 'unknown',
          signal: 'first_session_loved',
        }))
        .filter(Boolean) as VaultContentRef[]
    : [];
  const calibratedOverrated = Array.isArray(calibration?.overrated_titles)
    ? calibration.overrated_titles
        .map((title: string, index: number) => contentToRef(null, {
          id: `calibration:overrated:${index}:${title}`,
          title,
          type: 'unknown',
          signal: 'first_session_overrated',
        }))
        .filter(Boolean) as VaultContentRef[]
    : [];
  const calibratedAbandoned = calibration?.abandoned_title
    ? contentToRef(null, {
      id: `calibration:abandoned:${calibration.abandoned_title}`,
      title: String(calibration.abandoned_title),
      type: 'unknown',
      signal: calibration.abandoned_reason
        ? `first_session_abandoned: ${calibration.abandoned_reason}`
        : 'first_session_abandoned',
    })
    : null;

  const loved = [...calibratedLoved, ...rated.filter((item) => (item.rating ?? 0) >= 4)].slice(0, 20);
  const dislikedFromRatings = rated.filter((item) => (item.rating ?? 0) <= 2).slice(0, 20);
  const dislikedFromSignals = signalRows
    .filter((row) => Number(row.signal_weight ?? 0) < 0)
    .map((row) => {
      const id = String(row.tmdb_id ?? '');
      return contentToRef(contentById.get(id), { id, signal: row.signal_type });
    })
    .filter(Boolean)
    .slice(0, 20) as VaultContentRef[];

  const topRated = {
    movies: rated.filter((item) => item.type === 'movie').sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 20),
    shows: rated.filter((item) => item.type === 'show').sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 20),
    anime: [] as VaultContentRef[],
  };

  const genreBreakdown: Record<string, number> = { ...EMPTY_BREAKDOWN };
  const countryBreakdown: Record<string, number> = { ...EMPTY_BREAKDOWN };
  const decadeBreakdown: Record<string, number> = { ...EMPTY_BREAKDOWN };

  const genreScores = tasteProfile?.genre_scores ?? {};
  if (genreScores && typeof genreScores === 'object') {
    for (const [genre, score] of Object.entries(genreScores)) {
      genreBreakdown[genre] = Number(score) || 0;
    }
  }

  for (const item of recent) {
    const content = contentById.get(item.id);
    const year = Number(item.year);
    if (year) increment(decadeBreakdown, `${Math.floor(year / 10) * 10}s`);
    const countries = content?.country_of_origin;
    if (Array.isArray(countries)) countries.forEach((country) => increment(countryBreakdown, country));
  }

  const active = continueRows
    .map((row) => {
      const id = String(row.content_id ?? '');
      return contentToRef(contentById.get(id), { id, watchedAt: row.last_watched ?? null });
    })
    .filter(Boolean) as VaultContentRef[];

  const recentlyFinished = recent.find((item) => item.completed) ?? null;
  const almostDone = active.filter((item) => recent.some((seen) => seen.id === item.id && !seen.completed)).slice(0, 5);
  const moviesWatched = recent.filter((item) => item.type === 'movie').length;
  const showsWatched = recent.filter((item) => item.type === 'show').length;
  const dataPoints = Number(tasteProfile?.data_points ?? 0);
  const totalTitlesWatched = new Set(historyRows.map((row) => row.content_id).filter(Boolean)).size || dataPoints;

  const blocked = [
    ...(Array.isArray(tasteProfile?.hard_blocked_genres) ? tasteProfile.hard_blocked_genres : []),
    ...(Array.isArray(tasteProfile?.hard_blocked_themes) ? tasteProfile.hard_blocked_themes : []),
  ].filter(Boolean);

  return {
    user: {
      id: user.id,
      name: displayName(profile, user.email ?? 'friend'),
      memberSince: profile?.created_at ?? user.created_at ?? null,
      totalWatchHours: Math.round(historyRows.reduce((sum, row) => sum + Number(row.position_seconds ?? 0), 0) / 3600),
      totalTitlesWatched,
      profileSummary: tasteProfile?.profile_summary || 'Taste profile is still forming. Use direct questions and observed history heavily.',
      tasteCluster: 'Independent StreamVault taste profile',
    },
    watchHistory: {
      recent,
      topRated,
      genreBreakdown: topEntries(genreBreakdown),
      countryBreakdown: topEntries(countryBreakdown, 5),
      decadeBreakdown: topEntries(decadeBreakdown, 5),
      moviesWatched,
      showsWatched,
      animeWatched: 0,
      isPowerUser: totalTitlesWatched > 200 || rated.length > 50,
    },
    preferences: {
      loved,
      disliked: [...calibratedOverrated, ...(calibratedAbandoned ? [calibratedAbandoned] : []), ...dislikedFromRatings, ...dislikedFromSignals].slice(0, 20),
      neverRecommend: blocked,
      savedPresets: [],
      longTermMemory: [
        ...(calibration?.standards_summary ? [String(calibration.standards_summary)] : []),
        ...summarizeMemory(memory?.learned_context),
      ].slice(0, 12),
    },
    currentlyWatching: {
      active,
      recentlyFinished,
      almostDone,
    },
    session: {
      timeOfDay: timeOfDay(),
      dayOfWeek: dayOfWeek(),
      inferredMood: inferMood(),
      conversationHistory,
      previousSessions: sessions.map((session) => ({
        date: String(session.updated_at ?? session.created_at ?? '').slice(0, 10),
        topic: session.title ?? 'Untitled VAULT session',
        outcome: null,
      })),
    },
    database: {
      canQuery: true,
      totalTitles,
    },
  };
}
