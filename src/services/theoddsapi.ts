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
  gameId: string;
  playerName: string;
  propType: string;
  line: number;
  overOdds: number;
  underOdds: number;
  sportsbook: string;
  sportsbookKey: string;
  lastUpdate: string;
  gameTime?: string;
  homeTeam?: string;
  awayTeam?: string;
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

  // Get available sportsbooks for a specific sport
  async getAvailableSportsbooks(sport: string): Promise<{ key: string; title: string; lastUpdate: string }[]> {
    try {
      // Use a simple odds call to get available bookmakers
      const endpoint = `/sports/${sport}/odds/?regions=us&markets=h2h&bookmakers=fanduel,draftkings,betmgm,caesars,pointsbet,espnbet,hardrock&oddsFormat=american&apiKey=${THEODDS_API_KEY}`;
      
      const data = await this.makeRequest<any[]>(endpoint, CACHE_DURATION.BOOKMAKERS);
      
      const sportsbooks = new Map<string, { key: string; title: string; lastUpdate: string }>();
      
      data.forEach(game => {
        game.bookmakers?.forEach((bookmaker: any) => {
          sportsbooks.set(bookmaker.key, {
            key: bookmaker.key,
            title: bookmaker.title,
            lastUpdate: bookmaker.last_update
          });
        });
      });
      
      const result = Array.from(sportsbooks.values());
      logSuccess('TheOddsAPI', `Retrieved ${result.length} available sportsbooks for ${sport}`);
      return result;
    } catch (error) {
      logError('TheOddsAPI', `Failed to get available sportsbooks for ${sport}:`, error);
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

  // Get team odds for games (h2h, spreads, totals)
  async getTeamOdds(sport: string, regions: string[] = ['us'], bookmakers: string[] = ['fanduel', 'draftkings', 'betmgm', 'caesars', 'pointsbet']): Promise<GameOdds[]> {
    try {
      const regionsParam = regions.join(',');
      const bookmakersParam = bookmakers.join(',');
      
      // Automatically detect current date every 24 hours
      const currentDate = this.getCurrentDate();
      const currentDateTime = `${currentDate}T00:00:00Z`;
      const nextDay = new Date(currentDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayDateTime = `${nextDay.toISOString().split('T')[0]}T00:00:00Z`;
      
      const endpoint = `/sports/${sport}/odds/?regions=${regionsParam}&markets=h2h,spreads,totals&bookmakers=${bookmakersParam}&oddsFormat=american&dateFormat=iso&commenceTimeFrom=${currentDateTime}&commenceTimeTo=${nextDayDateTime}`;
      
      const data = await this.makeRequest<any[]>(endpoint, CACHE_DURATION.ODDS);
      
      const gameOdds: GameOdds[] = data.map(game => ({
        id: game.id,
        sport: game.sport_title,
        homeTeam: game.home_team,
        awayTeam: game.away_team,
        commenceTime: game.commence_time,
        bookmakers: game.bookmakers?.map((bookmaker: any) => ({
          bookmaker: {
            id: bookmaker.key,
            name: bookmaker.title,
            logo: '',
          },
          markets: bookmaker.markets?.map((market: any) => ({
            key: market.key,
            outcomes: market.outcomes?.map((outcome: any) => ({
              name: outcome.name,
              price: outcome.price,
              point: outcome.point,
            })) || [],
            lastUpdate: market.last_update,
          })) || [],
          lastUpdate: bookmaker.last_update,
        })) || [],
      }));

      logSuccess('TheOddsAPI', `Retrieved ${gameOdds.length} team odds for ${sport}`);
      return gameOdds;
    } catch (error) {
      logError('TheOddsAPI', `Failed to get player prop odds for ${sport}:`, error);
      return [];
    }
  }

  // Get available player prop markets for a sport
  private getAvailablePlayerPropMarkets(sport: string): string[] {
    const sportMarkets: { [key: string]: string[] } = {
      'americanfootball_nfl': [
        'player_pass_tds', 'player_pass_yds', 'player_pass_completions', 'player_pass_attempts',
        'player_rush_yds', 'player_rush_attempts', 'player_receiving_yds', 'player_receiving_receptions',
        'player_pass_interceptions', 'player_fumbles_lost'
      ],
      'basketball_nba': [
        'player_points', 'player_rebounds', 'player_assists', 'player_steals', 'player_blocks',
        'player_turnovers', 'player_threes', 'player_fgs'
      ],
      'baseball_mlb': [
        'player_hits', 'player_home_runs', 'player_rbis', 'player_strikeouts', 'player_runs',
        'player_total_bases', 'player_walks', 'pitcher_strikeouts', 'pitcher_hits_allowed'
      ]
    };
    
    return sportMarkets[sport] || [];
  }

  // Check if a market is a player prop market
  private isPlayerPropMarket(marketKey: string): boolean {
    return marketKey.includes('player_') || marketKey.includes('pitcher_');
  }

  // Group player prop outcomes by player and prop type
  private groupPlayerPropOutcomes(outcomes: any[], marketKey: string): any[] {
    const playerProps = new Map<string, any>();
    
    outcomes.forEach(outcome => {
      const outcomeName = outcome.name || '';
      
      // Parse player name and prop type from outcome name
      // Format is usually "Player Name Over/Under X.X"
      const parts = outcomeName.split(' ');
      if (parts.length < 3) return;
      
      const overUnder = parts[parts.length - 2]; // "Over" or "Under"
      const line = parseFloat(parts[parts.length - 1]); // The number
      const playerName = parts.slice(0, -2).join(' '); // Everything before "Over/Under X.X"
      
      if (!playerName || isNaN(line)) return;
      
      const key = `${playerName}_${marketKey}`;
      
      if (!playerProps.has(key)) {
        playerProps.set(key, {
          playerName,
          propType: this.mapMarketToPropType(marketKey),
          line,
          overOdds: 0,
          underOdds: 0
        });
      }
      
      const prop = playerProps.get(key);
      if (overUnder.toLowerCase() === 'over') {
        prop.overOdds = outcome.price;
      } else if (overUnder.toLowerCase() === 'under') {
        prop.underOdds = outcome.price;
      }
    });
    
    return Array.from(playerProps.values());
  }

  // Enhanced market to prop type mapping
  private mapMarketToPropType(marketKey: string): string {
    const mappings: { [key: string]: string } = {
      // NFL
      'player_pass_tds': 'Passing TDs',
      'player_pass_yds': 'Passing Yards',
      'player_pass_completions': 'Pass Completions',
      'player_pass_attempts': 'Pass Attempts',
      'player_rush_yds': 'Rushing Yards',
      'player_rush_attempts': 'Rush Attempts',
      'player_receiving_yds': 'Receiving Yards',
      'player_receiving_receptions': 'Receptions',
      'player_pass_interceptions': 'Interceptions',
      'player_fumbles_lost': 'Fumbles',
      
      // NBA
      'player_points': 'Points',
      'player_rebounds': 'Rebounds',
      'player_assists': 'Assists',
      'player_steals': 'Steals',
      'player_blocks': 'Blocks',
      'player_turnovers': 'Turnovers',
      'player_threes': '3-Pointers',
      'player_fgs': 'Field Goals',
      
      // MLB
      'player_hits': 'Hits',
      'player_home_runs': 'Home Runs',
      'player_rbis': 'RBIs',
      'player_strikeouts': 'Strikeouts',
      'player_runs': 'Runs',
      'player_total_bases': 'Total Bases',
      'player_walks': 'Walks',
      'pitcher_strikeouts': 'Pitching Strikeouts',
      'pitcher_hits_allowed': 'Hits Allowed'
    };
    
    return mappings[marketKey] || marketKey;
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
