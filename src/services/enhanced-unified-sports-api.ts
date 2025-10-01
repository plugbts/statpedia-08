import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';
import { unifiedSportsAPI, PlayerProp } from './unified-sports-api';

export interface EnhancedPlayerProp extends PlayerProp {
  // Enhanced ML predictions
  mlPrediction: {
    recommended: 'over' | 'under';
    confidence: number;
    reasoning: string;
    factors: string[];
    modelVersion: string;
    lastUpdated: Date;
  };
  
  // Enhanced confidence scoring
  enhancedConfidence: {
    overall: number;
    factors: {
      historicalAccuracy: number;
      recentForm: number;
      matchupAdvantage: number;
      marketEfficiency: number;
      volumeWeight: number;
    };
  };
  
  // Risk assessment
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
  factors: string[];
    recommendation: string;
  };
  
  // Value indicators
  valueIndicators: {
    isValueBet: boolean;
    expectedValue: number;
    kellyCriterion: number;
    edge: number;
  };
}

class EnhancedUnifiedSportsAPI {
  constructor() {
    logInfo('EnhancedUnifiedSportsAPI', 'Service initialized - Version 3.0.0');
    logInfo('EnhancedUnifiedSportsAPI', 'Enhanced player props with ML predictions and advanced analytics');
  }

  // Get enhanced player props with ML predictions
  async getEnhancedPlayerProps(sport: string, season?: number, week?: number, selectedSportsbook?: string): Promise<EnhancedPlayerProp[]> {
    logAPI('EnhancedUnifiedSportsAPI', `Getting enhanced player props for ${sport}`);
    
    try {
      // Get base props from unified API
      const baseProps = await unifiedSportsAPI.getPlayerProps(sport, season, week, selectedSportsbook);
      logAPI('EnhancedUnifiedSportsAPI', `Retrieved ${baseProps.length} base props`);
      console.log('🎯 EnhancedUnifiedSportsAPI received base props:', baseProps);

      // Enhance each prop with ML predictions and advanced analytics
      const enhancedProps: EnhancedPlayerProp[] = baseProps.map(prop => {
        const enhancedProp: EnhancedPlayerProp = {
          ...prop,
          mlPrediction: this.generateMLPrediction(prop),
          enhancedConfidence: this.calculateEnhancedConfidence(prop),
          riskAssessment: this.assessRisk(prop),
          valueIndicators: this.calculateValueIndicators(prop)
        };
        
        return enhancedProp;
      });

      // Sort by enhanced confidence and expected value
      const sortedProps = enhancedProps
        .sort((a, b) => {
          const scoreA = a.enhancedConfidence.overall * a.valueIndicators.expectedValue;
          const scoreB = b.enhancedConfidence.overall * b.valueIndicators.expectedValue;
          return scoreB - scoreA;
        });

      logSuccess('EnhancedUnifiedSportsAPI', `Generated ${sortedProps.length} enhanced player props`);
      console.log('🎯 EnhancedUnifiedSportsAPI enhanced props:', sortedProps);
      return sortedProps;
      
    } catch (error) {
      logError('EnhancedUnifiedSportsAPI', `Failed to get enhanced player props for ${sport}:`, error);
      return [];
    }
  }

  // Generate ML prediction for a player prop
  private generateMLPrediction(prop: PlayerProp): EnhancedPlayerProp['mlPrediction'] {
    // Simulate ML model prediction
    const factors = this.analyzeFactors(prop);
    const confidence = this.calculateMLConfidence(factors);
    const recommended = confidence > 0.5 ? 'over' : 'under';
    
    return {
      recommended,
      confidence: Math.abs(confidence - 0.5) * 2, // Convert to 0-1 scale
      reasoning: this.generateReasoning(prop, factors, recommended),
      factors: Object.keys(factors).filter(key => factors[key] > 0.1),
      modelVersion: 'v3.0.0',
      lastUpdated: new Date()
    };
  }

  // Analyze factors for ML prediction
  private analyzeFactors(prop: PlayerProp): { [key: string]: number } {
    const factors: { [key: string]: number } = {};
    
    // Historical performance factor
    if (prop.seasonStats) {
      const hitRate = prop.seasonStats.hitRate;
      factors.historicalPerformance = hitRate > 0.6 ? 0.8 : hitRate > 0.4 ? 0.5 : 0.2;
    }
    
    // Recent form factor
    if (prop.seasonStats?.last5Games) {
      const recentAvg = prop.seasonStats.last5Games.reduce((a, b) => a + b, 0) / prop.seasonStats.last5Games.length;
      const formFactor = recentAvg > prop.line ? 0.7 : 0.3;
      factors.recentForm = formFactor;
    }
    
    // Matchup factor (simplified)
    factors.matchupAdvantage = Math.random() * 0.4 + 0.3; // 0.3-0.7
    
    // Market efficiency factor
    const oddsVariance = Math.abs(prop.overOdds - prop.underOdds);
    factors.marketEfficiency = oddsVariance < 20 ? 0.8 : 0.4;
    
    // Volume factor
    factors.volumeWeight = prop.confidence || 0.5;
    
    return factors;
  }

  // Calculate ML confidence
  private calculateMLConfidence(factors: { [key: string]: number }): number {
    const weights = {
      historicalPerformance: 0.3,
      recentForm: 0.25,
      matchupAdvantage: 0.2,
      marketEfficiency: 0.15,
      volumeWeight: 0.1
    };
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    Object.keys(weights).forEach(key => {
      if (factors[key] !== undefined) {
        weightedSum += factors[key] * weights[key as keyof typeof weights];
        totalWeight += weights[key as keyof typeof weights];
      }
    });
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  }

  // Generate reasoning for prediction
  private generateReasoning(prop: PlayerProp, factors: { [key: string]: number }, recommended: 'over' | 'under'): string {
    const reasons: string[] = [];
    
    if (factors.historicalPerformance > 0.7) {
      reasons.push('Strong historical performance');
    }
    
    if (factors.recentForm > 0.6) {
      reasons.push('Excellent recent form');
    }
    
    if (factors.matchupAdvantage > 0.6) {
      reasons.push('Favorable matchup');
    }
    
    if (factors.marketEfficiency > 0.7) {
      reasons.push('Efficient market pricing');
    }
    
    if (reasons.length === 0) {
      reasons.push('Balanced factors analysis');
    }
    
    return `ML model recommends ${recommended} based on: ${reasons.join(', ')}.`;
  }

  // Calculate enhanced confidence
  private calculateEnhancedConfidence(prop: PlayerProp): EnhancedPlayerProp['enhancedConfidence'] {
    const factors = this.analyzeFactors(prop);
    
    return {
      overall: this.calculateMLConfidence(factors),
      factors: {
        historicalAccuracy: factors.historicalPerformance || 0.5,
        recentForm: factors.recentForm || 0.5,
        matchupAdvantage: factors.matchupAdvantage || 0.5,
        marketEfficiency: factors.marketEfficiency || 0.5,
        volumeWeight: factors.volumeWeight || 0.5
      }
    };
  }

  // Assess risk level
  private assessRisk(prop: PlayerProp): EnhancedPlayerProp['riskAssessment'] {
    const riskFactors: string[] = [];
    let riskScore = 0;
    
    // High variance in recent games
    if (prop.seasonStats?.last5Games) {
      const variance = this.calculateVariance(prop.seasonStats.last5Games);
      if (variance > prop.line * 0.3) {
        riskFactors.push('High performance variance');
        riskScore += 0.3;
      }
    }
    
    // Low hit rate
    if (prop.seasonStats?.hitRate && prop.seasonStats.hitRate < 0.4) {
      riskFactors.push('Low historical hit rate');
      riskScore += 0.4;
    }
    
    // High odds variance
    const oddsVariance = Math.abs(prop.overOdds - prop.underOdds);
    if (oddsVariance > 30) {
      riskFactors.push('High market uncertainty');
      riskScore += 0.2;
    }
    
    // Determine risk level
    let level: 'low' | 'medium' | 'high';
    if (riskScore < 0.3) {
      level = 'low';
    } else if (riskScore < 0.6) {
      level = 'medium';
    } else {
      level = 'high';
    }
    
    return {
      level,
      factors: riskFactors,
      recommendation: this.getRiskRecommendation(level, riskFactors)
    };
  }

  // Calculate variance
  private calculateVariance(numbers: number[]): number {
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const variance = numbers.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numbers.length;
    return Math.sqrt(variance);
  }

  // Get risk recommendation
  private getRiskRecommendation(level: 'low' | 'medium' | 'high', factors: string[]): string {
    switch (level) {
      case 'low':
        return 'Low risk bet - suitable for larger stakes';
      case 'medium':
        return 'Medium risk bet - moderate stake recommended';
      case 'high':
        return 'High risk bet - small stake only';
      default:
        return 'Risk assessment unavailable';
    }
  }

  // Calculate value indicators
  private calculateValueIndicators(prop: PlayerProp): EnhancedPlayerProp['valueIndicators'] {
    const overProb = this.americanToImpliedProb(prop.overOdds);
    const underProb = this.americanToImpliedProb(prop.underOdds);
    
    // Calculate expected value
    const expectedValue = this.calculateExpectedValue(prop.line, prop.overOdds, prop.underOdds);
    
    // Calculate Kelly Criterion
    const kellyCriterion = this.calculateKellyCriterion(overProb, prop.overOdds);
    
    // Calculate edge
    const edge = Math.abs(expectedValue) / 100;
    
    return {
      isValueBet: expectedValue > 0,
      expectedValue,
      kellyCriterion,
      edge
    };
  }

  // Convert American odds to implied probability
  private americanToImpliedProb(odds: number): number {
    if (odds > 0) {
      return 100 / (odds + 100);
    } else {
      return Math.abs(odds) / (Math.abs(odds) + 100);
    }
  }

  // Calculate expected value
  private calculateExpectedValue(line: number, overOdds: number, underOdds: number): number {
    const overProb = this.americanToImpliedProb(overOdds);
    const underProb = this.americanToImpliedProb(underOdds);
    
    // Assume 50% probability of hitting the line for EV calculation
    const hitProb = 0.5;
    const overEV = (hitProb * overOdds) + ((1 - hitProb) * -100);
    const underEV = (hitProb * underOdds) + ((1 - hitProb) * -100);
    
    return Math.max(overEV, underEV);
  }

  // Calculate Kelly Criterion
  private calculateKellyCriterion(probability: number, odds: number): number {
    const b = odds / 100; // Decimal odds
    const p = probability;
    const q = 1 - p;
    
    const kelly = (b * p - q) / b;
    return Math.max(0, kelly); // Kelly can't be negative
  }
}

// Export singleton instance
export const enhancedUnifiedSportsAPI = new EnhancedUnifiedSportsAPI();
