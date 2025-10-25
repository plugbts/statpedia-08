// Player Props Normalized Service
// This service provides a stable interface for the frontend to access normalized player props data
// It replaces direct database queries with the canonical mapping tables

// Supabase removed: this service is deprecated. Export stubs to prevent usage.
const removed = () => {
  throw new Error(
    "player-props-normalized-service is removed. Use Neon/Hasura + Cloudflare Worker APIs.",
  );
};

export interface NormalizedPlayerProp {
  // Core prop information
  prop_id: string;
  game_id: string;
  game_date: string;
  market: string;
  line: number;
  odds: number;
  ev_percent: number;

  // Player information (canonical)
  player_id: string;
  player_name: string;
  api_player_id: string;
  position: string;

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
  week: number;

  // Enrichment stats
  streak: string;
  rating: number;
  matchup_rank: number;
  l5: number;
  l10: number;
  l20: number;

  // Metadata
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlayerPropsFilter {
  sport?: string;
  player_name?: string;
  team_abbrev?: string;
  market?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface IngestionHealth {
  status: "healthy" | "warning" | "error";
  message: string;
  details: {
    batches: number;
    success_rate: number;
    errors: number;
  };
}

export class PlayerPropsNormalizedService {
  /**
   * Get normalized player props with stable data resolution
   */
  static async getPlayerProps(filter: PlayerPropsFilter = {}): Promise<NormalizedPlayerProp[]> {
    // Supabase removed – return empty list to avoid breaking callers
    return [];
  }

  /**
   * Get player props for a specific player
   */
  static async getPlayerPropsByPlayer(
    playerName: string,
    sport?: string,
  ): Promise<NormalizedPlayerProp[]> {
    return this.getPlayerProps({
      player_name: playerName,
      sport,
      limit: 50,
    });
  }

  /**
   * Get player props for a specific team
   */
  static async getPlayerPropsByTeam(
    teamAbbrev: string,
    sport?: string,
  ): Promise<NormalizedPlayerProp[]> {
    return this.getPlayerProps({
      team_abbrev: teamAbbrev,
      sport,
      limit: 100,
    });
  }

  /**
   * Get player props for a specific market type
   */
  static async getPlayerPropsByMarket(
    market: string,
    sport?: string,
  ): Promise<NormalizedPlayerProp[]> {
    return this.getPlayerProps({
      market,
      sport,
      limit: 100,
    });
  }

  /**
   * Get today's player props
   */
  static async getTodaysPlayerProps(sport?: string): Promise<NormalizedPlayerProp[]> {
    const today = new Date().toISOString().split("T")[0];
    return this.getPlayerProps({
      date_from: today,
      date_to: today,
      sport,
      limit: 200,
    });
  }

  /**
   * Get player props for a specific date range
   */
  static async getPlayerPropsByDateRange(
    dateFrom: string,
    dateTo: string,
    sport?: string,
  ): Promise<NormalizedPlayerProp[]> {
    return this.getPlayerProps({
      date_from: dateFrom,
      date_to: dateTo,
      sport,
      limit: 500,
    });
  }

  /**
   * Run golden dataset tests to ensure data integrity
   */
  static async runGoldenDatasetTests(): Promise<
    {
      test_name: string;
      status: string;
      error_message: string;
      props_found: number;
      execution_time_ms: number;
    }[]
  > {
    // Supabase removed – return empty list
    return [];
  }

  /**
   * Check ingestion health status
   */
  static async getIngestionHealth(): Promise<IngestionHealth> {
    return {
      status: "warning",
      message: "Ingestion health RPC removed with Supabase; use Neon/Hasura monitoring",
      details: { batches: 0, success_rate: 0, errors: 0 },
    };
  }

  /**
   * Get ingestion summary statistics
   */
  static async getIngestionSummary(): Promise<{
    total_props: number;
    resolved_players: number;
    failed_players: number;
    total_teams: number;
    total_sportsbooks: number;
    last_updated: string;
  }> {
    return {
      total_props: 0,
      resolved_players: 0,
      failed_players: 0,
      total_teams: 0,
      total_sportsbooks: 0,
      last_updated: new Date().toISOString(),
    };
  }

  /**
   * Check if a player exists in the canonical mapping
   */
  static async resolvePlayer(
    playerName: string,
    teamAbbrev?: string,
    league?: string,
  ): Promise<string | null> {
    return null;
  }

  /**
   * Check if a team exists in the canonical mapping
   */
  static async resolveTeam(teamAbbrev: string, league?: string): Promise<string | null> {
    return null;
  }

  /**
   * Get all available teams for a league
   */
  static async getTeams(league?: string): Promise<
    {
      id: string;
      league: string;
      name: string;
      abbreviation: string;
      logo_url: string;
      aliases: string[];
    }[]
  > {
    return [];
  }

  /**
   * Get all available sportsbooks
   */
  static async getSportsbooks(): Promise<
    {
      id: string;
      name: string;
      api_key: string;
      is_active: boolean;
    }[]
  > {
    return [];
  }
}

export default PlayerPropsNormalizedService;
