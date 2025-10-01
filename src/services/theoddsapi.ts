import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';

// TheOddsAPI Configuration
const THEODDS_API_KEY = '66a4e74b4bb00897106d92050c1221a6';
const THEODDS_BASE_URL = 'https://api.the-odds-api.com/v4';

// Cache configuration
const CACHE_DURATION = {
  ODDS: 5 * 60 * 1000, // 5 minutes
  MARKETS: 10 * 60 * 1000, // 10 minutes
  SPORTS: 24 * 60 * 60 * 1000, // 24 hours
  BOOKMAKERS: 24 * 60 * 60 * 1000, // 24 hours
};

// Interfaces
export interface Bookmaker {
  id: string;
  name: string;
  logo: string;
}

export interface Market {
  id: string;
  name: string;
  description?: string;
  key: string;
  outcomes: Outcome[];
}

export interface Outcome {
  id: string;
  name: string;
  price: number;
  point?: number;
  description?: string;
}

export interface GameOdds {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  bookmakers: BookmakerOdds[];
}

export interface BookmakerOdds {
  bookmaker: Bookmaker;
  markets: Market[];
}

export interface PlayerPropOdds {
  id: string;
  playerName: string;
  propType: string;
  line: number;
  overOdds: number;
  underOdds: number;
  bookmaker: string;
  lastUpdate: string;
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

class TheOddsAPI {
  private cache = new Map<string, CacheEntry<any>>();
  private usageStats: UsageStats;
  private lastDateCheck: Date = new Date();
  private cachedCurrentDate: string = '';

  constructor() {
    logInfo('TheOddsAPI', 'Service initialized - Version 1.0.0');
    logInfo('TheOddsAPI', `API Key: ${THEODDS_API_KEY ? 'Present' : 'Missing'}`);
    logInfo('TheOddsAPI', `Base URL: ${THEODDS_BASE_URL}`);
    
    this.loadUsageStats();
    this.resetUsageStatsDailyAndHourly();
    this.updateCurrentDate(); // Initialize current date
  }

  private loadUsageStats() {
    const storedStats = localStorage.getItem('theOddsAPIUsageStats');
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
    localStorage.setItem('theOddsAPIUsageStats', JSON.stringify(this.usageStats));
  }

  private resetUsageStatsDailyAndHourly() {
    const now = new Date();
    const lastDayReset = new Date(this.usageStats.lastDayReset);
    const lastHourReset = new Date(this.usageStats.lastHourReset);

    // Reset daily if a new day has started
    if (now.getDate() !== lastDayReset.getDate() || now.getMonth() !== lastDayReset.getMonth() || now.getFullYear() !== lastDayReset.getFullYear()) {
      this.usageStats.callsToday = 0;
      this.usageStats.lastDayReset = now.toISOString();
      logInfo('TheOddsAPI', 'Daily API usage stats reset.');
    }

    // Reset hourly if a new hour has started
    if (now.getHours() !== lastHourReset.getHours() || now.getDate() !== lastHourReset.getDate() || now.getMonth() !== lastHourReset.getMonth() || now.getFullYear() !== lastHourReset.getFullYear()) {
      this.usageStats.callsThisHour = 0;
      this.usageStats.lastHourReset = now.toISOString();
      logInfo('TheOddsAPI', 'Hourly API usage stats reset.');
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
      this.lastDateCheck = now;
      
      logInfo('TheOddsAPI', `Date updated: ${this.cachedCurrentDate}`);
    }
  }

  // Get current date (automatically updated every 24 hours)
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
      logAPI('TheOddsAPI', `Cache hit for ${endpoint}`);
      return cached.data;
    }

    // Update usage stats
    this.usageStats.totalCalls++;
    this.usageStats.callsToday++;
    this.usageStats.callsThisHour++;
    this.usageStats.endpointUsage[endpoint] = (this.usageStats.endpointUsage[endpoint] || 0) + 1;
    this.saveUsageStats();
    this.resetUsageStatsDailyAndHourly();

    const url = `${THEODDS_BASE_URL}${endpoint}&apiKey=${THEODDS_API_KEY}`;
    
    logAPI('TheOddsAPI', `Calling API: ${url}`);
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Extract quota info from headers
      const remainingQuota = response.headers.get('x-requests-remaining');
      const quotaResetTime = response.headers.get('x-requests-reset');
      
      if (remainingQuota) {
        this.usageStats.remainingQuota = parseInt(remainingQuota);
      }
      if (quotaResetTime) {
        this.usageStats.quotaResetTime = new Date(parseInt(quotaResetTime) * 1000).toISOString();
      }

      // Cache the response
      this.cache.set(cacheKey, {
        data,
        timestamp: now,
        expiry: now + cacheDuration
      });

      logSuccess('TheOddsAPI', `API call successful for ${endpoint}`);
      return data;
    } catch (error) {
      logError('TheOddsAPI', `Error fetching from ${endpoint}:`, error);
      throw error;
    }
  }

  // Get available sports
  async getSports(): Promise<any[]> {
    try {
      const endpoint = '/sports/?all=true';
      const data = await this.makeRequest<any[]>(endpoint, CACHE_DURATION.SPORTS);
      
      logSuccess('TheOddsAPI', `Retrieved ${data.length} sports`);
      return data;
    } catch (error) {
      logError('TheOddsAPI', 'Failed to get sports:', error);
      return [];
    }
  }

  // Get available bookmakers
  async getBookmakers(sport?: string): Promise<Bookmaker[]> {
    try {
      let endpoint = '/sports/?all=true';
      if (sport) {
        endpoint = `/sports/${sport}/bookmakers/`;
      }
      
      const data = await this.makeRequest<any[]>(endpoint, CACHE_DURATION.BOOKMAKERS);
      
      const bookmakers: Bookmaker[] = data.map(bm => ({
        id: bm.key,
        name: bm.title,
        logo: bm.image || '',
      }));

      logSuccess('TheOddsAPI', `Retrieved ${bookmakers.length} bookmakers`);
      return bookmakers;
    } catch (error) {
      logError('TheOddsAPI', 'Failed to get bookmakers:', error);
      return [];
    }
  }

  // Get odds for a specific sport
  async getOdds(sport: string, regions: string[] = ['us'], markets: string[] = ['h2h'], bookmakers: string[] = ['fanduel', 'draftkings', 'betmgm']): Promise<GameOdds[]> {
    try {
      const regionsParam = regions.join(',');
      const marketsParam = markets.join(',');
      const bookmakersParam = bookmakers.join(',');
      
      const endpoint = `/sports/${sport}/odds/?regions=${regionsParam}&markets=${marketsParam}&bookmakers=${bookmakersParam}&oddsFormat=american&dateFormat=iso`;
      
      const data = await this.makeRequest<any[]>(endpoint, CACHE_DURATION.ODDS);
      
      const gameOdds: GameOdds[] = data.map(game => ({
        id: game.id,
        sport: game.sport_key,
        homeTeam: game.home_team,
        awayTeam: game.away_team,
        commenceTime: game.commence_time,
        bookmakers: game.bookmakers?.map((bm: any) => ({
          bookmaker: {
            id: bm.key,
            name: bm.title,
            logo: bm.image || '',
          },
          markets: bm.markets?.map((market: any) => ({
            id: market.key,
            name: market.key,
            key: market.key,
            outcomes: market.outcomes?.map((outcome: any) => ({
              id: outcome.name,
              name: outcome.name,
              price: outcome.price,
              point: outcome.point,
              description: outcome.description,
            })) || [],
          })) || [],
        })) || [],
      }));

      logSuccess('TheOddsAPI', `Retrieved ${gameOdds.length} games with odds for ${sport}`);
      return gameOdds;
    } catch (error) {
      logError('TheOddsAPI', `Failed to get odds for ${sport}:`, error);
      return [];
    }
  }

  // Get player prop odds (if available)
  async getPlayerPropOdds(sport: string, regions: string[] = ['us'], bookmakers: string[] = ['fanduel', 'draftkings']): Promise<PlayerPropOdds[]> {
    try {
      const regionsParam = regions.join(',');
      const bookmakersParam = bookmakers.join(',');
      
      // Automatically detect current date every 24 hours
      const currentDate = this.getCurrentDate();
      const currentDateTime = `${currentDate}T00:00:00Z`;
      const nextDay = new Date(currentDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayDateTime = `${nextDay.toISOString().split('T')[0]}T00:00:00Z`;
      
      const endpoint = `/sports/${sport}/odds/?regions=${regionsParam}&markets=player_pass_tds,player_pass_yds,player_pass_completions&bookmakers=${bookmakersParam}&oddsFormat=american&dateFormat=iso&commenceTimeFrom=${currentDateTime}&commenceTimeTo=${nextDayDateTime}`;
      
      const data = await this.makeRequest<any[]>(endpoint, CACHE_DURATION.ODDS);
      
      const playerPropOdds: PlayerPropOdds[] = [];
      
      data.forEach(game => {
        game.bookmakers?.forEach((bookmaker: any) => {
          bookmaker.markets?.forEach((market: any) => {
            if (market.key.includes('player_')) {
              market.outcomes?.forEach((outcome: any) => {
                // Parse player name and prop type from outcome name
                const outcomeName = outcome.name || '';
                const playerName = outcomeName.split(' ').slice(0, -2).join(' '); // Remove "Over/Under X.X"
                const propType = this.mapMarketToPropType(market.key);
                
                if (playerName && propType) {
                  playerPropOdds.push({
                    id: `${bookmaker.key}_${game.id}_${market.key}_${outcome.name}`,
                    playerName,
                    propType,
                    line: outcome.point || 0,
                    overOdds: outcome.price > 0 ? outcome.price : -110,
                    underOdds: outcome.price > 0 ? -outcome.price : -110,
                    bookmaker: bookmaker.title,
                    lastUpdate: new Date().toISOString(),
                  });
                }
              });
            }
          });
        });
      });

      logSuccess('TheOddsAPI', `Retrieved ${playerPropOdds.length} player prop odds for ${sport}`);
      return playerPropOdds;
    } catch (error) {
      logError('TheOddsAPI', `Failed to get player prop odds for ${sport}:`, error);
      return [];
    }
  }

  // Get specific market odds (e.g., totals, spreads)
  async getMarketOdds(sport: string, market: string, regions: string[] = ['us'], bookmakers: string[] = ['fanduel', 'draftkings']): Promise<any[]> {
    try {
      const regionsParam = regions.join(',');
      const bookmakersParam = bookmakers.join(',');
      
      const endpoint = `/sports/${sport}/odds/?regions=${regionsParam}&markets=${market}&bookmakers=${bookmakersParam}&oddsFormat=american&dateFormat=iso`;
      
      const data = await this.makeRequest<any[]>(endpoint, CACHE_DURATION.ODDS);
      
      logSuccess('TheOddsAPI', `Retrieved ${data.length} ${market} odds for ${sport}`);
      return data;
    } catch (error) {
      logError('TheOddsAPI', `Failed to get ${market} odds for ${sport}:`, error);
      return [];
    }
  }

  // Helper method to map market keys to prop types
  private mapMarketToPropType(marketKey: string): string {
    const mappings: { [key: string]: string } = {
      'player_pass_tds': 'Passing TDs',
      'player_pass_yds': 'Passing Yards',
      'player_pass_completions': 'Passing Completions',
      'player_rush_yds': 'Rushing Yards',
      'player_rush_att': 'Rushing Attempts',
      'player_rec_yds': 'Receiving Yards',
      'player_rec': 'Receptions',
      'player_td': 'Touchdowns',
      'player_pts': 'Points',
      'player_reb': 'Rebounds',
      'player_ast': 'Assists',
      'player_stl': 'Steals',
      'player_blk': 'Blocks',
    };
    
    return mappings[marketKey] || marketKey;
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
    logInfo('TheOddsAPI', 'API usage statistics reset.');
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    logInfo('TheOddsAPI', 'Cache cleared.');
  }
}

export const theOddsAPI = new TheOddsAPI();
