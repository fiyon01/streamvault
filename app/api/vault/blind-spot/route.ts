import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBlindSpots } from '@/lib/recommendations/blind-spot';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const blindSpots = await getBlindSpots(user.id, 15);
  return NextResponse.json({ blindSpots });
}
