import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateExplanation } from '@/lib/recommendations/explanation-engine';

export async function POST(req: Request) {
  try {
    const { tmdbId, mediaType } = await req.json();
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ explanation: 'Log in for personalized explanations.' });

    const explanation = await generateExplanation(user.id, String(tmdbId), mediaType);
    return NextResponse.json({ explanation });
  } catch (e: any) {
    return NextResponse.json({ explanation: 'A strong match for your taste profile.' });
  }
}
