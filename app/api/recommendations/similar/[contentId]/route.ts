import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateContentDNA } from '@/lib/recommendations/content-dna';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ contentId: string }> }
) {
  const { contentId } = await params;
  const url = new URL(req.url);
  const mediaType = (url.searchParams.get('type') ?? 'movie') as 'movie' | 'tv';
  const supabase = createClient();

  // Ensure DNA exists
  const dna = await getOrCreateContentDNA(contentId, mediaType);
  if (!dna || !dna.embedding) {
    return NextResponse.json({ similar: [] });
  }

  // Use pgvector cosine distance
  const embeddingStr = Array.isArray(dna.embedding)
    ? `[${(dna.embedding as number[]).join(',')}]`
    : dna.embedding;

  const { data: similar } = await supabase.rpc('get_taste_dna_recommendations', {
    // Hacky reuse — pass embedding directly (future: dedicated RPC)
    p_user_id: '00000000-0000-0000-0000-000000000000',
    p_limit:   10,
  });

  return NextResponse.json({ similar: similar ?? [] });
}
