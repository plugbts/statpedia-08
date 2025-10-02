/**
 * The Odds API Service
 * 
 * STATUS: PAUSED - This service is temporarily disabled but all code is preserved
 * for future reactivation. Replaced by OddsBlaze API for better performance.
 * 
 * Original role: Handles odds, lines, live betting markets, and SGP data
 * Official Documentation: https://the-odds-api.com/
 * 
 * To reactivate:
 * 1. Update API key in ODDS_API_CONFIG
 * 2. Update imports in unified-sports-api.ts if needed
 * 3. Replace OddsBlaze calls with this service
 */

import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';

// The Odds API Configuration
const ODDS_API_CONFIG = {
  // API Key - you'll need to get this from The Odds API
  API_KEY: 'your_odds_api_key_here', // Replace with actual key
  BASE_URL: 'https://api.the-odds-api.com/v4',
  
  // Sport keys for The Odds API
  SPORT_KEYS: {
    NFL: 'americanfootball_nfl',
    NBA: 'basketball_nba',
    MLB: 'baseball_mlb',
    NHL: 'icehockey_nhl',
    NCAAF: 'americanfootball_ncaaf',
    NCAAB: 'basketball_ncaab'
  },
  
  // Market types
  MARKETS: {
    H2H: 'h2h',                    // Head to head (moneyline)
    SPREADS: 'spreads',            // Point spreads
    TOTALS: 'totals',              // Over/under totals
    OUTRIGHTS: 'outrights',        // Season/tournament winners
    H2H_LAY: 'h2h_lay',           // Lay betting
    ALTERNATE_SPREADS: 'alternate_spreads',
    ALTERNATE_TOTALS: 'alternate_totals'
  },
  
  // Bookmakers (major US sportsbooks)
  BOOKMAKERS: [
    'fanduel',
    'draftkings', 
    'betmgm',
    'caesars',
    'pointsbet',
    'betrivers',
    'unibet_us',
    'foxbet',
    'bet365',
    'williamhill_us'
  ],
  
  // Cache durations
  CACHE_DURATION: {
    ODDS: 5 * 60 * 1000,      // 5 minutes for live odds
    EVENTS: 15 * 60 * 1000,   // 15 minutes for events
    SPORTS: 24 * 60 * 60 * 1000 // 24 hours for sports list
  }
};

// The Odds API Interfaces
export interface OddsAPIEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers?: OddsAPIBookmaker[];
}

export interface OddsAPIBookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: OddsAPIMarket[];
}

export interface OddsAPIMarket {
  key: string;
  last_update: string;
  outcomes: OddsAPIOutcome[];
}

export interface OddsAPIOutcome {
  name: string;
  price: number;
  point?: number;
}

export interface OddsAPISport {
  key: string;
  group: string;
  title: string;
  description: string;
  active: boolean;
  has_outrights: boolean;
}

// Unified odds interface for our app
export interface UnifiedOdds {
  eventId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  markets: {
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
  };
  sportsbook: string;
  lastUpdate: string;
}

class OddsAPIService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();

  constructor() {
    logInfo('OddsAPI', 'Initialized The Odds API service');
    logInfo('OddsAPI', 'Dual system role: Odds, lines, live betting markets (if needed)');
  }

  // Make authenticated request to The Odds API
  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const url = new URL(`${ODDS_API_CONFIG.BASE_URL}${endpoint}`);
    
    // Add API key
    url.searchParams.append('apiKey', ODDS_API_CONFIG.API_KEY);
    
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

    logAPI('OddsAPI', `Making request to: ${url.pathname}${url.search}`);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Statpedia/2.0-OddsAPI'
        },
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        logError('OddsAPI', `HTTP ${response.status}: ${response.statusText}`);
        logError('OddsAPI', `Response: ${errorText.substring(0, 200)}...`);
        throw new Error(`Odds API HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Log remaining requests from headers
      const remainingRequests = response.headers.get('x-requests-remaining');
      const usedRequests = response.headers.get('x-requests-used');
      if (remainingRequests) {
        logAPI('OddsAPI', `Requests remaining: ${remainingRequests}, used: ${usedRequests}`);
      }
      
      logSuccess('OddsAPI', `Successfully fetched data from ${endpoint}`);
      return data;

    } catch (error) {
      logError('OddsAPI', `Request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Get cached data or fetch fresh data
  private async getCachedData<T>(cacheKey: string, fetchFunction: () => Promise<T>, cacheDuration: number): Promise<T> {
    const cached = this.cache.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < cacheDuration) {
      logAPI('OddsAPI', `Using cached data for ${cacheKey}`);
      return cached.data;
    }

    const freshData = await fetchFunction();
    this.cache.set(cacheKey, { data: freshData, timestamp: now });
    
    return freshData;
  }

  // Get available sports
  async getSports(): Promise<OddsAPISport[]> {
    const cacheKey = 'sports';
    
    return this.getCachedData(cacheKey, async () => {
      const sports = await this.makeRequest<OddsAPISport[]>('/sports');
      logSuccess('OddsAPI', `Retrieved ${sports.length} available sports`);
      return sports;
    }, ODDS_API_CONFIG.CACHE_DURATION.SPORTS);
  }

  // Get events (games) for a sport
  async getEvents(sport: string): Promise<OddsAPIEvent[]> {
    const sportKey = ODDS_API_CONFIG.SPORT_KEYS[sport.toUpperCase() as keyof typeof ODDS_API_CONFIG.SPORT_KEYS];
    
    if (!sportKey) {
      logWarning('OddsAPI', `Unsupported sport: ${sport}`);
      return [];
    }

    const cacheKey = `events_${sport}`;
    
    return this.getCachedData(cacheKey, async () => {
      const events = await this.makeRequest<OddsAPIEvent[]>(`/sports/${sportKey}/events`);
      logSuccess('OddsAPI', `Retrieved ${events.length} events for ${sport}`);
      return events;
    }, ODDS_API_CONFIG.CACHE_DURATION.EVENTS);
  }

  // Get odds for events
  async getOdds(sport: string, markets: string[] = ['h2h', 'spreads', 'totals']): Promise<OddsAPIEvent[]> {
    const sportKey = ODDS_API_CONFIG.SPORT_KEYS[sport.toUpperCase() as keyof typeof ODDS_API_CONFIG.SPORT_KEYS];
    
    if (!sportKey) {
      logWarning('OddsAPI', `Unsupported sport: ${sport}`);
      return [];
    }

    const cacheKey = `odds_${sport}_${markets.join('_')}`;
    
    return this.getCachedData(cacheKey, async () => {
      const params = {
        markets: markets,
        bookmakers: ODDS_API_CONFIG.BOOKMAKERS,
        oddsFormat: 'american',
        dateFormat: 'iso'
      };

      const events = await this.makeRequest<OddsAPIEvent[]>(`/sports/${sportKey}/odds`, params);
      logSuccess('OddsAPI', `Retrieved odds for ${events.length} events in ${sport}`);
      return events;
    }, ODDS_API_CONFIG.CACHE_DURATION.ODDS);
  }

  // Get live odds (in-play betting)
  async getLiveOdds(sport: string): Promise<OddsAPIEvent[]> {
    const sportKey = ODDS_API_CONFIG.SPORT_KEYS[sport.toUpperCase() as keyof typeof ODDS_API_CONFIG.SPORT_KEYS];
    
    if (!sportKey) {
      logWarning('OddsAPI', `Unsupported sport: ${sport}`);
      return [];
    }

    const cacheKey = `live_odds_${sport}`;
    
    return this.getCachedData(cacheKey, async () => {
      const params = {
        markets: ['h2h', 'spreads', 'totals'],
        bookmakers: ODDS_API_CONFIG.BOOKMAKERS,
        oddsFormat: 'american',
        dateFormat: 'iso'
      };

      try {
        const events = await this.makeRequest<OddsAPIEvent[]>(`/sports/${sportKey}/odds-live`, params);
        logSuccess('OddsAPI', `Retrieved live odds for ${events.length} events in ${sport}`);
        return events;
      } catch (error) {
        logWarning('OddsAPI', `Live odds not available for ${sport}, falling back to regular odds`);
        return this.getOdds(sport);
      }
    }, 2 * 60 * 1000); // 2 minute cache for live odds
  }

  // Convert to unified odds format
  convertToUnifiedOdds(events: OddsAPIEvent[]): UnifiedOdds[] {
    const unifiedOdds: UnifiedOdds[] = [];

    events.forEach(event => {
      if (!event.bookmakers || event.bookmakers.length === 0) return;

      event.bookmakers.forEach(bookmaker => {
        const odds: UnifiedOdds = {
          eventId: event.id,
          sport: event.sport_key,
          homeTeam: event.home_team,
          awayTeam: event.away_team,
          commenceTime: event.commence_time,
          markets: {},
          sportsbook: bookmaker.title,
          lastUpdate: bookmaker.last_update
        };

        // Process markets
        bookmaker.markets.forEach(market => {
          switch (market.key) {
            case 'h2h':
              const homeML = market.outcomes.find(o => o.name === event.home_team);
              const awayML = market.outcomes.find(o => o.name === event.away_team);
              const drawML = market.outcomes.find(o => o.name === 'Draw');
              
              if (homeML && awayML) {
                odds.markets.moneyline = {
                  home: homeML.price,
                  away: awayML.price,
                  draw: drawML?.price
                };
              }
              break;

            case 'spreads':
              const homeSpread = market.outcomes.find(o => o.name === event.home_team);
              const awaySpread = market.outcomes.find(o => o.name === event.away_team);
              
              if (homeSpread && awaySpread && homeSpread.point !== undefined && awaySpread.point !== undefined) {
                odds.markets.spread = {
                  home: { point: homeSpread.point, odds: homeSpread.price },
                  away: { point: awaySpread.point, odds: awaySpread.price }
                };
              }
              break;

            case 'totals':
              const over = market.outcomes.find(o => o.name === 'Over');
              const under = market.outcomes.find(o => o.name === 'Under');
              
              if (over && under && over.point !== undefined && under.point !== undefined) {
                odds.markets.total = {
                  over: { point: over.point, odds: over.price },
                  under: { point: under.point, odds: under.price }
                };
              }
              break;
          }
        });

        unifiedOdds.push(odds);
      });
    });

    return unifiedOdds;
  }

  // Get comprehensive odds data for a sport
  async getComprehensiveOdds(sport: string): Promise<UnifiedOdds[]> {
    logAPI('OddsAPI', `Getting comprehensive odds for ${sport}`);
    
    try {
      // Get both regular and live odds
      const [regularOdds, liveOdds] = await Promise.all([
        this.getOdds(sport),
        this.getLiveOdds(sport)
      ]);

      // Combine and convert to unified format
      const allEvents = [...regularOdds, ...liveOdds];
      const unifiedOdds = this.convertToUnifiedOdds(allEvents);

      // Deduplicate by event ID and sportsbook
      const deduplicatedOdds = unifiedOdds.filter((odds, index, self) => 
        index === self.findIndex(o => o.eventId === odds.eventId && o.sportsbook === odds.sportsbook)
      );

      logSuccess('OddsAPI', `Retrieved ${deduplicatedOdds.length} comprehensive odds entries for ${sport}`);
      return deduplicatedOdds;

    } catch (error) {
      logError('OddsAPI', `Failed to get comprehensive odds for ${sport}:`, error);
      return [];
    }
  }

  // Get best odds across all sportsbooks for a sport
  async getBestOdds(sport: string): Promise<{ [eventId: string]: any }> {
    const allOdds = await this.getComprehensiveOdds(sport);
    const bestOdds: { [eventId: string]: any } = {};

    // Group by event
    const eventGroups = allOdds.reduce((groups, odds) => {
      if (!groups[odds.eventId]) {
        groups[odds.eventId] = [];
      }
      groups[odds.eventId].push(odds);
      return groups;
    }, {} as { [eventId: string]: UnifiedOdds[] });

    // Find best odds for each event
    Object.entries(eventGroups).forEach(([eventId, oddsArray]) => {
      const event = oddsArray[0];
      bestOdds[eventId] = {
        eventId,
        homeTeam: event.homeTeam,
        awayTeam: event.awayTeam,
        commenceTime: event.commenceTime,
        bestOdds: {
          moneyline: {
            home: { odds: Math.max(...oddsArray.map(o => o.markets.moneyline?.home || -Infinity)), sportsbook: '' },
            away: { odds: Math.max(...oddsArray.map(o => o.markets.moneyline?.away || -Infinity)), sportsbook: '' }
          },
          spread: {
            home: { bestLine: 0, odds: 0, sportsbook: '' },
            away: { bestLine: 0, odds: 0, sportsbook: '' }
          },
          total: {
            over: { bestLine: 0, odds: 0, sportsbook: '' },
            under: { bestLine: 0, odds: 0, sportsbook: '' }
          }
        }
      };

      // Find sportsbooks with best odds
      oddsArray.forEach(odds => {
        if (odds.markets.moneyline?.home === bestOdds[eventId].bestOdds.moneyline.home.odds) {
          bestOdds[eventId].bestOdds.moneyline.home.sportsbook = odds.sportsbook;
        }
        if (odds.markets.moneyline?.away === bestOdds[eventId].bestOdds.moneyline.away.odds) {
          bestOdds[eventId].bestOdds.moneyline.away.sportsbook = odds.sportsbook;
        }
      });
    });

    logSuccess('OddsAPI', `Calculated best odds for ${Object.keys(bestOdds).length} events`);
    return bestOdds;
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
    logInfo('OddsAPI', 'Cache cleared');
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
    return Object.keys(ODDS_API_CONFIG.SPORT_KEYS);
  }

  // Test API connectivity
  async testConnectivity(): Promise<{ success: boolean; message: string; sports?: number }> {
    try {
      const sports = await this.getSports();
      return {
        success: true,
        message: `Connected successfully. ${sports.length} sports available.`,
        sports: sports.length
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`
      };
    }
  }
}

// Export singleton instance
export const oddsAPI = new OddsAPIService();
export default oddsAPI;
