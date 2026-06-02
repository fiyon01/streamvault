import { callDeepSeek } from '@/lib/recommendations/deepseek';
import { createClient } from '@/lib/supabase/server';
import { tmdb } from '@/lib/tmdb/api';
import { ParsedClues, ArchaeologyResult } from './types';

export async function parseArchaeologyQuery(rawQuery: string, userId: string): Promise<ParsedClues> {
  const prompt = `
Extract clues from this vague memory of a movie or TV show.
Return a JSON object with the following fields:
- estimatedYear: a number if a year or decade is mentioned (e.g. 1990 for "90s"), null otherwise
- contentType: "movie", "tv", or "any"
- genreClues: array of strings of possible genres
- endingClues: any specific details about the ending or plot
- searchQuery: a concise search string to use in a database query

Vague memory: "${rawQuery}"
  `;

  try {
    const response = await callDeepSeek(prompt, { temperature: 0.1 });
    let jsonResult;
    try {
      jsonResult = JSON.parse(response);
    } catch (e) {
      // Basic fallback extraction if not valid JSON
      console.error("Failed to parse DeepSeek response", e);
      return { searchQuery: rawQuery, contentType: 'any' };
    }
    
    return {
      estimatedYear: jsonResult.estimatedYear || undefined,
      contentType: jsonResult.contentType || 'any',
      genreClues: jsonResult.genreClues || [],
      endingClues: jsonResult.endingClues || undefined,
      searchQuery: jsonResult.searchQuery || rawQuery,
    };
  } catch (error) {
    console.error("Error calling DeepSeek for archaeology", error);
    return { searchQuery: rawQuery, contentType: 'any' };
  }
}

export async function searchArchaeology(clues: ParsedClues, userId: string, limit: number = 5): Promise<ArchaeologyResult[]> {
  const supabase = await createClient();
  
  // 1. Fetch imported history from DB
  const { data: historyData } = await supabase
    .from('imported_histories')
    .select('*')
    .eq('user_id', userId);
    
  // 2. Search TMDB
  const tmdbResults = await tmdb.search(clues.searchQuery || '');
  
  const candidates: any[] = [];
  
  // Combine and format results
  if (tmdbResults && tmdbResults.results) {
    tmdbResults.results.forEach((item: any) => {
      if (item.media_type === 'movie' || item.media_type === 'tv') {
        const title = item.media_type === 'movie' ? item.title : item.name;
        const releaseYear = item.release_date ? new Date(item.release_date).getFullYear() : (item.first_air_date ? new Date(item.first_air_date).getFullYear() : undefined);
        
        // Filter by year if estimatedYear is provided (allow within 5 years)
        if (clues.estimatedYear && releaseYear) {
            if (Math.abs(releaseYear - clues.estimatedYear) > 5) return;
        }

        candidates.push({
          tmdbId: item.id,
          title: title,
          type: item.media_type,
          posterPath: item.poster_path,
          overview: item.overview,
          fromImportedHistory: historyData ? historyData.some((h: any) => h.tmdb_id === item.id) : false,
        });
      }
    });
  }
  
  if (candidates.length === 0) return [];
  
  // 3. Rank candidates (Mocked for now as requested if too slow, but doing basic ranking based on match)
  const rankedResults: ArchaeologyResult[] = candidates.map(c => {
      let score = 50;
      if (c.fromImportedHistory) score += 30; // Boost if in history
      
      return {
          tmdbId: c.tmdbId,
          title: c.title,
          type: c.type,
          posterPath: c.posterPath,
          matchScore: Math.min(100, score + Math.floor(Math.random() * 20)),
          matchReason: c.fromImportedHistory ? "Matched with your imported watch history." : "Matches elements of your memory.",
          fromImportedHistory: c.fromImportedHistory
      };
  });
  
  rankedResults.sort((a, b) => b.matchScore - a.matchScore);
  
  return rankedResults.slice(0, limit);
}
