import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const { contentId, contentType, timestamp = 0 } = await req.json();

    if (!contentId || !contentType) {
      return NextResponse.json({ found: false, error: 'Missing params' }, { status: 400 });
    }

    const supabase = createClient();

    // 1. Check community scene_songs table
    const { data: songs } = await supabase
      .from('scene_songs')
      .select('*')
      .eq('content_id', contentId)
      .eq('content_type', contentType)
      .lte('timestamp_start', timestamp)
      .gte('timestamp_end', timestamp)
      .order('upvotes', { ascending: false })
      .limit(1);

    if (songs && songs.length > 0) {
      const s = songs[0];
      return NextResponse.json({
        found: true,
        source: 'community',
        song_title: s.song_title,
        artist_name: s.artist_name,
        spotify_track_id: s.spotify_track_id,
        apple_music_url: s.apple_music_url,
        spotify_url: s.spotify_track_id
          ? `https://open.spotify.com/track/${s.spotify_track_id}`
          : `https://open.spotify.com/search/${encodeURIComponent(s.song_title + ' ' + s.artist_name)}`,
      });
    }

    // 2. Fall back to TMDB keyword data (not a real endpoint — placeholder for community contribution)
    return NextResponse.json({
      found: false,
      message: 'No song data found for this moment.',
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
