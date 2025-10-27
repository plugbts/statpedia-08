// Outlier-style EV Calculator
// Implements proper EV% calculation like Outlier sports betting platform

export interface EVCalculationResult {
  evPercentage: number;
  impliedProbability: number;
  trueWinProbability: number;
  vigRemovedProbability: number;
  profitIfWin: number;
  stake: number;
  recommendation: 'strong_bet' | 'good_bet' | 'neutral' | 'avoid' | 'strong_avoid';
}

export interface PropData {
  overOdds: number;
  underOdds: number;
  line: number;
  propType: string;
  playerName: string;
  hitRate?: number;
  recentForm?: number;
  confidence?: number;
}

class OutlierEVCalculator {
  private readonly stake = 100; // Standard stake for calculations

  /**
   * Calculate EV% using Outlier's methodology
   */
  calculateEV(propData: PropData, side: 'over' | 'under'): EVCalculationResult {
    const odds = side === 'over' ? propData.overOdds : propData.underOdds;
    
    // Step 1: Convert sportsbook odds to implied probability
    const impliedProbability = this.convertToImpliedProbability(odds);
    
    // Step 2: Remove vig by normalizing probabilities
    const overImplied = this.convertToImpliedProbability(propData.overOdds);
    const underImplied = this.convertToImpliedProbability(propData.underOdds);
    const totalImplied = overImplied + underImplied;
    
    const vigRemovedProbability = side === 'over' 
      ? overImplied / totalImplied 
      : underImplied / totalImplied;
    
    // Step 3: Estimate true win probability using model/projection
    const trueWinProbability = this.estimateTrueWinProbability(propData, side);
    
    // Step 4: Calculate EV
    const profitIfWin = this.calculateProfitIfWin(odds);
    const trueLossProbability = 1 - trueWinProbability;
    
    const ev = (trueWinProbability * profitIfWin) - (trueLossProbability * this.stake);
    
    // Step 5: Convert to EV%
    const evPercentage = (ev / this.stake) * 100;
    
    const recommendation = this.getRecommendation(evPercentage);
    
    return {
      evPercentage,
      impliedProbability,
      trueWinProbability,
      vigRemovedProbability,
      profitIfWin,
      stake: this.stake,
      recommendation
    };
  }

  /**
   * Convert American odds to implied probability
   */
  private convertToImpliedProbability(americanOdds: number): number {
    if (americanOdds > 0) {
      return 100 / (americanOdds + 100);
    } else {
      return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
    }
  }

  /**
   * Calculate profit if bet wins
   */
  private calculateProfitIfWin(americanOdds: number): number {
    if (americanOdds > 0) {
      return americanOdds; // Profit = odds amount
    } else {
      return (100 / Math.abs(americanOdds)) * 100; // Profit = (100 / |odds|) * stake
    }
  }

  /**
   * Estimate true win probability using model/projection
   * This is where we'd integrate with our AI model or use historical data
   */
  private estimateTrueWinProbability(propData: PropData, side: 'over' | 'under'): number {
    // Base probability from implied odds (vig removed)
    const overImplied = this.convertToImpliedProbability(propData.overOdds);
    const underImplied = this.convertToImpliedProbability(propData.underOdds);
    const totalImplied = overImplied + underImplied;
    
    const baseProbability = side === 'over' 
      ? overImplied / totalImplied 
      : underImplied / totalImplied;
    
    // Adjust based on available data
    let adjustment = 0;
    
    // Hit rate adjustment (if available)
    if (propData.hitRate !== undefined) {
      const hitRateAdjustment = (propData.hitRate - 0.5) * 0.1; // Max 10% adjustment
      adjustment += hitRateAdjustment;
    }
    
    // Recent form adjustment (if available)
    if (propData.recentForm !== undefined) {
      const formAdjustment = (propData.recentForm - 0.5) * 0.05; // Max 5% adjustment
      adjustment += formAdjustment;
    }
    
    // Confidence adjustment (if available)
    if (propData.confidence !== undefined) {
      const confidenceAdjustment = ((propData.confidence - 0.5) * 0.08); // Max 8% adjustment
      adjustment += confidenceAdjustment;
    }
    
    // Prop type specific adjustments
    adjustment += this.getPropTypeAdjustment(propData.propType, side);
    
    // Apply adjustment
    const adjustedProbability = baseProbability + adjustment;
    
    // Clamp to reasonable bounds
    return Math.max(0.1, Math.min(0.9, adjustedProbability));
  }

  /**
   * Get prop type specific adjustments
   */
  private getPropTypeAdjustment(propType: string, side: 'over' | 'under'): number {
    const lowerPropType = propType.toLowerCase();
    
    // Passing props tend to be more predictable
    if (lowerPropType.includes('passing yards')) {
      return 0.02; // Slight edge to over for passing yards
    }
    
    // Rushing props can be more volatile
    if (lowerPropType.includes('rushing yards')) {
      return side === 'over' ? 0.01 : -0.01;
    }
    
    // Receiving props
    if (lowerPropType.includes('receiving yards')) {
      return 0.015; // Slight edge to over
    }
    
    // Touchdown props are more volatile
    if (lowerPropType.includes('touchdown')) {
      return side === 'over' ? -0.02 : 0.02; // Slight edge to under
    }
    
    // Fantasy points tend to be more predictable
    if (lowerPropType.includes('fantasy')) {
      return 0.01;
    }
    
    return 0; // No adjustment for unknown prop types
  }

  /**
   * Get recommendation based on EV%
   */
  private getRecommendation(evPercentage: number): EVCalculationResult['recommendation'] {
    if (evPercentage >= 8) return 'strong_bet';
    if (evPercentage >= 3) return 'good_bet';
    if (evPercentage >= -2) return 'neutral';
    if (evPercentage >= -5) return 'avoid';
    return 'strong_avoid';
  }

  /**
   * Calculate EV for both sides and return the better one
   */
  calculateBestEV(propData: PropData): EVCalculationResult & { side: 'over' | 'under' } {
    const overEV = this.calculateEV(propData, 'over');
    const underEV = this.calculateEV(propData, 'under');
    
    if (overEV.evPercentage > underEV.evPercentage) {
      return { ...overEV, side: 'over' };
    } else {
      return { ...underEV, side: 'under' };
    }
  }

  /**
   * Get EV color class for display
   */
  getEVColorClass(evPercentage: number): string {
    if (evPercentage >= 5) return 'text-green-500';
    if (evPercentage >= 0) return 'text-green-400';
    if (evPercentage >= -3) return 'text-yellow-500';
    if (evPercentage >= -6) return 'text-orange-500';
    return 'text-red-500';
  }

  /**
   * Format EV percentage for display
   */
  formatEVPercentage(evPercentage: number): string {
    const sign = evPercentage >= 0 ? '+' : '';
    return `${sign}${evPercentage.toFixed(1)}%`;
  }
}

export const outlierEVCalculator = new OutlierEVCalculator();
