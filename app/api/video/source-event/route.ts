import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type SourceEventType = 'attempt' | 'load' | 'confirmed_working' | 'timeout' | 'error' | 'manual_next' | 'selected' | 'reported_broken';

type SourceEventBody = {
  tmdbId?: unknown;
  mediaType?: unknown;
  season?: unknown;
  episode?: unknown;
  sourceName?: unknown;
  sourceId?: unknown;
  sourceUrl?: unknown;
  eventType?: unknown;
  responseTimeMs?: unknown;
  hasAds?: unknown;
  anonymousSessionId?: unknown;
  metadata?: unknown;
};

const VALID_EVENTS = new Set<SourceEventType>([
  'attempt',
  'load',
  'confirmed_working',
  'timeout',
  'error',
  'manual_next',
  'selected',
  'reported_broken',
]);

const SUCCESS_EVENTS = new Set<SourceEventType>(['confirmed_working']);
const FAILURE_EVENTS = new Set<SourceEventType>(['timeout', 'error', 'manual_next', 'reported_broken']);

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value)) : fallback;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Source event failed';
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SourceEventBody;
    const tmdbId = cleanText(body.tmdbId);
    const mediaType = body.mediaType === 'tv' ? 'tv' : 'movie';
    const sourceName = cleanText(body.sourceName);
    const sourceId = cleanText(body.sourceId) || null;
    const sourceUrl = cleanText(body.sourceUrl) || null;
    const eventType = cleanText(body.eventType) as SourceEventType;
    const seasonNumber = cleanNumber(body.season);
    const episodeNumber = cleanNumber(body.episode);
    const responseTimeMs = cleanNumber(body.responseTimeMs, 0) || null;
    const hasAds = Boolean(body.hasAds);
    const anonymousSessionId = cleanText(body.anonymousSessionId) || null;
    const metadata = body.metadata && typeof body.metadata === 'object' ? body.metadata : {};

    if (!tmdbId) return NextResponse.json({ error: 'Missing tmdbId' }, { status: 400 });
    if (!sourceName) return NextResponse.json({ error: 'Missing sourceName' }, { status: 400 });
    if (!VALID_EVENTS.has(eventType)) return NextResponse.json({ error: 'Invalid eventType' }, { status: 400 });

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const admin = createAdminClient();

    await admin.from('playback_source_events').insert({
      user_id: user?.id ?? null,
      anonymous_session_id: anonymousSessionId,
      content_id: tmdbId,
      media_type: mediaType,
      season_number: mediaType === 'tv' ? seasonNumber || 1 : 0,
      episode_number: mediaType === 'tv' ? episodeNumber || 1 : 0,
      source_name: sourceName,
      source_id: sourceId,
      source_url: sourceUrl,
      event_type: eventType,
      response_time_ms: responseTimeMs,
      has_ads: hasAds,
      metadata,
    });

    if (SUCCESS_EVENTS.has(eventType) || FAILURE_EVENTS.has(eventType)) {
      await updateSourceHealth({
        sourceName,
        sourceId,
        hasAds,
        responseTimeMs,
        success: SUCCESS_EVENTS.has(eventType),
      });

      await updateSourceCache({
        tmdbId,
        mediaType,
        seasonNumber: mediaType === 'tv' ? seasonNumber || 1 : 0,
        episodeNumber: mediaType === 'tv' ? episodeNumber || 1 : 0,
        sourceName,
        sourceId,
        sourceUrl,
        hasAds,
        responseTimeMs,
        success: SUCCESS_EVENTS.has(eventType),
        lastError: FAILURE_EVENTS.has(eventType) ? eventType : null,
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

async function updateSourceHealth(input: {
  sourceName: string;
  sourceId: string | null;
  hasAds: boolean;
  responseTimeMs: number | null;
  success: boolean;
}) {
  const admin = createAdminClient();
  const existing = await admin
    .from('source_health')
    .select('id,total_checks,successful_checks,failed_checks,avg_response_time_ms')
    .eq('source_name', input.sourceName)
    .maybeSingle();

  const totalChecks = Number(existing.data?.total_checks ?? 0) + 1;
  const successfulChecks = Number(existing.data?.successful_checks ?? 0) + (input.success ? 1 : 0);
  const failedChecks = Number(existing.data?.failed_checks ?? 0) + (input.success ? 0 : 1);
  const previousAvg = Number(existing.data?.avg_response_time_ms ?? input.responseTimeMs ?? 0);
  const avgResponseTime = input.responseTimeMs
    ? Math.round(((previousAvg * Math.max(totalChecks - 1, 0)) + input.responseTimeMs) / totalChecks)
    : previousAvg || null;

  const payload = {
    source_name: input.sourceName,
    source_id: input.sourceId,
    has_ads: input.hasAds,
    total_checks: totalChecks,
    successful_checks: successfulChecks,
    failed_checks: failedChecks,
    avg_response_time_ms: avgResponseTime,
    uptime_percentage: Number(((successfulChecks / totalChecks) * 100).toFixed(2)),
    last_success_at: input.success ? new Date().toISOString() : undefined,
    last_failure_at: input.success ? undefined : new Date().toISOString(),
    last_check_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (existing.data?.id) {
    await admin.from('source_health').update(payload).eq('id', existing.data.id);
  } else {
    await admin.from('source_health').insert({
      ...payload,
      last_success_at: input.success ? new Date().toISOString() : null,
      last_failure_at: input.success ? null : new Date().toISOString(),
    });
  }
}

async function updateSourceCache(input: {
  tmdbId: string;
  mediaType: 'movie' | 'tv';
  seasonNumber: number;
  episodeNumber: number;
  sourceName: string;
  sourceId: string | null;
  sourceUrl: string | null;
  hasAds: boolean;
  responseTimeMs: number | null;
  success: boolean;
  lastError: string | null;
}) {
  const admin = createAdminClient();
  const existing = await admin
    .from('video_sources_cache')
    .select('id,success_count,fail_count')
    .eq('content_id', input.tmdbId)
    .eq('media_type', input.mediaType)
    .eq('season_number', input.seasonNumber)
    .eq('episode_number', input.episodeNumber)
    .eq('source_name', input.sourceName)
    .maybeSingle();

  const payload = {
    content_id: input.tmdbId,
    media_type: input.mediaType,
    season_number: input.seasonNumber,
    episode_number: input.episodeNumber,
    source_name: input.sourceName,
    source_id: input.sourceId,
    source_url: input.sourceUrl ?? '',
    last_working: input.success ? new Date().toISOString() : undefined,
    last_attempted: new Date().toISOString(),
    success_count: Number(existing.data?.success_count ?? 0) + (input.success ? 1 : 0),
    fail_count: Number(existing.data?.fail_count ?? 0) + (input.success ? 0 : 1),
    has_ads: input.hasAds,
    response_time_ms: input.responseTimeMs,
    last_error: input.lastError,
    updated_at: new Date().toISOString(),
  };

  if (existing.data?.id) {
    await admin.from('video_sources_cache').update(payload).eq('id', existing.data.id);
  } else {
    await admin.from('video_sources_cache').insert({
      ...payload,
      last_working: input.success ? new Date().toISOString() : null,
    });
  }
}
