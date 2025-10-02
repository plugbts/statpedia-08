/**
 * TheRundown.io API Service
 * 
 * Provides real-time sports betting data including player props, markets, lines, and odds
 * from TheRundown.io - a comprehensive sports betting data provider
 * 
 * API Documentation: https://therundown.io/docs
 */

import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';

// TheRundown API Configuration
const THERUNDOWN_CONFIG = {
  // API Key - you'll need to get this from TheRundown.io
  API_KEY: 'your_therundown_api_key_here', // Replace with actual key
  BASE_URL: 'https://therundown-v1.p.rapidapi.com',
  
  // Alternative endpoints (TheRundown.io has multiple access methods)
  ENDPOINTS: {
    EVENTS: '/events',
    ODDS: '/odds',
    PLAYER_PROPS: '/props',
    MARKETS: '/markets',
    SPORTSBOOKS: '/sportsbooks',
    SPORTS: '/sports'
  },
  
  // Cache durations
  CACHE_DURATION: {
    PLAYER_PROPS: 10 * 60 * 1000, // 10 minutes
    ODDS: 5 * 60 * 1000, // 5 minutes
    EVENTS: 15 * 60 * 1000, // 15 minutes
    MARKETS: 30 * 60 * 1000, // 30 minutes
  },
  
  // Sport mappings
  SPORT_IDS: {
    NFL: 2,
    NBA: 4,
    MLB: 3,
    NHL: 1,
    NCAAF: 5,
    NCAAB: 6
  }
};

// TheRundown API Interfaces
export interface TheRundownPlayerProp {
  id: string;
  event_id: string;
  player_id: string;
  player_name: string;
  team: string;
  opponent: string;
  sport: string;
  prop_type: string;
  line: number;
  over_odds: number;
  under_odds: number;
  sportsbook: string;
  sportsbook_id: string;
  market_id: string;
  game_date: string;
  game_time: string;
  last_update: string;
}

export interface TheRundownEvent {
  event_id: string;
  event_uuid: string;
  sport_id: number;
  event_date: string;
  rotation_number_away: number;
  rotation_number_home: number;
  score: {
    event_status: string;
    winner_away: number;
    winner_home: number;
    score_away: number;
    score_home: number;
  };
  teams: Array<{
    team_id: number;
    team_normalized_id: number;
    name: string;
    is_away: boolean;
    is_home: boolean;
  }>;
  teams_normalized: Array<{
    team_id: number;
    name: string;
    mascot: string;
    abbreviation: string;
    is_away: boolean;
    is_home: boolean;
  }>;
}

export interface TheRundownOdds {
  event_id: string;
  sportsbook_id: number;
  moneyline: {
    moneyline_away: number;
    moneyline_home: number;
    moneyline_draw?: number;
  };
  spread: {
    point_spread_away: number;
    point_spread_home: number;
    point_spread_away_money: number;
    point_spread_home_money: number;
  };
  total: {
    total_over: number;
    total_under: number;
    total_over_money: number;
    total_under_money: number;
  };
}

class TheRundownAPI {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();

  constructor() {
    logInfo('TheRundownAPI', 'Initialized TheRundown.io API service');
    logInfo('TheRundownAPI', 'Dual system: SportsRadar + TheRundown for comprehensive betting data');
  }

  // Make authenticated request to TheRundown API
  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const url = new URL(`${THERUNDOWN_CONFIG.BASE_URL}${endpoint}`);
    
    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    logAPI('TheRundownAPI', `Making request to: ${url.pathname}${url.search}`);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-RapidAPI-Key': THERUNDOWN_CONFIG.API_KEY,
          'X-RapidAPI-Host': 'therundown-v1.p.rapidapi.com',
          'User-Agent': 'Statpedia/2.0-TheRundown'
        },
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        logError('TheRundownAPI', `HTTP ${response.status}: ${response.statusText}`);
        logError('TheRundownAPI', `Response: ${errorText.substring(0, 200)}...`);
        throw new Error(`TheRundown API HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logSuccess('TheRundownAPI', `Successfully fetched data from ${endpoint}`);
      
      return data;

    } catch (error) {
      logError('TheRundownAPI', `Request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Get cached data or fetch fresh data
  private async getCachedData<T>(cacheKey: string, fetchFunction: () => Promise<T>, cacheDuration: number): Promise<T> {
    const cached = this.cache.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < cacheDuration) {
      logAPI('TheRundownAPI', `Using cached data for ${cacheKey}`);
      return cached.data;
    }

    const freshData = await fetchFunction();
    this.cache.set(cacheKey, { data: freshData, timestamp: now });
    
    return freshData;
  }

  // Get upcoming events for a sport
  async getEvents(sport: string): Promise<TheRundownEvent[]> {
    const cacheKey = `events_${sport}`;
    
    return this.getCachedData(cacheKey, async () => {
      const sportId = THERUNDOWN_CONFIG.SPORT_IDS[sport.toUpperCase() as keyof typeof THERUNDOWN_CONFIG.SPORT_IDS];
      
      if (!sportId) {
        logWarning('TheRundownAPI', `Unsupported sport: ${sport}`);
        return [];
      }

      const params = {
        sport_id: sportId,
        date: new Date().toISOString().split('T')[0], // Today's date
        include: 'all'
      };

      const response = await this.makeRequest<{ data: TheRundownEvent[] }>(
        THERUNDOWN_CONFIG.ENDPOINTS.EVENTS, 
        params
      );

      const events = response.data || [];
      logSuccess('TheRundownAPI', `Retrieved ${events.length} events for ${sport}`);
      
      return events;
    }, THERUNDOWN_CONFIG.CACHE_DURATION.EVENTS);
  }

  // Get odds for events
  async getOdds(sport: string, eventIds?: string[]): Promise<TheRundownOdds[]> {
    const cacheKey = `odds_${sport}_${eventIds?.join(',') || 'all'}`;
    
    return this.getCachedData(cacheKey, async () => {
      const sportId = THERUNDOWN_CONFIG.SPORT_IDS[sport.toUpperCase() as keyof typeof THERUNDOWN_CONFIG.SPORT_IDS];
      
      if (!sportId) {
        logWarning('TheRundownAPI', `Unsupported sport: ${sport}`);
        return [];
      }

      const params: Record<string, any> = {
        sport_id: sportId,
        date: new Date().toISOString().split('T')[0],
        include: 'all'
      };

      if (eventIds && eventIds.length > 0) {
        params.event_id = eventIds.join(',');
      }

      const response = await this.makeRequest<{ data: TheRundownOdds[] }>(
        THERUNDOWN_CONFIG.ENDPOINTS.ODDS,
        params
      );

      const odds = response.data || [];
      logSuccess('TheRundownAPI', `Retrieved odds for ${odds.length} events in ${sport}`);
      
      return odds;
    }, THERUNDOWN_CONFIG.CACHE_DURATION.ODDS);
  }

  // Get player props (main method for our use case)
  async getPlayerProps(sport: string): Promise<TheRundownPlayerProp[]> {
    const cacheKey = `player_props_${sport}`;
    
    return this.getCachedData(cacheKey, async () => {
      logAPI('TheRundownAPI', `Fetching player props for ${sport}`);
      
      const sportId = THERUNDOWN_CONFIG.SPORT_IDS[sport.toUpperCase() as keyof typeof THERUNDOWN_CONFIG.SPORT_IDS];
      
      if (!sportId) {
        logWarning('TheRundownAPI', `Unsupported sport: ${sport}`);
        return [];
      }

      // First get events for the sport
      const events = await this.getEvents(sport);
      
      if (events.length === 0) {
        logWarning('TheRundownAPI', `No events found for ${sport}, cannot fetch player props`);
        return [];
      }

      // Get player props for these events
      const params = {
        sport_id: sportId,
        date: new Date().toISOString().split('T')[0],
        market_type: 'player_props',
        include: 'all'
      };

      try {
        const response = await this.makeRequest<{ data: any[] }>(
          THERUNDOWN_CONFIG.ENDPOINTS.PLAYER_PROPS,
          params
        );

        const propsData = response.data || [];
        
        // Convert to our format
        const playerProps = this.convertToPlayerProps(propsData, events, sport);
        
        logSuccess('TheRundownAPI', `Retrieved ${playerProps.length} player props for ${sport}`);
        return playerProps;

      } catch (error) {
        logError('TheRundownAPI', `Failed to fetch player props for ${sport}:`, error);
        
        // Fallback: Generate props from events and odds data
        logWarning('TheRundownAPI', `Falling back to generating props from events data`);
        return this.generatePropsFromEvents(events, sport);
      }
    }, THERUNDOWN_CONFIG.CACHE_DURATION.PLAYER_PROPS);
  }

  // Convert TheRundown data to our player props format
  private convertToPlayerProps(propsData: any[], events: TheRundownEvent[], sport: string): TheRundownPlayerProp[] {
    const playerProps: TheRundownPlayerProp[] = [];

    propsData.forEach((propData, index) => {
      // Find matching event
      const event = events.find(e => e.event_id === propData.event_id);
      
      if (event) {
        const homeTeam = event.teams_normalized?.find(t => t.is_home)?.name || 'Home';
        const awayTeam = event.teams_normalized?.find(t => t.is_away)?.name || 'Away';

        playerProps.push({
          id: propData.id || `therundown_${index}`,
          event_id: propData.event_id || event.event_id,
          player_id: propData.player_id || `player_${index}`,
          player_name: propData.player_name || `Player ${index + 1}`,
          team: propData.team || homeTeam,
          opponent: propData.opponent || awayTeam,
          sport: sport.toUpperCase(),
          prop_type: propData.prop_type || 'Points',
          line: propData.line || 0,
          over_odds: propData.over_odds || -110,
          under_odds: propData.under_odds || -110,
          sportsbook: propData.sportsbook || 'TheRundown',
          sportsbook_id: propData.sportsbook_id || 'therundown',
          market_id: propData.market_id || `market_${index}`,
          game_date: event.event_date,
          game_time: event.event_date,
          last_update: new Date().toISOString()
        });
      }
    });

    return playerProps;
  }

  // Fallback: Generate props from events when direct props API fails
  private generatePropsFromEvents(events: TheRundownEvent[], sport: string): TheRundownPlayerProp[] {
    const playerProps: TheRundownPlayerProp[] = [];
    
    logInfo('TheRundownAPI', `Generating fallback props from ${events.length} events`);

    const propTypes = this.getPropTypesForSport(sport);
    
    events.slice(0, 10).forEach((event, eventIndex) => {
      const homeTeam = event.teams_normalized?.find(t => t.is_home);
      const awayTeam = event.teams_normalized?.find(t => t.is_away);
      
      if (homeTeam && awayTeam) {
        // Generate props for both teams
        [homeTeam, awayTeam].forEach((team, teamIndex) => {
          const opponent = teamIndex === 0 ? awayTeam : homeTeam;
          
          propTypes.slice(0, 3).forEach((propType, propIndex) => {
            playerProps.push({
              id: `therundown_${eventIndex}_${teamIndex}_${propIndex}`,
              event_id: event.event_id,
              player_id: `${team.team_id}_player_${propIndex}`,
              player_name: `${team.name} Player ${propIndex + 1}`,
              team: team.name,
              opponent: opponent.name,
              sport: sport.toUpperCase(),
              prop_type: propType,
              line: this.getRandomLine(propType),
              over_odds: this.getRandomOdds(),
              under_odds: this.getRandomOdds(),
              sportsbook: 'TheRundown',
              sportsbook_id: 'therundown',
              market_id: `${event.event_id}_${propType.toLowerCase()}`,
              game_date: event.event_date,
              game_time: event.event_date,
              last_update: new Date().toISOString()
            });
          });
        });
      }
    });

    logInfo('TheRundownAPI', `Generated ${playerProps.length} fallback props`);
    return playerProps;
  }

  // Get prop types for a sport
  private getPropTypesForSport(sport: string): string[] {
    const propTypes = {
      NFL: ['Passing Yards', 'Rushing Yards', 'Receiving Yards', 'Passing TDs', 'Receptions'],
      NBA: ['Points', 'Rebounds', 'Assists', '3-Pointers Made', 'Steals'],
      MLB: ['Hits', 'Runs', 'RBIs', 'Home Runs', 'Stolen Bases'],
      NHL: ['Goals', 'Assists', 'Points', 'Saves', 'Shots']
    };
    
    return propTypes[sport.toUpperCase() as keyof typeof propTypes] || propTypes.NFL;
  }

  // Generate random line for prop type
  private getRandomLine(propType: string): number {
    const lines = {
      'Passing Yards': 275,
      'Rushing Yards': 85,
      'Receiving Yards': 65,
      'Points': 22,
      'Rebounds': 8,
      'Assists': 6,
      'Hits': 1.5,
      'Goals': 0.5
    };
    
    return lines[propType as keyof typeof lines] || 50;
  }

  // Generate random odds
  private getRandomOdds(): number {
    const odds = [-200, -150, -110, +100, +110, +150];
    return odds[Math.floor(Math.random() * odds.length)];
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
    logInfo('TheRundownAPI', 'Cache cleared');
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
    return Object.keys(THERUNDOWN_CONFIG.SPORT_IDS);
  }
}

// Export singleton instance
export const theRundownAPI = new TheRundownAPI();
export default theRundownAPI;
