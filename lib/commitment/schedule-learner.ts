import { createClient } from '@/lib/supabase/server';

export async function learnWatchSchedule(userId: string) {
  const supabase = await createClient();

  // Fetch watch history for the user over the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: history, error } = await supabase
    .from('watch_history')
    .select('watched_at')
    .eq('user_id', userId)
    .gte('watched_at', thirtyDaysAgo.toISOString());

  if (error) {
    console.error('Error fetching watch history:', error);
    return generateDefaultSchedule(userId);
  }

  if (!history || history.length < 5) {
    // Not enough data to build a reliable schedule
    return generateDefaultSchedule(userId);
  }

  // Group by day of week and hour
  // scheduleMatrix[day][hour] = count
  const scheduleMatrix: Record<number, Record<number, number>> = {};
  for (let i = 0; i < 7; i++) {
    scheduleMatrix[i] = {};
    for (let j = 0; j < 24; j++) {
      scheduleMatrix[i][j] = 0;
    }
  }

  history.forEach((record) => {
    const date = new Date(record.watched_at);
    const day = date.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = date.getHours(); // 0 - 23
    scheduleMatrix[day][hour]++;
  });

  // Find the peak viewing hour for each day
  const user_watch_schedules = [];
  for (let day = 0; day < 7; day++) {
    let peakHour = 20; // Default to 8 PM
    let maxViews = -1;
    let totalViewsDay = 0;

    for (let hour = 0; hour < 24; hour++) {
      const views = scheduleMatrix[day][hour];
      totalViewsDay += views;
      if (views > maxViews) {
        maxViews = views;
        peakHour = hour;
      }
    }
    
    // Only record a schedule if there was some activity that day
    // or provide a default for inactive days to keep the contract solid
    user_watch_schedules.push({
      user_id: userId,
      day_of_week: day,
      preferred_hour: peakHour,
      confidence: totalViewsDay > 0 ? Math.min(1.0, maxViews / totalViewsDay) : 0,
    });
  }

  return user_watch_schedules;
}

function generateDefaultSchedule(userId: string) {
  // Default to evenings, 8 PM (20:00) every day with low confidence
  const schedule = [];
  for (let i = 0; i < 7; i++) {
    schedule.push({
      user_id: userId,
      day_of_week: i,
      preferred_hour: 20,
      confidence: 0.1,
    });
  }
  return schedule;
}
