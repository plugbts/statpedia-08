/**
 * Hasura-based Player Props API Service
 * 
 * This service connects to our Hasura GraphQL API with Cloudflare Workers
 * to fetch player props data from our Neon database.
 */

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
   * Get player props from Hasura GraphQL API
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
      
      // Build GraphQL query
      const query = `
        query GetPlayerProps {
          player_props {
            id
            line
            odds
            over_odds
            under_odds
            created_at
            player {
              id
              first_name
              last_name
              position
              team {
                id
                name
                abbreviation
                city
              }
            }
            propType {
              id
              name
              category
              sport
              unit
              is_over_under
            }
            game {
              id
              game_date
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
          query
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

      const dbProps = result.data?.player_props || [];
      console.log(`📊 HASURA: Retrieved ${dbProps.length} props from GraphQL API`);

      if (dbProps.length === 0) {
        console.log(`⚠️ HASURA: No props found for ${sport}`);
        return [];
      }

      // Transform GraphQL data to frontend format
      const frontendProps: PlayerProp[] = dbProps.map((prop: any) => {
        const playerName = `${prop.player?.first_name || ''} ${prop.player?.last_name || ''}`.trim();
        const team = prop.player?.team?.abbreviation || 'UNK';
        // For now, we'll use a simple opponent since we don't have the relationship set up
        const opponent = 'OPP';
        
        return {
          id: prop.id,
          playerId: prop.player?.id,
          playerName: playerName || 'Unknown Player',
          team: team,
          teamAbbr: team,
          opponent: opponent,
          opponentAbbr: opponent,
          gameId: prop.game?.id,
          sport: prop.propType?.sport || 'nba',
          propType: prop.propType?.name || 'Unknown',
          line: prop.line ? parseFloat(prop.line) : null,
          overOdds: prop.over_odds ? parseInt(prop.over_odds) : null,
          underOdds: prop.under_odds ? parseInt(prop.under_odds) : null,
          gameDate: prop.game?.game_date || new Date().toISOString().split('T')[0],
          gameTime: prop.game?.game_date,
          availableSportsbooks: ['StatPedia'],
          allSportsbookOdds: [{
            sportsbook: 'StatPedia',
            odds: prop.over_odds ? parseInt(prop.over_odds) : 0,
            lastUpdate: new Date().toISOString()
          }],
          available: true,
          isExactAPIData: true,
          lastUpdate: prop.created_at,
          market: prop.propType?.name,
          marketName: prop.propType?.name,
          // Additional analytics data
          confidence: 75, // Default confidence
          position: prop.player?.position,
          homeTeamLogo: '', // TODO: Add logo URLs
          awayTeamLogo: '', // TODO: Add logo URLs
        };
      });

      // Filter by sport if specified
      const filteredProps = frontendProps.filter((prop) => {
        if (sport && prop.sport !== sport.toLowerCase()) {
          return false;
        }
        return true;
      });

      console.log(`📊 HASURA: Filtered to ${filteredProps.length} props for ${sport}`);

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
   * Get player props with pagination
   */
  async getPlayerPropsPaginated(
    sport: string = 'nba',
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
   * Get multiple sports at once
   */
  async getAllSportsPlayerProps(): Promise<Record<string, PlayerProp[]>> {
    const sports = ['nba', 'nfl', 'mlb', 'nhl'];
    const results: Record<string, PlayerProp[]> = {};
    
    // Fetch all sports in parallel
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
      const query = `
        query GetPropTypes {
          prop_types {
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
        },
        body: JSON.stringify({
          query: '{ prop_types { id } }'
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
}

// Export singleton instance
export const hasuraPlayerPropsAPI = new HasuraPlayerPropsAPI();

// Export types for use in components
export type { PlayerProp, APIResponse };
