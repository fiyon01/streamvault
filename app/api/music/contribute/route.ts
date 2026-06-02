import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const { contentId, contentType, timestamp, song_title, artist_name, spotify_track_id } = await req.json();

    if (!contentId || !contentType || !song_title || !artist_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('scene_songs')
      .insert({
        content_id: contentId,
        content_type: contentType,
        timestamp_start: timestamp || 0,
        timestamp_end: (timestamp || 0) + 180, // default 3 min window
        song_title,
        artist_name,
        spotify_track_id: spotify_track_id || null,
        contributed_by_user_id: user?.id || null,
        verified: false,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, song: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
