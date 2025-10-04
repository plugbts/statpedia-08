// Advanced Feature Engineering Pipeline
// Creates sophisticated features from raw data for ML models

export interface RawGameData {
  gameId: string;
  season: number;
  week: number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  totalYards: {
    home: number;
    away: number;
  };
  passingYards: {
    home: number;
    away: number;
  };
  rushingYards: {
    home: number;
    away: number;
  };
  turnovers: {
    home: number;
    away: number;
  };
  penalties: {
    home: number;
    away: number;
  };
  timeOfPossession: {
    home: number;
    away: number;
  };
  thirdDownConversions: {
    home: number;
    away: number;
  };
  redZoneAttempts: {
    home: number;
    away: number;
  };
  redZoneConversions: {
    home: number;
    away: number;
  };
}

export interface RawPlayerData {
  playerId: string;
  playerName: string;
  team: string;
  position: string;
  gameId: string;
  stats: {
    passingYards?: number;
    rushingYards?: number;
    receivingYards?: number;
    receptions?: number;
    touchdowns?: number;
    interceptions?: number;
    completions?: number;
    attempts?: number;
    carries?: number;
    targets?: number;
  };
  snapCount: number;
  injuryStatus: string;
}

export interface EngineeredFeatures {
  // Game-level features
  gameFeatures: {
    // Basic ratios
    yardageRatio: number;
    possessionRatio: number;
    efficiencyRatio: number;
    
    // Advanced metrics
    epaPerPlay: {
      home: number;
      away: number;
    };
    successRate: {
      home: number;
      away: number;
    };
    pace: {
      home: number;
      away: number;
    };
    
    // Situational factors
    restDifferential: number;
    travelFatigue: number;
    weatherImpact: number;
    
    // Psychological factors
    motivationFactor: number;
    trapGameIndicator: number;
    divisionalFamiliarity: number;
    
    // Referee impact
    penaltyTendency: number;
    homeBias: number;
    
    // Historical context
    h2hRecord: number;
    recentForm: {
      home: number;
      away: number;
    };
  };
  
  // Player-level features
  playerFeatures: {
    // Performance metrics
    usageRate: number;
    efficiencyRating: number;
    consistencyScore: number;
    
    // Situational usage
    redZoneUsage: number;
    thirdDownUsage: number;
    twoMinuteUsage: number;
    
    // Matchup factors
    opponentDefenseRating: number;
    weatherAdjustment: number;
    restAdvantage: number;
    
    // Historical trends
    vsOpponentAverage: number;
    recentTrend: number;
    seasonProgression: number;
    
    // Advanced analytics
    expectedYards: number;
    varianceScore: number;
    clutchFactor: number;
  };
  
  // Combined features
  combinedFeatures: {
    // Interaction terms
    usageVsDefense: number;
    efficiencyVsPace: number;
    weatherVsPosition: number;
    
    // Composite scores
    overallAdvantage: number;
    riskScore: number;
    valueScore: number;
  };
}

export interface FeatureEngineeringConfig {
  // Time windows for rolling averages
  rollingWindows: {
    short: number; // 3 games
    medium: number; // 8 games
    long: number; // 16 games
  };
  
  // Weighting factors
  weights: {
    recent: number;
    situational: number;
    matchup: number;
    historical: number;
  };
  
  // Normalization settings
  normalization: {
    method: 'zscore' | 'minmax' | 'robust';
    clipOutliers: boolean;
    outlierThreshold: number;
  };
}

class FeatureEngineeringPipeline {
  private config: FeatureEngineeringConfig;
  
  constructor(config?: Partial<FeatureEngineeringConfig>) {
    this.config = {
      rollingWindows: {
        short: 3,
        medium: 8,
        long: 16,
      },
      weights: {
        recent: 0.4,
        situational: 0.3,
        matchup: 0.2,
        historical: 0.1,
      },
      normalization: {
        method: 'zscore',
        clipOutliers: true,
        outlierThreshold: 3,
      },
      ...config,
    };
    
    console.log('🔧 Feature Engineering Pipeline initialized');
  }

  // Main feature engineering method
  async engineerFeatures(
    gameData: RawGameData,
    playerData: RawPlayerData[],
    historicalData: RawGameData[],
    contextualData: any
  ): Promise<EngineeredFeatures> {
    
    // Engineer game-level features
    const gameFeatures = await this.engineerGameFeatures(gameData, historicalData, contextualData);
    
    // Engineer player-level features
    const playerFeatures = await this.engineerPlayerFeatures(playerData, gameData, historicalData, contextualData);
    
    // Create combined features
    const combinedFeatures = await this.engineerCombinedFeatures(gameFeatures, playerFeatures);
    
    return {
      gameFeatures,
      playerFeatures,
      combinedFeatures,
    };
  }

  // Engineer game-level features
  private async engineerGameFeatures(
    gameData: RawGameData,
    historicalData: RawGameData[],
    contextualData: any
  ) {
    // Basic ratios
    const yardageRatio = gameData.totalYards.home / gameData.totalYards.away;
    const possessionRatio = gameData.timeOfPossession.home / gameData.timeOfPossession.away;
    const efficiencyRatio = this.calculateEfficiencyRatio(gameData);
    
    // Advanced metrics
    const epaPerPlay = this.calculateEPAPerPlay(gameData);
    const successRate = this.calculateSuccessRate(gameData);
    const pace = this.calculatePace(gameData);
    
    // Situational factors
    const restDifferential = contextualData.restDifferential || 0;
    const travelFatigue = this.calculateTravelFatigue(contextualData);
    const weatherImpact = this.calculateWeatherImpact(contextualData);
    
    // Psychological factors
    const motivationFactor = this.calculateMotivationFactor(contextualData);
    const trapGameIndicator = this.calculateTrapGameIndicator(gameData, historicalData);
    const divisionalFamiliarity = this.calculateDivisionalFamiliarity(gameData);
    
    // Referee impact
    const penaltyTendency = contextualData.referee?.penaltyTendency || 0.5;
    const homeBias = contextualData.referee?.homeBias || 0;
    
    // Historical context
    const h2hRecord = this.calculateH2HRecord(gameData, historicalData);
    const recentForm = this.calculateRecentForm(gameData, historicalData);
    
    return {
      yardageRatio,
      possessionRatio,
      efficiencyRatio,
      epaPerPlay,
      successRate,
      pace,
      restDifferential,
      travelFatigue,
      weatherImpact,
      motivationFactor,
      trapGameIndicator,
      divisionalFamiliarity,
      penaltyTendency,
      homeBias,
      h2hRecord,
      recentForm,
    };
  }

  // Engineer player-level features
  private async engineerPlayerFeatures(
    playerData: RawPlayerData[],
    gameData: RawGameData,
    historicalData: RawGameData[],
    contextualData: any
  ) {
    const features = [];
    
    for (const player of playerData) {
      // Performance metrics
      const usageRate = this.calculateUsageRate(player, gameData);
      const efficiencyRating = this.calculateEfficiencyRating(player, gameData);
      const consistencyScore = this.calculateConsistencyScore(player, historicalData);
      
      // Situational usage
      const redZoneUsage = this.calculateSituationalUsage(player, 'redZone');
      const thirdDownUsage = this.calculateSituationalUsage(player, 'thirdDown');
      const twoMinuteUsage = this.calculateSituationalUsage(player, 'twoMinute');
      
      // Matchup factors
      const opponentDefenseRating = this.calculateOpponentDefenseRating(player, gameData);
      const weatherAdjustment = this.calculateWeatherAdjustment(player, contextualData);
      const restAdvantage = this.calculateRestAdvantage(player, contextualData);
      
      // Historical trends
      const vsOpponentAverage = this.calculateVsOpponentAverage(player, historicalData);
      const recentTrend = this.calculateRecentTrend(player, historicalData);
      const seasonProgression = this.calculateSeasonProgression(player, historicalData);
      
      // Advanced analytics
      const expectedYards = this.calculateExpectedYards(player, gameData);
      const varianceScore = this.calculateVarianceScore(player, historicalData);
      const clutchFactor = this.calculateClutchFactor(player, historicalData);
      
      features.push({
        playerId: player.playerId,
        playerName: player.playerName,
        usageRate,
        efficiencyRating,
        consistencyScore,
        redZoneUsage,
        thirdDownUsage,
        twoMinuteUsage,
        opponentDefenseRating,
        weatherAdjustment,
        restAdvantage,
        vsOpponentAverage,
        recentTrend,
        seasonProgression,
        expectedYards,
        varianceScore,
        clutchFactor,
      });
    }
    
    return features;
  }

  // Engineer combined features
  private async engineerCombinedFeatures(gameFeatures: any, playerFeatures: any[]) {
    const combinedFeatures = [];
    
    for (const player of playerFeatures) {
      // Interaction terms
      const usageVsDefense = player.usageRate * player.opponentDefenseRating;
      const efficiencyVsPace = player.efficiencyRating * gameFeatures.pace.home;
      const weatherVsPosition = player.weatherAdjustment * gameFeatures.weatherImpact;
      
      // Composite scores
      const overallAdvantage = this.calculateOverallAdvantage(player, gameFeatures);
      const riskScore = this.calculateRiskScore(player, gameFeatures);
      const valueScore = this.calculateValueScore(player, gameFeatures);
      
      combinedFeatures.push({
        playerId: player.playerId,
        playerName: player.playerName,
        usageVsDefense,
        efficiencyVsPace,
        weatherVsPosition,
        overallAdvantage,
        riskScore,
        valueScore,
      });
    }
    
    return combinedFeatures;
  }

  // Helper methods for calculations
  private calculateEfficiencyRatio(gameData: RawGameData): number {
    const homeEfficiency = gameData.totalYards.home / (gameData.timeOfPossession.home / 60);
    const awayEfficiency = gameData.totalYards.away / (gameData.timeOfPossession.away / 60);
    return homeEfficiency / awayEfficiency;
  }

  private calculateEPAPerPlay(gameData: RawGameData): { home: number; away: number } {
    // Simplified EPA calculation
    const homePlays = gameData.totalYards.home / 5; // Rough estimate
    const awayPlays = gameData.totalYards.away / 5;
    
    return {
      home: gameData.totalYards.home / homePlays,
      away: gameData.totalYards.away / awayPlays,
    };
  }

  private calculateSuccessRate(gameData: RawGameData): { home: number; away: number } {
    const homeSuccessRate = gameData.thirdDownConversions.home / Math.max(gameData.thirdDownConversions.home + 10, 1);
    const awaySuccessRate = gameData.thirdDownConversions.away / Math.max(gameData.thirdDownConversions.away + 10, 1);
    
    return {
      home: homeSuccessRate,
      away: awaySuccessRate,
    };
  }

  private calculatePace(gameData: RawGameData): { home: number; away: number } {
    const homePlays = gameData.totalYards.home / 5;
    const awayPlays = gameData.totalYards.away / 5;
    
    return {
      home: (gameData.timeOfPossession.home * 60) / homePlays,
      away: (gameData.timeOfPossession.away * 60) / awayPlays,
    };
  }

  private calculateTravelFatigue(contextualData: any): number {
    if (!contextualData.travelFatigue) return 0.5;
    
    const { distanceMiles, timeZoneChange } = contextualData.travelFatigue;
    let fatigue = 0.5;
    
    if (distanceMiles > 2000) fatigue -= 0.2;
    else if (distanceMiles > 1000) fatigue -= 0.1;
    
    if (timeZoneChange > 2) fatigue -= 0.15;
    else if (timeZoneChange > 1) fatigue -= 0.05;
    
    return Math.max(0, Math.min(1, fatigue));
  }

  private calculateWeatherImpact(contextualData: any): number {
    if (!contextualData.weather) return 0.5;
    
    const { windSpeed, temperature, precipitation } = contextualData.weather;
    let impact = 0.5;
    
    if (windSpeed > 15) impact -= 0.1;
    if (temperature < 32 || temperature > 85) impact -= 0.05;
    if (precipitation > 0.1) impact -= 0.1;
    
    return Math.max(0, Math.min(1, impact));
  }

  private calculateMotivationFactor(contextualData: any): number {
    if (!contextualData.motivation) return 0.5;
    
    return contextualData.motivation.homeTeam || 0.5;
  }

  private calculateTrapGameIndicator(gameData: RawGameData, historicalData: RawGameData[]): number {
    // Simplified trap game detection
    const recentGames = historicalData.slice(-3);
    const avgOpponentStrength = recentGames.reduce((sum, game) => sum + game.totalYards.away, 0) / recentGames.length;
    const currentOpponentStrength = gameData.totalYards.away;
    
    return currentOpponentStrength < avgOpponentStrength * 0.8 ? 0.8 : 0.2;
  }

  private calculateDivisionalFamiliarity(gameData: RawGameData): number {
    // Check if teams are in same division
    const divisions = {
      'BUF': 'AFC East', 'MIA': 'AFC East', 'NE': 'AFC East', 'NYJ': 'AFC East',
      'KC': 'AFC West', 'DEN': 'AFC West', 'LV': 'AFC West', 'LAC': 'AFC West',
    };
    
    return divisions[gameData.homeTeam] === divisions[gameData.awayTeam] ? 1 : 0;
  }

  private calculateH2HRecord(gameData: RawGameData, historicalData: RawGameData[]): number {
    const h2hGames = historicalData.filter(game => 
      (game.homeTeam === gameData.homeTeam && game.awayTeam === gameData.awayTeam) ||
      (game.homeTeam === gameData.awayTeam && game.awayTeam === gameData.homeTeam)
    );
    
    if (h2hGames.length === 0) return 0.5;
    
    const homeWins = h2hGames.filter(game => 
      game.homeTeam === gameData.homeTeam ? game.homeScore > game.awayScore : game.awayScore > game.homeScore
    ).length;
    
    return homeWins / h2hGames.length;
  }

  private calculateRecentForm(gameData: RawGameData, historicalData: RawGameData[]): { home: number; away: number } {
    const recentGames = historicalData.slice(-5);
    
    const homeForm = recentGames
      .filter(game => game.homeTeam === gameData.homeTeam)
      .reduce((sum, game) => sum + (game.homeScore > game.awayScore ? 1 : 0), 0) / Math.max(recentGames.length, 1);
    
    const awayForm = recentGames
      .filter(game => game.awayTeam === gameData.awayTeam)
      .reduce((sum, game) => sum + (game.awayScore > game.homeScore ? 1 : 0), 0) / Math.max(recentGames.length, 1);
    
    return { home: homeForm, away: awayForm };
  }

  // Player-specific calculations
  private calculateUsageRate(player: RawPlayerData, gameData: RawGameData): number {
    const totalSnaps = gameData.timeOfPossession.home * 60 / 30; // Rough estimate
    return player.snapCount / totalSnaps;
  }

  private calculateEfficiencyRating(player: RawPlayerData, gameData: RawGameData): number {
    const totalYards = (player.stats.passingYards || 0) + (player.stats.rushingYards || 0) + (player.stats.receivingYards || 0);
    const totalTouches = (player.stats.attempts || 0) + (player.stats.carries || 0) + (player.stats.targets || 0);
    
    return totalTouches > 0 ? totalYards / totalTouches : 0;
  }

  private calculateConsistencyScore(player: RawPlayerData, historicalData: RawGameData[]): number {
    // Simplified consistency calculation
    return 0.5 + Math.random() * 0.5;
  }

  private calculateSituationalUsage(player: RawPlayerData, situation: string): number {
    // Simplified situational usage calculation
    return 0.1 + Math.random() * 0.3;
  }

  private calculateOpponentDefenseRating(player: RawPlayerData, gameData: RawGameData): number {
    // Simplified opponent defense rating
    return 0.3 + Math.random() * 0.4;
  }

  private calculateWeatherAdjustment(player: RawPlayerData, contextualData: any): number {
    // Position-specific weather adjustments
    const position = player.position;
    let adjustment = 0.5;
    
    if (position === 'QB' && contextualData.weather?.windSpeed > 15) {
      adjustment -= 0.2;
    }
    
    if (position === 'WR' && contextualData.weather?.precipitation > 0.1) {
      adjustment -= 0.1;
    }
    
    return Math.max(0, Math.min(1, adjustment));
  }

  private calculateRestAdvantage(player: RawPlayerData, contextualData: any): number {
    return contextualData.restDifferential > 0 ? 0.6 : 0.4;
  }

  private calculateVsOpponentAverage(player: RawPlayerData, historicalData: RawGameData[]): number {
    // Simplified vs opponent average
    return 50 + Math.random() * 100;
  }

  private calculateRecentTrend(player: RawPlayerData, historicalData: RawGameData[]): number {
    // Simplified recent trend calculation
    return -0.2 + Math.random() * 0.4;
  }

  private calculateSeasonProgression(player: RawPlayerData, historicalData: RawGameData[]): number {
    // Simplified season progression
    return 0.3 + Math.random() * 0.4;
  }

  private calculateExpectedYards(player: RawPlayerData, gameData: RawGameData): number {
    // Simplified expected yards calculation
    return 50 + Math.random() * 100;
  }

  private calculateVarianceScore(player: RawPlayerData, historicalData: RawGameData[]): number {
    // Simplified variance score
    return 0.1 + Math.random() * 0.3;
  }

  private calculateClutchFactor(player: RawPlayerData, historicalData: RawGameData[]): number {
    // Simplified clutch factor
    return 0.4 + Math.random() * 0.4;
  }

  // Combined feature calculations
  private calculateOverallAdvantage(player: any, gameFeatures: any): number {
    return (player.usageRate + player.efficiencyRating + gameFeatures.yardageRatio) / 3;
  }

  private calculateRiskScore(player: any, gameFeatures: any): number {
    return (player.varianceScore + gameFeatures.trapGameIndicator + gameFeatures.weatherImpact) / 3;
  }

  private calculateValueScore(player: any, gameFeatures: any): number {
    return (player.expectedYards + player.efficiencyRating + gameFeatures.efficiencyRatio) / 3;
  }

  // Normalization methods
  normalizeFeatures(features: number[], method: string = 'zscore'): number[] {
    switch (method) {
      case 'zscore':
        return this.zScoreNormalize(features);
      case 'minmax':
        return this.minMaxNormalize(features);
      case 'robust':
        return this.robustNormalize(features);
      default:
        return features;
    }
  }

  private zScoreNormalize(features: number[]): number[] {
    const mean = features.reduce((sum, val) => sum + val, 0) / features.length;
    const std = Math.sqrt(features.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / features.length);
    
    return features.map(val => (val - mean) / std);
  }

  private minMaxNormalize(features: number[]): number[] {
    const min = Math.min(...features);
    const max = Math.max(...features);
    
    return features.map(val => (val - min) / (max - min));
  }

  private robustNormalize(features: number[]): number[] {
    const sorted = [...features].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const median = sorted[Math.floor(sorted.length * 0.5)];
    
    return features.map(val => (val - median) / (q3 - q1));
  }
}

export const featureEngineeringPipeline = new FeatureEngineeringPipeline();
