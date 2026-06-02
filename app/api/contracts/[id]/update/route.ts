import { createClient } from '@/lib/supabase/server';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mode, status, nudge_paused_until } = await req.json();

    const { data, error } = await supabase
      .from('viewing_contracts')
      .update({
        mode,
        status,
        nudge_paused_until,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    return Response.json({ success: true, contract: data });

  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
