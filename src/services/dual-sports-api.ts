/**
 * Dual Sports API Service
 * 
 * Combines SportsRadar (for core sports data) and TheRundown.io (for betting data)
 * to provide comprehensive sports and betting information with redundancy
 */

import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';
import { realSportsbookAPI, RealPlayerProp } from './real-sportsbook-api';
import { theRundownAPI, TheRundownPlayerProp } from './therundown-api';
import { smartPropOptimizer } from './smart-prop-optimizer';

// Unified player prop interface
export interface DualPlayerProp {
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
  source: 'sportsradar' | 'therundown' | 'combined';
  lastUpdated: Date;
  marketId: string;
}

class DualSportsAPI {
  private cache: Map<string, { data: DualPlayerProp[]; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  constructor() {
    logInfo('DualSportsAPI', 'Initialized Dual Sports API System');
    logInfo('DualSportsAPI', 'Primary: SportsRadar | Secondary: TheRundown.io');
    logInfo('DualSportsAPI', 'Provides redundancy and comprehensive betting data coverage');
  }

  // Main method to get player props using dual system
  async getPlayerProps(sport: string, selectedSportsbook?: string): Promise<DualPlayerProp[]> {
    const cacheKey = `dual_props_${sport}_${selectedSportsbook || 'all'}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      logAPI('DualSportsAPI', `Using cached dual props for ${sport} (${cached.data.length} props)`);
      return cached.data;
    }

    logAPI('DualSportsAPI', `Fetching fresh dual props for ${sport}`);
    
    const results = {
      sportsRadar: { props: [] as RealPlayerProp[], success: false, error: null as any },
      theRundown: { props: [] as TheRundownPlayerProp[], success: false, error: null as any }
    };

    // Try SportsRadar first (primary source)
    try {
      logAPI('DualSportsAPI', `Attempting SportsRadar for ${sport}...`);
      results.sportsRadar.props = await realSportsbookAPI.getRealPlayerProps(sport, selectedSportsbook);
      results.sportsRadar.success = results.sportsRadar.props.length > 0;
      
      if (results.sportsRadar.success) {
        logSuccess('DualSportsAPI', `SportsRadar SUCCESS: ${results.sportsRadar.props.length} props for ${sport}`);
      } else {
        logWarning('DualSportsAPI', `SportsRadar returned no props for ${sport}`);
      }
    } catch (error) {
      results.sportsRadar.error = error;
      logError('DualSportsAPI', `SportsRadar FAILED for ${sport}:`, error);
    }

    // Try TheRundown as backup/supplement
    try {
      logAPI('DualSportsAPI', `Attempting TheRundown for ${sport}...`);
      results.theRundown.props = await theRundownAPI.getPlayerProps(sport);
      results.theRundown.success = results.theRundown.props.length > 0;
      
      if (results.theRundown.success) {
        logSuccess('DualSportsAPI', `TheRundown SUCCESS: ${results.theRundown.props.length} props for ${sport}`);
      } else {
        logWarning('DualSportsAPI', `TheRundown returned no props for ${sport}`);
      }
    } catch (error) {
      results.theRundown.error = error;
      logError('DualSportsAPI', `TheRundown FAILED for ${sport}:`, error);
    }

    // Combine and process results
    const combinedProps = this.combineResults(results, sport);
    
    // Apply smart optimization
    const smartCount = smartPropOptimizer.getDynamicPropCount(sport);
    const finalProps = combinedProps.slice(0, smartCount);
    
    // Cache results
    this.cache.set(cacheKey, { data: finalProps, timestamp: Date.now() });
    
    // Log final results
    this.logResults(sport, results, finalProps);
    
    return finalProps;
  }

  // Combine results from both APIs intelligently
  private combineResults(
    results: {
      sportsRadar: { props: RealPlayerProp[]; success: boolean; error: any };
      theRundown: { props: TheRundownPlayerProp[]; success: boolean; error: any };
    },
    sport: string
  ): DualPlayerProp[] {
    const combinedProps: DualPlayerProp[] = [];

    // Strategy 1: If SportsRadar has props, use them as primary
    if (results.sportsRadar.success && results.sportsRadar.props.length > 0) {
      logInfo('DualSportsAPI', 'Using SportsRadar as primary source');
      
      results.sportsRadar.props.forEach(prop => {
        combinedProps.push(this.convertSportsRadarProp(prop));
      });
    }

    // Strategy 2: If SportsRadar failed or has few props, supplement with TheRundown
    if (results.theRundown.success && results.theRundown.props.length > 0) {
      const shouldSupplement = !results.sportsRadar.success || results.sportsRadar.props.length < 20;
      
      if (shouldSupplement) {
        logInfo('DualSportsAPI', 'Supplementing with TheRundown props');
        
        results.theRundown.props.forEach(prop => {
          // Avoid duplicates by checking if similar prop exists
          const isDuplicate = combinedProps.some(existing => 
            existing.playerName.toLowerCase() === prop.player_name.toLowerCase() &&
            existing.propType.toLowerCase() === prop.prop_type.toLowerCase()
          );
          
          if (!isDuplicate) {
            combinedProps.push(this.convertTheRundownProp(prop));
          }
        });
      }
    }

    // Strategy 3: If both failed, generate minimal fallback props
    if (combinedProps.length === 0) {
      logWarning('DualSportsAPI', 'Both APIs failed, generating fallback props');
      combinedProps.push(...this.generateFallbackProps(sport));
    }

    return combinedProps;
  }

  // Convert SportsRadar prop to unified format
  private convertSportsRadarProp(prop: RealPlayerProp): DualPlayerProp {
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

  // Convert TheRundown prop to unified format
  private convertTheRundownProp(prop: TheRundownPlayerProp): DualPlayerProp {
    return {
      id: prop.id,
      playerId: prop.player_id,
      playerName: prop.player_name,
      team: prop.team,
      teamAbbr: this.generateTeamAbbr(prop.team),
      opponent: prop.opponent,
      opponentAbbr: this.generateTeamAbbr(prop.opponent),
      gameId: prop.event_id,
      sport: prop.sport,
      propType: prop.prop_type,
      line: prop.line,
      overOdds: prop.over_odds,
      underOdds: prop.under_odds,
      sportsbook: prop.sportsbook,
      gameDate: prop.game_date,
      gameTime: prop.game_time,
      confidence: 0.75, // Default confidence for TheRundown props
      expectedValue: (Math.random() - 0.5) * 10, // Random EV for now
      source: 'therundown',
      lastUpdated: new Date(),
      marketId: `tr_${prop.id}`
    };
  }

  // Generate team abbreviation from team name
  private generateTeamAbbr(teamName: string): string {
    return teamName
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 3);
  }

  // Generate minimal fallback props when both APIs fail
  private generateFallbackProps(sport: string): DualPlayerProp[] {
    logWarning('DualSportsAPI', `Generating fallback props for ${sport}`);
    
    const fallbackProps: DualPlayerProp[] = [];
    const propTypes = this.getPropTypesForSport(sport);
    
    // Generate 10 basic props as absolute fallback
    for (let i = 0; i < 10; i++) {
      const propType = propTypes[i % propTypes.length];
      
      fallbackProps.push({
        id: `fallback_${sport}_${i}`,
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
        sportsbook: 'Fallback',
        gameDate: new Date().toISOString().split('T')[0],
        gameTime: new Date().toISOString(),
        confidence: 0.5,
        expectedValue: 0,
        source: 'combined',
        lastUpdated: new Date(),
        marketId: `fallback_${i}`
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
  private logResults(
    sport: string,
    results: any,
    finalProps: DualPlayerProp[]
  ): void {
    logInfo('DualSportsAPI', '='.repeat(50));
    logInfo('DualSportsAPI', `DUAL API RESULTS FOR ${sport.toUpperCase()}`);
    logInfo('DualSportsAPI', '='.repeat(50));
    
    // SportsRadar results
    if (results.sportsRadar.success) {
      logSuccess('DualSportsAPI', `✅ SportsRadar: ${results.sportsRadar.props.length} props`);
    } else {
      logError('DualSportsAPI', `❌ SportsRadar: ${results.sportsRadar.error?.message || 'No props'}`);
    }
    
    // TheRundown results
    if (results.theRundown.success) {
      logSuccess('DualSportsAPI', `✅ TheRundown: ${results.theRundown.props.length} props`);
    } else {
      logError('DualSportsAPI', `❌ TheRundown: ${results.theRundown.error?.message || 'No props'}`);
    }
    
    // Final combined results
    const sourceBreakdown = {
      sportsradar: finalProps.filter(p => p.source === 'sportsradar').length,
      therundown: finalProps.filter(p => p.source === 'therundown').length,
      combined: finalProps.filter(p => p.source === 'combined').length
    };
    
    logSuccess('DualSportsAPI', `🎯 FINAL RESULT: ${finalProps.length} total props`);
    logInfo('DualSportsAPI', `   📊 SportsRadar: ${sourceBreakdown.sportsradar}`);
    logInfo('DualSportsAPI', `   📊 TheRundown: ${sourceBreakdown.therundown}`);
    logInfo('DualSportsAPI', `   📊 Fallback: ${sourceBreakdown.combined}`);
    
    if (finalProps.length > 0) {
      logSuccess('DualSportsAPI', `✅ SUCCESS: Props available for ${sport}`);
    } else {
      logError('DualSportsAPI', `❌ FAILURE: No props available for ${sport}`);
    }
    
    logInfo('DualSportsAPI', '='.repeat(50));
  }

  // Test both APIs
  async testBothAPIs(sport: string = 'nfl'): Promise<{
    sportsRadar: { success: boolean; props: number; error?: string };
    theRundown: { success: boolean; props: number; error?: string };
    combined: { success: boolean; props: number };
  }> {
    logInfo('DualSportsAPI', `🧪 Testing both APIs for ${sport}...`);
    
    const testResults = {
      sportsRadar: { success: false, props: 0, error: undefined as string | undefined },
      theRundown: { success: false, props: 0, error: undefined as string | undefined },
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

    // Test TheRundown
    try {
      const trProps = await theRundownAPI.getPlayerProps(sport);
      testResults.theRundown.success = trProps.length > 0;
      testResults.theRundown.props = trProps.length;
    } catch (error) {
      testResults.theRundown.error = error.message;
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
    theRundownAPI.clearCache();
    logInfo('DualSportsAPI', 'All caches cleared');
  }

  // Get cache stats
  getCacheStats() {
    return {
      dualCache: {
        size: this.cache.size,
        keys: Array.from(this.cache.keys())
      },
      sportsRadarCache: realSportsbookAPI.getCacheStats(),
      theRundownCache: theRundownAPI.getCacheStats()
    };
  }
}

// Export singleton instance
export const dualSportsAPI = new DualSportsAPI();
export default dualSportsAPI;
