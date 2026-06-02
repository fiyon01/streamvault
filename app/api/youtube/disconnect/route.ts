import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function DELETE() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Sign in to disconnect YouTube.' }, { status: 401 });
  }

  const db = (() => {
    try {
      return createAdminClient();
    } catch {
      return supabase;
    }
  })();

  const [{ error: connectionError }, { error: importedError }] = await Promise.all([
    db.from('youtube_connections').delete().eq('user_id', user.id),
    db.from('user_youtube_imported_channels').delete().eq('user_id', user.id),
  ]);

  if (connectionError || importedError) {
    return Response.json(
      { error: connectionError?.message || importedError?.message || 'Unable to disconnect YouTube.' },
      { status: 500 },
    );
  }

  return Response.json({ disconnected: true });
}
