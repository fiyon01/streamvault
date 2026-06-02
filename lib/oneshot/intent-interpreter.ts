import { callDeepSeek, parseJSON } from '@/lib/recommendations/deepseek';
import { ParsedIntent, ContentType } from './types';

export async function interpretOneShotQuery(rawQuery: string, userProfile?: any): Promise<ParsedIntent> {
  const systemPrompt = `You are an AI intent interpreter for a streaming platform.
Given a user's natural language query for what they want to watch, extract the underlying themes, tone, a suitable API search query, and the content type (movie, tv, or anime).
Return the result ONLY as a JSON object with the following structure:
{
  "themes": ["theme1", "theme2"],
  "tone": "dark",
  "searchQuery": "cyberpunk dystopia",
  "contentType": "movie" // one of: "movie", "tv", "anime"
}`;

  const userPrompt = `User Query: "${rawQuery}"
User Profile (if any): ${JSON.stringify(userProfile || {})}
Interpret the query and return the JSON.`;

  try {
    const rawResponse = await callDeepSeek([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], { temperature: 0.2 });
    
    const parsed = parseJSON<Partial<ParsedIntent>>(rawResponse);
    
    return {
      themes: Array.isArray(parsed?.themes) ? parsed.themes : ['general'],
      tone: parsed?.tone || 'neutral',
      searchQuery: parsed?.searchQuery || rawQuery,
      contentType: (parsed?.contentType === 'movie' || parsed?.contentType === 'tv' || parsed?.contentType === 'anime') 
        ? parsed.contentType 
        : 'movie'
    };
  } catch (error) {
    console.error("Failed to interpret intent:", error);
    // Fallback
    return {
      themes: ['general'],
      tone: 'neutral',
      searchQuery: rawQuery,
      contentType: 'movie'
    };
  }
}
