import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { callDeepSeek, hasLLMProvider } from '@/lib/recommendations/deepseek';

export async function POST(req: Request) {
  try {
    const { sessionId, prompt } = await req.json();
    if (!sessionId || !prompt) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();
    const { data: session } = await admin
      .from('vault_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    if (!hasLLMProvider()) return NextResponse.json({ error: 'No key' }, { status: 500 });

    const title = (await callDeepSeek(
      [
        { role: 'system', content: 'You are a summarizer. Summarize the user input into a 3 to 5 word title. Return ONLY the title, no quotes, no extra text.' },
        { role: 'user', content: prompt },
      ],
      { max_tokens: 10, temperature: 0.3 }
    )).trim().replace(/["']/g, '');

    if (title) {
      await admin.from('vault_sessions').update({ title }).eq('id', sessionId);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
