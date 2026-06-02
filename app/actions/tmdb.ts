'use server';

import { tmdb } from '@/lib/tmdb/api';

export async function getSeasonEpisodes(tvId: string, seasonNumber: number) {
  try {
    const data = await tmdb.getSeasonDetails(tvId, seasonNumber);
    return data.episodes || [];
  } catch (e) {
    console.error('Error fetching season details:', e);
    return [];
  }
}
