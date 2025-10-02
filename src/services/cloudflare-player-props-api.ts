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
    try {
      console.log(`🚀 Fetching player props from Cloudflare Workers: ${sport}${forceRefresh ? ' (force refresh)' : ''}`);
      
      const url = new URL(`${this.baseUrl}/api/player-props`);
      url.searchParams.append('sport', sport);
      url.searchParams.append('endpoint', 'player-props');
      
      if (forceRefresh) {
        url.searchParams.append('force_refresh', 'true');
      }

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
        throw new Error(`Cloudflare Workers API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
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
        throw new Error(data.error || 'Failed to load player props');
      }

      return data.data || [];
      
    } catch (error) {
      console.error('❌ Cloudflare Workers API error:', error);
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
