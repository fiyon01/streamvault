import { createClient } from '@/lib/supabase/server';
import { UserTasteProfile, UserSignal, DNA_KEY_MAP } from './types';
import { averageContentDNA, applyNegativePenalties } from './utils';
import { callDeepSeek, generateEmbedding } from './deepseek';
import { getExcludedContentIds } from './recommendation-log';

// ── Pillar 5: Expanded Taste DNA ──

interface ExpandedProfile extends UserTasteProfile {
  // Structural
  preferred_episode_length_min: number;
  preferred_episode_length_max: number;
  preferred_season_count_min: number;
  preferred_season_count_max: number;
  serialized_preference: number;
  completed_preference: number;
  // Tonal
  dark_light_position: number;
  cerebral_preference: number;
  emotional_tolerance: number;
  humor_style: string;
  intensity_threshold: number;
  // Origin
  preferred_countries: string[];
  preferred_decades: number[];
  preferred_networks: string[];
  sub_preference: string;
  // Behavior
  abandonment_rate: number;
  avg_episodes_before_abandon: number;
  rewatch_tendency: number;
  total_titles_watched: number;
  is_power_user: boolean;
}

export async function computeExpandedTasteDNA(
  userId: string
): Promise<ExpandedProfile | null> {
  const supabase = createClient();

  const { data: allSignals } = await supabase
    .from('user_signals')
    .select('*, content_dna!inner(*)')
    .eq('user_id', userId)
    .order('signal_weight', { ascending: false });

  if (!allSignals || allSignals.length === 0) return null;

  const positiveSignals = allSignals.filter((s: any) => s.signal_weight >= 3);
  const negativeSignals = allSignals.filter((s: any) => s.signal_weight < 0);
  const abandonSignals = allSignals.filter((s: any) =>
    ['abandoned_early', 'abandoned_mid'].includes(s.signal_type)
  );

  // ── Core DNA average (existing logic) ──
  const avgDNA = positiveSignals.length > 2
    ? averageContentDNA(positiveSignals.map((s: any) => ({
        dna: s.content_dna,
        weight: s.signal_weight,
      })))
    : {};

  const penalizedDNA = applyNegativePenalties(
    avgDNA,
    negativeSignals.filter((s: any) => s.content_dna).map((s: any) => ({
      dna: s.content_dna,
      weight: s.signal_weight,
    }))
  );

  const profileDNA: Record<string, any> = {};
  for (const [contentKey, profileKey] of Object.entries(DNA_KEY_MAP)) {
    profileDNA[profileKey] = penalizedDNA[contentKey] ?? {};
  }

  // ── Genre & theme scores ──
  const genre_scores: Record<string, number> = {};
  const theme_scores: Record<string, number> = {};
  for (const sig of positiveSignals as any[]) {
    if (!sig.content_dna) continue;
    const w = sig.signal_weight;
    for (const theme of (sig.content_dna.themes ?? []) as string[]) {
      theme_scores[theme] = (theme_scores[theme] ?? 0) + w;
    }
  }

  // ── Structural preferences ──
  const runtimes = (positiveSignals as any[])
    .map((s: any) => s.content_dna?.metadata?.runtime ?? 0)
    .filter(Boolean);
  const avgRuntime = runtimes.length > 0
    ? runtimes.reduce((a: number, b: number) => a + b, 0) / runtimes.length
    : 45;

  // ── Behavioral analysis ──
  const totalTitles = allSignals.filter((s: any) => s.signal_weight >= 1).length;
  const abandonCount = abandonSignals.length;
  const abandonmentRate = totalTitles > 0 ? abandonCount / totalTitles : 0;

  // ── Tone preferences ──
  const toneValues = positiveSignals
    .filter((s: any) => s.content_dna?.tone)
    .map((s: any) => {
      const t = s.content_dna.tone as Record<string, number>;
      const hopeful = t.hopeful ?? 0;
      const cynical = t.cynical ?? 0;
      const tragic = t.tragic ?? 0;
      return { dark: (cynical + tragic) / 2, light: hopeful };
    });

  const avgDark = toneValues.length > 0
    ? toneValues.reduce((a: number, b: any) => a + b.dark, 0) / toneValues.length
    : 0.5;

  // ── Excluded content count for power user check ──
  const excluded = await getExcludedContentIds(userId);

  // ── Profile summary ──
  const topTitles = (positiveSignals as any[])
    .slice(0, 5)
    .map((s: any) => s.content_dna?.title ?? 'Unknown')
    .join(', ');

  let profileSummary = '';
  try {
    const summaryPrompt = `Based on a viewer's taste data, write a 2-3 sentence profile.

Top-rated content: ${topTitles}
Pacing: ${JSON.stringify(profileDNA.pacing_preference)}
Tone: ${JSON.stringify(profileDNA.tone_affinity)}
Top themes: ${Object.keys(theme_scores).sort((a, b) => theme_scores[b] - theme_scores[a]).slice(0, 5).join(', ')}

Include specific detail about what they love and why. Start with "You gravitate toward". Max 3 sentences.`;
    profileSummary = await callDeepSeek(summaryPrompt, { max_tokens: 150, temperature: 0.3 });
  } catch {
    profileSummary = `You gravitate toward content that rewards attention and emotional investment.`;
  }

  const embeddingText = `${profileSummary} ${Object.keys(theme_scores).join(' ')}`;
  const embedding = await generateEmbedding(embeddingText);
  const confidence = Math.min(1, positiveSignals.length / 20);

  const upsertData = {
    user_id: userId,
    ...profileDNA,
    genre_scores,
    theme_scores,
    profile_summary: profileSummary,
    embedding: embedding ? `[${embedding.join(',')}]` : null,
    confidence_score: confidence,
    data_points: positiveSignals.length,
    last_computed: new Date().toISOString(),
    updated_at: new Date().toISOString(),

    // Expanded fields
    preferred_episode_length_min: Math.max(20, avgRuntime - 15),
    preferred_episode_length_max: avgRuntime + 20,
    preferred_season_count_min: 1,
    preferred_season_count_max: 10,
    serialized_preference: (profileDNA.narrative_structure?.serialized ?? 0.5),
    completed_preference: 0.5,
    binge_tendency: Math.min(1, totalTitles > 10 ? 0.7 : 0.4),
    dark_light_position: avgDark,
    cerebral_preference: (profileDNA.moral_complexity?.grey ?? 0.5),
    emotional_tolerance: 0.5,
    humor_style: 'mixed',
    intensity_threshold: avgDark,
    preferred_countries: [],
    preferred_decades: [],
    preferred_networks: [],
    sub_preference: 'either',
    language_comfort: ['en'],
    preferred_protagonist: 'ensemble',
    avoided_themes: [],
    preferred_ending_type: 'satisfying',
    pacing_tolerance: (profileDNA.pacing_preference?.slow_burn ?? 0.5),
    abandonment_rate: abandonmentRate,
    avg_episodes_before_abandon: abandonCount > 0 ? 5 : 10,
    slow_start_tolerance: abandonmentRate < 0.2,
    rewatch_tendency: positiveSignals.filter((s: any) => s.signal_type === 'rewatch').length > 2 ? 0.7 : 0.2,
    total_titles_watched: totalTitles,
    coverage_score: Math.min(totalTitles / 3, 100),
    is_power_user: totalTitles > 200 || excluded.watched.size > 150,
    last_coverage_computed: new Date().toISOString(),
  };

  const supabase2 = createClient();
  await supabase2.from('user_taste_profiles').upsert(upsertData);

  return upsertData as unknown as ExpandedProfile;
}
