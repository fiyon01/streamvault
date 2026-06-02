import { createClient } from '@/lib/supabase/server';
import { computeGroupIntersection } from '@/lib/watch-dna/intersection-engine';

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const supabase = await createClient();
    const { contentType, runtimeMax } = await req.json();

    const { data: session, error } = await supabase
      .from('watch_sessions')
      .select('*')
      .eq('session_code', code)
      .single();

    if (error || !session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    const participants: any[] = session.participants || [];
    const userIds = participants
      .filter((p: any) => p.userId)
      .map((p: any) => p.userId);

    if (userIds.length === 0) {
      return Response.json({ error: 'No registered participants to match' }, { status: 400 });
    }

    const intersection = await computeGroupIntersection(userIds, {
      contentType: contentType || 'either',
      runtimeMax,
    });

    await supabase
      .from('watch_sessions')
      .update({ intersection, status: 'active' })
      .eq('session_code', code);

    return Response.json({ success: true, intersection });
  } catch (error: any) {
    console.error('DNA Match Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
