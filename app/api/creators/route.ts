import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { listCreators, seedCreatorCatalogue } from '@/lib/youtube/creators';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const category = url.searchParams.get('category') ?? undefined;
  const country = url.searchParams.get('country') ?? undefined;
  const limit = Number(url.searchParams.get('limit') ?? 60);

  try {
    const supabase = createClient();
    const creators = await listCreators(supabase, {
      category,
      country,
      limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 60,
    });

    return Response.json({ creators });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to load creators' },
      { status: 500 },
    );
  }
}

export async function POST() {
  try {
    const admin = createAdminClient();
    const seeded = await seedCreatorCatalogue(admin);
    return Response.json({ seeded });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to seed creators' },
      { status: 500 },
    );
  }
}
