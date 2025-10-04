// Expected Value (EV) Calculator Service
// Calculates EV%, ROI, and AI-powered ratings for player props

export interface EVCalculation {
  evPercentage: number;
  roiPercentage: number;
  aiRating: number; // 1-5 stars
  confidence: number; // 0-100%
  factors: EVFactor[];
  recommendation: 'strong_bet' | 'good_bet' | 'neutral' | 'avoid' | 'strong_avoid';
}

export interface EVFactor {
  name: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number; // 0-1
  description: string;
  value: number;
}

export interface PlayerPropData {
  id: string;
  playerName: string;
  propType: string;
  line: number;
  odds: string;
  sport: string;
  team: string;
  opponent: string;
  gameDate: string;
  hitRate?: number;
  recentForm?: number;
  matchupData?: any;
  weatherConditions?: any;
  injuryStatus?: string;
  restDays?: number;
}

class EVCalculatorService {
  // Calculate EV% based on probability and odds
  calculateEV(probability: number, odds: string): number {
    const decimalOdds = this.convertToDecimalOdds(odds);
    const ev = (probability * (decimalOdds - 1)) - ((1 - probability) * 1);
    return ev * 100; // Convert to percentage
  }

  // Calculate ROI based on EV
  calculateROI(evPercentage: number): number {
    return evPercentage; // ROI equals EV for single bets
  }

  // Convert American odds to decimal odds
  convertToDecimalOdds(americanOdds: string): number {
    const odds = parseInt(americanOdds);
    if (odds > 0) {
      return (odds / 100) + 1;
    } else {
      return (100 / Math.abs(odds)) + 1;
    }
  }

  // Calculate probability from odds
  calculateProbability(odds: string): number {
    const decimalOdds = this.convertToDecimalOdds(odds);
    return 1 / decimalOdds;
  }

  // AI-powered EV rating system
  calculateAIRating(propData: PlayerPropData): EVCalculation {
    const factors = this.analyzeFactors(propData);
    const baseProbability = this.calculateProbability(propData.odds);
    const adjustedProbability = this.adjustProbabilityWithFactors(baseProbability, factors);
    const evPercentage = this.calculateEV(adjustedProbability, propData.odds);
    const roiPercentage = this.calculateROI(evPercentage);
    
    const aiRating = this.calculateStarRating(evPercentage, factors);
    const confidence = this.calculateConfidence(factors);
    const recommendation = this.getRecommendation(evPercentage, aiRating);

    return {
      evPercentage,
      roiPercentage,
      aiRating,
      confidence,
      factors,
      recommendation
    };
  }

  // Analyze various factors that affect the prop
  private analyzeFactors(propData: PlayerPropData): EVFactor[] {
    const factors: EVFactor[] = [];

    // Hit Rate Factor
    if (propData.hitRate !== undefined) {
      const hitRateImpact = propData.hitRate > 0.6 ? 'positive' : 
                           propData.hitRate < 0.4 ? 'negative' : 'neutral';
      factors.push({
        name: 'Historical Hit Rate',
        impact: hitRateImpact,
        weight: 0.25,
        description: `${(propData.hitRate * 100).toFixed(1)}% historical success rate`,
        value: propData.hitRate
      });
    }

    // Recent Form Factor
    if (propData.recentForm !== undefined) {
      const formImpact = propData.recentForm > 0.7 ? 'positive' : 
                        propData.recentForm < 0.3 ? 'negative' : 'neutral';
      factors.push({
        name: 'Recent Form',
        impact: formImpact,
        weight: 0.20,
        description: `Recent performance: ${(propData.recentForm * 100).toFixed(1)}%`,
        value: propData.recentForm
      });
    }

    // Matchup Factor
    if (propData.matchupData) {
      const matchupStrength = this.calculateMatchupStrength(propData);
      const matchupImpact = matchupStrength > 0.6 ? 'positive' : 
                           matchupStrength < 0.4 ? 'negative' : 'neutral';
      factors.push({
        name: 'Matchup Analysis',
        impact: matchupImpact,
        weight: 0.20,
        description: `Matchup strength: ${(matchupStrength * 100).toFixed(1)}%`,
        value: matchupStrength
      });
    }

    // Weather Factor (for outdoor sports)
    if (propData.weatherConditions && this.isOutdoorSport(propData.sport)) {
      const weatherImpact = this.calculateWeatherImpact(propData.weatherConditions, propData.propType);
      factors.push({
        name: 'Weather Conditions',
        impact: weatherImpact.impact,
        weight: 0.15,
        description: weatherImpact.description,
        value: weatherImpact.value
      });
    }

    // Injury Status Factor
    if (propData.injuryStatus) {
      const injuryImpact = propData.injuryStatus === 'healthy' ? 'positive' :
                          propData.injuryStatus === 'questionable' ? 'neutral' : 'negative';
      factors.push({
        name: 'Injury Status',
        impact: injuryImpact,
        weight: 0.10,
        description: `Player status: ${propData.injuryStatus}`,
        value: injuryImpact === 'positive' ? 1 : injuryImpact === 'negative' ? 0 : 0.5
      });
    }

    // Rest Days Factor
    if (propData.restDays !== undefined) {
      const restImpact = propData.restDays >= 2 && propData.restDays <= 4 ? 'positive' :
                        propData.restDays < 1 || propData.restDays > 6 ? 'negative' : 'neutral';
      factors.push({
        name: 'Rest Days',
        impact: restImpact,
        weight: 0.10,
        description: `${propData.restDays} days rest`,
        value: propData.restDays
      });
    }

    return factors;
  }

  // Adjust probability based on analyzed factors
  private adjustProbabilityWithFactors(baseProbability: number, factors: EVFactor[]): number {
    let adjustment = 0;
    
    factors.forEach(factor => {
      const factorAdjustment = (factor.value - 0.5) * factor.weight * 0.05; // Max 5% adjustment per factor (reduced from 20%)
      adjustment += factorAdjustment;
    });

    const adjustedProbability = baseProbability + adjustment;
    // Much more conservative probability range - closer to implied probability
    return Math.max(0.25, Math.min(0.75, adjustedProbability)); // Clamp between 25% and 75%
  }

  // Calculate star rating based on EV and factors
  private calculateStarRating(evPercentage: number, factors: EVFactor[]): number {
    let baseRating = 3; // Start with neutral rating

    // EV-based rating
    if (evPercentage > 10) baseRating = 5;
    else if (evPercentage > 5) baseRating = 4;
    else if (evPercentage > 0) baseRating = 3;
    else if (evPercentage > -5) baseRating = 2;
    else baseRating = 1;

    // Factor-based adjustments
    const positiveFactors = factors.filter(f => f.impact === 'positive').length;
    const negativeFactors = factors.filter(f => f.impact === 'negative').length;
    
    if (positiveFactors > negativeFactors + 1) baseRating = Math.min(5, baseRating + 1);
    if (negativeFactors > positiveFactors + 1) baseRating = Math.max(1, baseRating - 1);

    return baseRating;
  }

  // Calculate confidence based on factor quality
  private calculateConfidence(factors: EVFactor[]): number {
    if (factors.length === 0) return 50;

    const weightedConfidence = factors.reduce((sum, factor) => {
      const factorConfidence = factor.weight * 100;
      return sum + factorConfidence;
    }, 0);

    return Math.min(95, Math.max(30, weightedConfidence));
  }

  // Get recommendation based on EV and rating
  private getRecommendation(evPercentage: number, aiRating: number): EVCalculation['recommendation'] {
    if (evPercentage > 8 && aiRating >= 4) return 'strong_bet';
    if (evPercentage > 3 && aiRating >= 3) return 'good_bet';
    if (evPercentage > -3 && aiRating >= 2) return 'neutral';
    if (evPercentage > -8 && aiRating <= 2) return 'avoid';
    return 'strong_avoid';
  }

  // Calculate matchup strength
  private calculateMatchupStrength(propData: PlayerPropData): number {
    // Simplified matchup calculation
    // In a real implementation, this would analyze opponent's defensive stats
    return 0.5 + (Math.random() - 0.5) * 0.4; // Placeholder: 30-70% range
  }

  // Check if sport is outdoor
  private isOutdoorSport(sport: string): boolean {
    const outdoorSports = ['nfl', 'mlb', 'ncaaf', 'ncaab'];
    return outdoorSports.includes(sport.toLowerCase());
  }

  // Calculate weather impact
  private calculateWeatherImpact(weather: any, propType: string): { impact: 'positive' | 'negative' | 'neutral', description: string, value: number } {
    // Simplified weather impact
    // In a real implementation, this would analyze specific weather conditions
    return {
      impact: 'neutral',
      description: 'Weather conditions normal',
      value: 0.5
    };
  }

  // Get EV color based on value
  getEVColor(evPercentage: number): string {
    if (evPercentage > 5) return 'text-green-500';
    if (evPercentage > 0) return 'text-green-400';
    if (evPercentage > -5) return 'text-yellow-500';
    return 'text-red-500';
  }

  // Get recommendation color
  getRecommendationColor(recommendation: EVCalculation['recommendation']): string {
    switch (recommendation) {
      case 'strong_bet': return 'text-green-600';
      case 'good_bet': return 'text-green-500';
      case 'neutral': return 'text-yellow-500';
      case 'avoid': return 'text-orange-500';
      case 'strong_avoid': return 'text-red-500';
      default: return 'text-gray-500';
    }
  }

  // Get recommendation text
  getRecommendationText(recommendation: EVCalculation['recommendation']): string {
    switch (recommendation) {
      case 'strong_bet': return 'Strong Bet';
      case 'good_bet': return 'Good Bet';
      case 'neutral': return 'Neutral';
      case 'avoid': return 'Avoid';
      case 'strong_avoid': return 'Strong Avoid';
      default: return 'Unknown';
    }
  }
}

export const evCalculatorService = new EVCalculatorService();
