import type { ExternalMetadata } from '../types';

const TVDB_API_KEY = process.env.TVDB_API_KEY ?? '';
const TVDB_BASE = 'https://api4.thetvdb.com/v4';

let token: string | null = null;
let tokenExpiry: number = 0;

async function getToken(): Promise<string | null> {
  if (token && Date.now() < tokenExpiry) return token;
  try {
    const res = await fetch(`${TVDB_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: TVDB_API_KEY }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    token = data.data?.token ?? null;
    tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;
    return token;
  } catch {
    return null;
  }
}

async function tvdbFetch(path: string) {
  const t = await getToken();
  if (!t) return null;
  try {
    const res = await fetch(`${TVDB_BASE}${path}`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function enrichFromTVDb(
  tmdbId: string,
  mediaType: 'movie' | 'tv',
  title: string
): Promise<Partial<ExternalMetadata>> {
  if (!TVDB_API_KEY) return {};

  try {
    // Search TVDb by remote TMDB ID first, fall back to title search
    let searchRes = await tvdbFetch(`/search?remote_id=tmdb:${tmdbId}&type=${mediaType === 'movie' ? 'movie' : 'series'}`);
    if (!searchRes?.data?.[0]) {
      searchRes = await tvdbFetch(`/search?query=${encodeURIComponent(title)}&type=${mediaType === 'movie' ? 'movie' : 'series'}`);
    }
    if (!searchRes?.data?.[0]) return {};

    const series = searchRes.data[0];
    const seriesId = series.id;

    // Fetch full series/movie details
    const endpoint = mediaType === 'movie' ? `/movies/${seriesId}/extended` : `/series/${seriesId}/extended`;
    const detailRes = await tvdbFetch(endpoint);
    if (!detailRes?.data) return {};

    const d = detailRes.data;
    const seasons = d.seasons ?? [];
    const officialSeasons = seasons.filter(
      (s: any) => s.type?.name === 'Official' || s.number > 0
    );
    const seasonCount = officialSeasons.length;
    let episodeCount = 0;
    for (const s of officialSeasons) {
      episodeCount += s.episodeCount ?? 0;
    }

    interface TVDBAward { name?: string; year?: number; won?: boolean }
    interface TVDBCharacter { name?: string; personName?: string; role?: string }

    const awards = ((d.awards ?? []) as any[]).map((a: any) => ({
      name: a.name ?? '',
      year: a.year ?? 0,
      won: a.won ?? false,
    }));

    const characters = ((d.characters ?? []) as any[]).slice(0, 20).map((c: any) => ({
      name: c.name ?? '',
      actor: c.personName ?? '',
      role: c.role ?? '',
    }));

    return {
      tvdb: {
        seriesId: String(seriesId),
        episodeCount,
        seasonCount,
        genres: (d.genres ?? []).map((g: any) => g.name).filter(Boolean),
        status: d.status?.name ?? '',
        network: d.network?.name ?? '',
        airsDayOfWeek: d.airsDayOfWeek ?? '',
        airsTime: d.airsTime ?? '',
        firstAired: d.firstAired ?? '',
        lastAired: d.lastAired ?? '',
        runtime: d.runtime ?? 0,
        rating: d.rating ?? '',
        imdbId: d.imdbId ?? '',
        zap2itId: d.zap2itId ?? '',
        awards,
        characters,
      },
    };
  } catch {
    return {};
  }
}
