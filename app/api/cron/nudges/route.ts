import { processDailyNudges } from '@/lib/commitment/nudge-system';

// This would be triggered by Vercel Cron every 30 minutes
export async function GET(req: Request) {
  // Verify cron secret in production
  if (process.env.NODE_ENV === 'production') {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  try {
    await processDailyNudges();
    return Response.json({ success: true, message: 'Nudges processed successfully' });
  } catch (error: any) {
    console.error('Nudge Cron Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
