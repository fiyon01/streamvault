import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { recordUserResponse } from '@/lib/recommendations/recommendation-log';

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { tmdbId, response, rejectionReason } = await req.json();

  if (!tmdbId || !response) {
    return NextResponse.json({ error: 'tmdbId and response are required' }, { status: 400 });
  }

  await recordUserResponse(user.id, tmdbId, response, rejectionReason);

  return NextResponse.json({ ok: true });
}
