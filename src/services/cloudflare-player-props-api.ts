/**
 * Cloudflare Workers API Service for Player Props
 * 
 * This service replaces the Supabase Edge Functions with Cloudflare Workers
 * providing unlimited scalability and no resource restrictions.
 */

interface PlayerProp {
  playerName: string;
  propType: string;
  line: number;
  overOdds: number;
  underOdds: number;
  sportsbooks: string[];
  gameDate: string;
  teamAbbr: string;
  opponentAbbr: string;
  confidence?: number;
  expectedValue?: number;
  recentForm?: string;
  aiPrediction?: {
    recommended: 'over' | 'under';
    confidence: number;
    reasoning: string;
  };
}

interface APIResponse {
  success: boolean;
  data: PlayerProp[];
  cached: boolean;
  cacheKey: string;
  responseTime: number;
  totalEvents: number;
  totalProps: number;
  error?: string;
}

class CloudflarePlayerPropsAPI {
  private baseUrl: string;

  constructor() {
    // Use a workers.dev subdomain (we'll register one)
    // This will be accessible from your Lovable frontend
    this.baseUrl = 'https://statpedia-player-props.statpedia.workers.dev';
  }

  /**
   * Get player props with NO RESTRICTIONS
   * - No size limits
   * - No timeout restrictions  
   * - Full data processing
   * - Global edge caching
   */
  async getPlayerProps(sport: string = 'nfl', forceRefresh: boolean = false): Promise<PlayerProp[]> {
    const params: any = { sport: sport.toLowerCase() };

    if (forceRefresh) {
      params.force_refresh = 'true';
    }

    const response = await this.makeRequest('', params);
    return response.data || [];
  }

  /**
   * Make request to Cloudflare Workers API
   */
  private async makeRequest(endpoint: string, params: Record<string, string> = {}): Promise<any> {
    try {
      console.log(`🚀 Fetching player props from Cloudflare Workers: ${params.sport}${params.force_refresh ? ' (force refresh)' : ''}`);
      
      const url = new URL(`${this.baseUrl}/api/player-props`);
      
      // Add parameters
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });

      const startTime = Date.now();
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const responseTime = Date.now() - startTime;
      
      console.log(`📊 Cloudflare Workers response: ${response.status} (${responseTime}ms)`);

      if (!response.ok) {
        const errorData = await response.json();
        console.warn(`⚠️ Cloudflare Workers API failed: ${response.status} - ${errorData.error || 'Unknown error'}`);
        
        // Fallback to Supabase Edge Function
        console.log('🔄 Falling back to Supabase Edge Function...');
        return this.getPlayerPropsFromSupabase(params.sport, params.force_refresh === 'true');
      }

      const data: APIResponse = await response.json();
      
      console.log(`✅ Player props loaded successfully:`, {
        success: data.success,
        totalProps: data.totalProps,
        totalEvents: data.totalEvents,
        cached: data.cached,
        responseTime: data.responseTime
      });

      if (!data.success) {
        console.warn(`⚠️ Cloudflare Workers API returned success: false - ${data.error || 'Unknown error'}`);
        
        // Fallback to Supabase Edge Function
        console.log('🔄 Falling back to Supabase Edge Function...');
        return this.getPlayerPropsFromSupabase(params.sport, params.force_refresh === 'true');
      }

      return data;
      
    } catch (error) {
      console.error('❌ Cloudflare Workers API error:', error);
      console.log('🔄 Falling back to Supabase Edge Function...');
      
      // Fallback to Supabase Edge Function
      try {
        return await this.getPlayerPropsFromSupabase(params.sport, params.force_refresh === 'true');
      } catch (fallbackError) {
        console.error('❌ Supabase fallback also failed:', fallbackError);
        throw fallbackError;
      }
    }
  }

  /**
   * Fallback method to get player props from Supabase Edge Function
   */
  private async getPlayerPropsFromSupabase(sport: string = 'nfl', forceRefresh: boolean = false): Promise<PlayerProp[]> {
    try {
      console.log(`🔄 Fetching player props from Supabase Edge Function: ${sport}`);
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration not found');
      }

      const url = new URL(`${supabaseUrl}/functions/v1/sportsgameodds-api`);
      url.searchParams.append('endpoint', 'player-props');
      url.searchParams.append('sport', sport);
      
      if (forceRefresh) {
        url.searchParams.append('force_refresh', 'true');
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Supabase Edge Function error: ${response.status}`);
      }

      const data: APIResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load player props from Supabase');
      }

      console.log(`✅ Player props loaded from Supabase: ${data.totalProps} props`);
      return data.data || [];
      
    } catch (error) {
      console.error('❌ Supabase Edge Function error:', error);
      throw error;
    }
  }

  /**
   * Get cached player props (faster response)
   */
  async getCachedPlayerProps(sport: string = 'nfl'): Promise<PlayerProp[]> {
    return this.getPlayerProps(sport, false);
  }

  /**
   * Force refresh player props (bypass cache)
   */
  async refreshPlayerProps(sport: string = 'nfl'): Promise<PlayerProp[]> {
    return this.getPlayerProps(sport, true);
  }

  /**
   * Get multiple sports at once
   */
  async getAllSportsPlayerProps(): Promise<Record<string, PlayerProp[]>> {
    const sports = ['nfl', 'nba', 'mlb', 'nhl'];
    const results: Record<string, PlayerProp[]> = {};
    
    // Fetch all sports in parallel (no rate limiting!)
    const promises = sports.map(async (sport) => {
      try {
        const props = await this.getPlayerProps(sport);
        results[sport] = props;
      } catch (error) {
        console.warn(`Failed to fetch ${sport} props:`, error);
        results[sport] = [];
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Get API analytics and performance metrics
   */
  async getAnalytics(): Promise<{
    totalRequests: number;
    averageResponseTime: number;
    cacheHitRate: number;
    errorRate: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/analytics`);
      return await response.json();
    } catch (error) {
      console.warn('Failed to fetch analytics:', error);
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        cacheHitRate: 0,
        errorRate: 0
      };
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const cloudflarePlayerPropsAPI = new CloudflarePlayerPropsAPI();

// Export types for use in components
export type { PlayerProp, APIResponse };
