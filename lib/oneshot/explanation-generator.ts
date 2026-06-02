import { callDeepSeek } from '@/lib/recommendations/deepseek';
import { ParsedIntent, OneShotCandidate } from './types';

export async function generateOneShotExplanation(
  userId: string, 
  pick: OneShotCandidate, 
  intent: ParsedIntent, 
  userProfile?: any
): Promise<string> {
  const prompt = `You are a film and show expert for a streaming platform.
The user wanted to watch something with this intent:
- Themes: ${intent.themes.join(', ')}
- Tone: ${intent.tone}
- Search Query: "${intent.searchQuery}"

We are recommending: "${pick.title}"

Generate a single, dynamic, exciting sentence explaining exactly why this recommendation fits their specific intent. Speak directly to the user (e.g., "Since you're looking for...", "This delivers on your need for..."). Do not use quotes. Make it punchy.`;

  try {
    const explanation = await callDeepSeek([
      { role: 'user', content: prompt }
    ], { temperature: 0.5 });
    
    return explanation.trim().replace(/^"|"$/g, '');
  } catch (error) {
    console.error("Error generating explanation:", error);
    return `A perfect match for your search for "${intent.searchQuery}".`;
  }
}
