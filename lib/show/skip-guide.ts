import { createClient } from '@/lib/supabase/server';
import { callDeepSeek, parseJSON } from '../recommendations/deepseek';

export interface SkipGuideEpisode {
  episode: string; // e.g. "S02E04"
  reason: string;
  skip_safe: boolean;
}

export async function generateSkipGuide(
  showId: string,
  showTitle: string
): Promise<SkipGuideEpisode[]> {
  const supabase = createClient();

  // 1. Check if we already have a cached skip guide
  const { data: cached } = await supabase
    .from('show_skip_guides')
    .select('guide_json')
    .eq('tmdb_id', showId)
    .single();

  if (cached) {
    return cached.guide_json as SkipGuideEpisode[];
  }

  // 2. Fetch all episodes for the show (limited to first few seasons for token safety if needed, or all for comprehensive)
  // For simplicity, we'll ask the AI based on its internal knowledge first, 
  // but a better version would pull summaries from TMDB.
  
  const prompt = `You are a TV show expert. Analyze the show "${showTitle}" (TMDB ID: ${showId}).
Identify which episodes are considered "filler" (standalone episodes that do not advance the main plot or character development arcs).
Focus on shows known for filler (like Anime or long-running Procedurals).

Return a JSON array of objects:
[{ "episode": "S01E05", "reason": "Standalone monster-of-the-week episode with no arc progress.", "skip_safe": true }]

Only include episodes that are actually safe to skip. If the show has no filler (highly serialized), return an empty array [].
Limit to the most obvious ones.

Show: ${showTitle}`;

  try {
    const raw = await callDeepSeek(prompt, { max_tokens: 650, temperature: 0.1 });
    const guide = parseJSON<SkipGuideEpisode[]>(raw) || [];

    // 3. Cache the result
    if (guide.length > 0) {
      await supabase.from('show_skip_guides').upsert({
        tmdb_id: showId,
        guide_json: guide,
        updated_at: new Date().toISOString()
      });
    }

    return guide;
  } catch (e) {
    console.error('Error generating skip guide:', e);
    return [];
  }
}
