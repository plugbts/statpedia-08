// Player Props Normalized Service
// This service provides a stable interface for the frontend to access normalized player props data
// It replaces direct database queries with the canonical mapping tables

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

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
  status: 'healthy' | 'warning' | 'error';
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
    try {
      let query = supabase
        .from('player_props_normalized')
        .select('*')
        .eq('is_active', true);

      // Apply filters
      if (filter.sport) {
        query = query.eq('sport', filter.sport);
      }
      
      if (filter.player_name) {
        query = query.ilike('player_name', `%${filter.player_name}%`);
      }
      
      if (filter.team_abbrev) {
        query = query.eq('team_abbrev', filter.team_abbrev);
      }
      
      if (filter.market) {
        query = query.ilike('market', `%${filter.market}%`);
      }
      
      if (filter.date_from) {
        query = query.gte('game_date', filter.date_from);
      }
      
      if (filter.date_to) {
        query = query.lte('game_date', filter.date_to);
      }

      // Apply pagination
      if (filter.limit) {
        query = query.limit(filter.limit);
      }
      
      if (filter.offset) {
        query = query.range(filter.offset, filter.offset + (filter.limit || 50) - 1);
      }

      // Order by game date descending
      query = query.order('game_date', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching normalized player props:', error);
        throw new Error(`Failed to fetch player props: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('PlayerPropsNormalizedService.getPlayerProps error:', error);
      throw error;
    }
  }

  /**
   * Get player props for a specific player
   */
  static async getPlayerPropsByPlayer(playerName: string, sport?: string): Promise<NormalizedPlayerProp[]> {
    return this.getPlayerProps({
      player_name: playerName,
      sport,
      limit: 50
    });
  }

  /**
   * Get player props for a specific team
   */
  static async getPlayerPropsByTeam(teamAbbrev: string, sport?: string): Promise<NormalizedPlayerProp[]> {
    return this.getPlayerProps({
      team_abbrev: teamAbbrev,
      sport,
      limit: 100
    });
  }

  /**
   * Get player props for a specific market type
   */
  static async getPlayerPropsByMarket(market: string, sport?: string): Promise<NormalizedPlayerProp[]> {
    return this.getPlayerProps({
      market,
      sport,
      limit: 100
    });
  }

  /**
   * Get today's player props
   */
  static async getTodaysPlayerProps(sport?: string): Promise<NormalizedPlayerProp[]> {
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
  static async getPlayerPropsByDateRange(
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
  static async runGoldenDatasetTests(): Promise<{
    test_name: string;
    status: string;
    error_message: string;
    props_found: number;
    execution_time_ms: number;
  }[]> {
    try {
      const { data, error } = await supabase.rpc('run_golden_dataset_tests');

      if (error) {
        console.error('Error running golden dataset tests:', error);
        throw new Error(`Failed to run tests: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('PlayerPropsNormalizedService.runGoldenDatasetTests error:', error);
      throw error;
    }
  }

  /**
   * Check ingestion health status
   */
  static async getIngestionHealth(): Promise<IngestionHealth> {
    try {
      const { data, error } = await supabase.rpc('get_ingestion_health_status');

      if (error) {
        console.error('Error checking ingestion health:', error);
        throw new Error(`Failed to check health: ${error.message}`);
      }

      return data?.[0] || {
        status: 'error',
        message: 'Unable to determine ingestion health',
        details: { batches: 0, success_rate: 0, errors: 0 }
      };
    } catch (error) {
      console.error('PlayerPropsNormalizedService.getIngestionHealth error:', error);
      throw error;
    }
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
    try {
      const { data, error } = await supabase.rpc('get_ingestion_summary');

      if (error) {
        console.error('Error getting ingestion summary:', error);
        throw new Error(`Failed to get summary: ${error.message}`);
      }

      return data?.[0] || {
        total_props: 0,
        resolved_players: 0,
        failed_players: 0,
        total_teams: 0,
        total_sportsbooks: 0,
        last_updated: new Date().toISOString()
      };
    } catch (error) {
      console.error('PlayerPropsNormalizedService.getIngestionSummary error:', error);
      throw error;
    }
  }

  /**
   * Check if a player exists in the canonical mapping
   */
  static async resolvePlayer(playerName: string, teamAbbrev?: string, league?: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('resolve_player', {
        player_input: playerName,
        team_id_input: teamAbbrev ? await this.resolveTeam(teamAbbrev, league) : null,
        league_input: league
      });

      if (error) {
        console.error('Error resolving player:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('PlayerPropsNormalizedService.resolvePlayer error:', error);
      return null;
    }
  }

  /**
   * Check if a team exists in the canonical mapping
   */
  static async resolveTeam(teamAbbrev: string, league?: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('resolve_team', {
        team_input: teamAbbrev,
        league_input: league
      });

      if (error) {
        console.error('Error resolving team:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('PlayerPropsNormalizedService.resolveTeam error:', error);
      return null;
    }
  }

  /**
   * Get all available teams for a league
   */
  static async getTeams(league?: string): Promise<{
    id: string;
    league: string;
    name: string;
    abbreviation: string;
    logo_url: string;
    aliases: string[];
  }[]> {
    try {
      let query = supabase
        .from('teams')
        .select('*')
        .eq('is_active', true);

      if (league) {
        query = query.eq('league', league);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching teams:', error);
        throw new Error(`Failed to fetch teams: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('PlayerPropsNormalizedService.getTeams error:', error);
      throw error;
    }
  }

  /**
   * Get all available sportsbooks
   */
  static async getSportsbooks(): Promise<{
    id: string;
    name: string;
    api_key: string;
    is_active: boolean;
  }[]> {
    try {
      const { data, error } = await supabase
        .from('sportsbooks')
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching sportsbooks:', error);
        throw new Error(`Failed to fetch sportsbooks: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('PlayerPropsNormalizedService.getSportsbooks error:', error);
      throw error;
    }
  }
}

export default PlayerPropsNormalizedService;
