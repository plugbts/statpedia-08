/**
 * OddsBlaze API Service
 * 
 * Handles odds, lines, live betting markets, SGP (Same Game Parlay), and consensus odds
 * Part of the trio system: SportsRadar + OddsBlaze + SportsGameOdds
 * 
 * Official Documentation: https://docs.oddsblaze.com/
 */

import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';

// OddsBlaze API Configuration
const ODDSBLAZE_CONFIG = {
  // API Key - you'll need to get this from www.oddsblaze.com
  API_KEY: 'your_oddsblaze_api_key_here', // Replace with actual key
  BASE_URL: 'https://api.oddsblaze.com/v2',
  
  // Sport keys for OddsBlaze
  SPORT_KEYS: {
    NFL: 'nfl',
    NBA: 'nba', 
    MLB: 'mlb',
    NHL: 'nhl',
    NCAAF: 'ncaaf',
    NCAAB: 'ncaab'
  },
  
  // Sportsbooks supported by OddsBlaze
  SPORTSBOOKS: [
    'draftkings',
    'fanduel',
    'betmgm',
    'caesars',
    'pointsbet',
    'betrivers',
    'unibet',
    'foxbet',
    'bet365',
    'williamhill'
  ],
  
  // Market types
  MARKETS: {
    MONEYLINE: 'moneyline',
    SPREAD: 'spread', 
    TOTAL: 'total',
    PROPS: 'props'
  },
  
  // Cache durations
  CACHE_DURATION: {
    ODDS: 3 * 60 * 1000,      // 3 minutes for live odds
    CONSENSUS: 5 * 60 * 1000, // 5 minutes for consensus
    SGP: 2 * 60 * 1000,       // 2 minutes for SGP
    SCHEDULE: 15 * 60 * 1000, // 15 minutes for schedule
    LEAGUES: 24 * 60 * 60 * 1000 // 24 hours for leagues
  }
};

// OddsBlaze Interfaces
export interface OddsBlazeOdds {
  id: string;
  sport: string;
  league: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  sportsbook: string;
  moneyline?: {
    home: number;
    away: number;
    draw?: number;
  };
  spread?: {
    home: { point: number; odds: number };
    away: { point: number; odds: number };
  };
  total?: {
    over: { point: number; odds: number };
    under: { point: number; odds: number };
  };
  last_update: string;
}

export interface OddsBlazeSGP {
  id: string;
  sport: string;
  game_id: string;
  sportsbook: string;
  selections: Array<{
    market: string;
    selection: string;
    odds: number;
  }>;
  combined_odds: number;
  last_update: string;
}

export interface OddsBlazeConsensus {
  id: string;
  sport: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  consensus: {
    moneyline?: {
      home: { avg_odds: number; best_odds: number; best_book: string };
      away: { avg_odds: number; best_odds: number; best_book: string };
    };
    spread?: {
      home: { avg_line: number; avg_odds: number; best_odds: number; best_book: string };
      away: { avg_line: number; avg_odds: number; best_odds: number; best_book: string };
    };
    total?: {
      over: { avg_line: number; avg_odds: number; best_odds: number; best_book: string };
      under: { avg_line: number; avg_odds: number; best_odds: number; best_book: string };
    };
  };
  market_count: number;
  last_update: string;
}

export interface OddsBlazeArbitrage {
  id: string;
  sport: string;
  home_team: string;
  away_team: string;
  market_type: string;
  profit_percentage: number;
  legs: Array<{
    sportsbook: string;
    selection: string;
    odds: number;
    stake_percentage: number;
  }>;
  last_update: string;
}

export interface OddsBlazeSchedule {
  id: string;
  sport: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  status: string;
  venue?: string;
  weather?: any;
}

class OddsBlazeAPI {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();

  constructor() {
    logInfo('OddsBlaze', 'Initialized OddsBlaze API service');
    logInfo('OddsBlaze', 'Trio system role: Odds, lines, SGP, consensus, arbitrage');
    logInfo('OddsBlaze', 'Documentation: https://docs.oddsblaze.com/');
  }

  // Make authenticated request to OddsBlaze API
  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const url = new URL(`${ODDSBLAZE_CONFIG.BASE_URL}${endpoint}`);
    
    // Add API key as query parameter (OddsBlaze requirement)
    url.searchParams.append('key', ODDSBLAZE_CONFIG.API_KEY);
    
    // Add other parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          url.searchParams.append(key, value.join(','));
        } else {
          url.searchParams.append(key, value.toString());
        }
      }
    });

    logAPI('OddsBlaze', `Making request to: ${url.pathname}${url.search}`);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Statpedia/2.0-OddsBlaze'
        },
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        logError('OddsBlaze', `HTTP ${response.status}: ${response.statusText}`);
        logError('OddsBlaze', `Response: ${errorText.substring(0, 200)}...`);
        throw new Error(`OddsBlaze API HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logSuccess('OddsBlaze', `Successfully fetched data from ${endpoint}`);
      return data;

    } catch (error) {
      logError('OddsBlaze', `Request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Get cached data or fetch fresh data
  private async getCachedData<T>(cacheKey: string, fetchFunction: () => Promise<T>, cacheDuration: number): Promise<T> {
    const cached = this.cache.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < cacheDuration) {
      logAPI('OddsBlaze', `Using cached data for ${cacheKey}`);
      return cached.data;
    }

    const freshData = await fetchFunction();
    this.cache.set(cacheKey, { data: freshData, timestamp: now });
    
    return freshData;
  }

  // Get odds from specific sportsbook
  async getOdds(sportsbook: string, sport: string): Promise<OddsBlazeOdds[]> {
    const sportKey = ODDSBLAZE_CONFIG.SPORT_KEYS[sport.toUpperCase() as keyof typeof ODDSBLAZE_CONFIG.SPORT_KEYS];
    
    if (!sportKey) {
      logWarning('OddsBlaze', `Unsupported sport: ${sport}`);
      return [];
    }

    if (!ODDSBLAZE_CONFIG.SPORTSBOOKS.includes(sportsbook.toLowerCase())) {
      logWarning('OddsBlaze', `Unsupported sportsbook: ${sportsbook}`);
      return [];
    }

    const cacheKey = `odds_${sportsbook}_${sport}`;
    
    return this.getCachedData(cacheKey, async () => {
      const odds = await this.makeRequest<OddsBlazeOdds[]>(`/odds/${sportsbook}/${sportKey}.json`);
      logSuccess('OddsBlaze', `Retrieved ${odds.length} odds from ${sportsbook} for ${sport}`);
      return odds;
    }, ODDSBLAZE_CONFIG.CACHE_DURATION.ODDS);
  }

  // Get Same Game Parlay odds
  async getSGPOdds(sportsbook: string, sport: string): Promise<OddsBlazeSGP[]> {
    const sportKey = ODDSBLAZE_CONFIG.SPORT_KEYS[sport.toUpperCase() as keyof typeof ODDSBLAZE_CONFIG.SPORT_KEYS];
    
    if (!sportKey) {
      logWarning('OddsBlaze', `Unsupported sport: ${sport}`);
      return [];
    }

    const cacheKey = `sgp_${sportsbook}_${sport}`;
    
    return this.getCachedData(cacheKey, async () => {
      const sgp = await this.makeRequest<OddsBlazeSGP[]>(`/sgp/${sportsbook}/${sportKey}.json`);
      logSuccess('OddsBlaze', `Retrieved ${sgp.length} SGP odds from ${sportsbook} for ${sport}`);
      return sgp;
    }, ODDSBLAZE_CONFIG.CACHE_DURATION.SGP);
  }

  // Get consensus odds (average across all sportsbooks)
  async getConsensusOdds(sport: string): Promise<OddsBlazeConsensus[]> {
    const sportKey = ODDSBLAZE_CONFIG.SPORT_KEYS[sport.toUpperCase() as keyof typeof ODDSBLAZE_CONFIG.SPORT_KEYS];
    
    if (!sportKey) {
      logWarning('OddsBlaze', `Unsupported sport: ${sport}`);
      return [];
    }

    const cacheKey = `consensus_${sport}`;
    
    return this.getCachedData(cacheKey, async () => {
      const consensus = await this.makeRequest<OddsBlazeConsensus[]>(`/consensus/${sportKey}.json`);
      logSuccess('OddsBlaze', `Retrieved ${consensus.length} consensus odds for ${sport}`);
      return consensus;
    }, ODDSBLAZE_CONFIG.CACHE_DURATION.CONSENSUS);
  }

  // Get historical odds
  async getHistoricalOdds(sportsbook: string, sport: string, date: string): Promise<OddsBlazeOdds[]> {
    const sportKey = ODDSBLAZE_CONFIG.SPORT_KEYS[sport.toUpperCase() as keyof typeof ODDSBLAZE_CONFIG.SPORT_KEYS];
    
    if (!sportKey) {
      logWarning('OddsBlaze', `Unsupported sport: ${sport}`);
      return [];
    }

    const cacheKey = `historical_${sportsbook}_${sport}_${date}`;
    
    return this.getCachedData(cacheKey, async () => {
      const historical = await this.makeRequest<OddsBlazeOdds[]>(`/historical/${sportsbook}/${sportKey}/${date}.json`);
      logSuccess('OddsBlaze', `Retrieved ${historical.length} historical odds for ${sport} on ${date}`);
      return historical;
    }, 60 * 60 * 1000); // 1 hour cache for historical data
  }

  // Get active markets
  async getActiveMarkets(sport: string): Promise<any[]> {
    const sportKey = ODDSBLAZE_CONFIG.SPORT_KEYS[sport.toUpperCase() as keyof typeof ODDSBLAZE_CONFIG.SPORT_KEYS];
    
    if (!sportKey) {
      logWarning('OddsBlaze', `Unsupported sport: ${sport}`);
      return [];
    }

    const cacheKey = `markets_${sport}`;
    
    return this.getCachedData(cacheKey, async () => {
      const markets = await this.makeRequest<any[]>(`/markets/${sportKey}.json`);
      logSuccess('OddsBlaze', `Retrieved ${markets.length} active markets for ${sport}`);
      return markets;
    }, ODDSBLAZE_CONFIG.CACHE_DURATION.ODDS);
  }

  // Get arbitrage opportunities
  async getArbitrageOpportunities(sport: string): Promise<OddsBlazeArbitrage[]> {
    const sportKey = ODDSBLAZE_CONFIG.SPORT_KEYS[sport.toUpperCase() as keyof typeof ODDSBLAZE_CONFIG.SPORT_KEYS];
    
    if (!sportKey) {
      logWarning('OddsBlaze', `Unsupported sport: ${sport}`);
      return [];
    }

    const cacheKey = `arbitrage_${sport}`;
    
    return this.getCachedData(cacheKey, async () => {
      const arbitrage = await this.makeRequest<OddsBlazeArbitrage[]>(`/arbitrage/${sportKey}.json`);
      logSuccess('OddsBlaze', `Retrieved ${arbitrage.length} arbitrage opportunities for ${sport}`);
      return arbitrage;
    }, ODDSBLAZE_CONFIG.CACHE_DURATION.ODDS);
  }

  // Get schedule
  async getSchedule(sport: string): Promise<OddsBlazeSchedule[]> {
    const sportKey = ODDSBLAZE_CONFIG.SPORT_KEYS[sport.toUpperCase() as keyof typeof ODDSBLAZE_CONFIG.SPORT_KEYS];
    
    if (!sportKey) {
      logWarning('OddsBlaze', `Unsupported sport: ${sport}`);
      return [];
    }

    const cacheKey = `schedule_${sport}`;
    
    return this.getCachedData(cacheKey, async () => {
      const schedule = await this.makeRequest<OddsBlazeSchedule[]>(`/schedule/${sportKey}.json`);
      logSuccess('OddsBlaze', `Retrieved ${schedule.length} scheduled games for ${sport}`);
      return schedule;
    }, ODDSBLAZE_CONFIG.CACHE_DURATION.SCHEDULE);
  }

  // Get available leagues
  async getLeagues(): Promise<any[]> {
    const cacheKey = 'leagues';
    
    return this.getCachedData(cacheKey, async () => {
      const leagues = await this.makeRequest<any[]>('/leagues.json');
      logSuccess('OddsBlaze', `Retrieved ${leagues.length} available leagues`);
      return leagues;
    }, ODDSBLAZE_CONFIG.CACHE_DURATION.LEAGUES);
  }

  // Get available sportsbooks
  async getSportsbooks(): Promise<any[]> {
    const cacheKey = 'sportsbooks';
    
    return this.getCachedData(cacheKey, async () => {
      const sportsbooks = await this.makeRequest<any[]>('/sportsbooks.json');
      logSuccess('OddsBlaze', `Retrieved ${sportsbooks.length} available sportsbooks`);
      return sportsbooks;
    }, ODDSBLAZE_CONFIG.CACHE_DURATION.LEAGUES);
  }

  // Get last polled times
  async getLastPolled(): Promise<any> {
    const cacheKey = 'last_polled';
    
    return this.getCachedData(cacheKey, async () => {
      const lastPolled = await this.makeRequest<any>('/last_polled.json');
      logSuccess('OddsBlaze', 'Retrieved last polled information');
      return lastPolled;
    }, 60 * 1000); // 1 minute cache for polling info
  }

  // Get comprehensive odds for a sport (all sportsbooks)
  async getComprehensiveOdds(sport: string): Promise<OddsBlazeOdds[]> {
    logAPI('OddsBlaze', `Getting comprehensive odds for ${sport} from all sportsbooks`);
    
    const allOdds: OddsBlazeOdds[] = [];
    
    // Fetch from all supported sportsbooks in parallel
    const oddsPromises = ODDSBLAZE_CONFIG.SPORTSBOOKS.map(async (sportsbook) => {
      try {
        const odds = await this.getOdds(sportsbook, sport);
        return odds;
      } catch (error) {
        logWarning('OddsBlaze', `Failed to get odds from ${sportsbook} for ${sport}`);
        return [];
      }
    });

    const results = await Promise.allSettled(oddsPromises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allOdds.push(...result.value);
      }
    });

    // Deduplicate by game and sportsbook
    const deduplicatedOdds = allOdds.filter((odds, index, self) => 
      index === self.findIndex(o => 
        o.home_team === odds.home_team && 
        o.away_team === odds.away_team && 
        o.sportsbook === odds.sportsbook
      )
    );

    logSuccess('OddsBlaze', `Retrieved ${deduplicatedOdds.length} comprehensive odds entries for ${sport}`);
    return deduplicatedOdds;
  }

  // Get best odds across all sportsbooks
  async getBestOdds(sport: string): Promise<{ [gameId: string]: any }> {
    const allOdds = await this.getComprehensiveOdds(sport);
    const bestOdds: { [gameId: string]: any } = {};

    // Group by game
    const gameGroups = allOdds.reduce((groups, odds) => {
      const gameKey = `${odds.home_team}_vs_${odds.away_team}`;
      if (!groups[gameKey]) {
        groups[gameKey] = [];
      }
      groups[gameKey].push(odds);
      return groups;
    }, {} as { [gameKey: string]: OddsBlazeOdds[] });

    // Find best odds for each game
    Object.entries(gameGroups).forEach(([gameKey, oddsArray]) => {
      const game = oddsArray[0];
      
      bestOdds[gameKey] = {
        home_team: game.home_team,
        away_team: game.away_team,
        commence_time: game.commence_time,
        best_odds: {
          moneyline: {
            home: { odds: Math.max(...oddsArray.map(o => o.moneyline?.home || -Infinity)), sportsbook: '' },
            away: { odds: Math.max(...oddsArray.map(o => o.moneyline?.away || -Infinity)), sportsbook: '' }
          }
        }
      };

      // Find sportsbooks with best odds
      oddsArray.forEach(odds => {
        if (odds.moneyline?.home === bestOdds[gameKey].best_odds.moneyline.home.odds) {
          bestOdds[gameKey].best_odds.moneyline.home.sportsbook = odds.sportsbook;
        }
        if (odds.moneyline?.away === bestOdds[gameKey].best_odds.moneyline.away.odds) {
          bestOdds[gameKey].best_odds.moneyline.away.sportsbook = odds.sportsbook;
        }
      });
    });

    logSuccess('OddsBlaze', `Calculated best odds for ${Object.keys(bestOdds).length} games`);
    return bestOdds;
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
    logInfo('OddsBlaze', 'Cache cleared');
  }

  // Get cache stats
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      lastUpdate: new Date().toISOString()
    };
  }

  // Get supported sports
  getSupportedSports(): string[] {
    return Object.keys(ODDSBLAZE_CONFIG.SPORT_KEYS);
  }

  // Test API connectivity
  async testConnectivity(): Promise<{ success: boolean; message: string; leagues?: number }> {
    try {
      const leagues = await this.getLeagues();
      return {
        success: true,
        message: `Connected successfully to OddsBlaze. ${leagues.length} leagues available.`,
        leagues: leagues.length
      };
    } catch (error) {
      return {
        success: false,
        message: `OddsBlaze connection failed: ${error.message}`
      };
    }
  }
}

// Export singleton instance
export const oddsBlazeAPI = new OddsBlazeAPI();
export default oddsBlazeAPI;
