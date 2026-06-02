'use server';

import { createClient } from '@/lib/supabase/server';
import { extractAndSaveContentDNA } from './dna';
import { callDeepSeek } from '@/lib/recommendations/deepseek';

const DIMENSION_NAMES = [
  "Pacing", "Morality", "Tone", "Reality", "Focus", "Stakes", "Structure", "Texture", "Resolution"
];

const DIMENSION_DESCRIPTIONS = [
  ["Slow Burn", "Kinetic"],
  ["Absolute", "Ambiguous"],
  ["Hopeful", "Bleak"],
  ["Grounded", "Fantastical"],
  ["Character", "Plot"],
  ["Intimate", "Epic"],
  ["Episodic", "Serial"],
  ["Sparse", "Dense"],
  ["Cathartic", "Ambiguous"]
];

export async function generateWhyThisExplanation(tmdbId: string, mediaType: 'movie' | 'tv') {
  const supabase = createClient();
  
  // 1. Get User DNA
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "Log in to see personalized explanations.";

  const { data: tasteData } = await supabase
    .from('user_taste_dna')
    .select('dna_vector')
    .eq('user_id', user.id)
    .single();

  if (!tasteData || !tasteData.dna_vector) {
    return "Keep watching more content to build your Taste DNA and unlock personalized explanations!";
  }

  // 2. Get Content DNA
  let contentData = await extractAndSaveContentDNA(tmdbId, mediaType);
  if (!contentData || !contentData.dna_vector) {
    return "We are currently analyzing the DNA of this title.";
  }

  // Parse vectors
  let userVec = [], contentVec = [];
  try {
    userVec = typeof tasteData.dna_vector === 'string' ? JSON.parse(tasteData.dna_vector) : tasteData.dna_vector;
    contentVec = typeof contentData.dna_vector === 'string' ? JSON.parse(contentData.dna_vector) : contentData.dna_vector;
  } catch(e) {
    return "Analyzing DNA overlap...";
  }

  // 3. Find top 2 dimensions where User and Content strongly align (closest distance)
  let diffs = [];
  for (let i = 0; i < 9; i++) {
    const diff = Math.abs(userVec[i] - contentVec[i]);
    diffs.push({ index: i, diff: diff, userVal: userVec[i], contentVal: contentVec[i] });
  }
  
  // Sort by smallest difference (strongest alignment)
  diffs.sort((a, b) => a.diff - b.diff);
  const top2 = diffs.slice(0, 2);

  // Map to descriptive strings
  const alignmentText = top2.map(d => {
    const dimName = DIMENSION_NAMES[d.index];
    const val = d.contentVal;
    // Determine which side of the spectrum it falls on
    const description = val > 0.5 ? DIMENSION_DESCRIPTIONS[d.index][1] : DIMENSION_DESCRIPTIONS[d.index][0];
    return `${description} ${dimName}`;
  }).join(' and ');

  const prompt = `You are the AI engine of StreamVault. 
The user has a strong affinity for ${alignmentText}.
The content "${contentData.title}" perfectly matches this profile.

Write EXACTLY ONE punchy, exciting sentence explaining to the user why they will love this title based on these specific narrative traits. Do not use generic marketing speak. Speak directly to the user (e.g. "Because you love...").

Do NOT include any quotation marks, markdown, or conversational filler. Just the one sentence.`;

  // 4. Generate Explanation
  try {
    const text = await callDeepSeek([{ role: 'user', content: prompt }], { max_tokens: 90, temperature: 0.3 });
    return text.replace(/"/g, '');
  } catch (e) {
    console.error("Explanation generation failed", e);
  }

  // Fallback
  return `A 98% match for your taste in ${alignmentText}.`;
}
