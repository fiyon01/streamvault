import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { seedCreatorCatalogue } from '@/lib/youtube/creators';
import { getSeedCreator } from '@/lib/youtube/creator-catalogue';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ channelId: string }> },
) {
  const { channelId } = await params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Sign in to follow creators.' }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const seed = getSeedCreator(channelId);

    if (seed) {
      await seedCreatorCatalogue(admin);
    } else {
      const { data: existing, error: lookupError } = await admin
        .from('youtube_creators')
        .select('channel_id')
        .eq('channel_id', channelId)
        .maybeSingle();

      if (lookupError) throw lookupError;
      if (!existing) {
        return Response.json({ error: 'This creator is not indexed in StreamVault yet.' }, { status: 404 });
      }
    }

    const { error } = await admin
      .from('user_creator_follows')
      .upsert({
        user_id: user.id,
        channel_id: channelId,
        notification_enabled: true,
      }, { onConflict: 'user_id,channel_id' });

    if (error) throw error;
  } catch (error) {
    console.error('creator follow failed', { channelId, error });
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to follow creator.' },
      { status: 500 },
    );
  }

  return Response.json({ following: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ channelId: string }> },
) {
  const { channelId } = await params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Sign in to manage creator follows.' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('user_creator_follows')
    .delete()
    .eq('user_id', user.id)
    .eq('channel_id', channelId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ following: false });
}
