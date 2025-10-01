import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';
import { sportsDataIOAPI, PlayerProp as SportsDataIOPlayerProp, Team, Player, Game } from './sportsdataio-api';
import { theOddsAPI, PlayerPropOdds, GameOdds } from './theoddsapi';

// Unified interfaces
export interface PlayerProp {
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
  confidence?: number;
  expectedValue?: number;
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
}

export interface APIUsageStats {
  sportsDataIO: {
    totalCalls: number;
    callsToday: number;
    callsThisHour: number;
    endpointUsage: { [key: string]: number };
  };
  theOddsAPI: {
    totalCalls: number;
    callsToday: number;
    callsThisHour: number;
    endpointUsage: { [key: string]: number };
    remainingQuota?: number;
    quotaResetTime?: string;
  };
}

class UnifiedSportsAPI {
  constructor() {
    logInfo('UnifiedSportsAPI', 'Service initialized - Version 1.0.0');
    logInfo('UnifiedSportsAPI', 'Combining SportsDataIO (player props) + TheOddsAPI (odds/lines)');
  }

  // Get teams (from SportsDataIO)
  async getTeams(sport: string): Promise<Team[]> {
    logAPI('UnifiedSportsAPI', `Getting teams for ${sport} from SportsDataIO`);
    return await sportsDataIOAPI.getTeams(sport);
  }

  // Get players (from SportsDataIO)
  async getPlayers(sport: string, teamId?: string): Promise<Player[]> {
    logAPI('UnifiedSportsAPI', `Getting players for ${sport}${teamId ? ` (team: ${teamId})` : ''} from SportsDataIO`);
    return await sportsDataIOAPI.getPlayers(sport, teamId);
  }

  // Get games (from SportsDataIO)
  async getGames(sport: string, season?: number, week?: number): Promise<Game[]> {
    logAPI('UnifiedSportsAPI', `Getting games for ${sport}${season ? ` ${season}` : ''}${week ? ` week ${week}` : ''} from SportsDataIO`);
    return await sportsDataIOAPI.getGames(sport, season, week);
  }

  // Get player props with enhanced odds from both APIs
  async getPlayerProps(sport: string, season?: number, week?: number): Promise<PlayerProp[]> {
    logAPI('UnifiedSportsAPI', `Getting player props for ${sport}${season ? ` ${season}` : ''}${week ? ` week ${week}` : ''}`);
    
    try {
      // Get base player props from SportsDataIO
      const sportsDataIOProps = await sportsDataIOAPI.getPlayerProps(sport, season, week);
      logAPI('UnifiedSportsAPI', `Retrieved ${sportsDataIOProps.length} props from SportsDataIO`);

      // Get enhanced odds from TheOddsAPI
      let oddsAPIProps: PlayerPropOdds[] = [];
      try {
        oddsAPIProps = await theOddsAPI.getPlayerPropOdds(sport);
        logAPI('UnifiedSportsAPI', `Retrieved ${oddsAPIProps.length} odds from TheOddsAPI`);
      } catch (error) {
        logWarning('UnifiedSportsAPI', 'Failed to get odds from TheOddsAPI, using SportsDataIO odds only:', error);
      }

      // Combine and enhance the data
      const enhancedProps: PlayerProp[] = sportsDataIOProps.map(prop => {
        // Try to find matching odds from TheOddsAPI
        const matchingOdds = oddsAPIProps.find(odds => 
          odds.playerName.toLowerCase().includes(prop.playerName.toLowerCase()) &&
          odds.propType === prop.propType
        );

        // Use TheOddsAPI odds if available, otherwise keep SportsDataIO odds
        const finalOverOdds = matchingOdds?.overOdds || prop.overOdds;
        const finalUnderOdds = matchingOdds?.underOdds || prop.underOdds;

        return {
          ...prop,
          overOdds: finalOverOdds,
          underOdds: finalUnderOdds,
          // Add metadata about data source
          confidence: matchingOdds ? Math.min(prop.confidence! + 0.1, 1.0) : prop.confidence, // Boost confidence if we have odds data
        };
      });

      logSuccess('UnifiedSportsAPI', `Enhanced ${enhancedProps.length} player props with dual API data`);
      return enhancedProps;

    } catch (error) {
      logError('UnifiedSportsAPI', `Failed to get player props for ${sport}:`, error);
      return [];
    }
  }

  // Get game odds (from TheOddsAPI)
  async getGameOdds(sport: string, regions: string[] = ['us'], markets: string[] = ['h2h'], bookmakers: string[] = ['fanduel', 'draftkings', 'betmgm']): Promise<GameOdds[]> {
    logAPI('UnifiedSportsAPI', `Getting game odds for ${sport} from TheOddsAPI`);
    return await theOddsAPI.getOdds(sport, regions, markets, bookmakers);
  }

  // Get specific market odds (from TheOddsAPI)
  async getMarketOdds(sport: string, market: string, regions: string[] = ['us'], bookmakers: string[] = ['fanduel', 'draftkings']): Promise<any[]> {
    logAPI('UnifiedSportsAPI', `Getting ${market} odds for ${sport} from TheOddsAPI`);
    return await theOddsAPI.getMarketOdds(sport, market, regions, bookmakers);
  }

  // Get available sports (from TheOddsAPI)
  async getSports(): Promise<any[]> {
    logAPI('UnifiedSportsAPI', 'Getting available sports from TheOddsAPI');
    return await theOddsAPI.getSports();
  }

  // Get available bookmakers (from TheOddsAPI)
  async getBookmakers(sport?: string): Promise<any[]> {
    logAPI('UnifiedSportsAPI', `Getting bookmakers${sport ? ` for ${sport}` : ''} from TheOddsAPI`);
    return await theOddsAPI.getBookmakers(sport);
  }

  // Get combined usage statistics from both APIs
  getUsageStats(): APIUsageStats {
    const sportsDataIOStats = sportsDataIOAPI.getUsageStats();
    const theOddsAPIStats = theOddsAPI.getUsageStats();

    return {
      sportsDataIO: {
        totalCalls: sportsDataIOStats.totalCalls,
        callsToday: sportsDataIOStats.callsToday,
        callsThisHour: sportsDataIOStats.callsThisHour,
        endpointUsage: sportsDataIOStats.endpointUsage,
      },
      theOddsAPI: {
        totalCalls: theOddsAPIStats.totalCalls,
        callsToday: theOddsAPIStats.callsToday,
        callsThisHour: theOddsAPIStats.callsThisHour,
        endpointUsage: theOddsAPIStats.endpointUsage,
        remainingQuota: theOddsAPIStats.remainingQuota,
        quotaResetTime: theOddsAPIStats.quotaResetTime,
      },
    };
  }

  // Reset usage statistics for both APIs
  resetUsageStats() {
    sportsDataIOAPI.resetUsageStats();
    theOddsAPI.resetUsageStats();
    logInfo('UnifiedSportsAPI', 'Usage statistics reset for both APIs');
  }

  // Clear cache for both APIs
  clearCache() {
    sportsDataIOAPI.clearCache();
    theOddsAPI.clearCache();
    logInfo('UnifiedSportsAPI', 'Cache cleared for both APIs');
  }
}

export const unifiedSportsAPI = new UnifiedSportsAPI();
