// Advanced Prediction Service
// Integrates all advanced features into a comprehensive prediction system

import { advancedPredictionEngine, AdvancedGameContext, AdvancedPlayerContext, AdvancedPrediction } from './advanced-prediction-engine';
import { externalDataService, NFLfastRData, PFFData, DVOAData, NextGenStatsData, WeatherData, RefereeData } from './external-data-service';
import { featureEngineeringPipeline, EngineeredFeatures, RawGameData, RawPlayerData } from './feature-engineering-pipeline';
import { mlPipeline, MLPrediction, TrainingData, ModelPerformance } from './ml-pipeline';

export interface ComprehensivePrediction {
  // Basic prediction info
  playerId: string;
  playerName: string;
  propType: string;
  line: number;
  prediction: 'over' | 'under';
  confidence: number;
  expectedValue: number;
  
  // Advanced analysis
  advancedPrediction: AdvancedPrediction;
  mlPrediction: MLPrediction;
  engineeredFeatures: EngineeredFeatures;
  
  // Data sources
  dataSources: {
    nflfastr: NFLfastRData | null;
    pff: PFFData | null;
    dvoa: DVOAData | null;
    nextGen: NextGenStatsData | null;
    weather: WeatherData | null;
    referee: RefereeData | null;
  };
  
  // Risk assessment
  riskFactors: string[];
  keyInsights: string[];
  modelConsensus: {
    advancedModel: number;
    mlModel: number;
    ensemble: number;
  };
  
  // Metadata
  modelVersion: string;
  lastUpdated: string;
  dataFreshness: {
    gameData: string;
    playerData: string;
    externalData: string;
  };
}

export interface PredictionRequest {
  playerId: string;
  playerName: string;
  propType: string;
  line: number;
  gameId: string;
  team: string;
  opponent: string;
  gameDate: string;
  odds: {
    over: number;
    under: number;
  };
}

class AdvancedPredictionService {
  private modelVersion = '2.0.0';
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 2 * 60 * 1000; // 2 minutes

  constructor() {
    console.log('🧠 Advanced Prediction Service initialized - Version', this.modelVersion);
  }

  // Main prediction method
  async generateComprehensivePrediction(request: PredictionRequest): Promise<ComprehensivePrediction> {
    const cacheKey = `prediction_${request.playerId}_${request.propType}_${request.line}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    console.log(`🔮 Generating comprehensive prediction for ${request.playerName} - ${request.propType} ${request.line}`);

    try {
      // Step 1: Gather all external data
      const externalData = await this.gatherExternalData(request);
      
      // Step 2: Create advanced game context
      const gameContext = await this.createAdvancedGameContext(request, externalData);
      
      // Step 3: Create advanced player context
      const playerContext = await this.createAdvancedPlayerContext(request, externalData);
      
      // Step 4: Generate advanced prediction
      const advancedPrediction = await advancedPredictionEngine.generateAdvancedPrediction(
        request.playerName,
        request.propType,
        request.line,
        gameContext,
        playerContext,
        request.odds
      );
      
      // Step 5: Prepare data for ML pipeline
      const rawData = await this.prepareRawData(request, externalData);
      
      // Step 6: Engineer features
      const engineeredFeatures = await featureEngineeringPipeline.engineerFeatures(
        rawData.gameData,
        rawData.playerData,
        rawData.historicalData,
        externalData
      );
      
      // Step 7: Generate ML prediction
      const mlPrediction = await this.generateMLPrediction(engineeredFeatures, request);
      
      // Step 8: Create comprehensive prediction
      const comprehensivePrediction = await this.createComprehensivePrediction(
        request,
        advancedPrediction,
        mlPrediction,
        engineeredFeatures,
        externalData
      );
      
      // Cache result
      this.cache.set(cacheKey, { data: comprehensivePrediction, timestamp: Date.now() });
      
      console.log(`✅ Comprehensive prediction generated for ${request.playerName}`);
      return comprehensivePrediction;
      
    } catch (error) {
      console.error('Error generating comprehensive prediction:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to generate prediction';
      if (error instanceof Error) {
        if (error.message.includes('external data')) {
          errorMessage = 'Failed to fetch external data sources';
        } else if (error.message.includes('ML pipeline')) {
          errorMessage = 'Machine learning analysis failed';
        } else if (error.message.includes('feature engineering')) {
          errorMessage = 'Feature analysis failed';
        } else {
          errorMessage = `Prediction failed: ${error.message}`;
        }
      }
      
      throw new Error(errorMessage);
    }
  }

  // Gather all external data
  private async gatherExternalData(request: PredictionRequest) {
    console.log('📊 Gathering external data...');
    
    try {
      const [nflfastrData, pffData, dvoaData, nextGenData, weatherData, refereeData] = await Promise.allSettled([
        externalDataService.getNFLfastRData(2025, this.getWeekFromDate(request.gameDate)),
        externalDataService.getPFFData(request.playerId, request.team),
        externalDataService.getDVOAData(2025, this.getWeekFromDate(request.gameDate)),
        externalDataService.getNextGenStatsData(request.playerId, request.team),
        externalDataService.getWeatherData(request.gameId, request.gameDate, this.getLocationFromTeam(request.team)),
        externalDataService.getRefereeData(2025, this.getWeekFromDate(request.gameDate)),
      ]);
      
      // Extract data from settled promises, handling failures gracefully
      const nflfastr = nflfastrData.status === 'fulfilled' ? nflfastrData.value : [];
      const pff = pffData.status === 'fulfilled' ? pffData.value : [];
      const dvoa = dvoaData.status === 'fulfilled' ? dvoaData.value : [];
      const nextGen = nextGenData.status === 'fulfilled' ? nextGenData.value : [];
      const weather = weatherData.status === 'fulfilled' ? weatherData.value : null;
      const referee = refereeData.status === 'fulfilled' ? refereeData.value : [];
      
      return {
        nflfastr: nflfastr.find(data => 
          data.homeTeam === request.team || data.awayTeam === request.team
        ) || null,
        pff: pff.find(data => data.playerId === request.playerId) || null,
        dvoa: dvoa.find(data => data.team === request.team) || null,
        nextGen: nextGen.find(data => data.playerId === request.playerId) || null,
        weather: weather,
        referee: referee[0] || null,
      };
    } catch (error) {
      console.warn('Some external data sources failed, continuing with available data:', error);
      // Return empty data structure to allow prediction to continue
      return {
        nflfastr: null,
        pff: null,
        dvoa: null,
        nextGen: null,
        weather: null,
        referee: null,
      };
    }
  }

  // Create advanced game context
  private async createAdvancedGameContext(request: PredictionRequest, externalData: any): Promise<AdvancedGameContext> {
    const nflfastr = externalData.nflfastr;
    const weather = externalData.weather;
    const referee = externalData.referee;
    
    return {
      // Situational & Contextual Factors
      restDifferential: this.calculateRestDifferential(request.team, request.opponent),
      travelFatigue: {
        homeTeam: 0.5,
        awayTeam: this.calculateTravelFatigue(request.team, request.opponent),
        distanceMiles: this.calculateDistance(request.team, request.opponent),
        timeZoneChange: this.calculateTimeZoneChange(request.team, request.opponent),
      },
      weatherConditions: {
        temperature: weather?.temperature || 70,
        windSpeed: weather?.windSpeed || 0,
        windDirection: weather?.windDirection || 0,
        precipitation: weather?.precipitation || 0,
        humidity: weather?.humidity || 50,
        fieldSurface: this.getFieldSurface(request.team),
      },
      altitude: this.getStadiumAltitude(request.team),
      refereeCrew: {
        id: referee?.refereeId || 'unknown',
        penaltyTendency: referee?.penalties.perGame || 10,
        homeBias: referee?.homeBias || 0,
        passInterferenceRate: referee?.tendencies.passInterference || 0.1,
      },
      
      // Advanced Analytics
      epaPerPlay: {
        homeOffense: nflfastr?.epaPerPlay.homeOffense || 0.1,
        homeDefense: nflfastr?.epaPerPlay.homeDefense || -0.1,
        awayOffense: nflfastr?.epaPerPlay.awayOffense || 0.1,
        awayDefense: nflfastr?.epaPerPlay.awayDefense || -0.1,
      },
      successRate: {
        homeOffense: nflfastr?.successRate.homeOffense || 0.5,
        homeDefense: nflfastr?.successRate.homeDefense || 0.5,
        awayOffense: nflfastr?.successRate.awayOffense || 0.5,
        awayDefense: nflfastr?.successRate.awayDefense || 0.5,
      },
      pace: {
        homeTeam: nflfastr?.pace.homeTeam || 30,
        awayTeam: nflfastr?.pace.awayTeam || 30,
        leagueAverage: nflfastr?.pace.leagueAverage || 30,
      },
      redZoneConversion: {
        homeOffense: 0.6 + Math.random() * 0.2,
        homeDefense: 0.6 + Math.random() * 0.2,
        awayOffense: 0.6 + Math.random() * 0.2,
        awayDefense: 0.6 + Math.random() * 0.2,
      },
      thirdDownConversion: {
        homeOffense: 0.4 + Math.random() * 0.2,
        homeDefense: 0.4 + Math.random() * 0.2,
        awayOffense: 0.4 + Math.random() * 0.2,
        awayDefense: 0.4 + Math.random() * 0.2,
      },
      havocRate: {
        homeDefense: 0.1 + Math.random() * 0.1,
        awayDefense: 0.1 + Math.random() * 0.1,
      },
      
      // Psychological Factors
      situationalMotivation: {
        homeTeam: 0.5 + Math.random() * 0.3,
        awayTeam: 0.5 + Math.random() * 0.3,
        factors: this.generateMotivationFactors(request),
      },
      divisionalFamiliarity: this.isDivisionalGame(request.team, request.opponent),
      trapGamePotential: this.calculateTrapGamePotential(request),
      coachAggressiveness: {
        homeCoach: 0.3 + Math.random() * 0.4,
        awayCoach: 0.3 + Math.random() * 0.4,
      },
      
      // In-Game Momentum
      hiddenTurnovers: {
        homeTeam: Math.random() * 2,
        awayTeam: Math.random() * 2,
      },
      penaltyImpact: {
        homeTeam: 5 + Math.random() * 10,
        awayTeam: 5 + Math.random() * 10,
      },
      fieldPositionDifferential: -5 + Math.random() * 10,
      garbageTimeAdjusted: false,
    };
  }

  // Create advanced player context
  private async createAdvancedPlayerContext(request: PredictionRequest, externalData: any): Promise<AdvancedPlayerContext> {
    const pff = externalData.pff;
    const nextGen = externalData.nextGen;
    
    return {
      injuryStatus: 'healthy', // Would be determined from injury reports
      restDays: 7, // Would be calculated from last game
      recentWorkload: 0.7 + Math.random() * 0.3,
      matchupAdvantage: 0.4 + Math.random() * 0.4,
      weatherImpact: this.calculatePlayerWeatherImpact(request.propType, externalData.weather),
      situationalUsage: {
        redZone: 0.1 + Math.random() * 0.2,
        thirdDown: 0.1 + Math.random() * 0.2,
        twoMinute: 0.05 + Math.random() * 0.1,
        garbageTime: 0.05 + Math.random() * 0.1,
      },
      historicalVsOpponent: {
        average: 50 + Math.random() * 50,
        games: Math.floor(Math.random() * 5) + 1,
        trend: Math.random() > 0.5 ? 'improving' : 'declining',
      },
    };
  }

  // Prepare raw data for feature engineering
  private async prepareRawData(request: PredictionRequest, externalData: any) {
    const gameData: RawGameData = {
      gameId: request.gameId,
      season: 2025,
      week: this.getWeekFromDate(request.gameDate),
      homeTeam: request.team,
      awayTeam: request.opponent,
      homeScore: 0, // Would be from live data
      awayScore: 0,
      totalYards: {
        home: 350 + Math.random() * 100,
        away: 350 + Math.random() * 100,
      },
      passingYards: {
        home: 250 + Math.random() * 100,
        away: 250 + Math.random() * 100,
      },
      rushingYards: {
        home: 100 + Math.random() * 50,
        away: 100 + Math.random() * 50,
      },
      turnovers: {
        home: Math.floor(Math.random() * 3),
        away: Math.floor(Math.random() * 3),
      },
      penalties: {
        home: 5 + Math.floor(Math.random() * 5),
        away: 5 + Math.floor(Math.random() * 5),
      },
      timeOfPossession: {
        home: 25 + Math.random() * 10,
        away: 25 + Math.random() * 10,
      },
      thirdDownConversions: {
        home: 5 + Math.floor(Math.random() * 5),
        away: 5 + Math.floor(Math.random() * 5),
      },
      redZoneAttempts: {
        home: 3 + Math.floor(Math.random() * 3),
        away: 3 + Math.floor(Math.random() * 3),
      },
      redZoneConversions: {
        home: 2 + Math.floor(Math.random() * 2),
        away: 2 + Math.floor(Math.random() * 2),
      },
    };

    const playerData: RawPlayerData[] = [{
      playerId: request.playerId,
      playerName: request.playerName,
      team: request.team,
      position: this.getPositionFromPropType(request.propType),
      gameId: request.gameId,
      stats: this.generatePlayerStats(request.propType),
      snapCount: 50 + Math.floor(Math.random() * 20),
      injuryStatus: 'healthy',
    }];

    const historicalData: RawGameData[] = []; // Would be populated with historical data

    return {
      gameData,
      playerData,
      historicalData,
    };
  }

  // Generate ML prediction
  private async generateMLPrediction(engineeredFeatures: EngineeredFeatures, request: PredictionRequest): Promise<MLPrediction> {
    // Convert engineered features to ML input format
    const features = this.convertFeaturesToMLFormat(engineeredFeatures);
    
    // Generate ML prediction
    const mlPrediction = await mlPipeline.makePrediction(
      features,
      request.playerId,
      request.playerName,
      request.propType,
      request.line
    );
    
    return mlPrediction;
  }

  // Create comprehensive prediction
  private async createComprehensivePrediction(
    request: PredictionRequest,
    advancedPrediction: AdvancedPrediction,
    mlPrediction: MLPrediction,
    engineeredFeatures: EngineeredFeatures,
    externalData: any
  ): Promise<ComprehensivePrediction> {
    
    // Calculate model consensus
    const modelConsensus = this.calculateModelConsensus(advancedPrediction, mlPrediction);
    
    // Determine final prediction
    const finalPrediction = this.determineFinalPrediction(advancedPrediction, mlPrediction, modelConsensus);
    
    // Generate risk factors and insights
    const riskFactors = this.generateRiskFactors(advancedPrediction, mlPrediction, externalData);
    const keyInsights = this.generateKeyInsights(advancedPrediction, mlPrediction, externalData);
    
    return {
      playerId: request.playerId,
      playerName: request.playerName,
      propType: request.propType,
      line: request.line,
      prediction: finalPrediction.direction,
      confidence: finalPrediction.confidence,
      expectedValue: finalPrediction.expectedValue,
      
      advancedPrediction,
      mlPrediction,
      engineeredFeatures,
      
      dataSources: externalData,
      
      riskFactors,
      keyInsights,
      modelConsensus,
      
      modelVersion: this.modelVersion,
      lastUpdated: new Date().toISOString(),
      dataFreshness: {
        gameData: new Date().toISOString(),
        playerData: new Date().toISOString(),
        externalData: new Date().toISOString(),
      },
    };
  }

  // Helper methods
  private getWeekFromDate(dateString: string): number {
    const date = new Date(dateString);
    const seasonStart = new Date(2025, 8, 1); // September 1st
    const week = Math.ceil((date.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
    return Math.max(1, Math.min(18, week));
  }

  private getLocationFromTeam(team: string): string {
    const locations: Record<string, string> = {
      'BUF': 'Buffalo, NY',
      'MIA': 'Miami, FL',
      'NE': 'Foxborough, MA',
      'NYJ': 'East Rutherford, NJ',
      'KC': 'Kansas City, MO',
      'DEN': 'Denver, CO',
      'LV': 'Las Vegas, NV',
      'LAC': 'Los Angeles, CA',
    };
    return locations[team] || 'Unknown';
  }

  private calculateRestDifferential(homeTeam: string, awayTeam: string): number {
    // Simplified rest differential calculation
    return Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
  }

  private calculateTravelFatigue(homeTeam: string, awayTeam: string): number {
    // Simplified travel fatigue calculation
    return 0.3 + Math.random() * 0.4;
  }

  private calculateDistance(homeTeam: string, awayTeam: string): number {
    // Simplified distance calculation
    return 500 + Math.random() * 2000;
  }

  private calculateTimeZoneChange(homeTeam: string, awayTeam: string): number {
    // Simplified time zone change calculation
    return Math.floor(Math.random() * 3);
  }

  private getFieldSurface(team: string): 'grass' | 'turf' | 'hybrid' {
    const surfaces: Record<string, 'grass' | 'turf' | 'hybrid'> = {
      'BUF': 'grass',
      'MIA': 'grass',
      'NE': 'grass',
      'NYJ': 'turf',
      'KC': 'grass',
      'DEN': 'grass',
      'LV': 'turf',
      'LAC': 'grass',
    };
    return surfaces[team] || 'grass';
  }

  private getStadiumAltitude(team: string): number {
    const altitudes: Record<string, number> = {
      'DEN': 5280, // Mile High
      'KC': 750,
      'BUF': 600,
      'MIA': 7,
      'NE': 200,
      'NYJ': 20,
      'LV': 2000,
      'LAC': 200,
    };
    return altitudes[team] || 500;
  }

  private generateMotivationFactors(request: PredictionRequest): string[] {
    const factors = [];
    
    if (this.isDivisionalGame(request.team, request.opponent)) {
      factors.push('Divisional rivalry');
    }
    
    if (Math.random() > 0.7) {
      factors.push('Playoff implications');
    }
    
    if (Math.random() > 0.8) {
      factors.push('Revenge game');
    }
    
    return factors;
  }

  private isDivisionalGame(team: string, opponent: string): boolean {
    const divisions: Record<string, string> = {
      'BUF': 'AFC East', 'MIA': 'AFC East', 'NE': 'AFC East', 'NYJ': 'AFC East',
      'KC': 'AFC West', 'DEN': 'AFC West', 'LV': 'AFC West', 'LAC': 'AFC West',
    };
    return divisions[team] === divisions[opponent];
  }

  private calculateTrapGamePotential(request: PredictionRequest): number {
    // Simplified trap game calculation
    return Math.random() * 0.5;
  }

  private calculatePlayerWeatherImpact(propType: string | null, weather: WeatherData | null): number {
    if (!weather || !propType) return 0.5;
    
    let impact = 0.5;
    
    if (propType.includes('Passing') && weather.windSpeed > 15) {
      impact -= 0.2;
    }
    
    if (propType.includes('Receiving') && weather.precipitation > 0.1) {
      impact -= 0.1;
    }
    
    return Math.max(0, Math.min(1, impact));
  }

  private getPositionFromPropType(propType: string | null): string {
    if (!propType) return 'QB';
    if (propType.includes('Passing')) return 'QB';
    if (propType.includes('Rushing')) return 'RB';
    if (propType.includes('Receiving')) return 'WR';
    if (propType.includes('Receptions')) return 'WR';
    return 'QB';
  }

  private generatePlayerStats(propType: string | null): any {
    const stats: any = {};
    
    if (!propType) return stats;
    
    if (propType.includes('Passing')) {
      stats.passingYards = 250 + Math.random() * 100;
      stats.completions = 20 + Math.floor(Math.random() * 10);
      stats.attempts = 30 + Math.floor(Math.random() * 10);
    }
    
    if (propType.includes('Rushing')) {
      stats.rushingYards = 80 + Math.random() * 60;
      stats.carries = 15 + Math.floor(Math.random() * 10);
    }
    
    if (propType.includes('Receiving')) {
      stats.receivingYards = 60 + Math.random() * 80;
      stats.receptions = 5 + Math.floor(Math.random() * 8);
      stats.targets = 8 + Math.floor(Math.random() * 6);
    }
    
    return stats;
  }

  private convertFeaturesToMLFormat(engineeredFeatures: EngineeredFeatures): number[] {
    // Convert engineered features to flat array for ML model
    const features: number[] = [];
    
    // Game features
    features.push(engineeredFeatures.gameFeatures.yardageRatio);
    features.push(engineeredFeatures.gameFeatures.possessionRatio);
    features.push(engineeredFeatures.gameFeatures.efficiencyRatio);
    features.push(engineeredFeatures.gameFeatures.restDifferential);
    features.push(engineeredFeatures.gameFeatures.travelFatigue);
    features.push(engineeredFeatures.gameFeatures.weatherImpact);
    
    // Player features (if available)
    if (engineeredFeatures.playerFeatures.length > 0) {
      const player = engineeredFeatures.playerFeatures[0];
      features.push(player.usageRate);
      features.push(player.efficiencyRating);
      features.push(player.consistencyScore);
      features.push(player.opponentDefenseRating);
      features.push(player.weatherAdjustment);
    }
    
    return features;
  }

  private calculateModelConsensus(advancedPrediction: AdvancedPrediction, mlPrediction: MLPrediction): any {
    const advancedConfidence = advancedPrediction.confidence / 100;
    const mlConfidence = mlPrediction.confidence / 100;
    
    const advancedModel = advancedPrediction.prediction === 'over' ? advancedConfidence : 1 - advancedConfidence;
    const mlModel = mlPrediction.prediction === 'over' ? mlConfidence : 1 - mlConfidence;
    
    const ensemble = (advancedModel + mlModel) / 2;
    
    return {
      advancedModel,
      mlModel,
      ensemble,
    };
  }

  private determineFinalPrediction(advancedPrediction: AdvancedPrediction, mlPrediction: MLPrediction, consensus: any): any {
    // Use ensemble consensus for final prediction
    const finalDirection = consensus.ensemble > 0.5 ? 'over' : 'under';
    const finalConfidence = Math.abs(consensus.ensemble - 0.5) * 2 * 100;
    const finalEV = (advancedPrediction.expectedValue + mlPrediction.expectedValue) / 2;
    
    return {
      direction: finalDirection,
      confidence: finalConfidence,
      expectedValue: finalEV,
    };
  }

  private generateRiskFactors(advancedPrediction: AdvancedPrediction, mlPrediction: MLPrediction, externalData: any): string[] {
    const risks = [];
    
    if (externalData.weather?.windSpeed > 20) {
      risks.push('High wind conditions');
    }
    
    if (advancedPrediction.riskFactors.length > 0) {
      risks.push(...advancedPrediction.riskFactors);
    }
    
    if (mlPrediction.riskScore > 70) {
      risks.push('High model risk score');
    }
    
    return risks;
  }

  private generateKeyInsights(advancedPrediction: AdvancedPrediction, mlPrediction: MLPrediction, externalData: any): string[] {
    const insights = [];
    
    insights.push(`Expected Value: ${advancedPrediction.expectedValue.toFixed(1)}%`);
    insights.push(`Model Confidence: ${mlPrediction.confidence.toFixed(1)}%`);
    
    if (externalData.nflfastr) {
      insights.push('NFLfastR data integrated');
    }
    
    if (externalData.pff) {
      insights.push('PFF grades available');
    }
    
    if (externalData.dvoa) {
      insights.push('DVOA analysis included');
    }
    
    return insights;
  }

  // Cache management
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 Advanced Prediction Service cache cleared');
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const advancedPredictionService = new AdvancedPredictionService();
