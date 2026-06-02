import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { callDeepSeek, parseJSON, generateEmbedding } from './deepseek';
import { ContentDNA } from './types';

const TMDB_KEY = process.env.TMDB_API_KEY ?? process.env.NEXT_PUBLIC_TMDB_KEY ?? '';

export async function getOrCreateContentDNA(
  tmdbId: string,
  mediaType: 'movie' | 'tv'
): Promise<ContentDNA | null> {
  const supabase = createClient();
  const admin = createAdminClient();

  // 1. Check cache
  const { data: existing } = await supabase
    .from('content_dna')
    .select('*')
    .eq('tmdb_id', tmdbId)
    .single();
  if (existing?.ai_generated) return existing as ContentDNA;

  // 2. Fetch TMDB metadata
  const [detailsRes, kwRes] = await Promise.all([
    fetch(`https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_KEY}&append_to_response=keywords,credits`),
    fetch(`https://api.themoviedb.org/3/${mediaType}/${tmdbId}/keywords?api_key=${TMDB_KEY}`)
  ]);
  const details = await detailsRes.json();
  const kwData  = await kwRes.json();

  const title    = details.title ?? details.name ?? 'Unknown';
  const genres   = (details.genres ?? []).map((g: any) => g.name).join(', ');
  const synopsis = details.overview ?? '';
  const keywords = ((kwData.keywords ?? kwData.results ?? []) as any[]).slice(0, 15).map((k: any) => k.name).join(', ');
  const seasons  = mediaType === 'tv' ? `Seasons: ${details.number_of_seasons ?? '?'}` : '';
  const score    = details.vote_average ?? 0;

  // 3. DeepSeek DNA extraction
  const prompt = `Analyze this ${mediaType === 'tv' ? 'TV show' : 'film'} and extract its narrative DNA.
Return ONLY a valid JSON object — no markdown, no explanation.

Title: ${title}
Genres: ${genres}
Keywords: ${keywords}
Synopsis: ${synopsis}
Rating: ${score}/10
${seasons}

JSON structure (all sub-values are floats 0.0-1.0):
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
  "hook_strength": 0.0,
  "momentum_score": 0.0,
  "divisiveness_score": 0.0,
  "comfort_rewatchability": false,
  "raw_analysis": "2-sentence analysis"
}`;

  let dna: Partial<ContentDNA> = {};
  try {
    const raw = await callDeepSeek(prompt, { max_tokens: 900, temperature: 0.1 });
    dna = parseJSON<Partial<ContentDNA>>(raw) ?? {};
  } catch (e) {
    console.error('DeepSeek DNA failed', e);
    // Store minimal record so we don't retry immediately
    dna = { themes: [], mood_tags: [], comfort_rewatchability: false };
  }

  // 4. Semantic embedding
  const embeddingText = `${title} ${synopsis} ${(dna.themes ?? []).join(' ')} ${(dna.mood_tags ?? []).join(' ')}`;
  const embedding = await generateEmbedding(embeddingText);

  // 5. Upsert to DB
  const row = {
    tmdb_id:                 tmdbId,
    media_type:              mediaType,
    title,
    ...dna,
    embedding:               embedding ? `[${embedding.join(',')}]` : null,
    ai_generated:            true,
    updated_at:              new Date().toISOString(),
  };

  const { data: saved, error } = await admin
    .from('content_dna')
    .upsert(row)
    .select('*')
    .single();

  if (error) console.error('content_dna upsert failed', error);
  return (saved ?? row) as ContentDNA;
}
