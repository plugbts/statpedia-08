/**
 * Cloudflare Workers API Service for Player Props
 * 
 * This service replaces the Supabase Edge Functions with Cloudflare Workers
 * providing unlimited scalability and no resource restrictions.
 */

interface PlayerProp {
  id?: string;
  playerId?: string;
  playerName: string;
  team?: string;
  opponent?: string;
  propType: string;
  line: number | null;
  overOdds: number | null;
  underOdds: number | null;
  sportsbooks?: string[];
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
  async getPlayerProps(sport: string = 'nfl', forceRefresh: boolean = false, date?: string, view?: string): Promise<PlayerProp[]> {
    try {
      console.log(`🚀 Fetching player props from new /api/{league}/player-props endpoint: ${sport}${forceRefresh ? ' (force refresh)' : ''}`);
      
      // Use the new /api/{league}/player-props endpoint with proper parameters
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const league = sport.toLowerCase();
      
      const url = new URL(`${this.baseUrl}/api/${league}/player-props`);
      url.searchParams.append('date', date || today);
      
      if (view) {
        url.searchParams.append('view', view);
      }
      
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
      
      console.log(`📊 New /api/${league}/player-props response: ${response.status} (${responseTime}ms)`);

      if (!response.ok) {
        const errorData = await response.json();
        console.warn(`⚠️ New /api/${league}/player-props endpoint failed: ${response.status} - ${errorData.error || 'Unknown error'}`);
        
        // Fallback to legacy endpoint
        console.log('🔄 Falling back to legacy /api/player-props endpoint...');
        return this.getPlayerPropsFromLegacy(sport, forceRefresh);
      }

      const data = await response.json();
      
      console.log(`✅ Player props loaded from new endpoint:`, {
        totalEvents: data.events?.length || 0,
        totalPlayerProps: data.events?.reduce((sum: number, event: any) => sum + (event.player_props?.length || 0), 0) || 0
      });

      // NFL Team mapping for logos
      const nflTeamMap: Record<string, string> = {
        'Arizona Cardinals': 'https://a.espncdn.com/i/teamlogos/nfl/500/ari.png',
        'Atlanta Falcons': 'https://a.espncdn.com/i/teamlogos/nfl/500/atl.png',
        'Baltimore Ravens': 'https://a.espncdn.com/i/teamlogos/nfl/500/bal.png',
        'Buffalo Bills': 'https://a.espncdn.com/i/teamlogos/nfl/500/buf.png',
        'Carolina Panthers': 'https://a.espncdn.com/i/teamlogos/nfl/500/car.png',
        'Chicago Bears': 'https://a.espncdn.com/i/teamlogos/nfl/500/chi.png',
        'Cincinnati Bengals': 'https://a.espncdn.com/i/teamlogos/nfl/500/cin.png',
        'Cleveland Browns': 'https://a.espncdn.com/i/teamlogos/nfl/500/cle.png',
        'Dallas Cowboys': 'https://a.espncdn.com/i/teamlogos/nfl/500/dal.png',
        'Denver Broncos': 'https://a.espncdn.com/i/teamlogos/nfl/500/den.png',
        'Detroit Lions': 'https://a.espncdn.com/i/teamlogos/nfl/500/det.png',
        'Green Bay Packers': 'https://a.espncdn.com/i/teamlogos/nfl/500/gb.png',
        'Houston Texans': 'https://a.espncdn.com/i/teamlogos/nfl/500/hou.png',
        'Indianapolis Colts': 'https://a.espncdn.com/i/teamlogos/nfl/500/ind.png',
        'Jacksonville Jaguars': 'https://a.espncdn.com/i/teamlogos/nfl/500/jax.png',
        'Kansas City Chiefs': 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png',
        'Las Vegas Raiders': 'https://a.espncdn.com/i/teamlogos/nfl/500/lv.png',
        'Los Angeles Chargers': 'https://a.espncdn.com/i/teamlogos/nfl/500/lac.png',
        'Los Angeles Rams': 'https://a.espncdn.com/i/teamlogos/nfl/500/lar.png',
        'Miami Dolphins': 'https://a.espncdn.com/i/teamlogos/nfl/500/mia.png',
        'Minnesota Vikings': 'https://a.espncdn.com/i/teamlogos/nfl/500/min.png',
        'New England Patriots': 'https://a.espncdn.com/i/teamlogos/nfl/500/ne.png',
        'New Orleans Saints': 'https://a.espncdn.com/i/teamlogos/nfl/500/no.png',
        'New York Giants': 'https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png',
        'New York Jets': 'https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png',
        'Philadelphia Eagles': 'https://a.espncdn.com/i/teamlogos/nfl/500/phi.png',
        'Pittsburgh Steelers': 'https://a.espncdn.com/i/teamlogos/nfl/500/pit.png',
        'San Francisco 49ers': 'https://a.espncdn.com/i/teamlogos/nfl/500/sf.png',
        'Seattle Seahawks': 'https://a.espncdn.com/i/teamlogos/nfl/500/sea.png',
        'Tampa Bay Buccaneers': 'https://a.espncdn.com/i/teamlogos/nfl/500/tb.png',
        'Tennessee Titans': 'https://a.espncdn.com/i/teamlogos/nfl/500/ten.png',
        'Washington Commanders': 'https://a.espncdn.com/i/teamlogos/nfl/500/wsh.png'
      };

      // Helper function to format market names
      const formatMarketName = (marketType: string): string => {
        return marketType
          .replace(/_/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      };

      // Transform the new format to the expected PlayerProp format
      const playerProps: PlayerProp[] = [];
      
      if (data.events) {
        for (const event of data.events) {
          if (event.player_props) {
            for (const prop of event.player_props) {
              // Only include props with actual odds
              if (prop.best_over || prop.best_under) {
                // Helper function to parse odds string to number
                const parseOdds = (oddsStr: string | null): number | null => {
                  if (!oddsStr) return null;
                  const cleanStr = oddsStr.replace(/[+]/g, '');
                  const num = parseFloat(cleanStr);
                  return isNaN(num) ? null : num;
                };

                playerProps.push({
                  id: `${prop.market_type}-${prop.player_name}`,
                  playerId: prop.player_name,
                  playerName: prop.player_name,
                  team: event.home_team?.long || 'Unknown',
                  opponent: event.away_team?.long || 'Unknown',
                  propType: formatMarketName(prop.market_type),
                  line: prop.line,
                  overOdds: parseOdds(prop.best_over?.price),
                  underOdds: parseOdds(prop.best_under?.price),
                  confidence: 0.5, // Default fallback
                  expectedValue: 0, // Default fallback
                  gameDate: event.start_time?.split('T')[0] || today,
                  gameTime: event.start_time || new Date().toISOString(),
                  sport: sport,
                  availableSportsbooks: prop.books?.map((book: any) => book.bookmaker) || [],
                  teamAbbr: event.home_team?.short || 'UNK',
                  opponentAbbr: event.away_team?.short || 'UNK',
                  gameId: event.eventID,
                  allSportsbookOdds: prop.books?.map((book: any) => ({
                    sportsbook: book.bookmaker,
                    odds: parseOdds(book.price) || 0,
                    lastUpdate: new Date().toISOString()
                  })) || [],
                  available: true,
                  awayTeam: event.away_team?.long,
                  homeTeam: event.home_team?.long,
                  betType: 'player_prop',
                  isExactAPIData: true,
                  lastUpdate: new Date().toISOString(),
                  marketName: formatMarketName(prop.market_type),
                  market: formatMarketName(prop.market_type),
                  marketId: prop.market_type,
                  period: 'full_game',
                  statEntity: prop.player_name,
                  // New fields for enhanced display
                  bestOver: prop.best_over,
                  bestUnder: prop.best_under,
                  allBooks: prop.books,
                  homeTeamLogo: nflTeamMap[event.home_team?.long || ''],
                  awayTeamLogo: nflTeamMap[event.away_team?.long || '']
                });
              }
            }
          }
        }
      }

      console.log(`✅ Transformed ${playerProps.length} player props from new endpoint`);
      return playerProps;
      
    } catch (error) {
      console.error('❌ New /api/{league}/player-props endpoint error:', error);
      console.log('🔄 Falling back to legacy /api/player-props endpoint...');
      
      // Fallback to legacy endpoint
      try {
        return await this.getPlayerPropsFromLegacy(sport, forceRefresh);
      } catch (fallbackError) {
        console.error('❌ Legacy fallback also failed:', fallbackError);
        throw fallbackError;
      }
    }
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
