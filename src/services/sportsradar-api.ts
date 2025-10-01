import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';

// SportsRadar API Configuration
const SPORTRADAR_API_KEY = 'your-sportsradar-api-key'; // Replace with actual API key
const SPORTRADAR_BASE_URL = 'https://api.sportradar.com';

// Cache configuration
const CACHE_DURATION = {
  ODDS: 5 * 60 * 1000, // 5 minutes
  MARKETS: 10 * 60 * 1000, // 10 minutes
  SPORTS: 24 * 60 * 60 * 1000, // 24 hours
  BOOKMAKERS: 24 * 60 * 60 * 1000, // 24 hours
};

// Interfaces
export interface SportsRadarPlayerProp {
  id: string;
  playerName: string;
  propType: string;
  line: number;
  overOdds: number;
  underOdds: number;
  sportsbook: string;
  sportsbookKey: string;
  lastUpdate: string;
  gameId: string;
  gameTime: string;
  homeTeam: string;
  awayTeam: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface SportsRadarGame {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  playerProps: SportsRadarPlayerProp[];
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
  remainingQuota?: number;
  quotaResetTime?: string;
}

class SportsRadarAPI {
  private cache = new Map<string, CacheEntry<any>>();
  private usageStats: UsageStats;
  private lastDateCheck: Date = new Date();
  private cachedCurrentDate: string = '';

  constructor() {
    logInfo('SportsRadarAPI', 'Service initialized - Version 1.0.0');
    logInfo('SportsRadarAPI', `API Key: ${SPORTRADAR_API_KEY ? 'Present' : 'Missing'}`);
    logInfo('SportsRadarAPI', `Base URL: ${SPORTRADAR_BASE_URL}`);
    
    this.loadUsageStats();
    this.resetUsageStatsDailyAndHourly();
    this.updateCurrentDate();
  }

  private loadUsageStats() {
    const storedStats = localStorage.getItem('sportsradarAPIUsageStats');
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
    localStorage.setItem('sportsradarAPIUsageStats', JSON.stringify(this.usageStats));
  }

  private resetUsageStatsDailyAndHourly() {
    const now = new Date();
    const lastDayReset = new Date(this.usageStats.lastDayReset);
    const lastHourReset = new Date(this.usageStats.lastHourReset);

    // Reset daily if a new day has started
    if (now.getDate() !== lastDayReset.getDate() || now.getMonth() !== lastDayReset.getMonth() || now.getFullYear() !== lastDayReset.getFullYear()) {
      this.usageStats.callsToday = 0;
      this.usageStats.lastDayReset = now.toISOString();
      logInfo('SportsRadarAPI', 'Daily API usage stats reset.');
    }

    // Reset hourly if a new hour has started
    if (now.getHours() !== lastHourReset.getHours() || now.getDate() !== lastHourReset.getDate() || now.getMonth() !== lastHourReset.getMonth() || now.getFullYear() !== lastHourReset.getFullYear()) {
      this.usageStats.callsThisHour = 0;
      this.usageStats.lastHourReset = now.toISOString();
      logInfo('SportsRadarAPI', 'Hourly API usage stats reset.');
    }
    this.saveUsageStats();
  }

  private updateCurrentDate() {
    const now = new Date();
    const hoursSinceLastCheck = (now.getTime() - this.lastDateCheck.getTime()) / (1000 * 60 * 60);

    if (hoursSinceLastCheck >= 24 || !this.cachedCurrentDate) {
      this.cachedCurrentDate = now.toISOString().split('T')[0];
      this.lastDateCheck = now;
      logInfo('SportsRadarAPI', `Date updated: ${this.cachedCurrentDate}`);
    }
  }

  private getCurrentDate(): string {
    this.updateCurrentDate();
    return this.cachedCurrentDate;
  }

  private async makeRequest<T>(endpoint: string, cacheDuration: number = CACHE_DURATION.ODDS): Promise<T> {
    const cacheKey = endpoint;
    const now = Date.now();

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && now < cached.expiry) {
      logAPI('SportsRadarAPI', `Cache hit for ${endpoint}`);
      return cached.data;
    }

    // Update usage stats
    this.usageStats.totalCalls++;
    this.usageStats.callsToday++;
    this.usageStats.callsThisHour++;
    this.usageStats.endpointUsage[endpoint] = (this.usageStats.endpointUsage[endpoint] || 0) + 1;
    this.saveUsageStats();
    this.resetUsageStatsDailyAndHourly();

    const url = `${SPORTRADAR_BASE_URL}${endpoint}&api_key=${SPORTRADAR_API_KEY}`;
    
    logAPI('SportsRadarAPI', `Calling API: ${url}`);
    
    try {
      const response = await fetch(url);
      
      logAPI('SportsRadarAPI', `Response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        logError('SportsRadarAPI', `HTTP error response: ${errorText}`);
        throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
      }

      const data = await response.json();
      
      // Cache the response
      this.cache.set(cacheKey, {
        data,
        timestamp: now,
        expiry: now + cacheDuration
      });

      logSuccess('SportsRadarAPI', `API call successful for ${endpoint}, data length: ${Array.isArray(data) ? data.length : 'N/A'}`);
      return data;
    } catch (error) {
      logError('SportsRadarAPI', `Error fetching from ${endpoint}:`, error);
      throw error;
    }
  }

  // Map sport name to SportsRadar sport key
  private mapSportToKey(sport: string): string {
    const sportMap: { [key: string]: string } = {
      'nfl': 'americanfootball_nfl',
      'nba': 'basketball_nba',
      'mlb': 'baseball_mlb',
      'nhl': 'icehockey_nhl'
    };
    return sportMap[sport.toLowerCase()] || sport.toLowerCase();
  }

  // Get player props for a specific sport
  async getPlayerProps(sport: string): Promise<SportsRadarPlayerProp[]> {
    try {
      const sportKey = this.mapSportToKey(sport);
      const currentDate = this.getCurrentDate();
      
      // SportsRadar player props endpoint
      const endpoint = `/${sportKey}/odds/player_props/${currentDate}`;
      
      logAPI('SportsRadarAPI', `Fetching player props for ${sportKey} on ${currentDate}`);
      
      const data = await this.makeRequest<any[]>(endpoint, CACHE_DURATION.ODDS);
      
      const playerProps: SportsRadarPlayerProp[] = [];
      
      // Process the data structure from SportsRadar
      data.forEach((game: any) => {
        if (game.player_props && Array.isArray(game.player_props)) {
          game.player_props.forEach((prop: any) => {
            playerProps.push({
              id: `${game.id}_${prop.player_id}_${prop.market}`,
              playerName: prop.player_name,
              propType: this.mapMarketToPropType(prop.market),
              line: prop.line || 0,
              overOdds: prop.over_odds || 0,
              underOdds: prop.under_odds || 0,
              sportsbook: 'SportsRadar',
              sportsbookKey: 'sportsradar',
              lastUpdate: prop.last_updated || new Date().toISOString(),
              gameId: game.id,
              gameTime: game.commence_time,
              homeTeam: game.home_team,
              awayTeam: game.away_team,
              confidence: this.calculateConfidence(prop.over_odds, prop.under_odds)
            });
          });
        }
      });

      logSuccess('SportsRadarAPI', `Retrieved ${playerProps.length} player props for ${sport}`);
      return playerProps;
    } catch (error) {
      logError('SportsRadarAPI', `Failed to get player props for ${sport}:`, error);
      return [];
    }
  }

  // Map SportsRadar market to readable prop type
  private mapMarketToPropType(market: string): string {
    const mappings: { [key: string]: string } = {
      // NFL
      'passing_yards': 'Passing Yards',
      'passing_touchdowns': 'Passing TDs',
      'passing_completions': 'Pass Completions',
      'passing_attempts': 'Pass Attempts',
      'rushing_yards': 'Rushing Yards',
      'rushing_attempts': 'Rush Attempts',
      'receiving_yards': 'Receiving Yards',
      'receiving_receptions': 'Receptions',
      'receiving_touchdowns': 'Receiving TDs',
      'interceptions': 'Interceptions',
      'fumbles': 'Fumbles',
      
      // NBA
      'points': 'Points',
      'rebounds': 'Rebounds',
      'assists': 'Assists',
      'steals': 'Steals',
      'blocks': 'Blocks',
      'three_pointers': '3-Pointers',
      'turnovers': 'Turnovers',
      'field_goals': 'Field Goals',
      
      // MLB
      'hits': 'Hits',
      'home_runs': 'Home Runs',
      'rbis': 'RBIs',
      'strikeouts': 'Strikeouts',
      'runs': 'Runs',
      'total_bases': 'Total Bases',
      'walks': 'Walks',
      'pitching_strikeouts': 'Pitching Strikeouts',
      'hits_allowed': 'Hits Allowed',
      
      // NHL
      'points': 'Points',
      'goals': 'Goals',
      'assists': 'Assists',
      'shots': 'Shots',
      'saves': 'Saves',
      'goals_against': 'Goals Against'
    };
    
    return mappings[market.toLowerCase()] || market;
  }

  // Calculate confidence based on odds
  private calculateConfidence(overOdds: number, underOdds: number): 'high' | 'medium' | 'low' {
    const oddsDiff = Math.abs(overOdds - underOdds);
    
    if (oddsDiff <= 10) return 'high';      // Very close odds = high confidence
    if (oddsDiff <= 20) return 'medium';    // Moderate difference
    return 'low';                           // Large difference = low confidence
  }

  // Get games for a specific sport
  async getGames(sport: string): Promise<SportsRadarGame[]> {
    try {
      const sportKey = this.mapSportToKey(sport);
      const currentDate = this.getCurrentDate();
      
      const endpoint = `/${sportKey}/games/${currentDate}`;
      
      logAPI('SportsRadarAPI', `Fetching games for ${sportKey} on ${currentDate}`);
      
      const data = await this.makeRequest<any[]>(endpoint, CACHE_DURATION.ODDS);
      
      const games: SportsRadarGame[] = data.map((game: any) => ({
        id: game.id,
        sport: sportKey,
        homeTeam: game.home_team,
        awayTeam: game.away_team,
        commenceTime: game.commence_time,
        playerProps: [] // Will be populated separately
      }));

      logSuccess('SportsRadarAPI', `Retrieved ${games.length} games for ${sport}`);
      return games;
    } catch (error) {
      logError('SportsRadarAPI', `Failed to get games for ${sport}:`, error);
      return [];
    }
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
    logInfo('SportsRadarAPI', 'API usage statistics reset.');
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    logInfo('SportsRadarAPI', 'Cache cleared.');
  }
}

export const sportsRadarAPI = new SportsRadarAPI();
