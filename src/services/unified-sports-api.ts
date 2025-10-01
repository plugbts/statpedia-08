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
  sportsbookSource?: string;
  lastOddsUpdate?: string;
  teamOddsContext?: {
    homeTeam: string;
    awayTeam: string;
    hasTeamOdds: boolean;
    sportsbooks: string[];
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
  async getPlayerProps(sport: string, season?: number, week?: number, selectedSportsbook?: string): Promise<PlayerProp[]> {
    logAPI('UnifiedSportsAPI', `Getting player props for ${sport}${season ? ` ${season}` : ''}${week ? ` week ${week}` : ''}`);
    
    try {
      // Get base player props from SportsDataIO
      const sportsDataIOProps = await sportsDataIOAPI.getPlayerProps(sport, season, week);
      logAPI('UnifiedSportsAPI', `Retrieved ${sportsDataIOProps.length} props from SportsDataIO`);

      // Filter for current and future games only
      const filteredProps = this.filterCurrentAndFutureGames(sportsDataIOProps);
      logAPI('UnifiedSportsAPI', `Filtered to ${filteredProps.length} current/future game props`);

      // Get team odds from TheOddsAPI for context (not player props)
      let teamOdds: GameOdds[] = [];
      try {
        const bookmakers = selectedSportsbook ? [selectedSportsbook] : ['fanduel', 'draftkings', 'betmgm', 'caesars', 'pointsbet'];
        teamOdds = await theOddsAPI.getTeamOdds(sport, ['us'], bookmakers);
        logAPI('UnifiedSportsAPI', `Retrieved ${teamOdds.length} team odds from TheOddsAPI${selectedSportsbook ? ` for ${selectedSportsbook}` : ''}`);
      } catch (error) {
        logWarning('UnifiedSportsAPI', 'Failed to get team odds from TheOddsAPI:', error);
      }

      // Combine and enhance the data with date formatting
      const enhancedProps: PlayerProp[] = filteredProps.map(prop => {
        // Find team odds context for this game
        const gameTeamOdds = teamOdds.find(game => 
          game.homeTeam === prop.team || game.awayTeam === prop.team ||
          game.homeTeam === prop.opponent || game.awayTeam === prop.opponent
        );

        // Use SportsDataIO odds as primary source for player props
        const sportsbookSource = selectedSportsbook || 'SportsDataIO';
        
        return {
          ...prop,
          gameDate: this.formatDate(prop.gameDate), // Format date to M/D/YYYY
          gameTime: this.formatTime(prop.gameTime), // Format time to readable format
          sportsbookSource, // Track which sportsbook provided the odds
          lastOddsUpdate: new Date().toISOString(),
          // Add team odds context if available
          teamOddsContext: gameTeamOdds ? {
            homeTeam: gameTeamOdds.homeTeam,
            awayTeam: gameTeamOdds.awayTeam,
            hasTeamOdds: true,
            sportsbooks: gameTeamOdds.bookmakers.map(b => b.bookmaker.name)
          } : {
            homeTeam: prop.team,
            awayTeam: prop.opponent,
            hasTeamOdds: false,
            sportsbooks: []
          }
        };
      });

      logSuccess('UnifiedSportsAPI', `Enhanced ${enhancedProps.length} player props with dual API data (current/future games only)`);
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

  // Get available sportsbooks for a specific sport
  async getAvailableSportsbooks(sport: string): Promise<{ key: string; title: string; lastUpdate: string }[]> {
    logAPI('UnifiedSportsAPI', `Getting available sportsbooks for ${sport} from TheOddsAPI`);
    return await theOddsAPI.getAvailableSportsbooks(sport);
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

  // Filter props to only include current and future games
  private filterCurrentAndFutureGames(props: SportsDataIOPlayerProp[]): SportsDataIOPlayerProp[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return props.filter(prop => {
      if (!prop.gameDate) return false;
      
      try {
        const gameDate = new Date(prop.gameDate);
        const gameDay = new Date(gameDate.getFullYear(), gameDate.getMonth(), gameDate.getDate());
        
        // Include games from today onwards (current and future)
        return gameDay >= today;
      } catch (error) {
        logWarning('UnifiedSportsAPI', `Invalid game date format: ${prop.gameDate}`, error);
        return false;
      }
    });
  }

  // Format date to M/D/YYYY format
  private formatDate(dateString: string): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      const month = date.getMonth() + 1; // getMonth() returns 0-11
      const day = date.getDate();
      const year = date.getFullYear();
      
      return `${month}/${day}/${year}`;
    } catch (error) {
      logWarning('UnifiedSportsAPI', `Invalid date format: ${dateString}`, error);
      return dateString;
    }
  }

  // Format time to readable format
  private formatTime(timeString: string): string {
    if (!timeString) return '';
    
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      logWarning('UnifiedSportsAPI', `Invalid time format: ${timeString}`, error);
      return timeString;
    }
  }

  // Enhanced player name matching for better odds integration
  private isPlayerMatch(oddsPlayerName: string, propPlayerName: string): boolean {
    if (!oddsPlayerName || !propPlayerName) return false;
    
    // Normalize names for comparison
    const normalizeName = (name: string) => {
      return name.toLowerCase()
        .replace(/[^a-z\s]/g, '') // Remove special characters
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim();
    };
    
    const normalizedOdds = normalizeName(oddsPlayerName);
    const normalizedProp = normalizeName(propPlayerName);
    
    // Direct match
    if (normalizedOdds === normalizedProp) return true;
    
    // Check if one name contains the other (for nicknames, etc.)
    if (normalizedOdds.includes(normalizedProp) || normalizedProp.includes(normalizedOdds)) return true;
    
    // Check for common name variations (first name + last name vs full name)
    const oddsParts = normalizedOdds.split(' ');
    const propParts = normalizedProp.split(' ');
    
    if (oddsParts.length >= 2 && propParts.length >= 2) {
      // Check if last names match and first names are similar
      const oddsLastName = oddsParts[oddsParts.length - 1];
      const propLastName = propParts[propParts.length - 1];
      
      if (oddsLastName === propLastName) {
        const oddsFirstName = oddsParts[0];
        const propFirstName = propParts[0];
        
        // Check if first names match or one is a nickname of the other
        if (oddsFirstName === propFirstName || 
            oddsFirstName.startsWith(propFirstName) || 
            propFirstName.startsWith(oddsFirstName)) {
          return true;
        }
      }
    }
    
    return false;
  }
}

export const unifiedSportsAPI = new UnifiedSportsAPI();
