import { createClient } from '@/lib/supabase/server';
import { importNetflixHistory } from '@/lib/archaeology/history-importer';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { csvContent } = await req.json();
    if (!csvContent) {
      return Response.json({ error: 'Missing CSV content' }, { status: 400 });
    }

    // Process the CSV
    const result = await importNetflixHistory(csvContent, user.id);

    return Response.json({ 
      success: true, 
      total: result.total,
      matched: result.matched,
      unmatched: result.unmatched
    });

  } catch (error: any) {
    console.error('Archaeology Import Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
