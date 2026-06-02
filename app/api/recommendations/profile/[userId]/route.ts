import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_taste_profiles')
    .select('pacing_preference, protagonist_affinity, moral_complexity, tone_affinity, world_type_affinity, emotional_core_affinity, theme_scores, profile_summary, confidence_score, data_points')
    .eq('user_id', userId)
    .single();

  const { data: cluster } = await supabase
    .from('user_cluster_memberships')
    .select('cluster:cluster_id(cluster_name, member_count), similarity')
    .eq('user_id', userId)
    .eq('is_primary', true)
    .single();

  return NextResponse.json({ profile, cluster });
}
