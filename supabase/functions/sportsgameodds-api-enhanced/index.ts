// Enhanced SportsGameOdds API Function with Usage Logging
// This replaces the existing sportsgameodds-api function with usage tracking

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

class EnhancedSportsGameOddsAPI {
  private async logAPIUsage(
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
    try {
      await supabase.rpc('log_api_usage', {
        p_user_id: userId,
        p_endpoint: endpoint,
        p_method: method,
        p_sport: sport,
        p_response_status: responseStatus,
        p_response_time_ms: responseTimeMs,
        p_cache_hit: cacheHit,
        p_api_key_used: 'sgo_****',
        p_user_agent: userAgent,
        p_ip_address: ipAddress
      });
    } catch (error) {
      console.error('Failed to log API usage:', error);
    }
  }

  async fetchFromAPI(endpoint: string, sport?: string): Promise<any> {
    const apiKey = Deno.env.get('SPORTSGAMEODDS_API_KEY');
    if (!apiKey) {
      throw new Error('SPORTSGAMEODDS_API_KEY not configured');
    }

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

    const startTime = Date.now();
    
    try {
      const response = await fetch(url, {
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'Statpedia-Server/1.0'
        }
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { data, responseTime, status: response.status };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      throw { error, responseTime, status: 500 };
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let responseStatus = 200;
  let cacheHit = false;
  let userId: string | null = null;

  try {
    const url = new URL(req.url);
    const endpoint = url.searchParams.get('endpoint') || 'player-props';
    const sport = url.searchParams.get('sport') || 'nfl';
    const forceRefresh = url.searchParams.get('force_refresh') === 'true';

    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id || null;
      } catch (e) {
        console.warn('Failed to validate auth token:', e.message);
      }
    }

    const service = new EnhancedSportsGameOddsAPI();
    
    // Check cache first (unless force refresh)
    const cacheKey = `${endpoint}-${sport}`;
    let cachedData = null;
    
    if (!forceRefresh) {
      const { data } = await supabase
        .from('api_cache')
        .select('data, expires_at')
        .eq('cache_key', cacheKey)
        .single();
      
      if (data && new Date(data.expires_at) > new Date()) {
        cachedData = data.data;
        cacheHit = true;
      }
    }

    let apiResponse;
    if (cachedData && !forceRefresh) {
      apiResponse = cachedData;
    } else {
      // Fetch from API
      const result = await service.fetchFromAPI(endpoint, sport);
      apiResponse = result.data;
      responseStatus = result.status;
      
      // Cache the response
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await supabase
        .from('api_cache')
        .upsert({
          cache_key: cacheKey,
          endpoint,
          sport,
          data: apiResponse,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        });
    }

    // Log API usage
    await service.logAPIUsage(
      userId,
      endpoint,
      req.method,
      sport,
      responseStatus,
      Date.now() - startTime,
      cacheHit,
      req.headers.get('user-agent'),
      req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: apiResponse,
        cached: cacheHit,
        cacheKey,
        meta: {
          responseTime: Date.now() - startTime,
          cacheHit,
          userId: userId ? userId.substring(0, 8) + '...' : null
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Cache': cacheHit ? 'HIT' : 'MISS'
        } 
      }
    );

  } catch (error) {
    console.error('Error in enhanced sportsgameodds-api function:', error);
    responseStatus = 500;
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Log the error
    try {
      const service = new EnhancedSportsGameOddsAPI();
      await service.logAPIUsage(
        userId,
        'error',
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
