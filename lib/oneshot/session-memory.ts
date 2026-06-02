import { ActiveOneShotSession } from './types';

export function adaptPoolAfterSkips(session: ActiveOneShotSession): ActiveOneShotSession {
  // Analyze fast skips and penalize remaining pool scores
  const FAST_SKIP_THRESHOLD_MS = 3000; // 3 seconds
  
  const fastSkips = session.skips.filter(skip => skip.timeSpentMs < FAST_SKIP_THRESHOLD_MS);
  
  if (fastSkips.length >= 3) {
    // User is fast skipping, likely losing interest or intent is mismatched
    // Let's re-sort or slightly randomize the remaining pool
    const remainingPool = session.pool.slice(session.currentIndex);
    
    // Penalize current intent score slightly for all remaining
    remainingPool.forEach(candidate => {
       candidate.scores.intentScore *= 0.9;
       candidate.scores.finalScore = (candidate.scores.tasteScore * 0.3) + 
                                     (candidate.scores.intentScore * 0.4) + 
                                     (candidate.scores.qualityScore * 0.2) + 
                                     (candidate.scores.noveltyScore * 0.1);
    });
    
    // Sort again based on updated final score
    remainingPool.sort((a, b) => b.scores.finalScore - a.scores.finalScore);
    
    session.pool = [
      ...session.pool.slice(0, session.currentIndex),
      ...remainingPool
    ];
  }
  
  return session;
}
