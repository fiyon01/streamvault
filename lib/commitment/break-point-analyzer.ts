import { callDeepSeek } from '@/lib/recommendations/deepseek';
import { tmdb } from '@/lib/tmdb/api';

export interface BreakPointResult {
  season_number: number;
  episode_number: number;
  break_type: 'cliffhanger' | 'resolution' | 'bridge' | 'unknown';
  break_score: number; // 0.0 to 1.0, where > 0.6 is a good stopping point
  break_note: string;
}

export async function analyzeEpisodeBreakPoints(contentId: number): Promise<BreakPointResult[]> {
  // Fetch show details to retrieve all seasons
  let seasonsData;
  try {
    const showDetails = await (tmdb as any).tv?.details?.(contentId) || await (tmdb as any).get(`/tv/${contentId}`);
    seasonsData = showDetails.seasons;
  } catch (err) {
    console.warn(`Failed to fetch show details for contentId ${contentId}`, err);
    return [];
  }

  if (!seasonsData || !Array.isArray(seasonsData)) {
    return [];
  }

  // Filter out specials
  const seasons = seasonsData.filter((s: any) => s.season_number > 0);
  const allEpisodes = [];

  for (const season of seasons) {
    try {
      const seasonDetails = await (tmdb as any).tv?.season?.(contentId, season.season_number) || await (tmdb as any).get(`/tv/${contentId}/season/${season.season_number}`);
      for (const episode of seasonDetails.episodes) {
        allEpisodes.push({
          season_number: episode.season_number,
          episode_number: episode.episode_number,
          name: episode.name,
          overview: episode.overview,
        });
      }
    } catch (err) {
      console.error(`Error fetching season ${season.season_number}`, err);
    }
  }

  if (allEpisodes.length === 0) {
    return [];
  }

  const results: BreakPointResult[] = [];

  // Batch process episodes in groups of 10 to avoid token limits on DeepSeek
  const BATCH_SIZE = 10;
  for (let i = 0; i < allEpisodes.length; i += BATCH_SIZE) {
    const batch = allEpisodes.slice(i, i + BATCH_SIZE);
    
    const prompt = `
You are an expert TV pacing and binge-watching analyst.
Analyze the following TV episodes based on their synopses.
Determine if the end of each episode is a good "break point" to stop watching for the day.
A good break point (resolution of an arc) gets a high score (>0.6). A cliffhanger gets a low score (<0.4).

Episodes:
${batch.map(ep => `Season ${ep.season_number}, Episode ${ep.episode_number}: "${ep.name}"\nSynopsis: ${ep.overview}`).join('\n\n')}

Return ONLY a valid JSON array of objects with the following exact schema:
[
  {
    "season_number": <number>,
    "episode_number": <number>,
    "break_type": "cliffhanger" | "resolution" | "bridge",
    "break_score": <number between 0.0 and 1.0>,
    "break_note": "<Brief reason why>"
  }
]
`;

    try {
      const aiResponse = await callDeepSeek(prompt);
      
      // Sanitize the AI response to parse JSON reliably
      let jsonStr = aiResponse.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```/, '').replace(/```$/, '').trim();
      }
      
      const parsed: BreakPointResult[] = JSON.parse(jsonStr);
      results.push(...parsed);
    } catch (err) {
      console.error('Error parsing DeepSeek batch response:', err);
      // Fallback: assign neutral scores to ensure the planner doesn't fail
      for (const ep of batch) {
        results.push({
          season_number: ep.season_number,
          episode_number: ep.episode_number,
          break_type: 'bridge',
          break_score: 0.5,
          break_note: 'Analysis failed; assigned default bridge score.',
        });
      }
    }
  }

  return results;
}
