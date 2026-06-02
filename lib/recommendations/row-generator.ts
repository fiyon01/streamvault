import { createClient } from '@/lib/supabase/server';
import { HomeRow, MoodContext } from './types';
import { getUserTasteProfile, computeTasteDNA } from './taste-dna';
import { computeExpandedTasteDNA } from './taste-dna-enhanced';
import { buildMoodContext, getMoodWeights } from './mood-engine';
import { getSocialProofRecommendations } from './social-engine';
import { getHiddenGems } from './freshness-engine';
import { rankCandidates } from './ranker';
import { retrieveCandidates, generatePowerUserSummary, detectPowerUser } from './power-user';
import { getBlindSpots } from './blind-spot';
import { applyDeterministicFilter, getExcludedContentIds } from './recommendation-log';
import { tmdb } from '@/lib/tmdb/api';

// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL WEIGHTS — used by signal route and anti-engine
// ─────────────────────────────────────────────────────────────────────────────
export const SIGNAL_WEIGHTS: Record<string, number> = {
  rewatch:                   10,
  completed_loved:            8,
  completed_rated:            6,
  completed_silent:           3,
  watched_70pct:              2,
  watched_40pct:              1,
  thumbs_up:                  5,
  added_watchlist:            1,
  removed_watchlist:         -1,
  abandoned_mid:             -2,
  abandoned_early:           -4,
  thumbs_down:               -4,
  not_for_me:                -6,
  hide_forever:             -10,
  one_shot_watched:           5,
  one_shot_skipped:          -1.5,
  one_shot_skipped_fast:     -3,
};

// ─────────────────────────────────────────────────────────────────────────────
// ROW GENERATOR — main entry point
// ─────────────────────────────────────────────────────────────────────────────
export async function generateHomeRows(
  userId: string,
  moodQuery?: string
): Promise<HomeRow[]> {
  const supabase = createClient();
  const rows: HomeRow[] = [];

  // Build mood context
  const mood    = buildMoodContext(moodQuery);
  const weights = getMoodWeights(mood);

  // Get or build taste profile
  let profile = await getUserTasteProfile(userId);

  if (!profile || profile.confidence_score < 0.1) {
    const built = await computeTasteDNA(userId);
    if (built) profile = built;
  }

  // Try expanded taste DNA for richer profile data
  if (profile && profile.confidence_score >= 0.3 && !(profile as any).serialized_preference) {
    try {
      const enhanced = await computeExpandedTasteDNA(userId);
      if (enhanced) profile = enhanced as any;
    } catch {
      // Fall back to standard profile
    }
  }

  const hasProfile = profile && profile.confidence_score >= 0.1;

  // Detect power user mode
  const powerUserStatus = hasProfile ? await detectPowerUser(userId) : { isPowerUser: false, triggers: [], totalWatched: 0, coverageScore: 0 };
  const isPowerUser = powerUserStatus.isPowerUser;
  let powerUserSummary = '';

  // For power users, run VAULT retrieval and use blind spots
  if (isPowerUser && hasProfile) {
    try {
      const vaultResult = await retrieveCandidates(userId, profile!, mood, weights, 20);
      powerUserSummary = generatePowerUserSummary(vaultResult, profile!);

      if (vaultResult.candidates.length >= 4) {
        rows.push({
          label: powerUserStatus.totalWatched > 200
            ? `You have seen ${powerUserStatus.totalWatched} titles. Here is what you missed.`
            : 'VAULT — Beyond the Obvious 300',
          sublabel: powerUserSummary,
          type: 'vault_power_user',
          items: vaultResult.candidates.slice(0, 12),
        });
      }

      // Blind spot row
      if (vaultResult.blindSpots.length > 0) {
        const topSpot = vaultResult.blindSpots[0];
        rows.push({
          label: `Your Blind Spot: ${topSpot.label}`,
          sublabel: `${topSpot.reason} Explore these titles.`,
          type: 'blind_spot',
          items: vaultResult.candidates.slice(0, 8),
        });
      }
    } catch (e) {
      console.warn('[rec] vault retrieval failed', e);
    }
  }

  // ── ROW 1: Taste DNA picks (if profile exists) ────────────────────────────
  if (hasProfile) {
    try {
      const { data: dnaPicks } = await supabase.rpc('get_taste_dna_recommendations', {
        p_user_id: userId,
        p_limit: 30,
      });

      if (dnaPicks && dnaPicks.length > 0) {
        const enriched = await enrichWithTMDB(dnaPicks);
        const ranked   = await rankCandidates(enriched, profile!, mood, weights, userId, 12);

        if (ranked.length > 0) {
          rows.push({
            label:    'Matched to how you watch, not just what you watch',
            sublabel: profile!.profile_summary,
            type:     'taste_dna',
            items:    ranked,
          });
        }
      }
    } catch (e) {
      // RPC might not be set up yet — skip this row gracefully
      console.warn('[rec] get_taste_dna_recommendations RPC not available, skipping');
    }
  }

  // ── ROW 2: Mood-specific (always shown, uses TMDB) ───────────────────────
  const moodLabel = mood.explicitMood
    ? `"${mood.explicitMood}" — AI picked these`
    : `Perfect for ${mood.timeOfDay.replace('_', ' ')} ${mood.dayType}`;

  try {
    const moodData = await fetchMoodContent(mood);
    const visibleMoodData = await filterAlreadyHandled(userId, moodData);
    const moodItems = hasProfile
      ? await rankCandidates(visibleMoodData, profile!, mood, weights, userId, 12)
      : visibleMoodData.slice(0, 12).map((item) => ({
          ...item,
          finalScore: 0.62,
          confidence: mood.moodConfidence,
          signals: ['mood_context'],
          explanation: explainMoodPick(mood),
        }));

    if (moodItems.length > 0) {
      rows.push({
        label: moodLabel,
        sublabel: hasProfile
          ? `${explainMoodPick(mood)} Re-ranked against your taste and hidden/rejected history.`
          : explainMoodPick(mood),
        type:  'mood',
        items: moodItems,
      });
    }
  } catch (e) {
    console.warn('[rec] mood row failed', e);
  }

  // ── ROW 3: Trending Today (TMDB, always works) ───────────────────────────
  try {
    const trending = await tmdb.getTrending('all', 'day');
    const trendItems = normalizeTMDB(trending?.results?.slice(0, 20) ?? []);
    if (trendItems.length > 0) {
      rows.push({
        label: '🔥 Trending Today — What Everyone\'s Watching',
        type:  'trending',
        items: trendItems,
      });
    }
  } catch (e) {
    console.warn('[rec] trending row failed', e);
  }

  // ── ROW 4: Social proof (if profile exists) ───────────────────────────────
  if (hasProfile) {
    try {
      const social = await getSocialProofRecommendations(userId, 10);
      if (social.length > 0) {
        rows.push({
          label: 'Viewers with your exact taste profile are loving these',
          type:  'social_proof',
          items: social,
        });
      }
    } catch (e) {
      console.warn('[rec] social row failed', e);
    }
  }

  // ── ROW 5: Top Rated All-Time (TMDB, always works) ───────────────────────
  try {
    const topMovies = await tmdb.discoverMovies({
      sort_by: 'vote_average.desc',
      'vote_count.gte': '10000',
      'vote_average.gte': '8',
    });
    const topItems = normalizeTMDB(topMovies?.results?.slice(0, 20) ?? [], 'movie');
    if (topItems.length > 0) {
      rows.push({
        label: '🌟 Cinematic Masterpieces — Top Rated All-Time',
        type:  'quality',
        items: topItems,
      });
    }
  } catch (e) {
    console.warn('[rec] top rated row failed', e);
  }

  // ── ROW 6: Hidden gems ────────────────────────────────────────────────────
  try {
    const gems = await getHiddenGems(userId, 12);
    if (gems.length > 0) {
      rows.push({
        label: '💎 Hidden Gems — Highly Rated, Rarely Discovered',
        type:  'hidden_gem',
        items: gems.map((g: any) => ({
          ...g,
          finalScore: 0.6,
          confidence: 0.5,
          signals: ['hidden_gem'],
          explanation: '',
        })),
      });
    }
  } catch (e) {
    console.warn('[rec] hidden gem row failed', e);
  }

  // ── ROW 7: Critically acclaimed TV (always works) ─────────────────────────
  try {
    const topTv = await tmdb.discoverTv({
      sort_by: 'vote_average.desc',
      'vote_count.gte': '5000',
      'vote_average.gte': '8',
    });
    const tvItems = normalizeTMDB(topTv?.results?.slice(0, 20) ?? [], 'tv');
    if (tvItems.length > 0) {
      rows.push({
        label: '📺 Prestige TV — The Best Shows Ever Made',
        type:  'quality_tv',
        items: tvItems,
      });
    }
  } catch (e) {
    console.warn('[rec] top tv row failed', e);
  }

  // ── ROW 8: Cold start guide (if no profile) ───────────────────────────────
  if (!hasProfile && rows.length < 4) {
    try {
      const coldStart = await getColdStartRecommendations();
      if (coldStart.length > 0) {
        rows.push({
          label: '⭐ Universally Loved — Rate these to personalize your feed',
          sublabel: 'Watch and rate a few titles so VAULT can learn your taste',
          type: 'cold_start',
          items: coldStart,
        });
      }
    } catch (e) {
      console.warn('[rec] cold start row failed', e);
    }
  }

  return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function normalizeTMDB(items: any[], forceType?: 'movie' | 'tv') {
  return items.map(item => ({
    tmdb_id:    String(item.id),
    media_type: forceType ?? (item.media_type === 'tv' ? 'tv' : 'movie'),
    title:      item.title ?? item.name ?? 'Unknown',
    poster_path: item.poster_path,
    imdb_score: item.vote_average,
    finalScore:  0.7,
    confidence:  0.6,
    signals:     [],
    explanation: '',
  }));
}

async function filterAlreadyHandled(userId: string, candidates: any[]): Promise<any[]> {
  try {
    const excluded = await getExcludedContentIds(userId);
    return applyDeterministicFilter(candidates, excluded);
  } catch {
    return candidates;
  }
}

function explainMoodPick(mood: MoodContext) {
  if (mood.explicitMood) {
    return `Selected for the mood you gave VAULT: ${mood.explicitMood}.`;
  }
  if (mood.timeOfDay === 'late_night') {
    return mood.dayType === 'weekday'
      ? 'Late weekday logic favors gripping, lower-friction picks that do not require a huge new commitment.'
      : 'Late weekend logic allows darker, more addictive picks because the next morning is less fragile.';
  }
  if (mood.timeOfDay === 'morning') return 'Morning logic favors lighter, cleaner starts.';
  if (mood.timeOfDay === 'evening') return 'Evening logic balances quality, momentum, and watchability.';
  return 'Picked from current context and broad satisfaction signals.';
}

async function fetchMoodContent(mood: MoodContext): Promise<any[]> {
  const isLateNight = mood.timeOfDay === 'late_night';
  const isWeekend   = mood.dayType   === 'weekend';

  const params: Record<string, string> = {
    sort_by: 'popularity.desc',
    'vote_average.gte': '7',
    'vote_count.gte': '1000',
  };

  // Late night: thrillers + crime
  if (isLateNight) {
    params.with_genres = '53,80';
    const [movies, shows] = await Promise.all([
      tmdb.discoverMovies(params),
      tmdb.discoverTv({
        sort_by: isWeekend ? 'popularity.desc' : 'vote_average.desc',
        'vote_average.gte': '7',
        'vote_count.gte': '800',
        with_genres: '80,9648',
      }),
    ]);
    return interleave(
      normalizeTMDB(movies?.results?.slice(0, 10) ?? [], 'movie'),
      normalizeTMDB(shows?.results?.slice(0, 10) ?? [], 'tv')
    ).slice(0, 16);
  }

  // Weekend morning: feel-good
  if (isWeekend && mood.timeOfDay === 'morning') {
    params.with_genres = '35,10751';
    const d = await tmdb.discoverMovies(params);
    return normalizeTMDB(d?.results?.slice(0, 12) ?? [], 'movie');
  }

  // Default: trending all
  const d = await tmdb.getTrending('all', 'week');
  return normalizeTMDB(d?.results?.slice(0, 12) ?? []);
}

function interleave<T>(left: T[], right: T[]) {
  const mixed: T[] = [];
  const maxLen = Math.max(left.length, right.length);
  for (let i = 0; i < maxLen; i++) {
    if (left[i]) mixed.push(left[i]);
    if (right[i]) mixed.push(right[i]);
  }
  return mixed;
}

async function getColdStartRecommendations(): Promise<any[]> {
  const [movies, shows] = await Promise.all([
    tmdb.discoverMovies({
      sort_by: 'vote_average.desc',
      'vote_count.gte': '50000',
      'vote_average.gte': '8',
    }),
    tmdb.discoverTv({
      sort_by: 'vote_average.desc',
      'vote_count.gte': '10000',
      'vote_average.gte': '8',
    }),
  ]);

  const movieItems = normalizeTMDB(movies?.results?.slice(0, 10) ?? [], 'movie');
  const tvItems    = normalizeTMDB(shows?.results?.slice(0, 10) ?? [], 'tv');

  // Interleave movies and shows
  const mixed: any[] = [];
  const maxLen = Math.max(movieItems.length, tvItems.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < movieItems.length) mixed.push(movieItems[i]);
    if (i < tvItems.length)    mixed.push(tvItems[i]);
  }
  return mixed.slice(0, 20);
}

async function enrichWithTMDB(items: any[]): Promise<any[]> {
  const TMDB_KEY = process.env.TMDB_API_KEY ?? process.env.NEXT_PUBLIC_TMDB_KEY ?? '';
  return Promise.all(
    items.map(async item => {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/${item.media_type ?? 'movie'}/${item.tmdb_id}?api_key=${TMDB_KEY}`
        );
        if (!res.ok) return item;
        const d = await res.json();
        return {
          ...item,
          poster_path: d.poster_path ?? item.poster_path,
          imdb_score:  d.vote_average ?? item.imdb_score,
          title:       d.title ?? d.name ?? item.title,
        };
      } catch {
        return item;
      }
    })
  );
}
