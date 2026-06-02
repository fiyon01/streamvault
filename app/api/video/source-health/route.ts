import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

function cleanText(value: string | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanNumber(value: string | null, fallback = 0) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : fallback;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Source health lookup failed';
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tmdbId = cleanText(url.searchParams.get('tmdbId'));
    const mediaType = url.searchParams.get('mediaType') === 'tv' ? 'tv' : 'movie';
    const seasonNumber = mediaType === 'tv' ? cleanNumber(url.searchParams.get('season'), 1) : 0;
    const episodeNumber = mediaType === 'tv' ? cleanNumber(url.searchParams.get('episode'), 1) : 0;

    if (!tmdbId) {
      return NextResponse.json({ error: 'Missing tmdbId' }, { status: 400 });
    }

    const admin = createAdminClient();
    const [cacheResult, healthResult] = await Promise.all([
      admin
        .from('video_sources_cache')
        .select('source_name,source_id,success_count,fail_count,last_working,last_attempted,last_error,response_time_ms,has_ads')
        .eq('content_id', tmdbId)
        .eq('media_type', mediaType)
        .eq('season_number', seasonNumber)
        .eq('episode_number', episodeNumber),
      admin
        .from('source_health')
        .select('source_name,source_id,has_ads,total_checks,successful_checks,failed_checks,avg_response_time_ms,uptime_percentage,last_success_at,last_failure_at,last_check_at'),
    ]);

    if (cacheResult.error) throw cacheResult.error;
    if (healthResult.error) throw healthResult.error;

    return NextResponse.json({
      contentSources: cacheResult.data ?? [],
      globalSources: healthResult.data ?? [],
    });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
