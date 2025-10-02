/**
 * SportsRadar Backend Service
 * 
 * Server-side service for handling SportsRadar API calls with intelligent caching
 * and rate limiting to optimize API usage and provide excellent user experience.
 * 
 * Based on SportsRadar Postman Collection:
 * https://www.postman.com/sportradar-media-apis/sportradar-media-apis/overview
 */

import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';
import { sportsRadarAPI, SportsRadarPlayerProp, SportsRadarGame } from './sportsradar-api';

// Backend configuration
const BACKEND_CONFIG = {
  // Player props limits per sport to balance user experience with API usage
  MAX_PLAYER_PROPS: {
    NFL: 150,    // NFL has many games and players
    NBA: 200,    // NBA has many games and high-scoring players
    MLB: 100,    // MLB has fewer relevant props
    NHL: 120,    // NHL has moderate prop availability
    NCAAFB: 80,  // College football has fewer props
    NCAAMB: 100, // College basketball has moderate props
    WNBA: 60     // WNBA has fewer games
  },
  
  // Cache refresh intervals (in milliseconds)
  CACHE_REFRESH: {
    PLAYER_PROPS: 15 * 60 * 1000,  // 15 minutes
    GAMES: 30 * 60 * 1000,         // 30 minutes
    ODDS: 5 * 60 * 1000,           // 5 minutes
  },
  
  // Rate limiting
  RATE_LIMITS: {
    MAX_DAILY_REQUESTS: 1000,      // Conservative daily limit
    MAX_HOURLY_REQUESTS: 100,      // Hourly limit
    REQUEST_WINDOW: 60 * 60 * 1000 // 1 hour window
  }
};

// Backend cache with enhanced metadata
interface BackendCacheItem {
  data: any;
  timestamp: number;
  hits: number;
  lastAccess: number;
  refreshCount: number;
  sport: string;
  endpoint: string;
}

class SportsRadarBackend {
  private cache = new Map<string, BackendCacheItem>();
  private requestHistory: number[] = [];
  private dailyRequestCount = 0;
  private lastResetDate = new Date().toDateString();

  constructor() {
    logInfo('SportsRadarBackend', 'Backend service initialized');
    logInfo('SportsRadarBackend', `Max props per sport: ${JSON.stringify(BACKEND_CONFIG.MAX_PLAYER_PROPS)}`);
    
    // Start cache cleanup interval
    setInterval(() => this.cleanupCache(), 5 * 60 * 1000); // Every 5 minutes
  }

  // Check if we can make a request based on rate limits
  private canMakeRequest(): boolean {
    const now = Date.now();
    const today = new Date().toDateString();
    
    // Reset daily counter if new day
    if (today !== this.lastResetDate) {
      this.dailyRequestCount = 0;
      this.lastResetDate = today;
    }

    // Check daily limit
    if (this.dailyRequestCount >= BACKEND_CONFIG.RATE_LIMITS.MAX_DAILY_REQUESTS) {
      logWarning('SportsRadarBackend', 'Daily request limit reached');
      return false;
    }

    // Check hourly limit
    const oneHourAgo = now - BACKEND_CONFIG.RATE_LIMITS.REQUEST_WINDOW;
    this.requestHistory = this.requestHistory.filter(time => time > oneHourAgo);
    
    if (this.requestHistory.length >= BACKEND_CONFIG.RATE_LIMITS.MAX_HOURLY_REQUESTS) {
      logWarning('SportsRadarBackend', 'Hourly request limit reached');
      return false;
    }

    return true;
  }

  // Record a request
  private recordRequest(): void {
    const now = Date.now();
    this.requestHistory.push(now);
    this.dailyRequestCount++;
  }

  // Get player props with intelligent caching and filtering
  async getPlayerProps(sport: string, filters?: {
    minConfidence?: number;
    minEV?: number;
    maxOdds?: number;
    minOdds?: number;
    propTypes?: string[];
    sportsbooks?: string[];
  }): Promise<SportsRadarPlayerProp[]> {
    const sportKey = sport.toUpperCase();
    const cacheKey = `player-props-${sportKey}-${JSON.stringify(filters || {})}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      const age = Date.now() - cached.timestamp;
      const maxAge = BACKEND_CONFIG.CACHE_REFRESH.PLAYER_PROPS;
      
      if (age < maxAge) {
        cached.hits++;
        cached.lastAccess = Date.now();
        logAPI('SportsRadarBackend', `Using cached player props for ${sport} (${cached.hits} hits, ${Math.round(age / 1000)}s old)`);
        return this.applyFilters(cached.data, filters);
      }
    }

    // Check rate limits
    if (!this.canMakeRequest()) {
      logWarning('SportsRadarBackend', 'Rate limit exceeded, returning cached data if available');
      if (cached) {
        return this.applyFilters(cached.data, filters);
      }
      return [];
    }

    try {
      // Get max props for this sport
      const maxProps = BACKEND_CONFIG.MAX_PLAYER_PROPS[sportKey as keyof typeof BACKEND_CONFIG.MAX_PLAYER_PROPS] || 100;
      
      logAPI('SportsRadarBackend', `Fetching player props for ${sport} (max: ${maxProps})`);
      
      // Fetch from SportsRadar API
      const playerProps = await sportsRadarEnhancedAPI.getPlayerProps(sport, maxProps);
      
      // Cache the results
      this.cache.set(cacheKey, {
        data: playerProps,
        timestamp: Date.now(),
        hits: 0,
        lastAccess: Date.now(),
        refreshCount: (cached?.refreshCount || 0) + 1,
        sport: sportKey,
        endpoint: 'player-props'
      });

      this.recordRequest();
      
      logSuccess('SportsRadarBackend', `Retrieved ${playerProps.length} player props for ${sport}`);
      
      return this.applyFilters(playerProps, filters);

    } catch (error) {
      logError('SportsRadarBackend', `Failed to get player props for ${sport}:`, error);
      
      // Return cached data if available
      if (cached) {
        logWarning('SportsRadarBackend', 'Returning stale cached data due to API error');
        return this.applyFilters(cached.data, filters);
      }
      
      return [];
    }
  }

  // Apply filters to player props
  private applyFilters(props: SportsRadarPlayerProp[], filters?: {
    minConfidence?: number;
    minEV?: number;
    maxOdds?: number;
    minOdds?: number;
    propTypes?: string[];
    sportsbooks?: string[];
  }): SportsRadarPlayerProp[] {
    if (!filters) return props;

    return props.filter(prop => {
      // Confidence filter
      if (filters.minConfidence && (prop.confidence || 0) < filters.minConfidence) {
        return false;
      }

      // Expected value filter
      if (filters.minEV && (prop.expectedValue || 0) < filters.minEV) {
        return false;
      }

      // Odds range filter
      if (filters.maxOdds && (prop.overOdds > filters.maxOdds || prop.underOdds > filters.maxOdds)) {
        return false;
      }
      if (filters.minOdds && (prop.overOdds < filters.minOdds || prop.underOdds < filters.minOdds)) {
        return false;
      }

      // Prop type filter
      if (filters.propTypes && filters.propTypes.length > 0 && !filters.propTypes.includes(prop.propType)) {
        return false;
      }

      // Sportsbook filter
      if (filters.sportsbooks && filters.sportsbooks.length > 0 && !filters.sportsbooks.includes(prop.sportsbookKey)) {
        return false;
      }

      return true;
    });
  }

  // Get games with caching
  async getGames(sport: string): Promise<SportsRadarGame[]> {
    const sportKey = sport.toUpperCase();
    const cacheKey = `games-${sportKey}`;
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached) {
      const age = Date.now() - cached.timestamp;
      const maxAge = BACKEND_CONFIG.CACHE_REFRESH.GAMES;
      
      if (age < maxAge) {
        cached.hits++;
        cached.lastAccess = Date.now();
        logAPI('SportsRadarBackend', `Using cached games for ${sport} (${cached.hits} hits, ${Math.round(age / 1000)}s old)`);
        return cached.data;
      }
    }

    // Check rate limits
    if (!this.canMakeRequest()) {
      logWarning('SportsRadarBackend', 'Rate limit exceeded, returning cached games if available');
      if (cached) {
        return cached.data;
      }
      return [];
    }

    try {
      logAPI('SportsRadarBackend', `Fetching games for ${sport}`);
      
      const games = await sportsRadarEnhancedAPI.getGames(sport);
      
      // Cache the results
      this.cache.set(cacheKey, {
        data: games,
        timestamp: Date.now(),
        hits: 0,
        lastAccess: Date.now(),
        refreshCount: (cached?.refreshCount || 0) + 1,
        sport: sportKey,
        endpoint: 'games'
      });

      this.recordRequest();
      
      logSuccess('SportsRadarBackend', `Retrieved ${games.length} games for ${sport}`);
      return games;

    } catch (error) {
      logError('SportsRadarBackend', `Failed to get games for ${sport}:`, error);
      
      if (cached) {
        logWarning('SportsRadarBackend', 'Returning stale cached games due to API error');
        return cached.data;
      }
      
      return [];
    }
  }

  // Get popular prop types for a sport
  async getPopularPropTypes(sport: string): Promise<string[]> {
    const props = await this.getPlayerProps(sport);
    const propTypeCounts = new Map<string, number>();
    
    props.forEach(prop => {
      const count = propTypeCounts.get(prop.propType) || 0;
      propTypeCounts.set(prop.propType, count + 1);
    });
    
    return Array.from(propTypeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([type]) => type);
  }

  // Get available sportsbooks
  async getAvailableSportsbooks(sport: string): Promise<string[]> {
    const props = await this.getPlayerProps(sport);
    const sportsbooks = new Set<string>();
    
    props.forEach(prop => {
      sportsbooks.add(prop.sportsbook);
    });
    
    return Array.from(sportsbooks).sort();
  }

  // Get cache statistics
  getCacheStats(): {
    totalItems: number;
    totalHits: number;
    averageAge: number;
    memoryUsage: number;
    bySport: { [sport: string]: { items: number; hits: number; averageAge: number } };
  } {
    const now = Date.now();
    let totalHits = 0;
    let totalAge = 0;
    let memoryUsage = 0;
    const bySport: { [sport: string]: { items: number; hits: number; averageAge: number } } = {};

    for (const [key, item] of this.cache.entries()) {
      totalHits += item.hits;
      totalAge += (now - item.timestamp);
      memoryUsage += JSON.stringify(item.data).length;
      
      if (!bySport[item.sport]) {
        bySport[item.sport] = { items: 0, hits: 0, averageAge: 0 };
      }
      bySport[item.sport].items++;
      bySport[item.sport].hits += item.hits;
    }

    // Calculate averages
    const totalItems = this.cache.size;
    const averageAge = totalItems > 0 ? totalAge / totalItems : 0;
    
    Object.keys(bySport).forEach(sport => {
      const sportData = bySport[sport];
      sportData.averageAge = sportData.items > 0 ? totalAge / sportData.items : 0;
    });

    return {
      totalItems,
      totalHits,
      averageAge: Math.round(averageAge / 1000), // Convert to seconds
      memoryUsage,
      bySport
    };
  }

  // Get usage statistics
  getUsageStats(): {
    dailyRequests: number;
    hourlyRequests: number;
    totalRequests: number;
    cacheHitRate: number;
    apiStats: any;
  } {
    const now = Date.now();
    const oneHourAgo = now - BACKEND_CONFIG.RATE_LIMITS.REQUEST_WINDOW;
    const hourlyRequests = this.requestHistory.filter(time => time > oneHourAgo).length;
    
    const cacheStats = this.getCacheStats();
    const cacheHitRate = cacheStats.totalHits / (cacheStats.totalHits + this.dailyRequestCount) * 100;
    
    return {
      dailyRequests: this.dailyRequestCount,
      hourlyRequests,
      totalRequests: this.requestHistory.length,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      apiStats: sportsRadarEnhancedAPI.getUsageStats()
    };
  }

  // Clean up old cache entries
  private cleanupCache(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    let cleaned = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > maxAge) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logInfo('SportsRadarBackend', `Cleaned up ${cleaned} old cache entries`);
    }
  }

  // Clear all cache
  clearCache(): void {
    this.cache.clear();
    logInfo('SportsRadarBackend', 'All cache cleared');
  }

  // Preload data for better user experience
  async preloadData(sports: string[]): Promise<void> {
    logAPI('SportsRadarBackend', `Preloading data for sports: ${sports.join(', ')}`);
    
    const promises = sports.map(async (sport) => {
      try {
        await this.getPlayerProps(sport);
        await this.getGames(sport);
        logSuccess('SportsRadarBackend', `Preloaded data for ${sport}`);
      } catch (error) {
        logError('SportsRadarBackend', `Failed to preload data for ${sport}:`, error);
      }
    });

    await Promise.all(promises);
    logSuccess('SportsRadarBackend', 'Preloading completed');
  }
}

export const sportsRadarBackend = new SportsRadarBackend();
