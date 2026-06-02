import { createClient } from '@/lib/supabase/server';
import { customAlphabet } from 'nanoid';

// Generate short human-readable codes like "VAULT-72"
const nanoid = customAlphabet('0123456789ABCDEFGHJKLMNPQRSTUVWXYZ', 5);

function generateSessionCode() {
  const prefix = ['MOVIE', 'VAULT', 'WATCH', 'PICKS', 'NIGHT'][Math.floor(Math.random() * 5)];
  return `${prefix}-${nanoid().slice(0, 2)}`;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const sessionCode = generateSessionCode();

    const creatorParticipant = user
      ? {
          userId: user.id,
          name: user.email?.split('@')[0] || 'You',
          joined: true,
          profileLoaded: true,
        }
      : {
          userId: null,
          name: 'Host',
          joined: true,
          profileLoaded: false,
          guestToken: crypto.randomUUID(),
        };

    const { data, error } = await supabase
      .from('watch_sessions')
      .insert({
        session_code: sessionCode,
        created_by: user?.id || null,
        participants: [creatorParticipant],
        status: 'waiting',
      })
      .select()
      .single();

    if (error) throw error;

    return Response.json({ success: true, code: sessionCode, session: data });
  } catch (error: any) {
    console.error('Watch Together Create Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
