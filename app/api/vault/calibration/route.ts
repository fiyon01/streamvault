import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { SIGNAL_WEIGHTS } from '@/lib/recommendations/types';

type CalibrationBody = {
  loved?: string[];
  overrated?: string[];
  abandoned?: string;
  abandonedReason?: string;
};

type CalibrationRow = {
  loved_titles: string[] | null;
  overrated_titles: string[] | null;
  abandoned_title: string | null;
  abandoned_reason: string | null;
  standards_summary: string | null;
  completed_at: string | null;
  updated_at: string | null;
};

function cleanTitle(value: unknown) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function uniqueTitles(values: unknown, limit: number) {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const titles: string[] = [];
  for (const raw of values) {
    const title = cleanTitle(raw);
    if (!title) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    titles.push(title);
    if (titles.length >= limit) break;
  }
  return titles;
}

function slug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'untitled';
}

function summarizeStandards(loved: string[], overrated: string[], abandoned: string, abandonedReason: string) {
  const loveSignal = loved.length ? `Loved: ${loved.join(', ')}` : 'Loved titles not set';
  const overSignal = overrated.length ? `Overrated: ${overrated.join(', ')}` : 'Overrated titles not set';
  const abandonSignal = abandoned
    ? `Abandoned: ${abandoned}${abandonedReason ? ` because ${abandonedReason}` : ''}`
    : 'Abandoned title not set';

  return `${loveSignal}. ${overSignal}. ${abandonSignal}. Use this as a cold-start taste standard: protect what they love, avoid what they reject, and watch for the abandon reason.`;
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ calibrated: false });
  }

  const db = (() => {
    try {
      return createAdminClient();
    } catch {
      return supabase;
    }
  })();

  const { data, error } = await db
    .from('user_taste_calibrations')
    .select('loved_titles,overrated_titles,abandoned_title,abandoned_reason,standards_summary,completed_at,updated_at')
    .eq('user_id', user.id)
    .maybeSingle<CalibrationRow>();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    calibrated: Boolean(data),
    loved: data?.loved_titles ?? [],
    overrated: data?.overrated_titles ?? [],
    abandoned: data?.abandoned_title ?? '',
    abandonedReason: data?.abandoned_reason ?? '',
    standardsSummary: data?.standards_summary ?? '',
    completedAt: data?.completed_at ?? null,
    updatedAt: data?.updated_at ?? null,
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as CalibrationBody;
  const loved = uniqueTitles(body.loved, 5);
  const overrated = uniqueTitles(body.overrated, 3);
  const abandoned = cleanTitle(body.abandoned);
  const abandonedReason = cleanTitle(body.abandonedReason).slice(0, 240);

  if (loved.length !== 5 || overrated.length !== 3 || !abandoned) {
    return Response.json(
      { error: 'Calibration requires exactly 5 loved titles, 3 overrated titles, and 1 abandoned title.' },
      { status: 400 },
    );
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Sign in to calibrate VAULT.' }, { status: 401 });
  }

  const db = (() => {
    try {
      return createAdminClient();
    } catch {
      return supabase;
    }
  })();

  const standardsSummary = summarizeStandards(loved, overrated, abandoned, abandonedReason);
  const now = new Date().toISOString();

  const { error: calibrationError } = await db
    .from('user_taste_calibrations')
    .upsert({
      user_id: user.id,
      loved_titles: loved,
      overrated_titles: overrated,
      abandoned_title: abandoned,
      abandoned_reason: abandonedReason || null,
      standards_summary: standardsSummary,
      completed_at: now,
      updated_at: now,
    }, { onConflict: 'user_id' });

  if (calibrationError) {
    return Response.json({ error: calibrationError.message }, { status: 500 });
  }

  const signalRows = [
    ...loved.map((title) => ({
      user_id: user.id,
      tmdb_id: `calibration:loved:${slug(title)}`,
      signal_type: 'completed_loved',
      signal_weight: SIGNAL_WEIGHTS.completed_loved,
      context: { source: 'first_session_calibration', title, media_type: 'unknown' },
    })),
    ...overrated.map((title) => ({
      user_id: user.id,
      tmdb_id: `calibration:overrated:${slug(title)}`,
      signal_type: 'thumbs_down',
      signal_weight: SIGNAL_WEIGHTS.thumbs_down,
      context: { source: 'first_session_calibration', title, media_type: 'unknown' },
    })),
    {
      user_id: user.id,
      tmdb_id: `calibration:abandoned:${slug(abandoned)}`,
      signal_type: 'abandoned_mid',
      signal_weight: SIGNAL_WEIGHTS.abandoned_mid,
      context: { source: 'first_session_calibration', title: abandoned, reason: abandonedReason || null, media_type: 'unknown' },
    },
  ];

  await db
    .from('user_signals')
    .delete()
    .eq('user_id', user.id)
    .in('tmdb_id', signalRows.map((row) => row.tmdb_id));

  const { error: signalsError } = await db
    .from('user_signals')
    .insert(signalRows);

  if (signalsError) {
    return Response.json({ error: signalsError.message }, { status: 500 });
  }

  const { data: existingProfile } = await db
    .from('profiles')
    .select('preferences')
    .eq('id', user.id)
    .maybeSingle<{ preferences: Record<string, unknown> | null }>();

  await db.from('profiles').upsert({
    id: user.id,
    preferences: {
      ...(existingProfile?.preferences ?? {}),
      first_session_calibration: {
        loved,
        overrated,
        abandoned,
        abandonedReason,
        standardsSummary,
        updatedAt: now,
      },
    },
    updated_at: now,
  }, { onConflict: 'id' });

  await db.from('user_taste_profiles').upsert({
    user_id: user.id,
    profile_summary: standardsSummary,
    confidence_score: 0.45,
    data_points: 9,
    last_computed: now,
    updated_at: now,
  }, { onConflict: 'user_id' });

  await db.from('recommendation_cache').delete().eq('user_id', user.id);

  return Response.json({
    calibrated: true,
    loved,
    overrated,
    abandoned,
    abandonedReason,
    standardsSummary,
  });
}
