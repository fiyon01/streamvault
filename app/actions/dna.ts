'use server';

import { tmdb } from '@/lib/tmdb/api';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { callDeepSeek } from '@/lib/recommendations/deepseek';

export async function extractAndSaveContentDNA(tmdbId: string, mediaType: 'movie' | 'tv') {
  const supabase = createClient();
  const admin = createAdminClient();

  // 1. Check if DNA already exists
  const { data: existingDNA, error: fetchError } = await supabase
    .from('content_dna')
    .select('*')
    .eq('tmdb_id', tmdbId)
    .single();

  if (existingDNA) {
    return existingDNA;
  }

  // 2. Fetch comprehensive data from TMDB for analysis
  // Note: For best results, we need keywords and credits too.
  const details = await tmdb.getDetails(mediaType, tmdbId);
  const title = details.title || details.name;
  
  // Get keywords
  let keywordsStr = '';
  try {
    const kwRes = await fetch(`https://api.themoviedb.org/3/${mediaType}/${tmdbId}/keywords?api_key=${process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_KEY}`);
    const kwData = await kwRes.json();
    const kwList = (kwData.keywords || kwData.results || []).map((k: any) => k.name).slice(0, 10).join(', ');
    keywordsStr = kwList ? `Keywords: ${kwList}` : '';
  } catch (e) {
    console.error('Failed to fetch keywords', e);
  }

  const prompt = `You are an elite narrative analyst. Analyze this piece of media and score it strictly on the following 9 orthogonal dimensions. 
Score each dimension as a float from 0.0 to 1.0 based on the descriptions.

TITLE: ${title}
SYNOPSIS: ${details.overview}
GENRES: ${details.genres?.map((g:any)=>g.name).join(', ')}
${keywordsStr}

THE 9 DIMENSIONS:
1. Pacing: 0.0 (Slow Burn, deliberate) to 1.0 (Kinetic, relentless forward motion)
2. Morality: 0.0 (Absolute, clear heroes/villains) to 1.0 (Ambiguous, everyone compromised)
3. Tone: 0.0 (Hopeful, optimistic, warm) to 1.0 (Bleak, unrelenting darkness)
4. Reality: 0.0 (Grounded, realistic rules) to 1.0 (Fantastical, completely constructed/magic world)
5. Focus: 0.0 (Character-driven, plot secondary) to 1.0 (Plot-driven, characters serve the story engine)
6. Stakes: 0.0 (Intimate, personal/relationship) to 1.0 (Epic, civilizational/cosmic)
7. Structure: 0.0 (Episodic, self-contained) to 1.0 (Serial, heavily serialized)
8. Texture: 0.0 (Sparse, minimalist, quiet) to 1.0 (Dense, overwhelming detail, layered)
9. Resolution: 0.0 (Cathartic, clean closure) to 1.0 (Ambiguous, deliberately unresolved)

Also determine Comfort Rewatchability (true or false): Is this something people would put on in the background as a familiar comfort watch?

Provide a brief 2-sentence analysis explaining the scoring.

YOU MUST RESPOND ONLY WITH A STRICT JSON OBJECT. NO MARKDOWN, NO OTHER TEXT.
Format exactly like this:
{
  "vector": [pacing, morality, tone, reality, focus, stakes, structure, texture, resolution],
  "comfort_rewatchability": boolean,
  "analysis": "string"
}`;

  let generatedText = await callDeepSeek([{ role: 'user', content: prompt }], { max_tokens: 700, temperature: 0.1 });
  
  // Clean up potential markdown formatting from DeepSeek
  generatedText = generatedText.replace(/```json/g, '').replace(/```/g, '').trim();
  
  let parsedDNA;
  try {
    // Sometimes DeepSeek includes thinking blocks <think>...</think>, we should strip those
    generatedText = generatedText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    
    // Find the first { and last } to extract JSON
    const startIdx = generatedText.indexOf('{');
    const endIdx = generatedText.lastIndexOf('}');
    if (startIdx >= 0 && endIdx >= 0) {
      const jsonStr = generatedText.substring(startIdx, endIdx + 1);
      parsedDNA = JSON.parse(jsonStr);
    } else {
      throw new Error("No JSON found in response");
    }
  } catch (e) {
    console.error("Failed to parse DeepSeek response:", generatedText);
    throw new Error("Failed to parse DNA from AI");
  }

  // 4. Save to Database
  // Format the pgvector string: '[0.1, 0.5, 0.8, ...]'
  const vectorStr = `[${parsedDNA.vector.join(',')}]`;

  const { data: insertedData, error: insertError } = await admin
    .from('content_dna')
    .insert({
      tmdb_id: tmdbId.toString(),
      media_type: mediaType,
      title: title,
      dna_vector: vectorStr,
      comfort_rewatchability: parsedDNA.comfort_rewatchability || false,
      raw_analysis: parsedDNA.analysis || ''
    })
    .select('*')
    .single();

  if (insertError) {
    console.error('Failed to insert DNA into Supabase', insertError);
    throw new Error('Database insertion failed');
  }

  return insertedData;
}
