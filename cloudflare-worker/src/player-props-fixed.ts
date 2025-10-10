// Player Props Fixed - Clean, stable player props data
// This module provides clean player props data using the new player_props_fixed view

import { supabaseFetch } from "./supabaseFetch";

// Utility: calculate EV% from hit rate + odds
function calcEV(hitRate: number | null, odds: number | null): number | null {
  if (hitRate == null || odds == null) return null;
  
  // Convert American odds to implied probability
  const implied = odds > 0 ? 100 / (odds + 100) : -odds / (-odds + 100);
  const ev = hitRate * (1 / implied) - (1 - hitRate);
  return Math.round(ev * 100); // percent
}

// Utility: calculate streaks from recent game logs
function calcStreak(values: number[], line: number, n: number): string {
  if (!values.length || n <= 0) return `0/${n}`;
  
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
  limit = 20
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

// Utility: get H2H values vs current opponent
async function getH2HValues(
  env: any,
  playerId: string, 
  propType: string, 
  league: string, 
  opponent: string,
  currentDate: string
): Promise<number[]> {
  try {
    const params = new URLSearchParams({
      player_id: `eq.${playerId}`,
      prop_type: `eq.${propType}`,
      sport: `eq.${league.toLowerCase()}`,
      opponent: `eq.${opponent}`,
      date: `lt.${currentDate}`,
      order: 'date.desc',
      limit: '10',
      select: 'value'
    });

    const response = await supabaseFetch(env, `player_game_logs?${params}`);
    
    if (!response.ok) {
      console.error("Error fetching H2H stats:", await response.text());
      return [];
    }
    
    const data = await response.json();
    return (data || []).map((row: any) => parseFloat(row.value) || 0);
  } catch (error) {
    console.error("Error in getH2HValues:", error);
    return [];
  }
}

// Main function to get fixed player props with streaks and EV%
export async function getPlayerPropsFixed(env: any, league: string, dateISO: string, limit = 150) {
  try {
    // Get base data from the new view
    const params = new URLSearchParams({
      league: `eq.${league.toLowerCase()}`,
      prop_date: `eq.${dateISO}`,
      limit: limit.toString(),
      select: `
        prop_id,
        player_id,
        player_name,
        prop_type,
        line,
        odds,
        team_abbr,
        opponent_abbr,
        team_logo,
        opponent_logo,
        league,
        prop_date
      `.replace(/\s+/g, '')
    });

    const response = await supabaseFetch(env, `player_props_fixed?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch player props: ${await response.text()}`);
    }

    const data = await response.json();

    // Process each row to add streaks and EV%
    const fixedData = await Promise.all((data ?? []).map(async (row: any) => {
      // Get recent values for streak calculation
      const recentValues = await getRecentStatValues(
        env,
        row.player_id, 
        row.prop_type, 
        row.league, 
        row.prop_date,
        20 // Get last 20 games
      );

      // Get H2H values vs current opponent
      const h2hValues = await getH2HValues(
        env,
        row.player_id, 
        row.prop_type, 
        row.league, 
        row.opponent_abbr,
        row.prop_date
      );

      // Calculate streaks
      const last5Streak = calcStreak(recentValues, row.line || 0, 5);
      const last10Streak = calcStreak(recentValues, row.line || 0, 10);
      const last20Streak = calcStreak(recentValues, row.line || 0, 20);
      const h2hStreak = calcStreak(h2hValues, row.line || 0, h2hValues.length);

      // Calculate EV% (simplified - using last 10 games hit rate)
      const last10HitRate = recentValues.length >= 10 
        ? recentValues.slice(-10).filter(v => v >= (row.line || 0)).length / 10
        : null;
      const evPercent = calcEV(last10HitRate, row.odds);

      return {
        ...row,
        // Clean data
        playerName: row.player_name,
        teamAbbr: row.team_abbr,
        opponentAbbr: row.opponent_abbr,
        teamLogo: row.team_logo,
        opponentLogo: row.opponent_logo,
        
        // Streaks
        last5_streak: last5Streak,
        last10_streak: last10Streak,
        last20_streak: last20Streak,
        h2h_streak: h2hStreak,
        
        // EV%
        ev_percent: evPercent,
        
        // Additional useful fields
        overOdds: row.odds,
        underOdds: row.odds, // Same for now
        sportsbook: 'Consensus',
        gameId: row.prop_id,
        date: row.prop_date,
        sport: row.league,
        
        // For compatibility with existing UI
        id: row.prop_id,
        propType: row.prop_type,
        line: row.line,
        league: row.league,
        propDate: row.prop_date
      };
    }));

    return fixedData;
  } catch (error) {
    console.error("Error in getPlayerPropsFixed:", error);
    throw error;
  }
}

// Export the main function
export { getPlayerPropsFixed as getFixedPlayerProps };
