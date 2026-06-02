import { MoodContext, RecommendationWeights } from './types';

export function buildMoodContext(explicitMood?: string): MoodContext {
  const now  = new Date();
  const hour = now.getHours();
  const day  = now.getDay();

  const timeOfDay: MoodContext['timeOfDay'] =
    hour >= 5  && hour < 12 ? 'morning'    :
    hour >= 12 && hour < 17 ? 'afternoon'  :
    hour >= 17 && hour < 22 ? 'evening'    :
                               'late_night';

  const dayType: MoodContext['dayType'] = (day === 0 || day === 6) ? 'weekend' : 'weekday';

  return {
    timeOfDay,
    dayType,
    explicitMood,
    moodConfidence: explicitMood ? 1.0 : 0.6,
  };
}

export function getMoodWeights(mood: MoodContext): RecommendationWeights {
  const w: RecommendationWeights = {
    tasteDNA:     0.40,
    moodMatch:    0.20,
    satisfaction: 0.20,
    social:       0.10,
    freshness:    0.05,
    quality:      0.05,
  };

  if (mood.timeOfDay === 'late_night') {
    w.moodMatch  += 0.10;
    w.tasteDNA   -= 0.10;
  }
  if (mood.dayType === 'weekend') {
    w.freshness  += 0.05;
    w.tasteDNA   -= 0.05;
  }
  if (mood.explicitMood) {
    w.moodMatch   = 0.60;
    w.tasteDNA    = 0.20;
    w.satisfaction= 0.10;
    w.social      = 0.05;
    w.freshness   = 0.05;
    w.quality     = 0.00;
  }

  return w;
}

// How well does content mood_tags match current mood context?
export function scoreMoodMatch(mood: MoodContext, moodTags: string[]): number {
  if (!moodTags || moodTags.length === 0) return 0.5;

  const tagsLower = moodTags.map(t => t.toLowerCase());

  const LATE_NIGHT_GOOD  = ['thriller', 'gripping', 'fast_paced', 'mystery', 'noir'];
  const LATE_NIGHT_BAD   = ['slow_burn', 'heavy', 'epic'];
  const MORNING_GOOD     = ['feel_good', 'cozy', 'lighthearted', 'comedy', 'wholesome'];
  const MORNING_BAD      = ['dark', 'violent', 'intense', 'tragic'];

  let score = 0.5;

  if (mood.timeOfDay === 'late_night') {
    score += tagsLower.filter(t => LATE_NIGHT_GOOD.includes(t)).length * 0.1;
    score -= tagsLower.filter(t => LATE_NIGHT_BAD.includes(t)).length * 0.1;
  }
  if (mood.timeOfDay === 'morning') {
    score += tagsLower.filter(t => MORNING_GOOD.includes(t)).length * 0.1;
    score -= tagsLower.filter(t => MORNING_BAD.includes(t)).length * 0.1;
  }
  if (mood.explicitMood) {
    const moodLower = mood.explicitMood.toLowerCase();
    score += tagsLower.filter(t => moodLower.includes(t) || t.includes(moodLower)).length * 0.15;
  }

  return Math.min(1, Math.max(0, score));
}
