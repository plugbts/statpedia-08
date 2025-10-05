import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';

export interface StatpediaRatingFactors {
  hitRateScore: number;           // 0-100 points (30% weight)
  projectionGapScore: number;     // 0-100 points (20% weight)
  aiPredictionScore: number;      // 0-100 points (20% weight)
  opponentScore: number;          // 0-100 points (15% weight)
  marketConfidenceScore: number;  // 0-100 points (10% weight)
  recencyScore: number;           // 0-100 points (5% weight)
}

export interface StatpediaRating {
  overall: number;                // 40-95 (normalized to slate)
  grade: 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'D-' | 'F';
  color: 'green' | 'yellow' | 'red';
  confidence: 'High' | 'Medium' | 'Low';
  factors: StatpediaRatingFactors;
  reasoning: string[];
  breakdown: {
    hitRate: number;
    projectionGap: number;
    aiPrediction: number;
    opponent: number;
    marketConfidence: number;
    recency: number;
  };
}

export class StatpediaRatingService {
  private slateProps: any[] = [];
  private slateNormalization: { min: number; max: number } | null = null;
  
  /**
   * Set the slate of props for normalization
   */
  setSlateProps(props: any[]): void {
    this.slateProps = props;
    this.calculateSlateNormalization();
  }
  
  /**
   * Calculate comprehensive Statpedia Rating for a player prop
   */
  calculateRating(prop: any, overUnderContext: 'over' | 'under' | 'both' = 'both'): StatpediaRating {
    const factors: StatpediaRatingFactors = {
      hitRateScore: this.calculateHitRateScore(prop),
      projectionGapScore: this.calculateProjectionGapScore(prop, overUnderContext),
      aiPredictionScore: this.calculateAIPredictionScore(prop, overUnderContext),
      opponentScore: this.calculateOpponentScore(prop),
      marketConfidenceScore: this.calculateMarketConfidenceScore(prop),
      recencyScore: this.calculateRecencyScore(prop)
    };

    // Blend multiple factors with weights
    const compositeScore = 
      (0.30 * factors.hitRateScore) +
      (0.20 * factors.projectionGapScore) +
      (0.20 * factors.aiPredictionScore) +
      (0.15 * factors.opponentScore) +
      (0.10 * factors.marketConfidenceScore) +
      (0.05 * factors.recencyScore);

    // Normalize to slate (40-95 range)
    const normalizedScore = this.normalizeToSlate(compositeScore);
    
    // Cap volatility and boost consensus
    const finalScore = this.applyCapsAndBoosts(normalizedScore, prop);

    const rating: StatpediaRating = {
      overall: Math.round(finalScore),
      grade: this.getGrade(finalScore),
      color: this.getColor(finalScore),
      confidence: this.getConfidenceLevel(finalScore, factors),
      factors,
      reasoning: this.generateReasoning(factors, prop),
      breakdown: {
        hitRate: Math.round(factors.hitRateScore),
        projectionGap: Math.round(factors.projectionGapScore),
        aiPrediction: Math.round(factors.aiPredictionScore),
        opponent: Math.round(factors.opponentScore),
        marketConfidence: Math.round(factors.marketConfidenceScore),
        recency: Math.round(factors.recencyScore)
      }
    };

    logAPI('StatpediaRating', `Calculated rating for ${prop.playerName} ${prop.propType}: ${rating.overall}/95 (${rating.grade})`);
    
    return rating;
  }

  /**
   * Calculate slate normalization parameters
   */
  private calculateSlateNormalization(): void {
    if (this.slateProps.length === 0) {
      this.slateNormalization = { min: 0, max: 100 };
      return;
    }

    // Calculate composite scores for all props in slate
    const compositeScores = this.slateProps.map(prop => {
      const factors = {
        hitRateScore: this.calculateHitRateScore(prop),
        projectionGapScore: this.calculateProjectionGapScore(prop, 'both'),
        aiPredictionScore: this.calculateAIPredictionScore(prop, 'both'),
        opponentScore: this.calculateOpponentScore(prop),
        marketConfidenceScore: this.calculateMarketConfidenceScore(prop),
        recencyScore: this.calculateRecencyScore(prop)
      };

      return (0.30 * factors.hitRateScore) +
             (0.20 * factors.projectionGapScore) +
             (0.20 * factors.aiPredictionScore) +
             (0.15 * factors.opponentScore) +
             (0.10 * factors.marketConfidenceScore) +
             (0.05 * factors.recencyScore);
    });

    const min = Math.min(...compositeScores);
    const max = Math.max(...compositeScores);
    
    this.slateNormalization = { min, max };
    
    logInfo('StatpediaRating', `Slate normalization: min=${min.toFixed(2)}, max=${max.toFixed(2)}`);
  }

  /**
   * Normalize score to slate (40-95 range)
   */
  private normalizeToSlate(compositeScore: number): number {
    if (!this.slateNormalization) {
      return Math.max(40, Math.min(95, compositeScore));
    }

    const { min, max } = this.slateNormalization;
    
    if (max === min) {
      return 67; // Middle of range if all scores are identical
    }

    // Normalize to 0-1 range
    const normalized = (compositeScore - min) / (max - min);
    
    // Scale to 40-95 range
    return 40 + (normalized * 55);
  }

  /**
   * Apply caps and boosts
   */
  private applyCapsAndBoosts(score: number, prop: any): number {
    let finalScore = score;

    // Cap volatility: if std dev is huge, reduce rating
    if (this.slateProps.length > 10) {
      const compositeScores = this.slateProps.map(p => {
        const factors = {
          hitRateScore: this.calculateHitRateScore(p),
          projectionGapScore: this.calculateProjectionGapScore(p, 'both'),
          aiPredictionScore: this.calculateAIPredictionScore(p, 'both'),
          opponentScore: this.calculateOpponentScore(p),
          marketConfidenceScore: this.calculateMarketConfidenceScore(p),
          recencyScore: this.calculateRecencyScore(p)
        };
        return (0.30 * factors.hitRateScore) + (0.20 * factors.projectionGapScore) + 
               (0.20 * factors.aiPredictionScore) + (0.15 * factors.opponentScore) + 
               (0.10 * factors.marketConfidenceScore) + (0.05 * factors.recencyScore);
      });
      
      const mean = compositeScores.reduce((a, b) => a + b, 0) / compositeScores.length;
      const variance = compositeScores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / compositeScores.length;
      const stdDev = Math.sqrt(variance);
      
      // If volatility is high, reduce extreme scores
      if (stdDev > 20) {
        const distanceFromMean = Math.abs(score - 67.5); // 67.5 is middle of 40-95 range
        if (distanceFromMean > 20) {
          finalScore = 67.5 + (score - 67.5) * 0.8; // Reduce extreme scores by 20%
        }
      }
    }

    // Boost consensus: if 5+ books agree, bump rating
    const sportsbookCount = prop.availableSportsbooks?.length || 0;
    if (sportsbookCount >= 5) {
      finalScore += 2; // Small boost for consensus
    }

    return Math.max(40, Math.min(95, finalScore));
  }

  /**
   * Hit Rate Score (0-100 points, 35% weight)
   * Based on player's historical performance on this prop type
   */
  private calculateHitRateScore(prop: any): number {
    // Use confidence as proxy for hit rate if available
    const baseConfidence = prop.confidence || 0.5;
    let score = baseConfidence * 100;

    // Bonus for high hit rate
    if (prop.hitRate) {
      score = prop.hitRate * 100;
    }

    // Season stats bonus
    if (prop.seasonStats?.hitRate) {
      const seasonHitRate = prop.seasonStats.hitRate;
      if (seasonHitRate > 0.65) score += 10;
      else if (seasonHitRate > 0.55) score += 5;
      else if (seasonHitRate < 0.35) score -= 10;
      else if (seasonHitRate < 0.45) score -= 5;
    }

    // Recent form adjustment
    if (prop.recentForm) {
      switch (prop.recentForm.toLowerCase()) {
        case 'hot':
        case 'excellent':
          score += 15;
          break;
        case 'good':
        case 'strong':
          score += 10;
          break;
        case 'average':
        case 'neutral':
          score += 0;
          break;
        case 'cold':
        case 'poor':
          score -= 15;
          break;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * AI Prediction Score (0-100 points, 20% weight)
   * Based on AI recommendation confidence and alignment
   */
  private calculateAIPredictionScore(prop: any, overUnderContext: 'over' | 'under' | 'both' = 'both'): number {
    if (!prop.aiPrediction) return 50; // Neutral if no AI prediction

    const baseConfidence = prop.aiPrediction.confidence || 0.5;
    let score = baseConfidence * 100; // 0-100 base points

    // Context-aware scoring based on over/under filter
    if (overUnderContext !== 'both') {
      const aiRecommendation = prop.aiPrediction.recommended;
      
      // If AI recommendation matches the filter context, boost the score
      if (aiRecommendation === overUnderContext) {
        score += 20; // Bonus for alignment
      } else {
        score -= 30; // Penalty for misalignment
      }
    }

    // Bonus points for strong AI confidence
    if (baseConfidence >= 0.9) score += 20;
    else if (baseConfidence >= 0.8) score += 15;
    else if (baseConfidence >= 0.7) score += 10;
    else if (baseConfidence >= 0.6) score += 5;

    // Penalty for very low confidence
    if (baseConfidence < 0.4) score -= 20;
    else if (baseConfidence < 0.5) score -= 10;

    // TODO: Add more sophisticated AI factors here
    // - Historical accuracy of AI predictions for this player/prop type
    // - Market consensus vs AI prediction
    // - Player-specific AI model performance
    // - Situational factors (weather, injuries, etc.)

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Projection Gap Score (0-100 points, 20% weight)
   * Analyzes the gap between our projection and the line
   */
  private calculateProjectionGapScore(prop: any, overUnderContext: 'over' | 'under' | 'both' = 'both'): number {
    if (!prop.overOdds || !prop.underOdds) return 50; // Neutral if missing odds

    const overImplied = this.americanOddsToImpliedProbability(prop.overOdds);
    const underImplied = this.americanOddsToImpliedProbability(prop.underOdds);
    const totalImplied = overImplied + underImplied;
    
    // Calculate market efficiency (closer to 100% = more efficient)
    const efficiency = totalImplied;
    let score = 50; // Base score

    // Better value when market is less efficient (more juice/vig)
    if (efficiency > 1.15) score -= 20; // High vig = bad value
    else if (efficiency > 1.10) score -= 10;
    else if (efficiency < 1.05) score += 20; // Low vig = good value
    else if (efficiency < 1.08) score += 10;

    // Factor in odds range (extreme odds can be valuable)
    const avgOdds = (Math.abs(prop.overOdds) + Math.abs(prop.underOdds)) / 2;
    if (avgOdds > 200) score += 15; // Plus odds often have value
    else if (avgOdds < 110) score -= 10; // Heavy favorites less value

    // Context-aware odds value scoring
    if (overUnderContext !== 'both') {
      const targetOdds = overUnderContext === 'over' ? prop.overOdds : prop.underOdds;
      const targetImplied = this.americanOddsToImpliedProbability(targetOdds);
      
      // Better value for the selected over/under
      if (targetImplied < 0.45) score += 15; // Good value on underdog
      else if (targetImplied > 0.65) score -= 10; // Poor value on heavy favorite
    }

    // Expected Value bonus
    if (prop.expectedValue > 0.05) score += 20;
    else if (prop.expectedValue > 0.02) score += 10;
    else if (prop.expectedValue < -0.05) score -= 15;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Opponent Score (0-100 points, 15% weight)
   * Based on opponent's defensive strength against this prop type
   */
  private calculateOpponentScore(prop: any): number {
    let score = 50; // Neutral base

    // Use opponent abbreviation to determine defensive strength
    const opponent = prop.opponentAbbr || prop.opponent;
    
    // Simple opponent strength mapping (can be enhanced with real data)
    const opponentStrength: Record<string, number> = {
      // Strong defenses (lower scores for offensive props)
      'BUF': 30, 'SF': 35, 'DAL': 40, 'PHI': 40, 'MIA': 45,
      // Average defenses
      'KC': 50, 'GB': 50, 'LAR': 50, 'TB': 50, 'NO': 50,
      // Weak defenses (higher scores for offensive props)
      'CAR': 70, 'ARI': 65, 'CHI': 60, 'NYG': 60, 'WAS': 60
    };

    if (opponent && opponentStrength[opponent]) {
      score = opponentStrength[opponent];
    }

    // Adjust based on prop type
    if (prop.propType?.toLowerCase().includes('passing')) {
      // For passing props, consider pass defense
      if (opponent === 'BUF' || opponent === 'SF') score -= 10;
      else if (opponent === 'CAR' || opponent === 'ARI') score += 10;
    } else if (prop.propType?.toLowerCase().includes('rushing')) {
      // For rushing props, consider run defense
      if (opponent === 'SF' || opponent === 'DAL') score -= 10;
      else if (opponent === 'CAR' || opponent === 'CHI') score += 10;
    } else if (prop.propType?.toLowerCase().includes('receiving')) {
      // For receiving props, consider pass defense
      if (opponent === 'BUF' || opponent === 'PHI') score -= 10;
      else if (opponent === 'ARI' || opponent === 'WAS') score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Market Confidence Score (0-100 points, 15% weight)
   * Based on market consensus and data quality
   */
  private calculateMarketConfidenceScore(prop: any): number {
    const baseConfidence = prop.confidence || 0.5;
    let score = baseConfidence * 100;

    // Bonus for high confidence
    if (baseConfidence >= 0.9) score += 20;
    else if (baseConfidence >= 0.8) score += 15;
    else if (baseConfidence >= 0.7) score += 10;

    // Bonus for exact API data
    if (prop.isExactAPIData) score += 10;

    // Bonus for multiple sportsbooks (consensus)
    const sportsbookCount = prop.availableSportsbooks?.length || 1;
    if (sportsbookCount >= 8) score += 20;
    else if (sportsbookCount >= 5) score += 15;
    else if (sportsbookCount >= 3) score += 10;
    else if (sportsbookCount >= 2) score += 5;

    // Factor in odds consistency across books
    if (prop.allSportsbookOdds && prop.allSportsbookOdds.length > 1) {
      const overOdds = prop.allSportsbookOdds.map(o => o.overOdds).filter(o => o);
      const underOdds = prop.allSportsbookOdds.map(o => o.underOdds).filter(o => o);
      
      if (overOdds.length > 1) {
        const overRange = Math.max(...overOdds) - Math.min(...overOdds);
        if (overRange < 20) score += 15; // Tight consensus
        else if (overRange > 50) score -= 10; // Wide disagreement
      }
    }

    // Penalty for stale data
    if (prop.lastUpdate) {
      const updateAge = Date.now() - new Date(prop.lastUpdate).getTime();
      const hoursOld = updateAge / (1000 * 60 * 60);
      
      if (hoursOld > 24) score -= 20;
      else if (hoursOld > 12) score -= 15;
      else if (hoursOld > 6) score -= 10;
      else if (hoursOld < 1) score += 10; // Fresh data bonus
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Recency Score (0-100 points, 10% weight)
   * Player's recent performance and trends
   */
  private calculateRecencyScore(prop: any): number {
    let score = 50; // Neutral base

    // Factor in recent form
    if (prop.recentForm) {
      switch (prop.recentForm.toLowerCase()) {
        case 'hot':
        case 'excellent':
          score += 30;
          break;
        case 'good':
        case 'strong':
          score += 20;
          break;
        case 'average':
        case 'neutral':
          score += 5;
          break;
        case 'cold':
        case 'poor':
          score -= 20;
          break;
      }
    }

    // Factor in last 5 games performance
    if (prop.last5Games && Array.isArray(prop.last5Games)) {
      const avg = prop.last5Games.reduce((a, b) => a + b, 0) / prop.last5Games.length;
      if (avg > prop.line * 1.2) score += 20; // Consistently over
      else if (avg > prop.line * 1.1) score += 10;
      else if (avg < prop.line * 0.8) score -= 15; // Consistently under
      else if (avg < prop.line * 0.9) score -= 10;
    }

    // Season stats bonus
    if (prop.seasonStats?.hitRate) {
      if (prop.seasonStats.hitRate > 0.65) score += 15;
      else if (prop.seasonStats.hitRate > 0.55) score += 10;
      else if (prop.seasonStats.hitRate < 0.35) score -= 15;
      else if (prop.seasonStats.hitRate < 0.45) score -= 10;
    }

    // Rest days factor
    if (prop.restDays !== undefined) {
      if (prop.restDays >= 7) score += 10; // Well rested
      else if (prop.restDays >= 4) score += 5;
      else if (prop.restDays <= 2) score -= 10; // Short rest
    }

    return Math.max(0, Math.min(100, score));
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
   * Get letter grade based on overall score (40-95 range)
   * Updated for slate-relative rating system
   */
  private getGrade(score: number): StatpediaRating['grade'] {
    if (score >= 90) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 80) return 'A-';
    if (score >= 75) return 'B+';
    if (score >= 70) return 'B';
    if (score >= 65) return 'B-';
    if (score >= 60) return 'C+';
    if (score >= 55) return 'C';
    if (score >= 50) return 'C-';
    if (score >= 45) return 'D+';
    if (score >= 42) return 'D';
    if (score >= 40) return 'D-';
    return 'F';
  }

  /**
   * Get color coding based on score (40-95 range)
   */
  private getColor(score: number): StatpediaRating['color'] {
    if (score >= 70) return 'green';
    if (score >= 55) return 'yellow';
    return 'red';
  }

  /**
   * Get confidence level (40-95 range)
   */
  private getConfidenceLevel(score: number, factors: StatpediaRatingFactors): StatpediaRating['confidence'] {
    const highFactors = Object.values(factors).filter(f => f >= 70);
    
    if (score >= 75 && highFactors.length >= 3) return 'High';
    if (score >= 60 && highFactors.length >= 2) return 'Medium';
    return 'Low';
  }

  /**
   * Generate reasoning for the rating
   */
  private generateReasoning(factors: StatpediaRatingFactors, prop: any): string[] {
    const reasoning: string[] = [];

    // Hit Rate reasoning
    if (factors.hitRateScore >= 80) {
      reasoning.push(`Excellent hit rate (${Math.round(factors.hitRateScore)}%)`);
    } else if (factors.hitRateScore <= 30) {
      reasoning.push(`Low hit rate - proceed with caution`);
    }

    // Projection Gap reasoning
    if (factors.projectionGapScore >= 80) {
      reasoning.push(`Strong value vs. market line`);
    } else if (factors.projectionGapScore <= 30) {
      reasoning.push(`Poor value - high vig detected`);
    }

    // AI Prediction reasoning
    if (factors.aiPredictionScore >= 80) {
      reasoning.push(`Strong AI confidence (${Math.round((prop.aiPrediction?.confidence || 0.5) * 100)}%)`);
    } else if (factors.aiPredictionScore <= 30) {
      reasoning.push(`Low AI confidence - proceed with caution`);
    }

    // Opponent reasoning
    if (factors.opponentScore >= 80) {
      reasoning.push(`Favorable matchup vs. ${prop.opponentAbbr}`);
    } else if (factors.opponentScore <= 30) {
      reasoning.push(`Tough matchup vs. ${prop.opponentAbbr}`);
    }

    // Market Confidence reasoning
    if (factors.marketConfidenceScore >= 80) {
      reasoning.push(`High market consensus (${prop.availableSportsbooks?.length || 0} books)`);
    } else if (factors.marketConfidenceScore <= 30) {
      reasoning.push(`Limited market data or disagreement`);
    }

    // Recency reasoning
    if (factors.recencyScore >= 80) {
      reasoning.push(`Player in excellent recent form`);
    } else if (factors.recencyScore <= 30) {
      reasoning.push(`Player struggling recently`);
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
