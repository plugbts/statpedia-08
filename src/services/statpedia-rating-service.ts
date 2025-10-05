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
  private slateStats: { [mode: string]: { min: number; max: number } } = {};
  
  /**
   * Set the slate of props for normalization
   */
  setSlateProps(props: any[]): void {
    this.slateProps = props;
    this.calculateSlateNormalization();
    this.calculateSlateStats();
  }

  /**
   * Calculate slate statistics for per-mode normalization
   */
  private calculateSlateStats(): void {
    if (this.slateProps.length === 0) {
      this.slateStats = { over: { min: 0, max: 100 }, under: { min: 0, max: 100 } };
      return;
    }

    // Calculate composite scores for over and under modes
    const overComposites = this.slateProps.map(prop => this.preComposite(prop, 'over'));
    const underComposites = this.slateProps.map(prop => this.preComposite(prop, 'under'));

    this.slateStats = {
      over: { 
        min: Math.min(...overComposites), 
        max: Math.max(...overComposites) 
      },
      under: { 
        min: Math.min(...underComposites), 
        max: Math.max(...underComposites) 
      }
    };

    logInfo('StatpediaRating', `Slate stats - Over: ${this.slateStats.over.min.toFixed(2)}-${this.slateStats.over.max.toFixed(2)}, Under: ${this.slateStats.under.min.toFixed(2)}-${this.slateStats.under.max.toFixed(2)}`);
  }

  /**
   * Pre-compute composite score without normalization/boosts
   */
  private preComposite(prop: any, mode: 'over' | 'under'): number {
    const factors = {
      hitRateScore: this.calculateHitRateScore(prop, mode),
      projectionGapScore: this.calculateProjectionGapScore(prop, mode),
      aiPredictionScore: this.calculateAIPredictionScore(prop, mode),
      opponentScore: this.calculateOpponentScore(prop, mode),
      marketConfidenceScore: this.calculateMarketConfidenceScore(prop),
      recencyScore: this.calculateRecencyScore(prop)
    };

    return (0.35 * this.safeScore(factors.hitRateScore)) +
           (0.25 * this.safeScore(factors.projectionGapScore)) +
           (0.15 * this.safeScore(factors.aiPredictionScore)) +
           (0.15 * this.safeScore(factors.opponentScore)) +
           (0.07 * this.safeScore(factors.marketConfidenceScore)) +
           (0.03 * this.safeScore(factors.recencyScore));
  }
  
  /**
   * Calculate comprehensive Statpedia Rating for a player prop
   * New side-aware composite with per-mode slate normalization
   */
  calculateRating(prop: any, overUnderContext: 'over' | 'under' | 'both' = 'both'): StatpediaRating {
    // Compute factor scores (existing factor functions are reused)
    const factors: StatpediaRatingFactors = {
      hitRateScore: this.calculateHitRateScore(prop, overUnderContext),               // side-aware if possible
      projectionGapScore: this.calculateProjectionGapScore(prop, overUnderContext),   // side-aware gap
      aiPredictionScore: this.calculateAIPredictionScore(prop, overUnderContext),     // side-aware model delta
      opponentScore: this.calculateOpponentScore(prop, overUnderContext),             // flip for Under if needed
      marketConfidenceScore: this.calculateMarketConfidenceScore(prop),
      recencyScore: this.calculateRecencyScore(prop)
    };

    // Rebalanced weights:
    // - Hit rate and projection gap should lead
    // - AI prediction supports gap but shouldn't dominate
    // - Opponent and market confidence provide context
    // - Recency is a small nudge
    const compositeScore =
      (0.35 * this.safeScore(factors.hitRateScore)) +
      (0.25 * this.safeScore(factors.projectionGapScore)) +
      (0.15 * this.safeScore(factors.aiPredictionScore)) +
      (0.15 * this.safeScore(factors.opponentScore)) +
      (0.07 * this.safeScore(factors.marketConfidenceScore)) +
      (0.03 * this.safeScore(factors.recencyScore));

    // Normalize to mode-specific slate into 40–95 band.
    // IMPORTANT: normalize using the distribution of current slate scores for the selected mode.
    const normalizedScore = this.normalizeToSlateMode(compositeScore, overUnderContext, { min: 40, max: 95 });

    // Apply bounded boosts/penalties WITHOUT shrinking the spread:
    // - Volatility penalty (reduce up to 7 points)
    // - Consensus boost (increase up to 5 points)
    const adjustedScore = this.applyBoundedAdjustments(normalizedScore, prop);

    const final = Math.round(this.clamp(adjustedScore, 40, 95));

    const rating: StatpediaRating = {
      overall: final,
      grade: this.getGrade(final),                     // updated thresholds below
      color: this.getColor(final),                     // keep your existing color function
      confidence: this.getConfidenceLevel(final, factors),
      factors,
      reasoning: this.generateReasoning(factors, prop),
      breakdown: {
        hitRate: Math.round(this.safeScore(factors.hitRateScore)),
        projectionGap: Math.round(this.safeScore(factors.projectionGapScore)),
        aiPrediction: Math.round(this.safeScore(factors.aiPredictionScore)),
        opponent: Math.round(this.safeScore(factors.opponentScore)),
        marketConfidence: Math.round(this.safeScore(factors.marketConfidenceScore)),
        recency: Math.round(this.safeScore(factors.recencyScore))
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
  private calculateHitRateScore(prop: any, overUnderContext: 'over' | 'under' | 'both' = 'both'): number {
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
   * Projection Gap Score (0-100 points, 25% weight)
   * Analyzes the gap between our projection and the line
   * Side-aware: favors Over for positive gap, Under for negative gap
   */
  private calculateProjectionGapScore(prop: any, overUnderContext: 'over' | 'under' | 'both' = 'both'): number {
    const projection = Number(prop.projection ?? prop.modelProjection ?? 0);
    const line = Number(prop.line ?? 0);
    const gap = projection - line; // + favors Over, - favors Under

    // Magnitude is useful; direction matters with side:
    const mag = Math.abs(gap);
    const base = this.scale(mag, 0.5, 15, 20, 100); // small gap -> 20, large -> 100

    if (overUnderContext === 'both') return base;
    
    const directionalBonus = this.clamp(this.scale(gap, -20, 20, -10, 10), -10, 10);
    // Over: positive gap should get a small boost; Under: negative gap gets a boost
    return this.clamp(overUnderContext === 'over' ? (base + Math.max(0, directionalBonus)) : (base + Math.max(0, -directionalBonus)), 0, 100);
  }

  /**
   * Opponent Score (0-100 points, 15% weight)
   * Based on opponent's defensive strength against this prop type
   * Side-aware: strong defense benefits Under, weak defense benefits Over
   */
  private calculateOpponentScore(prop: any, overUnderContext: 'over' | 'under' | 'both' = 'both'): number {
    const rank = Number(prop.opponentRank ?? 16); // 1=best defense, 32=worst
    const base = this.scale(32 - rank, 0, 31, 20, 100); // worse defense -> higher score
    if (overUnderContext === 'both') return this.clamp(base, 0, 100);
    
    // Under: strong defense should be helpful -> invert around midpoint
    const inverted = 100 - base;
    return this.clamp(overUnderContext === 'under' ? inverted : base, 0, 100);
  }

  /**
   * Market Confidence Score (0-100 points, 7% weight)
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
   * Recency Score (0-100 points, 3% weight)
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
   * Helper functions for the new rating system
   */
  private clamp(n: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, n));
  }

  private safeScore(n: number): number {
    // Ensure factor scores remain in 0..100
    if (!Number.isFinite(n)) return 50;
    return this.clamp(n, 0, 100);
  }

  /**
   * Normalize to slate per mode (Over/Under), mapping min..max raw composite to 40..95.
   */
  private normalizeToSlateMode(rawComposite: number, mode: 'over' | 'under' | 'both', band: { min: number; max: number } = { min: 40, max: 95 }): number {
    // Acquire slate distribution for the current mode from a precomputed context
    const stats = this.slateStats?.[mode === 'both' ? 'over' : mode] || { min: rawComposite, max: rawComposite };
    const min = Number.isFinite(stats.min) ? stats.min : rawComposite;
    const max = Number.isFinite(stats.max) ? stats.max : rawComposite;

    if (max <= min) return band.min + (band.max - band.min) * 0.5; // flat slate fallback -> midpoint

    // Linear map rawComposite into [band.min, band.max]
    const scaled = band.min + ((rawComposite - min) / (max - min)) * (band.max - band.min);
    return this.clamp(scaled, band.min, band.max);
  }

  /**
   * Bounded adjustments: small, capped, and independent of slate min/max so we keep the spread intact.
   */
  private applyBoundedAdjustments(score: number, prop: any): number {
    const vol = Number(prop.stdDev ?? prop.volatility ?? 0);
    const books = Number(prop.sportsbooks ?? prop.bookCount ?? prop.availableSportsbooks?.length ?? 0);
    const consensus = Number(prop.consensusSpread ?? 0.05); // stdev across lines/prices

    // Volatility penalty: up to -7 points
    const volPenalty = this.clamp(this.scale(vol, 10, 60, 0, 7), 0, 7);

    // Consensus boost: up to +5 points (more books + tighter market)
    const booksBoost = this.scale(books, 1, 8, 0, 3);           // 0..3
    const tightnessBoost = this.scale(1 / Math.max(consensus, 0.01), 10, 200, 0, 2); // 0..2
    const consensusBoost = this.clamp(booksBoost + tightnessBoost, 0, 5);

    return score - volPenalty + consensusBoost;
  }

  /**
   * Generic scaler (maps x from [inMin,inMax] to [outMin,outMax])
   */
  private scale(x: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
    if (!Number.isFinite(x) || inMax === inMin) return (outMin + outMax) / 2;
    const t = (x - inMin) / (inMax - inMin);
    return outMin + this.clamp(t, 0, 1) * (outMax - outMin);
  }

  /**
   * Get letter grade based on overall score (40-95 range)
   * Updated thresholds: 95-90=A, 89-80=B, 79-70=C, 69-60=D, 59&lower=F
   */
  private getGrade(score: number): StatpediaRating['grade'] {
    if (score >= 95) return 'A';
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
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
