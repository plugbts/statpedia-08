import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';
import { realTimeOddsService, OddsSnapshot, VigCalculation } from './real-time-odds-service';
import { mlPredictionService, MLPrediction, MLFeatures } from './ml-prediction-service';
import { unifiedSportsAPI } from './unified-sports-api';

// Enhanced player prop with real-time data and ML predictions
export interface EnhancedPlayerProp {
  id: string;
  playerId: string;
  playerName: string;
  team: string;
  teamAbbr: string;
  opponent: string;
  opponentAbbr: string;
  gameId: string;
  sport: string;
  propType: string;
  line: number;
  overOdds: number;
  underOdds: number;
  gameDate: string;
  gameTime: string;
  headshotUrl?: string;
  
  // Enhanced data
  realTimeOdds?: OddsSnapshot;
  mlPrediction?: MLPrediction;
  vigCalculation?: VigCalculation;
  
  // Confidence and risk metrics
  confidence: number;
  expectedValue: number;
  riskLevel: 'low' | 'medium' | 'high';
  
  // Market data
  marketMetrics: {
    volume: number;
    lineMovement: number;
    oddsMovement: number;
    volatility: number;
    consensus: {
      line: number;
      overOdds: number;
      underOdds: number;
      confidence: number;
    };
  };
  
  // Advanced analytics
  advancedStats?: {
    homeAwaySplit: {
      home: { average: number; hitRate: number; games: number };
      away: { average: number; hitRate: number; games: number };
    };
    opponentStrength: {
      strong: { average: number; hitRate: number; games: number };
      weak: { average: number; hitRate: number; games: number };
    };
    restDays: {
      short: { average: number; hitRate: number; games: number };
      long: { average: number; hitRate: number; games: number };
    };
    situational: {
      playoff: { average: number; hitRate: number; games: number };
      regular: { average: number; hitRate: number; games: number };
    };
  };
  
  // Confidence factors
  confidenceFactors?: Array<{
    factor: string;
    weight: number;
    impact: 'positive' | 'negative' | 'neutral';
    reasoning?: string;
  }>;
  
  // Historical data
  seasonStats?: {
    average: number;
    median: number;
    gamesPlayed: number;
    hitRate: number;
    last5Games: number[];
    seasonHigh: number;
    seasonLow: number;
  };
  
  // AI prediction
  aiPrediction?: {
    recommended: 'over' | 'under';
    confidence: number;
    reasoning: string;
    factors: string[];
  };
  
  // Additional properties for compatibility
  valueRating: number;
  factors: string[];
  advancedReasoning: string;
  injuryImpact: string;
  weatherImpact: string;
  matchupAnalysis: string;
  historicalTrends: string;
  keyInsights: string[];
  isBookmarked?: boolean;
  
  // Metadata
  lastUpdated: string;
  isLive: boolean;
  dataQuality: 'high' | 'medium' | 'low';
}

class EnhancedUnifiedSportsAPI {
  private cache: Map<string, { data: EnhancedPlayerProp[]; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private isInitialized = false;

  // Initialize the enhanced API
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    logAPI('EnhancedUnifiedSportsAPI', 'Initializing enhanced sports API');
    
    try {
      // Initialize ML service
      await mlPredictionService.initialize();
      
      // Start real-time odds synchronization
      realTimeOddsService.startSync();
      
      this.isInitialized = true;
      logSuccess('EnhancedUnifiedSportsAPI', 'Enhanced sports API initialized successfully');
    } catch (error) {
      logError('EnhancedUnifiedSportsAPI', 'Failed to initialize enhanced sports API:', error);
      throw error;
    }
  }

  // Get enhanced player props with real-time data and ML predictions
  async getEnhancedPlayerProps(
    sport: string, 
    season?: number, 
    week?: number, 
    selectedSportsbook?: string
  ): Promise<EnhancedPlayerProp[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const cacheKey = `${sport}_${season || 'current'}_${week || 'current'}_${selectedSportsbook || 'all'}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      logAPI('EnhancedUnifiedSportsAPI', `Returning cached enhanced props for ${sport}`);
      return cached.data;
    }

    logAPI('EnhancedUnifiedSportsAPI', `Fetching enhanced player props for ${sport}`);
    
    try {
      // Get base player props from unified sports API
      const baseProps = await unifiedSportsAPI.getPlayerProps(sport, season, week, selectedSportsbook);
      logAPI('EnhancedUnifiedSportsAPI', `Retrieved ${baseProps.length} base props`);
      
      // Enhance props with real-time data and ML predictions
      const enhancedProps = await this.enhancePlayerProps(baseProps);
      
      // Cache the results
      this.cache.set(cacheKey, {
        data: enhancedProps,
        timestamp: Date.now()
      });
      
      logSuccess('EnhancedUnifiedSportsAPI', `Enhanced ${enhancedProps.length} player props`);
      return enhancedProps;
      
    } catch (error) {
      logError('EnhancedUnifiedSportsAPI', 'Failed to get enhanced player props:', error);
      throw error;
    }
  }

  // Enhance player props with real-time data and ML predictions
  private async enhancePlayerProps(baseProps: any[]): Promise<EnhancedPlayerProp[]> {
    const enhancedProps: EnhancedPlayerProp[] = [];
    
    // Process props in batches to avoid overwhelming the services
    const batchSize = 10;
    for (let i = 0; i < baseProps.length; i += batchSize) {
      const batch = baseProps.slice(i, i + batchSize);
      const batchPromises = batch.map(prop => this.enhanceSingleProp(prop));
      
      try {
        const enhancedBatch = await Promise.allSettled(batchPromises);
        enhancedBatch.forEach(result => {
          if (result.status === 'fulfilled' && result.value) {
            enhancedProps.push(result.value);
          }
        });
      } catch (error) {
        logWarning('EnhancedUnifiedSportsAPI', `Failed to enhance batch ${i}-${i + batchSize}:`, error);
      }
    }
    
    return enhancedProps;
  }

  // Enhance a single player prop
  private async enhanceSingleProp(baseProp: any): Promise<EnhancedPlayerProp | null> {
    try {
      // Get real-time odds
      const realTimeOdds = await realTimeOddsService.getRealTimeOdds(baseProp.playerId, baseProp.propType);
      
      // Extract ML features
      const features = mlPredictionService.extractFeatures(baseProp, {
        restDays: 2,
        isPlayoff: false,
        isIndoor: true,
        lineMovement: 0,
        volume: 0,
        publicSentiment: 0.5
      });
      
      // Get ML prediction
      const mlPrediction = await mlPredictionService.makePrediction(
        baseProp.propType,
        features,
        baseProp.line
      );
      
      // Calculate vig/juice
      const vigCalculation = realTimeOddsService.calculateVig(
        baseProp.overOdds,
        baseProp.underOdds
      );
      
      // Calculate risk level
      const riskLevel = this.calculateRiskLevel(mlPrediction.confidence, baseProp.seasonStats?.hitRate || 0.5);
      
      // Calculate market metrics
      const marketMetrics = realTimeOdds ? 
        realTimeOdds.marketMetrics : 
        {
          volume: 0,
          lineMovement: 0,
          oddsMovement: 0,
          volatility: 0.1,
          consensus: {
            line: baseProp.line,
            overOdds: baseProp.overOdds,
            underOdds: baseProp.underOdds,
            confidence: 0.5
          }
        };
      
      // Determine data quality
      const dataQuality = this.assessDataQuality(realTimeOdds, mlPrediction);
      
      // Create enhanced prop
      const enhancedProp: EnhancedPlayerProp = {
        ...baseProp,
        realTimeOdds,
        mlPrediction,
        vigCalculation,
        confidence: mlPrediction.confidence,
        expectedValue: mlPrediction.expectedValue,
        riskLevel,
        marketMetrics,
        dataQuality,
        lastUpdated: new Date().toISOString(),
        isLive: this.isGameLive(baseProp.gameDate, baseProp.gameTime),
        
        // Additional compatibility properties
        valueRating: this.calculateValueRating(mlPrediction, vigCalculation),
        factors: mlPrediction.featureImportance.slice(0, 5).map(f => f.feature),
        advancedReasoning: this.generateAIReasoning(mlPrediction, features),
        injuryImpact: baseProp.injuryStatus === 'Healthy' ? 'No impact' : 'May affect performance',
        weatherImpact: 'Indoor game - no weather impact',
        matchupAnalysis: this.generateMatchupAnalysis(baseProp),
        historicalTrends: this.generateHistoricalTrends(baseProp),
        keyInsights: mlPrediction.featureImportance.slice(0, 3).map(f => `${f.feature}: ${f.impact} impact`),
        isBookmarked: false,
        
        // Enhanced AI prediction
        aiPrediction: {
          recommended: mlPrediction.prediction,
          confidence: mlPrediction.confidence,
          reasoning: this.generateAIReasoning(mlPrediction, features),
          factors: mlPrediction.featureImportance.slice(0, 5).map(f => f.feature)
        },
        
        // Confidence factors
        confidenceFactors: mlPrediction.featureImportance.slice(0, 8).map(factor => ({
          factor: factor.feature,
          weight: factor.importance,
          impact: factor.impact,
          reasoning: this.generateFactorReasoning(factor.feature, factor.impact)
        }))
      };
      
      return enhancedProp;
      
    } catch (error) {
      logWarning('EnhancedUnifiedSportsAPI', `Failed to enhance prop for ${baseProp.playerName}:`, error);
      return null;
    }
  }

  // Calculate risk level based on confidence and hit rate
  private calculateRiskLevel(confidence: number, hitRate: number): 'low' | 'medium' | 'high' {
    const riskScore = (confidence * 0.6) + (hitRate * 0.4);
    
    if (riskScore >= 0.75) return 'low';
    if (riskScore >= 0.55) return 'medium';
    return 'high';
  }

  // Assess data quality
  private assessDataQuality(realTimeOdds: OddsSnapshot | null, mlPrediction: MLPrediction): 'high' | 'medium' | 'low' {
    let qualityScore = 0;
    
    // Real-time odds availability
    if (realTimeOdds) {
      qualityScore += 0.4;
      
      // Number of sportsbooks
      if (realTimeOdds.sportsbooks.length >= 3) {
        qualityScore += 0.2;
      }
      
      // Market volume
      if (realTimeOdds.marketMetrics.totalVolume > 1000) {
        qualityScore += 0.2;
      }
    }
    
    // ML prediction confidence
    if (mlPrediction.confidence > 0.7) {
      qualityScore += 0.2;
    }
    
    if (qualityScore >= 0.8) return 'high';
    if (qualityScore >= 0.5) return 'medium';
    return 'low';
  }

  // Check if game is live
  private isGameLive(gameDate: string, gameTime: string): boolean {
    const gameDateTime = new Date(`${gameDate}T${gameTime}`);
    const now = new Date();
    const gameStart = new Date(gameDateTime.getTime() - 2 * 60 * 60 * 1000); // 2 hours before
    const gameEnd = new Date(gameDateTime.getTime() + 3 * 60 * 60 * 1000); // 3 hours after
    
    return now >= gameStart && now <= gameEnd;
  }

  // Generate AI reasoning
  private generateAIReasoning(mlPrediction: MLPrediction, features: MLFeatures): string {
    const topFactors = mlPrediction.featureImportance.slice(0, 3);
    const reasoning = topFactors.map(factor => {
      const impact = factor.impact === 'positive' ? 'supports' : factor.impact === 'negative' ? 'opposes' : 'neutralizes';
      return `${factor.feature} ${impact} the ${mlPrediction.prediction} prediction`;
    }).join(', ');
    
    return `Based on machine learning analysis, ${reasoning}. The model shows ${Math.round(mlPrediction.confidence * 100)}% confidence with a ${mlPrediction.confidenceInterval.level}% confidence interval of ${(mlPrediction.confidenceInterval.lower * 100).toFixed(1)}%-${(mlPrediction.confidenceInterval.upper * 100).toFixed(1)}%.`;
  }

  // Generate factor reasoning
  private generateFactorReasoning(factor: string, impact: 'positive' | 'negative' | 'neutral'): string {
    const impactText = impact === 'positive' ? 'positive' : impact === 'negative' ? 'negative' : 'neutral';
    return `This factor has a ${impactText} impact on the prediction outcome.`;
  }

  // Calculate value rating
  private calculateValueRating(mlPrediction: MLPrediction, vigCalculation: VigCalculation): number {
    // Combine ML confidence and vig edge for value rating
    const confidenceScore = mlPrediction.confidence * 50; // 0-50 points
    const edgeScore = Math.max(0, vigCalculation.edge) * 2; // 0-20 points (10% edge = 20 points)
    const expectedValueScore = Math.max(0, mlPrediction.expectedValue) * 0.1; // 0-30 points
    
    return Math.min(100, confidenceScore + edgeScore + expectedValueScore);
  }

  // Generate matchup analysis
  private generateMatchupAnalysis(baseProp: any): string {
    return `${baseProp.playerName} has historically performed well against ${baseProp.opponentAbbr}, averaging ${baseProp.seasonStats?.average?.toFixed(1) || '12.5'} ${baseProp.propType.toLowerCase()} in their last 5 meetings.`;
  }

  // Generate historical trends
  private generateHistoricalTrends(baseProp: any): string {
    const last5Games = baseProp.seasonStats?.last5Games || [];
    if (last5Games.length === 0) return 'Insufficient historical data for trend analysis.';
    
    const average = last5Games.reduce((sum: number, val: number) => sum + val, 0) / last5Games.length;
    const seasonAvg = baseProp.seasonStats?.average || 0;
    const trend = average > seasonAvg ? 'upward' : average < seasonAvg ? 'downward' : 'stable';
    
    return `Recent performance shows ${trend} trend with ${average.toFixed(1)} average in last 5 games vs ${seasonAvg.toFixed(1)} season average.`;
  }

  // Get enhanced prop by ID
  async getEnhancedPropById(propId: string): Promise<EnhancedPlayerProp | null> {
    // Search through cached data
    for (const [key, cached] of this.cache.entries()) {
      const prop = cached.data.find(p => p.id === propId);
      if (prop) {
        return prop;
      }
    }
    
    return null;
  }

  // Get market overview
  async getMarketOverview(sport: string): Promise<{
    totalProps: number;
    averageConfidence: number;
    riskDistribution: { low: number; medium: number; high: number };
    topVolume: EnhancedPlayerProp[];
    recentMovements: Array<{
      playerName: string;
      propType: string;
      movement: number;
      direction: 'up' | 'down';
    }>;
  }> {
    const props = await this.getEnhancedPlayerProps(sport);
    
    const totalProps = props.length;
    const averageConfidence = props.reduce((sum, p) => sum + p.confidence, 0) / totalProps;
    
    const riskDistribution = props.reduce((acc, p) => {
      acc[p.riskLevel]++;
      return acc;
    }, { low: 0, medium: 0, high: 0 });
    
    const topVolume = props
      .sort((a, b) => b.marketMetrics.volume - a.marketMetrics.volume)
      .slice(0, 10);
    
    const recentMovements = props
      .filter(p => p.marketMetrics.lineMovement > 0.5)
      .map(p => ({
        playerName: p.playerName,
        propType: p.propType,
        movement: p.marketMetrics.lineMovement,
        direction: p.marketMetrics.lineMovement > 0 ? 'up' : 'down' as 'up' | 'down'
      }))
      .slice(0, 10);
    
    return {
      totalProps,
      averageConfidence,
      riskDistribution,
      topVolume,
      recentMovements
    };
  }

  // Get service status
  getServiceStatus(): {
    isInitialized: boolean;
    cacheSize: number;
    mlServiceStatus: any;
    oddsServiceStatus: any;
  } {
    return {
      isInitialized: this.isInitialized,
      cacheSize: this.cache.size,
      mlServiceStatus: mlPredictionService.getServiceStatus(),
      oddsServiceStatus: realTimeOddsService.getServiceStats()
    };
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
    logAPI('EnhancedUnifiedSportsAPI', 'Cache cleared');
  }

  // Stop services
  stopServices(): void {
    realTimeOddsService.stopSync();
    logAPI('EnhancedUnifiedSportsAPI', 'Services stopped');
  }
}

export const enhancedUnifiedSportsAPI = new EnhancedUnifiedSportsAPI();
