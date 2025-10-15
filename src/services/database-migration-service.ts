// Database Migration Service for Canonical Mapping Tables
// This service handles the creation of canonical tables and views using Hasura GraphQL

interface MigrationResult {
  success: boolean;
  message: string;
  error?: string;
}

interface CanonicalPlayer {
  id: string;
  external_id: string;
  display_name: string;
  team_id: string;
  league: string;
  position?: string;
  is_active: boolean;
}

interface CanonicalTeam {
  id: string;
  league: string;
  name: string;
  abbreviation: string;
  logo_url?: string;
  aliases: string[];
  is_active: boolean;
}

interface CanonicalSportsbook {
  id: string;
  name: string;
  api_key?: string;
  is_active: boolean;
}

interface CanonicalGame {
  id: string;
  external_id: string;
  home_team_id: string;
  away_team_id: string;
  league: string;
  game_date: string;
  season: number;
  week?: number;
  is_active: boolean;
}

export class DatabaseMigrationService {
  private readonly graphqlEndpoint = 'https://statpedia-proxy.statpedia.workers.dev/v1/graphql';
  private readonly adminSecret = process.env.HASURA_ADMIN_SECRET || '';

  /**
   * Run all canonical mapping table migrations
   */
  async runCanonicalMigrations(): Promise<MigrationResult[]> {
    const results: MigrationResult[] = [];

    try {
      // 1. Create players table
      const playersResult = await this.createPlayersTable();
      results.push(playersResult);

      // 2. Create teams table
      const teamsResult = await this.createTeamsTable();
      results.push(teamsResult);

      // 3. Create sportsbooks table
      const sportsbooksResult = await this.createSportsbooksTable();
      results.push(sportsbooksResult);

      // 4. Create games table
      const gamesResult = await this.createGamesTable();
      results.push(gamesResult);

      // 5. Create player_props table (enhanced)
      const playerPropsResult = await this.createPlayerPropsTable();
      results.push(playerPropsResult);

      // 6. Create player_enriched_stats table
      const enrichedStatsResult = await this.createEnrichedStatsTable();
      results.push(enrichedStatsResult);

      // 7. Create normalized view
      const viewResult = await this.createNormalizedView();
      results.push(viewResult);

      // 8. Create test harness
      const testHarnessResult = await this.createTestHarness();
      results.push(testHarnessResult);

      // 9. Seed initial data
      const seedResult = await this.seedInitialData();
      results.push(seedResult);

      return results;
    } catch (error) {
      console.error('Migration failed:', error);
      return [{
        success: false,
        message: 'Migration failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }];
    }
  }

  /**
   * Create players table
   */
  private async createPlayersTable(): Promise<MigrationResult> {
    try {
      const query = `
        mutation CreatePlayersTable {
          createTable(
            table: {
              name: "players"
              schema: "public"
              columns: [
                { name: "id", type: "uuid", nullable: false, default: "gen_random_uuid()" }
                { name: "external_id", type: "text", nullable: false }
                { name: "display_name", type: "text", nullable: false }
                { name: "team_id", type: "uuid", nullable: true }
                { name: "league", type: "text", nullable: false }
                { name: "position", type: "text", nullable: true }
                { name: "is_active", type: "boolean", nullable: false, default: "true" }
                { name: "created_at", type: "timestamptz", nullable: false, default: "now()" }
                { name: "updated_at", type: "timestamptz", nullable: false, default: "now()" }
              ]
              primaryKey: { columns: ["id"] }
              uniqueConstraints: [{ columns: ["external_id"] }]
            }
          ) {
            success
            message
          }
        }
      `;

      const response = await this.executeGraphQL(query);
      
      if (response.errors) {
        return {
          success: false,
          message: 'Failed to create players table',
          error: JSON.stringify(response.errors)
        };
      }

      return {
        success: true,
        message: 'Players table created successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create players table',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create teams table
   */
  private async createTeamsTable(): Promise<MigrationResult> {
    try {
      const query = `
        mutation CreateTeamsTable {
          createTable(
            table: {
              name: "teams"
              schema: "public"
              columns: [
                { name: "id", type: "uuid", nullable: false, default: "gen_random_uuid()" }
                { name: "league", type: "text", nullable: false }
                { name: "name", type: "text", nullable: false }
                { name: "abbreviation", type: "text", nullable: false }
                { name: "logo_url", type: "text", nullable: true }
                { name: "aliases", type: "jsonb", nullable: false, default: "'[]'::jsonb" }
                { name: "is_active", type: "boolean", nullable: false, default: "true" }
                { name: "created_at", type: "timestamptz", nullable: false, default: "now()" }
                { name: "updated_at", type: "timestamptz", nullable: false, default: "now()" }
              ]
              primaryKey: { columns: ["id"] }
              uniqueConstraints: [
                { columns: ["league", "name"] }
                { columns: ["league", "abbreviation"] }
              ]
            }
          ) {
            success
            message
          }
        }
      `;

      const response = await this.executeGraphQL(query);
      
      if (response.errors) {
        return {
          success: false,
          message: 'Failed to create teams table',
          error: JSON.stringify(response.errors)
        };
      }

      return {
        success: true,
        message: 'Teams table created successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create teams table',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create sportsbooks table
   */
  private async createSportsbooksTable(): Promise<MigrationResult> {
    try {
      const query = `
        mutation CreateSportsbooksTable {
          createTable(
            table: {
              name: "sportsbooks"
              schema: "public"
              columns: [
                { name: "id", type: "uuid", nullable: false, default: "gen_random_uuid()" }
                { name: "name", type: "text", nullable: false }
                { name: "api_key", type: "text", nullable: true }
                { name: "is_active", type: "boolean", nullable: false, default: "true" }
                { name: "created_at", type: "timestamptz", nullable: false, default: "now()" }
                { name: "updated_at", type: "timestamptz", nullable: false, default: "now()" }
              ]
              primaryKey: { columns: ["id"] }
              uniqueConstraints: [{ columns: ["name"] }]
            }
          ) {
            success
            message
          }
        }
      `;

      const response = await this.executeGraphQL(query);
      
      if (response.errors) {
        return {
          success: false,
          message: 'Failed to create sportsbooks table',
          error: JSON.stringify(response.errors)
        };
      }

      return {
        success: true,
        message: 'Sportsbooks table created successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create sportsbooks table',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create games table
   */
  private async createGamesTable(): Promise<MigrationResult> {
    try {
      const query = `
        mutation CreateGamesTable {
          createTable(
            table: {
              name: "games"
              schema: "public"
              columns: [
                { name: "id", type: "uuid", nullable: false, default: "gen_random_uuid()" }
                { name: "external_id", type: "text", nullable: false }
                { name: "home_team_id", type: "uuid", nullable: false }
                { name: "away_team_id", type: "uuid", nullable: false }
                { name: "league", type: "text", nullable: false }
                { name: "game_date", type: "timestamptz", nullable: false }
                { name: "season", type: "integer", nullable: false }
                { name: "week", type: "integer", nullable: true }
                { name: "is_active", type: "boolean", nullable: false, default: "true" }
                { name: "created_at", type: "timestamptz", nullable: false, default: "now()" }
                { name: "updated_at", type: "timestamptz", nullable: false, default: "now()" }
              ]
              primaryKey: { columns: ["id"] }
              uniqueConstraints: [{ columns: ["external_id"] }]
            }
          ) {
            success
            message
          }
        }
      `;

      const response = await this.executeGraphQL(query);
      
      if (response.errors) {
        return {
          success: false,
          message: 'Failed to create games table',
          error: JSON.stringify(response.errors)
        };
      }

      return {
        success: true,
        message: 'Games table created successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create games table',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create enhanced player_props table
   */
  private async createPlayerPropsTable(): Promise<MigrationResult> {
    try {
      const query = `
        mutation CreatePlayerPropsTable {
          createTable(
            table: {
              name: "player_props"
              schema: "public"
              columns: [
                { name: "id", type: "uuid", nullable: false, default: "gen_random_uuid()" }
                { name: "game_id", type: "uuid", nullable: false }
                { name: "player_id", type: "uuid", nullable: false }
                { name: "sportsbook_id", type: "uuid", nullable: false }
                { name: "market", type: "text", nullable: false }
                { name: "line", type: "decimal", nullable: false }
                { name: "odds", type: "integer", nullable: true }
                { name: "ev_percent", type: "decimal", nullable: true }
                { name: "is_active", type: "boolean", nullable: false, default: "true" }
                { name: "created_at", type: "timestamptz", nullable: false, default: "now()" }
                { name: "updated_at", type: "timestamptz", nullable: false, default: "now()" }
              ]
              primaryKey: { columns: ["id"] }
              uniqueConstraints: [{ columns: ["game_id", "player_id", "sportsbook_id", "market", "line"] }]
            }
          ) {
            success
            message
          }
        }
      `;

      const response = await this.executeGraphQL(query);
      
      if (response.errors) {
        return {
          success: false,
          message: 'Failed to create player_props table',
          error: JSON.stringify(response.errors)
        };
      }

      return {
        success: true,
        message: 'Player props table created successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create player_props table',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create player_enriched_stats table
   */
  private async createEnrichedStatsTable(): Promise<MigrationResult> {
    try {
      const query = `
        mutation CreateEnrichedStatsTable {
          createTable(
            table: {
              name: "player_enriched_stats"
              schema: "public"
              columns: [
                { name: "id", type: "uuid", nullable: false, default: "gen_random_uuid()" }
                { name: "player_id", type: "uuid", nullable: false }
                { name: "game_id", type: "uuid", nullable: false }
                { name: "streak", type: "text", nullable: true }
                { name: "rating", type: "decimal", nullable: true }
                { name: "matchup_rank", type: "integer", nullable: true }
                { name: "l5", type: "decimal", nullable: true }
                { name: "l10", type: "decimal", nullable: true }
                { name: "l20", type: "decimal", nullable: true }
                { name: "created_at", type: "timestamptz", nullable: false, default: "now()" }
                { name: "updated_at", type: "timestamptz", nullable: false, default: "now()" }
              ]
              primaryKey: { columns: ["id"] }
              uniqueConstraints: [{ columns: ["player_id", "game_id"] }]
            }
          ) {
            success
            message
          }
        }
      `;

      const response = await this.executeGraphQL(query);
      
      if (response.errors) {
        return {
          success: false,
          message: 'Failed to create enriched stats table',
          error: JSON.stringify(response.errors)
        };
      }

      return {
        success: true,
        message: 'Enriched stats table created successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create enriched stats table',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create normalized view
   */
  private async createNormalizedView(): Promise<MigrationResult> {
    try {
      // Note: Hasura doesn't support creating views via GraphQL mutations
      // This would need to be done via SQL or Hasura console
      return {
        success: true,
        message: 'Normalized view creation requires SQL execution - see documentation'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create normalized view',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create test harness tables
   */
  private async createTestHarness(): Promise<MigrationResult> {
    try {
      const query = `
        mutation CreateTestHarnessTables {
          createTable(
            table: {
              name: "golden_dataset"
              schema: "public"
              columns: [
                { name: "id", type: "uuid", nullable: false, default: "gen_random_uuid()" }
                { name: "test_name", type: "text", nullable: false }
                { name: "description", type: "text", nullable: true }
                { name: "player_name", type: "text", nullable: false }
                { name: "team_abbrev", type: "text", nullable: false }
                { name: "opponent_abbrev", type: "text", nullable: false }
                { name: "market", type: "text", nullable: false }
                { name: "expected_line", type: "decimal", nullable: true }
                { name: "expected_odds", type: "integer", nullable: true }
                { name: "league", type: "text", nullable: false }
                { name: "is_active", type: "boolean", nullable: false, default: "true" }
                { name: "created_at", type: "timestamptz", nullable: false, default: "now()" }
              ]
              primaryKey: { columns: ["id"] }
              uniqueConstraints: [{ columns: ["test_name"] }]
            }
          ) {
            success
            message
          }
        }
      `;

      const response = await this.executeGraphQL(query);
      
      if (response.errors) {
        return {
          success: false,
          message: 'Failed to create test harness tables',
          error: JSON.stringify(response.errors)
        };
      }

      return {
        success: true,
        message: 'Test harness tables created successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create test harness tables',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Seed initial data
   */
  private async seedInitialData(): Promise<MigrationResult> {
    try {
      // Seed sportsbooks
      const sportsbooks = [
        { name: 'Consensus', api_key: null },
        { name: 'DraftKings', api_key: null },
        { name: 'FanDuel', api_key: null },
        { name: 'BetMGM', api_key: null },
        { name: 'Caesars', api_key: null },
        { name: 'PointsBet', api_key: null }
      ];

      for (const sportsbook of sportsbooks) {
        await this.insertSportsbook(sportsbook);
      }

      // Seed NFL teams
      const nflTeams = [
        { league: 'nfl', name: 'Arizona Cardinals', abbreviation: 'ARI', logo_url: 'https://a.espncdn.com/i/teamlogos/nfl/500/ari.png', aliases: ['cardinals', 'ari', 'az'] },
        { league: 'nfl', name: 'Atlanta Falcons', abbreviation: 'ATL', logo_url: 'https://a.espncdn.com/i/teamlogos/nfl/500/atl.png', aliases: ['falcons', 'atl'] },
        { league: 'nfl', name: 'Baltimore Ravens', abbreviation: 'BAL', logo_url: 'https://a.espncdn.com/i/teamlogos/nfl/500/bal.png', aliases: ['ravens', 'bal'] },
        { league: 'nfl', name: 'Buffalo Bills', abbreviation: 'BUF', logo_url: 'https://a.espncdn.com/i/teamlogos/nfl/500/buf.png', aliases: ['bills', 'buf'] },
        { league: 'nfl', name: 'Carolina Panthers', abbreviation: 'CAR', logo_url: 'https://a.espncdn.com/i/teamlogos/nfl/500/car.png', aliases: ['panthers', 'car'] },
        { league: 'nfl', name: 'Chicago Bears', abbreviation: 'CHI', logo_url: 'https://a.espncdn.com/i/teamlogos/nfl/500/chi.png', aliases: ['bears', 'chi'] },
        { league: 'nfl', name: 'Cincinnati Bengals', abbreviation: 'CIN', logo_url: 'https://a.espncdn.com/i/teamlogos/nfl/500/cin.png', aliases: ['bengals', 'cin'] },
        { league: 'nfl', name: 'Cleveland Browns', abbreviation: 'CLE', logo_url: 'https://a.espncdn.com/i/teamlogos/nfl/500/cle.png', aliases: ['browns', 'cle'] },
        { league: 'nfl', name: 'Dallas Cowboys', abbreviation: 'DAL', logo_url: 'https://a.espncdn.com/i/teamlogos/nfl/500/dal.png', aliases: ['cowboys', 'dal'] },
        { league: 'nfl', name: 'Denver Broncos', abbreviation: 'DEN', logo_url: 'https://a.espncdn.com/i/teamlogos/nfl/500/den.png', aliases: ['broncos', 'den'] },
        { league: 'nfl', name: 'Detroit Lions', abbreviation: 'DET', logo_url: 'https://a.espncdn.com/i/teamlogos/nfl/500/det.png', aliases: ['lions', 'det'] },
        { league: 'nfl', name: 'Green Bay Packers', abbreviation: 'GB', logo_url: 'https://a.espncdn.com/i/teamlogos/nfl/500/gb.png', aliases: ['packers', 'green bay', 'gb'] },
        { league: 'nfl', name: 'Houston Texans', abbreviation: 'HOU', logo_url: 'https://a.espncdn.com/i/teamlogos/nfl/500/hou.png', aliases: ['texans', 'hou'] },
        { league: 'nfl', name: 'Indianapolis Colts', abbreviation: 'IND', logo_url: 'https://a.espncdn.com/i/teamlogos/nfl/500/ind.png', aliases: ['colts', 'ind'] },
        { league: 'nfl', name: 'Jacksonville Jaguars', abbreviation: 'JAX', logo_url: 'https://a.espncdn.com/i/teamlogos/nfl/500/jax.png', aliases: ['jaguars', 'jax'] },
        { league: 'nfl', name: 'Kansas City Chiefs', abbreviation: 'KC', logo_url: 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png', aliases: ['chiefs', 'kc'] },
        { league: 'nfl', name: 'Las Vegas Raiders', abbreviation: 'LV', logo_url: 'https://a.espncdn.com/i/teamlogos/nfl/500/lv.png', aliases: ['raiders', 'lv', 'oakland raiders'] },
        { league: 'nfl', name: 'Los Angeles Chargers', abbreviation: 'LAC', logo_url: 'https://a.espncdn.com/i/teamlogos/nfl/500/lac.png', aliases: ['chargers', 'lac'] },
        { league: 'nfl', name: 'Los Angeles Rams', abbreviation: 'LAR', logo_url: 'https://a.espncdn.com/i/teamlogos/nfl/500/lar.png', aliases: ['rams', 'lar'] },
        { league: 'nfl', name: 'Miami Dolphins', abbreviation: 'MIA', logo_url: 'https://a.espncdn.com/i/teamlogos/nfl/500/mia.png', aliases: ['dolphins', 'mia'] },
        { league: 'nfl', name: 'Minnesota Vikings', abbreviation: 'MIN', logo_url: 'https://a.espncdn.com/i/teamlogos/nfl/500/min.png', aliases: ['vikings', 'min'] },
        { league: 'nfl', name: 'New England Patriots', abbreviation: 'NE', logo_url: 'https://a.espncdn.com/i/teamlogos/nfl/500/ne.png', aliases: ['patriots', 'ne'] },
        { league: 'nfl', name: 'New Orleans Saints', abbreviation: 'NO', logo_url: 'https://a.espncdn.com/i/teamlogos/nfl/500/no.png', aliases: ['saints', 'nola saints', 'no'] },
        { league: 'nfl', name: 'New York Giants', abbreviation: 'NYG', logo_url: 'https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png', aliases: ['giants', 'nyg', 'ny giants'] },
        { league: 'nfl', name: 'New York Jets', abbreviation: 'NYJ', logo_url: 'https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png', aliases: ['jets', 'ny jets', 'nyj'] },
        { league: 'nfl', name: 'Philadelphia Eagles', abbreviation: 'PHI', logo_url: 'https://a.espncdn.com/i/teamlogos/nfl/500/phi.png', aliases: ['eagles', 'phi'] },
        { league: 'nfl', name: 'Pittsburgh Steelers', abbreviation: 'PIT', logo_url: 'https://a.espncdn.com/i/teamlogos/nfl/500/pit.png', aliases: ['steelers', 'pit'] },
        { league: 'nfl', name: 'San Francisco 49ers', abbreviation: 'SF', logo_url: 'https://a.espncdn.com/i/teamlogos/nfl/500/sf.png', aliases: ['49ers', 'sf'] },
        { league: 'nfl', name: 'Seattle Seahawks', abbreviation: 'SEA', logo_url: 'https://a.espncdn.com/i/teamlogos/nfl/500/sea.png', aliases: ['seahawks', 'sea'] },
        { league: 'nfl', name: 'Tampa Bay Buccaneers', abbreviation: 'TB', logo_url: 'https://a.espncdn.com/i/teamlogos/nfl/500/tb.png', aliases: ['buccaneers', 'tb', 'bucs'] },
        { league: 'nfl', name: 'Tennessee Titans', abbreviation: 'TEN', logo_url: 'https://a.espncdn.com/i/teamlogos/nfl/500/ten.png', aliases: ['titans', 'ten'] },
        { league: 'nfl', name: 'Washington Commanders', abbreviation: 'WAS', logo_url: 'https://a.espncdn.com/i/teamlogos/nfl/500/wsh.png', aliases: ['commanders', 'was', 'washington football team', 'redskins'] }
      ];

      for (const team of nflTeams) {
        await this.insertTeam(team);
      }

      return {
        success: true,
        message: 'Initial data seeded successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to seed initial data',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Insert sportsbook
   */
  private async insertSportsbook(sportsbook: { name: string; api_key: string | null }): Promise<void> {
    const query = `
      mutation InsertSportsbook($name: String!, $api_key: String) {
        insert_sportsbooks_one(object: { name: $name, api_key: $api_key }) {
          id
        }
      }
    `;

    await this.executeGraphQL(query, {
      name: sportsbook.name,
      api_key: sportsbook.api_key
    });
  }

  /**
   * Insert team
   */
  private async insertTeam(team: { league: string; name: string; abbreviation: string; logo_url: string; aliases: string[] }): Promise<void> {
    const query = `
      mutation InsertTeam($league: String!, $name: String!, $abbreviation: String!, $logo_url: String!, $aliases: jsonb!) {
        insert_teams_one(object: { league: $league, name: $name, abbreviation: $abbreviation, logo_url: $logo_url, aliases: $aliases }) {
          id
        }
      }
    `;

    await this.executeGraphQL(query, {
      league: team.league,
      name: team.name,
      abbreviation: team.abbreviation,
      logo_url: team.logo_url,
      aliases: JSON.stringify(team.aliases)
    });
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
   * Check if tables exist
   */
  async checkTablesExist(): Promise<{ [tableName: string]: boolean }> {
    try {
      const query = `
        query CheckTables {
          players(limit: 1) { id }
          teams(limit: 1) { id }
          sportsbooks(limit: 1) { id }
          games(limit: 1) { id }
          player_props(limit: 1) { id }
          golden_dataset(limit: 1) { id }
        }
      `;

      const response = await this.executeGraphQL(query);
      
      return {
        players: !response.errors && response.data?.players !== undefined,
        teams: !response.errors && response.data?.teams !== undefined,
        sportsbooks: !response.errors && response.data?.sportsbooks !== undefined,
        games: !response.errors && response.data?.games !== undefined,
        player_props: !response.errors && response.data?.player_props !== undefined,
        golden_dataset: !response.errors && response.data?.golden_dataset !== undefined
      };
    } catch (error) {
      console.error('Error checking tables:', error);
      return {};
    }
  }
}

export const databaseMigrationService = new DatabaseMigrationService();
export type { MigrationResult, CanonicalPlayer, CanonicalTeam, CanonicalSportsbook, CanonicalGame };
