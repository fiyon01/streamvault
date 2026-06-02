import { createClient } from '@/lib/supabase/server';
import { learnWatchSchedule } from '@/lib/commitment/schedule-learner';
import { generateBingePlan } from '@/lib/commitment/binge-planner';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contentId, mode, bingeStartDate, bingeEndDate } = await req.json();

    if (!contentId || !mode) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let bingePlan = null;
    let scheduleData = null;

    if (mode === 'binge') {
      if (!bingeStartDate || !bingeEndDate) {
        return Response.json({ error: 'Binge mode requires start and end dates' }, { status: 400 });
      }
      bingePlan = await generateBingePlan(
        contentId, 
        user.id, 
        bingeStartDate, 
        bingeEndDate
      );
    } else if (mode === 'committed') {
      // Trigger schedule learning in background (or await it if fast enough)
      scheduleData = await learnWatchSchedule(user.id);
    }

    // Upsert the contract
    const { data, error } = await supabase
      .from('viewing_contracts')
      .upsert({
        user_id: user.id,
        content_id: contentId,
        mode,
        binge_start_date: bingeStartDate || null,
        binge_end_date: bingeEndDate || null,
        binge_plan: bingePlan,
        status: 'active',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id, content_id'
      })
      .select()
      .single();

    if (error) throw error;

    return Response.json({ 
      success: true, 
      contract: data,
      scheduleLearned: !!scheduleData
    });

  } catch (error: any) {
    console.error('Contract Creation Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
