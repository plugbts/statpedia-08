import { supabase } from "./supabase";
import { LEAGUE_PROP_CAPS } from "./leagues";

export interface PropMatchup {
  prop_id: string;
  league: string;
  season: string;
  player_id: string;
  game_id: string;
  prop_date: string;
  prop_type: string;
  line: number;
  rolling_10: number;
  season_avg: number;
  season_std: number;
  offense_rank: number;
  avg_offense: number;
  off_pct: number;
  defense_rank: number;
  avg_defense: number;
  def_ease_pct: number;
  line_z: number;
  line_pct: number;
  pace_pct: number;
  matchup_grade: number;
}

export interface GameMatchup {
  league: string;
  season: string;
  game_id: string;
  prop_date: string;
  prop_type: string;
  team_a: string;
  team_b: string;
  team_a_grade: number;
  team_b_grade: number;
  game_prop_grade: number;
}

export interface PlayerPropsWithLogs {
  prop_id: string;
  player_id: string;
  game_id: string;
  league: string;
  season: string;
  prop_date: string;
  prop_type: string;
  line: number;
  odds: number;
  game_log_id: string;
  stat_value: number;
  game_date: string;
  team_id: string;
  opponent_team_id: string;
}

export async function getPropMatchups(
  league: string, 
  dateISO: string, 
  propType?: string, 
  limit?: number
): Promise<PropMatchup[]> {
  const cap = limit || LEAGUE_PROP_CAPS[league.toLowerCase()] || 100;
  
  let query = supabase
    .from("mv_prop_matchups")
    .select("*")
    .eq("league", league.toLowerCase())
    .eq("prop_date", dateISO);

  if (propType) {
    query = query.eq("prop_type", propType.toLowerCase());
  }

  const { data, error } = await query
    .order("matchup_grade", { ascending: false })
    .limit(cap);
    
  if (error) {
    console.error("Error fetching prop matchups:", error);
    throw error;
  }
  
  return data ?? [];
}

export async function getGameMatchups(
  league: string, 
  dateISO: string, 
  propType?: string
): Promise<GameMatchup[]> {
  let query = supabase
    .from("mv_game_matchups")
    .select("*")
    .eq("league", league.toLowerCase())
    .eq("prop_date", dateISO);

  if (propType) {
    query = query.eq("prop_type", propType.toLowerCase());
  }

  const { data, error } = await query
    .order("game_prop_grade", { ascending: false });
    
  if (error) {
    console.error("Error fetching game matchups:", error);
    throw error;
  }
  
  return data ?? [];
}

export async function getPlayerPropsWithLogs(
  league: string, 
  dateISO: string, 
  limit?: number
): Promise<PlayerPropsWithLogs[]> {
  const cap = limit || LEAGUE_PROP_CAPS[league.toLowerCase()] || 100;
  
  const { data, error } = await supabase
    .from("player_props_api_view")
    .select("*")
    .eq("league", league.toLowerCase())
    .eq("prop_date", dateISO)
    .limit(cap);
    
  if (error) {
    console.error("Error fetching player props with logs:", error);
    throw error;
  }
  
  return data ?? [];
}

export async function getPlayerBaselines(
  league: string,
  season: string,
  playerId: string,
  propType?: string
) {
  let query = supabase
    .from("mv_player_baselines")
    .select("*")
    .eq("league", league.toLowerCase())
    .eq("season", season)
    .eq("player_id", playerId);

  if (propType) {
    query = query.eq("prop_type", propType.toLowerCase());
  }

  const { data, error } = await query;
  
  if (error) {
    console.error("Error fetching player baselines:", error);
    throw error;
  }
  
  return data ?? [];
}

export async function getTeamPropRanks(
  league: string,
  propType?: string
) {
  let query = supabase
    .from("mv_team_prop_ranks")
    .select("*")
    .eq("league", league.toLowerCase());

  if (propType) {
    query = query.eq("prop_type", propType.toLowerCase());
  }

  const { data, error } = await query
    .order("offense_rank");
    
  if (error) {
    console.error("Error fetching team prop ranks:", error);
    throw error;
  }
  
  return data ?? [];
}

// Helper function to refresh analytics views
export async function refreshAnalyticsViews(): Promise<void> {
  const { error } = await supabase.rpc('refresh_analytics_views');
  
  if (error) {
    console.error("Error refreshing analytics views:", error);
    throw error;
  }
}

// Utility function to format matchup grade for display
export function formatMatchupGrade(grade: number): string {
  if (grade >= 80) return "Excellent";
  if (grade >= 60) return "Good";
  if (grade >= 40) return "Average";
  if (grade >= 20) return "Poor";
  return "Very Poor";
}

// Utility function to get matchup grade color
export function getMatchupGradeColor(grade: number): string {
  if (grade >= 80) return "#22c55e"; // green
  if (grade >= 60) return "#84cc16"; // lime
  if (grade >= 40) return "#f59e0b"; // amber
  if (grade >= 20) return "#ef4444"; // red
  return "#991b1b"; // dark red
}
