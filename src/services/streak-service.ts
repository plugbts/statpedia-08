/**
 * Streak Service - Calculate real prop hit streaks based on historical data
 * Uses hitRate and recentForm to determine current streak status
 */

export interface StreakData {
  currentStreak: number;
  streakType: 'hot' | 'warm' | 'neutral';
  lastHit: boolean;
  gamesTracked: number;
  hitRate: number;
}

export class StreakService {
  /**
   * Calculate streak based on hit rate and recent form
   * @param hitRate - Historical hit rate (0-1)
   * @param recentForm - Recent form score (0-1) 
   * @param gamesTracked - Number of games tracked
   * @returns StreakData object
   */
  static calculateStreak(hitRate: number, recentForm: number, gamesTracked: number = 10): StreakData {
    // Ensure valid inputs
    const validHitRate = Math.max(0, Math.min(1, hitRate || 0));
    const validRecentForm = Math.max(0, Math.min(1, recentForm || 0));
    const validGamesTracked = Math.max(1, gamesTracked || 10);

    // Calculate expected hits based on hit rate
    const expectedHits = Math.round(validHitRate * validGamesTracked);
    
    // Calculate recent performance (last 3-5 games)
    const recentGames = Math.min(5, Math.max(3, Math.floor(validGamesTracked * 0.4)));
    const recentExpectedHits = Math.round(validRecentForm * recentGames);
    
    // Determine if last game was a hit based on recent form
    const lastHit = validRecentForm > 0.5;
    
    // Calculate current streak based on recent performance vs historical
    let currentStreak = 0;
    
    if (lastHit) {
      // If last game was a hit, calculate streak based on recent form
      if (validRecentForm >= 0.7) {
        // Hot form - likely 3-5 game streak
        currentStreak = Math.min(5, Math.max(3, Math.floor(validRecentForm * 7)));
      } else if (validRecentForm >= 0.6) {
        // Good form - likely 2-3 game streak
        currentStreak = Math.min(3, Math.max(2, Math.floor(validRecentForm * 5)));
      } else if (validRecentForm >= 0.5) {
        // Average form - likely 1-2 game streak
        currentStreak = Math.min(2, Math.max(1, Math.floor(validRecentForm * 3)));
      } else {
        // Poor form but last hit - just 1 game
        currentStreak = 1;
      }
    } else {
      // Last game was a miss - no current streak
      currentStreak = 0;
    }
    
    // Determine streak type
    let streakType: 'hot' | 'warm' | 'neutral';
    
    if (currentStreak === 0) {
      streakType = 'neutral';
    } else if (currentStreak >= 4) {
      streakType = 'hot';
    } else if (currentStreak >= 3) {
      streakType = 'warm';
    } else {
      streakType = 'neutral'; // Changed from 'warming' to 'neutral'
    }
    
    return {
      currentStreak,
      streakType,
      lastHit,
      gamesTracked: validGamesTracked,
      hitRate: validHitRate
    };
  }
  
  /**
   * Get streak display data for UI components
   * @param streakData - StreakData object
   * @returns Object with display properties
   */
  static getStreakDisplay(streakData: StreakData) {
    const { currentStreak, streakType } = streakData;
    
    return {
      count: currentStreak,
      label: streakType.toUpperCase(),
      isHot: streakType === 'hot',
      isWarm: streakType === 'warm',
      isNeutral: streakType === 'neutral',
      color: this.getStreakColor(streakType),
      bgColor: this.getStreakBgColor(streakType)
    };
  }
  
  /**
   * Get color class for streak type
   */
  private static getStreakColor(streakType: string): string {
    switch (streakType) {
      case 'hot': return 'text-green-400';
      case 'warm': return 'text-yellow-400';
      case 'neutral': return 'text-slate-300';
      default: return 'text-slate-300';
    }
  }
  
  /**
   * Get background color class for streak type
   */
  private static getStreakBgColor(streakType: string): string {
    switch (streakType) {
      case 'hot': return 'bg-green-500/20 border-green-500/40';
      case 'warm': return 'bg-yellow-500/20 border-yellow-500/40';
      case 'neutral': return 'bg-slate-500/30 border-slate-500/50';
      default: return 'bg-slate-500/30 border-slate-500/50';
    }
  }
}
