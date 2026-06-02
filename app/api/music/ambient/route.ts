import { NextResponse } from 'next/server';

const JAMENDO_CLIENT_ID = process.env.JAMENDO_CLIENT_ID || '56d30c95'; // fallback to a known public demo key if env is missing

const moodToTag: Record<string, string> = {
  'epic-orchestral': 'epic',
  'dark-tension': 'dark',
  'warm-acoustic': 'acoustic',
  'cinematic-electronic': 'electronic',
  'upbeat-light': 'upbeat',
  'ambient-dark': 'ambient',
  'minimal-ambient': 'ambient',
  'cinematic-neutral': 'cinematic'
};

async function fetchAmbientTrackUrl(mood: string) {
  const tag = moodToTag[mood] || 'cinematic';
  const res = await fetch(
    `https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=10&tags=${tag}&audioformat=mp32`
  );
  if (!res.ok) throw new Error('Jamendo API failed');
  const data = await res.json();
  const tracks = data.results;
  if (!tracks || tracks.length === 0) throw new Error('No tracks found for tag');
  const random = tracks[Math.floor(Math.random() * tracks.length)];
  return random.audio; // direct MP3 URL
}

export async function POST(req: Request) {
  try {
    const { mood } = await req.json();

    const audioUrl = await fetchAmbientTrackUrl(mood);
    
    // Fetch the actual audio file so we can proxy the ArrayBuffer back to the client
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) {
      throw new Error('Failed to download audio track');
    }

    const audioBuffer = await audioRes.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=31536000', // Browser can cache it
      },
    });

  } catch (err: any) {
    console.error("Ambient Audio Route Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
