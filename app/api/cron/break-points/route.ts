import { analyzeEpisodeBreakPoints } from '@/lib/commitment/break-point-analyzer';

export async function GET(req: Request) {
  // In production, secure this endpoint
  if (process.env.NODE_ENV === 'production') {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  try {
    // Expect contentId as a query parameter for manual or queued triggering
    const url = new URL(req.url);
    const contentId = url.searchParams.get('contentId');

    if (!contentId) {
      return Response.json({ error: 'contentId parameter is required' }, { status: 400 });
    }

    await analyzeEpisodeBreakPoints(parseInt(contentId, 10));
    return Response.json({ success: true, message: `Break points analyzed for ${contentId}` });
  } catch (error: any) {
    console.error('Break Point Cron Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
