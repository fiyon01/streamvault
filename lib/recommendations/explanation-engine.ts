import { createClient } from '@/lib/supabase/server';
import { callDeepSeek } from './deepseek';
import { getOrCreateContentDNA } from './content-dna';
import { getUserTasteProfile } from './taste-dna';
import { getTopMatchingDimensions, getSharedThemes } from './utils';

export async function generateExplanation(
  userId: string,
  tmdbId: string,
  mediaType: 'movie' | 'tv'
): Promise<string> {
  const supabase = createClient();

  const [profile, contentDNA] = await Promise.all([
    getUserTasteProfile(userId),
    getOrCreateContentDNA(tmdbId, mediaType),
  ]);

  if (!profile || !contentDNA) {
    return 'A strong match based on your viewing history.';
  }

  const topDims   = getTopMatchingDimensions(profile, contentDNA, 2);
  const themes    = getSharedThemes(profile, contentDNA).slice(0, 2);
  const topTitles = Object.keys(profile.theme_scores ?? {}).slice(0, 3).join(', ');

  const prompt = `You are the recommendation engine of StreamVault.
Generate a single-sentence explanation for why a viewer will love "${contentDNA.title}".

Viewer profile: "${profile.profile_summary}"
Viewer's beloved themes: ${topTitles || 'crime, drama'}
Shared dimensions: ${topDims.join(' and ')}
Shared themes: ${themes.join(', ') || 'character development'}

Rules:
- ONE sentence only
- Be specific — reference actual shared traits
- Conversational, not marketing speak
- Do NOT start with "Because you watched"
- Good examples: "You've rated every slow-burn moral collapse story 5 stars — this is the one most people overlook."
- Return plain text only, no quotes.`;

  try {
    const text = await callDeepSeek(prompt, { max_tokens: 80, temperature: 0.4 });
    return text.replace(/^"|"$/g, '').trim() || 'A high-confidence match for your taste profile.';
  } catch {
    return `A ${Math.round((topDims.length / 2) * 100)}% DNA match on ${topDims[0] ?? 'tone and pacing'}.`;
  }
}
