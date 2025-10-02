import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface APIConfig {
  sportsgameodds_api_key: string;
  cache_ttl_seconds: number;
  polling_interval_seconds: number;
  rate_limit_per_minute: number;
  max_props_per_request: number;
  enabled_sports: string[];
}

interface CacheEntry {
  data: any;
  expires_at: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
}

class SportGameOddsAPIService {
  private config: APIConfig | null = null;

  async loadConfig(): Promise<APIConfig> {
    if (this.config) return this.config;

    const { data, error } = await supabase
      .from('api_config')
      .select('key, value')
      .in('key', [
        'sportsgameodds_api_key',
        'cache_ttl_seconds', 
        'polling_interval_seconds',
        'rate_limit_per_minute',
        'max_props_per_request',
        'enabled_sports'
      ]);

    if (error) {
      console.error('Failed to load API config:', error);
      throw new Error('Configuration not available');
    }

    const configMap = data.reduce((acc: any, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {});

    this.config = {
      sportsgameodds_api_key: configMap.sportsgameodds_api_key?.replace(/"/g, '') || '',
      cache_ttl_seconds: parseInt(configMap.cache_ttl_seconds) || 30,
      polling_interval_seconds: parseInt(configMap.polling_interval_seconds) || 30,
      rate_limit_per_minute: parseInt(configMap.rate_limit_per_minute) || 60,
      max_props_per_request: parseInt(configMap.max_props_per_request) || 3,
      enabled_sports: Array.isArray(configMap.enabled_sports) ? configMap.enabled_sports : ['nfl', 'nba', 'mlb', 'nhl']
    };

    return this.config;
  }

  async checkRateLimit(userId: string | null, endpoint: string): Promise<RateLimitResult> {
    if (!userId) {
      // Allow anonymous users with stricter limits
      return { allowed: true, remaining: 10, resetTime: new Date(Date.now() + 60000) };
    }

    const config = await this.loadConfig();
    const windowStart = new Date();
    windowStart.setSeconds(0, 0); // Round to minute boundary

    // Check current rate limit
    const { data: existing } = await supabase
      .from('api_rate_limits')
      .select('*')
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
      .eq('window_start', windowStart.toISOString())
      .single();

    if (existing) {
      if (existing.requests_count >= config.rate_limit_per_minute) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: new Date(windowStart.getTime() + 60000)
        };
      }

      // Increment counter
      await supabase
        .from('api_rate_limits')
        .update({ 
          requests_count: existing.requests_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      return {
        allowed: true,
        remaining: config.rate_limit_per_minute - existing.requests_count - 1,
        resetTime: new Date(windowStart.getTime() + 60000)
      };
    } else {
      // Create new rate limit entry
      await supabase
        .from('api_rate_limits')
        .insert({
          user_id: userId,
          endpoint,
          requests_count: 1,
          window_start: windowStart.toISOString(),
          window_duration_seconds: 60,
          max_requests: config.rate_limit_per_minute
        });

      return {
        allowed: true,
        remaining: config.rate_limit_per_minute - 1,
        resetTime: new Date(windowStart.getTime() + 60000)
      };
    }
  }

  async getFromCache(cacheKey: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('api_cache')
      .select('data, expires_at')
      .eq('cache_key', cacheKey)
      .single();

    if (error || !data) return null;

    const expiresAt = new Date(data.expires_at);
    if (expiresAt < new Date()) {
      // Cache expired, clean it up
      await supabase
        .from('api_cache')
        .delete()
        .eq('cache_key', cacheKey);
      return null;
    }

    return data.data;
  }

  async setCache(cacheKey: string, endpoint: string, sport: string | null, data: any, ttlSeconds: number): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    await supabase
      .from('api_cache')
      .upsert({
        cache_key: cacheKey,
        endpoint,
        sport,
        data,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      });
  }

  async logAPIUsage(
    userId: string | null,
    endpoint: string,
    method: string,
    sport: string | null,
    responseStatus: number,
    responseTimeMs: number,
    cacheHit: boolean,
    userAgent: string | null,
    ipAddress: string | null
  ): Promise<void> {
    const config = await this.loadConfig();

    await supabase
      .from('api_usage_logs')
      .insert({
        user_id: userId,
        endpoint,
        method,
        sport,
        response_status: responseStatus,
        response_time_ms: responseTimeMs,
        cache_hit: cacheHit,
        api_key_used: config.sportsgameodds_api_key.substring(0, 8) + '...',
        user_agent: userAgent,
        ip_address: ipAddress
      });
  }

  async fetchFromSportGameOdds(endpoint: string, sport?: string): Promise<any> {
    const config = await this.loadConfig();
    const baseUrl = 'https://api.sportsgameodds.com';
    
    let url = '';
    switch (endpoint) {
      case 'events':
        if (!sport) throw new Error('Sport required for events endpoint');
        url = `${baseUrl}/v2/events?leagueID=${sport.toUpperCase()}&marketOddsAvailable=true&limit=50`;
        break;
      case 'player-props':
        if (!sport) throw new Error('Sport required for player-props endpoint');
        url = `${baseUrl}/v2/events?leagueID=${sport.toUpperCase()}&marketOddsAvailable=true&limit=50`;
        break;
      default:
        throw new Error(`Unsupported endpoint: ${endpoint}`);
    }

    console.log(`Fetching from SportGameOdds API: ${url.replace(config.sportsgameodds_api_key, 'REDACTED')}`);

    const startTime = Date.now();
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${config.sportsgameodds_api_key}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Statpedia-Server/1.0'
      }
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`SportGameOdds API Error: ${response.status} - ${errorText}`);
      throw new Error(`SportGameOdds API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    // Log rate limit headers
    const rateLimit = response.headers.get('x-ratelimit-limit');
    const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
    const rateLimitReset = response.headers.get('x-ratelimit-reset');
    
    console.log(`SportGameOdds Rate Limit - Limit: ${rateLimit}, Remaining: ${rateLimitRemaining}, Reset: ${rateLimitReset}`);

    return {
      data,
      meta: {
        responseTime,
        rateLimit: {
          limit: rateLimit,
          remaining: rateLimitRemaining,
          reset: rateLimitReset
        }
      }
    };
  }

  async processPlayerProps(rawData: any, maxProps: number): Promise<any[]> {
    // Process the raw SportGameOdds API data into our format
    if (!rawData.data || !Array.isArray(rawData.data)) {
      return [];
    }

    const playerProps: any[] = [];

    for (const event of rawData.data) {
      if (!event.odds || !Array.isArray(event.odds)) continue;

      const gameId = event.eventID;
      const homeTeam = event.homeTeam?.name || 'Unknown';
      const awayTeam = event.awayTeam?.name || 'Unknown';
      const gameTime = event.status?.startsAt || new Date().toISOString();

      // Process odds for player props
      for (const odd of event.odds) {
        if (!odd.byBookmaker) continue;

        for (const [bookmakerId, bookmakerData] of Object.entries(odd.byBookmaker)) {
          if (!bookmakerData || typeof bookmakerData !== 'object') continue;

          const bookmaker = bookmakerData as any;
          if (!bookmaker.over || !bookmaker.under) continue;

          // Extract player information from oddID
          const oddIdParts = odd.oddID?.split('-') || [];
          if (oddIdParts.length < 5) continue;

          const playerName = oddIdParts.slice(2, -2).join(' ');
          const propType = oddIdParts[oddIdParts.length - 2];
          const line = parseFloat(oddIdParts[oddIdParts.length - 1]);

          if (isNaN(line) || !playerName || !propType) continue;

          const prop = {
            id: `${gameId}-${playerName}-${propType}-${line}-${bookmakerId}`,
            playerId: playerName.replace(/\s+/g, '_').toLowerCase(),
            playerName,
            team: homeTeam, // This would need better logic to determine player's team
            sport: event.league || 'unknown',
            propType,
            line,
            overOdds: bookmaker.over.odds || 0,
            underOdds: bookmaker.under.odds || 0,
            sportsbook: bookmakerId,
            sportsbookKey: bookmakerId,
            lastUpdate: new Date().toISOString(),
            gameId,
            gameTime,
            homeTeam,
            awayTeam,
            confidence: 1.0,
            market: propType,
            outcome: 'over_under',
            betType: 'player_prop',
            side: 'both',
            period: 'full_game',
            statEntity: playerName,
            isExactAPIData: true,
            rawOverOdds: bookmaker.over,
            rawUnderOdds: bookmaker.under,
            availableSportsbooks: [bookmakerId]
          };

          playerProps.push(prop);

          if (playerProps.length >= maxProps) {
            break;
          }
        }

        if (playerProps.length >= maxProps) {
          break;
        }
      }

      if (playerProps.length >= maxProps) {
        break;
      }
    }

    return playerProps.slice(0, maxProps);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let responseStatus = 200;
  let cacheHit = false;

  try {
    const url = new URL(req.url);
    const endpoint = url.searchParams.get('endpoint') || 'player-props';
    const sport = url.searchParams.get('sport') || 'nfl';
    
    // Get user info from JWT token using Supabase auth
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;
    
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error) {
          console.warn('Auth token validation failed:', error);
        } else if (user) {
          userId = user.id;
        }
      } catch (e) {
        console.warn('Failed to validate auth token:', e);
      }
    }

    const service = new SportGameOddsAPIService();
    const config = await service.loadConfig();
    
    // Check if API key is configured
    if (!config.sportsgameodds_api_key) {
      console.error('SportGameOdds API key not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'SportGameOdds API key not configured. Please set the API key in the database.' 
        }),
        { 
          status: 500,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // Check rate limiting
    const rateLimitResult = await service.checkRateLimit(userId, endpoint);
    if (!rateLimitResult.allowed) {
      responseStatus = 429;
      await service.logAPIUsage(
        userId,
        endpoint,
        req.method,
        sport,
        429,
        Date.now() - startTime,
        false,
        req.headers.get('user-agent'),
        req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
      );

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Rate limit exceeded',
          rateLimitReset: rateLimitResult.resetTime.toISOString()
        }),
        { 
          status: 429,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toISOString()
          } 
        }
      );
    }

    // Check cache first
    const cacheKey = `${endpoint}-${sport}`;
    let cachedData = await service.getFromCache(cacheKey);
    
    if (cachedData) {
      cacheHit = true;
      console.log(`Cache hit for ${cacheKey}`);
      
      await service.logAPIUsage(
        userId,
        endpoint,
        req.method,
        sport,
        200,
        Date.now() - startTime,
        true,
        req.headers.get('user-agent'),
        req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
      );

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: cachedData,
          cached: true,
          cacheKey,
          meta: {
            rateLimitRemaining: rateLimitResult.remaining,
            rateLimitReset: rateLimitResult.resetTime.toISOString()
          }
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-Cache': 'HIT',
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString()
          } 
        }
      );
    }

    // Fetch from SportGameOdds API
    console.log(`Cache miss for ${cacheKey}, fetching from API`);
    const apiResponse = await service.fetchFromSportGameOdds(endpoint, sport);
    
    let processedData;
    if (endpoint === 'player-props') {
      processedData = await service.processPlayerProps(apiResponse, config.max_props_per_request);
    } else {
      processedData = apiResponse.data;
    }

    // Cache the response
    await service.setCache(cacheKey, endpoint, sport, processedData, config.cache_ttl_seconds);

    // Log API usage
    await service.logAPIUsage(
      userId,
      endpoint,
      req.method,
      sport,
      responseStatus,
      Date.now() - startTime,
      false,
      req.headers.get('user-agent'),
      req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: processedData,
        cached: false,
        cacheKey,
        meta: {
          ...apiResponse.meta,
          rateLimitRemaining: rateLimitResult.remaining,
          rateLimitReset: rateLimitResult.resetTime.toISOString(),
          propsLimited: endpoint === 'player-props' ? config.max_props_per_request : null
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Cache': 'MISS',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString()
        } 
      }
    );

  } catch (error) {
    console.error('Error in sportsgameodds-api function:', error);
    responseStatus = 500;
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Log the error
    try {
      const service = new SportGameOddsAPIService();
      await service.logAPIUsage(
        null, // userId might not be available in error case
        'unknown',
        req.method,
        null,
        500,
        Date.now() - startTime,
        false,
        req.headers.get('user-agent'),
        req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
      );
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
