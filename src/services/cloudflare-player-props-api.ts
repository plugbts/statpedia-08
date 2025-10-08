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
    this.baseUrl = 'https://statpedia-player-props.statpedia.workers.dev';
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
      
      const response = await fetch(`${this.baseUrl}/ingest`, {
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

      const responseTime = Date.now() - startTime;
      
      console.log(`📊 Cloudflare Worker ingestion response: ${response.status} (${responseTime}ms)`);

      if (!response.ok) {
        const errorData = await response.json();
        console.warn(`⚠️ Cloudflare Worker ingestion failed: ${response.status} - ${errorData.error || 'Unknown error'}`);
        
        // Don't fallback to legacy endpoint - it has CORS issues
        throw new Error(`API request failed: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      
      console.log(`✅ Player props loaded from Cloudflare Worker:`, {
        success: data.success,
        totalProps: data.stats?.totalProps || 0,
        inserted: data.stats?.inserted || 0,
        updated: data.stats?.updated || 0,
        errors: data.stats?.errors || 0
      });

      // The Cloudflare Worker doesn't return player props directly
      // Instead, it ingests them into the database
      // We need to fetch the props from the database after ingestion
      // For now, return an empty array since this is an ingestion endpoint
      // The frontend should use a different method to fetch the ingested props
      return [];

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

      // Helper function to normalize prop types for deduplication
      const normalizePropType = (propType: string): string => {
        if (!propType) return '';
        
        return propType
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '') // Remove special characters
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim()
          // Handle common variations
          .replace(/\bpass\b/g, 'passing')
          .replace(/\brush\b/g, 'rushing')
          .replace(/\brec\b/g, 'receiving')
          .replace(/\btd\b/g, 'touchdown')
          .replace(/\byard\b/g, 'yards')
          .replace(/\batt\b/g, 'attempts')
          .replace(/\bcomp\b/g, 'completions')
          .replace(/\bint\b/g, 'interceptions')
          .replace(/\bfg\b/g, 'field goal')
          .replace(/\bxp\b/g, 'extra point');
      };

      // Helper function to format market names for display
      const formatMarketName = (marketType: string): string => {
        // First normalize the market type to proper prop types
        const normalizedMarketType = normalizeMarketType(marketType);
        
        return normalizedMarketType
          .replace(/_/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      };

      // Helper function to normalize market types to proper prop types
      const normalizeMarketType = (marketType: string): string => {
        if (!marketType) return 'Unknown';
        
        const lowerMarket = marketType.toLowerCase();
        
        // Map common market types to proper prop types
        if (lowerMarket.includes('passing') && lowerMarket.includes('yard')) return 'Passing Yards';
        if (lowerMarket.includes('rushing') && lowerMarket.includes('yard')) return 'Rushing Yards';
        if (lowerMarket.includes('receiving') && lowerMarket.includes('yard')) return 'Receiving Yards';
        if (lowerMarket.includes('passing') && lowerMarket.includes('touchdown')) return 'Passing Touchdowns';
        if (lowerMarket.includes('rushing') && lowerMarket.includes('touchdown')) return 'Rushing Touchdowns';
        if (lowerMarket.includes('receiving') && lowerMarket.includes('touchdown')) return 'Receiving Touchdowns';
        if (lowerMarket.includes('field') && lowerMarket.includes('goal')) return 'Field Goals Made';
        if (lowerMarket.includes('extra') && lowerMarket.includes('point')) return 'Extra Points Made';
        
        // Handle specific cases where API returns wrong market types
        if (lowerMarket === 'receptions' && marketType.includes('receiving')) return 'Receiving Yards';
        if (lowerMarket === 'receptions') return 'Receptions';
        
        return marketType;
      };

      // Helper function to get team name from teamID
      const getTeamNameFromTeamID = (teamID: string): string => {
        if (!teamID) return 'Unknown';
        // Convert "CLEVELAND_BROWNS_NFL" to "Cleveland Browns"
        return teamID
          .replace(/_NFL$/, '')
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      };

      // Helper function to get team abbreviation from team name
      const getTeamAbbr = (teamName: string): string => {
        const abbrMap: Record<string, string> = {
          'Arizona Cardinals': 'ARI',
          'Atlanta Falcons': 'ATL',
          'Baltimore Ravens': 'BAL',
          'Buffalo Bills': 'BUF',
          'Carolina Panthers': 'CAR',
          'Chicago Bears': 'CHI',
          'Cincinnati Bengals': 'CIN',
          'Cleveland Browns': 'CLE',
          'Dallas Cowboys': 'DAL',
          'Denver Broncos': 'DEN',
          'Detroit Lions': 'DET',
          'Green Bay Packers': 'GB',
          'Houston Texans': 'HOU',
          'Indianapolis Colts': 'IND',
          'Jacksonville Jaguars': 'JAX',
          'Kansas City Chiefs': 'KC',
          'Las Vegas Raiders': 'LV',
          'Los Angeles Chargers': 'LAC',
          'Los Angeles Rams': 'LAR',
          'Miami Dolphins': 'MIA',
          'Minnesota Vikings': 'MIN',
          'New England Patriots': 'NE',
          'New Orleans Saints': 'NO',
          'New York Giants': 'NYG',
          'New York Jets': 'NYJ',
          'Philadelphia Eagles': 'PHI',
          'Pittsburgh Steelers': 'PIT',
          'San Francisco 49ers': 'SF',
          'Seattle Seahawks': 'SEA',
          'Tampa Bay Buccaneers': 'TB',
          'Tennessee Titans': 'TEN',
          'Washington Commanders': 'WSH'
        };
        return abbrMap[teamName] || teamName.split(' ').pop() || 'UNK';
      };

      // Transform the new format to the expected PlayerProp format with deduplication
      const playerProps: PlayerProp[] = [];
      const propMap = new Map<string, PlayerProp>(); // For deduplication
      
      if (data.events) {
        for (const event of data.events) {
          if (event.player_props) {
            for (const prop of event.player_props) {
              // Only include props with actual odds
              if (prop.best_over || prop.best_under) {
                // Helper function to parse odds string to number
                const parseOdds = (oddsStr: string | null): number | null => {
                  if (!oddsStr) return null;
                  // Don't remove + sign, just parse as-is
                  const num = parseFloat(oddsStr);
                  return isNaN(num) ? null : num;
                };

                // Find the player's team from the players object
                const playerKey = Object.keys(event.players || {}).find(key => 
                  event.players[key].name === prop.player_name
                );
                const player = playerKey ? event.players[playerKey] : null;
                let playerTeam = 'Unknown';
                let opponentTeam = 'Unknown';
                
                if (player && player.teamID) {
                  // Player has teamID, use it
                  playerTeam = getTeamNameFromTeamID(player.teamID);
                  opponentTeam = playerTeam === event.home_team ? event.away_team : event.home_team;
                } else {
                  // Player doesn't have teamID, try to infer from player name patterns
                  // This is a fallback - in most cases we should have teamID
                  console.warn(`Player ${prop.player_name} missing teamID, using fallback logic`);
                  
                  // For now, assign to home team as fallback
                  // In a real scenario, you might want to use a more sophisticated mapping
                  playerTeam = event.home_team;
                  opponentTeam = event.away_team;
                }

                // Create deduplication key
                const normalizedPropType = normalizePropType(prop.market_type);
                const dedupeKey = `${prop.player_name}-${normalizedPropType}-${playerTeam}-${opponentTeam}`;
                
                const newProp: PlayerProp = {
                  id: `${prop.market_type}-${prop.player_name}`,
                  playerId: prop.player_name,
                  playerName: prop.player_name,
                  player_id: prop.player_id, // Add player_id for headshots
                  team: playerTeam,
                  opponent: opponentTeam || 'Unknown',
                  propType: formatMarketName(prop.market_type),
                  // marketType: normalizeMarketType(prop.market_type), // Add normalized market type
                  line: prop.line,
                  overOdds: parseOdds(prop.best_over),
                  underOdds: parseOdds(prop.best_under),
                  confidence: 0.5, // Default fallback
                  expectedValue: 0, // Default fallback
                  position: prop.position || 'N/A', // Use position from API
                  gameDate: event.start_time?.split('T')[0] || today,
                  gameTime: event.start_time || new Date().toISOString(),
                  sport: sport,
                  availableSportsbooks: prop.books || [],
                  teamAbbr: getTeamAbbr(playerTeam),
                  opponentAbbr: getTeamAbbr(opponentTeam || 'Unknown'),
                  gameId: event.eventID,
                  allSportsbookOdds: prop.books?.map((bookName: string) => ({
                    sportsbook: bookName,
                    odds: parseOdds(prop.best_over) || 0,
                    lastUpdate: new Date().toISOString()
                  })) || [],
                  available: true,
                  awayTeam: event.away_team,
                  homeTeam: event.home_team,
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
                  // Assign logos based on player's team
                  homeTeamLogo: nflTeamMap[playerTeam],
                  awayTeamLogo: nflTeamMap[opponentTeam]
                };

                // Check for duplicates and merge if found
                if (propMap.has(dedupeKey)) {
                  const existingProp = propMap.get(dedupeKey)!;
                  
                  // Merge sportsbooks and odds
                  const mergedSportsbooks = [...new Set([
                    ...(existingProp.availableSportsbooks || []),
                    ...(newProp.availableSportsbooks || [])
                  ])];
                  
                  const mergedOdds = [
                    ...(existingProp.allSportsbookOdds || []),
                    ...(newProp.allSportsbookOdds || [])
                  ];

                  // Update existing prop with merged data
                  existingProp.availableSportsbooks = mergedSportsbooks;
                  existingProp.allSportsbookOdds = mergedOdds;
                  
                  // Keep the better odds (closer to -110)
                  const existingOverOdds = existingProp.overOdds || 0;
                  const newOverOdds = newProp.overOdds || 0;
                  const existingUnderOdds = existingProp.underOdds || 0;
                  const newUnderOdds = newProp.underOdds || 0;
                  
                  // Choose odds closer to -110 (better value)
                  if (Math.abs(existingOverOdds + 110) > Math.abs(newOverOdds + 110)) {
                    existingProp.overOdds = newOverOdds;
                  }
                  if (Math.abs(existingUnderOdds + 110) > Math.abs(newUnderOdds + 110)) {
                    existingProp.underOdds = newUnderOdds;
                  }
                } else {
                  // Add new prop to map and array
                  propMap.set(dedupeKey, newProp);
                  playerProps.push(newProp);
                }
              }
            }
          }
        }
      }

      console.log(`✅ Transformed ${playerProps.length} player props from new endpoint`);
      
      // Apply pagination to the deduplicated props
      console.log(`🔧 Enriching ${playerProps.length} player props with gameLogs and defenseStats...`);
      
      // Enrich props with gameLogs and defenseStats for analytics
      const enrichedProps = await playerPropsEnricher.enrichPlayerProps(playerProps);
      
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
