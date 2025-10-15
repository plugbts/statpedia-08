// Hasura Player Props Normalized Service
// This service provides a stable interface for accessing normalized player props data via Hasura GraphQL

interface NormalizedPlayerProp {
  // Core prop information
  prop_id: string;
  game_id: string;
  game_date: string;
  market: string;
  line: number;
  odds: number;
  ev_percent?: number;
  
  // Player information (canonical)
  player_id: string;
  player_name: string;
  api_player_id: string;
  position?: string;
  
  // Team information (canonical)
  team_id: string;
  team_name: string;
  team_abbrev: string;
  team_logo: string;
  
  // Opponent information (canonical)
  opponent_id: string;
  opponent_name: string;
  opponent_abbrev: string;
  opponent_logo: string;
  
  // Sportsbook information (canonical)
  sportsbook_id: string;
  sportsbook_name: string;
  
  // Game information
  sport: string;
  season: number;
  week?: number;
  
  // Enrichment stats
  streak?: string;
  rating?: number;
  matchup_rank?: number;
  l5?: number;
  l10?: number;
  l20?: number;
  
  // Metadata
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PlayerPropsFilter {
  sport?: string;
  player_name?: string;
  team_abbrev?: string;
  market?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

interface IngestionHealth {
  status: 'healthy' | 'warning' | 'error';
  message: string;
  details: {
    batches: number;
    success_rate: number;
    errors: number;
  };
}

export class HasuraPlayerPropsNormalizedService {
  private readonly graphqlEndpoint = 'https://statpedia-proxy.statpedia.workers.dev/v1/graphql';
  private readonly adminSecret = process.env.HASURA_ADMIN_SECRET || '';

  /**
   * Get normalized player props with stable data resolution
   */
  async getPlayerProps(filter: PlayerPropsFilter = {}): Promise<NormalizedPlayerProp[]> {
    try {
      // Build GraphQL query for normalized data
      const query = `
        query GetNormalizedPlayerProps($limit: Int, $offset: Int, $sport: String, $player_name: String, $team_abbrev: String, $market: String, $date_from: timestamptz, $date_to: timestamptz) {
          player_props_normalized(
            limit: $limit,
            offset: $offset,
            where: {
              ${filter.sport ? 'sport: { _eq: $sport },' : ''}
              ${filter.player_name ? 'player_name: { _ilike: $player_name },' : ''}
              ${filter.team_abbrev ? 'team_abbrev: { _eq: $team_abbrev },' : ''}
              ${filter.market ? 'market: { _ilike: $market },' : ''}
              ${filter.date_from ? 'game_date: { _gte: $date_from },' : ''}
              ${filter.date_to ? 'game_date: { _lte: $date_to },' : ''}
              is_active: { _eq: true }
            },
            order_by: { game_date: desc }
          ) {
            prop_id
            game_id
            game_date
            market
            line
            odds
            ev_percent
            player_id
            player_name
            api_player_id
            position
            team_id
            team_name
            team_abbrev
            team_logo
            opponent_id
            opponent_name
            opponent_abbrev
            opponent_logo
            sportsbook_id
            sportsbook_name
            sport
            season
            week
            streak
            rating
            matchup_rank
            l5
            l10
            l20
            is_active
            created_at
            updated_at
          }
        }
      `;

      const variables = {
        limit: filter.limit || 50,
        offset: filter.offset || 0,
        sport: filter.sport,
        player_name: filter.player_name ? `%${filter.player_name}%` : undefined,
        team_abbrev: filter.team_abbrev,
        market: filter.market ? `%${filter.market}%` : undefined,
        date_from: filter.date_from,
        date_to: filter.date_to
      };

      const response = await this.executeGraphQL(query, variables);

      if (response.errors) {
        console.error('GraphQL errors:', response.errors);
        throw new Error(`Failed to fetch player props: ${JSON.stringify(response.errors)}`);
      }

      return response.data?.player_props_normalized || [];
    } catch (error) {
      console.error('HasuraPlayerPropsNormalizedService.getPlayerProps error:', error);
      throw error;
    }
  }

  /**
   * Get player props for a specific player
   */
  async getPlayerPropsByPlayer(playerName: string, sport?: string): Promise<NormalizedPlayerProp[]> {
    return this.getPlayerProps({
      player_name: playerName,
      sport,
      limit: 50
    });
  }

  /**
   * Get player props for a specific team
   */
  async getPlayerPropsByTeam(teamAbbrev: string, sport?: string): Promise<NormalizedPlayerProp[]> {
    return this.getPlayerProps({
      team_abbrev: teamAbbrev,
      sport,
      limit: 100
    });
  }

  /**
   * Get player props for a specific market type
   */
  async getPlayerPropsByMarket(market: string, sport?: string): Promise<NormalizedPlayerProp[]> {
    return this.getPlayerProps({
      market,
      sport,
      limit: 100
    });
  }

  /**
   * Get today's player props
   */
  async getTodaysPlayerProps(sport?: string): Promise<NormalizedPlayerProp[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.getPlayerProps({
      date_from: today,
      date_to: today,
      sport,
      limit: 200
    });
  }

  /**
   * Get player props for a specific date range
   */
  async getPlayerPropsByDateRange(
    dateFrom: string, 
    dateTo: string, 
    sport?: string
  ): Promise<NormalizedPlayerProp[]> {
    return this.getPlayerProps({
      date_from: dateFrom,
      date_to: dateTo,
      sport,
      limit: 500
    });
  }

  /**
   * Run golden dataset tests to ensure data integrity
   */
  async runGoldenDatasetTests(): Promise<{
    test_name: string;
    status: string;
    error_message: string;
    props_found: number;
    execution_time_ms: number;
  }[]> {
    try {
      const query = `
        query RunGoldenDatasetTests {
          run_golden_dataset_tests {
            test_name
            status
            error_message
            props_found
            execution_time_ms
          }
        }
      `;

      const response = await this.executeGraphQL(query);

      if (response.errors) {
        console.error('Error running golden dataset tests:', response.errors);
        throw new Error(`Failed to run tests: ${JSON.stringify(response.errors)}`);
      }

      return response.data?.run_golden_dataset_tests || [];
    } catch (error) {
      console.error('HasuraPlayerPropsNormalizedService.runGoldenDatasetTests error:', error);
      throw error;
    }
  }

  /**
   * Check ingestion health status
   */
  async getIngestionHealth(): Promise<IngestionHealth> {
    try {
      const query = `
        query GetIngestionHealth {
          get_ingestion_health_status {
            status
            message
            details
          }
        }
      `;

      const response = await this.executeGraphQL(query);

      if (response.errors) {
        console.error('Error checking ingestion health:', response.errors);
        throw new Error(`Failed to check health: ${JSON.stringify(response.errors)}`);
      }

      return response.data?.get_ingestion_health_status?.[0] || {
        status: 'error',
        message: 'Unable to determine ingestion health',
        details: { batches: 0, success_rate: 0, errors: 0 }
      };
    } catch (error) {
      console.error('HasuraPlayerPropsNormalizedService.getIngestionHealth error:', error);
      throw error;
    }
  }

  /**
   * Get ingestion summary statistics
   */
  async getIngestionSummary(): Promise<{
    total_props: number;
    resolved_players: number;
    failed_players: number;
    total_teams: number;
    total_sportsbooks: number;
    last_updated: string;
  }> {
    try {
      const query = `
        query GetIngestionSummary {
          get_ingestion_summary {
            total_props
            resolved_players
            failed_players
            total_teams
            total_sportsbooks
            last_updated
          }
        }
      `;

      const response = await this.executeGraphQL(query);

      if (response.errors) {
        console.error('Error getting ingestion summary:', response.errors);
        throw new Error(`Failed to get summary: ${JSON.stringify(response.errors)}`);
      }

      return response.data?.get_ingestion_summary?.[0] || {
        total_props: 0,
        resolved_players: 0,
        failed_players: 0,
        total_teams: 0,
        total_sportsbooks: 0,
        last_updated: new Date().toISOString()
      };
    } catch (error) {
      console.error('HasuraPlayerPropsNormalizedService.getIngestionSummary error:', error);
      throw error;
    }
  }

  /**
   * Resolve player by external ID or name
   */
  async resolvePlayer(playerName: string, teamAbbrev?: string, league?: string): Promise<string | null> {
    try {
      const query = `
        query ResolvePlayer($player_input: String!, $team_id_input: uuid, $league_input: String) {
          resolve_player(player_input: $player_input, team_id_input: $team_id_input, league_input: $league_input)
        }
      `;

      const response = await this.executeGraphQL(query, {
        player_input: playerName,
        team_id_input: teamAbbrev ? await this.resolveTeam(teamAbbrev, league) : null,
        league_input: league
      });

      if (response.errors) {
        console.error('Error resolving player:', response.errors);
        return null;
      }

      return response.data?.resolve_player;
    } catch (error) {
      console.error('HasuraPlayerPropsNormalizedService.resolvePlayer error:', error);
      return null;
    }
  }

  /**
   * Resolve team by abbreviation
   */
  async resolveTeam(teamAbbrev: string, league?: string): Promise<string | null> {
    try {
      const query = `
        query ResolveTeam($team_input: String!, $league_input: String) {
          resolve_team(team_input: $team_input, league_input: $league_input)
        }
      `;

      const response = await this.executeGraphQL(query, {
        team_input: teamAbbrev,
        league_input: league
      });

      if (response.errors) {
        console.error('Error resolving team:', response.errors);
        return null;
      }

      return response.data?.resolve_team;
    } catch (error) {
      console.error('HasuraPlayerPropsNormalizedService.resolveTeam error:', error);
      return null;
    }
  }

  /**
   * Get all available teams for a league
   */
  async getTeams(league?: string): Promise<{
    id: string;
    league: string;
    name: string;
    abbreviation: string;
    logo_url: string;
    aliases: string[];
  }[]> {
    try {
      const query = `
        query GetTeams($league: String) {
          teams(
            where: {
              ${league ? 'league: { _eq: $league },' : ''}
              is_active: { _eq: true }
            },
            order_by: { name: asc }
          ) {
            id
            league
            name
            abbreviation
            logo_url
            aliases
          }
        }
      `;

      const response = await this.executeGraphQL(query, { league });

      if (response.errors) {
        console.error('Error fetching teams:', response.errors);
        throw new Error(`Failed to fetch teams: ${JSON.stringify(response.errors)}`);
      }

      return response.data?.teams || [];
    } catch (error) {
      console.error('HasuraPlayerPropsNormalizedService.getTeams error:', error);
      throw error;
    }
  }

  /**
   * Get all available sportsbooks
   */
  async getSportsbooks(): Promise<{
    id: string;
    name: string;
    api_key: string;
    is_active: boolean;
  }[]> {
    try {
      const query = `
        query GetSportsbooks {
          sportsbooks(
            where: { is_active: { _eq: true } },
            order_by: { name: asc }
          ) {
            id
            name
            api_key
            is_active
          }
        }
      `;

      const response = await this.executeGraphQL(query);

      if (response.errors) {
        console.error('Error fetching sportsbooks:', response.errors);
        throw new Error(`Failed to fetch sportsbooks: ${JSON.stringify(response.errors)}`);
      }

      return response.data?.sportsbooks || [];
    } catch (error) {
      console.error('HasuraPlayerPropsNormalizedService.getSportsbooks error:', error);
      throw error;
    }
  }

  /**
   * Bulk upsert player props using the canonical mapping tables
   */
  async bulkUpsertPlayerProps(
    propsData: any[],
    batchId?: string
  ): Promise<{
    total_processed: number;
    successful: number;
    failed: number;
    errors: string[];
  }> {
    try {
      const query = `
        mutation BulkUpsertPlayerProps($props_data: jsonb!, $batch_id: String) {
          bulk_upsert_player_props(props_data: $props_data, batch_id: $batch_id) {
            total_processed
            successful
            failed
            errors
          }
        }
      `;

      const response = await this.executeGraphQL(query, {
        props_data: JSON.stringify(propsData),
        batch_id: batchId || `batch_${Date.now()}`
      });

      if (response.errors) {
        console.error('Error bulk upserting player props:', response.errors);
        throw new Error(`Failed to bulk upsert: ${JSON.stringify(response.errors)}`);
      }

      return response.data?.bulk_upsert_player_props?.[0] || {
        total_processed: 0,
        successful: 0,
        failed: 0,
        errors: []
      };
    } catch (error) {
      console.error('HasuraPlayerPropsNormalizedService.bulkUpsertPlayerProps error:', error);
      throw error;
    }
  }

  /**
   * Execute GraphQL query
   */
  private async executeGraphQL(query: string, variables?: any): Promise<any> {
    const response = await fetch(this.graphqlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': this.adminSecret
      },
      body: JSON.stringify({
        query,
        variables
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const query = `
        query HealthCheck {
          player_props_normalized(limit: 1) {
            prop_id
          }
        }
      `;

      const response = await this.executeGraphQL(query);
      return !response.errors;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

export const hasuraPlayerPropsNormalizedService = new HasuraPlayerPropsNormalizedService();
export type { NormalizedPlayerProp, PlayerPropsFilter, IngestionHealth };
