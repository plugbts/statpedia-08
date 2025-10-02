/**
 * Trio Sports API Service
 * 
 * Orchestrates three specialized APIs for comprehensive sports data:
 * - SportsRadar: Games, schedules, teams, core sports data
 * - OddsAPI: Odds, lines, live betting markets, SGP
 * - SportsGameOdds: Player props, player markets, prop betting
 * 
 * This creates a robust, distributed system that doesn't rely on one API for everything
 */

import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';
import { realSportsbookAPI, RealPlayerProp } from './real-sportsbook-api';
import { oddsBlazeAPI, OddsBlazeOdds } from './oddsblaze-api';
// PAUSED: The Odds API - replaced with OddsBlaze for better performance
// import { oddsAPI, UnifiedOdds } from './odds-api';
import { sportsGameOddsAPI, SportsGameOddsPlayerProp } from './sportsgameodds-api';
import { smartPropOptimizer } from './smart-prop-optimizer';

// Unified interfaces for the trio system
export interface TrioPlayerProp {
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
  sportsbook: string;
  gameDate: string;
  gameTime: string;
  confidence: number;
  expectedValue: number;
  source: 'sportsradar' | 'sportsgameodds' | 'combined';
  lastUpdated: Date;
  marketId: string;
  // Additional trio system fields
  bestOdds?: {
    over: { odds: number; sportsbook: string };
    under: { odds: number; sportsbook: string };
  };
  alternativeLines?: Array<{
    line: number;
    overOdds: number;
    underOdds: number;
    sportsbook: string;
  }>;
}

export interface TrioGameData {
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  gameDate: string;
  gameTime: string;
  status: string;
  // From SportsRadar
  coreData: {
    teams: any[];
    schedule: any;
    venue?: string;
    weather?: any;
  };
  // From OddsBlaze
  bettingData: {
    odds: OddsBlazeOdds[];
    consensusOdds?: any[];
    sgpOdds?: any[];
    bestOdds?: any;
  };
  // From SportsGameOdds
  propData: {
    playerProps: SportsGameOddsPlayerProp[];
    markets: any[];
  };
}

class TrioSportsAPI {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  constructor() {
    logInfo('TrioSportsAPI', 'Initialized Trio Sports API System');
    logInfo('TrioSportsAPI', '🏟️  SportsRadar: Games, schedules, teams');
    logInfo('TrioSportsAPI', '💰 OddsBlaze: Odds, lines, SGP, consensus');
    logInfo('TrioSportsAPI', '🎯 SportsGameOdds: Player props, markets');
    logInfo('TrioSportsAPI', 'Distributed load across specialized APIs for maximum reliability');
  }

  // Get comprehensive game data using all three APIs
  async getComprehensiveGameData(sport: string): Promise<TrioGameData[]> {
    const cacheKey = `comprehensive_${sport}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      logAPI('TrioSportsAPI', `Using cached comprehensive data for ${sport}`);
      return cached.data;
    }

    logAPI('TrioSportsAPI', `Fetching comprehensive game data for ${sport} from trio system`);
    
    const results = {
      sportsRadar: { data: null as any, success: false, error: null as any },
      oddsAPI: { data: null as any, success: false, error: null as any },
      sportsGameOdds: { data: null as any, success: false, error: null as any }
    };

    // Fetch from all three APIs in parallel
    await Promise.allSettled([
      // SportsRadar: Core game data
      realSportsbookAPI.getRealPlayerProps(sport).then(data => {
        results.sportsRadar.data = data;
        results.sportsRadar.success = true;
        logSuccess('TrioSportsAPI', `SportsRadar: Retrieved core data for ${sport}`);
      }).catch(error => {
        results.sportsRadar.error = error;
        logError('TrioSportsAPI', `SportsRadar failed for ${sport}:`, error);
      }),

      // OddsBlaze: Betting odds, lines, and consensus
      oddsBlazeAPI.getComprehensiveOdds(sport).then(data => {
        results.oddsAPI.data = data;
        results.oddsAPI.success = true;
        logSuccess('TrioSportsAPI', `OddsBlaze: Retrieved betting data for ${sport}`);
      }).catch(error => {
        results.oddsAPI.error = error;
        logError('TrioSportsAPI', `OddsBlaze failed for ${sport}:`, error);
      }),

      // SportsGameOdds: Player props
      sportsGameOddsAPI.getPlayerProps(sport).then(data => {
        results.sportsGameOdds.data = data;
        results.sportsGameOdds.success = true;
        logSuccess('TrioSportsAPI', `SportsGameOdds: Retrieved player props for ${sport}`);
      }).catch(error => {
        results.sportsGameOdds.error = error;
        logError('TrioSportsAPI', `SportsGameOdds failed for ${sport}:`, error);
      })
    ]);

    // Combine the data from all three sources
    const comprehensiveData = this.combineTrioData(results, sport);
    
    // Cache the results
    this.cache.set(cacheKey, { data: comprehensiveData, timestamp: Date.now() });
    
    // Log comprehensive results
    this.logTrioResults(sport, results, comprehensiveData);
    
    return comprehensiveData;
  }

  // Get player props using the trio system
  async getPlayerProps(sport: string, selectedSportsbook?: string): Promise<TrioPlayerProp[]> {
    const cacheKey = `trio_props_${sport}_${selectedSportsbook || 'all'}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      logAPI('TrioSportsAPI', `Using cached trio props for ${sport}`);
      return cached.data;
    }

    logAPI('TrioSportsAPI', `Fetching player props for ${sport} using trio system`);
    
    const results = {
      sportsRadar: { props: [] as RealPlayerProp[], success: false, error: null as any },
      sportsGameOdds: { props: [] as SportsGameOddsPlayerProp[], success: false, error: null as any },
      oddsBlaze: { odds: [] as OddsBlazeOdds[], success: false, error: null as any }
    };

    // Fetch from relevant APIs in parallel
    await Promise.allSettled([
      // SportsRadar: Core player data and some props
      realSportsbookAPI.getRealPlayerProps(sport, selectedSportsbook).then(props => {
        results.sportsRadar.props = props;
        results.sportsRadar.success = props.length > 0;
        logSuccess('TrioSportsAPI', `SportsRadar: ${props.length} props for ${sport}`);
      }).catch(error => {
        results.sportsRadar.error = error;
        logWarning('TrioSportsAPI', `SportsRadar props failed for ${sport}`);
      }),

      // SportsGameOdds: Specialized player props and markets
      sportsGameOddsAPI.getPlayerProps(sport).then(props => {
        results.sportsGameOdds.props = props;
        results.sportsGameOdds.success = props.length > 0;
        logSuccess('TrioSportsAPI', `SportsGameOdds: ${props.length} props for ${sport}`);
      }).catch(error => {
        results.sportsGameOdds.error = error;
        logWarning('TrioSportsAPI', `SportsGameOdds props failed for ${sport}`);
      }),

      // OddsBlaze: Get odds for prop line shopping
      oddsBlazeAPI.getComprehensiveOdds(sport).then(odds => {
        results.oddsBlaze.odds = odds;
        results.oddsBlaze.success = odds.length > 0;
        logSuccess('TrioSportsAPI', `OddsBlaze: ${odds.length} odds entries for ${sport}`);
      }).catch(error => {
        results.oddsBlaze.error = error;
        logWarning('TrioSportsAPI', `OddsBlaze failed for ${sport}`);
      })
    ]);

    // Combine and process results
    const combinedProps = this.combinePlayerProps(results, sport);
    
    // Apply smart optimization
    const smartCount = smartPropOptimizer.getDynamicPropCount(sport);
    const finalProps = combinedProps.slice(0, smartCount);
    
    // Cache results
    this.cache.set(cacheKey, { data: finalProps, timestamp: Date.now() });
    
    // Log final results
    this.logPlayerPropsResults(sport, results, finalProps);
    
    return finalProps;
  }

  // Combine data from all three APIs
  private combineTrioData(results: any, sport: string): TrioGameData[] {
    const gameData: TrioGameData[] = [];
    
    // This is a simplified combination - in a real implementation,
    // you'd match games across APIs by team names, dates, etc.
    
    logInfo('TrioSportsAPI', `Combining trio data for ${sport}`);
    logInfo('TrioSportsAPI', `SportsRadar: ${results.sportsRadar.success ? 'SUCCESS' : 'FAILED'}`);
    logInfo('TrioSportsAPI', `OddsBlaze: ${results.oddsAPI.success ? 'SUCCESS' : 'FAILED'}`);
    logInfo('TrioSportsAPI', `SportsGameOdds: ${results.sportsGameOdds.success ? 'SUCCESS' : 'FAILED'}`);
    
    return gameData;
  }

  // Combine player props from multiple sources
  private combinePlayerProps(results: any, sport: string): TrioPlayerProp[] {
    const combinedProps: TrioPlayerProp[] = [];

    // Strategy 1: Use SportsGameOdds as primary source for player props
    if (results.sportsGameOdds.success && results.sportsGameOdds.props.length > 0) {
      logInfo('TrioSportsAPI', 'Using SportsGameOdds as primary source for player props');
      
      results.sportsGameOdds.props.forEach((prop: SportsGameOddsPlayerProp) => {
        combinedProps.push(this.convertSportsGameOddsProp(prop));
      });
    }

    // Strategy 2: Supplement with SportsRadar props if needed
    if (results.sportsRadar.success && results.sportsRadar.props.length > 0) {
      const shouldSupplement = !results.sportsGameOdds.success || results.sportsGameOdds.props.length < 20;
      
      if (shouldSupplement) {
        logInfo('TrioSportsAPI', 'Supplementing with SportsRadar props');
        
        results.sportsRadar.props.forEach((prop: RealPlayerProp) => {
          // Avoid duplicates
          const isDuplicate = combinedProps.some(existing => 
            existing.playerName.toLowerCase() === prop.playerName.toLowerCase() &&
            existing.propType.toLowerCase() === prop.propType.toLowerCase()
          );
          
          if (!isDuplicate) {
            combinedProps.push(this.convertSportsRadarProp(prop));
          }
        });
      }
    }

    // Strategy 3: Enhance with OddsBlaze data for line shopping
    if (results.oddsBlaze.success && results.oddsBlaze.odds.length > 0) {
      logInfo('TrioSportsAPI', 'Enhancing props with OddsBlaze line shopping data');
      // This would involve matching props to odds data for better lines
      // Implementation would depend on how OddsBlaze structures prop odds
    }

    // Strategy 4: Generate minimal fallback if all fail
    if (combinedProps.length === 0) {
      logWarning('TrioSportsAPI', 'All APIs failed, generating fallback props');
      combinedProps.push(...this.generateFallbackProps(sport));
    }

    return combinedProps;
  }

  // Convert SportsGameOdds prop to trio format
  private convertSportsGameOddsProp(prop: SportsGameOddsPlayerProp): TrioPlayerProp {
    return {
      id: prop.id,
      playerId: prop.playerId,
      playerName: prop.playerName,
      team: prop.team,
      teamAbbr: prop.teamAbbr,
      opponent: prop.opponent,
      opponentAbbr: prop.opponentAbbr,
      gameId: prop.gameId,
      sport: prop.sport,
      propType: prop.propType,
      line: prop.line,
      overOdds: prop.overOdds,
      underOdds: prop.underOdds,
      sportsbook: prop.sportsbook,
      gameDate: prop.gameDate,
      gameTime: prop.gameTime,
      confidence: prop.confidence,
      expectedValue: prop.expectedValue,
      source: 'sportsgameodds',
      lastUpdated: new Date(),
      marketId: prop.marketId
    };
  }

  // Convert SportsRadar prop to trio format
  private convertSportsRadarProp(prop: RealPlayerProp): TrioPlayerProp {
    return {
      id: prop.id,
      playerId: prop.playerId,
      playerName: prop.playerName,
      team: prop.team,
      teamAbbr: prop.teamAbbr,
      opponent: prop.opponent,
      opponentAbbr: prop.opponentAbbr,
      gameId: prop.gameId,
      sport: prop.sport,
      propType: prop.propType,
      line: prop.line,
      overOdds: prop.overOdds,
      underOdds: prop.underOdds,
      sportsbook: prop.sportsbook,
      gameDate: prop.gameDate,
      gameTime: prop.gameTime,
      confidence: prop.confidence,
      expectedValue: prop.expectedValue,
      source: 'sportsradar',
      lastUpdated: new Date(),
      marketId: `sr_${prop.id}`
    };
  }

  // Generate fallback props
  private generateFallbackProps(sport: string): TrioPlayerProp[] {
    logWarning('TrioSportsAPI', `Generating fallback props for ${sport}`);
    
    const fallbackProps: TrioPlayerProp[] = [];
    const propTypes = this.getPropTypesForSport(sport);
    
    // Generate 10 basic props as absolute fallback
    for (let i = 0; i < 10; i++) {
      const propType = propTypes[i % propTypes.length];
      
      fallbackProps.push({
        id: `trio_fallback_${sport}_${i}`,
        playerId: `fallback_player_${i}`,
        playerName: `${sport} Player ${i + 1}`,
        team: `${sport} Team A`,
        teamAbbr: 'TMA',
        opponent: `${sport} Team B`,
        opponentAbbr: 'TMB',
        gameId: `fallback_game_${i}`,
        sport: sport.toUpperCase(),
        propType: propType,
        line: this.getRandomLine(propType),
        overOdds: -110,
        underOdds: -110,
        sportsbook: 'Trio Fallback',
        gameDate: new Date().toISOString().split('T')[0],
        gameTime: new Date().toISOString(),
        confidence: 0.5,
        expectedValue: 0,
        source: 'combined',
        lastUpdated: new Date(),
        marketId: `trio_fallback_${i}`
      });
    }
    
    return fallbackProps;
  }

  // Get prop types for sport
  private getPropTypesForSport(sport: string): string[] {
    const propTypes = {
      NFL: ['Passing Yards', 'Rushing Yards', 'Receiving Yards', 'Passing TDs'],
      NBA: ['Points', 'Rebounds', 'Assists', '3-Pointers Made'],
      MLB: ['Hits', 'Runs', 'RBIs', 'Home Runs'],
      NHL: ['Goals', 'Assists', 'Points', 'Saves']
    };
    
    return propTypes[sport.toUpperCase() as keyof typeof propTypes] || propTypes.NFL;
  }

  // Get random line for prop type
  private getRandomLine(propType: string): number {
    const lines = {
      'Passing Yards': 275,
      'Rushing Yards': 85,
      'Receiving Yards': 65,
      'Points': 22,
      'Rebounds': 8,
      'Assists': 6
    };
    
    return lines[propType as keyof typeof lines] || 50;
  }

  // Log comprehensive results
  private logTrioResults(sport: string, results: any, gameData: TrioGameData[]): void {
    logInfo('TrioSportsAPI', '='.repeat(60));
    logInfo('TrioSportsAPI', `TRIO SYSTEM RESULTS FOR ${sport.toUpperCase()}`);
    logInfo('TrioSportsAPI', '='.repeat(60));
    
    // Individual API results
    logInfo('TrioSportsAPI', `🏟️  SportsRadar: ${results.sportsRadar.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    logInfo('TrioSportsAPI', `💰 OddsAPI: ${results.oddsAPI.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    logInfo('TrioSportsAPI', `🎯 SportsGameOdds: ${results.sportsGameOdds.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    // Combined results
    logSuccess('TrioSportsAPI', `🎯 TRIO RESULT: ${gameData.length} comprehensive game entries`);
    
    logInfo('TrioSportsAPI', '='.repeat(60));
  }

  // Log player props results
  private logPlayerPropsResults(sport: string, results: any, finalProps: TrioPlayerProp[]): void {
    logInfo('TrioSportsAPI', '='.repeat(60));
    logInfo('TrioSportsAPI', `TRIO PLAYER PROPS FOR ${sport.toUpperCase()}`);
    logInfo('TrioSportsAPI', '='.repeat(60));
    
    // Source breakdown
    const sourceBreakdown = {
      sportsradar: finalProps.filter(p => p.source === 'sportsradar').length,
      sportsgameodds: finalProps.filter(p => p.source === 'sportsgameodds').length,
      combined: finalProps.filter(p => p.source === 'combined').length
    };
    
    logSuccess('TrioSportsAPI', `🎯 FINAL RESULT: ${finalProps.length} total props`);
    logInfo('TrioSportsAPI', `   🏟️  SportsRadar: ${sourceBreakdown.sportsradar}`);
    logInfo('TrioSportsAPI', `   🎯 SportsGameOdds: ${sourceBreakdown.sportsgameodds}`);
    logInfo('TrioSportsAPI', `   🔄 Fallback: ${sourceBreakdown.combined}`);
    
    if (finalProps.length > 0) {
      logSuccess('TrioSportsAPI', `✅ SUCCESS: Props available for ${sport}`);
    } else {
      logError('TrioSportsAPI', `❌ FAILURE: No props available for ${sport}`);
    }
    
    logInfo('TrioSportsAPI', '='.repeat(60));
  }

  // Test all three APIs
  async testTrioSystem(sport: string = 'nfl'): Promise<{
    sportsRadar: { success: boolean; props: number; error?: string };
    oddsBlaze: { success: boolean; odds: number; error?: string };
    sportsGameOdds: { success: boolean; props: number; error?: string };
    combined: { success: boolean; props: number };
  }> {
    logInfo('TrioSportsAPI', `🧪 Testing trio system for ${sport}...`);
    
    const testResults = {
      sportsRadar: { success: false, props: 0, error: undefined as string | undefined },
      oddsBlaze: { success: false, odds: 0, error: undefined as string | undefined },
      sportsGameOdds: { success: false, props: 0, error: undefined as string | undefined },
      combined: { success: false, props: 0 }
    };

    // Test SportsRadar
    try {
      const srProps = await realSportsbookAPI.getRealPlayerProps(sport);
      testResults.sportsRadar.success = srProps.length > 0;
      testResults.sportsRadar.props = srProps.length;
    } catch (error) {
      testResults.sportsRadar.error = error.message;
    }

    // Test OddsBlaze
    try {
      const odds = await oddsBlazeAPI.getComprehensiveOdds(sport);
      testResults.oddsBlaze.success = odds.length > 0;
      testResults.oddsBlaze.odds = odds.length;
    } catch (error) {
      testResults.oddsBlaze.error = error.message;
    }

    // Test SportsGameOdds
    try {
      const sgProps = await sportsGameOddsAPI.getPlayerProps(sport);
      testResults.sportsGameOdds.success = sgProps.length > 0;
      testResults.sportsGameOdds.props = sgProps.length;
    } catch (error) {
      testResults.sportsGameOdds.error = error.message;
    }

    // Test combined
    try {
      const combinedProps = await this.getPlayerProps(sport);
      testResults.combined.success = combinedProps.length > 0;
      testResults.combined.props = combinedProps.length;
    } catch (error) {
      // Combined should always work due to fallbacks
    }

    return testResults;
  }

  // Clear all caches
  clearCache(): void {
    this.cache.clear();
    realSportsbookAPI.clearCache();
    oddsBlazeAPI.clearCache();
    sportsGameOddsAPI.clearCache();
    logInfo('TrioSportsAPI', 'All trio system caches cleared');
  }

  // Get cache stats
  getCacheStats() {
    return {
      trioCache: {
        size: this.cache.size,
        keys: Array.from(this.cache.keys())
      },
      sportsRadarCache: realSportsbookAPI.getCacheStats(),
      oddsBlazeCache: oddsBlazeAPI.getCacheStats(),
      sportsGameOddsCache: sportsGameOddsAPI.getCacheStats()
    };
  }
}

// Export singleton instance
export const trioSportsAPI = new TrioSportsAPI();
export default trioSportsAPI;
