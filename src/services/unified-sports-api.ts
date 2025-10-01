import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';
import { sportsRadarAPI, SportsRadarPlayerProp } from './sportsradar-api';

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
  // Primary odds (default from SportsRadar)
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
  sportsRadar: {
    totalCalls: number;
    callsToday: number;
    callsThisHour: number;
    endpointUsage: { [key: string]: number };
  };
}

class UnifiedSportsAPI {
  constructor() {
    logInfo('UnifiedSportsAPI', 'Service initialized - Version 2.0.0');
    logInfo('UnifiedSportsAPI', 'Using SportsRadar API exclusively for all sports data');
  }

  // Get player props using SportsRadar API exclusively
  async getPlayerProps(sport: string, season?: number, week?: number, selectedSportsbook?: string): Promise<PlayerProp[]> {
    logAPI('UnifiedSportsAPI', `Getting player props for ${sport}${season ? ` ${season}` : ''}${week ? ` week ${week}` : ''} from SportsRadar`);
    
    try {
      // Get player props directly from SportsRadar
      const sportsRadarProps = await sportsRadarAPI.getPlayerProps(sport);
      logAPI('UnifiedSportsAPI', `Retrieved ${sportsRadarProps.length} player props from SportsRadar`);

      if (sportsRadarProps.length === 0) {
        logWarning('UnifiedSportsAPI', `No player props available from SportsRadar for ${sport}`);
        return [];
      }

      // Convert SportsRadar props to unified format
      const enhancedProps: PlayerProp[] = sportsRadarProps.map(srProp => ({
        id: srProp.id,
        playerId: srProp.playerId,
        playerName: srProp.playerName,
        team: this.determinePlayerTeam(srProp.playerName, srProp.homeTeam, srProp.awayTeam),
        teamAbbr: this.getTeamAbbreviation(this.determinePlayerTeam(srProp.playerName, srProp.homeTeam, srProp.awayTeam)),
        opponent: srProp.homeTeam === this.determinePlayerTeam(srProp.playerName, srProp.homeTeam, srProp.awayTeam) ? srProp.awayTeam : srProp.homeTeam,
        opponentAbbr: this.getTeamAbbreviation(srProp.homeTeam === this.determinePlayerTeam(srProp.playerName, srProp.homeTeam, srProp.awayTeam) ? srProp.awayTeam : srProp.homeTeam),
        gameId: srProp.gameId,
        sport: sport.toUpperCase(),
        propType: srProp.propType,
        line: srProp.line,
        overOdds: srProp.overOdds,
        underOdds: srProp.underOdds,
        allSportsbookOdds: [{
          sportsbook: srProp.sportsbook,
          line: srProp.line,
          overOdds: srProp.overOdds,
          underOdds: srProp.underOdds,
          lastUpdate: srProp.lastUpdate
        }],
        gameDate: this.formatDate(srProp.gameTime),
        gameTime: this.formatTime(srProp.gameTime),
        sportsbookSource: 'sportsradar-api',
        lastOddsUpdate: srProp.lastUpdate,
        teamOddsContext: {
          homeTeam: srProp.homeTeam,
          awayTeam: srProp.awayTeam,
          hasTeamOdds: true,
          sportsbooks: [srProp.sportsbookKey]
        }
      }));

      // Sort by game date ascending (closest games first, then future games)
      const sortedProps = enhancedProps.sort((a, b) => {
        const dateA = new Date(a.gameDate).getTime();
        const dateB = new Date(b.gameDate).getTime();
        return dateA - dateB; // Ascending order (closest games first)
      });

      logSuccess('UnifiedSportsAPI', `Enhanced and sorted ${sortedProps.length} player props from SportsRadar`);
      return sortedProps;

    } catch (error) {
      logError('UnifiedSportsAPI', `Failed to get player props from SportsRadar for ${sport}:`, error);
      return [];
    }
  }

  // Get past games for analytics tab
  async getPastPlayerProps(sport: string, season?: number, week?: number, selectedSportsbook?: string): Promise<PlayerProp[]> {
    try {
      // Get base player props from SportsRadar
      const sportsRadarProps = await sportsRadarAPI.getPlayerProps(sport);
      logAPI('UnifiedSportsAPI', `Retrieved ${sportsRadarProps.length} props from SportsRadar`);

      // Filter for past games only
      const filteredProps = this.filterPastGames(sportsRadarProps);
      logAPI('UnifiedSportsAPI', `Filtered to ${filteredProps.length} past game props for analytics`);

      // Convert to PlayerProp format and sort by date (most recent first)
      const playerProps: PlayerProp[] = filteredProps
        .map(srProp => ({
          id: srProp.id,
          playerId: srProp.playerId,
          playerName: srProp.playerName,
          team: this.determinePlayerTeam(srProp.playerName, srProp.homeTeam, srProp.awayTeam),
          teamAbbr: this.getTeamAbbreviation(this.determinePlayerTeam(srProp.playerName, srProp.homeTeam, srProp.awayTeam)),
          opponent: srProp.homeTeam === this.determinePlayerTeam(srProp.playerName, srProp.homeTeam, srProp.awayTeam) ? srProp.awayTeam : srProp.homeTeam,
          opponentAbbr: this.getTeamAbbreviation(srProp.homeTeam === this.determinePlayerTeam(srProp.playerName, srProp.homeTeam, srProp.awayTeam) ? srProp.awayTeam : srProp.homeTeam),
          gameId: srProp.gameId,
          sport: sport.toUpperCase(),
          propType: srProp.propType,
          line: srProp.line,
          overOdds: srProp.overOdds,
          underOdds: srProp.underOdds,
          gameDate: this.formatDate(srProp.gameTime),
          gameTime: this.formatTime(srProp.gameTime),
          sportsbookSource: 'sportsradar-api',
          lastOddsUpdate: srProp.lastUpdate,
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

  // Get games from SportsRadar
  async getGames(sport: string): Promise<any[]> {
    logAPI('UnifiedSportsAPI', `Getting games for ${sport} from SportsRadar`);
    return await sportsRadarAPI.getGames(sport);
  }

  // Get odds comparisons from SportsRadar
  async getOddsComparisons(sport: string): Promise<any[]> {
    logAPI('UnifiedSportsAPI', `Getting odds comparisons for ${sport} from SportsRadar`);
    return await sportsRadarAPI.getOddsComparisons(sport);
  }

  // Get future odds comparisons from SportsRadar
  async getFutureOddsComparisons(sport: string): Promise<any[]> {
    logAPI('UnifiedSportsAPI', `Getting future odds comparisons for ${sport} from SportsRadar`);
    return await sportsRadarAPI.getFutureOddsComparisons(sport);
  }

  // Get usage statistics from SportsRadar
  getUsageStats(): APIUsageStats {
    const sportsRadarStats = sportsRadarAPI.getUsageStats();

    return {
      sportsRadar: {
        totalCalls: sportsRadarStats.totalCalls,
        callsToday: sportsRadarStats.callsToday,
        callsThisHour: sportsRadarStats.callsThisHour,
        endpointUsage: sportsRadarStats.endpointUsage,
      }
    };
  }

  // Reset usage statistics for SportsRadar
  resetUsageStats() {
    sportsRadarAPI.resetUsageStats();
    logInfo('UnifiedSportsAPI', 'Usage statistics reset for SportsRadar API');
  }

  // Clear cache for SportsRadar
  clearCache() {
    sportsRadarAPI.clearCache();
    logInfo('UnifiedSportsAPI', 'Cache cleared for SportsRadar API');
  }

  // Filter props to include only past games for analytics
  private filterPastGames(props: SportsRadarPlayerProp[]): SportsRadarPlayerProp[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Only include games from before today (past games for analytics)
    
    return props.filter(prop => {
      if (!prop.gameTime) return false;
      
      try {
        const gameDate = new Date(prop.gameTime);
        const gameDay = new Date(gameDate.getFullYear(), gameDate.getMonth(), gameDate.getDate());
        
        // Only include games from before today (past games)
        return gameDay < today;
      } catch (error) {
        logWarning('UnifiedSportsAPI', `Invalid game date format: ${prop.gameTime}`, error);
        return false;
      }
    });
  }

  // Determine which team a player belongs to (simplified logic)
  private determinePlayerTeam(playerName: string, homeTeam: string, awayTeam: string): string {
    // This is a simplified approach - in a real implementation, you'd need
    // to match player names to team rosters
    // For now, we'll assume players are on the home team
    return homeTeam;
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
      'Washington Wizards': 'WAS',
      // MLB
      'Arizona Diamondbacks': 'ARI',
      'Atlanta Braves': 'ATL',
      'Baltimore Orioles': 'BAL',
      'Boston Red Sox': 'BOS',
      'Chicago Cubs': 'CHC',
      'Chicago White Sox': 'CWS',
      'Cincinnati Reds': 'CIN',
      'Cleveland Guardians': 'CLE',
      'Colorado Rockies': 'COL',
      'Detroit Tigers': 'DET',
      'Houston Astros': 'HOU',
      'Kansas City Royals': 'KC',
      'Los Angeles Angels': 'LAA',
      'Los Angeles Dodgers': 'LAD',
      'Miami Marlins': 'MIA',
      'Milwaukee Brewers': 'MIL',
      'Minnesota Twins': 'MIN',
      'New York Mets': 'NYM',
      'New York Yankees': 'NYY',
      'Oakland Athletics': 'OAK',
      'Philadelphia Phillies': 'PHI',
      'Pittsburgh Pirates': 'PIT',
      'San Diego Padres': 'SD',
      'San Francisco Giants': 'SF',
      'Seattle Mariners': 'SEA',
      'St. Louis Cardinals': 'STL',
      'Tampa Bay Rays': 'TB',
      'Texas Rangers': 'TEX',
      'Toronto Blue Jays': 'TOR',
      'Washington Nationals': 'WSH',
      // NHL
      'Anaheim Ducks': 'ANA',
      'Arizona Coyotes': 'ARI',
      'Boston Bruins': 'BOS',
      'Buffalo Sabres': 'BUF',
      'Calgary Flames': 'CGY',
      'Carolina Hurricanes': 'CAR',
      'Chicago Blackhawks': 'CHI',
      'Colorado Avalanche': 'COL',
      'Columbus Blue Jackets': 'CBJ',
      'Dallas Stars': 'DAL',
      'Detroit Red Wings': 'DET',
      'Edmonton Oilers': 'EDM',
      'Florida Panthers': 'FLA',
      'Los Angeles Kings': 'LAK',
      'Minnesota Wild': 'MIN',
      'Montreal Canadiens': 'MTL',
      'Nashville Predators': 'NSH',
      'New Jersey Devils': 'NJD',
      'New York Islanders': 'NYI',
      'New York Rangers': 'NYR',
      'Ottawa Senators': 'OTT',
      'Philadelphia Flyers': 'PHI',
      'Pittsburgh Penguins': 'PIT',
      'San Jose Sharks': 'SJ',
      'Seattle Kraken': 'SEA',
      'St. Louis Blues': 'STL',
      'Tampa Bay Lightning': 'TB',
      'Toronto Maple Leafs': 'TOR',
      'Vancouver Canucks': 'VAN',
      'Vegas Golden Knights': 'VGK',
      'Washington Capitals': 'WSH',
      'Winnipeg Jets': 'WPG'
    };
    
    return abbreviations[teamName] || teamName.substring(0, 3).toUpperCase();
  }
}

export const unifiedSportsAPI = new UnifiedSportsAPI();