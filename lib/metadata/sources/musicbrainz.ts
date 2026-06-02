import type { ExternalMetadata } from '../types';

const MB_API = 'https://musicbrainz.org/ws/2';

// ─── Rate Limiter ─────────────────────────────────────────────────────────────
// MusicBrainz allows max 1 request/second without authentication.
// This queue-based limiter is safe under concurrent calls unlike the
// simple timestamp approach (which breaks when multiple calls fire simultaneously).

const REQUEST_INTERVAL = 1100; // 1.1s to stay safely under the 1/s limit

const requestQueue: Array<() => void> = [];
let isProcessing = false;

function scheduleRequest(): Promise<void> {
  return new Promise((resolve) => {
    requestQueue.push(resolve);
    if (!isProcessing) processQueue();
  });
}

async function processQueue() {
  isProcessing = true;
  while (requestQueue.length > 0) {
    const next = requestQueue.shift();
    if (next) next();
    if (requestQueue.length > 0) {
      await new Promise((r) => setTimeout(r, REQUEST_INTERVAL));
    }
  }
  isProcessing = false;
}

// ─── Fetch Helper ─────────────────────────────────────────────────────────────

async function mbFetch<T>(path: string): Promise<T | null> {
  await scheduleRequest();

  const separator = path.includes('?') ? '&' : '?';

  try {
    const res = await fetch(`${MB_API}${path}${separator}fmt=json`, {
      headers: {
        'User-Agent': 'StreamVault/1.0 (recommendations@streamvault.app)',
        'Accept': 'application/json',
      },
    });

    if (res.status === 503) {
      // MusicBrainz returns 503 when rate limit is hit — wait and retry once
      await new Promise((r) => setTimeout(r, 2000));
      const retry = await fetch(`${MB_API}${path}${separator}fmt=json`, {
        headers: {
          'User-Agent': 'StreamVault/1.0 (recommendations@streamvault.app)',
          'Accept': 'application/json',
        },
      });
      if (!retry.ok) return null;
      return await retry.json() as T;
    }

    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface MBRecording {
  id: string;
  title: string;
  artist: string;
  length: number; // milliseconds
  trackNumber?: number;
}

interface MBArtist {
  id: string;
  name: string;
  type: string; // composer, lyricist, conductor, etc.
}

interface MBRelease {
  id: string;
  title: string;
  date: string;
  label: string;
  trackCount: number;
  country: string;
}

interface MBWorkRelationship {
  type: string;
  target: string;
  targetType: 'work' | 'artist' | 'unknown';
}

interface MBTag {
  name: string;
  count: number;
}

interface MBArtistCredit {
  name?: string;
  artist?: {
    name?: string;
  };
}

interface MBTrack {
  title?: string;
  length?: number;
  recording?: {
    id?: string;
    title?: string;
    length?: number;
    'artist-credit'?: MBArtistCredit[];
  };
}

interface MBMedium {
  tracks?: MBTrack[];
  'track-count'?: number;
}

interface MBRelation {
  type?: string;
  'target-type'?: string;
  artist?: {
    id?: string;
    name?: string;
  };
  work?: {
    title?: string;
  };
}

interface MBReleaseApi {
  id?: string;
  title?: string;
  date?: string;
  country?: string;
  status?: string;
  media?: MBMedium[];
  'track-count'?: number;
  'label-info'?: Array<{
    label?: {
      name?: string;
    };
  }>;
  relations?: MBRelation[];
}

interface MBReleaseGroup {
  id?: string;
  releases?: MBReleaseApi[];
  relations?: MBRelation[];
  tags?: MBTag[];
}

interface MBSearchResponse {
  'release-groups'?: MBReleaseGroup[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extracts recordings from a release's track list.
 * MusicBrainz stores recordings inside media > tracks on a release,
 * not as a top-level field on works.
 */
function extractRecordingsFromRelease(releaseData: MBReleaseApi): MBRecording[] {
  const recordings: MBRecording[] = [];
  const media = releaseData?.media ?? [];

  let globalTrackNumber = 1;
  for (const medium of media) {
    const tracks = medium.tracks ?? [];
    for (const track of tracks) {
      const recording = track.recording ?? {};
      const artistCredit =
        recording['artist-credit']?.[0]?.artist?.name ??
        recording['artist-credit']?.[0]?.name ??
        '';

      recordings.push({
        id: recording.id ?? '',
        title: track.title ?? recording.title ?? '',
        artist: artistCredit,
        length: recording.length ?? track.length ?? 0,
        trackNumber: globalTrackNumber++,
      });
    }
  }

  return recordings;
}

/**
 * Extracts composer/lyricist/conductor artists from a release's
 * artist-relation list (not artist-credit, which is the performing artist).
 */
function extractArtistsFromRelations(relations: MBRelation[]): MBArtist[] {
  const relevantTypes = new Set([
    'composer',
    'lyricist',
    'conductor',
    'orchestrator',
    'arranger',
    'music',
  ]);

  return relations
    .filter((r) => r['target-type'] === 'artist' && relevantTypes.has(r.type ?? ''))
    .map((r) => ({
      id: r.artist?.id ?? '',
      name: r.artist?.name ?? '',
      type: r.type ?? '',
    }))
    .filter((a: MBArtist) => a.id && a.name);
}

/**
 * Extracts release info from a release object.
 */
function extractRelease(r: MBReleaseApi): MBRelease {
  const trackCount = (r.media ?? []).reduce(
    (sum: number, m) => sum + (m['track-count'] ?? 0),
    0
  );

  return {
    id: r.id ?? '',
    title: r.title ?? '',
    date: r.date ?? '',
    label: r['label-info']?.[0]?.label?.name ?? '',
    trackCount,
    country: r.country ?? '',
  };
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Enriches a film or TV show with MusicBrainz soundtrack metadata.
 *
 * Strategy:
 * 1. Search for a soundtrack release-group matching the title
 * 2. Fetch the best matching release with full track listings
 * 3. Extract recordings, composers, labels, and tags
 *
 * Note: MusicBrainz data quality varies. Many titles will have no entry.
 * Always treat results as supplementary — never block UI on this call.
 */
export async function enrichFromMusicBrainz(
  tmdbId: string,
  mediaType: 'movie' | 'tv',
  title: string
): Promise<Partial<ExternalMetadata>> {
  try {
    // ── Step 1: Search for soundtrack release-group ───────────────────────────
    // Use release-group (not /work) — works are individual compositions,
    // release-groups are the album/OST container we actually want.
    const searchQuery = `${encodeURIComponent(title)} AND primarytype:Album AND (secondarytype:Soundtrack OR secondarytype:"Original Soundtrack" OR secondarytype:"Soundtrack + Original")`;
    const searchRes = await mbFetch<MBSearchResponse>(`/release-group?query=${searchQuery}&limit=5`);

    if (!searchRes?.['release-groups']?.length) return {};

    // Pick the best match — MusicBrainz search returns by relevance score
    const releaseGroup = searchRes['release-groups'][0];
    const releaseGroupId = releaseGroup.id;

    if (!releaseGroupId) return {};

    // ── Step 2: Fetch release-group details to find best release ─────────────
    const rgDetailRes = await mbFetch<MBReleaseGroup>(
      `/release-group/${releaseGroupId}?inc=releases+tags+artist-rels`
    );

    if (!rgDetailRes) return {};

    const releases = rgDetailRes.releases ?? [];
    if (releases.length === 0) return {};

    // Prefer official releases, then pick the one with the most tracks
    const sortedReleases = [...releases].sort((a, b) => {
      const aOfficial = a.status === 'Official' ? 1 : 0;
      const bOfficial = b.status === 'Official' ? 1 : 0;
      if (bOfficial !== aOfficial) return bOfficial - aOfficial;
      return (b['track-count'] ?? 0) - (a['track-count'] ?? 0);
    });

    const bestRelease = sortedReleases[0];

    // ── Step 3: Fetch full release with track listings ────────────────────────
    // inc=recordings gives us the full recording details per track
    // inc=artist-rels gives us composers, conductors, etc.
    // inc=labels gives us label info
    const releaseDetailRes = await mbFetch<MBReleaseApi>(
      `/release/${bestRelease.id}?inc=recordings+artist-rels+labels+artist-credits`
    );

    if (!releaseDetailRes) return {};

    // ── Step 4: Extract structured data ──────────────────────────────────────

    const recordings = extractRecordingsFromRelease(releaseDetailRes).slice(0, 50);

    const artists = extractArtistsFromRelations(
      releaseDetailRes.relations ?? []
    ).slice(0, 20);

    // Also include release-group level artist relations (often has the composer)
    const rgArtists = extractArtistsFromRelations(
      rgDetailRes.relations ?? []
    ).slice(0, 10);

    // Merge and deduplicate artists by ID
    const allArtists = [...artists, ...rgArtists].filter(
      (a: MBArtist, i: number, arr: MBArtist[]) => arr.findIndex((b: MBArtist) => b.id === a.id) === i
    );

    const releaseInfo = extractRelease(releaseDetailRes);

    // All releases in the release-group (for completeness)
    const allReleases = sortedReleases.slice(0, 10).map((r) => extractRelease(r));

    // Tags from the release-group (more reliable than release-level tags)
    const soundtrackTags: MBTag[] = (rgDetailRes.tags ?? [])
      .map((t) => ({
        name: t.name ?? '',
        count: t.count ?? 0,
      }))
      .filter((t: MBTag) => t.name)
      .sort((a: MBTag, b: MBTag) => b.count - a.count)
      .slice(0, 20);

    // Work relationships from release-group relations
    const workRelationships: MBWorkRelationship[] = (rgDetailRes.relations ?? [])
      .filter((r) => r['target-type'] === 'work' || r['target-type'] === 'artist')
      .map((r): MBWorkRelationship => ({
        type: r.type ?? '',
        target: r.work?.title ?? r.artist?.name ?? '',
        targetType: r.work ? 'work' : r.artist ? 'artist' : 'unknown',
      }))
      .filter((r) => Boolean(r.target));

    return {
      musicbrainz: {
        releaseGroupId,
        releaseId: bestRelease.id ?? '',
        primaryRelease: releaseInfo,
        artists: allArtists,
        releases: allReleases,
        recordings,
        workRelationships,
        soundtrackTags,
      },
    };
  } catch (err) {
    console.error(`[musicbrainz] Unexpected error for title="${title}":`, err);
    return {};
  }
}

// ─── Utility: Format Track Duration ──────────────────────────────────────────

/**
 * Converts MusicBrainz track length (milliseconds) to mm:ss string.
 * Returns '' if length is 0 or undefined.
 */
export function formatTrackDuration(ms: number): string {
  if (!ms || ms <= 0) return '';
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// ─── Utility: Get Composer Name ───────────────────────────────────────────────

/**
 * Returns the primary composer name from MusicBrainz artist relations.
 * Falls back to first artist of any type if no composer is found.
 */
export function getPrimaryComposer(
  artists: MBArtist[] | undefined
): string {
  if (!artists || artists.length === 0) return '';
  const composer = artists.find((a: MBArtist) => a.type === 'composer');
  return composer?.name ?? artists[0]?.name ?? '';
}
