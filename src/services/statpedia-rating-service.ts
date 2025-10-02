import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';

export interface StatpediaRatingFactors {
  aiPredictionScore: number;      // 0-25 points
  oddsValueScore: number;         // 0-25 points  
  confidenceScore: number;        // 0-20 points
  recentFormScore: number;        // 0-15 points
  marketConsensusScore: number;   // 0-15 points
}

export interface StatpediaRating {
  overall: number;                // 0-100
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
  color: 'green' | 'yellow' | 'red';
  confidence: 'High' | 'Medium' | 'Low';
  factors: StatpediaRatingFactors;
  reasoning: string[];
}

export class StatpediaRatingService {
  
  /**
   * Calculate comprehensive Statpedia Rating for a player prop
   */
  calculateRating(prop: any): StatpediaRating {
    const factors: StatpediaRatingFactors = {
      aiPredictionScore: this.calculateAIPredictionScore(prop),
      oddsValueScore: this.calculateOddsValueScore(prop),
      confidenceScore: this.calculateConfidenceScore(prop),
      recentFormScore: this.calculateRecentFormScore(prop),
      marketConsensusScore: this.calculateMarketConsensusScore(prop)
    };

    const overall = Math.round(
      factors.aiPredictionScore + 
      factors.oddsValueScore + 
      factors.confidenceScore + 
      factors.recentFormScore + 
      factors.marketConsensusScore
    );

    const rating: StatpediaRating = {
      overall: Math.max(0, Math.min(100, overall)),
      grade: this.getGrade(overall),
      color: this.getColor(overall),
      confidence: this.getConfidenceLevel(overall, factors),
      factors,
      reasoning: this.generateReasoning(factors, prop)
    };

    logAPI('StatpediaRating', `Calculated rating for ${prop.playerName} ${prop.propType}: ${rating.overall}/100 (${rating.grade})`);
    
    return rating;
  }

  /**
   * AI Prediction Score (0-25 points)
   * Factors in AI recommendation confidence and alignment
   */
  private calculateAIPredictionScore(prop: any): number {
    if (!prop.aiPrediction) return 12; // Neutral if no AI prediction

    const baseConfidence = prop.aiPrediction.confidence || 0.5;
    let score = baseConfidence * 20; // 0-20 base points

    // Bonus points for strong AI confidence
    if (baseConfidence >= 0.8) score += 5;
    else if (baseConfidence >= 0.7) score += 3;
    else if (baseConfidence >= 0.6) score += 1;

    // Penalty for very low confidence
    if (baseConfidence < 0.4) score -= 3;

    return Math.max(0, Math.min(25, score));
  }

  /**
   * Odds Value Score (0-25 points)
   * Analyzes if the odds provide good value based on implied probability
   */
  private calculateOddsValueScore(prop: any): number {
    if (!prop.overOdds || !prop.underOdds) return 10; // Neutral if missing odds

    const overImplied = this.americanOddsToImpliedProbability(prop.overOdds);
    const underImplied = this.americanOddsToImpliedProbability(prop.underOdds);
    const totalImplied = overImplied + underImplied;
    
    // Calculate market efficiency (closer to 100% = more efficient)
    const efficiency = totalImplied;
    let score = 15; // Base score

    // Better value when market is less efficient (more juice/vig)
    if (efficiency > 1.15) score -= 5; // High vig = bad value
    else if (efficiency > 1.10) score -= 2;
    else if (efficiency < 1.05) score += 5; // Low vig = good value
    else if (efficiency < 1.08) score += 3;

    // Factor in odds range (extreme odds can be valuable)
    const avgOdds = (Math.abs(prop.overOdds) + Math.abs(prop.underOdds)) / 2;
    if (avgOdds > 200) score += 3; // Plus odds often have value
    else if (avgOdds < 110) score -= 2; // Heavy favorites less value

    // Expected Value bonus
    if (prop.expectedValue > 0.05) score += 5;
    else if (prop.expectedValue > 0.02) score += 3;
    else if (prop.expectedValue < -0.05) score -= 3;

    return Math.max(0, Math.min(25, score));
  }

  /**
   * Confidence Score (0-20 points)
   * Based on overall prop confidence and data quality
   */
  private calculateConfidenceScore(prop: any): number {
    const baseConfidence = prop.confidence || 0.5;
    let score = baseConfidence * 15; // 0-15 base points

    // Bonus for high confidence
    if (baseConfidence >= 0.9) score += 5;
    else if (baseConfidence >= 0.8) score += 3;
    else if (baseConfidence >= 0.7) score += 2;

    // Bonus for exact API data
    if (prop.isExactAPIData) score += 2;

    // Bonus for multiple sportsbooks
    const sportsbookCount = prop.availableSportsbooks?.length || 1;
    if (sportsbookCount >= 5) score += 3;
    else if (sportsbookCount >= 3) score += 2;
    else if (sportsbookCount >= 2) score += 1;

    return Math.max(0, Math.min(20, score));
  }

  /**
   * Recent Form Score (0-15 points)
   * Player's recent performance and trends
   */
  private calculateRecentFormScore(prop: any): number {
    let score = 7; // Neutral base

    // Factor in recent form
    if (prop.recentForm) {
      switch (prop.recentForm.toLowerCase()) {
        case 'hot':
        case 'excellent':
          score += 6;
          break;
        case 'good':
        case 'strong':
          score += 4;
          break;
        case 'average':
        case 'neutral':
          score += 1;
          break;
        case 'cold':
        case 'poor':
          score -= 3;
          break;
      }
    }

    // Factor in last 5 games performance
    if (prop.last5Games && Array.isArray(prop.last5Games)) {
      const avg = prop.last5Games.reduce((a, b) => a + b, 0) / prop.last5Games.length;
      if (avg > prop.line * 1.2) score += 3; // Consistently over
      else if (avg > prop.line * 1.1) score += 2;
      else if (avg < prop.line * 0.8) score -= 2; // Consistently under
      else if (avg < prop.line * 0.9) score -= 1;
    }

    // Season stats bonus
    if (prop.seasonStats?.hitRate) {
      if (prop.seasonStats.hitRate > 0.65) score += 2;
      else if (prop.seasonStats.hitRate > 0.55) score += 1;
      else if (prop.seasonStats.hitRate < 0.35) score -= 2;
      else if (prop.seasonStats.hitRate < 0.45) score -= 1;
    }

    return Math.max(0, Math.min(15, score));
  }

  /**
   * Market Consensus Score (0-15 points)
   * How the prop aligns with market expectations
   */
  private calculateMarketConsensusScore(prop: any): number {
    let score = 8; // Neutral base

    // Factor in number of available sportsbooks (more = better consensus)
    const sportsbookCount = prop.availableSportsbooks?.length || 1;
    if (sportsbookCount >= 8) score += 4;
    else if (sportsbookCount >= 5) score += 3;
    else if (sportsbookCount >= 3) score += 2;
    else if (sportsbookCount >= 2) score += 1;

    // Factor in odds consistency across books
    if (prop.allSportsbookOdds && prop.allSportsbookOdds.length > 1) {
      const overOdds = prop.allSportsbookOdds.map(o => o.overOdds).filter(o => o);
      const underOdds = prop.allSportsbookOdds.map(o => o.underOdds).filter(o => o);
      
      if (overOdds.length > 1) {
        const overRange = Math.max(...overOdds) - Math.min(...overOdds);
        if (overRange < 20) score += 2; // Tight consensus
        else if (overRange > 50) score -= 1; // Wide disagreement
      }
    }

    // Penalty for stale data
    if (prop.lastUpdate) {
      const updateAge = Date.now() - new Date(prop.lastUpdate).getTime();
      const hoursOld = updateAge / (1000 * 60 * 60);
      
      if (hoursOld > 24) score -= 3;
      else if (hoursOld > 12) score -= 2;
      else if (hoursOld > 6) score -= 1;
      else if (hoursOld < 1) score += 1; // Fresh data bonus
    }

    return Math.max(0, Math.min(15, score));
  }

  /**
   * Convert American odds to implied probability
   */
  private americanOddsToImpliedProbability(odds: number): number {
    if (odds > 0) {
      return 100 / (odds + 100);
    } else {
      return Math.abs(odds) / (Math.abs(odds) + 100);
    }
  }

  /**
   * Get letter grade based on overall score
   */
  private getGrade(score: number): StatpediaRating['grade'] {
    if (score >= 90) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 80) return 'B+';
    if (score >= 75) return 'B';
    if (score >= 70) return 'C+';
    if (score >= 65) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }

  /**
   * Get color coding based on score
   */
  private getColor(score: number): StatpediaRating['color'] {
    if (score >= 75) return 'green';
    if (score >= 60) return 'yellow';
    return 'red';
  }

  /**
   * Get confidence level
   */
  private getConfidenceLevel(score: number, factors: StatpediaRatingFactors): StatpediaRating['confidence'] {
    const highFactors = Object.values(factors).filter(f => f >= (f === factors.aiPredictionScore ? 20 : f === factors.oddsValueScore ? 20 : f === factors.confidenceScore ? 16 : f === factors.recentFormScore ? 12 : 12));
    
    if (score >= 80 && highFactors.length >= 3) return 'High';
    if (score >= 65 && highFactors.length >= 2) return 'Medium';
    return 'Low';
  }

  /**
   * Generate reasoning for the rating
   */
  private generateReasoning(factors: StatpediaRatingFactors, prop: any): string[] {
    const reasoning: string[] = [];

    // AI Prediction reasoning
    if (factors.aiPredictionScore >= 20) {
      reasoning.push(`Strong AI confidence (${Math.round((prop.aiPrediction?.confidence || 0.5) * 100)}%)`);
    } else if (factors.aiPredictionScore <= 8) {
      reasoning.push(`Low AI confidence - proceed with caution`);
    }

    // Odds Value reasoning
    if (factors.oddsValueScore >= 20) {
      reasoning.push(`Excellent odds value detected`);
    } else if (factors.oddsValueScore <= 8) {
      reasoning.push(`Poor odds value - high vig`);
    }

    // Confidence reasoning
    if (factors.confidenceScore >= 16) {
      reasoning.push(`High data quality and consensus`);
    } else if (factors.confidenceScore <= 8) {
      reasoning.push(`Limited data or low consensus`);
    }

    // Recent Form reasoning
    if (factors.recentFormScore >= 12) {
      reasoning.push(`Player in excellent recent form`);
    } else if (factors.recentFormScore <= 4) {
      reasoning.push(`Player struggling recently`);
    }

    // Market reasoning
    if (factors.marketConsensusScore >= 12) {
      reasoning.push(`Strong market consensus across sportsbooks`);
    } else if (factors.marketConsensusScore <= 6) {
      reasoning.push(`Limited market data or disagreement`);
    }

    // Default reasoning if none specific
    if (reasoning.length === 0) {
      reasoning.push(`Balanced analysis across all factors`);
    }

    return reasoning;
  }
}

// Export singleton instance
export const statpediaRatingService = new StatpediaRatingService();
