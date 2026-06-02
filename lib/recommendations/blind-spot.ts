import { createClient } from '@/lib/supabase/server';

export interface CoverageEntry {
  dimension: string;
  label: string;
  covered: number;
  totalAvailable: number;
  coveragePct: number;
  tasteAffinity: number;
}

export interface BlindSpot {
  dimension: string;
  label: string;
  coveragePct: number;
  tasteAffinity: number;
  relevanceScore: number;
  sampleTitles: string[];
  reason: string;
}

type MetadataRow = {
  content_id: string;
  country_of_origin?: string[] | null;
  decade?: number | null;
  network?: string | null;
  themes?: string[] | null;
  moods?: string[] | null;
};

type ProfileHints = {
  preferredCountries: Set<string>;
  preferredDecades: Set<number>;
  preferredNetworks: Set<string>;
  themeScores: Record<string, number>;
};

function addCount(map: Record<string, number>, key?: string | number | null) {
  if (key === undefined || key === null || key === '') return;
  const normalized = String(key);
  map[normalized] = (map[normalized] ?? 0) + 1;
}

function addArrayCounts(map: Record<string, number>, values?: string[] | null) {
  for (const value of values ?? []) addCount(map, value);
}

function topScore(scores: Record<string, number>) {
  return Math.max(1, ...Object.values(scores).map((value) => Number(value) || 0));
}

function tasteAffinityFor(dimension: string, label: string, covered: number, profile: ProfileHints) {
  if (dimension === 'country' && profile.preferredCountries.has(label)) return 0.9;
  if (dimension === 'decade' && profile.preferredDecades.has(parseInt(label))) return 0.85;
  if (dimension === 'network' && profile.preferredNetworks.has(label)) return 0.82;
  if (dimension === 'theme' && profile.themeScores[label]) {
    return Math.min(0.95, 0.55 + (profile.themeScores[label] / topScore(profile.themeScores)) * 0.4);
  }
  if (covered > 0) return 0.65;
  return 0.5;
}

function buildEntriesForDimension(
  dimension: string,
  watchedCounts: Record<string, number>,
  catalogueCounts: Record<string, number>,
  profile: ProfileHints
) {
  return Object.entries(catalogueCounts)
    .filter(([, totalAvailable]) => totalAvailable >= 2)
    .map(([label, totalAvailable]) => {
      const covered = watchedCounts[label] ?? 0;
      return {
        dimension,
        label,
        covered,
        totalAvailable,
        coveragePct: Math.round((covered / totalAvailable) * 10000) / 100,
        tasteAffinity: tasteAffinityFor(dimension, label, covered, profile),
      };
    });
}

export async function computeCoverage(userId: string): Promise<CoverageEntry[]> {
  const supabase = createClient();

  const [signalsRes, historyRes, profileRes, catalogueRes] = await Promise.all([
    supabase
      .from('user_signals')
      .select('tmdb_id, signal_weight, signal_type')
      .eq('user_id', userId),
    supabase
      .from('watch_history')
      .select('content_id, completed, position_seconds')
      .eq('user_id', userId),
    supabase
      .from('user_taste_profiles')
      .select('preferred_countries, preferred_decades, preferred_networks, theme_scores')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('content_metadata')
      .select('content_id, country_of_origin, decade, network, themes, moods')
      .limit(5000),
  ]);

  const watchedIds = new Set<string>();

  for (const signal of signalsRes.data ?? []) {
    const row = signal as any;
    if (row.tmdb_id && Number(row.signal_weight ?? 0) >= 1) watchedIds.add(String(row.tmdb_id));
  }

  for (const row of historyRes.data ?? []) {
    const history = row as any;
    if (history.content_id && (history.completed || Number(history.position_seconds ?? 0) > 0)) {
      watchedIds.add(String(history.content_id));
    }
  }

  if (watchedIds.size === 0) return [];

  const profileRaw = (profileRes.data ?? {}) as any;
  const profile: ProfileHints = {
    preferredCountries: new Set(profileRaw.preferred_countries ?? []),
    preferredDecades: new Set((profileRaw.preferred_decades ?? []).map((value: number | string) => Number(value))),
    preferredNetworks: new Set(profileRaw.preferred_networks ?? []),
    themeScores: profileRaw.theme_scores ?? {},
  };

  const catalogue = (catalogueRes.data ?? []) as MetadataRow[];
  const watchedRows = catalogue.filter((row) => watchedIds.has(String(row.content_id)));

  const watchedCountry: Record<string, number> = {};
  const allCountry: Record<string, number> = {};
  const watchedDecade: Record<string, number> = {};
  const allDecade: Record<string, number> = {};
  const watchedNetwork: Record<string, number> = {};
  const allNetwork: Record<string, number> = {};
  const watchedTheme: Record<string, number> = {};
  const allTheme: Record<string, number> = {};
  const watchedMood: Record<string, number> = {};
  const allMood: Record<string, number> = {};

  for (const row of catalogue) {
    addArrayCounts(allCountry, row.country_of_origin);
    addCount(allDecade, row.decade);
    addCount(allNetwork, row.network);
    addArrayCounts(allTheme, row.themes);
    addArrayCounts(allMood, row.moods);
  }

  for (const row of watchedRows) {
    addArrayCounts(watchedCountry, row.country_of_origin);
    addCount(watchedDecade, row.decade);
    addCount(watchedNetwork, row.network);
    addArrayCounts(watchedTheme, row.themes);
    addArrayCounts(watchedMood, row.moods);
  }

  const entries: CoverageEntry[] = [
    ...buildEntriesForDimension('country', watchedCountry, allCountry, profile),
    ...buildEntriesForDimension('decade', watchedDecade, allDecade, profile),
    ...buildEntriesForDimension('network', watchedNetwork, allNetwork, profile),
    ...buildEntriesForDimension('theme', watchedTheme, allTheme, profile),
    ...buildEntriesForDimension('mood', watchedMood, allMood, profile),
  ].sort((a, b) => b.tasteAffinity - a.tasteAffinity || a.coveragePct - b.coveragePct);

  for (const entry of entries) {
    await supabase.from('user_coverage').upsert({
      user_id: userId,
      dimension: entry.dimension,
      label: entry.label,
      covered: entry.covered,
      total_available: entry.totalAvailable,
      coverage_pct: entry.coveragePct,
      taste_affinity: entry.tasteAffinity,
      last_updated: new Date().toISOString(),
    }, { onConflict: 'user_id,dimension,label' });
  }

  const overallCoverage = entries.length
    ? entries.reduce((sum, entry) => sum + entry.coveragePct, 0) / entries.length
    : 0;

  await supabase
    .from('user_taste_profiles')
    .update({
      coverage_score: Math.round(overallCoverage * 100) / 100,
      total_titles_watched: watchedIds.size,
      is_power_user: watchedIds.size > 200 || overallCoverage > 65,
      last_coverage_computed: new Date().toISOString(),
    })
    .eq('user_id', userId);

  return entries;
}

export async function getBlindSpots(userId: string, limit = 10): Promise<BlindSpot[]> {
  const supabase = createClient();

  let { data: coverage } = await supabase
    .from('user_coverage')
    .select('*')
    .eq('user_id', userId)
    .order('coverage_pct', { ascending: true })
    .limit(80);

  if (!coverage || coverage.length === 0) {
    await computeCoverage(userId);
    const refreshed = await supabase
      .from('user_coverage')
      .select('*')
      .eq('user_id', userId)
      .order('coverage_pct', { ascending: true })
      .limit(80);
    coverage = refreshed.data ?? [];
  }

  if (!coverage.length) return [];

  const blindSpots: BlindSpot[] = [];
  const usedCategories = new Set<string>();

  for (const row of coverage) {
    const key = `${row.dimension}:${row.label}`;
    if (usedCategories.has(key)) continue;
    usedCategories.add(key);
    if (Number(row.coverage_pct ?? 0) >= 80) continue;

    const coveragePct = Number(row.coverage_pct ?? 0);
    const tasteAffinity = Number(row.taste_affinity ?? 0.5);
    const relevanceScore = (1 - coveragePct / 100) * tasteAffinity;
    if (relevanceScore < 0.15) continue;

    const sampleTitles = await getBlindSpotSamples(userId, row.dimension, row.label, 3);

    blindSpots.push({
      dimension: row.dimension,
      label: row.label,
      coveragePct,
      tasteAffinity,
      relevanceScore,
      sampleTitles,
      reason: buildBlindSpotReason(row.dimension, row.label, coveragePct, tasteAffinity),
    });
  }

  return blindSpots
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);
}

export async function getCoverageSummary(userId: string): Promise<string> {
  const supabase = createClient();

  let { data: coverage } = await supabase
    .from('user_coverage')
    .select('*')
    .eq('user_id', userId)
    .order('coverage_pct', { ascending: false });

  if (!coverage || coverage.length === 0) {
    await computeCoverage(userId);
    const refreshed = await supabase
      .from('user_coverage')
      .select('*')
      .eq('user_id', userId)
      .order('coverage_pct', { ascending: false });
    coverage = refreshed.data ?? [];
  }

  if (!coverage.length) return 'No coverage data yet. Start watching to build your map.';

  const strongest = [...coverage].sort((a, b) => Number(b.coverage_pct ?? 0) - Number(a.coverage_pct ?? 0))[0];
  const bigGaps = coverage
    .filter((row) => Number(row.coverage_pct ?? 0) < 30 && Number(row.taste_affinity ?? 0.5) >= 0.55)
    .sort((a, b) => Number(b.taste_affinity ?? 0.5) - Number(a.taste_affinity ?? 0.5))
    .slice(0, 3);

  let summary = `Your coverage map currently spans ${coverage.length} categories. `;

  if (strongest && Number(strongest.coverage_pct ?? 0) > 60) {
    summary += `Your strongest category is ${strongest.label} (${strongest.coverage_pct}%). Your next discovery is probably outside that lane. `;
  }

  if (bigGaps.length > 0) {
    summary += `Blind spots worth exploring: `;
    summary += bigGaps
      .map((gap) => `${gap.label} (${gap.coverage_pct}% watched, ${Math.round(Number(gap.taste_affinity ?? 0.5) * 100)}% taste match)`)
      .join(', ');
    summary += '.';
  }

  return summary;
}

async function getBlindSpotSamples(userId: string, dimension: string, label: string, limit = 3): Promise<string[]> {
  const supabase = createClient();

  try {
    if (dimension === 'country') {
      const { data } = await supabase
        .from('content_metadata')
        .select('content_id, content:content_id(title)')
        .contains('country_of_origin', [label])
        .limit(limit);
      return extractTitles(data);
    }

    if (dimension === 'decade') {
      const { data } = await supabase
        .from('content_metadata')
        .select('content_id, content:content_id(title)')
        .eq('decade', parseInt(label))
        .limit(limit);
      return extractTitles(data);
    }

    if (dimension === 'network') {
      const { data } = await supabase
        .from('content_metadata')
        .select('content_id, content:content_id(title)')
        .eq('network', label)
        .limit(limit);
      return extractTitles(data);
    }

    if (dimension === 'theme' || dimension === 'mood') {
      const column = dimension === 'theme' ? 'themes' : 'moods';
      const { data } = await supabase
        .from('content_metadata')
        .select('content_id, content:content_id(title)')
        .contains(column, [label])
        .limit(limit);
      return extractTitles(data);
    }
  } catch {}

  return [];
}

function extractTitles(data: any[] | null) {
  return (data ?? [])
    .map((row: any) => {
      const content = Array.isArray(row.content) ? row.content[0] : row.content;
      return content?.title;
    })
    .filter(Boolean);
}

function buildBlindSpotReason(dimension: string, label: string, coveragePct: number, tasteAffinity: number): string {
  const pctWord = coveragePct < 15 ? 'barely' : coveragePct < 30 ? 'only' : 'partially';
  const strongMatch = tasteAffinity > 0.7
    ? `maps ${Math.round(tasteAffinity * 100)}% to what you already love`
    : 'aligns with your taste profile';

  if (dimension === 'country') return `You have seen ${pctWord} ${coveragePct}% of ${label} content that ${strongMatch}.`;
  if (dimension === 'decade') return `You have seen ${pctWord} ${coveragePct}% of ${label}s titles that ${strongMatch}.`;
  if (dimension === 'network') return `You have seen ${pctWord} ${coveragePct}% of ${label} titles that ${strongMatch}.`;
  if (dimension === 'theme') return `The theme "${label}" is underexplored for you (${coveragePct}% watched) and ${strongMatch}.`;
  if (dimension === 'mood') return `The mood lane "${label}" is underexplored for you (${coveragePct}% watched) and ${strongMatch}.`;
  return `${label} (${coveragePct}% watched) - ${strongMatch}.`;
}
