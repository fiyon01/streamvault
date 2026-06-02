import { createClient } from '@/lib/supabase/server';
import { callDeepSeek, generateEmbedding } from './deepseek';
import { UserTasteProfile, UserSignal, DNA_KEY_MAP } from './types';
import { averageContentDNA, applyNegativePenalties } from './utils';

export async function getUserTasteProfile(userId: string): Promise<UserTasteProfile | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('user_taste_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  return data as UserTasteProfile | null;
}

export async function computeTasteDNA(userId: string): Promise<UserTasteProfile | null> {
  const supabase = createClient();

  // 1. Pull all signals with content_dna
  const { data: allSignals } = await supabase
    .from('user_signals')
    .select('*, content_dna!inner(*)')
    .eq('user_id', userId)
    .order('signal_weight', { ascending: false });

  if (!allSignals || allSignals.length === 0) return null;

  const positiveSignals = allSignals.filter((s: any) => s.signal_weight >= 3.0);
  const negativeSignals = allSignals.filter((s: any) => s.signal_weight < 0);

  if (positiveSignals.length < 3) return buildColdStartProfile(userId);

  // 2. Weighted-average all positive content DNA
  const avgDNA = averageContentDNA(
    positiveSignals.map((s: any) => ({
      dna: s.content_dna,
      weight: s.signal_weight
    }))
  );

  // 3. Apply negative penalties
  const penalizedDNA = applyNegativePenalties(
    avgDNA,
    negativeSignals
      .filter((s: any) => s.content_dna)
      .map((s: any) => ({ dna: s.content_dna, weight: s.signal_weight }))
  );

  // 4. Map content_dna keys → user_taste_profile keys
  const profileDNA: Record<string, any> = {};
  for (const [contentKey, profileKey] of Object.entries(DNA_KEY_MAP)) {
    profileDNA[profileKey] = penalizedDNA[contentKey] ?? {};
  }

  // 5. Compute genre & theme scores from positive signals
  const genre_scores: Record<string, number> = {};
  const theme_scores: Record<string, number> = {};
  for (const sig of positiveSignals as any[]) {
    if (!sig.content_dna) continue;
    const w = sig.signal_weight;
    // Aggregate themes
    for (const theme of (sig.content_dna.themes ?? []) as string[]) {
      theme_scores[theme] = (theme_scores[theme] ?? 0) + w;
    }
  }

  // 6. DeepSeek profile summary
  const topTitles = (positiveSignals as any[])
    .slice(0, 5)
    .map((s: any) => s.content_dna?.title ?? 'Unknown')
    .join(', ');

  let profile_summary = '';
  try {
    const summaryPrompt = `Based on a viewer's taste data, write a 2-3 sentence profile that captures exactly what kind of viewer they are.

Top-rated content: ${topTitles}
Pacing preference: ${JSON.stringify(profileDNA.pacing_preference)}
Protagonist affinity: ${JSON.stringify(profileDNA.protagonist_affinity)}
Moral complexity: ${JSON.stringify(profileDNA.moral_complexity)}
Emotional core: ${JSON.stringify(profileDNA.emotional_core_affinity)}
Top themes: ${Object.keys(theme_scores).sort((a,b) => theme_scores[b] - theme_scores[a]).slice(0,5).join(', ')}

Start with "You gravitate toward". Be specific and honest. Max 3 sentences. Plain text only.`;
    profile_summary = await callDeepSeek(summaryPrompt, { max_tokens: 150, temperature: 0.3 });
  } catch (e) {
    profile_summary = `You gravitate toward content that matches your ${Object.keys(theme_scores)[0] ?? 'unique'} interests.`;
  }

  // 7. Generate embedding from summary + top themes
  const embeddingText = `${profile_summary} ${Object.keys(theme_scores).join(' ')}`;
  const embedding = await generateEmbedding(embeddingText);

  const confidence = Math.min(1, positiveSignals.length / 20);

  const upsertData = {
    user_id: userId,
    ...profileDNA,
    genre_scores,
    theme_scores,
    profile_summary,
    embedding: embedding ? `[${embedding.join(',')}]` : null,
    confidence_score: confidence,
    data_points: positiveSignals.length,
    last_computed: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const supabase2 = createClient();
  await supabase2.from('user_taste_profiles').upsert(upsertData);

  return upsertData as unknown as UserTasteProfile;
}

async function buildColdStartProfile(userId: string): Promise<null> {
  // Not enough data yet — handled by cold start recommendations
  return null;
}
