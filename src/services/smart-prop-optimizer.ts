import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';

/**
 * Smart Prop Count Optimizer
 * Calculates optimal prop counts based on:
 * - User experience research
 * - API call efficiency
 * - Sport popularity and engagement
 * - Time of day/week patterns
 */

// Smart Prop Configuration based on UX research and API efficiency
const SMART_PROP_CONFIG = {
  // Base prop counts per sport (optimized for UX and API efficiency)
  BASE_COUNTS: {
    NFL: 75,  // High engagement, prime betting sport
    NBA: 60,  // High volume, many games
    MLB: 45,  // Lower engagement, many games
    NHL: 40,  // Moderate engagement, fewer bettors
  },
  
  // Props per game (to calculate API calls needed)
  PROPS_PER_GAME: {
    NFL: 12,  // 6 props per team (QB, RB, WR1, WR2, TE, DEF)
    NBA: 10,  // 5 props per team (top players)
    MLB: 8,   // 4 props per team (key hitters/pitchers)
    NHL: 8,   // 4 props per team (forwards/goalies)
  },
  
  // Maximum games to process (API call limit)
  MAX_GAMES_TO_PROCESS: {
    NFL: 8,   // ~16 games per week, process 8 most relevant
    NBA: 6,   // ~15 games per day, process 6 most popular
    MLB: 6,   // ~15 games per day, process 6 most popular  
    NHL: 5,   // ~12 games per day, process 5 most popular
  },
  
  // Time-based multipliers for engagement
  TIME_MULTIPLIERS: {
    PEAK_HOURS: 1.2,      // 6PM-11PM local time
    WEEKEND: 1.15,        // Friday-Sunday
    GAME_DAY: 1.3,        // Day of games
    OFF_SEASON: 0.6,      // Reduced interest
    PLAYOFFS: 1.4,        // Increased interest
  },
  
  // User satisfaction thresholds (based on UX research)
  UX_THRESHOLDS: {
    MINIMUM_SATISFYING: 30,   // Below this, users feel limited
    OPTIMAL_RANGE: [50, 80],  // Sweet spot for user satisfaction
    OVERWHELMING: 120,        // Above this, choice paralysis
  },
  
  // API efficiency targets
  API_EFFICIENCY: {
    MAX_CALLS_PER_HOUR: 50,   // Conservative API usage
    MAX_CALLS_PER_DAY: 800,   // Daily limit buffer
    CACHE_DURATION_MINUTES: 15, // Balance freshness vs calls
    PRIORITY_REFRESH_MINUTES: 5, // High-priority props refresh faster
  }
};

export interface SmartPropMetrics {
  sport: string;
  recommendedCount: number;
  apiCallsRequired: number;
  userSatisfactionScore: number;
  efficiencyScore: number;
  reasoning: string[];
  timeFactors: string[];
}

class SmartPropOptimizer {
  private currentHour: number;
  private currentDay: number;
  private isWeekend: boolean;

  constructor() {
    const now = new Date();
    this.currentHour = now.getHours();
    this.currentDay = now.getDay();
    this.isWeekend = this.currentDay === 0 || this.currentDay === 6;
    
    logInfo('SmartPropOptimizer', 'Initialized smart prop count optimization system');
    logInfo('SmartPropOptimizer', `Current time factors: Hour ${this.currentHour}, ${this.isWeekend ? 'Weekend' : 'Weekday'}`);
  }

  // Calculate optimal prop count for a sport
  calculateOptimalPropCount(sport: string): SmartPropMetrics {
    const sportKey = sport.toUpperCase();
    const baseCount = SMART_PROP_CONFIG.BASE_COUNTS[sportKey as keyof typeof SMART_PROP_CONFIG.BASE_COUNTS] || 50;
    
    logAPI('SmartPropOptimizer', `Calculating optimal prop count for ${sport} (base: ${baseCount})`);
    
    // Apply time-based multipliers
    let adjustedCount = baseCount;
    const timeFactors: string[] = [];
    const reasoning: string[] = [];
    
    // Peak hours adjustment (6PM-11PM)
    if (this.currentHour >= 18 && this.currentHour <= 23) {
      adjustedCount *= SMART_PROP_CONFIG.TIME_MULTIPLIERS.PEAK_HOURS;
      timeFactors.push('Peak betting hours (6PM-11PM)');
      reasoning.push(`+20% for peak engagement hours`);
    }
    
    // Weekend adjustment
    if (this.isWeekend) {
      adjustedCount *= SMART_PROP_CONFIG.TIME_MULTIPLIERS.WEEKEND;
      timeFactors.push('Weekend increased activity');
      reasoning.push(`+15% for weekend engagement`);
    }
    
    // Sport-specific adjustments
    if (sportKey === 'NFL') {
      // NFL gets boost on Sundays, Mondays, Thursdays
      if (this.currentDay === 0 || this.currentDay === 1 || this.currentDay === 4) {
        adjustedCount *= SMART_PROP_CONFIG.TIME_MULTIPLIERS.GAME_DAY;
        timeFactors.push('NFL game day');
        reasoning.push(`+30% for NFL game day`);
      }
    } else if (sportKey === 'NBA' || sportKey === 'NHL') {
      // NBA/NHL get boost on weekdays (more games)
      if (!this.isWeekend) {
        adjustedCount *= 1.1;
        timeFactors.push('Weekday game schedule');
        reasoning.push(`+10% for weekday games`);
      }
    }
    
    // Round to reasonable number
    const recommendedCount = Math.round(adjustedCount);
    
    // Calculate API efficiency
    const maxGames = SMART_PROP_CONFIG.MAX_GAMES_TO_PROCESS[sportKey as keyof typeof SMART_PROP_CONFIG.MAX_GAMES_TO_PROCESS] || 6;
    const propsPerGame = SMART_PROP_CONFIG.PROPS_PER_GAME[sportKey as keyof typeof SMART_PROP_CONFIG.PROPS_PER_GAME] || 10;
    const apiCallsRequired = Math.ceil(recommendedCount / propsPerGame); // Calls needed to generate props
    
    // Calculate user satisfaction score (0-100)
    const userSatisfactionScore = this.calculateSatisfactionScore(recommendedCount);
    
    // Calculate efficiency score (0-100)
    const efficiencyScore = this.calculateEfficiencyScore(apiCallsRequired);
    
    // Add reasoning for final count
    reasoning.push(`Optimized for ${recommendedCount} props to balance UX and API efficiency`);
    reasoning.push(`Requires ~${apiCallsRequired} API calls with 15min caching`);
    
    const metrics: SmartPropMetrics = {
      sport: sport,
      recommendedCount: Math.max(SMART_PROP_CONFIG.UX_THRESHOLDS.MINIMUM_SATISFYING, recommendedCount),
      apiCallsRequired: apiCallsRequired,
      userSatisfactionScore: userSatisfactionScore,
      efficiencyScore: efficiencyScore,
      reasoning: reasoning,
      timeFactors: timeFactors
    };
    
    logSuccess('SmartPropOptimizer', `Optimal count for ${sport}: ${metrics.recommendedCount} props`);
    logInfo('SmartPropOptimizer', `UX Score: ${userSatisfactionScore}/100, Efficiency: ${efficiencyScore}/100`);
    
    return metrics;
  }

  // Calculate user satisfaction score based on prop count
  private calculateSatisfactionScore(propCount: number): number {
    const { MINIMUM_SATISFYING, OPTIMAL_RANGE, OVERWHELMING } = SMART_PROP_CONFIG.UX_THRESHOLDS;
    
    if (propCount < MINIMUM_SATISFYING) {
      // Linear scale from 0 to 60 for counts below minimum
      return Math.max(0, (propCount / MINIMUM_SATISFYING) * 60);
    } else if (propCount >= OPTIMAL_RANGE[0] && propCount <= OPTIMAL_RANGE[1]) {
      // Optimal range gets 85-100 score
      const rangePosition = (propCount - OPTIMAL_RANGE[0]) / (OPTIMAL_RANGE[1] - OPTIMAL_RANGE[0]);
      return 85 + (rangePosition * 15);
    } else if (propCount > OPTIMAL_RANGE[1] && propCount < OVERWHELMING) {
      // Declining satisfaction above optimal range
      const excessPosition = (propCount - OPTIMAL_RANGE[1]) / (OVERWHELMING - OPTIMAL_RANGE[1]);
      return 85 - (excessPosition * 25); // Drops from 85 to 60
    } else {
      // Choice paralysis territory
      return Math.max(30, 60 - ((propCount - OVERWHELMING) * 0.5));
    }
  }

  // Calculate API efficiency score
  private calculateEfficiencyScore(apiCalls: number): number {
    const { MAX_CALLS_PER_HOUR } = SMART_PROP_CONFIG.API_EFFICIENCY;
    
    if (apiCalls <= MAX_CALLS_PER_HOUR * 0.3) {
      return 100; // Very efficient
    } else if (apiCalls <= MAX_CALLS_PER_HOUR * 0.6) {
      return 85;  // Good efficiency
    } else if (apiCalls <= MAX_CALLS_PER_HOUR * 0.8) {
      return 70;  // Moderate efficiency
    } else if (apiCalls <= MAX_CALLS_PER_HOUR) {
      return 50;  // At limit
    } else {
      return Math.max(10, 50 - ((apiCalls - MAX_CALLS_PER_HOUR) * 2));
    }
  }

  // Get all sport recommendations
  getAllSportRecommendations(): { [sport: string]: SmartPropMetrics } {
    const recommendations: { [sport: string]: SmartPropMetrics } = {};
    
    Object.keys(SMART_PROP_CONFIG.BASE_COUNTS).forEach(sport => {
      recommendations[sport] = this.calculateOptimalPropCount(sport);
    });
    
    return recommendations;
  }

  // Get total API usage estimate
  getTotalAPIUsageEstimate(): {
    hourlyEstimate: number;
    dailyEstimate: number;
    recommendations: string[];
  } {
    const allRecommendations = this.getAllSportRecommendations();
    
    const totalHourlyCalls = Object.values(allRecommendations)
      .reduce((sum, metrics) => sum + metrics.apiCallsRequired, 0);
    
    const dailyEstimate = totalHourlyCalls * (24 / (SMART_PROP_CONFIG.API_EFFICIENCY.CACHE_DURATION_MINUTES / 60));
    
    const recommendations: string[] = [];
    
    if (totalHourlyCalls > SMART_PROP_CONFIG.API_EFFICIENCY.MAX_CALLS_PER_HOUR) {
      recommendations.push('Consider increasing cache duration to reduce API calls');
      recommendations.push('Prioritize high-engagement sports during peak hours');
    }
    
    if (dailyEstimate > SMART_PROP_CONFIG.API_EFFICIENCY.MAX_CALLS_PER_DAY) {
      recommendations.push('Daily usage may exceed limits - implement smart scheduling');
      recommendations.push('Use longer cache for low-priority sports');
    } else {
      recommendations.push('API usage within efficient limits');
      recommendations.push('Current configuration provides good UX/efficiency balance');
    }
    
    return {
      hourlyEstimate: totalHourlyCalls,
      dailyEstimate: Math.round(dailyEstimate),
      recommendations
    };
  }

  // Get dynamic prop count based on current conditions
  getDynamicPropCount(sport: string, userEngagement?: 'low' | 'medium' | 'high'): number {
    const baseMetrics = this.calculateOptimalPropCount(sport);
    let dynamicCount = baseMetrics.recommendedCount;
    
    // Adjust based on user engagement if provided
    if (userEngagement) {
      switch (userEngagement) {
        case 'high':
          dynamicCount = Math.round(dynamicCount * 1.2);
          break;
        case 'low':
          dynamicCount = Math.round(dynamicCount * 0.8);
          break;
        // 'medium' uses base count
      }
    }
    
    // Ensure within reasonable bounds
    return Math.max(
      SMART_PROP_CONFIG.UX_THRESHOLDS.MINIMUM_SATISFYING,
      Math.min(dynamicCount, SMART_PROP_CONFIG.UX_THRESHOLDS.OVERWHELMING)
    );
  }

  // Get cache strategy recommendations
  getCacheStrategy(): {
    primarySports: string[];
    secondarySports: string[];
    cacheSchedule: { [sport: string]: number };
  } {
    const allRecommendations = this.getAllSportRecommendations();
    
    // Sort sports by engagement score
    const sortedSports = Object.entries(allRecommendations)
      .sort(([,a], [,b]) => b.userSatisfactionScore - a.userSatisfactionScore);
    
    const primarySports = sortedSports.slice(0, 2).map(([sport]) => sport);
    const secondarySports = sortedSports.slice(2).map(([sport]) => sport);
    
    const cacheSchedule: { [sport: string]: number } = {};
    
    // Primary sports get shorter cache (fresher data)
    primarySports.forEach(sport => {
      cacheSchedule[sport] = SMART_PROP_CONFIG.API_EFFICIENCY.PRIORITY_REFRESH_MINUTES;
    });
    
    // Secondary sports get longer cache (efficiency)
    secondarySports.forEach(sport => {
      cacheSchedule[sport] = SMART_PROP_CONFIG.API_EFFICIENCY.CACHE_DURATION_MINUTES;
    });
    
    return {
      primarySports,
      secondarySports,
      cacheSchedule
    };
  }
}

// Export singleton instance
export const smartPropOptimizer = new SmartPropOptimizer();
export default smartPropOptimizer;
