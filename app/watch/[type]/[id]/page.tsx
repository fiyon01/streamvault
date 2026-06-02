import { tmdb } from '@/lib/tmdb/api';
import { WatchClient } from './watch-client';
import { notFound } from 'next/navigation';

interface WatchPageProps {
  params: {
    type: 'movie' | 'show';
    id: string;
  };
}

export default async function WatchPage({ params }: WatchPageProps) {
  const { type, id } = await params;
  
  if (type !== 'movie' && type !== 'show') {
    return notFound();
  }

  // Prevent static assets like logo.png from triggering TMDB API calls
  if (!/^\d+$/.test(id)) {
    return notFound();
  }

  const mediaType = type === 'show' ? 'tv' : 'movie';
  
  try {
    // 1. Fetch full details including similar
    const details = await tmdb.getDetails(mediaType, id);
    
    // 2. If TV show, fetch Season 1 by default so the client has episodes immediately
    let initialSeasonData = null;
    if (type === 'show' && details.seasons && details.seasons.length > 0) {
      // Find the first valid season (usually 1, sometimes 0 is Specials)
      const firstValidSeason = details.seasons.find((s: any) => s.season_number > 0) || details.seasons[0];
      try {
        initialSeasonData = await tmdb.getSeasonDetails(id, firstValidSeason.season_number);
      } catch (e) {
        console.error('Failed to fetch initial season data', e);
      }
    }

    return (
      <WatchClient 
        id={id} 
        type={type} 
        details={details} 
        initialSeasonData={initialSeasonData} 
      />
    );
  } catch (error) {
    console.error('Error fetching watch data:', error);
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center text-white flex-col gap-4">
        <h1 className="text-2xl font-bold">Failed to load content</h1>
        <p className="text-muted">The video details could not be retrieved.</p>
      </div>
    );
  }
}
