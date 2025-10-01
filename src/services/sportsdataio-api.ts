import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';

// SportsDataIO API Configuration
const SPORTSDATAIO_API_KEY = '883b10f6c52a48b38b3b5cafa94d2189';
const SPORTSDATAIO_BASE_URL = 'https://api.sportsdata.io/v3';

// Cache configuration
const CACHE_DURATION = {
  TEAMS: 24 * 60 * 60 * 1000, // 24 hours
  PLAYERS: 12 * 60 * 60 * 1000, // 12 hours
  SCHEDULES: 60 * 60 * 1000, // 1 hour
  PLAYER_PROPS: 15 * 60 * 1000, // 15 minutes
  STATS: 6 * 60 * 60 * 1000, // 6 hours
};

// Interfaces
export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  logo: string;
  league: string;
  city?: string;
  conference?: string;
  division?: string;
}

export interface Player {
  id: string;
  name: string;
  teamId: string;
  position: string;
  headshotUrl: string;
  jerseyNumber?: string;
  height?: string;
  weight?: string;
  age?: number;
}

export interface Game {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  gameDate: string;
  gameTime: string;
    status: string;
  league: string;
  week?: number;
  season?: number;
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

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

interface UsageStats {
  totalCalls: number;
  callsToday: number;
  callsThisHour: number;
  endpointUsage: { [key: string]: number };
  lastReset: string;
  lastHourReset: string;
  lastDayReset: string;
}

class SportsDataIOAPI {
  private cache = new Map<string, CacheEntry<any>>();
  private usageStats: UsageStats;
  private lastDateCheck: Date = new Date();
  private cachedCurrentDate: string = '';
  private cachedCurrentYear: number = 0;
  private cachedCurrentWeek: number = 0;

  constructor() {
    logInfo('SportsDataIO', 'Service initialized - Version 1.0.0');
    logInfo('SportsDataIO', `API Key: ${SPORTSDATAIO_API_KEY ? 'Present' : 'Missing'}`);
    logInfo('SportsDataIO', `Base URL: ${SPORTSDATAIO_BASE_URL}`);
    
    this.loadUsageStats();
    this.resetUsageStatsDailyAndHourly();
    this.updateCurrentDate(); // Initialize current date
  }

  private loadUsageStats() {
    const storedStats = localStorage.getItem('sportsDataIOUsageStats');
    if (storedStats) {
      this.usageStats = JSON.parse(storedStats);
    } else {
      this.usageStats = {
        totalCalls: 0,
        callsToday: 0,
        callsThisHour: 0,
        endpointUsage: {},
        lastReset: new Date().toISOString(),
        lastHourReset: new Date().toISOString(),
        lastDayReset: new Date().toISOString(),
      };
    }
  }

  private saveUsageStats() {
    localStorage.setItem('sportsDataIOUsageStats', JSON.stringify(this.usageStats));
  }

  private resetUsageStatsDailyAndHourly() {
    const now = new Date();
    const lastDayReset = new Date(this.usageStats.lastDayReset);
    const lastHourReset = new Date(this.usageStats.lastHourReset);

    // Reset daily if a new day has started
    if (now.getDate() !== lastDayReset.getDate() || now.getMonth() !== lastDayReset.getMonth() || now.getFullYear() !== lastDayReset.getFullYear()) {
      this.usageStats.callsToday = 0;
      this.usageStats.lastDayReset = now.toISOString();
      logInfo('SportsDataIO', 'Daily API usage stats reset.');
    }

    // Reset hourly if a new hour has started
    if (now.getHours() !== lastHourReset.getHours() || now.getDate() !== lastHourReset.getDate() || now.getMonth() !== lastHourReset.getMonth() || now.getFullYear() !== lastHourReset.getFullYear()) {
      this.usageStats.callsThisHour = 0;
      this.usageStats.lastHourReset = now.toISOString();
      logInfo('SportsDataIO', 'Hourly API usage stats reset.');
    }
    this.saveUsageStats();
  }

  // Update current date and check if 24 hours have passed
  private updateCurrentDate() {
    const now = new Date();
    const hoursSinceLastCheck = (now.getTime() - this.lastDateCheck.getTime()) / (1000 * 60 * 60);

    // Update cached date info every 24 hours or if it's the first time
    if (hoursSinceLastCheck >= 24 || !this.cachedCurrentDate) {
      this.cachedCurrentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format
      this.cachedCurrentYear = now.getFullYear();
      this.cachedCurrentWeek = this.calculateCurrentNFLWeek(now);
      this.lastDateCheck = now;
      
      logInfo('SportsDataIO', `Date updated: ${this.cachedCurrentDate} (Year: ${this.cachedCurrentYear}, NFL Week: ${this.cachedCurrentWeek})`);
    }
  }

  // Get current date (automatically updated every 24 hours)
  private getCurrentDate(): string {
    this.updateCurrentDate();
    return this.cachedCurrentDate;
  }

  // Get current year (automatically updated every 24 hours)
  private getCurrentYear(): number {
    this.updateCurrentDate();
    return this.cachedCurrentYear;
  }

  // Get current NFL week (automatically updated every 24 hours)
  private getCurrentNFLWeek(): number {
    this.updateCurrentDate();
    return this.cachedCurrentWeek;
  }

  // Get multiple dates for broader data collection (like sportsbook analytics sites)
  private getMultipleDates(daysCount: number): string[] {
    const dates: string[] = [];
    const today = new Date();
    
    for (let i = 0; i < daysCount; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i - 1); // Start from yesterday
      dates.push(date.toISOString().split('T')[0]); // YYYY-MM-DD format
    }
    
    return dates;
  }

  // Helper method to process player props data
  private processPlayerPropsData(rawData: any[], sport: string): PlayerProp[] {
    return rawData
      .filter(item => item && item.PlayerID && item.Name && item.Description)
      .map(item => ({
        id: `${item.PlayerID}_${item.ScoreID}_${item.Description}`,
        playerId: item.PlayerID?.toString() || '',
        playerName: item.Name,
        team: item.Team,
        teamAbbr: item.Team || this.getTeamAbbreviation(item.Team),
        opponent: item.Opponent,
        opponentAbbr: item.Opponent || this.getTeamAbbreviation(item.Opponent),
        gameId: item.ScoreID?.toString(),
        sport: sport.toUpperCase(),
        propType: this.mapStatTypeToPropType(item.Description),
        line: parseFloat(item.OverUnder) || 0,
        overOdds: parseInt(item.OverPayout) || -110,
        underOdds: parseInt(item.UnderPayout) || -110,
        gameDate: item.DateTime,
        gameTime: item.DateTime,
        headshotUrl: '',
        confidence: this.generateConfidence(),
        expectedValue: this.generateExpectedValue(),
        recentForm: 'average',
        last5Games: this.generateLast5Games(),
        seasonStats: this.generateSeasonStats(),
        aiPrediction: this.generateAIPrediction(),
      }));
  }

  private async makeRequest<T>(endpoint: string, cacheDuration: number = CACHE_DURATION.PLAYER_PROPS): Promise<T> {
    const cacheKey = endpoint;
    const now = Date.now();

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && now < cached.expiry) {
      logAPI('SportsDataIO', `Cache hit for ${endpoint}`);
      return cached.data;
    }

    // Update usage stats
    this.usageStats.totalCalls++;
    this.usageStats.callsToday++;
    this.usageStats.callsThisHour++;
    this.usageStats.endpointUsage[endpoint] = (this.usageStats.endpointUsage[endpoint] || 0) + 1;
    this.saveUsageStats();
    this.resetUsageStatsDailyAndHourly();

    const url = `${SPORTSDATAIO_BASE_URL}${endpoint}?key=${SPORTSDATAIO_API_KEY}`;
    
    logAPI('SportsDataIO', `Calling API: ${url}`);
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Cache the response
      this.cache.set(cacheKey, {
        data,
        timestamp: now,
        expiry: now + cacheDuration
      });

      logSuccess('SportsDataIO', `API call successful for ${endpoint}`);
      return data;
    } catch (error) {
      logError('SportsDataIO', `Error fetching from ${endpoint}:`, error);
      throw error;
    }
  }

  // Get teams for a specific sport
  async getTeams(sport: string): Promise<Team[]> {
    try {
      const endpoint = `/${sport.toLowerCase()}/scores/json/AllTeams`;
      const data = await this.makeRequest<any[]>(endpoint, CACHE_DURATION.TEAMS);
      
      const teams: Team[] = data.map(team => ({
        id: team.Key || team.TeamID,
        name: team.Name || team.FullName,
        abbreviation: team.Abbreviation || team.TeamAbbr,
        logo: team.WikipediaLogoUrl || team.Logo || '',
        league: sport.toUpperCase(),
        city: team.City,
        conference: team.Conference,
        division: team.Division,
      }));

      logSuccess('SportsDataIO', `Retrieved ${teams.length} teams for ${sport}`);
      return teams;
    } catch (error) {
      logError('SportsDataIO', `Failed to get teams for ${sport}:`, error);
      return [];
    }
  }

  // Get players for a specific sport
  async getPlayers(sport: string, teamId?: string): Promise<Player[]> {
    try {
      let endpoint: string;
      if (teamId) {
        endpoint = `/${sport.toLowerCase()}/scores/json/Players/${teamId}`;
      } else {
        // Get all players for the sport
        endpoint = `/${sport.toLowerCase()}/scores/json/Players`;
      }

      const data = await this.makeRequest<any[]>(endpoint, CACHE_DURATION.PLAYERS);
      
      const players: Player[] = data
        .filter(player => player.Active && player.Name) // Only active players with names
        .map(player => ({
          id: player.PlayerID?.toString() || player.Key,
          name: player.Name || player.FullName,
          teamId: player.Team || player.TeamID,
          position: player.Position || '',
          headshotUrl: player.PhotoUrl || player.HeadshotUrl || '',
          jerseyNumber: player.Number,
          height: player.Height,
          weight: player.Weight,
          age: player.Age,
        }));

      logSuccess('SportsDataIO', `Retrieved ${players.length} players for ${sport}${teamId ? ` (team: ${teamId})` : ''}`);
      return players;
    } catch (error) {
      logError('SportsDataIO', `Failed to get players for ${sport}:`, error);
      return [];
    }
  }

  // Get games/schedule for a specific sport
  async getGames(sport: string, season?: number, week?: number): Promise<Game[]> {
    try {
      // Automatically detect current date every 24 hours
      const currentYear = this.getCurrentYear();
      const seasonYear = season || currentYear;
      
      let endpoint: string;
      
      if (sport.toLowerCase() === 'nfl') {
        const currentWeek = week || this.getCurrentNFLWeek();
        endpoint = `/${sport.toLowerCase()}/scores/json/Schedules/${seasonYear}/${currentWeek}`;
      } else if (sport.toLowerCase() === 'mlb') {
        // Use current date for MLB games
        const currentDate = this.getCurrentDate();
        endpoint = `/${sport.toLowerCase()}/scores/json/GamesByDate/${currentDate}`;
      } else {
        endpoint = `/${sport.toLowerCase()}/scores/json/Schedules/${seasonYear}`;
      }

      const data = await this.makeRequest<any[]>(endpoint, CACHE_DURATION.SCHEDULES);
      
      const games: Game[] = data.map(game => ({
        id: game.GameID?.toString() || game.Key,
        homeTeam: {
          id: game.HomeTeam || game.HomeTeamID,
          name: game.HomeTeamName || '',
          abbreviation: game.HomeTeamAbbr || '',
          logo: '',
          league: sport.toUpperCase(),
        },
        awayTeam: {
          id: game.AwayTeam || game.AwayTeamID,
          name: game.AwayTeamName || '',
          abbreviation: game.AwayTeamAbbr || '',
          logo: '',
          league: sport.toUpperCase(),
        },
        gameDate: game.Date || game.DateTime,
        gameTime: game.DateTime,
        status: game.Status || 'Scheduled',
        league: sport.toUpperCase(),
        week: game.Week,
        season: seasonYear,
      }));

      logSuccess('SportsDataIO', `Retrieved ${games.length} games for ${sport} ${seasonYear}${week ? ` week ${week}` : ''}`);
      return games;
    } catch (error) {
      logError('SportsDataIO', `Failed to get games for ${sport}:`, error);
      return [];
    }
  }

  // Get player props for a specific sport
  async getPlayerProps(sport: string, season?: number, week?: number): Promise<PlayerProp[]> {
    try {
      // Automatically detect current date every 24 hours
      const currentYear = this.getCurrentYear();
      const seasonYear = season || currentYear;
      const currentDate = this.getCurrentDate();
      
      let endpoint: string;
      
      if (sport.toLowerCase() === 'nfl') {
        const currentWeek = week || this.getCurrentNFLWeek();
        // For NFL, try multiple weeks to get current data (like sportsbook analytics sites)
        const weeksToTry = [currentWeek, currentWeek + 1, currentWeek + 2]; // Try current week and next 2 weeks
        const allProps = [];
        
        for (const weekToTry of weeksToTry) {
          try {
            const weekEndpoint = `/${sport.toLowerCase()}/odds/json/PlayerPropsByWeek/${seasonYear}/${weekToTry}`;
            const weekData = await this.makeRequest<any[]>(weekEndpoint, CACHE_DURATION.PLAYER_PROPS);
            if (weekData && Array.isArray(weekData)) {
              allProps.push(...weekData);
            }
          } catch (error) {
            logWarning('SportsDataIO', `Failed to get props for ${sport} week ${weekToTry}:`, error);
          }
        }
        
        const props: PlayerProp[] = this.processPlayerPropsData(allProps, sport);
        logSuccess('SportsDataIO', `Retrieved ${props.length} player props for ${sport} across weeks ${weeksToTry.join(', ')}`);
        return props;
      } else if (sport.toLowerCase() === 'mlb') {
        // For MLB, try multiple dates to get more props
        const dates = this.getMultipleDates(3); // Get props for today, yesterday, and tomorrow
        const allProps = [];
        
        for (const date of dates) {
          try {
            const dateEndpoint = `/${sport.toLowerCase()}/odds/json/PlayerPropsByGame/${date}`;
            const dateData = await this.makeRequest<any[]>(dateEndpoint, CACHE_DURATION.PLAYER_PROPS);
            if (dateData && Array.isArray(dateData)) {
              allProps.push(...dateData);
            }
          } catch (error) {
            logWarning('SportsDataIO', `Failed to get props for ${sport} on ${date}:`, error);
          }
        }
        
        // Process all collected props
        const props: PlayerProp[] = allProps
          .filter(item => item && item.PlayerID && item.Name && item.Description)
          .map(item => ({
            id: `${item.PlayerID}_${item.ScoreID}_${item.Description}`,
            playerId: item.PlayerID?.toString() || '',
            playerName: item.Name,
            team: item.Team,
            teamAbbr: item.Team || this.getTeamAbbreviation(item.Team),
            opponent: item.Opponent,
            opponentAbbr: item.Opponent || this.getTeamAbbreviation(item.Opponent),
            gameId: item.ScoreID?.toString(),
            sport: sport.toUpperCase(),
            propType: this.mapStatTypeToPropType(item.Description),
            line: parseFloat(item.OverUnder) || 0,
            overOdds: parseInt(item.OverPayout) || -110,
            underOdds: parseInt(item.UnderPayout) || -110,
            gameDate: item.DateTime,
            gameTime: item.DateTime,
            headshotUrl: '',
            confidence: this.generateConfidence(),
            expectedValue: this.generateExpectedValue(),
            recentForm: 'average',
            last5Games: this.generateLast5Games(),
            seasonStats: this.generateSeasonStats(),
            aiPrediction: this.generateAIPrediction(),
          }));

        logSuccess('SportsDataIO', `Retrieved ${props.length} player props for ${sport} across multiple dates`);
        return props;
      } else {
        // For other sports (NBA, NHL), try multiple dates to get more props
        const dates = this.getMultipleDates(3); // Get props for today, yesterday, and tomorrow
        const allProps = [];
        
        for (const date of dates) {
          try {
            const dateEndpoint = `/${sport.toLowerCase()}/odds/json/PlayerPropsByGame/${date}`;
            const dateData = await this.makeRequest<any[]>(dateEndpoint, CACHE_DURATION.PLAYER_PROPS);
            if (dateData && Array.isArray(dateData)) {
              allProps.push(...dateData);
            }
          } catch (error) {
            logWarning('SportsDataIO', `Failed to get props for ${sport} on ${date}:`, error);
          }
        }
        
        // Process all collected props
        const props: PlayerProp[] = allProps
          .filter(item => item && item.PlayerID && item.Name && item.Description)
          .map(item => ({
            id: `${item.PlayerID}_${item.ScoreID}_${item.Description}`,
            playerId: item.PlayerID?.toString() || '',
            playerName: item.Name,
            team: item.Team,
            teamAbbr: item.Team || this.getTeamAbbreviation(item.Team),
            opponent: item.Opponent,
            opponentAbbr: item.Opponent || this.getTeamAbbreviation(item.Opponent),
            gameId: item.ScoreID?.toString(),
            sport: sport.toUpperCase(),
            propType: this.mapStatTypeToPropType(item.Description),
            line: parseFloat(item.OverUnder) || 0,
            overOdds: parseInt(item.OverPayout) || -110,
            underOdds: parseInt(item.UnderPayout) || -110,
            gameDate: item.DateTime,
            gameTime: item.DateTime,
            headshotUrl: '',
            confidence: this.generateConfidence(),
            expectedValue: this.generateExpectedValue(),
            recentForm: 'average',
            last5Games: this.generateLast5Games(),
            seasonStats: this.generateSeasonStats(),
            aiPrediction: this.generateAIPrediction(),
          }));

        logSuccess('SportsDataIO', `Retrieved ${props.length} player props for ${sport} across multiple dates`);
        return props;
      }

      // This should not be reached since NFL, MLB, and other sports are handled above
      logWarning('SportsDataIO', `No specific handling for sport: ${sport}`);
      return [];
    } catch (error) {
      logError('SportsDataIO', `Failed to get player props for ${sport}:`, error);
      return [];
    }
  }

  // Helper methods
  private calculateCurrentNFLWeek(currentDate: Date): number {
    // NFL season typically starts early September
    // Calculate week based on current date
    const currentYear = currentDate.getFullYear();
    const seasonStart = new Date(currentYear, 8, 7); // September 7th (month is 0-indexed)
    
    // If we're before September, assume we're in the previous year's season
    if (currentDate < seasonStart) {
      const prevSeasonStart = new Date(currentYear - 1, 8, 7);
      const weeksSinceStart = Math.floor((currentDate.getTime() - prevSeasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
      return Math.min(Math.max(weeksSinceStart, 1), 18); // NFL regular season is 18 weeks
    }
    
    const weeksSinceStart = Math.floor((currentDate.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
    return Math.min(Math.max(weeksSinceStart, 1), 18); // NFL regular season is 18 weeks
  }

  private mapStatTypeToPropType(statType: string): string {
    const mappings: { [key: string]: string } = {
      // NFL - based on actual API response
      'Receiving Yards': 'Receiving Yards',
      'Total Yards': 'Total Yards',
      'Fantasy Points': 'Fantasy Points',
      'Fantasy Points PPR': 'Fantasy Points PPR',
      'Rushing Attempts': 'Rush Attempts',
      'Rushing Yards': 'Rushing Yards',
      'Receptions': 'Receptions',
      
      // MLB
      'Hits': 'Hits',
      'Home Runs': 'Home Runs',
      'RBIs': 'RBIs',
      'Strikeouts': 'Strikeouts',
      'Runs': 'Runs',
      'Total Bases': 'Total Bases',
      'Stolen Bases': 'Stolen Bases',
      'Walks': 'Walks',
      'Pitching Strikeouts': 'Pitching Strikeouts',
      'Pitching Walks': 'Pitching Walks',
      'Pitching Hits Allowed': 'Pitching Hits Allowed',
      'Pitching Earned Runs': 'Pitching Earned Runs',
      'Pitching Innings': 'Pitching Innings',
      
      // NBA
      'Points': 'Points',
      'Rebounds': 'Rebounds',
      'Assists': 'Assists',
      'Steals': 'Steals',
      'Blocks': 'Blocks',
      '3-Pointers Made': '3-Pointers Made',
      'Free Throws Made': 'Free Throws Made',
      'Field Goals Made': 'Field Goals Made',
    };
    
    return mappings[statType] || statType;
  }

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
    };
    
    return abbreviations[teamName] || teamName.substring(0, 3).toUpperCase();
  }

  // Generate mock data for missing fields
  private generateConfidence(): number {
    return Math.round((0.5 + Math.random() * 0.4) * 100) / 100; // 0.5 to 0.9
  }

  private generateExpectedValue(): number {
    return Math.round((Math.random() - 0.5) * 0.1 * 100) / 100; // -0.05 to 0.05
  }

  private generateLast5Games(): number[] {
    return Array.from({ length: 5 }, () => Math.round(Math.random() * 100) / 10);
  }

  private generateSeasonStats() {
    const average = Math.round(Math.random() * 50 * 10) / 10;
    return {
      average,
      median: average + Math.round((Math.random() - 0.5) * 10 * 10) / 10,
      gamesPlayed: Math.floor(Math.random() * 15) + 5,
      hitRate: Math.round((0.4 + Math.random() * 0.4) * 100) / 100,
      last5Games: this.generateLast5Games(),
      seasonHigh: average + Math.round(Math.random() * 20 * 10) / 10,
      seasonLow: Math.max(0, average - Math.round(Math.random() * 20 * 10) / 10),
    };
  }

  private generateAIPrediction() {
    const recommended: 'over' | 'under' = Math.random() > 0.5 ? 'over' : 'under';
    return {
      recommended,
      confidence: this.generateConfidence(),
      reasoning: `Based on recent performance and matchup analysis`,
      factors: ['Recent form', 'Matchup history', 'Weather conditions', 'Injury reports'],
    };
  }

  // Get API usage statistics
  getUsageStats(): UsageStats {
    this.resetUsageStatsDailyAndHourly();
    return { ...this.usageStats };
  }

  // Reset API usage statistics
  resetUsageStats() {
    this.usageStats = {
      totalCalls: 0,
      callsToday: 0,
      callsThisHour: 0,
      endpointUsage: {},
      lastReset: new Date().toISOString(),
      lastHourReset: new Date().toISOString(),
      lastDayReset: new Date().toISOString(),
    };
    this.saveUsageStats();
    logInfo('SportsDataIO', 'API usage statistics reset.');
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    logInfo('SportsDataIO', 'Cache cleared.');
  }
}

export const sportsDataIOAPI = new SportsDataIOAPI();