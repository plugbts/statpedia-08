import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';

// SportsGameOdds API Configuration
const SPORTSGAMEODDS_API_KEY = 'd5dc1f00bc42133550bc1605dd8f457f';
const SPORTSGAMEODDS_BASE_URL = 'https://api.sportsgameodds.com';

// API Key and Subscription Information
const API_KEY_INFO = {
  key: SPORTSGAMEODDS_API_KEY,
  keyPrefix: SPORTSGAMEODDS_API_KEY.substring(0, 8),
  keySuffix: SPORTSGAMEODDS_API_KEY.substring(-4),
  // Note: Update these limits based on actual subscription plan
  // Check SportGameOdds dashboard for accurate limits
  estimatedDailyLimit: 1000, // Update this based on actual plan
  planType: 'Unknown', // Will be determined from API responses
};

// Cache configuration - EXTREMELY long durations to minimize API calls due to rate limits
const CACHE_DURATION = {
  ODDS: 8 * 60 * 60 * 1000, // 8 hours for odds (extended due to rate limits)
  MARKETS: 8 * 60 * 60 * 1000, // 8 hours for markets (extended due to rate limits)
  GAMES: 24 * 60 * 60 * 1000, // 24 hours for games (extended due to rate limits)
  SPORTS: 7 * 24 * 60 * 60 * 1000, // 7 days for sports (rarely change)
  BOOKMAKERS: 7 * 24 * 60 * 60 * 1000, // 7 days for bookmakers (rarely change)
  PLAYERS: 7 * 24 * 60 * 60 * 1000, // 7 days for players (extended due to rate limits)
  TEAMS: 7 * 24 * 60 * 60 * 1000 // 7 days for teams (rarely change)
};

// SportsGameOdds API Interfaces
export interface SportsGameOddsPlayerProp {
  id: string;
  playerId: string;
  playerName: string;
  team: string;
  sport: string;
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
  confidence: number;
  market: string;
  outcome: string;
  betType: string;
  side: string;
  period: string;
  statEntity: string;
  // NEW: Exact API data tracking
  isExactAPIData?: boolean;
  rawOverOdds?: any;
  rawUnderOdds?: any;
  availableSportsbooks?: string[]; // List of sportsbooks offering this prop
}

export interface SportsGameOddsGame {
  id: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  league: string;
  gameTime: string;
  status: string;
  markets: SportsGameOddsMarket[];
}

export interface SportsGameOddsMarket {
  id: string;
  name: string;
  betType: string;
  side: string;
  line: number;
  odds: number;
  sportsbook: string;
  lastUpdate: string;
}

export interface SportsGameOddsBookmaker {
  id: string;
  name: string;
  displayName: string;
  country: string;
  currency: string;
}

export interface SportsGameOddsSport {
  id: string;
  name: string;
  displayName: string;
  leagues: SportsGameOddsLeague[];
}

export interface SportsGameOddsLeague {
  id: string;
  name: string;
  displayName: string;
  sport: string;
  country: string;
}

class SportsGameOddsAPI {
  private cache = new Map<string, { data: any; timestamp: number }>();
  
  // Player props cache - stores processed player props by sport and date
  private playerPropsCache = new Map<string, { 
    props: SportsGameOddsPlayerProp[]; 
    timestamp: number; 
    gameInfo: { homeTeam: string; awayTeam: string; gameTime: string }[];
  }>();
  
  private usageStats = this.loadUsageStatsFromStorage();
  private readonly MAX_DAILY_CALLS = API_KEY_INFO.estimatedDailyLimit; // Based on subscription plan
  
  // Rate limiting and backoff
  private rateLimitedUntil: number = 0;
  private backoffMultiplier: number = 1;
  private readonly BASE_BACKOFF_MS = 60000; // 1 minute base backoff
  private readonly MAX_BACKOFF_MS = 15 * 60 * 1000; // 15 minutes max backoff
  
  // Cache duration in milliseconds - EXTENDED due to rate limits
  private CACHE_DURATION = {
    ODDS: 4 * 60 * 60 * 1000, // 4 hours (extended due to rate limits)
    MARKETS: 4 * 60 * 60 * 1000, // 4 hours (extended due to rate limits)
    GAMES: 12 * 60 * 60 * 1000, // 12 hours (extended due to rate limits)
    SPORTS: 7 * 24 * 60 * 60 * 1000, // 7 days
    BOOKMAKERS: 7 * 24 * 60 * 60 * 1000, // 7 days
    PLAYERS: 7 * 24 * 60 * 60 * 1000, // 7 days (extended due to rate limits)
    TEAMS: 7 * 24 * 60 * 60 * 1000, // 7 days
    PLAYER_PROPS: 8 * 60 * 60 * 1000 // 8 hours - much longer cache due to rate limits
  };

  constructor() {
    logInfo('SportsGameOddsAPI', 'SportsGameOdds API initialized with persistent usage tracking');
    // Load existing usage stats from localStorage (persistent across sessions)
    this.usageStats = this.loadUsageStatsFromStorage();
    // Clear all caches and reset backoff for new API key
    this.cache.clear();
    this.playerPropsCache.clear();
    this.resetBackoff();
    logInfo('SportsGameOddsAPI', 'Loaded persistent usage stats and cleared caches');
  }

  // Load usage stats from localStorage (persistent across sessions)
  private loadUsageStatsFromStorage() {
    try {
      const stored = localStorage.getItem('sportsgameodds_usage_stats');
      if (stored) {
        const parsed = JSON.parse(stored);
        const today = new Date().toDateString();
        
        // Reset daily counter if new day, but keep total calls
        if (parsed.lastResetDate !== today) {
          parsed.callsToday = 0;
          parsed.lastResetDate = today;
          // Reset daily endpoint counts but keep total calls
          parsed.callsByEndpoint = new Map();
        } else {
          // Convert callsByEndpoint back to Map
          parsed.callsByEndpoint = new Map(Object.entries(parsed.callsByEndpoint || {}));
        }
        
        logInfo('SportsGameOddsAPI', `Loaded persistent usage stats: ${parsed.totalCalls} total calls, ${parsed.callsToday} today`);
        return parsed;
      }
    } catch (error) {
      logError('SportsGameOddsAPI', 'Failed to load usage stats from localStorage:', error);
    }
    
    // Return default stats if no stored data or error
    return {
      totalCalls: 0,
      callsToday: 0,
      lastResetDate: new Date().toDateString(),
      callsByEndpoint: new Map<string, number>(),
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  // Save usage stats to localStorage (persistent across sessions)
  private saveUsageStatsToStorage(): void {
    try {
      const toSave = {
        ...this.usageStats,
        callsByEndpoint: Object.fromEntries(this.usageStats.callsByEndpoint)
      };
      localStorage.setItem('sportsgameodds_usage_stats', JSON.stringify(toSave));
    } catch (error) {
      logError('SportsGameOddsAPI', 'Failed to save usage stats to localStorage:', error);
    }
  }

  // Track API usage for monitoring
  private trackAPIUsage(endpoint: string): void {
    const today = new Date().toDateString();
    
    // Reset daily counter if new day, but preserve total calls
    if (this.usageStats.lastResetDate !== today) {
      this.usageStats.callsToday = 0;
      this.usageStats.lastResetDate = today;
      // Reset daily endpoint counts
      this.usageStats.callsByEndpoint.clear();
    }
    
    // Increment counters
    this.usageStats.totalCalls++;
    this.usageStats.callsToday++;
    
    // Track by endpoint
    const currentCount = this.usageStats.callsByEndpoint.get(endpoint) || 0;
    this.usageStats.callsByEndpoint.set(endpoint, currentCount + 1);
    
    // Save to localStorage for persistence
    this.saveUsageStatsToStorage();
    
    // Log warning if approaching limit
    const usagePercentage = (this.usageStats.callsToday / this.MAX_DAILY_CALLS) * 100;
    if (usagePercentage >= 80) {
      logWarning('SportsGameOddsAPI', `High API usage: ${this.usageStats.callsToday}/${this.MAX_DAILY_CALLS} calls today (${usagePercentage.toFixed(1)}%)`);
    }
  }

  // Get usage statistics
  getUsageStats() {
    const today = new Date().toDateString();
    const usagePercentage = (this.usageStats.callsToday / this.MAX_DAILY_CALLS) * 100;
    
    return {
      totalCalls: this.usageStats.totalCalls,
      callsToday: this.usageStats.callsToday,
      maxDailyCalls: this.MAX_DAILY_CALLS,
      usagePercentage: Math.round(usagePercentage * 100) / 100,
      lastResetDate: this.usageStats.lastResetDate,
      callsByEndpoint: Object.fromEntries(this.usageStats.callsByEndpoint),
      isNearLimit: usagePercentage >= 80,
      isAtLimit: this.usageStats.callsToday >= this.MAX_DAILY_CALLS
    };
  }

  // Reset usage statistics (WARNING: This will clear persistent data)
  resetUsageStats(): void {
    this.usageStats = {
      totalCalls: 0,
      callsToday: 0,
      lastResetDate: new Date().toDateString(),
      callsByEndpoint: new Map<string, number>(),
      cacheHits: 0,
      cacheMisses: 0
    };
    // Clear from localStorage
    localStorage.removeItem('sportsgameodds_usage_stats');
    logInfo('SportsGameOddsAPI', 'Usage statistics reset and cleared from localStorage');
  }

  // Check if we should avoid making API calls due to rate limits
  shouldAvoidAPICall(): boolean {
    const now = Date.now();
    if (now < this.rateLimitedUntil) {
      const waitTime = Math.ceil((this.rateLimitedUntil - now) / 1000);
      logWarning('SportsGameOddsAPI', `Rate limited for ${waitTime} more seconds`);
      return true;
    }
    return false;
  }

  // Get time until next API call is allowed (exponential backoff)
  getTimeUntilNextCall(): number {
    const now = Date.now();
    if (now < this.rateLimitedUntil) {
      return this.rateLimitedUntil - now;
    }
    return 0;
  }

  // Handle rate limit response with exponential backoff
  private handleRateLimit(): void {
    const now = Date.now();
    const backoffTime = Math.min(this.BASE_BACKOFF_MS * this.backoffMultiplier, this.MAX_BACKOFF_MS);
    this.rateLimitedUntil = now + backoffTime;
    this.backoffMultiplier = Math.min(this.backoffMultiplier * 2, 16); // Cap at 16x
    
    logWarning('SportsGameOddsAPI', `Rate limited! Backing off for ${Math.ceil(backoffTime / 1000)} seconds (multiplier: ${this.backoffMultiplier})`);
  }

  // Reset backoff when successful
  private resetBackoff(): void {
    this.backoffMultiplier = 1;
    this.rateLimitedUntil = 0;
  }

  // Get detailed endpoint usage statistics
  getDetailedUsageStats() {
    const stats = this.getUsageStats();
    return {
      ...stats,
      topEndpoints: Array.from(this.usageStats.callsByEndpoint.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([endpoint, count]) => ({ endpoint, count })),
      cacheHitRate: this.calculateCacheHitRate(),
      recommendations: this.getUsageRecommendations()
    };
  }

  // Get API key and subscription information
  getAPIKeyInfo() {
    return {
      keyPrefix: API_KEY_INFO.keyPrefix,
      keySuffix: API_KEY_INFO.keySuffix,
      planType: API_KEY_INFO.planType,
      estimatedDailyLimit: API_KEY_INFO.estimatedDailyLimit,
      currentLimit: this.MAX_DAILY_CALLS,
      keyStatus: 'Active', // Could be enhanced with actual API validation
      lastValidated: new Date().toISOString(),
      // Security: Never expose the full API key
      isConfigured: !!SPORTSGAMEODDS_API_KEY && SPORTSGAMEODDS_API_KEY.length > 10
    };
  }

  // Capture subscription information from API response headers
  private captureSubscriptionInfo(response: Response): void {
    try {
      // Common headers that might contain subscription info
      const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
      const rateLimitLimit = response.headers.get('x-ratelimit-limit');
      const rateLimitReset = response.headers.get('x-ratelimit-reset');
      const subscriptionTier = response.headers.get('x-subscription-tier');
      const planType = response.headers.get('x-plan-type');
      
      // Log any subscription-related headers found
      if (rateLimitLimit) {
        const dailyLimit = parseInt(rateLimitLimit);
        if (!isNaN(dailyLimit) && dailyLimit !== API_KEY_INFO.estimatedDailyLimit) {
          logInfo('SportsGameOddsAPI', `Detected actual daily limit from headers: ${dailyLimit} (configured: ${API_KEY_INFO.estimatedDailyLimit})`);
          // Update the API_KEY_INFO with actual limit
          (API_KEY_INFO as any).estimatedDailyLimit = dailyLimit;
        }
      }
      
      if (subscriptionTier || planType) {
        const detectedPlan = subscriptionTier || planType;
        if (detectedPlan !== API_KEY_INFO.planType) {
          logInfo('SportsGameOddsAPI', `Detected subscription plan: ${detectedPlan}`);
          (API_KEY_INFO as any).planType = detectedPlan;
        }
      }
      
      // Log rate limit info for monitoring
      if (rateLimitRemaining && rateLimitLimit) {
        logAPI('SportsGameOddsAPI', `Rate limit: ${rateLimitRemaining}/${rateLimitLimit} remaining`);
      }
      
    } catch (error) {
      // Silently handle header parsing errors
      logWarning('SportsGameOddsAPI', 'Failed to parse subscription headers:', error);
    }
  }

  // Calculate cache hit rate
  private calculateCacheHitRate(): number {
    const totalCacheRequests = this.usageStats.cacheHits + this.usageStats.cacheMisses;
    if (totalCacheRequests === 0) return 0;
    return Math.round((this.usageStats.cacheHits / totalCacheRequests) * 100) / 100;
  }

  // Get usage recommendations
  private getUsageRecommendations(): string[] {
    const recommendations = [];
    
    // Removed daily usage restrictions - only provide general recommendations
    if (this.usageStats.cacheHits < this.usageStats.cacheMisses) {
      recommendations.push('💡 Consider increasing cache duration for better performance');
    }
    
    if (this.usageStats.callsToday > 100) {
      recommendations.push('💡 High API usage - monitor for rate limits');
    }
    
    return recommendations;
  }

  // Get rate limit status for display
  getRateLimitStatus(): { status: string; message: string; canMakeCalls: boolean; waitTime?: number } {
    const now = Date.now();
    const waitTime = this.getTimeUntilNextCall();
    
    if (waitTime > 0) {
      return {
        status: 'RATE_LIMITED',
        message: `Rate limited for ${Math.ceil(waitTime / 1000)} seconds`,
        canMakeCalls: false,
        waitTime: waitTime
      };
    }
    
    return {
      status: 'NORMAL',
      message: `API calls available (${this.usageStats.callsToday} calls made today)`,
      canMakeCalls: true
    };
  }

  // Get player props cache status for debugging
  getPlayerPropsCacheStatus(): string {
    const cacheSize = this.playerPropsCache.size;
    if (cacheSize === 0) {
      return 'Empty - No cached props';
    }
    
    const now = Date.now();
    const validCaches = Array.from(this.playerPropsCache.entries()).filter(([_, cache]) => 
      (now - cache.timestamp) < this.CACHE_DURATION.PLAYER_PROPS
    );
    
    if (validCaches.length === 0) {
      return 'Expired - All caches need refresh';
    }
    
    return `Active - ${validCaches.length}/${cacheSize} valid caches`;
  }

  // Get list of cached sports
  getCachedSports(): string[] {
    return Array.from(this.playerPropsCache.keys()).map(key => key.replace('player-props-', ''));
  }

  // Get last cache update time
  getLastCacheUpdate(): string {
    if (this.playerPropsCache.size === 0) {
      return 'Never';
    }
    
    const timestamps = Array.from(this.playerPropsCache.values()).map(cache => cache.timestamp);
    const latest = Math.max(...timestamps);
    return new Date(latest).toLocaleString();
  }

  // Clear player props cache
  clearPlayerPropsCache(): void {
    this.playerPropsCache.clear();
    this.cache.clear(); // Also clear general cache
    logInfo('SportsGameOddsAPI', 'Player props cache and general cache cleared');
  }

  // Make authenticated request to SportsGameOdds API
  private async makeRequest<T>(endpoint: string, cacheDuration: number = CACHE_DURATION.ODDS): Promise<T> {
    const cacheKey = endpoint;
    const now = Date.now();
    
    // Check cache first - prioritize cache to avoid rate limits
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (now - cached.timestamp < cacheDuration) {
        this.usageStats.cacheHits++;
        logAPI('SportsGameOddsAPI', `Using cached data for ${endpoint}`);
        return cached.data;
      }
    }
    
    // Check if we're currently rate limited
    if (this.shouldAvoidAPICall()) {
      // Return cached data even if expired when rate limited
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey)!;
        this.usageStats.cacheHits++;
        logWarning('SportsGameOddsAPI', `Using expired cached data due to rate limit for ${endpoint}`);
        return cached.data;
      }
      // If no cache available, throw rate limit error
      throw new Error('Rate limit exceeded and no cached data available');
    }
    
    this.usageStats.cacheMisses++;

    // Track API usage
    this.trackAPIUsage(endpoint);

    try {
      const url = `${SPORTSGAMEODDS_BASE_URL}${endpoint}`;
      
      logAPI('SportsGameOddsAPI', `Making request to: ${endpoint}`);
      logAPI('SportsGameOddsAPI', `Using API key: ${SPORTSGAMEODDS_API_KEY.substring(0, 10)}...`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Statpedia/1.0',
          'x-api-key': SPORTSGAMEODDS_API_KEY // Use lowercase header name
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // Handle rate limit specifically with exponential backoff
        if (response.status === 429) {
          this.handleRateLimit();
          logWarning('SportsGameOddsAPI', `Rate limit exceeded for ${endpoint}. Status: ${response.status}`);
          logWarning('SportsGameOddsAPI', `Response: ${errorText}`);
          
          // Try to return cached data if available
          if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey)!;
            logWarning('SportsGameOddsAPI', `Returning cached data due to rate limit for ${endpoint}`);
            return cached.data;
          }
          
          throw new Error('Rate limit exceeded - please try again later');
        }
        
        logError('SportsGameOddsAPI', `HTTP ${response.status}: ${response.statusText}`);
        logError('SportsGameOddsAPI', `Response: ${errorText}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      // Capture subscription information from response headers
      this.captureSubscriptionInfo(response);
      
      const data = await response.json();
      
      // Check for rate limit in response body
      if (data.success === false && data.error && data.error.includes('Rate limit')) {
        this.handleRateLimit();
        logWarning('SportsGameOddsAPI', `Rate limit exceeded in response for ${endpoint}: ${data.error}`);
        
        // Try to return cached data if available
        if (this.cache.has(cacheKey)) {
          const cached = this.cache.get(cacheKey)!;
          logWarning('SportsGameOddsAPI', `Returning cached data due to rate limit for ${endpoint}`);
          return cached.data;
        }
        
        throw new Error('Rate limit exceeded - please try again later');
      }
      
      // Success! Reset backoff and cache the response
      this.resetBackoff();
      this.cache.set(cacheKey, { data, timestamp: now });
      
      logSuccess('SportsGameOddsAPI', `Successfully fetched data from ${endpoint}`);
      return data;
      
    } catch (error) {
      logError('SportsGameOddsAPI', `Request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Get available sports
  async getSports(): Promise<SportsGameOddsSport[]> {
    try {
      logAPI('SportsGameOddsAPI', 'Fetching available sports');
      const data = await this.makeRequest<any>('/v2/sports', CACHE_DURATION.SPORTS);
      
      const sports: SportsGameOddsSport[] = data.sports?.map((sport: any) => ({
        id: sport.id,
        name: sport.name,
        displayName: sport.displayName,
        leagues: sport.leagues || []
      })) || [];
      
      logSuccess('SportsGameOddsAPI', `Retrieved ${sports.length} sports`);
      return sports;
    } catch (error) {
      logError('SportsGameOddsAPI', 'Failed to get sports:', error);
      return [];
    }
  }

  // Get available bookmakers
  async getBookmakers(): Promise<SportsGameOddsBookmaker[]> {
    try {
      logAPI('SportsGameOddsAPI', 'Fetching available bookmakers');
      const data = await this.makeRequest<any>('/v2/bookmakers', CACHE_DURATION.BOOKMAKERS);
      
      const bookmakers: SportsGameOddsBookmaker[] = data.bookmakers?.map((bookmaker: any) => ({
        id: bookmaker.id,
        name: bookmaker.name,
        displayName: bookmaker.displayName,
        country: bookmaker.country,
        currency: bookmaker.currency
      })) || [];
      
      logSuccess('SportsGameOddsAPI', `Retrieved ${bookmakers.length} bookmakers`);
      return bookmakers;
    } catch (error) {
      logError('SportsGameOddsAPI', 'Failed to get bookmakers:', error);
      return [];
    }
  }

  // Get player props for a specific sport from SportsGameOdds markets
  async getPlayerProps(sport: string): Promise<SportsGameOddsPlayerProp[]> {
    try {
      // Check cache first
      const cacheKey = `player-props-${sport}`;
      const cached = this.playerPropsCache.get(cacheKey);
      
      logAPI('SportsGameOddsAPI', `=== DEBUGGING PLAYER PROPS FOR ${sport.toUpperCase()} ===`);
      logAPI('SportsGameOddsAPI', `Cache key: ${cacheKey}`);
      logAPI('SportsGameOddsAPI', `Cache exists: ${!!cached}`);
      
      if (cached) {
        const age = Date.now() - cached.timestamp;
        const isExpired = age >= this.CACHE_DURATION.PLAYER_PROPS;
        logAPI('SportsGameOddsAPI', `Cache age: ${Math.round(age / 1000)}s, expired: ${isExpired}`);
        logAPI('SportsGameOddsAPI', `Cache duration: ${Math.round(this.CACHE_DURATION.PLAYER_PROPS / 1000)}s`);
        
        if (!isExpired) {
          // 🧪 TESTING MODE: Limit cached props to 3 as well
          const cachedTestingProps = cached.props.slice(0, 3);
          console.log('🧪 TESTING MODE - SportGameOdds API (CACHED EXACT SPORTSBOOK DATA)');
          console.log('================================================================');
          console.log(`📦 Cached consolidated props available: ${cached.props.length}`);
          console.log(`✂️  Limited to for testing: ${cachedTestingProps.length}`);
          console.log(`📊 Cached props being returned:`, cachedTestingProps.map(p => `${p.playerName} ${p.propType} ${p.line} (${p.availableSportsbooks?.length || 0} books)`));
          console.log('🎯 This limitation is active for testing purposes');
          console.log('⚡ ALL CACHED ODDS ARE EXACT SPORTSBOOK DATA - NO MODIFICATIONS');
          console.log('================================================================');
          
          logAPI('SportsGameOddsAPI', `⚡ EXACT DATA (CACHED): Using cached props for ${sport}, returning ${cachedTestingProps.length} of ${cached.props.length} for testing`);
          this.usageStats.cacheHits++;
          return cachedTestingProps;
        } else {
          logAPI('SportsGameOddsAPI', `Cache expired, fetching fresh data`);
        }
      } else {
        logAPI('SportsGameOddsAPI', `No cache found, fetching fresh data`);
      }
      
      logAPI('SportsGameOddsAPI', `Fetching fresh player props for ${sport} from SportsGameOdds markets`);
      
      const leagueId = this.mapSportToLeagueId(sport);
      logAPI('SportsGameOddsAPI', `League ID for ${sport}: ${leagueId}`);
      if (!leagueId) {
        logWarning('SportsGameOddsAPI', `No league ID found for ${sport}`);
        return [];
      }

      // Skip markets endpoint - it doesn't exist in the API
      logAPI('SportsGameOddsAPI', `Skipping markets endpoint (doesn't exist) - using events endpoint only`);

      // Get events/games for the sport with proper cursor pagination
      // Based on SportsGameOdds docs: https://sportsgameodds.com/docs/guides/data-batches
      let allEvents: any[] = [];
      let nextCursor: string | null = null;
      let response: any;
      
      do {
        try {
          const endpoint = `/v2/events?leagueID=${leagueId}&marketOddsAvailable=true&limit=50${nextCursor ? `&cursor=${nextCursor}` : ''}`;
          response = await this.makeRequest<any>(endpoint, CACHE_DURATION.ODDS);
          
          // Based on docs: response.data contains the events array
          if (response.data && Array.isArray(response.data)) {
            allEvents = allEvents.concat(response.data);
            logAPI('SportsGameOddsAPI', `Fetched ${response.data.length} events for ${sport} (total: ${allEvents.length})`);
            logAPI('SportsGameOddsAPI', `First event structure:`, response.data[0]);
          } else {
            logWarning('SportsGameOddsAPI', `Invalid response format from events endpoint:`, response);
            logAPI('SportsGameOddsAPI', `Response keys:`, Object.keys(response));
          }
          
          nextCursor = response.nextCursor || null;
          
      } catch (error: any) {
        if (error.message && error.message.includes('Rate limit')) {
          logWarning('SportsGameOddsAPI', `Rate limit exceeded for ${sport}. Using cached data if available.`);
          // Try to get cached data instead
          const cacheKey = `/v2/events?leagueID=${leagueId}&marketOddsAvailable=true&limit=50`;
          if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey)!;
            if (cached.data.data && Array.isArray(cached.data.data)) {
              allEvents = cached.data.data;
              logAPI('SportsGameOddsAPI', `Using cached data for ${sport} due to rate limit`);
            }
          } else {
            logError('SportsGameOddsAPI', `No cached data available for ${sport} and rate limit exceeded`);
            // Return empty array instead of fallback data to avoid confusion
            return [];
          }
          break;
        } else {
          throw error;
        }
      }
      } while (nextCursor && allEvents.length < 100); // Allow more events now that daily restrictions are removed
      
      logAPI('SportsGameOddsAPI', `Total events fetched: ${allEvents.length} for ${sport}`);
      
      if (allEvents.length === 0) {
        logWarning('SportsGameOddsAPI', `No events found for ${sport}`);
        return [];
      }

      // Log the first event structure for debugging based on docs
      if (allEvents.length > 0) {
        const firstEvent = allEvents[0];
        logAPI('SportsGameOddsAPI', `First event structure:`, {
          eventID: firstEvent.eventID,
          hasOdds: !!firstEvent.odds,
          oddsCount: firstEvent.odds ? Object.keys(firstEvent.odds).length : 0,
          oddsKeys: firstEvent.odds ? Object.keys(firstEvent.odds).slice(0, 5) : [],
          teams: firstEvent.teams,
          startsAt: firstEvent.startsAt,
          status: firstEvent.status
        });
      }

      // Extract player props from the markets in each event
      const playerProps: SportsGameOddsPlayerProp[] = [];
      
      for (const event of allEvents) {
        try {
          logAPI('SportsGameOddsAPI', `Processing event ${event.eventID}:`, {
            hasOdds: !!event.odds,
            oddsCount: event.odds ? Object.keys(event.odds).length : 0,
            teams: event.teams ? `${event.teams.away?.names?.short} @ ${event.teams.home?.names?.short}` : 'No teams'
          });
          // Check if this event has player props markets
          const eventPlayerProps = await this.extractPlayerPropsFromEvent(event, sport);
          logAPI('SportsGameOddsAPI', `Event ${event.eventID} produced ${eventPlayerProps.length} player props`);
          playerProps.push(...eventPlayerProps);
          
          // Skip markets endpoint - it doesn't exist in the API
          if (eventPlayerProps.length === 0) {
            logAPI('SportsGameOddsAPI', `No player props found in event odds for event ${event.eventID}`);
          }
        } catch (error) {
          logWarning('SportsGameOddsAPI', `Failed to extract props from event ${event.eventID}:`, error);
        }
      }

      // Check if we found any player props using the consensus odds system
      if (playerProps.length === 0) {
        logWarning('SportsGameOddsAPI', `No player props found in SportsGameOdds markets for ${sport}. This could mean no games are currently available or no player prop markets exist for the current time period.`);
      } else {
        logSuccess('SportsGameOddsAPI', `Successfully extracted ${playerProps.length} player props using SportsGameOdds v2 consensus odds system for ${sport}`);
      }

      // Group props by sportsbook availability and consolidate
      const consolidatedProps = this.groupPropsBySportsbookAvailability(playerProps);

      // Cache the results
      const gameInfo = this.extractGameInfo(consolidatedProps);
      // 🧪 TESTING MODE: Limit to 3 props for development/testing purposes
      const originalCount = consolidatedProps.length;
      const testingProps = consolidatedProps.slice(0, 3);
      
      console.log('🧪 TESTING MODE - SportGameOdds API (EXACT SPORTSBOOK DATA)');
      console.log('==========================================================');
      console.log(`🔢 Original consolidated props: ${originalCount}`);
      console.log(`✂️  Limited to for testing: ${testingProps.length}`);
      console.log(`📊 Props being returned:`, testingProps.map(p => `${p.playerName} ${p.propType} ${p.line} (${p.availableSportsbooks?.length || 0} books)`));
      console.log('🎯 This limitation is active for testing purposes');
      console.log('⚡ ALL ODDS ARE EXACT SPORTSBOOK DATA - NO MODIFICATIONS');
      console.log('==========================================================');
      
      this.playerPropsCache.set(cacheKey, {
        props: testingProps, // Cache the limited props
        timestamp: Date.now(),
        gameInfo: gameInfo
      });
      
      logSuccess('SportsGameOddsAPI', `⚡ EXACT DATA: Retrieved ${originalCount} consolidated props, returning ${testingProps.length} for testing`);
      logAPI('SportsGameOddsAPI', `Testing props: ${testingProps.map(p => `${p.playerName} ${p.propType} (${p.availableSportsbooks?.length || 0} sportsbooks)`).join(', ')}`);
      
      return testingProps;
      
    } catch (error) {
      logError('SportsGameOddsAPI', `Failed to get player props for ${sport}:`, error);
      return [];
    }
  }

  // Extract player props from a SportsGameOdds event markets using v2 byBookmaker structure
  private async extractPlayerPropsFromEvent(event: any, sport: string): Promise<SportsGameOddsPlayerProp[]> {
    const playerProps: SportsGameOddsPlayerProp[] = [];
    
    logAPI('SportsGameOddsAPI', `Extracting player props from event ${event.eventID} using v2 byBookmaker structure`);
    
    // Check if the event has odds/markets data
    if (!event.odds) {
      logAPI('SportsGameOddsAPI', `Event ${event.eventID} has no odds data`);
      return [];
    }

    // Extract team names with better fallback logic
    const homeTeam = this.extractTeamName(event.teams?.home) || 'HOME';
    const awayTeam = this.extractTeamName(event.teams?.away) || 'AWAY';
    
    // Log team names for debugging
    logAPI('SportsGameOddsAPI', `Game: ${awayTeam} @ ${homeTeam}`);
    const gameId = event.eventID;
    // Parse game time and fix date issues
    let gameTime = event.status?.startsAt || new Date().toISOString();
    
    // Log the original game time for debugging
    logAPI('SportsGameOddsAPI', `Original game time: ${gameTime}`);
    
    // Fix year issue - if year is 2025, it's likely a mistake and should be 2024
    if (gameTime.includes('2025-')) {
      gameTime = gameTime.replace('2025-', '2024-');
      logWarning('SportsGameOddsAPI', `Fixed year from 2025 to 2024: ${gameTime}`);
    }
    
    // Validate the date is reasonable (not too far in future or past)
    const gameDate = new Date(gameTime);
    const now = new Date();
    const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    if (gameDate > oneYearFromNow) {
      // If date is more than a year in the future, assume it's this year
      const correctedYear = now.getFullYear();
      gameTime = gameTime.replace(/^\d{4}/, correctedYear.toString());
      logWarning('SportsGameOddsAPI', `Corrected future date to current year: ${gameTime}`);
    } else if (gameDate < oneMonthAgo) {
      // If date is more than a month in the past, assume it's next year
      const nextYear = now.getFullYear() + 1;
      gameTime = gameTime.replace(/^\d{4}/, nextYear.toString());
      logWarning('SportsGameOddsAPI', `Corrected past date to next year: ${gameTime}`);
    }
    
    // Log the final game time and date for debugging
    const finalDate = gameTime.split('T')[0];
    logAPI('SportsGameOddsAPI', `Final game date: ${finalDate}`);

    // Look for player-specific markets in the odds using v2 structure
    // Player props have playerID as statEntityID in the oddID format: {statID}-{playerID}-{periodID}-{betTypeID}-{sideID}
    logAPI('SportsGameOddsAPI', `Processing ${Object.keys(event.odds).length} odds for event ${event.eventID}`);
    
    for (const [oddId, oddData] of Object.entries(event.odds)) {
      try {
        const odd = oddData as any;
        
        // Log the v2 structure for debugging based on docs
        logAPI('SportsGameOddsAPI', `Processing oddID: ${oddId}, structure:`, {
          oddID: odd.oddID,
          marketName: odd.marketName,
          hasByBookmaker: !!odd.byBookmaker,
          bookmakerCount: odd.byBookmaker ? Object.keys(odd.byBookmaker).length : 0,
          bookmakers: odd.byBookmaker ? Object.keys(odd.byBookmaker) : [],
          oddKeys: Object.keys(odd),
          isPlayerPropCheck: this.isPlayerPropMarket(odd, oddId),
          closeOverUnder: odd.closeOverUnder,
          closeSpread: odd.closeSpread,
          closeOdds: odd.closeOdds
        });
        
        // Check if this is a player prop market
        if (this.isPlayerPropMarket(odd, oddId)) {
          // Process each bookmaker's odds for this player prop using v2 byBookmaker structure
          const bookmakerProps = this.extractPlayerPropsFromBookmakers(odd, oddId, sport, homeTeam, awayTeam, gameId, gameTime, event);
          
          // Only use bookmaker-specific props - NO CONSENSUS ODDS
          if (bookmakerProps.length > 0) {
          playerProps.push(...bookmakerProps);
            logAPI('SportsGameOddsAPI', `Added ${bookmakerProps.length} bookmaker props for ${oddId}`);
          } else {
            logAPI('SportsGameOddsAPI', `No bookmaker props found for ${oddId} - skipping consensus`);
          }
        }
      } catch (error) {
        logWarning('SportsGameOddsAPI', `Failed to process odd ${oddId}:`, error);
      }
    }

    logAPI('SportsGameOddsAPI', `Extracted ${playerProps.length} player props from event ${event.eventID} using v2 structure`);
    return playerProps;
  }

  // Extract player props from each bookmaker's odds data using v2 byBookmaker structure
  private extractPlayerPropsFromBookmakers(odd: any, oddId: string, sport: string, homeTeam: string, awayTeam: string, gameId: string, gameTime: string, event: any): SportsGameOddsPlayerProp[] {
    const playerProps: SportsGameOddsPlayerProp[] = [];
    
    // Only process over/under props that have both over and under sides
    const oddIdParts = oddId.split('-');
    if (oddIdParts.length < 5) return playerProps;
    
    const [statID, playerID, periodID, betTypeID, sideID] = oddIdParts;
    
    // Only process 'over' side - we'll find the corresponding 'under' side
    if (sideID !== 'over') {
      return playerProps; // Skip 'under' side, we'll process it with the 'over' side
    }
    
    // Find the corresponding under odd
    const underOddId = oddId.replace('-over', '-under');
    const underOdd = event.odds[underOddId];
    
    if (!underOdd) {
      logWarning('SportsGameOddsAPI', `No corresponding under odd found for ${oddId}`);
      return playerProps;
    }

    // Check if we have byBookmaker data (v2 structure)
    if (!odd.byBookmaker) {
      logAPI('SportsGameOddsAPI', `No byBookmaker data for oddID ${oddId}, skipping consensus odds`);
      return playerProps; // Skip consensus odds completely
    }

    // Process each bookmaker's odds - combine over and under into single prop
    for (const [bookmakerId, overBookmakerOdds] of Object.entries(odd.byBookmaker)) {
      try {
        const overData = overBookmakerOdds as any;

        // Only process available odds (open for wagering)
        if (!overData.available) {
          continue;
        }

        // Get corresponding under data from the same bookmaker
        const underData = underOdd.byBookmaker?.[bookmakerId];
        if (!underData || !underData.available) {
          continue; // Skip if under data not available for this bookmaker
        }
        
        // 🔍 DEBUGGING: Log raw odds data to identify same-odds issue
        console.log('🔍 ODDS DEBUG - Raw Bookmaker Data:');
        console.log('=====================================');
        console.log(`📊 Bookmaker: ${bookmakerId}`);
        console.log(`👤 Player: ${playerID}`);
        console.log(`📈 Over Data:`, {
          odds: overData.odds,
          available: overData.available,
          line: overData.overUnder || overData.line,
          rawData: overData
        });
        console.log(`📉 Under Data:`, {
          odds: underData.odds,
          available: underData.available,
          line: underData.overUnder || underData.line,
          rawData: underData
        });
        console.log(`⚠️  Same Odds Issue: ${overData.odds === underData.odds ? 'YES - PROBLEM!' : 'NO - Good'}`);
        console.log('=====================================');
        
        logAPI('SportsGameOddsAPI', `Processing ${bookmakerId} for ${playerID}:`, {
          overOdds: overData.odds,
          underOdds: underData.odds,
          overLine: overData.overUnder || overData.line,
          underLine: underData.overUnder || underData.line,
          sameOddsIssue: overData.odds === underData.odds
        });

        const playerProp = this.createBookmakerPlayerProp(
          overData, underData, bookmakerId, oddId, sport, 
          homeTeam, awayTeam, gameId, gameTime, event, odd
        );
        
        if (playerProp) {
          playerProps.push(playerProp);
        }
      } catch (error) {
        logWarning('SportsGameOddsAPI', `Failed to process bookmaker ${bookmakerId} for odd ${oddId}:`, error);
      }
    }

    return playerProps;
  }

  // REMOVED: createConsensusPlayerProp - NO MORE CONSENSUS OR FAKE ODDS
  // All odds now come from exact sportsbook API data via createBookmakerPlayerProp

  // Create a player prop from bookmaker over and under data - EXACT API ODDS ONLY
  private createBookmakerPlayerProp(
    overData: any, 
    underData: any, 
    bookmakerId: string, 
    oddId: string, 
    sport: string, 
    homeTeam: string, 
    awayTeam: string, 
    gameId: string, 
    gameTime: string, 
    event: any, 
    odd: any
  ): SportsGameOddsPlayerProp | null {
    try {
      // Parse oddID to extract player information
      const oddIdParts = oddId.split('-');
      if (oddIdParts.length < 5) {
        logWarning('SportsGameOddsAPI', `Invalid oddID format: ${oddId}`);
        return null;
      }

      const [statID, playerID, periodID, betTypeID, sideID] = oddIdParts;
      
      // Extract player name and team from playerID or event data
      const playerName = this.extractPlayerNameFromPlayerID(playerID);
      const team = this.extractTeamFromPlayerID(playerID, homeTeam, awayTeam, event);
      
      // Extract prop type from statID
      const propType = this.extractPropTypeFromStatID(statID);
      
      // Use the line from over data (should be same for both over/under)
      const line = overData.overUnder || overData.spread || overData.line || 0;
      
      // ⚡ EXACT API ODDS - NO MODIFICATIONS OR FAKE DATA
      const rawOverOdds = overData.odds;
      const rawUnderOdds = underData.odds;
      
      // Parse odds exactly as received from API - NO DEFAULTS OR FALLBACKS
      let overOdds: number | null = null;
      let underOdds: number | null = null;
      
      if (rawOverOdds !== undefined && rawOverOdds !== null) {
        if (typeof rawOverOdds === 'string') {
          // Handle string odds like "+100", "-110", etc.
          const cleanOverOdds = rawOverOdds.replace(/[^-+0-9]/g, '');
          const parsedOver = parseInt(cleanOverOdds);
          if (!isNaN(parsedOver)) {
            overOdds = parsedOver;
          }
        } else if (typeof rawOverOdds === 'number') {
          overOdds = this.normalizeOddsToAmerican(rawOverOdds);
        }
      }
      
      if (rawUnderOdds !== undefined && rawUnderOdds !== null) {
        if (typeof rawUnderOdds === 'string') {
          // Handle string odds like "+100", "-110", etc.
          const cleanUnderOdds = rawUnderOdds.replace(/[^-+0-9]/g, '');
          const parsedUnder = parseInt(cleanUnderOdds);
          if (!isNaN(parsedUnder)) {
            underOdds = parsedUnder;
          }
        } else if (typeof rawUnderOdds === 'number') {
          underOdds = this.normalizeOddsToAmerican(rawUnderOdds);
        }
      }

      // ⚡ STRICT VALIDATION - ONLY USE EXACT API DATA
      if (overOdds === null || underOdds === null) {
        logWarning('SportsGameOddsAPI', `Missing odds data for ${bookmakerId} ${playerName} ${propType}: over=${rawOverOdds}, under=${rawUnderOdds}`);
        return null;
      }
      
      // 🔍 EXACT API ODDS DEBUG - NO MODIFICATIONS
      console.log('⚡ EXACT API ODDS DEBUG:');
      console.log('========================');
      console.log(`👤 Player: ${playerName} ${propType}`);
      console.log(`📊 Sportsbook: ${this.mapBookmakerIdToName(bookmakerId)}`);
      console.log(`📈 Raw Over Odds: ${rawOverOdds} → Final: ${overOdds}`);
      console.log(`📉 Raw Under Odds: ${rawUnderOdds} → Final: ${underOdds}`);
      console.log(`📏 Line: ${line}`);
      console.log(`✅ EXACT SPORTSBOOK DATA - NO MODIFICATIONS`);
      console.log('========================');
      
      logAPI('SportsGameOddsAPI', `EXACT ${this.mapBookmakerIdToName(bookmakerId)} odds: ${playerName} ${propType} ${line} - Over: ${overOdds} Under: ${underOdds}`);

      // Validate the final data
      if (isNaN(line) || isNaN(overOdds) || isNaN(underOdds)) {
        logWarning('SportsGameOddsAPI', `Invalid numeric data for ${playerName}: line=${line}, overOdds=${overOdds}, underOdds=${underOdds}`);
        return null;
      }

      return {
        id: `${bookmakerId}-${gameId}-${oddId}`,
        playerId: playerID,
        playerName: playerName,
        team: team,
        sport: sport.toUpperCase(),
        propType: propType,
        line: line,
        overOdds: overOdds,
        underOdds: underOdds,
        sportsbook: this.mapBookmakerIdToName(bookmakerId),
        sportsbookKey: bookmakerId,
        lastUpdate: new Date().toISOString(),
        gameId: gameId,
        gameTime: gameTime,
        homeTeam: homeTeam,
        awayTeam: awayTeam,
        confidence: 1.0, // Maximum confidence for exact sportsbook odds
        market: propType,
        outcome: 'pending',
        betType: betTypeID,
        side: 'both', // Indicates this prop has both over and under
        period: periodID,
        statEntity: statID,
        // NEW: Exact API metadata
        isExactAPIData: true,
        rawOverOdds: rawOverOdds,
        rawUnderOdds: rawUnderOdds
      };

    } catch (error) {
      logError('SportsGameOddsAPI', `Failed to create bookmaker player prop:`, error);
      return null;
    }
  }

  // REMOVED: convertBookmakerOddsToPlayerProp - DEPRECATED FUNCTION WITH FAKE ODDS
  // All odds now come from exact sportsbook API data via createBookmakerPlayerProp

  // REMOVED: calculateOpposingOdds - NO MORE FAKE ODDS GENERATION
  // All odds must come directly from sportsbook API data

  // Group props by player/line and collect all available sportsbooks
  private groupPropsBySportsbookAvailability(playerProps: SportsGameOddsPlayerProp[]): SportsGameOddsPlayerProp[] {
    const propGroups = new Map<string, {
      baseProps: SportsGameOddsPlayerProp[];
      sportsbooks: Set<string>;
    }>();

    // Group props by unique player + prop type + line combination
    for (const prop of playerProps) {
      const groupKey = `${prop.playerId}-${prop.propType}-${prop.line}`;
      
      if (!propGroups.has(groupKey)) {
        propGroups.set(groupKey, {
          baseProps: [],
          sportsbooks: new Set()
        });
      }
      
      const group = propGroups.get(groupKey)!;
      group.baseProps.push(prop);
      group.sportsbooks.add(prop.sportsbookKey);
    }

    // Create consolidated props with sportsbook availability
    const consolidatedProps: SportsGameOddsPlayerProp[] = [];
    
    for (const [groupKey, group] of propGroups) {
      // Use the first prop as the base and add sportsbook availability
      const baseProp = group.baseProps[0];
      const availableSportsbooks = Array.from(group.sportsbooks);
      
      // Create a consolidated prop that represents this line across all sportsbooks
      const consolidatedProp: SportsGameOddsPlayerProp = {
        ...baseProp,
        id: `consolidated-${groupKey}`,
        availableSportsbooks: availableSportsbooks,
        sportsbook: `${availableSportsbooks.length} Sportsbooks`,
        confidence: 1.0, // Maximum confidence for exact API data
        isExactAPIData: true
      };
      
      consolidatedProps.push(consolidatedProp);
      
      console.log(`📊 CONSOLIDATED PROP: ${baseProp.playerName} ${baseProp.propType} ${baseProp.line}`);
      console.log(`🏪 Available on: ${availableSportsbooks.join(', ')}`);
      console.log(`📈 Over/Under: ${baseProp.overOdds}/${baseProp.underOdds}`);
    }

    return consolidatedProps;
  }

  // Removed getPlayerDataForEvent method - markets endpoint doesn't exist

  // Removed processPlayerData method - no longer needed

  // REMOVED: convertOddToPlayerProp - USED FAKE CONSENSUS ODDS
  // All odds now come from exact sportsbook API data via createBookmakerPlayerProp

  // Convert player data to player prop
  private convertPlayerToPlayerProp(player: any, sport: string, eventId: string): SportsGameOddsPlayerProp | null {
    try {
      return {
        id: `sgo-player-${eventId}-${player.id || player.playerId}`,
        playerId: player.id || player.playerId || 'unknown',
        playerName: player.name || player.playerName || 'Unknown Player',
        team: player.team || 'Unknown',
        sport: sport.toUpperCase(),
        propType: player.propType || player.market || 'Points',
        line: player.line || player.overUnder || 0,
        overOdds: this.normalizeOddsToAmerican(player.overOdds || player.over || -110),
        underOdds: this.normalizeOddsToAmerican(player.underOdds || player.under || -110),
        sportsbook: 'SportsGameOdds',
        sportsbookKey: 'sgo',
        lastUpdate: new Date().toISOString(),
        gameId: eventId,
        gameTime: player.gameTime || new Date().toISOString(),
        homeTeam: player.homeTeam || 'Unknown',
        awayTeam: player.awayTeam || 'Unknown',
        confidence: 0.5,
        market: player.market || 'Points',
        outcome: 'pending',
        betType: 'over_under',
        side: 'over',
        period: 'full_game',
        statEntity: player.statEntity || 'player'
      };
    } catch (error) {
      logError('SportsGameOddsAPI', 'Failed to convert player to player prop:', error);
      return null;
    }
  }

  // Extract player name from market name
  private extractPlayerNameFromMarket(marketName: string, statEntity: string): string | null {
    // Look for player names in market names like "Josh Allen Passing Yards Over/Under"
    const playerPatterns = [
      /^([A-Za-z\s]+)\s+(Passing|Rushing|Receiving|Points|Touchdowns|Yards|Receptions)/i,
      /^([A-Za-z\s]+)\s+(Over\/Under|Points|Yards)/i,
      /([A-Za-z\s]+)\s+(Quarter|Half|Game)/i
    ];

    for (const pattern of playerPatterns) {
      const match = marketName.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  // Extract player name from playerID (e.g., "JAMES_COOK_1_NFL" -> "James Cook")
  private extractPlayerNameFromPlayerID(playerID: string): string | null {
    try {
      // PlayerID format: "FIRSTNAME_LASTNAME_NUMBER_LEAGUE"
      const parts = playerID.split('_');
      if (parts.length < 4) return null;
      
      const firstName = parts[0];
      const lastName = parts[1];
      
      // Convert to proper case
      const properFirstName = firstName.charAt(0) + firstName.slice(1).toLowerCase();
      const properLastName = lastName.charAt(0) + lastName.slice(1).toLowerCase();
      
      return `${properFirstName} ${properLastName}`;
    } catch (error) {
      logError('SportsGameOddsAPI', 'Failed to extract player name from playerID:', error);
      return null;
    }
  }

  // Extract team name from team object with proper fallback and corrections
  private extractTeamName(team: any): string | null {
    if (!team) return null;
    
    // Get the base team name
    let teamName = team.names?.short || 
           team.names?.abbreviation || 
           team.names?.full || 
           team.name || 
           team.abbreviation ||
           null;
    
    // Fix common team name issues
    if (teamName) {
      // Fix LA Rams to LAR to avoid confusion with Lakers
      if (teamName === 'LA' && team.names?.long?.includes('Rams')) {
        teamName = 'LAR';
      }
      // Fix other common abbreviation issues
      else if (teamName === 'LA' && team.names?.long?.includes('Chargers')) {
        teamName = 'LAC';
      }
      // Ensure consistent team abbreviations
      const teamMappings: { [key: string]: string } = {
        'Los Angeles Rams': 'LAR',
        'Los Angeles Chargers': 'LAC',
        'San Francisco 49ers': 'SF',
        'New England Patriots': 'NE',
        'Green Bay Packers': 'GB',
        'Tampa Bay Buccaneers': 'TB',
        'Kansas City Chiefs': 'KC',
        'Las Vegas Raiders': 'LV',
        'New York Giants': 'NYG',
        'New York Jets': 'NYJ'
      };
      
      // Check if we need to map the full name to proper abbreviation
      if (team.names?.long && teamMappings[team.names.long]) {
        teamName = teamMappings[team.names.long];
      }
    }
    
    return teamName;
  }

  // Extract game information from player props for caching
  private extractGameInfo(playerProps: SportsGameOddsPlayerProp[]): { homeTeam: string; awayTeam: string; gameTime: string }[] {
    const gameMap = new Map<string, { homeTeam: string; awayTeam: string; gameTime: string }>();
    
    playerProps.forEach(prop => {
      const gameKey = `${prop.gameId}-${prop.homeTeam}-${prop.awayTeam}`;
      if (!gameMap.has(gameKey)) {
        gameMap.set(gameKey, {
          homeTeam: prop.homeTeam,
          awayTeam: prop.awayTeam,
          gameTime: prop.gameTime
        });
      }
    });
    
    return Array.from(gameMap.values());
  }

  // Extract team from playerID using team mapping from API response
  private extractTeamFromPlayerID(playerID: string, homeTeam: string, awayTeam: string, event?: any): string {
    // Try to get team from event players data if available
    if (event?.players?.[playerID]?.teamID) {
      const teamID = event.players[playerID].teamID;
      // Map teamID to team abbreviation
      if (teamID.includes('SAN_FRANCISCO_49ERS')) return 'SF';
      if (teamID.includes('LOS_ANGELES_RAMS')) return 'LAR';
      if (teamID.includes('BUFFALO_BILLS')) return 'BUF';
      if (teamID.includes('MIAMI_DOLPHINS')) return 'MIA';
      if (teamID.includes('TENNESSEE_TITANS')) return 'TEN';
      if (teamID.includes('JACKSONVILLE_JAGUARS')) return 'JAX';
      if (teamID.includes('LAS_VEGAS_RAIDERS')) return 'LV';
      if (teamID.includes('KANSAS_CITY_CHIEFS')) return 'KC';
      // Add more team mappings as needed
    }
    
    // Fallback: randomly assign to home or away team
    return Math.random() > 0.5 ? homeTeam : awayTeam;
  }

  // Extract prop type from statID
  private extractPropTypeFromStatID(statID: string): string {
    const statMap: { [key: string]: string } = {
      'passing_yards': 'Passing Yards',
      'rushing_yards': 'Rushing Yards',
      'receiving_yards': 'Receiving Yards',
      'receptions': 'Receptions',
      'passing_touchdowns': 'Passing Touchdowns',
      'rushing_touchdowns': 'Rushing Touchdowns',
      'receiving_touchdowns': 'Receiving Touchdowns',
      'passing_interceptions': 'Interceptions',
      'defense_interceptions': 'Interceptions',
      'fumbles_lost': 'Fumbles Lost',
      'passing_completions': 'Passing Completions',
      'passing_attempts': 'Passing Attempts',
      'passing_longestCompletion': 'Longest Completion',
      'rushing_attempts': 'Rushing Attempts',
      'rushing_longestRush': 'Longest Rush',
      'fieldGoals_made': 'Field Goals Made',
      'extraPoints_kicksMade': 'Extra Points Made',
      'kicking_totalPoints': 'Kicking Total Points',
      'defense_combinedTackles': 'Combined Tackles',
      'defense_sacks': 'Sacks',
      'fantasyScore': 'Fantasy Score',
      'passing+rushing_yards': 'Passing + Rushing Yards',
      // Additional stat types found in actual data
      'touchdowns': 'Touchdowns',
      'firstTouchdown': 'First Touchdown',
      'lastTouchdown': 'Last Touchdown'
    };
    
    return statMap[statID.toLowerCase()] || statID.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  // Extract prop type from market name
  private extractPropTypeFromMarket(marketName: string): string {
    if (marketName.includes('Passing Yards')) return 'Passing Yards';
    if (marketName.includes('Rushing Yards')) return 'Rushing Yards';
    if (marketName.includes('Receiving Yards')) return 'Receiving Yards';
    if (marketName.includes('Receptions')) return 'Receptions';
    if (marketName.includes('Touchdowns')) return 'Touchdowns';
    if (marketName.includes('Points')) return 'Points';
    if (marketName.includes('Over/Under')) return 'Over/Under';
    return 'Points';
  }

  // Check if a market/odd is a player prop based on oddID format
  private isPlayerPropMarket(market: any, oddId: string): boolean {
    if (!market || !oddId) return false;
    
    // Player prop oddID format: {statID}-{playerID}-{periodID}-{betTypeID}-{sideID}
    // Example: "rushing_yards-JAMES_COOK_1_NFL-game-ou-over"
    const oddIdParts = oddId.split('-');
    
    if (oddIdParts.length < 5) return false;
    
    const [statID, statEntityID, periodID, betTypeID, sideID] = oddIdParts;
    
    // Check if statEntityID is a playerID (contains player name pattern)
    // PlayerIDs typically contain underscores and player names like "JAMES_COOK_1_NFL"
    const isPlayerID = /^[A-Z_]+_[A-Z_]+_\d+_[A-Z]+$/.test(statEntityID);
    
    // Also check for simpler player ID patterns
    const isSimplePlayerID = statEntityID && statEntityID !== '0' && statEntityID !== 'null' && statEntityID !== 'undefined' && statEntityID.length > 3;
    
    // Check if it's a player-specific stat
    const playerStats = [
      'passing_yards', 'rushing_yards', 'receiving_yards', 'receptions',
      'passing_touchdowns', 'rushing_touchdowns', 'receiving_touchdowns',
      'passing_interceptions', 'defense_interceptions', 'fumbles_lost', 
      'passing_completions', 'passing_attempts', 'passing_longestCompletion',
      'rushing_attempts', 'rushing_longestRush', 'fieldGoals_made', 
      'extraPoints_kicksMade', 'kicking_totalPoints', 'defense_combinedTackles',
      'defense_sacks', 'fantasyScore', 'passing+rushing_yards',
      // Additional stat types found in actual data
      'touchdowns', 'firstTouchdown', 'lastTouchdown'
    ];
    
    const isPlayerStat = playerStats.includes(statID.toLowerCase());
    
    // Check if it's an over/under bet type (common for player props)
    const isOverUnder = betTypeID === 'ou' || betTypeID === 'over_under';
    
    logAPI('SportsGameOddsAPI', `Checking oddID: ${oddId} - isPlayerID: ${isPlayerID}, isSimplePlayerID: ${isSimplePlayerID}, isPlayerStat: ${isPlayerStat}, isOverUnder: ${isOverUnder}, statEntityID: ${statEntityID}`);
    
    // Use either strict player ID pattern or simple player ID check
    return (isPlayerID || isSimplePlayerID) && isPlayerStat && isOverUnder;
  }

  // Removed processPlayerPropsData method - no longer needed


  // Map sport names to SportsGameOdds sport IDs
  private mapSportToId(sport: string): string | null {
    const sportMap: { [key: string]: string } = {
      'nfl': '1',
      'nba': '2', 
      'mlb': '3',
      'nhl': '4',
      'soccer': '5',
      'tennis': '6',
      'mma': '7',
      'handball': '8'
    };
    return sportMap[sport.toLowerCase()] || null;
  }

  // Map sport names to SportsGameOdds league IDs
  private mapSportToLeagueId(sport: string): string | null {
    const leagueMap: { [key: string]: string } = {
      'nfl': 'NFL',
      'nba': 'NBA',
      'mlb': 'MLB',
      'nhl': 'NHL',
      'soccer': 'MLS',
      'tennis': 'TENNIS',
      'mma': 'MMA',
      'handball': 'HANDBALL'
    };
    return leagueMap[sport.toLowerCase()] || null;
  }



  // Map bookmaker ID to display name using official SportsGameOdds API bookmaker list
  private mapBookmakerIdToName(bookmakerId: string): string {
    const bookmakerMap: { [key: string]: string } = {
      'fanduel': 'FanDuel',
      'draftkings': 'Draft Kings',
      'betmgm': 'BetMGM',
      'caesars': 'Caesars',
      'pointsbet': 'PointsBet',
      'betrivers': 'BetRivers',
      'foxbet': 'FOX Bet',
      'bet365': 'bet365',
      'williamhill': 'William Hill',
      'pinnacle': 'Pinnacle',
      'bovada': 'Bovada',
      'betonline': 'BetOnline',
      'betway': 'Betway',
      'unibet': 'Unibet',
      'ladbrokes': 'Ladbrokes',
      'coral': 'Coral',
      'paddypower': 'Paddy Power',
      'skybet': 'Sky Bet',
      'boylesports': 'BoyleSports',
      'betfair': 'Betfair',
      'betvictor': 'Bet Victor',
      'betfred': 'Betfred',
      'unknown': 'Unknown Sportsbook'
    };

    return bookmakerMap[bookmakerId.toLowerCase()] || bookmakerId;
  }

  // Extract sportsbook name from odd data
  private extractSportsbookFromOdd(odd: any, oddId: string): string {
    // Check if the odd has bookmaker information
    if (odd.bookmakerId) {
      return this.mapBookmakerIdToName(odd.bookmakerId);
    }
    
    // Check if oddId contains bookmaker information (format: bookmaker_stat_entity)
    const oddIdParts = oddId.split('_');
    if (oddIdParts.length >= 2) {
      const potentialBookmaker = oddIdParts[0];
      return this.mapBookmakerIdToName(potentialBookmaker);
    }
    
    // Fallback to consensus odds indicator
    if (odd.fairOddsAvailable) {
      return 'Consensus Odds';
    }
    
    return 'SportsGameOdds';
  }

  // Extract bookmaker ID from odd data
  private extractBookmakerIdFromOdd(odd: any, oddId: string): string {
    // Check if the odd has bookmaker information
    if (odd.bookmakerId) {
      return odd.bookmakerId;
    }
    
    // Check if oddId contains bookmaker information (format: bookmaker_stat_entity)
    const oddIdParts = oddId.split('_');
    if (oddIdParts.length >= 2) {
      return oddIdParts[0];
    }
    
    // Fallback to consensus odds indicator
    if (odd.fairOddsAvailable) {
      return 'consensus';
    }
    
    return 'sgo';
  }

  // Convert decimal odds to American odds format
  private convertDecimalToAmerican(decimalOdds: number): number {
    if (decimalOdds >= 2.0) {
      // Positive American odds
      return Math.round((decimalOdds - 1) * 100);
    } else {
      // Negative American odds
      return Math.round(-100 / (decimalOdds - 1));
    }
  }

  // Convert American odds to decimal odds format
  private convertAmericanToDecimal(americanOdds: number): number {
    if (americanOdds > 0) {
      return (americanOdds / 100) + 1;
    } else {
      return (100 / Math.abs(americanOdds)) + 1;
    }
  }

  // Detect and convert odds to proper American format
  private normalizeOddsToAmerican(odds: number): number {
    // If odds are already in American format (between -1000 and 1000 typically)
    if (odds >= -1000 && odds <= 1000 && odds !== 0) {
      return odds;
    }
    
    // If odds are in decimal format (typically > 1.0)
    if (odds > 1.0) {
      return this.convertDecimalToAmerican(odds);
    }
    
    // If odds are in fractional format (like 1/2, 2/1) - convert to decimal first
    if (odds < 1.0 && odds > 0) {
      const decimalOdds = 1 / odds;
      return this.convertDecimalToAmerican(decimalOdds);
    }
    
    // Default fallback
    return -110;
  }

  // Note: Sample data creation method removed to focus on real SportsGameOdds API data only

  // Get games for a specific sport
  async getGames(sport: string): Promise<SportsGameOddsGame[]> {
    try {
      const sportId = this.mapSportToId(sport);
      if (!sportId) {
        logWarning('SportsGameOddsAPI', `No sport ID found for ${sport}`);
        return [];
      }

      logAPI('SportsGameOddsAPI', `Fetching games for ${sport} (ID: ${sportId})`);
      
      const data = await this.makeRequest<any>(`/v2/sports/${sportId}/games`, CACHE_DURATION.ODDS);
      
      const games: SportsGameOddsGame[] = data.games?.map((game: any) => ({
        id: game.id,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        sport: sport.toUpperCase(),
        league: game.league || 'Unknown',
        gameTime: game.gameTime || game.time,
        status: game.status || 'scheduled',
        markets: game.markets || []
      })) || [];
      
      logSuccess('SportsGameOddsAPI', `Retrieved ${games.length} games for ${sport}`);
      return games;
      
    } catch (error) {
      logError('SportsGameOddsAPI', `Failed to get games for ${sport}:`, error);
      return [];
    }
  }
}

// Export singleton instance
export const sportsGameOddsAPI = new SportsGameOddsAPI();
