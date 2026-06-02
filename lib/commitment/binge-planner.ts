import { tmdb } from '@/lib/tmdb/api';
import { analyzeEpisodeBreakPoints } from './break-point-analyzer';

export async function generateBingePlan(contentId: number, userId: string, startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start > end) {
    throw new Error('Start date must be before end date.');
  }

  // Calculate inclusive days available
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysAvailable = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / msPerDay) + 1);

  // Fetch TV show details to get seasons using standard TMDB response structure
  let showDetails;
  try {
    // Assuming tmdb client supports either direct fetching or namespaced methods
    showDetails = await (tmdb as any).tv?.details?.(contentId) || await (tmdb as any).get(`/tv/${contentId}`);
  } catch (error) {
    console.error('Failed to fetch show details', error);
    throw new Error('Could not retrieve show information.');
  }

  const seasons = showDetails.seasons?.filter((s: any) => s.season_number > 0) || [];

  const allEpisodes = [];
  
  // Fetch all episodes for all seasons
  for (const season of seasons) {
    try {
      const seasonDetails = await (tmdb as any).tv?.season?.(contentId, season.season_number) || await (tmdb as any).get(`/tv/${contentId}/season/${season.season_number}`);
      for (const episode of seasonDetails.episodes) {
        allEpisodes.push({
          id: episode.id,
          season_number: episode.season_number,
          episode_number: episode.episode_number,
          name: episode.name,
          overview: episode.overview,
        });
      }
    } catch (error) {
      console.warn(`Failed to fetch season ${season.season_number} episodes`, error);
    }
  }

  if (allEpisodes.length === 0) {
    throw new Error('No episodes found for the given content.');
  }

  // Calculate a baseline of episodes per day
  const episodesPerDay = Math.ceil(allEpisodes.length / daysAvailable);
  
  // Get break points to optimize the plan
  const breakPoints = await analyzeEpisodeBreakPoints(contentId);
  
  const plan = [];
  let currentEpisodeIndex = 0;
  
  for (let day = 0; day < daysAvailable; day++) {
    if (currentEpisodeIndex >= allEpisodes.length) {
      break;
    }
    
    const currentDate = new Date(start);
    currentDate.setDate(currentDate.getDate() + day);
    
    // Attempt to allocate episodesPerDay
    let targetEndIndex = currentEpisodeIndex + episodesPerDay;
    if (targetEndIndex >= allEpisodes.length) {
      targetEndIndex = allEpisodes.length;
    } else {
      // Look for a good break point around the targetEndIndex (+/- 1 episode)
      let bestBreakIndex = targetEndIndex;
      let highestScore = 0;
      
      const searchStart = Math.max(currentEpisodeIndex + 1, targetEndIndex - 1);
      const searchEnd = Math.min(allEpisodes.length, targetEndIndex + 2);
      
      for (let i = searchStart; i < searchEnd; i++) {
        const episode = allEpisodes[i - 1]; // episode that we would stop *after*
        const breakData = breakPoints.find((bp: any) => bp.season_number === episode.season_number && bp.episode_number === episode.episode_number);
        
        const score = breakData ? breakData.break_score : 0;
        if (score > 0.6 && score > highestScore) {
          highestScore = score;
          bestBreakIndex = i;
        }
      }
      
      if (highestScore > 0.6) {
        targetEndIndex = bestBreakIndex;
      }
    }
    
    const dailyEpisodes = allEpisodes.slice(currentEpisodeIndex, targetEndIndex);
    plan.push({
      date: currentDate.toISOString().split('T')[0],
      episodes: dailyEpisodes,
      episodeCount: dailyEpisodes.length,
    });
    
    currentEpisodeIndex = targetEndIndex;
  }
  
  return {
    userId,
    contentId,
    startDate,
    endDate,
    totalDays: plan.length,
    totalEpisodes: allEpisodes.length,
    plan,
  };
}
