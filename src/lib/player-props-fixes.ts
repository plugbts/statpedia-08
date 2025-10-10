// Frontend version of player props fixes
import { supabase } from '../integrations/supabase/client';

// Utility: calculate EV% from hit rate + odds
function calcEV(hitRate: number | null, odds: number | null): number | null {
  if (hitRate == null || odds == null) return null;
  
  // Convert American odds to implied probability
  const implied = odds > 0 ? 100 / (odds + 100) : -odds / (-odds + 100);
  const ev = hitRate * (1 / implied) - (1 - hitRate);
  return Math.round(ev * 100); // percent
}

// Utility: streaks (last N games overs)
function calcStreak(values: number[], line: number, n = 5): string {
  if (!values.length) return "-";
  const lastN = values.slice(-n);
  const hits = lastN.filter(v => v >= line).length;
  return `${hits}/${lastN.length}`;
}

// Utility: get recent stat values for streak calculation
async function getRecentStatValues(
  playerId: string, 
  propType: string, 
  league: string, 
  currentDate: string, 
  limit = 10
): Promise<number[]> {
  try {
    const { data, error } = await supabase
      .from("player_game_logs")
      .select("value")
      .eq("player_id", playerId)
      .eq("prop_type", propType)
      .eq("sport", league.toLowerCase())
      .lt("date", currentDate)
      .order("date", { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error("Error fetching recent stats:", error);
      return [];
    }
    
    return (data || []).map(row => parseFloat(row.value) || 0);
  } catch (error) {
    console.error("Error in getRecentStatValues:", error);
    return [];
  }
}

// Main fetch with fixes - frontend version
export async function getFixedPlayerProps(league: string, dateISO: string, limit = 150) {
  const { data, error } = await supabase
    .from("player_props_api_view")
    .select(`
      prop_id,
      player_id,
      prop_type,
      line,
      odds,
      stat_value,
      game_date,
      team_id,
      opponent_team_id,
      league,
      season,
      prop_date,
      players!inner(display_name),
      teams!inner(abbreviation, logo_url)
    `)
    .eq("league", league.toLowerCase())
    .eq("prop_date", dateISO)
    .limit(limit);

  if (error) throw error;

  // Process each row with fixes
  const fixedData = await Promise.all((data ?? []).map(async (row: any) => {
    // 1. Clean player name (no prop concatenation)
    const playerName = row.players?.display_name ?? row.player_id;

    // 2. Team abbreviation + logo
    const teamAbbr = row.teams?.abbreviation ?? "UNK";
    const teamLogo = row.teams?.logo_url ?? null;

    // 3. Line & odds from proplines (already in view)
    const line = row.line ?? null;
    const odds = row.odds ?? null;

    // 4. EV% (needs hit rate — calculate from rolling average if available)
    const hitRate = row.rolling_10 && row.line
      ? Math.min(1, Math.max(0, row.rolling_10 / row.line))
      : null;
    const evPercent = calcEV(hitRate, odds);

    // 5. Streaks (get recent values for calculation)
    const recentValues = await getRecentStatValues(
      row.player_id, 
      row.prop_type, 
      row.league, 
      row.prop_date
    );
    const streak = recentValues.length > 0 
      ? calcStreak(recentValues, line || 0)
      : "-";

    return {
      ...row,
      playerName,
      teamAbbr,
      teamLogo,
      line,
      odds,
      evPercent,
      streak,
      // Additional computed fields
      hitRate,
      recentValues,
    };
  }));

  return fixedData;
}

// Enhanced version that also includes analytics data
export async function getFixedPlayerPropsWithAnalytics(league: string, dateISO: string, limit = 150) {
  // Get the fixed props data
  const fixedProps = await getFixedPlayerProps(league, dateISO, limit);
  
  // Try to get analytics data if available
  try {
    const { data: analyticsData, error: analyticsError } = await supabase
      .from("mv_prop_matchups")
      .select(`
        prop_id,
        matchup_grade,
        offense_rank,
        defense_rank,
        rolling_10,
        season_avg,
        season_std
      `)
      .eq("league", league.toLowerCase())
      .eq("prop_date", dateISO)
      .limit(limit);

    if (!analyticsError && analyticsData) {
      // Create a lookup map for analytics data
      const analyticsMap = new Map(
        analyticsData.map(analytics => [analytics.prop_id, analytics])
      );

      // Merge analytics data with fixed props
      return fixedProps.map(prop => ({
        ...prop,
        analytics: analyticsMap.get(prop.prop_id) || null,
      }));
    }
  } catch (error) {
    console.warn("Could not fetch analytics data:", error);
  }

  // Return props without analytics if analytics fetch failed
  return fixedProps.map(prop => ({
    ...prop,
    analytics: null,
  }));
}

// Utility function to get team info
export async function getTeamInfo(teamId: string) {
  try {
    const { data, error } = await supabase
      .from("teams")
      .select("abbreviation, logo_url, full_name")
      .eq("id", teamId)
      .single();

    if (error) {
      console.error("Error fetching team info:", error);
      return { abbreviation: "UNK", logo_url: null, full_name: "Unknown" };
    }

    return data;
  } catch (error) {
    console.error("Error in getTeamInfo:", error);
    return { abbreviation: "UNK", logo_url: null, full_name: "Unknown" };
  }
}

// Utility function to get player info
export async function getPlayerInfo(playerId: string) {
  try {
    const { data, error } = await supabase
      .from("players")
      .select("display_name, first_name, last_name")
      .eq("id", playerId)
      .single();

    if (error) {
      console.error("Error fetching player info:", error);
      return { display_name: playerId, first_name: null, last_name: null };
    }

    return data;
  } catch (error) {
    console.error("Error in getPlayerInfo:", error);
    return { display_name: playerId, first_name: null, last_name: null };
  }
}

// Helper function to format EV percentage for display
export function formatEVPercent(ev: number | null): string {
  if (ev === null) return "-";
  const sign = ev > 0 ? "+" : "";
  return `${sign}${ev.toFixed(1)}%`;
}

// Helper function to get EV color class
export function getEVColorClass(ev: number | null): string {
  if (ev === null) return "text-muted-foreground";
  if (ev >= 10) return "text-green-600";
  if (ev >= 5) return "text-green-500";
  if (ev >= 0) return "text-yellow-500";
  if (ev >= -5) return "text-orange-500";
  return "text-red-500";
}

// Helper function to format streak for display
export function formatStreak(streak: string): string {
  if (streak === "-") return "-";
  const [hits, total] = streak.split("/");
  const hitRate = total ? (parseInt(hits) / parseInt(total) * 100).toFixed(0) : "0";
  return `${streak} (${hitRate}%)`;
}
