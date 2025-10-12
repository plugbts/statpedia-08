/**
 * Cloudflare Workers API Service for Player Props
 * 
 * This service replaces the Supabase Edge Functions with Cloudflare Workers
 * providing unlimited scalability and no resource restrictions.
 */

import { playerPropsEnricher } from './player-props-enricher';

interface PlayerProp {
  id?: string;
  playerId?: string;
  playerName: string;
  player_id?: string | number; // Added player_id field for headshots
  team?: string;
  opponent?: string;
  propType: string;
  line: number | null;
  overOdds: number | null;
  underOdds: number | null;
  sportsbooks?: string[];
  position?: string;
  gameDate: string;
  gameTime?: string;
  sport?: string;
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
  // Enhanced fields for new API format
  bestOver?: {
    bookmaker: string;
    side: string;
    price: string;
    line: number | null;
  };
  bestUnder?: {
    bookmaker: string;
    side: string;
    price: string;
    line: number | null;
  };
  allBooks?: Array<{
    bookmaker: string;
    side: string;
    price: string;
    line: number | null;
    deeplink?: string;
  }>;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  // Additional fields for compatibility
  availableSportsbooks?: string[];
  gameId?: string;
  allSportsbookOdds?: Array<{
    sportsbook: string;
    odds: number;
    lastUpdate: string;
  }>;
  available?: boolean;
  awayTeam?: string;
  homeTeam?: string;
  betType?: string;
  isExactAPIData?: boolean;
  lastUpdate?: string;
  marketName?: string;
  market?: string;
  marketId?: string;
  period?: string;
  statEntity?: string;
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
    // Use Cloudflare Worker for prop ingestion
    // This will be accessible from your Lovable frontend
    this.baseUrl = 'https://statpedia-storage.statpedia.workers.dev';
  }

  /**
   * Get player props with pagination and league scoping
   * - Paginated results (25-50 per page)
   * - League-scoped requests
   * - Deduplication and normalization
   * - Global edge caching
   */
  async getPlayerProps(
    sport: string = 'nfl', 
    forceRefresh: boolean = false, 
    date?: string, 
    view?: string
  ): Promise<PlayerProp[]> {
    try {
      console.log(`🚀 Fetching player props from new /api/{league}/player-props endpoint: ${sport}${forceRefresh ? ' (force refresh)' : ''}`);
      
      // Use Cloudflare Worker for prop ingestion
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const league = sport.toUpperCase(); // Convert to uppercase for Cloudflare Worker
      
      const startTime = Date.now();
      
      // First, trigger ingestion to ensure we have fresh data
      const ingestResponse = await fetch(`${this.baseUrl}/ingest`, {
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          league: league,
          season: '2025',
          week: league === 'NFL' ? '6' : undefined
        })
      });

      if (!ingestResponse.ok) {
        const errorData = await ingestResponse.json();
        console.warn(`⚠️ Cloudflare Worker ingestion failed: ${ingestResponse.status} - ${errorData.error || 'Unknown error'}`);
      }

      // Now fetch the player props from the database with flexible date tolerance
      const url = new URL(`${this.baseUrl}/api/player-props`);
      url.searchParams.append('sport', sport.toLowerCase());
      if (forceRefresh) {
        url.searchParams.append('force_refresh', 'true');
      }
      if (date) {
        // Use flexible date range: ±1 day tolerance
        const targetDate = new Date(date);
        const dateFrom = new Date(targetDate.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const dateTo = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        url.searchParams.append('date_from', dateFrom);
        url.searchParams.append('date_to', dateTo);
        url.searchParams.append('date', date); // Keep original date for reference
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        mode: 'cors',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const responseTime = Date.now() - startTime;
      
      console.log(`📊 Cloudflare Worker player props API response: ${response.status} (${responseTime}ms)`);

      if (!response.ok) {
        const errorData = await response.json();
        console.warn(`⚠️ Cloudflare Worker player props API failed: ${response.status} - ${errorData.error || 'Unknown error'}`);
        
        // Fallback to Supabase Edge Function
        console.log('🔄 Falling back to Supabase Edge Function...');
        return await this.getPlayerPropsFromSupabase(sport, forceRefresh);
      }

      const data: APIResponse = await response.json();
      
      console.log(`✅ Player props loaded from Cloudflare Worker:`, {
        success: data.success,
        totalProps: data.totalProps,
        totalEvents: data.totalEvents,
        cached: data.cached,
        responseTime: data.responseTime
      });

      if (!data.success) {
        console.warn(`⚠️ Cloudflare Worker API returned success: false - ${data.error || 'Unknown error'}`);
        
        // Fallback to Supabase Edge Function
        console.log('🔄 Falling back to Supabase Edge Function...');
        return await this.getPlayerPropsFromSupabase(sport, forceRefresh);
      }

      const props = data.data || [];
      console.log(`✅ Retrieved ${props.length} player props from Cloudflare Worker`);
      
      // Apply pagination to the props
      console.log(`🔧 Enriching ${props.length} player props with gameLogs and defenseStats...`);
      
      // Enrich props with gameLogs and defenseStats for analytics
      const enrichedProps = await playerPropsEnricher.enrichPlayerProps(props);
      
      console.log(`✅ Enriched ${enrichedProps.length} player props with analytics data`);
      return enrichedProps;
      
    } catch (error) {
      console.error('❌ New /api/{league}/player-props endpoint error:', error);
      
      // Fallback to Supabase Edge Function
      console.log('🔄 Falling back to Supabase Edge Function...');
      return await this.getPlayerPropsFromSupabase(sport, forceRefresh);
    }
  }

  /**
   * Paginate props array
   */
  private paginateProps(props: PlayerProp[], page: number, pageSize: number): { props: PlayerProp[]; total: number; hasMore: boolean; page: number; pageSize: number } {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedProps = props.slice(startIndex, endIndex);
    
    return {
      props: paginatedProps,
      total: props.length,
      hasMore: endIndex < props.length,
      page,
      pageSize
    };
  }

  /**
   * Legacy method to get player props from old /api/player-props endpoint
   */
  private async getPlayerPropsFromLegacy(sport: string = 'nfl', forceRefresh: boolean = false): Promise<PlayerProp[]> {
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
        mode: 'cors',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const responseTime = Date.now() - startTime;
      
      console.log(`📊 Cloudflare Workers response: ${response.status} (${responseTime}ms)`);

      if (!response.ok) {
        const errorData = await response.json();
        console.warn(`⚠️ Cloudflare Workers API failed: ${response.status} - ${errorData.error || 'Unknown error'}`);
        
        // Don't fallback to Supabase - it has its own issues
        throw new Error(`API request failed: ${response.status} - ${errorData.error || 'Unknown error'}`);
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
        
        // Don't fallback to Supabase - it has its own issues
        throw new Error(`API returned success: false - ${data.error || 'Unknown error'}`);
      }

      return data;
      
    } catch (error) {
      console.error('❌ Cloudflare Workers API error:', error);
      
      // Don't fallback to Supabase - it has its own issues
      throw error;
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
      const props = data.data || [];
      
      // Enrich props with gameLogs and defenseStats for analytics
      console.log(`🔧 Enriching ${props.length} player props with gameLogs and defenseStats...`);
      const enrichedProps = await playerPropsEnricher.enrichPlayerProps(props);
      
      console.log(`✅ Enriched ${enrichedProps.length} player props with analytics data`);
      return enrichedProps;
      
    } catch (error) {
      console.error('❌ Supabase Edge Function error:', error);
      throw error;
    }
  }

  /**
   * Get cached player props (faster response) - backward compatibility
   */
  async getCachedPlayerProps(sport: string = 'nfl'): Promise<PlayerProp[]> {
    return await this.getPlayerProps(sport, false);
  }

  /**
   * Force refresh player props (bypass cache) - backward compatibility
   */
  async refreshPlayerProps(sport: string = 'nfl'): Promise<PlayerProp[]> {
    return await this.getPlayerProps(sport, true);
  }

  /**
   * Get player props with pagination (new method)
   */
  async getPlayerPropsPaginated(
    sport: string = 'nfl',
    page: number = 1,
    pageSize: number = 50,
    forceRefresh: boolean = false,
    date?: string,
    view?: string
  ): Promise<{ props: PlayerProp[]; total: number; hasMore: boolean; page: number; pageSize: number }> {
    const allProps = await this.getPlayerProps(sport, forceRefresh, date, view);
    return this.paginateProps(allProps, page, pageSize);
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
        const result = await this.getPlayerProps(sport);
        results[sport] = result;
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
