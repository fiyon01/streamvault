import { tmdb } from '@/lib/tmdb/api';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tvId = searchParams.get('tvId');
  const season = Number(searchParams.get('season'));

  if (!tvId || !Number.isInteger(season) || season < 0) {
    return NextResponse.json({ error: 'Missing or invalid season request' }, { status: 400 });
  }

  try {
    const data = await tmdb.getSeasonDetails(tvId, season);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch TMDB season:', error);
    return NextResponse.json({ error: 'Failed to fetch season' }, { status: 502 });
  }
}
