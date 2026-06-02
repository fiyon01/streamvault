import { createClient } from '@/lib/supabase/server';
import { tmdb } from '@/lib/tmdb/api';

export async function importNetflixHistory(csvContent: string, userId: string): Promise<{ total: number, matched: number, unmatched: number }> {
  const supabase = await createClient();
  const lines = csvContent.split('\n');
  if (lines.length === 0) return { total: 0, matched: 0, unmatched: 0 };
  
  // Skip header if present
  let startIndex = 0;
  if (lines[0].toLowerCase().includes('title')) {
    startIndex = 1;
  }
  
  let total = 0;
  let matchedCount = 0;
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV line (simple split by comma, ignoring quoted commas for this lightweight version)
    // A better approach would use a proper CSV parser, but sticking to simple split as requested
    const parts = line.split(',');
    let rawTitle = parts[0];
    if (!rawTitle) continue;
    
    // Remove quotes
    rawTitle = rawTitle.replace(/^"|"$/g, '');
    
    // Clean title (e.g. "Breaking Bad: Season 1: Pilot" -> "Breaking Bad")
    const titleParts = rawTitle.split(':');
    const cleanTitle = titleParts[0].trim();
    
    // Find in TMDB
    try {
      total++;
      const searchResult = await tmdb.search(cleanTitle);
      
      if (searchResult && searchResult.results && searchResult.results.length > 0) {
        // Take the first matching movie or TV show
        const match = searchResult.results.find((r: any) => r.media_type === 'movie' || r.media_type === 'tv');
        
        if (match) {
          // Save to Supabase
          const { error } = await supabase.from('imported_histories').upsert({
            user_id: userId,
            tmdb_id: match.id,
            title: cleanTitle,
            media_type: match.media_type,
            imported_at: new Date().toISOString()
          }, { onConflict: 'user_id,tmdb_id' });
          
          if (!error) {
            matchedCount++;
          }
        }
      }
    } catch (e) {
      console.error(`Error importing ${cleanTitle}:`, e);
    }
  }
  
  return { total, matched: matchedCount, unmatched: total - matchedCount };
}
