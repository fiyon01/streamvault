import { NextResponse } from 'next/server';

const MB_AGENT = 'StreamVault/1.0 (contact@streamvault.app)';

async function fetchAniListThemes(title: string) {
  const query = `
    query($search: String) {
      Media(search: $search, type: ANIME) {
        openingThemes { text }
        endingThemes { text }
      }
    }
  `;
  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { search: title } }),
    });
    const data = await res.json();
    const media = data?.data?.Media;
    return {
      openingThemes: media?.openingThemes || [],
      endingThemes: media?.endingThemes || [],
    };
  } catch {
    return { openingThemes: [], endingThemes: [] };
  }
}

async function fetchMusicBrainzOST(title: string) {
  try {
    const query = encodeURIComponent(`release:"${title}" AND type:soundtrack`);
    const res = await fetch(
      `https://musicbrainz.org/ws/2/release?query=${query}&limit=1&fmt=json`,
      { headers: { 'User-Agent': MB_AGENT } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const release = data.releases?.[0];
    if (!release) return [];

    const releaseRes = await fetch(
      `https://musicbrainz.org/ws/2/release/${release.id}?inc=recordings+artists&fmt=json`,
      { headers: { 'User-Agent': MB_AGENT } }
    );
    if (!releaseRes.ok) return [];
    const releaseData = await releaseRes.json();

    const tracks: any[] = [];
    let trackNum = 1;
    for (const medium of releaseData.media || []) {
      for (const track of medium.tracks || []) {
        const artist = track.recording?.['artist-credit']?.[0]?.name || 'Unknown Artist';
        const songTitle = track.title || track.recording?.title || 'Unknown Track';
        const searchQ = encodeURIComponent(`${songTitle} ${artist}`);
        tracks.push({
          track_number: trackNum++,
          title: songTitle,
          artist,
          album: release.title,
          scene_description: '',
          spotify_url: `https://open.spotify.com/search/${searchQ}`,
          apple_music_url: `https://music.apple.com/search?term=${searchQ}`,
          youtube_music_url: `https://music.youtube.com/search?q=${searchQ}`,
        });
      }
    }
    return tracks.slice(0, 30);
  } catch {
    return [];
  }
}

function parseTheme(text: string, index: number, type: 'OP' | 'ED') {
  const titleMatch = text.match(/"([^"]+)"/);
  const artistMatch = text.match(/by ([^(]+)/);
  const songTitle = titleMatch?.[1] || text;
  const artist = artistMatch?.[1]?.trim() || 'Unknown Artist';
  const searchQ = encodeURIComponent(`${songTitle} ${artist}`);
  return {
    track_number: index + 1,
    title: songTitle,
    artist,
    album: '',
    scene_description: type === 'OP' ? 'Opening Theme' : 'Ending Theme',
    spotify_url: `https://open.spotify.com/search/${searchQ}`,
    apple_music_url: `https://music.apple.com/search?term=${searchQ}`,
    youtube_music_url: `https://music.youtube.com/search?q=${searchQ}`,
  };
}

export async function POST(req: Request) {
  try {
    const { contentType, title, isAnime } = await req.json();

    if (isAnime) {
      const [themes, mbTracks] = await Promise.all([
        fetchAniListThemes(title),
        fetchMusicBrainzOST(title),
      ]);

      const openingTracks = themes.openingThemes.map((t: any, i: number) => parseTheme(t.text, i, 'OP'));
      const endingTracks = themes.endingThemes.map((t: any, i: number) => parseTheme(t.text, i, 'ED'));

      return NextResponse.json({
        sections: [
          ...(openingTracks.length > 0 ? [{ label: 'Opening Theme', tracks: openingTracks }] : []),
          ...(endingTracks.length > 0 ? [{ label: 'Ending Theme', tracks: endingTracks }] : []),
          ...(mbTracks.length > 0 ? [{ label: 'OST / Score', tracks: mbTracks }] : []),
        ],
        totalTracks: openingTracks.length + endingTracks.length + mbTracks.length,
      });
    }

    const mbTracks = await fetchMusicBrainzOST(title);
    return NextResponse.json({
      sections: mbTracks.length > 0 ? [{ label: 'Soundtrack', tracks: mbTracks }] : [],
      totalTracks: mbTracks.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
