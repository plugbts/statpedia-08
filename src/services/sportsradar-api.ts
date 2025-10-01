import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';

// SportsRadar API Configuration
const SPORTRADAR_API_KEYS = {
  NFL: 'onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D',
  NBA: 'onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D',
  MLB: 'onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D',
  NHL: 'onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D',
  NCAAFB: 'onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D',
  NCAAMB: 'onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D',
  WNBA: 'onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D',
  HEADSHOTS: 'onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D',
  ODDS_COMPARISONS_PLAYER_PROPS: 'onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D',
  ODDS_COMPARISONS_REGULAR: 'onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D',
  ODDS_COMPARISONS_FUTURE: 'onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D'
};

const SPORTRADAR_BASE_URL = 'https://api.sportradar.com';

// Cache configuration
const CACHE_DURATION = {
  ODDS: 5 * 60 * 1000, // 5 minutes
  MARKETS: 10 * 60 * 1000, // 10 minutes
  SPORTS: 24 * 60 * 60 * 1000, // 24 hours
  BOOKMAKERS: 24 * 60 * 60 * 1000, // 24 hours
};

// SportsRadar API Interfaces
export interface SportsRadarPlayerProp {
  id: string;
  playerId: string;
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
  market: string;
  outcome: string;
}

export interface SportsRadarGame {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  playerProps: SportsRadarPlayerProp[];
}

export interface SportsRadarOddsComparison {
  id: string;
  sport: string;
  market: string;
  outcomes: SportsRadarOutcome[];
  bookmakers: SportsRadarBookmaker[];
  lastUpdate: string;
}

export interface SportsRadarOutcome {
  id: string;
  name: string;
  price: number;
  point?: number;
  description?: string;
}

export interface SportsRadarBookmaker {
  id: string;
  name: string;
  key: string;
  markets: SportsRadarMarket[];
  lastUpdate: string;
}

export interface SportsRadarMarket {
  id: string;
  key: string;
  outcomes: SportsRadarOutcome[];
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

class SportsRadarAPI {
  private cache = new Map<string, CacheEntry<any>>();
  private usageStats: UsageStats;
  private lastDateCheck: Date = new Date();
  private cachedCurrentDate: string = '';

  constructor() {
    logInfo('SportsRadarAPI', 'Service initialized - Version 2.0.0');
    logInfo('SportsRadarAPI', `API Keys: ${Object.keys(SPORTRADAR_API_KEYS).length} configured`);
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

  private async makeRequest<T>(endpoint: string, sport: string = 'NFL', cacheDuration: number = CACHE_DURATION.ODDS): Promise<T> {
    const cacheKey = `${endpoint}_${sport}`;
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

    // Get the appropriate API key for the sport
    const apiKey = this.getApiKeyForSport(sport);
    const url = `${SPORTRADAR_BASE_URL}${endpoint}&api_key=${apiKey}`;
    
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

  // Get the appropriate API key for a sport
  private getApiKeyForSport(sport: string): string {
    const sportKey = sport.toUpperCase();
    return SPORTRADAR_API_KEYS[sportKey as keyof typeof SPORTRADAR_API_KEYS] || SPORTRADAR_API_KEYS.NFL;
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

  // Get player props using SportsRadar odds comparisons player props endpoint
  async getPlayerProps(sport: string): Promise<SportsRadarPlayerProp[]> {
    try {
      const sportKey = this.mapSportToKey(sport);
      const currentDate = this.getCurrentDate();
      
      // Use SportsRadar odds comparisons player props endpoint
      const endpoint = `/oddscomparison/${sportKey}/player_props/${currentDate}`;
      
      logAPI('SportsRadarAPI', `Fetching player props odds comparisons for ${sportKey} on ${currentDate}`);
      
      const data = await this.makeRequest<any[]>(endpoint, sport, CACHE_DURATION.ODDS);
      
      const playerProps: SportsRadarPlayerProp[] = [];
      
      // Process the odds comparison data structure from SportsRadar
      data.forEach((comparison: any) => {
        if (comparison.markets && Array.isArray(comparison.markets)) {
          comparison.markets.forEach((market: any) => {
            if (market.outcomes && Array.isArray(market.outcomes)) {
              market.outcomes.forEach((outcome: any) => {
                // Parse player name and prop type from outcome name
                const playerInfo = this.parsePlayerPropOutcome(outcome.name, market.key);
                if (playerInfo) {
                  playerProps.push({
                    id: `${comparison.id}_${playerInfo.playerId}_${market.key}`,
                    playerId: playerInfo.playerId,
                    playerName: playerInfo.playerName,
                    propType: playerInfo.propType,
                    line: outcome.point || 0,
                    overOdds: outcome.price || 0,
                    underOdds: 0, // Will be filled by matching under outcome
                    sportsbook: 'SportsRadar',
                    sportsbookKey: 'sportsradar',
                    lastUpdate: comparison.last_update || new Date().toISOString(),
                    gameId: comparison.id,
                    gameTime: comparison.commence_time || new Date().toISOString(),
                    homeTeam: comparison.home_team || 'N/A',
                    awayTeam: comparison.away_team || 'N/A',
                    confidence: this.calculateConfidence(outcome.price, outcome.price),
                    market: market.key,
                    outcome: outcome.name
                  });
                }
              });
            }
          });
        }
      });

      // Match over/under outcomes and calculate consensus
      const matchedProps = this.matchOverUnderOutcomes(playerProps);
      
      logSuccess('SportsRadarAPI', `Retrieved ${matchedProps.length} player props for ${sport}`);
      return matchedProps;
    } catch (error) {
      logError('SportsRadarAPI', `Failed to get player props for ${sport}:`, error);
      return [];
    }
  }

  // Parse player prop outcome name to extract player info
  private parsePlayerPropOutcome(outcomeName: string, marketKey: string): { playerId: string; playerName: string; propType: string } | null {
    try {
      // SportsRadar format: "Player Name Over/Under X.X" or "Player Name - Prop Type Over/Under X.X"
      const parts = outcomeName.split(' ');
      if (parts.length < 3) return null;

      const overUnder = parts[parts.length - 2];
      const line = parts[parts.length - 1];
      
      if (overUnder.toLowerCase() !== 'over' && overUnder.toLowerCase() !== 'under') return null;
      
      // Extract player name (everything before "Over/Under")
      const playerName = parts.slice(0, -2).join(' ');
      
      return {
        playerId: playerName.toLowerCase().replace(/\s+/g, '_'),
        playerName: playerName,
        propType: this.mapMarketToPropType(marketKey)
      };
    } catch (error) {
      logWarning('SportsRadarAPI', `Failed to parse outcome: ${outcomeName}`, error);
      return null;
    }
  }

  // Match over and under outcomes for the same player and prop
  private matchOverUnderOutcomes(props: SportsRadarPlayerProp[]): SportsRadarPlayerProp[] {
    const matchedProps = new Map<string, SportsRadarPlayerProp>();
    
    props.forEach(prop => {
      const key = `${prop.playerId}_${prop.market}_${prop.gameId}`;
      
      if (!matchedProps.has(key)) {
        matchedProps.set(key, { ...prop });
      } else {
        const existing = matchedProps.get(key)!;
        // Update with the other outcome's odds
        if (prop.outcome.toLowerCase().includes('over')) {
          existing.overOdds = prop.overOdds;
        } else if (prop.outcome.toLowerCase().includes('under')) {
          existing.underOdds = prop.overOdds; // overOdds contains the price
        }
      }
    });
    
    return Array.from(matchedProps.values()).filter(prop => prop.overOdds > 0 && prop.underOdds > 0);
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
      
      const data = await this.makeRequest<any[]>(endpoint, sport, CACHE_DURATION.ODDS);
      
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

  // Get odds comparisons for regular markets
  async getOddsComparisons(sport: string): Promise<SportsRadarOddsComparison[]> {
    try {
      const sportKey = this.mapSportToKey(sport);
      const currentDate = this.getCurrentDate();
      
      const endpoint = `/oddscomparison/${sportKey}/regular/${currentDate}`;
      
      logAPI('SportsRadarAPI', `Fetching odds comparisons for ${sportKey} on ${currentDate}`);
      
      const data = await this.makeRequest<any[]>(endpoint, sport, CACHE_DURATION.ODDS);
      
      const comparisons: SportsRadarOddsComparison[] = data.map((comparison: any) => ({
        id: comparison.id,
        sport: sportKey,
        market: comparison.market,
        outcomes: comparison.outcomes || [],
        bookmakers: comparison.bookmakers || [],
        lastUpdate: comparison.last_update || new Date().toISOString()
      }));

      logSuccess('SportsRadarAPI', `Retrieved ${comparisons.length} odds comparisons for ${sport}`);
      return comparisons;
    } catch (error) {
      logError('SportsRadarAPI', `Failed to get odds comparisons for ${sport}:`, error);
      return [];
    }
  }

  // Get future odds comparisons
  async getFutureOddsComparisons(sport: string): Promise<SportsRadarOddsComparison[]> {
    try {
      const sportKey = this.mapSportToKey(sport);
      const currentDate = this.getCurrentDate();
      
      const endpoint = `/oddscomparison/${sportKey}/future/${currentDate}`;
      
      logAPI('SportsRadarAPI', `Fetching future odds comparisons for ${sportKey} on ${currentDate}`);
      
      const data = await this.makeRequest<any[]>(endpoint, sport, CACHE_DURATION.ODDS);
      
      const comparisons: SportsRadarOddsComparison[] = data.map((comparison: any) => ({
        id: comparison.id,
        sport: sportKey,
        market: comparison.market,
        outcomes: comparison.outcomes || [],
        bookmakers: comparison.bookmakers || [],
        lastUpdate: comparison.last_update || new Date().toISOString()
      }));

      logSuccess('SportsRadarAPI', `Retrieved ${comparisons.length} future odds comparisons for ${sport}`);
      return comparisons;
    } catch (error) {
      logError('SportsRadarAPI', `Failed to get future odds comparisons for ${sport}:`, error);
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
