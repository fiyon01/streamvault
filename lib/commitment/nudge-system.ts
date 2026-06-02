import { createClient } from '@/lib/supabase/server';

// Mock nudge sender as requested
async function sendNudge(userId: string, pushData: any) {
  console.log(`[NUDGE SENT] To User: ${userId}`, pushData);
  // Real implementation for push notifications (e.g., FCM, APNs, Web Push) would be integrated here
  return true;
}

export async function processDailyNudges() {
  const supabase = await createClient();
  
  const now = new Date();
  const currentDay = now.getDay();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  
  // Identify if we need to nudge for the current hour or the upcoming hour.
  // Assuming the cron runs every 15 mins (e.g., 19:45 -> target 20:00).
  let targetHour = currentHour;
  if (currentMinutes >= 45) {
    targetHour = (currentHour + 1) % 24;
  }
  
  // Fetch users whose watch schedule matches the target hour for today
  const { data: schedules, error: scheduleError } = await supabase
    .from('user_watch_schedules')
    .select('user_id, preferred_hour')
    .eq('day_of_week', currentDay)
    .eq('preferred_hour', targetHour);
    
  if (scheduleError) {
    console.error('Error fetching watch schedules:', scheduleError);
    return;
  }
  
  if (!schedules || schedules.length === 0) {
    return;
  }
  
  const userIds = schedules.map(s => s.user_id);
  
  // Find active commitment contracts for these users
  const { data: contracts, error: contractError } = await supabase
    .from('commitment_contracts')
    .select('*')
    .in('user_id', userIds)
    .eq('status', 'active');
    
  if (contractError) {
    console.error('Error fetching contracts:', contractError);
    return;
  }
  
  if (!contracts || contracts.length === 0) {
    return;
  }
  
  // Group by user id to send one nudge per user
  const processedUserIds = new Set<string>();

  for (const contract of contracts) {
    if (processedUserIds.has(contract.user_id)) {
      continue; // Skip if we already nudged the user for another contract
    }

    try {
      await sendNudge(contract.user_id, {
        title: "Time for your show! 🍿",
        body: `Your commitment contract for ${contract.content_title || 'your next binge'} is calling. Ready to watch?`,
        contractId: contract.id,
        contentId: contract.content_id
      });
      
      // Log the nudge to prevent duplicate sending in case the cron triggers repeatedly
      await supabase.from('nudge_logs').insert({
        user_id: contract.user_id,
        contract_id: contract.id,
        sent_at: now.toISOString(),
        nudge_type: 'schedule_nudge'
      });

      processedUserIds.add(contract.user_id);
    } catch (err) {
      console.error(`Failed to send nudge for contract ${contract.id}:`, err);
    }
  }
}
