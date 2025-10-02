/**
 * Enhanced Statpedia Player Props API - Cloudflare Worker with R2 Usage Tracking
 * Includes automatic logging of R2 operations for cost monitoring
 */

interface Env {
  PLAYER_PROPS_CACHE: R2Bucket;
  API_ANALYTICS: KVNamespace;
  SPORTSGAMEODDS_API_KEY: string;
  CACHE_TTL_SECONDS: string;
  MAX_EVENTS_PER_REQUEST: string;
  MAX_PROPS_PER_REQUEST: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
}

interface R2UsageLog {
  bucket_name: string;
  operation_type: 'GET' | 'PUT' | 'DELETE' | 'HEAD' | 'LIST';
  bytes_transferred: number;
  request_count: number;
  cost_usd: number;
  region?: string;
  user_agent?: string;
  ip_address?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const startTime = Date.now();
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const url = new URL(request.url);
      const sport = url.searchParams.get('sport') || 'nfl';
      const forceRefresh = url.searchParams.get('forceRefresh') === 'true';
      
      console.log(`🚀 Player Props API Request: ${sport}${forceRefresh ? ' (force refresh)' : ''}`);
      
      const cacheKey = `player-props-${sport}`;
      const cacheTtlSeconds = 300;
      const maxEvents = 10;
      const maxProps = 50;

      let responseData: any;
      let cacheHit = false;
      let bytesTransferred = 0;

      // Check cache first
      if (!forceRefresh) {
        const cachedData = await env.PLAYER_PROPS_CACHE.get(cacheKey);
        if (cachedData) {
          console.log(`✅ Cache hit for ${cacheKey}`);
          responseData = await cachedData.json();
          cacheHit = true;
          bytesTransferred = cachedData.size;
          
          // Log R2 GET operation
          ctx.waitUntil(this.logR2Usage(env, {
            bucket_name: 'statpedia-player-props-cache',
            operation_type: 'GET',
            bytes_transferred: bytesTransferred,
            request_count: 1,
            cost_usd: this.calculateR2Cost('GET', bytesTransferred, 1),
            region: 'auto',
            user_agent: request.headers.get('User-Agent') || undefined,
            ip_address: this.getClientIP(request)
          }));
          
          return new Response(JSON.stringify(responseData), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
          });
        }
      }

      console.log('Fetching fresh data from API...');

      // Fetch from SportGameOdds API
      const apiResponse = await fetch(`https://api.sportsgameodds.com/v2/events?leagueID=${sport.toUpperCase()}&marketOddsAvailable=true&limit=${maxEvents}`, {
        headers: {
          'X-API-Key': env.SPORTSGAMEODDS_API_KEY,
          'Content-Type': 'application/json',
        },
      });

      if (!apiResponse.ok) {
        throw new Error(`API returned ${apiResponse.status}`);
      }

      const rawData = await apiResponse.json();
      console.log(`✅ API success: ${rawData?.data?.length || 0} events`);

      // Process events with minimal data
      const playerProps: any[] = [];
      const events = rawData.data || [];

      for (let i = 0; i < Math.min(events.length, maxEvents); i++) {
        const event = events[i];
        if (!event.odds) continue;

        // Extract team names
        const homeTeam = event.teams?.home?.names?.short || 'UNK';
        const awayTeam = event.teams?.away?.names?.short || 'UNK';
        
        console.log(`📊 Processing event ${i}: ${homeTeam} vs ${awayTeam}`);

        // Process only first few props to avoid stack overflow
        let propCount = 0;
        for (const [propKey, propData] of Object.entries(event.odds)) {
          if (propCount >= 5) break; // Limit per event
          if (playerProps.length >= maxProps) break; // Global limit
          
          if (!propData || typeof propData !== 'object') continue;
          
          // Skip if not a player prop
          if (!propKey.includes('_1_NFL') || !propKey.includes('-game-ou-')) continue;
          
          // Extract basic info
          const parts = propKey.split('-');
          if (parts.length < 4) continue;
          
          const playerName = parts.slice(0, -3).join(' ').replace(/_/g, ' ').replace(/\d+/g, '').trim();
          const propType = parts[0].replace(/_/g, ' ');
          const side = parts[parts.length - 1];
          
          if (!playerName || (side !== 'over' && side !== 'under')) continue;
          
          // Get basic data
          const line = parseNumber(propData.fairOverUnder || propData.bookOverUnder || '0');
          const odds = parseNumber(propData.fairOdds || propData.bookOdds || '0');
          
          if (!line || !odds) continue;
          
          // Create simple prop object
          const prop = {
            id: `${event.eventID}-${playerName}-${propType}-${line}-${side}`,
            playerName,
            propType: propType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            line,
            overOdds: side === 'over' ? odds : 0,
            underOdds: side === 'under' ? odds : 0,
            sportsbooks: ['DraftKings'],
            gameDate: event.scheduled || new Date().toISOString(),
            teamAbbr: homeTeam,
            opponentAbbr: awayTeam,
            confidence: 0.5,
            expectedValue: 0,
            recentForm: 'N/A',
            aiPrediction: null
          };
          
          playerProps.push(prop);
          propCount++;
        }
      }

      console.log(`✅ Processed ${playerProps.length} player props from ${events.length} events`);

      // Create response
      responseData = {
        success: true,
        data: playerProps,
        cached: false,
        cacheKey,
        responseTime: Date.now() - startTime,
        totalEvents: events.length,
        totalProps: playerProps.length
      };

      const responseString = JSON.stringify(responseData);
      bytesTransferred = new TextEncoder().encode(responseString).length;

      // Store in cache and log R2 PUT operation
      ctx.waitUntil(this.storeInCacheAndLog(env, cacheKey, responseString, cacheTtlSeconds, {
        bucket_name: 'statpedia-player-props-cache',
        operation_type: 'PUT',
        bytes_transferred: bytesTransferred,
        request_count: 1,
        cost_usd: this.calculateR2Cost('PUT', bytesTransferred, 1),
        region: 'auto',
        user_agent: request.headers.get('User-Agent') || undefined,
        ip_address: this.getClientIP(request)
      }));

      return new Response(responseString, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' }
      });

    } catch (error) {
      console.error('❌ Error:', error);
      
      const errorResponse = {
        success: false,
        data: [],
        cached: false,
        cacheKey: '',
        responseTime: Date.now() - startTime,
        totalEvents: 0,
        totalProps: 0,
        error: error.message || 'Unknown error'
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  },

  /**
   * Store data in R2 cache and log the operation
   */
  async storeInCacheAndLog(env: Env, cacheKey: string, data: string, ttl: number, usageLog: R2UsageLog): Promise<void> {
    try {
      // Store in R2 cache
      await env.PLAYER_PROPS_CACHE.put(cacheKey, data, {
        expirationTtl: ttl,
      });

      // Log the usage
      await this.logR2Usage(env, usageLog);
    } catch (error) {
      console.error('Failed to store in cache or log usage:', error);
    }
  },

  /**
   * Log R2 usage to Supabase database
   */
  async logR2Usage(env: Env, usageLog: R2UsageLog): Promise<void> {
    try {
      if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
        console.warn('Supabase credentials not configured, skipping R2 usage logging');
        return;
      }

      const response = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/log_r2_usage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
          'apikey': env.SUPABASE_SERVICE_KEY
        },
        body: JSON.stringify({
          p_bucket_name: usageLog.bucket_name,
          p_operation_type: usageLog.operation_type,
          p_bytes_transferred: usageLog.bytes_transferred,
          p_request_count: usageLog.request_count,
          p_cost_usd: usageLog.cost_usd,
          p_region: usageLog.region,
          p_user_agent: usageLog.user_agent,
          p_ip_address: usageLog.ip_address
        })
      });

      if (!response.ok) {
        console.error('Failed to log R2 usage:', response.status, await response.text());
      } else {
        console.log(`✅ Logged R2 ${usageLog.operation_type} operation: ${usageLog.bytes_transferred} bytes`);
      }
    } catch (error) {
      console.error('Error logging R2 usage:', error);
    }
  },

  /**
   * Calculate estimated R2 cost based on operation type and data size
   */
  calculateR2Cost(operationType: 'GET' | 'PUT' | 'DELETE' | 'HEAD' | 'LIST', bytesTransferred: number, requestCount: number): number {
    // R2 pricing (as of 2024)
    const storagePricePerGB = 0.015; // $0.015 per GB per month
    const classAPricePerMillion = 4.5; // $4.5 per million operations (PUT, DELETE)
    const classBPricePerMillion = 0.36; // $0.36 per million operations (GET, HEAD, LIST)
    const egressPricePerGB = 0.09; // $0.09 per GB egress

    let cost = 0;

    // Storage cost (for PUT operations)
    if (operationType === 'PUT') {
      const storageGB = bytesTransferred / (1024 * 1024 * 1024);
      cost += storageGB * storagePricePerGB;
    }

    // Class A operations (PUT, DELETE)
    if (operationType === 'PUT' || operationType === 'DELETE') {
      const operationsInMillions = requestCount / 1000000;
      cost += operationsInMillions * classAPricePerMillion;
    }

    // Class B operations (GET, HEAD, LIST)
    if (operationType === 'GET' || operationType === 'HEAD' || operationType === 'LIST') {
      const operationsInMillions = requestCount / 1000000;
      cost += operationsInMillions * classBPricePerMillion;
    }

    // Egress cost (for GET operations)
    if (operationType === 'GET') {
      const egressGB = bytesTransferred / (1024 * 1024 * 1024);
      cost += egressGB * egressPricePerGB;
    }

    return cost;
  },

  /**
   * Extract client IP from request
   */
  getClientIP(request: Request): string | undefined {
    const cfConnectingIP = request.headers.get('CF-Connecting-IP');
    const xForwardedFor = request.headers.get('X-Forwarded-For');
    const xRealIP = request.headers.get('X-Real-IP');
    
    return cfConnectingIP || xForwardedFor?.split(',')[0] || xRealIP || undefined;
  }
};

function parseNumber(value: any): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}
