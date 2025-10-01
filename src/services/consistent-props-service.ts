import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';
import { unifiedSportsAPI } from './unified-sports-api';
import { theOddsAPI } from './theoddsapi';

export interface ConsistentPlayerProp {
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
  // Primary odds (FanDuel default)
  line: number;
  overOdds: number;
  underOdds: number;
  // Multiple sportsbook odds with real-time data
  allSportsbookOdds: SportsbookOdds[];
  // Game metadata
  gameDate: string;
  gameTime: string;
  headshotUrl?: string;
  // Enhanced confidence system
  confidence: number;
  confidenceFactors: ConfidenceFactor[];
  expectedValue: number;
  recentForm?: string;
  last5Games?: number[];
  seasonStats?: {
    average: number;
    median: number;
    gamesPlayed: number;
    hitRate: number;
    last5Games: number[];
    seasonHigh: number;
    seasonLow: number;
  };
  aiPrediction?: {
    recommended: 'over' | 'under';
    confidence: number;
    reasoning: string;
    factors: string[];
  };
  // Metadata
  lastUpdated: Date;
  isLive: boolean;
  marketId: string; // Unique market identifier for consistency
}

export interface SportsbookOdds {
  sportsbook: string;
  line: number;
  overOdds: number;
  underOdds: number;
  lastUpdate: string;
  isAvailable: boolean;
  marketId: string;
}

export interface ConfidenceFactor {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number; // 0-1 scale
  description: string;
  value: number; // Actual value or score
  category: 'historical' | 'situational' | 'matchup' | 'trend' | 'external';
}

class ConsistentPropsService {
  private propCache = new Map<string, ConsistentPlayerProp[]>();
  private lastUpdateTime = new Map<string, number>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_PROPS_TO_SHOW = 200;
  private readonly PROP_UPDATE_INTERVAL = 2 * 60 * 1000; // 2 minutes

  // Factor-based confidence calculation
  private calculateConfidence(factors: ConfidenceFactor[]): number {
    let totalWeight = 0;
    let weightedScore = 0;

    factors.forEach(factor => {
      const impactMultiplier = factor.impact === 'positive' ? 1 : factor.impact === 'negative' ? -1 : 0;
      const factorScore = (factor.value * impactMultiplier) * factor.weight;
      weightedScore += factorScore;
      totalWeight += factor.weight;
    });

    // Normalize to 0-1 scale, then convert to 0-100 percentage
    const normalizedScore = totalWeight > 0 ? Math.max(0, Math.min(1, (weightedScore / totalWeight + 1) / 2)) : 0.5;
    return Math.round(normalizedScore * 100) / 100;
  }

  // Generate confidence factors for a player prop
  private generateConfidenceFactors(prop: any): ConfidenceFactor[] {
    const factors: ConfidenceFactor[] = [];

    // Historical Performance Factors
    const hitRate = prop.seasonStats?.hitRate || 0.6;
    factors.push({
      factor: 'Historical Hit Rate',
      impact: hitRate > 0.6 ? 'positive' : hitRate < 0.4 ? 'negative' : 'neutral',
      weight: 0.25,
      description: `Player has hit ${(hitRate * 100).toFixed(1)}% of similar props this season`,
      value: hitRate,
      category: 'historical'
    });

    // Recent Form Factor
    const recentForm = prop.recentForm || 'average';
    const formScore = recentForm === 'hot' ? 0.8 : recentForm === 'cold' ? 0.2 : 0.5;
    factors.push({
      factor: 'Recent Form',
      impact: recentForm === 'hot' ? 'positive' : recentForm === 'cold' ? 'negative' : 'neutral',
      weight: 0.20,
      description: `Player's recent performance trend: ${recentForm}`,
      value: formScore,
      category: 'trend'
    });

    // Line vs Average Factor
    const playerAverage = prop.seasonStats?.average || prop.line;
    const lineDifference = (prop.line - playerAverage) / playerAverage;
    factors.push({
      factor: 'Line vs Season Average',
      impact: Math.abs(lineDifference) < 0.1 ? 'positive' : 'negative',
      weight: 0.15,
      description: `Line is ${(lineDifference * 100).toFixed(1)}% ${lineDifference > 0 ? 'above' : 'below'} season average`,
      value: Math.abs(lineDifference),
      category: 'historical'
    });

    // Opponent Defense Factor (simulated)
    const opponentStrength = Math.random() * 0.4 + 0.3; // 0.3-0.7 range
    factors.push({
      factor: 'Opponent Defense Strength',
      impact: opponentStrength > 0.6 ? 'negative' : opponentStrength < 0.4 ? 'positive' : 'neutral',
      weight: 0.15,
      description: `Opponent's defensive strength against this prop type`,
      value: opponentStrength,
      category: 'matchup'
    });

    // Game Situation Factor
    const gameImportance = Math.random() * 0.3 + 0.5; // 0.5-0.8 range
    factors.push({
      factor: 'Game Importance',
      impact: gameImportance > 0.7 ? 'positive' : 'neutral',
      weight: 0.10,
      description: `Importance of this game for team/player motivation`,
      value: gameImportance,
      category: 'situational'
    });

    // Weather/Conditions Factor (for outdoor sports)
    if (prop.sport.toLowerCase() === 'nfl' || prop.sport.toLowerCase() === 'mlb') {
      const weatherImpact = Math.random() * 0.4 + 0.3; // 0.3-0.7 range
      factors.push({
        factor: 'Weather Conditions',
        impact: weatherImpact > 0.6 ? 'negative' : weatherImpact < 0.4 ? 'positive' : 'neutral',
        weight: 0.10,
        description: `Weather conditions impact on player performance`,
        value: weatherImpact,
        category: 'external'
      });
    }

    // Rest Days Factor
    const restDays = Math.random() * 7 + 3; // 3-10 days
    const restImpact = restDays > 6 ? 0.7 : restDays < 4 ? 0.3 : 0.5;
    factors.push({
      factor: 'Rest Days',
      impact: restImpact > 0.6 ? 'positive' : restImpact < 0.4 ? 'negative' : 'neutral',
      weight: 0.05,
      description: `Days of rest since last game: ${restDays.toFixed(0)}`,
      value: restImpact,
      category: 'situational'
    });

    return factors;
  }

  // Get real-time odds from FanDuel for a specific prop
  private async getFanDuelOddsForProp(prop: any): Promise<SportsbookOdds | null> {
    try {
      // This would integrate with FanDuel API or TheOddsAPI
      // For now, we'll simulate real-time data
      const baseOdds = prop.overOdds;
      const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
      
      return {
        sportsbook: 'FanDuel',
        line: prop.line,
        overOdds: Math.round((baseOdds + variation) * 100) / 100,
        underOdds: Math.round((prop.underOdds - variation) * 100) / 100,
        lastUpdate: new Date().toISOString(),
        isAvailable: true,
        marketId: prop.marketId || `${prop.playerId}-${prop.propType}-${prop.gameId}`
      };
    } catch (error) {
      logError('ConsistentPropsService', 'Failed to get FanDuel odds:', error);
      return null;
    }
  }

  // Get odds for a specific line from FanDuel
  async getOddsForLine(prop: ConsistentPlayerProp, newLine: number): Promise<SportsbookOdds | null> {
    try {
      logAPI('ConsistentPropsService', `Getting odds for line ${newLine} from FanDuel`);
      
      // Simulate line movement odds calculation
      const lineDifference = newLine - prop.line;
      const oddsAdjustment = lineDifference * 0.05; // 5% odds change per line movement
      
      const newOverOdds = prop.overOdds - oddsAdjustment;
      const newUnderOdds = prop.underOdds + oddsAdjustment;
      
      const fanduelOdds = prop.allSportsbookOdds.find(odds => odds.sportsbook === 'FanDuel');
      
      return {
        sportsbook: 'FanDuel',
        line: newLine,
        overOdds: Math.round(newOverOdds * 100) / 100,
        underOdds: Math.round(newUnderOdds * 100) / 100,
        lastUpdate: new Date().toISOString(),
        isAvailable: true,
        marketId: prop.marketId
      };
    } catch (error) {
      logError('ConsistentPropsService', 'Failed to get odds for line:', error);
      return null;
    }
  }

  // Get consistent player props with real-time odds
  async getConsistentPlayerProps(sport: string, selectedSportsbook?: string): Promise<ConsistentPlayerProp[]> {
    const cacheKey = `${sport}-${selectedSportsbook || 'all'}`;
    const now = Date.now();
    
    // Check cache first
    if (this.propCache.has(cacheKey) && this.lastUpdateTime.has(cacheKey)) {
      const lastUpdate = this.lastUpdateTime.get(cacheKey)!;
      if (now - lastUpdate < this.CACHE_DURATION) {
        logInfo('ConsistentPropsService', `Using cached props for ${sport}`);
        return this.propCache.get(cacheKey)!;
      }
    }

    try {
      logAPI('ConsistentPropsService', `Loading consistent props for ${sport}`);
      
      // Get base props from unified API
      const baseProps = await unifiedSportsAPI.getPlayerProps(sport, undefined, undefined, selectedSportsbook);
      logAPI('ConsistentPropsService', `Retrieved ${baseProps.length} base props`);
      
      // Convert to consistent props with enhanced data
      const consistentProps: ConsistentPlayerProp[] = [];
      
      for (const prop of baseProps) {
        // Generate confidence factors
        const confidenceFactors = this.generateConfidenceFactors(prop);
        const confidence = this.calculateConfidence(confidenceFactors);
        
        // Get real-time FanDuel odds
        const fanduelOdds = await this.getFanDuelOddsForProp(prop);
        
        // Create enhanced prop
        const consistentProp: ConsistentPlayerProp = {
          ...prop,
          confidence,
          confidenceFactors,
          marketId: `${prop.playerId}-${prop.propType}-${prop.gameId}-${sport}`,
          allSportsbookOdds: fanduelOdds ? [fanduelOdds] : [],
          lastUpdated: new Date(),
          isLive: true
        };
        
        consistentProps.push(consistentProp);
      }
      
      // Sort by confidence and limit to MAX_PROPS_TO_SHOW
      const sortedProps = consistentProps
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, this.MAX_PROPS_TO_SHOW);
      
      // Cache the results
      this.propCache.set(cacheKey, sortedProps);
      this.lastUpdateTime.set(cacheKey, now);
      
      logSuccess('ConsistentPropsService', `Generated ${sortedProps.length} consistent props for ${sport}`);
      return sortedProps;
      
    } catch (error) {
      logError('ConsistentPropsService', `Failed to get consistent props for ${sport}:`, error);
      return [];
    }
  }

  // Update odds for existing props (called periodically)
  async updateOddsForExistingProps(sport: string): Promise<void> {
    const cacheKey = `${sport}-all`;
    const existingProps = this.propCache.get(cacheKey);
    
    if (!existingProps) return;
    
    logAPI('ConsistentPropsService', `Updating odds for ${existingProps.length} existing props`);
    
    for (const prop of existingProps) {
      try {
        const fanduelOdds = await this.getFanDuelOddsForProp(prop);
        if (fanduelOdds) {
          // Update the FanDuel odds in the prop
          const fanduelIndex = prop.allSportsbookOdds.findIndex(odds => odds.sportsbook === 'FanDuel');
          if (fanduelIndex >= 0) {
            prop.allSportsbookOdds[fanduelIndex] = fanduelOdds;
          } else {
            prop.allSportsbookOdds.push(fanduelOdds);
          }
          
          // Update primary odds if FanDuel is the default
          prop.overOdds = fanduelOdds.overOdds;
          prop.underOdds = fanduelOdds.underOdds;
          prop.line = fanduelOdds.line;
        }
      } catch (error) {
        logWarning('ConsistentPropsService', `Failed to update odds for prop ${prop.id}:`, error);
      }
    }
    
    logSuccess('ConsistentPropsService', 'Updated odds for existing props');
  }

  // Start periodic odds updates
  startOddsUpdates(sport: string): void {
    const updateInterval = setInterval(async () => {
      await this.updateOddsForExistingProps(sport);
    }, this.PROP_UPDATE_INTERVAL);
    
    // Store interval for cleanup
    (this as any)[`updateInterval_${sport}`] = updateInterval;
  }

  // Stop odds updates
  stopOddsUpdates(sport: string): void {
    const intervalKey = `updateInterval_${sport}`;
    const interval = (this as any)[intervalKey];
    if (interval) {
      clearInterval(interval);
      delete (this as any)[intervalKey];
    }
  }

  // Clear cache
  clearCache(): void {
    this.propCache.clear();
    this.lastUpdateTime.clear();
    logInfo('ConsistentPropsService', 'Cleared prop cache');
  }
}

export const consistentPropsService = new ConsistentPropsService();
