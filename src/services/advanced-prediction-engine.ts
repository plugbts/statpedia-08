// Advanced AI Prediction Engine
// Implements sophisticated contextual factors and advanced analytics

export interface AdvancedGameContext {
  // Situational & Contextual Factors
  restDifferential: number; // Days difference in rest between teams
  travelFatigue: {
    homeTeam: number; // 0-1 scale
    awayTeam: number;
    distanceMiles: number;
    timeZoneChange: number;
  };
  weatherConditions: {
    temperature: number;
    windSpeed: number;
    windDirection: number;
    precipitation: number;
    humidity: number;
    fieldSurface: 'grass' | 'turf' | 'hybrid';
  };
  altitude: number; // Stadium altitude in feet
  refereeCrew: {
    id: string;
    penaltyTendency: number; // 0-1 scale
    homeBias: number; // -0.5 to 0.5
    passInterferenceRate: number;
  };
  
  // Advanced Analytics
  epaPerPlay: {
    homeOffense: number;
    homeDefense: number;
    awayOffense: number;
    awayDefense: number;
  };
  successRate: {
    homeOffense: number;
    homeDefense: number;
    awayOffense: number;
    awayDefense: number;
  };
  pace: {
    homeTeam: number; // seconds per play
    awayTeam: number;
    leagueAverage: number;
  };
  redZoneConversion: {
    homeOffense: number;
    homeDefense: number;
    awayOffense: number;
    awayDefense: number;
  };
  thirdDownConversion: {
    homeOffense: number;
    homeDefense: number;
    awayOffense: number;
    awayDefense: number;
  };
  havocRate: {
    homeDefense: number; // pressures + turnovers per play
    awayDefense: number;
  };
  
  // Psychological Factors
  situationalMotivation: {
    homeTeam: number; // 0-1 scale
    awayTeam: number;
    factors: string[];
  };
  divisionalFamiliarity: boolean;
  trapGamePotential: number; // 0-1 scale
  coachAggressiveness: {
    homeCoach: number; // 4th down tendency
    awayCoach: number;
  };
  
  // In-Game Momentum
  hiddenTurnovers: {
    homeTeam: number; // 4th down stops, missed FGs
    awayTeam: number;
  };
  penaltyImpact: {
    homeTeam: number; // penalty yards per game
    awayTeam: number;
  };
  fieldPositionDifferential: number; // average starting field position difference
  garbageTimeAdjusted: boolean;
}

export interface AdvancedPlayerContext {
  // Player-specific contextual factors
  injuryStatus: 'healthy' | 'questionable' | 'doubtful' | 'out';
  restDays: number;
  recentWorkload: number; // touches/snaps in last 3 games
  matchupAdvantage: number; // 0-1 scale vs specific opponent
  weatherImpact: number; // how weather affects this player's position
  situationalUsage: {
    redZone: number;
    thirdDown: number;
    twoMinute: number;
    garbageTime: number;
  };
  historicalVsOpponent: {
    average: number;
    games: number;
    trend: 'improving' | 'declining' | 'stable';
  };
}

export interface AdvancedPrediction {
  playerName: string;
  propType: string;
  line: number;
  prediction: 'over' | 'under';
  confidence: number; // 0-100%
  expectedValue: number; // percentage
  advancedFactors: {
    contextual: AdvancedGameContext;
    player: AdvancedPlayerContext;
    situational: {
      restAdvantage: number;
      weatherImpact: number;
      matchupStrength: number;
      motivationFactor: number;
    };
  };
  reasoning: string;
  riskFactors: string[];
  keyInsights: string[];
  modelVersion: string;
  lastUpdated: string;
}

class AdvancedPredictionEngine {
  private modelVersion = '2.0.0';
  
  constructor() {
    console.log('🧠 Advanced Prediction Engine initialized - Version', this.modelVersion);
  }

  // Main prediction method
  async generateAdvancedPrediction(
    playerName: string,
    propType: string,
    line: number,
    gameContext: AdvancedGameContext,
    playerContext: AdvancedPlayerContext,
    odds: { over: number; under: number }
  ): Promise<AdvancedPrediction> {
    
    // Calculate situational factors
    const situationalFactors = this.calculateSituationalFactors(gameContext, playerContext);
    
    // Calculate advanced analytics impact
    const analyticsImpact = this.calculateAnalyticsImpact(gameContext, propType);
    
    // Calculate psychological factors
    const psychologicalImpact = this.calculatePsychologicalFactors(gameContext);
    
    // Combine all factors for final prediction
    const finalPrediction = this.combineFactors(
      situationalFactors,
      analyticsImpact,
      psychologicalImpact,
      playerContext,
      line,
      odds
    );

    return {
      playerName,
      propType,
      line,
      prediction: finalPrediction.direction,
      confidence: finalPrediction.confidence,
      expectedValue: finalPrediction.expectedValue,
      advancedFactors: {
        contextual: gameContext,
        player: playerContext,
        situational: situationalFactors
      },
      reasoning: this.generateReasoning(finalPrediction, gameContext, playerContext),
      riskFactors: this.identifyRiskFactors(gameContext, playerContext),
      keyInsights: this.generateKeyInsights(finalPrediction, gameContext, playerContext),
      modelVersion: this.modelVersion,
      lastUpdated: new Date().toISOString()
    };
  }

  // Calculate situational factors
  private calculateSituationalFactors(
    gameContext: AdvancedGameContext,
    playerContext: AdvancedPlayerContext
  ) {
    // Rest advantage calculation
    const restAdvantage = this.calculateRestAdvantage(gameContext.restDifferential);
    
    // Weather impact calculation
    const weatherImpact = this.calculateWeatherImpact(
      gameContext.weatherConditions,
      playerContext.weatherImpact,
      gameContext.altitude
    );
    
    // Matchup strength calculation
    const matchupStrength = this.calculateMatchupStrength(gameContext, playerContext);
    
    // Motivation factor calculation
    const motivationFactor = this.calculateMotivationFactor(gameContext.situationalMotivation);

    return {
      restAdvantage,
      weatherImpact,
      matchupStrength,
      motivationFactor
    };
  }

  // Calculate rest advantage
  private calculateRestAdvantage(restDifferential: number): number {
    // Teams with more rest have advantage, but diminishing returns
    if (restDifferential === 0) return 0.5;
    
    const advantage = Math.sign(restDifferential) * Math.min(Math.abs(restDifferential) * 0.1, 0.3);
    return Math.max(0, Math.min(1, 0.5 + advantage));
  }

  // Calculate weather impact
  private calculateWeatherImpact(
    weather: AdvancedGameContext['weatherConditions'],
    playerWeatherImpact: number,
    altitude: number
  ): number {
    let impact = 0.5; // neutral baseline
    
    // Temperature impact
    if (weather.temperature < 32) impact -= 0.1; // Cold weather reduces performance
    if (weather.temperature > 85) impact -= 0.05; // Hot weather reduces performance
    
    // Wind impact
    if (weather.windSpeed > 15) impact -= 0.15; // Strong wind reduces passing
    if (weather.windSpeed > 25) impact -= 0.1; // Very strong wind
    
    // Precipitation impact
    if (weather.precipitation > 0.1) impact -= 0.1; // Rain/snow reduces performance
    
    // Altitude impact
    if (altitude > 5000) impact -= 0.05; // High altitude reduces stamina
    
    // Player-specific weather impact
    impact += (playerWeatherImpact - 0.5) * 0.2;
    
    return Math.max(0, Math.min(1, impact));
  }

  // Calculate matchup strength
  private calculateMatchupStrength(
    gameContext: AdvancedGameContext,
    playerContext: AdvancedPlayerContext
  ): number {
    // This would analyze specific player vs defense matchups
    // For now, using EPA and success rate as proxies
    const offensiveEPA = gameContext.epaPerPlay.homeOffense;
    const defensiveEPA = gameContext.epaPerPlay.awayDefense;
    
    // Higher offensive EPA vs lower defensive EPA = better matchup
    const matchupStrength = (offensiveEPA - defensiveEPA + 0.1) / 0.2; // Normalize to 0-1
    
    return Math.max(0, Math.min(1, matchupStrength));
  }

  // Calculate motivation factor
  private calculateMotivationFactor(motivation: AdvancedGameContext['situationalMotivation']): number {
    // Combine home and away motivation with situational factors
    const avgMotivation = (motivation.homeTeam + motivation.awayTeam) / 2;
    const factorCount = motivation.factors.length;
    
    // More factors = higher motivation variance
    const motivationVariance = factorCount * 0.05;
    
    return Math.max(0, Math.min(1, avgMotivation + motivationVariance));
  }

  // Calculate analytics impact
  private calculateAnalyticsImpact(gameContext: AdvancedGameContext, propType: string): number {
    let impact = 0.5; // neutral baseline
    
    // EPA impact
    const epaAdvantage = gameContext.epaPerPlay.homeOffense - gameContext.epaPerPlay.awayDefense;
    impact += epaAdvantage * 0.1;
    
    // Success rate impact
    const successAdvantage = gameContext.successRate.homeOffense - gameContext.successRate.awayDefense;
    impact += successAdvantage * 0.1;
    
    // Pace impact (faster pace = more opportunities)
    const paceAdvantage = (gameContext.pace.homeTeam - gameContext.pace.leagueAverage) / gameContext.pace.leagueAverage;
    impact += paceAdvantage * 0.05;
    
    // Red zone conversion impact
    const rzAdvantage = gameContext.redZoneConversion.homeOffense - gameContext.redZoneConversion.awayDefense;
    impact += rzAdvantage * 0.1;
    
    return Math.max(0, Math.min(1, impact));
  }

  // Calculate psychological factors
  private calculatePsychologicalFactors(gameContext: AdvancedGameContext): number {
    let impact = 0.5; // neutral baseline
    
    // Divisional familiarity (tends toward unders)
    if (gameContext.divisionalFamiliarity) {
      impact -= 0.05;
    }
    
    // Trap game potential
    impact -= gameContext.trapGamePotential * 0.1;
    
    // Coach aggressiveness
    const coachDiff = gameContext.coachAggressiveness.homeCoach - gameContext.coachAggressiveness.awayCoach;
    impact += coachDiff * 0.05;
    
    return Math.max(0, Math.min(1, impact));
  }

  // Combine all factors for final prediction
  private combineFactors(
    situational: any,
    analytics: number,
    psychological: number,
    playerContext: AdvancedPlayerContext,
    line: number,
    odds: { over: number; under: number }
  ) {
    // Weighted combination of all factors
    const weights = {
      situational: 0.3,
      analytics: 0.25,
      psychological: 0.15,
      player: 0.2,
      odds: 0.1
    };
    
    // Calculate base probability from odds
    const overProb = this.americanToImpliedProb(odds.over);
    const underProb = this.americanToImpliedProb(odds.under);
    
    // Adjust probability based on factors
    const situationalAdjustment = (situational.restAdvantage + situational.weatherImpact + 
                                 situational.matchupStrength + situational.motivationFactor) / 4 - 0.5;
    
    const adjustedOverProb = overProb + situationalAdjustment * weights.situational +
                            (analytics - 0.5) * weights.analytics +
                            (psychological - 0.5) * weights.psychological +
                            (playerContext.matchupAdvantage - 0.5) * weights.player;
    
    const adjustedUnderProb = 1 - adjustedOverProb;
    
    // Determine prediction direction
    const direction = adjustedOverProb > adjustedUnderProb ? 'over' : 'under';
    const confidence = Math.max(adjustedOverProb, adjustedUnderProb) * 100;
    
    // Calculate expected value
    const expectedValue = this.calculateExpectedValue(
      direction === 'over' ? adjustedOverProb : adjustedUnderProb,
      direction === 'over' ? odds.over : odds.under
    );
    
    return {
      direction,
      confidence,
      expectedValue,
      adjustedOverProb,
      adjustedUnderProb
    };
  }

  // Helper methods
  private americanToImpliedProb(odds: number): number {
    if (odds > 0) {
      return 100 / (odds + 100);
    } else {
      return Math.abs(odds) / (Math.abs(odds) + 100);
    }
  }

  private calculateExpectedValue(probability: number, odds: number): number {
    const decimalOdds = odds > 0 ? (odds / 100) + 1 : (100 / Math.abs(odds)) + 1;
    const ev = (probability * (decimalOdds - 1)) - ((1 - probability) * 1);
    return ev * 100; // Convert to percentage
  }

  private generateReasoning(prediction: any, gameContext: AdvancedGameContext, playerContext: AdvancedPlayerContext): string {
    const factors = [];
    
    if (gameContext.restDifferential !== 0) {
      factors.push(`Rest advantage: ${gameContext.restDifferential > 0 ? 'Home' : 'Away'} team has ${Math.abs(gameContext.restDifferential)} more days rest`);
    }
    
    if (gameContext.weatherConditions.windSpeed > 15) {
      factors.push(`Wind conditions: ${gameContext.weatherConditions.windSpeed} mph winds affecting passing game`);
    }
    
    if (gameContext.divisionalFamiliarity) {
      factors.push('Divisional matchup: Teams familiar with each other\'s schemes');
    }
    
    return `Based on advanced analytics: ${factors.join(', ')}. ${prediction.direction.toUpperCase()} recommended with ${prediction.confidence.toFixed(1)}% confidence.`;
  }

  private identifyRiskFactors(gameContext: AdvancedGameContext, playerContext: AdvancedPlayerContext): string[] {
    const risks = [];
    
    if (playerContext.injuryStatus !== 'healthy') {
      risks.push(`Player injury status: ${playerContext.injuryStatus}`);
    }
    
    if (gameContext.weatherConditions.windSpeed > 20) {
      risks.push('High wind conditions');
    }
    
    if (gameContext.trapGamePotential > 0.7) {
      risks.push('Potential trap game scenario');
    }
    
    return risks;
  }

  private generateKeyInsights(prediction: any, gameContext: AdvancedGameContext, playerContext: AdvancedPlayerContext): string[] {
    const insights = [];
    
    insights.push(`Expected Value: ${prediction.expectedValue.toFixed(1)}%`);
    
    if (gameContext.pace.homeTeam < gameContext.pace.leagueAverage) {
      insights.push('Slower-paced game expected');
    }
    
    if (gameContext.havocRate.homeDefense > 0.2) {
      insights.push('High-pressure defense matchup');
    }
    
    return insights;
  }
}

export const advancedPredictionEngine = new AdvancedPredictionEngine();
