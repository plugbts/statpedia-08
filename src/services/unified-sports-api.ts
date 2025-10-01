import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';
import { sportsDataIOAPI, PlayerProp as SportsDataIOPlayerProp, Team, Player, Game } from './sportsdataio-api';
import { theOddsAPI, PlayerPropOdds, GameOdds } from './theoddsapi';
import { realTimeSportsbookSync, RealTimePlayerProp } from './real-time-sportsbook-sync';

// Unified interfaces
export interface SportsbookOdds {
  sportsbook: string;
  line: number;
  overOdds: number;
  underOdds: number;
  lastUpdate: string;
}

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
  // Primary odds (default from FanDuel or first available)
  line: number;
  overOdds: number;
  underOdds: number;
  // Multiple sportsbook odds
  allSportsbookOdds?: SportsbookOdds[];
  // Metadata
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

  // Get player props with real-time sportsbook synchronization
  async getPlayerProps(sport: string, season?: number, week?: number, selectedSportsbook?: string): Promise<PlayerProp[]> {
    logAPI('UnifiedSportsAPI', `Getting player props for ${sport}${season ? ` ${season}` : ''}${week ? ` week ${week}` : ''}`);
    
    try {
      // Start real-time sync if not already running
      if (!realTimeSportsbookSync.isSyncRunning()) {
        await realTimeSportsbookSync.startSync(sport, 30000); // Sync every 30 seconds
        logInfo('UnifiedSportsAPI', `Started real-time sportsbook sync for ${sport}`);
      }

      // Get real-time sportsbook data (primary source)
      const realTimeProps = realTimeSportsbookSync.getCachedProps();
      logAPI('UnifiedSportsAPI', `Retrieved ${realTimeProps.length} real-time sportsbook props`);

      // Get fallback data from SportsDataIO if needed
      let fallbackProps: SportsDataIOPlayerProp[] = [];
      if (realTimeProps.length < 10) { // If we don't have enough real-time data
        try {
          fallbackProps = await sportsDataIOAPI.getPlayerProps(sport, season, week);
          const filteredFallback = this.filterCurrentAndFutureGames(fallbackProps);
          logAPI('UnifiedSportsAPI', `Retrieved ${filteredFallback.length} fallback props from SportsDataIO`);
        } catch (error) {
          logWarning('UnifiedSportsAPI', 'Failed to get fallback props from SportsDataIO:', error);
        }
      }

      // Convert real-time props to unified format
      const enhancedRealTimeProps: PlayerProp[] = realTimeProps.map(rtProp => {
        // Find best sportsbook odds (prefer FanDuel, then DraftKings, etc.)
        const bestOdds = rtProp.sportsbookOdds.find(o => o.sportsbookKey === 'fanduel') ||
                        rtProp.sportsbookOdds.find(o => o.sportsbookKey === 'draftkings') ||
                        rtProp.sportsbookOdds[0];

        return {
          id: rtProp.id,
          playerId: rtProp.playerName.replace(/\s+/g, '_').toLowerCase(),
          playerName: rtProp.playerName,
          team: rtProp.homeTeam, // This will need to be determined from game context
          teamAbbr: this.getTeamAbbreviation(rtProp.homeTeam),
          opponent: rtProp.awayTeam,
          opponentAbbr: this.getTeamAbbreviation(rtProp.awayTeam),
          gameId: rtProp.gameId,
          sport: sport.toUpperCase(),
          propType: rtProp.propType,
          // Use consensus odds as primary
          line: rtProp.consensusLine,
          overOdds: rtProp.consensusOverOdds,
          underOdds: rtProp.consensusUnderOdds,
          // Store all sportsbook odds
          allSportsbookOdds: rtProp.sportsbookOdds.map(odds => ({
            sportsbook: odds.sportsbook,
            line: odds.line,
            overOdds: odds.overOdds,
            underOdds: odds.underOdds,
            lastUpdate: odds.lastUpdate
          })),
          // Format dates
          gameDate: this.formatDate(rtProp.gameTime),
          gameTime: this.formatTime(rtProp.gameTime),
          // Add sync status
          sportsbookSource: 'real-time-sync',
          lastOddsUpdate: rtProp.lastSync,
          teamOddsContext: {
            homeTeam: rtProp.homeTeam,
            awayTeam: rtProp.awayTeam,
            hasTeamOdds: true,
            sportsbooks: rtProp.sportsbookOdds.map(o => o.sportsbookKey)
          }
        };
      });

      // Convert fallback props to unified format
      const enhancedFallbackProps: PlayerProp[] = fallbackProps.map(prop => ({
        ...prop,
        allSportsbookOdds: [{
          sportsbook: 'SportsDataIO',
          line: prop.line,
          overOdds: prop.overOdds,
          underOdds: prop.underOdds,
          lastUpdate: new Date().toISOString()
        }],
        gameDate: this.formatDate(prop.gameDate),
        gameTime: this.formatTime(prop.gameTime),
        sportsbookSource: 'sportsdataio-fallback',
        lastOddsUpdate: new Date().toISOString(),
        teamOddsContext: {
          homeTeam: prop.team,
          awayTeam: prop.opponent,
          hasTeamOdds: false,
          sportsbooks: ['SportsDataIO']
        }
      }));

      // Combine and deduplicate props (real-time takes priority)
      const combinedProps = [...enhancedRealTimeProps];
      
      // Add fallback props that don't conflict with real-time props
      enhancedFallbackProps.forEach(fallbackProp => {
        const exists = combinedProps.some(prop => 
          prop.playerName === fallbackProp.playerName && 
          prop.propType === fallbackProp.propType &&
          prop.gameId === fallbackProp.gameId
        );
        if (!exists) {
          combinedProps.push(fallbackProp);
        }
      });

      // Sort by game date ascending (closest games first, then future games)
      const sortedProps = combinedProps.sort((a, b) => {
        const dateA = new Date(a.gameDate).getTime();
        const dateB = new Date(b.gameDate).getTime();
        return dateA - dateB; // Ascending order (closest games first)
      });

      logSuccess('UnifiedSportsAPI', `Enhanced and sorted ${sortedProps.length} player props with real-time sportsbook data`);
      return sortedProps;

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

  // Get past games for analytics tab
  async getPastPlayerProps(sport: string, season?: number, week?: number, selectedSportsbook?: string): Promise<PlayerProp[]> {
    try {
      // Get base player props from SportsDataIO
      const sportsDataIOProps = await sportsDataIOAPI.getPlayerProps(sport, season, week);
      logAPI('UnifiedSportsAPI', `Retrieved ${sportsDataIOProps.length} props from SportsDataIO`);

      // Filter for past games only
      const filteredProps = this.filterPastGames(sportsDataIOProps);
      logAPI('UnifiedSportsAPI', `Filtered to ${filteredProps.length} past game props for analytics`);

      // Convert to PlayerProp format and sort by date (most recent first)
      const playerProps: PlayerProp[] = filteredProps
        .map(prop => ({
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
          gameDate: prop.gameDate,
          gameTime: prop.gameTime,
          headshotUrl: prop.headshotUrl,
          confidence: prop.confidence,
          expectedValue: prop.expectedValue,
          recentForm: prop.recentForm,
          last5Games: prop.last5Games,
          seasonStats: prop.seasonStats,
          aiPrediction: prop.aiPrediction,
        }))
        .sort((a, b) => {
          // Sort by game date descending (most recent past games first)
          const dateA = new Date(a.gameDate).getTime();
          const dateB = new Date(b.gameDate).getTime();
          return dateB - dateA;
        });

      // Filter by sportsbook if specified
      const finalProps = selectedSportsbook && selectedSportsbook !== 'all' 
        ? playerProps.filter(prop => prop.sport === selectedSportsbook.toUpperCase())
        : playerProps;

      logSuccess('UnifiedSportsAPI', `Returned ${finalProps.length} past player props for analytics`);
      return finalProps;
    } catch (error) {
      logError('UnifiedSportsAPI', `Failed to get past player props for ${sport}:`, error);
      return [];
    }
  }

  // Filter props to include only current and future games (no past games)
  private filterCurrentAndFutureGames(props: SportsDataIOPlayerProp[]): SportsDataIOPlayerProp[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Only include games from today onwards (current and future games only)
    // No past games - they will be moved to analytics tab
    
    return props.filter(prop => {
      if (!prop.gameDate) return false;
      
      try {
        const gameDate = new Date(prop.gameDate);
        const gameDay = new Date(gameDate.getFullYear(), gameDate.getMonth(), gameDate.getDate());
        
        // Only include games from today onwards (no past games)
        return gameDay >= today;
      } catch (error) {
        logWarning('UnifiedSportsAPI', `Invalid game date format: ${prop.gameDate}`, error);
        return false;
      }
    });
  }

  // Filter props to include only past games for analytics
  private filterPastGames(props: SportsDataIOPlayerProp[]): SportsDataIOPlayerProp[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Only include games from before today (past games for analytics)
    
    return props.filter(prop => {
      if (!prop.gameDate) return false;
      
      try {
        const gameDate = new Date(prop.gameDate);
        const gameDay = new Date(gameDate.getFullYear(), gameDate.getMonth(), gameDate.getDate());
        
        // Only include games from before today (past games)
        return gameDay < today;
      } catch (error) {
        logWarning('UnifiedSportsAPI', `Invalid game date format: ${prop.gameDate}`, error);
        return false;
      }
    });
  }

  // Get player prop markets for a sport
  private getPlayerPropMarkets(sport: string): string[] {
    const sportKey = this.getSportKey(sport);
    const sportMarkets: { [key: string]: string[] } = {
      'americanfootball_nfl': [
        'player_pass_tds', 'player_pass_yds', 'player_pass_completions', 'player_pass_attempts',
        'player_rush_yds', 'player_rush_attempts', 'player_receptions', 'player_receiving_yds',
        'player_receiving_tds', 'player_fumbles', 'player_interceptions'
      ],
      'basketball_nba': [
        'player_points', 'player_rebounds', 'player_assists', 'player_steals',
        'player_blocks', 'player_threes', 'player_turnovers', 'player_fantasy_points'
      ],
      'baseball_mlb': [
        'player_hits', 'player_runs', 'player_rbis', 'player_home_runs',
        'player_stolen_bases', 'player_strikeouts', 'player_walks'
      ],
      'icehockey_nhl': [
        'player_points', 'player_goals', 'player_assists', 'player_shots',
        'player_saves', 'player_goals_against'
      ]
    };
    
    return sportMarkets[sportKey] || [];
  }

  // Convert sport name to TheOddsAPI sport key
  private getSportKey(sport: string): string {
    const sportMap: { [key: string]: string } = {
      'nfl': 'americanfootball_nfl',
      'nba': 'basketball_nba',
      'mlb': 'baseball_mlb',
      'nhl': 'icehockey_nhl'
    };
    
    return sportMap[sport.toLowerCase()] || sport.toLowerCase();
  }

  // Find matching player prop odds from TheOddsAPI data
  private findMatchingPlayerPropOdds(prop: SportsDataIOPlayerProp, oddsData: any[]): any[] {
    // This would need to match player names and prop types between APIs
    // For now, return empty array - this is a complex matching problem
    return [];
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

  // Helper method to get team abbreviation
  private getTeamAbbreviation(teamName: string): string {
    const abbreviations: { [key: string]: string } = {
      // NFL
      'Arizona Cardinals': 'ARI',
      'Atlanta Falcons': 'ATL',
      'Baltimore Ravens': 'BAL',
      'Buffalo Bills': 'BUF',
      'Carolina Panthers': 'CAR',
      'Chicago Bears': 'CHI',
      'Cincinnati Bengals': 'CIN',
      'Cleveland Browns': 'CLE',
      'Dallas Cowboys': 'DAL',
      'Denver Broncos': 'DEN',
      'Detroit Lions': 'DET',
      'Green Bay Packers': 'GB',
      'Houston Texans': 'HOU',
      'Indianapolis Colts': 'IND',
      'Jacksonville Jaguars': 'JAX',
      'Kansas City Chiefs': 'KC',
      'Las Vegas Raiders': 'LV',
      'Los Angeles Chargers': 'LAC',
      'Los Angeles Rams': 'LA',
      'Miami Dolphins': 'MIA',
      'Minnesota Vikings': 'MIN',
      'New England Patriots': 'NE',
      'New Orleans Saints': 'NO',
      'New York Giants': 'NYG',
      'New York Jets': 'NYJ',
      'Philadelphia Eagles': 'PHI',
      'Pittsburgh Steelers': 'PIT',
      'San Francisco 49ers': 'SF',
      'Seattle Seahawks': 'SEA',
      'Tampa Bay Buccaneers': 'TB',
      'Tennessee Titans': 'TEN',
      'Washington Commanders': 'WAS',
      // NBA
      'Atlanta Hawks': 'ATL',
      'Boston Celtics': 'BOS',
      'Brooklyn Nets': 'BKN',
      'Charlotte Hornets': 'CHA',
      'Chicago Bulls': 'CHI',
      'Cleveland Cavaliers': 'CLE',
      'Dallas Mavericks': 'DAL',
      'Denver Nuggets': 'DEN',
      'Detroit Pistons': 'DET',
      'Golden State Warriors': 'GSW',
      'Houston Rockets': 'HOU',
      'Indiana Pacers': 'IND',
      'Los Angeles Clippers': 'LAC',
      'Los Angeles Lakers': 'LAL',
      'Memphis Grizzlies': 'MEM',
      'Miami Heat': 'MIA',
      'Milwaukee Bucks': 'MIL',
      'Minnesota Timberwolves': 'MIN',
      'New Orleans Pelicans': 'NOP',
      'New York Knicks': 'NYK',
      'Oklahoma City Thunder': 'OKC',
      'Orlando Magic': 'ORL',
      'Philadelphia 76ers': 'PHI',
      'Phoenix Suns': 'PHX',
      'Portland Trail Blazers': 'POR',
      'Sacramento Kings': 'SAC',
      'San Antonio Spurs': 'SAS',
      'Toronto Raptors': 'TOR',
      'Utah Jazz': 'UTA',
      'Washington Wizards': 'WAS'
    };
    
    return abbreviations[teamName] || teamName.substring(0, 3).toUpperCase();
  }
}

export const unifiedSportsAPI = new UnifiedSportsAPI();
