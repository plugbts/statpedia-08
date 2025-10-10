// worker/fixes.ts
import { supabaseFetch } from "./supabaseFetch";

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
  env: any,
  playerId: string, 
  propType: string, 
  league: string, 
  currentDate: string, 
  limit = 10
): Promise<number[]> {
  try {
    const params = new URLSearchParams({
      player_id: `eq.${playerId}`,
      prop_type: `eq.${propType}`,
      sport: `eq.${league.toLowerCase()}`,
      date: `lt.${currentDate}`,
      order: 'date.desc',
      limit: limit.toString(),
      select: 'value'
    });

    const response = await supabaseFetch(env, `player_game_logs?${params}`);
    
    if (!response.ok) {
      console.error("Error fetching recent stats:", await response.text());
      return [];
    }
    
    const data = await response.json();
    return (data || []).map((row: any) => parseFloat(row.value) || 0);
  } catch (error) {
    console.error("Error in getRecentStatValues:", error);
    return [];
  }
}

// Main fetch with fixes
export async function getFixedPlayerProps(env: any, league: string, dateISO: string, limit = 150) {
  const params = new URLSearchParams({
    league: `eq.${league.toLowerCase()}`,
    prop_date: `eq.${dateISO}`,
    limit: limit.toString(),
    select: `
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
      teams!inner(abbreviation,logo_url)
    `.replace(/\s+/g, '')
  });

  const response = await supabaseFetch(env, `player_props_api_view?${params}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch player props: ${await response.text()}`);
  }

  const data = await response.json();

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
      env,
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
export async function getFixedPlayerPropsWithAnalytics(env: any, league: string, dateISO: string, limit = 150) {
  // Get the fixed props data
  const fixedProps = await getFixedPlayerProps(env, league, dateISO, limit);
  
  // Try to get analytics data if available
  try {
    const analyticsParams = new URLSearchParams({
      league: `eq.${league.toLowerCase()}`,
      prop_date: `eq.${dateISO}`,
      limit: limit.toString(),
      select: `
        prop_id,
        matchup_grade,
        offense_rank,
        defense_rank,
        rolling_10,
        season_avg,
        season_std
      `.replace(/\s+/g, '')
    });

    const analyticsResponse = await supabaseFetch(env, `mv_prop_matchups?${analyticsParams}`);
    
    if (analyticsResponse.ok) {
      const analyticsData = await analyticsResponse.json();
      
      // Create a lookup map for analytics data
      const analyticsMap = new Map(
        analyticsData.map((analytics: any) => [analytics.prop_id, analytics])
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
export async function getTeamInfo(env: any, teamId: string) {
  try {
    const params = new URLSearchParams({
      id: `eq.${teamId}`,
      select: 'abbreviation,logo_url,full_name'
    });

    const response = await supabaseFetch(env, `teams?${params}`);
    
    if (!response.ok) {
      console.error("Error fetching team info:", await response.text());
      return { abbreviation: "UNK", logo_url: null, full_name: "Unknown" };
    }

    const data = await response.json();
    return data[0] || { abbreviation: "UNK", logo_url: null, full_name: "Unknown" };
  } catch (error) {
    console.error("Error in getTeamInfo:", error);
    return { abbreviation: "UNK", logo_url: null, full_name: "Unknown" };
  }
}

// Utility function to get player info
export async function getPlayerInfo(env: any, playerId: string) {
  try {
    const params = new URLSearchParams({
      id: `eq.${playerId}`,
      select: 'display_name,first_name,last_name'
    });

    const response = await supabaseFetch(env, `players?${params}`);
    
    if (!response.ok) {
      console.error("Error fetching player info:", await response.text());
      return { display_name: playerId, first_name: null, last_name: null };
    }

    const data = await response.json();
    return data[0] || { display_name: playerId, first_name: null, last_name: null };
  } catch (error) {
    console.error("Error in getPlayerInfo:", error);
    return { display_name: playerId, first_name: null, last_name: null };
  }
}
