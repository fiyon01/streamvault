'use server';

import { createClient } from '@/lib/supabase/server';

export async function getPersonalizedRecommendations() {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Call the Postgres RPC function we created in the migration
  const { data, error } = await supabase.rpc('get_content_recommendations', {
    p_user_id: user.id,
    p_limit: 10
  });

  if (error) {
    console.error('Failed to fetch personalized recommendations', error);
    return [];
  }

  return data || [];
}
