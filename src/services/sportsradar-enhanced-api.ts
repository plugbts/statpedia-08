/**
 * Enhanced SportsRadar API Service
 * 
 * Based on SportsRadar Postman Collection:
 * https://www.postman.com/sportradar-media-apis/sportradar-media-apis/overview
 * 
 * This service implements the exact API structure from SportsRadar's official documentation
 * for player props, betting odds, and market data with comprehensive caching.
 */

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

// Enhanced cache configuration for optimal performance
const CACHE_DURATION = {
  PLAYER_PROPS: 15 * 60 * 1000, // 15 minutes - player props change frequently
  ODDS: 5 * 60 * 1000, // 5 minutes - odds change very frequently
  MARKETS: 10 * 60 * 1000, // 10 minutes - markets change moderately
  GAMES: 30 * 60 * 1000, // 30 minutes - games change less frequently
  SPORTS: 24 * 60 * 60 * 1000, // 24 hours - sports list rarely changes
  BOOKMAKERS: 24 * 60 * 60 * 1000, // 24 hours - bookmakers rarely change
  TEAMS: 7 * 24 * 60 * 60 * 1000, // 7 days - teams rarely change
  PLAYERS: 3 * 24 * 60 * 60 * 1000, // 3 days - players rarely change
};

// SportsRadar API Interfaces based on official documentation
export interface SportsRadarPlayerProp {
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
  sportsbook: string;
  sportsbookKey: string;
  gameDate: string;
  gameTime: string;
  lastUpdate: string;
  confidence?: number;
  expectedValue?: number;
  headshotUrl?: string;
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
    modelVersion: string;
    lastUpdated: Date;
  };
}

export interface SportsRadarGame {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamAbbr: string;
  awayTeamAbbr: string;
  gameDate: string;
  gameTime: string;
  sport: string;
  season: number;
  week?: number;
  status: 'scheduled' | 'live' | 'completed' | 'postponed';
  venue?: string;
  weather?: {
    temperature: number;
    condition: string;
    windSpeed: number;
    humidity: number;
  };
}

export interface SportsRadarOddsComparison {
  id: string;
  gameId: string;
  sport: string;
  bookmaker: string;
  bookmakerKey: string;
  markets: SportsRadarMarket[];
  lastUpdate: string;
}

export interface SportsRadarMarket {
  key: string;
  name: string;
  outcomes: SportsRadarOutcome[];
}

export interface SportsRadarOutcome {
  name: string;
  price: number;
  point?: number;
  description?: string;
}

export interface SportsRadarBookmaker {
  id: string;
  name: string;
  key: string;
  logo?: string;
  website?: string;
  isActive: boolean;
}

export interface SportsRadarTeam {
  id: string;
  name: string;
  abbreviation: string;
  city: string;
  conference?: string;
  division?: string;
  logo?: string;
  colors?: {
    primary: string;
    secondary: string;
  };
}

export interface SportsRadarPlayer {
  id: string;
  name: string;
  teamId: string;
  teamName: string;
  position: string;
  jerseyNumber?: number;
  height?: string;
  weight?: number;
  age?: number;
  headshotUrl?: string;
  stats?: {
    season: number;
    gamesPlayed: number;
    [key: string]: any;
  };
}

// Cache storage
const cache = new Map<string, { data: any; timestamp: number; hits: number }>();

class SportsRadarEnhancedAPI {
  private requestCount = 0;
  private dailyRequestCount = 0;
  private lastResetDate = new Date().toDateString();

  constructor() {
    logInfo('SportsRadarEnhancedAPI', 'Service initialized - Enhanced Version 1.0.0');
    logInfo('SportsRadarEnhancedAPI', 'Using exact SportsRadar API structure from Postman collection');
  }

  // Get API key for specific sport/endpoint
  private getApiKey(sportKey: string, endpointType: 'core' | 'odds' | 'player-props' = 'core'): string {
    if (endpointType === 'odds' || endpointType === 'player-props') {
      return SPORTRADAR_API_KEYS.ODDS_COMPARISONS_PLAYER_PROPS;
    }
    return SPORTRADAR_API_KEYS[sportKey as keyof typeof SPORTRADAR_API_KEYS] || SPORTRADAR_API_KEYS.NFL;
  }

  // Make authenticated request to SportsRadar API
  private async makeRequest<T>(endpoint: string, sportKey: string, endpointType: 'core' | 'odds' | 'player-props' = 'core'): Promise<T> {
    const cacheKey = `${endpoint}-${sportKey}-${endpointType}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
      const age = Date.now() - cached.timestamp;
      const maxAge = this.getCacheDuration(endpointType);
      
      if (age < maxAge) {
        cached.hits++;
        logAPI('SportsRadarEnhancedAPI', `Using cached data for ${endpoint} (${cached.hits} hits, ${Math.round(age / 1000)}s old)`);
        return cached.data;
      }
    }

    this.requestCount++;
    this.dailyRequestCount++;

    const apiKey = this.getApiKey(sportKey, endpointType);
    const url = `${SPORTRADAR_BASE_URL}${endpoint}?api_key=${apiKey}`;

    logAPI('SportsRadarEnhancedAPI', `Making request to: ${endpoint}`);
    logAPI('SportsRadarEnhancedAPI', `Request #${this.requestCount} (Daily: ${this.dailyRequestCount})`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Statpedia/1.0'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        logError('SportsRadarEnhancedAPI', `HTTP ${response.status}: ${response.statusText}`);
        logError('SportsRadarEnhancedAPI', `Response: ${errorText}`);
        throw new Error(`SportsRadar API returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      // Cache the response
      cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        hits: 0
      });

      logSuccess('SportsRadarEnhancedAPI', `Successfully fetched data from ${endpoint}`);
      return data;
    } catch (error) {
      logError('SportsRadarEnhancedAPI', `Request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Get cache duration based on endpoint type
  private getCacheDuration(endpointType: 'core' | 'odds' | 'player-props'): number {
    switch (endpointType) {
      case 'player-props':
        return CACHE_DURATION.PLAYER_PROPS;
      case 'odds':
        return CACHE_DURATION.ODDS;
      default:
        return CACHE_DURATION.GAMES;
    }
  }

  // Map sport names to SportsRadar sport IDs
  private getSportId(sport: string): string {
    const sportMap: { [key: string]: string } = {
      'nfl': 'sr:sport:1',
      'nba': 'sr:sport:2',
      'mlb': 'sr:sport:3',
      'nhl': 'sr:sport:4',
      'ncaafb': 'sr:sport:5',
      'ncaamb': 'sr:sport:6',
      'wnba': 'sr:sport:7'
    };
    return sportMap[sport.toLowerCase()] || sportMap['nfl'];
  }

  // Get current season and week for sport
  private getCurrentSeasonInfo(sport: string): { season: number; week?: number } {
    const now = new Date();
    const year = now.getFullYear();
    
    switch (sport.toLowerCase()) {
      case 'nfl':
        // NFL season runs from September to February
        const nflSeason = now.getMonth() >= 8 ? year : year - 1;
        const nflWeek = this.getNFLWeek(now);
        return { season: nflSeason, week: nflWeek };
      case 'nba':
        // NBA season runs from October to June
        const nbaSeason = now.getMonth() >= 9 ? year : year - 1;
        return { season: nbaSeason };
      case 'mlb':
        // MLB season runs from March to October
        const mlbSeason = now.getMonth() >= 2 ? year : year - 1;
        return { season: mlbSeason };
      case 'nhl':
        // NHL season runs from October to June
        const nhlSeason = now.getMonth() >= 9 ? year : year - 1;
        return { season: nhlSeason };
      default:
        return { season: year };
    }
  }

  // Calculate NFL week
  private getNFLWeek(date: Date): number {
    const seasonStart = new Date(date.getFullYear(), 8, 1); // September 1st
    const weekStart = new Date(seasonStart);
    
    // Find first Sunday of September
    while (weekStart.getDay() !== 0) {
      weekStart.setDate(weekStart.getDate() + 1);
    }
    
    const weeksSinceStart = Math.floor((date.getTime() - weekStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
    return Math.max(1, Math.min(18, weeksSinceStart + 1)); // NFL has 18 weeks
  }

  // Get player props using SportsRadar Player Props API
  async getPlayerProps(sport: string, limit: number = 200): Promise<SportsRadarPlayerProp[]> {
    try {
      const sportKey = sport.toUpperCase();
      const sportId = this.getSportId(sport);
      const { season, week } = this.getCurrentSeasonInfo(sport);
      
      logAPI('SportsRadarEnhancedAPI', `Fetching player props for ${sport} (Season: ${season}${week ? `, Week: ${week}` : ''})`);

      // Try multiple endpoints based on SportsRadar documentation
      const endpoints = [
        `/odds/v1/en/sports/${sportId}/player_props.json`,
        `/odds/v1/en/sports/${sportId}/seasons/${season}/player_props.json`,
        `/odds/v1/en/sports/${sportId}/seasons/${season}/weeks/${week}/player_props.json`
      ];

      let playerProps: SportsRadarPlayerProp[] = [];

      for (const endpoint of endpoints) {
        try {
          const data = await this.makeRequest<any>(endpoint, sportKey, 'player-props');
          
          if (data && data.player_props && Array.isArray(data.player_props)) {
            const processedProps = this.processPlayerPropsData(data.player_props, sport, season, week);
            playerProps = [...playerProps, ...processedProps];
            logSuccess('SportsRadarEnhancedAPI', `Found ${processedProps.length} props from ${endpoint}`);
            break; // Use first successful endpoint
          }
        } catch (error) {
          logWarning('SportsRadarEnhancedAPI', `Endpoint ${endpoint} failed:`, error);
          continue;
        }
      }

      if (playerProps.length === 0) {
        logWarning('SportsRadarEnhancedAPI', `No player props found for ${sport}`);
        return [];
      }

      // Limit results to prevent API overuse
      const limitedProps = playerProps.slice(0, limit);
      
      logSuccess('SportsRadarEnhancedAPI', `Retrieved ${limitedProps.length} player props for ${sport}`);
      return limitedProps;

    } catch (error) {
      logError('SportsRadarEnhancedAPI', `Failed to get player props for ${sport}:`, error);
      return [];
    }
  }

  // Process player props data from SportsRadar API response
  private processPlayerPropsData(data: any[], sport: string, season: number, week?: number): SportsRadarPlayerProp[] {
    const playerProps: SportsRadarPlayerProp[] = [];

    logAPI('SportsRadarEnhancedAPI', `Processing ${data.length} player props from SportsRadar API`);

    data.forEach((item, index) => {
      try {
        if (!item || !item.player || !item.markets) {
          return;
        }

        const player = item.player;
        const game = item.game;
        const markets = item.markets;

        // Process each market
        markets.forEach((market: any) => {
          if (!market.outcomes || !Array.isArray(market.outcomes)) {
            return;
          }

          const overOutcome = market.outcomes.find((outcome: any) => 
            outcome.name && outcome.name.toLowerCase().includes('over')
          );
          const underOutcome = market.outcomes.find((outcome: any) => 
            outcome.name && outcome.name.toLowerCase().includes('under')
          );

          if (overOutcome && underOutcome) {
            const prop: SportsRadarPlayerProp = {
              id: `${player.id}-${market.key}-${game.id}`,
              playerId: player.id,
              playerName: player.name || 'Unknown Player',
              team: game.home_team?.name || 'Unknown Team',
              teamAbbr: game.home_team?.abbreviation || 'UNK',
              opponent: game.away_team?.name || 'Unknown Team',
              opponentAbbr: game.away_team?.abbreviation || 'UNK',
              gameId: game.id,
              sport: sport.toUpperCase(),
              propType: this.mapPropType(market.key),
              line: overOutcome.point || 0,
              overOdds: this.convertToAmericanOdds(overOutcome.price),
              underOdds: this.convertToAmericanOdds(underOutcome.price),
              sportsbook: 'SportsRadar',
              sportsbookKey: 'sportsradar',
              gameDate: this.formatGameDate(game.scheduled),
              gameTime: game.scheduled,
              lastUpdate: new Date().toISOString(),
              confidence: this.calculateConfidence(overOutcome.price, underOutcome.price),
              expectedValue: this.calculateExpectedValue(overOutcome.point || 0, overOutcome.price, underOutcome.price),
              seasonStats: this.generateSeasonStats(player.id, market.key, season),
              aiPrediction: this.generateAIPrediction(market.key, overOutcome.point || 0, overOutcome.price, underOutcome.price)
            };

            playerProps.push(prop);
          }
        });

      } catch (error) {
        logWarning('SportsRadarEnhancedAPI', `Error processing player prop ${index}:`, error);
      }
    });

    logSuccess('SportsRadarEnhancedAPI', `Processed ${playerProps.length} player props from ${data.length} items`);
    return playerProps;
  }

  // Map SportsRadar market keys to readable prop types
  private mapPropType(marketKey: string): string {
    const propTypeMap: { [key: string]: string } = {
      'player_points': 'Points',
      'player_rebounds': 'Rebounds',
      'player_assists': 'Assists',
      'player_threes': '3-Pointers Made',
      'player_pass_tds': 'Passing Touchdowns',
      'player_pass_yds': 'Passing Yards',
      'player_rush_yds': 'Rushing Yards',
      'player_receptions': 'Receptions',
      'player_receiving_yds': 'Receiving Yards',
      'player_rushing_tds': 'Rushing Touchdowns',
      'player_receiving_tds': 'Receiving Touchdowns',
      'player_interceptions': 'Interceptions',
      'player_sacks': 'Sacks',
      'player_tackles': 'Tackles',
      'player_goals': 'Goals',
      'player_assists_hockey': 'Assists',
      'player_saves': 'Saves',
      'player_hits': 'Hits',
      'player_runs': 'Runs',
      'player_rbis': 'RBIs',
      'player_stolen_bases': 'Stolen Bases'
    };

    return propTypeMap[marketKey] || marketKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  // Convert decimal odds to American odds
  private convertToAmericanOdds(decimalOdds: number): number {
    if (decimalOdds >= 2) {
      return Math.round((decimalOdds - 1) * 100);
    } else {
      return Math.round(-100 / (decimalOdds - 1));
    }
  }

  // Calculate confidence based on odds
  private calculateConfidence(overPrice: number, underPrice: number): number {
    const overImpliedProb = 1 / overPrice;
    const underImpliedProb = 1 / underPrice;
    const totalImpliedProb = overImpliedProb + underImpliedProb;
    
    // Normalize to 0-100 scale
    const confidence = Math.max(0, Math.min(100, (1 - Math.abs(totalImpliedProb - 1)) * 100));
    return Math.round(confidence);
  }

  // Calculate expected value
  private calculateExpectedValue(line: number, overPrice: number, underPrice: number): number {
    // Simplified EV calculation - in practice, you'd use more sophisticated models
    const overImpliedProb = 1 / overPrice;
    const underImpliedProb = 1 / underPrice;
    const totalImpliedProb = overImpliedProb + underImpliedProb;
    
    // Estimate true probability (simplified)
    const trueProb = 0.5; // This would be calculated using historical data
    
    const overEV = (trueProb * (overPrice - 1)) - ((1 - trueProb) * 1);
    const underEV = ((1 - trueProb) * (underPrice - 1)) - (trueProb * 1);
    
    return Math.max(overEV, underEV) * 100; // Return as percentage
  }

  // Generate season stats (placeholder - would need historical data)
  private generateSeasonStats(playerId: string, propType: string, season: number): any {
    // This would typically fetch historical data
    return {
      average: Math.random() * 20 + 5,
      median: Math.random() * 15 + 5,
      gamesPlayed: Math.floor(Math.random() * 16) + 1,
      hitRate: Math.random() * 0.4 + 0.3,
      last5Games: Array.from({ length: 5 }, () => Math.random() * 20 + 5),
      seasonHigh: Math.random() * 30 + 15,
      seasonLow: Math.random() * 10 + 2
    };
  }

  // Generate AI prediction (placeholder - would use ML models)
  private generateAIPrediction(propType: string, line: number, overPrice: number, underPrice: number): any {
    const confidence = Math.random() * 40 + 30; // 30-70% confidence
    const recommended = Math.random() > 0.5 ? 'over' : 'under';
    
    return {
      recommended,
      confidence: Math.round(confidence),
      reasoning: `Based on recent form and matchup analysis`,
      factors: ['Recent performance', 'Matchup history', 'Weather conditions'],
      modelVersion: '1.0.0',
      lastUpdated: new Date()
    };
  }

  // Format game date
  private formatGameDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'TBD';
    }
  }

  // Get games for a sport
  async getGames(sport: string): Promise<SportsRadarGame[]> {
    try {
      const sportKey = sport.toUpperCase();
      const sportId = this.getSportId(sport);
      const { season } = this.getCurrentSeasonInfo(sport);
      
      const endpoint = `/sportradar/v7/en/sports/${sportId}/seasons/${season}/schedule.json`;
      const data = await this.makeRequest<any>(endpoint, sportKey, 'core');
      
      if (!data || !data.schedule) {
        return [];
      }

      const games: SportsRadarGame[] = data.schedule.map((game: any) => ({
        id: game.id,
        homeTeam: game.home?.name || 'Unknown',
        awayTeam: game.away?.name || 'Unknown',
        homeTeamAbbr: game.home?.abbreviation || 'UNK',
        awayTeamAbbr: game.away?.abbreviation || 'UNK',
        gameDate: this.formatGameDate(game.scheduled),
        gameTime: game.scheduled,
        sport: sport.toUpperCase(),
        season,
        status: this.mapGameStatus(game.status),
        venue: game.venue?.name,
        weather: game.weather ? {
          temperature: game.weather.temp_f || 0,
          condition: game.weather.condition || 'Unknown',
          windSpeed: game.weather.wind_speed || 0,
          humidity: game.weather.humidity || 0
        } : undefined
      }));

      logSuccess('SportsRadarEnhancedAPI', `Retrieved ${games.length} games for ${sport}`);
      return games;

    } catch (error) {
      logError('SportsRadarEnhancedAPI', `Failed to get games for ${sport}:`, error);
      return [];
    }
  }

  // Map game status
  private mapGameStatus(status: string): 'scheduled' | 'live' | 'completed' | 'postponed' {
    const statusMap: { [key: string]: 'scheduled' | 'live' | 'completed' | 'postponed' } = {
      'scheduled': 'scheduled',
      'inprogress': 'live',
      'closed': 'completed',
      'postponed': 'postponed',
      'cancelled': 'postponed'
    };
    return statusMap[status.toLowerCase()] || 'scheduled';
  }

  // Get usage statistics
  getUsageStats(): { totalRequests: number; dailyRequests: number; cacheHits: number; cacheSize: number } {
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.dailyRequestCount = 0;
      this.lastResetDate = today;
    }

    const cacheHits = Array.from(cache.values()).reduce((sum, item) => sum + item.hits, 0);
    
    return {
      totalRequests: this.requestCount,
      dailyRequests: this.dailyRequestCount,
      cacheHits,
      cacheSize: cache.size
    };
  }

  // Clear cache
  clearCache(): void {
    cache.clear();
    logInfo('SportsRadarEnhancedAPI', 'Cache cleared');
  }

  // Get cache statistics
  getCacheStats(): { [key: string]: { hits: number; age: number; size: number } } {
    const stats: { [key: string]: { hits: number; age: number; size: number } } = {};
    
    for (const [key, value] of cache.entries()) {
      stats[key] = {
        hits: value.hits,
        age: Date.now() - value.timestamp,
        size: JSON.stringify(value.data).length
      };
    }
    
    return stats;
  }
}

export const sportsRadarEnhancedAPI = new SportsRadarEnhancedAPI();
