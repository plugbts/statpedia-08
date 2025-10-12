/**
 * Hasura-based Player Props API Service with Prop Limits
 * 
 * This service connects to our Hasura GraphQL API with Cloudflare Workers
 * to fetch player props data from our Neon database, respecting league prop limits.
 */

import { LEAGUE_PROP_CAPS } from '../lib/leagues';

interface PlayerProp {
  id?: string;
  playerId?: string;
  playerName: string;
  player_id?: string | number;
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
  // Enhanced fields
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

class HasuraPlayerPropsAPI {
  private readonly graphqlEndpoint = 'https://statpedia-proxy.statpedia.workers.dev/v1/graphql';

  /**
   * Get player props from Hasura GraphQL API with league-specific limits
   */
  async getPlayerProps(
    sport: string = 'nba', 
    forceRefresh: boolean = false, 
    date?: string, 
    view?: string
  ): Promise<PlayerProp[]> {
    try {
      console.log(`📊 HASURA: Fetching player props for ${sport} from GraphQL API...`);
      
      const startTime = Date.now();
      
      // Get prop limit for the sport
      const sportKey = sport.toLowerCase();
      const propLimit = LEAGUE_PROP_CAPS[sportKey] || LEAGUE_PROP_CAPS.nfl; // Default to NFL limit
      
      console.log(`📊 HASURA: Using prop limit of ${propLimit} for ${sport}`);
      
      // Build GraphQL query using new clean schema with relationships and limit
      const query = `
        query GetPlayerProps($limit: Int) {
          props(limit: $limit) {
            id
            prop_type
            line
            odds
            game_id
            player {
              id
              name
              position
              team {
                id
                name
                abbreviation
                logo_url
                league {
                  id
                  code
                  name
                }
              }
            }
            team {
              id
              name
              abbreviation
              logo_url
              league {
                id
                code
                name
              }
            }
          }
        }
      `;

      const response = await fetch(this.graphqlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: {
            limit: propLimit
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.errors) {
        console.error('GraphQL errors:', result.errors);
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
      }

      const dbProps = result.data?.props || [];
      console.log(`📊 HASURA: Retrieved ${dbProps.length} props from GraphQL API (limit: ${propLimit})`);

      if (dbProps.length === 0) {
        console.log(`⚠️ HASURA: No props found for ${sport}`);
        return [];
      }

      // Transform GraphQL data to frontend format using real relationships
      const frontendProps: PlayerProp[] = dbProps.map((prop: any) => {
        const player = prop.player;
        const team = player?.team || prop.team;
        const league = team?.league;
        
        return {
          id: prop.id,
          playerId: player?.id,
          playerName: player?.name || 'Unknown Player',
          team: team?.abbreviation || 'UNK',
          teamAbbr: team?.abbreviation || 'UNK',
          opponent: 'OPP', // TODO: Add opponent relationship
          opponentAbbr: 'OPP',
          gameId: prop.game_id,
          sport: league?.code?.toLowerCase() || sport.toLowerCase(),
          propType: prop.prop_type || 'Unknown',
          line: prop.line ? parseFloat(prop.line) : null,
          overOdds: prop.odds ? parseInt(prop.odds.replace(/[^\d-]/g, '')) : null,
          underOdds: prop.odds ? parseInt(prop.odds.replace(/[^\d-]/g, '')) : null,
          gameDate: new Date().toISOString().split('T')[0],
          gameTime: new Date().toISOString(),
          availableSportsbooks: ['StatPedia'],
          allSportsbookOdds: [{
            sportsbook: 'StatPedia',
            odds: prop.odds ? parseInt(prop.odds.replace(/[^\d-]/g, '')) : 0,
            lastUpdate: new Date().toISOString()
          }],
          available: true,
          isExactAPIData: true,
          lastUpdate: new Date().toISOString(),
          market: prop.prop_type,
          marketName: prop.prop_type,
          confidence: 75,
          position: player?.position,
          homeTeamLogo: team?.logo_url || '',
          awayTeamLogo: team?.logo_url || '',
        };
      });

      // Filter by sport only - show all props for debugging
      const filteredProps = frontendProps.filter((prop) => {
        // Filter by sport if specified
        if (sport && prop.sport !== sport.toLowerCase()) {
          return false;
        }
        
        return true;
      });

      // Debug info about prop relationships
      const propsWithPlayers = filteredProps.filter(p => p.playerName && p.playerName !== 'Unknown Player');
      const propsWithoutPlayers = filteredProps.filter(p => !p.playerName || p.playerName === 'Unknown Player');
      
      console.log(`📊 HASURA: Filtered to ${filteredProps.length} props for ${sport} (limit applied: ${propLimit})`);
      console.log(`🔍 DEBUG: ${propsWithPlayers.length} props with players, ${propsWithoutPlayers.length} props without players`);
      
      if (filteredProps.length > 0) {
        console.log(`🔍 DEBUG: Sample prop - Player: "${filteredProps[0].playerName}", Team: "${filteredProps[0].team}", Prop: "${filteredProps[0].propType}"`);
      }

      const responseTime = Date.now() - startTime;
      console.log(`✅ HASURA: Successfully retrieved ${filteredProps.length} props (${responseTime}ms)`);

      return filteredProps;

    } catch (error) {
      console.error('❌ HASURA: Failed to fetch player props:', error);
      throw error;
    }
  }

  /**
   * Get cached player props (faster response) - backward compatibility
   */
  async getCachedPlayerProps(sport: string = 'nba'): Promise<PlayerProp[]> {
    return await this.getPlayerProps(sport, false);
  }

  /**
   * Force refresh player props (bypass cache) - backward compatibility
   */
  async refreshPlayerProps(sport: string = 'nba'): Promise<PlayerProp[]> {
    return await this.getPlayerProps(sport, true);
  }

  /**
   * Get player props with pagination (respects league limits)
   */
  async getPlayerPropsPaginated(
    sport: string = 'nba',
    page: number = 1,
    pageSize: number = 50,
    forceRefresh: boolean = false,
    date?: string,
    view?: string
  ): Promise<{ props: PlayerProp[]; total: number; hasMore: boolean; page: number; pageSize: number }> {
    // Get league-specific limit
    const sportKey = sport.toLowerCase();
    const leagueLimit = LEAGUE_PROP_CAPS[sportKey] || LEAGUE_PROP_CAPS.nfl;
    
    // Adjust page size to not exceed league limit
    const adjustedPageSize = Math.min(pageSize, leagueLimit);
    
    const allProps = await this.getPlayerProps(sport, forceRefresh, date, view);
    return this.paginateProps(allProps, page, adjustedPageSize);
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
   * Get multiple sports at once (respects individual league limits)
   */
  async getAllSportsPlayerProps(): Promise<Record<string, PlayerProp[]>> {
    const sports = ['nba', 'nfl', 'mlb', 'nhl'];
    const results: Record<string, PlayerProp[]> = {};
    
    // Fetch all sports in parallel, each respecting its own limit
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
   * Get prop types available
   */
  async getPropTypes(sport?: string): Promise<any[]> {
    try {
      // Build query with optional sport filtering
      const whereClause = sport ? `(where: { sport: { _eq: "${sport}" } })` : '';
      const query = `
        query GetPropTypes {
          prop_types${whereClause} {
            id
            name
            category
            sport
            unit
            is_over_under
          }
        }
      `;

      const response = await fetch(this.graphqlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query
        }),
      });

      const result = await response.json();
      return result.data?.prop_types || [];
    } catch (error) {
      console.error('Failed to fetch prop types:', error);
      return [];
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(this.graphqlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hasura-admin-secret': process.env.HASURA_ADMIN_SECRET || '',
        },
        body: JSON.stringify({
          query: '{ props(limit: 1) { id } }'
        }),
      });

      if (!response.ok) return false;
      
      const result = await response.json();
      return !result.errors;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Get league prop limits for display
   */
  getLeaguePropLimits(): Record<string, number> {
    return { ...LEAGUE_PROP_CAPS };
  }

  /**
   * Get prop limit for specific league
   */
  getPropLimitForLeague(league: string): number {
    return LEAGUE_PROP_CAPS[league.toLowerCase()] || LEAGUE_PROP_CAPS.nfl;
  }
}

// Export singleton instance
export const hasuraPlayerPropsAPI = new HasuraPlayerPropsAPI();

// Export types for use in components
export type { PlayerProp, APIResponse };
