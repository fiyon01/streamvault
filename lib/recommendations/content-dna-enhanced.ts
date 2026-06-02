import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { callDeepSeek, parseJSON, generateEmbedding } from './deepseek';
import { enrichContent, syncContentMetadata } from '@/lib/metadata';

export interface EnhancedDNA {
  tmdb_id: string;
  media_type: 'movie' | 'tv';
  title: string;

  // Original 9 dimensions
  narrative_structure: Record<string, number>;
  pacing: Record<string, number>;
  protagonist_type: Record<string, number>;
  moral_complexity: Record<string, number>;
  tone: Record<string, number>;
  world_type: Record<string, number>;
  emotional_core: Record<string, number>;
  stakes_level: Record<string, number>;
  resolution_type: Record<string, number>;

  themes: string[];
  mood_tags: string[];

  // Enhanced metadata (Pillar 1)
  pacing_profile: string;
  complexity_level: string;
  emotional_weight: string;
  narrative_arc: string;
  cultural_specificity: number;
  rewatchability_score: number;
  ending_quality: string;
  quality_trajectory: string;
  hidden_gem_score: number;
  premiere_quality: number;
  finale_quality: number;
  recommended_viewing_order: string;
  target_audience: string;
  series_type: string;

  hook_strength: number;
  momentum_score: number;
  finale_satisfaction?: number;
  divisiveness_score: number;
  critical_consensus?: number;
  audience_consensus?: number;
  comfort_rewatchability: boolean;
  embedding?: number[] | null;
  raw_analysis?: string;
  ai_generated?: boolean;
}

const TMDB_KEY = process.env.TMDB_API_KEY ?? process.env.NEXT_PUBLIC_TMDB_KEY ?? '';

export async function getOrCreateEnhancedDNA(
  tmdbId: string,
  mediaType: 'movie' | 'tv'
): Promise<EnhancedDNA | null> {
  const supabase = createClient();
  const admin = createAdminClient();

  const { data: existing } = await supabase
    .from('content_dna')
    .select('*')
    .eq('tmdb_id', tmdbId)
    .single();
  
  if (existing?.ai_generated && existing?.pacing_profile) return existing as EnhancedDNA;

  // 1. Fetch TMDB details
  const [detailsRes, kwRes] = await Promise.all([
    fetch(`https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_KEY}&append_to_response=keywords,credits,external_ids,release_dates,content_ratings`),
    fetch(`https://api.themoviedb.org/3/${mediaType}/${tmdbId}/keywords?api_key=${TMDB_KEY}`),
  ]);
  const details = await detailsRes.json();
  const kwData = await kwRes.json();

  const title = details.title ?? details.name ?? 'Unknown';

  // 2. Fetch Multi-Source Enrichment (Pillar 1)
  const enrichment = await enrichContent({
    tmdbId,
    mediaType,
    title,
    year: details.release_date ? new Date(details.release_date).getFullYear() : undefined,
    voteAverage: details.vote_average,
    voteCount: details.vote_count,
  });

  // Sync technical metadata to DB
  await syncContentMetadata(enrichment);

  // 3. AI Analysis with Rich Grounding
  const genres = (details.genres ?? []).map((g: any) => g.name).join(', ');
  const synopsis = details.overview ?? '';
  const keywords = ((kwData.keywords ?? kwData.results ?? []) as any[]).slice(0, 15).map((k: any) => k.name).join(', ');
  
  // Extract external signals for the AI
  const extAwards = enrichment.metadata.wikidata?.awards?.length ?? enrichment.metadata.tvdb?.awards?.length ?? 0;
  const extPacing = enrichment.metadata.community?.pacing ?? 0.5;
  const extStatus = enrichment.metadata.tvdb?.status ?? details.status ?? '';
  const isEnded = extStatus === 'Ended' || extStatus === 'Canceled';
  const extEnding = enrichment.metadata.community?.endingQuality ?? (isEnded ? 0.5 : 0);
  const isCult = (enrichment.metadata.letterboxd as any)?.cultStatus > 0.6;
  const isDivisive = (enrichment.metadata.letterboxd as any)?.divisiveness > 0.6;

  const prompt = `Analyze this ${mediaType === 'tv' ? 'TV show' : 'film'} and extract its complete narrative DNA.
Ground your analysis in the provided technical metadata.

Title: ${title}
Genres: ${genres}
Keywords: ${keywords}
Synopsis: ${synopsis}
External Signals: 
- Awards: ${extAwards}
- Community Pacing: ${extPacing > 0.7 ? 'Slow Burn' : extPacing < 0.3 ? 'Fast' : 'Balanced'}
- Cult Status: ${isCult ? 'YES' : 'NO'}
- Divisiveness: ${isDivisive ? 'HIGH' : 'LOW'}

JSON structure (all numeric values are floats 0.0-1.0 unless noted):
{
  "narrative_structure": {"linear":0.0,"nonlinear":0.0,"anthology":0.0,"episodic":0.0,"serialized":0.0},
  "pacing": {"slow_burn":0.0,"moderate":0.0,"fast":0.0,"frenetic":0.0},
  "protagonist_type": {"hero":0.0,"antihero":0.0,"villain_lead":0.0,"ensemble":0.0},
  "moral_complexity": {"black_white":0.0,"grey":0.0,"pitch_black":0.0},
  "tone": {"hopeful":0.0,"cynical":0.0,"darkly_comic":0.0,"tragic":0.0,"redemptive":0.0},
  "world_type": {"real_world":0.0,"heightened":0.0,"full_fantasy":0.0,"scifi":0.0,"historical":0.0},
  "emotional_core": {"found_family":0.0,"revenge":0.0,"survival":0.0,"identity":0.0,"power":0.0,"love":0.0},
  "stakes_level": {"personal":0.0,"community":0.0,"civilizational":0.0},
  "resolution_type": {"satisfying":0.0,"ambiguous":0.0,"tragic":0.0},
  "themes": ["theme1","theme2","theme3","theme4"],
  "mood_tags": ["tag1","tag2","tag3"],

  "pacing_profile": "slow_burn|balanced|relentless",
  "complexity_level": "casual|moderate|demanding",
  "emotional_weight": "heavy|balanced|light",
  "narrative_arc": "episodic|serialized|anthology|hybrid|procedural",
  "cultural_specificity": 0.0,
  "rewatchability_score": 0.0,
  "ending_quality": "satisfying|divisive|unresolved|open|ambiguous",
  "quality_trajectory": "improves|consistent|declines|mixed",
  "hidden_gem_score": 0.0,
  "premiere_quality": 0.0,
  "finale_quality": 0.0,
  "recommended_viewing_order": "release|chronological|skip_filler|any",
  "target_audience": "adults|teens|family|mature|all_ages",
  "series_type": "limited|ongoing|anthology|mini_series",

  "hook_strength": 0.0,
  "momentum_score": 0.0,
  "divisiveness_score": 0.0,
  "comfort_rewatchability": false,
  "raw_analysis": "2-sentence analysis"
}`;

  let dna: Partial<EnhancedDNA> = {};
  try {
    const raw = await callDeepSeek(prompt, { max_tokens: 1200, temperature: 0.1 });
    dna = parseJSON<Partial<EnhancedDNA>>(raw) ?? {};
  } catch {
    dna = { themes: [], mood_tags: [], comfort_rewatchability: false };
  }

  // Update DNA with deterministic external signals if missing
  if (isCult) dna.hidden_gem_score = Math.max(dna.hidden_gem_score || 0, 0.7);
  if (isDivisive) dna.divisiveness_score = Math.max(dna.divisiveness_score || 0, 0.8);

  const embeddingText = `${title} ${synopsis} ${(dna.themes ?? []).join(' ')} ${(dna.mood_tags ?? []).join(' ')}`;
  const embedding = await generateEmbedding(embeddingText);

  const row = {
    tmdb_id: tmdbId,
    media_type: mediaType,
    title,
    ...dna,
    embedding: embedding ? `[${embedding.join(',')}]` : null,
    ai_generated: true,
    updated_at: new Date().toISOString(),
  };

  const { data: saved, error } = await admin
    .from('content_dna')
    .upsert(row)
    .select('*')
    .single();

  if (error) console.error('content_dna upsert failed', error);
  return (saved ?? row) as EnhancedDNA;
}
