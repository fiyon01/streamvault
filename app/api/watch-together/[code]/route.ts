import { createClient } from '@/lib/supabase/server';

// GET /api/watch-together/[code] — fetch session
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('watch_sessions')
      .select('*')
      .eq('session_code', code)
      .single();

    if (error) throw error;

    return Response.json({ success: true, session: data });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 404 });
  }
}

// POST /api/watch-together/[code] — join session
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: session, error: fetchError } = await supabase
      .from('watch_sessions')
      .select('*')
      .eq('session_code', code)
      .single();

    if (fetchError || !session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    const participants: any[] = session.participants || [];

    const alreadyJoined = user && participants.some((p: any) => p.userId === user.id);
    if (alreadyJoined) {
      return Response.json({ success: true, session, alreadyJoined: true });
    }

    const newParticipant = user
      ? {
          userId: user.id,
          name: user.email?.split('@')[0] || 'Guest',
          joined: true,
          profileLoaded: true,
        }
      : {
          userId: null,
          name: 'Guest',
          joined: true,
          profileLoaded: false,
          guestToken: crypto.randomUUID(),
        };

    const updatedParticipants = [...participants, newParticipant];

    const { data: updated, error: updateError } = await supabase
      .from('watch_sessions')
      .update({ participants: updatedParticipants })
      .eq('session_code', code)
      .select()
      .single();

    if (updateError) throw updateError;

    return Response.json({ success: true, session: updated });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
