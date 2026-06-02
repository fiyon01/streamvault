import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserTasteProfile } from '@/lib/recommendations/taste-dna';
import { buildMoodContext, getMoodWeights } from '@/lib/recommendations/mood-engine';
import { retrieveCandidates, generatePowerUserSummary } from '@/lib/recommendations/power-user';
import { computeExpandedTasteDNA } from '@/lib/recommendations/taste-dna-enhanced';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let profile = await getUserTasteProfile(user.id);
  if (!profile || profile.confidence_score < 0.1) {
    const built = await computeExpandedTasteDNA(user.id);
    if (built) profile = built as any;
  }

  if (!profile) {
    return NextResponse.json({ candidates: [], mode: 'standard', message: 'Not enough data yet.' });
  }

  const mood = buildMoodContext();
  const weights = getMoodWeights(mood);

  const result = await retrieveCandidates(user.id, profile, mood, weights);
  const summary = generatePowerUserSummary(result, profile);

  return NextResponse.json({
    candidates: result.candidates,
    blindSpots: result.blindSpots,
    mode: result.mode,
    powerUserStatus: result.powerUserStatus,
    totalFiltered: result.totalFiltered,
    summary,
  });
}
