import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { enrichContent, syncContentMetadata, METADATA_SOURCES, type MetadataSource } from '@/lib/metadata';

function validSources(value: unknown): MetadataSource[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const allowed = new Set<string>(METADATA_SOURCES);
  const sources = value.filter((source): source is MetadataSource =>
    typeof source === 'string' && allowed.has(source)
  );
  return sources.length ? sources : undefined;
}

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const tmdbId = String(body.tmdbId || body.tmdb_id || '').trim();
    const mediaType = body.mediaType || body.media_type;
    const title = String(body.title || '').trim();

    if (!tmdbId || !title || !['movie', 'tv'].includes(mediaType)) {
      return NextResponse.json(
        { error: 'tmdbId, title, and mediaType movie|tv are required' },
        { status: 400 }
      );
    }

    const enrichment = await enrichContent({
      tmdbId,
      mediaType,
      title,
      year: body.year ? Number(body.year) : undefined,
      voteAverage: body.voteAverage ?? body.vote_average,
      voteCount: body.voteCount ?? body.vote_count,
      sources: validSources(body.sources),
    });

    await syncContentMetadata(enrichment);

    return NextResponse.json({
      ok: true,
      tmdbId,
      mediaType,
      sources: enrichment.sources,
      metadata: enrichment.metadata,
      enrichedAt: enrichment.enrichedAt,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Metadata enrichment failed' }, { status: 500 });
  }
}
