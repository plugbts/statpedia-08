/**
 * Worker-centric pipeline for fetching and enriching player props
 * 
 * This module implements a lean approach:
 * 1. Fetch raw data from proplines and player_game_logs (no joins, no aggregates)
 * 2. Enrich data in the worker using our existing modules
 * 3. Calculate EV% and streaks in the worker
 * 4. Return fully enriched prop objects
 */

import { supabaseFetch } from "./supabaseFetch";
import { cleanPlayerNames, type RawPropRow, type CleanPropRow } from "./playerNames";
import { enrichTeams, type RawRow, type CleanTeamRow } from "./teams";
import { getPlayerTeam, getOpponentTeam } from "./lib/playerTeamMap";

export type PropLineRow = {
  id: string;
  player_id: string;
  player_name: string | null;
  team: string | null;
  opponent: string | null;
  league: string;
  season: string;
  game_id: string;
  date_normalized: string;
  prop_type: string;
  line: number | null;
  over_odds: number | null;
  under_odds: number | null;
  odds: any;
};

export type GameLogRow = {
  player_id: string;
  league: string;
  season: string;
  date: string;
  prop_type: string;
  value: number | null;
  opponent: string | null;
};

export type EnrichedProp = {
  // Core prop data
  player_id: string;
  clean_player_name: string;
  team_abbr: string;
  team_logo: string | null;
  team_name: string;
  opponent_abbr: string;
  opponent_logo: string | null;
  opponent_name: string;
  prop_type: string;
  line: number | null;
  over_odds: number | null;
  under_odds: number | null;
  
  // Calculated metrics
  ev_percent: number | null;
  last5_hits: string;
  last10_hits: string;
  last20_hits: string;
  h2h_hits: string;
  
  // Additional data
  game_id: string;
  date_normalized: string;
  league: string;
  season: string;
  
  // Debug info
  debug_team: any;
  debug_ev?: {
    over_odds: number | null;
    implied_prob: number | null;
    hit_rate: number | null;
    raw_ev: number | null;
  };
};

/**
 * Load team registry from database for a given league
 */
export async function loadTeamRegistry(env: any, league: string): Promise<Record<string, any>> {
  console.log(`[worker:teams] Loading team registry for ${league}...`);
  
  const { data, error } = await supabaseFetch(
    env,
    `teams?league=eq.${league.toLowerCase()}`
  );

  if (error) {
    console.warn(`[worker:teams] Failed to load team registry for ${league}:`, error);
    return {};
  }

  console.log(`[worker:teams] Raw team data for ${league}:`, data?.length ?? 0, 'teams');
  if (data && data.length > 0) {
    console.log(`[worker:teams] Sample team data:`, data[0]);
  }

  const reg: Record<string, any> = {};
  (data ?? []).forEach((t: any) => {
    reg[t.team_name.toLowerCase()] = t;
    (t.aliases ?? []).forEach((a: string) => reg[a.toLowerCase()] = t);
    reg[t.abbreviation.toLowerCase()] = t;
  });
  
  // If no teams found in database, create a minimal fallback registry
  if (Object.keys(reg).length === 0) {
    console.warn(`[worker:teams] No teams found in database for ${league}, creating fallback registry`);
    
    // Create a minimal fallback registry with just the teams we need for player mapping
    const fallbackTeams = {
      'nyj': { abbreviation: 'NYJ', team_name: 'New York Jets', logo_url: null },
      'kc': { abbreviation: 'KC', team_name: 'Kansas City Chiefs', logo_url: null },
      'buf': { abbreviation: 'BUF', team_name: 'Buffalo Bills', logo_url: null },
      'bal': { abbreviation: 'BAL', team_name: 'Baltimore Ravens', logo_url: null },
      'cin': { abbreviation: 'CIN', team_name: 'Cincinnati Bengals', logo_url: null },
      'no': { abbreviation: 'NO', team_name: 'New Orleans Saints', logo_url: null },
      'nyg': { abbreviation: 'NYG', team_name: 'New York Giants', logo_url: null },
      'atl': { abbreviation: 'ATL', team_name: 'Atlanta Falcons', logo_url: null },
      'lar': { abbreviation: 'LAR', team_name: 'Los Angeles Rams', logo_url: null },
      'mia': { abbreviation: 'MIA', team_name: 'Miami Dolphins', logo_url: null },
      'sf': { abbreviation: 'SF', team_name: 'San Francisco 49ers', logo_url: null },
      'lac': { abbreviation: 'LAC', team_name: 'Los Angeles Chargers', logo_url: null }
    };
    
    Object.assign(reg, fallbackTeams);
    console.log(`[worker:teams] Created fallback registry with ${Object.keys(reg).length} entries`);
  }
  
  console.log(`[worker:teams] Loaded team registry for ${league}: ${Object.keys(reg).length} entries`);
  console.log(`[worker:teams] Registry keys:`, Object.keys(reg).slice(0, 10));
  return reg;
}

/**
 * Debug logger for team mapping
 */
function debugTeamMapping(rows: any[], games: Record<string, any>, logPrefix = "[worker:teams]") {
  rows.slice(0, 5).forEach((row, idx) => { // Only log first 5 to avoid spam
    const game = games[row.game_id] ?? null;

    console.log(`${logPrefix} idx=${idx}`, {
      game_id: row.game_id,
      league: row.league,
      raw_team: row.team ?? null,
      raw_opponent: row.opponent ?? null,
      game_home: game?.home_team ?? null,
      game_away: game?.away_team ?? null,
      resolved_team_abbr: row.team_abbr ?? "UNK",
      resolved_opp_abbr: row.opponent_abbr ?? "UNK",
      resolved_team_logo: row.team_logo ?? null,
      resolved_opp_logo: row.opponent_logo ?? null,
    });
  });
}

/**
 * Fetch raw proplines data (lean query - no team/opponent from fallback)
 * Only fetches essential identifiers and odds data
 */
export async function fetchPropLines(
  env: any,
  league: string,
  dateISO: string
): Promise<PropLineRow[]> {
  // Try proplines table first
  const { data: proplinesData, error: proplinesError } = await supabaseFetch(
    env,
    `proplines?league=eq.${league.toLowerCase()}&date_normalized=eq.${dateISO}`
  );

  if (!proplinesError && proplinesData && proplinesData.length > 0) {
    console.log(`[worker:fetchProps] fetched ${proplinesData.length} proplines for ${league} on ${dateISO}`);
    return proplinesData as PropLineRow[];
  }

  console.log(`[worker:fetchProps] proplines table empty, falling back to player_props_fixed view`);
  
  // Fallback to player_props_fixed view - but only fetch raw essentials
  const { data: fallbackData, error: fallbackError } = await supabaseFetch(
    env,
    `player_props_fixed?league=eq.${league.toLowerCase()}&prop_date=eq.${dateISO}`
  );

  if (fallbackError) {
    console.error("[worker:fetchProps] fallback error:", fallbackError);
    throw fallbackError;
  }

  console.log(`[worker:fetchProps] fetched ${fallbackData?.length ?? 0} props from fallback for ${league} on ${dateISO}`);
  
  // Transform fallback data to match PropLineRow format - but don't include team/opponent (they're UNK anyway)
  const transformedData = (fallbackData ?? []).map((row: any) => ({
    id: row.prop_id || row.id,
    player_id: row.player_id,
    player_name: row.player_name,
    team: null, // Don't use team from fallback view (it's UNK)
    opponent: null, // Don't use opponent from fallback view (it's UNK)
    league: row.league,
    season: row.season || '2024',
    game_id: row.game_id,
    date_normalized: row.prop_date || row.date,
    prop_type: row.prop_type,
    line: row.line,
    over_odds: row.over_odds,
    under_odds: row.under_odds,
    odds: row.odds || null
  }));

  return transformedData as PropLineRow[];
}

/**
 * Attach team data at runtime using team registry and player mapping
 */
function attachTeams(
  row: any, 
  registry: Record<string, any>, 
  games: Record<string, any>
): any {
  const game = games[row.game_id];
  
  // Try to get team from player mapping first
  let playerTeam = getPlayerTeam(row.player_id);
  let opponentTeam = null;
  
  console.log(`[worker:teams] Processing ${row.player_id}: playerTeam=${playerTeam}, registry has ${Object.keys(registry).length} entries`);
  
  if (playerTeam) {
    // If we have a player team mapping, use it
    const teamInfo = registry[playerTeam.toLowerCase()];
    console.log(`[worker:teams] Looking up team info for ${playerTeam.toLowerCase()}:`, teamInfo ? 'found' : 'not found');
    if (teamInfo) {
      return {
        ...row,
        team_abbr: teamInfo.abbreviation,
        team_logo: teamInfo.logo_url,
        team_name: teamInfo.team_name,
        opponent_abbr: "OPP", // Simplified for now
        opponent_logo: null,
        opponent_name: "Opponent",
        debug_team: {
          league: row.league,
          raw_team: row.team,
          raw_opponent: row.opponent,
          team_resolved: true,
          opponent_resolved: false,
          team_strategy: "player_mapping",
          opp_strategy: "fallback",
          player_team_mapping: playerTeam,
          registry_keys_count: Object.keys(registry).length,
          registry_sample_keys: Object.keys(registry).slice(0, 5)
        }
      };
    }
  }
  
  // Fallback: try to resolve from game data if available
  if (game) {
    const home = registry[game.home_team?.toLowerCase()] ?? null;
    const away = registry[game.away_team?.toLowerCase()] ?? null;
    
    // For now, assume player is on home team (this could be improved)
    const teamInfo = home || away;
    if (teamInfo) {
      return {
        ...row,
        team_abbr: teamInfo.abbreviation,
        team_logo: teamInfo.logo_url,
        team_name: teamInfo.team_name,
        opponent_abbr: home ? (away?.abbreviation ?? "OPP") : (home?.abbreviation ?? "OPP"),
        opponent_logo: home ? away?.logo_url : home?.logo_url,
        opponent_name: home ? (away?.team_name ?? "Opponent") : (home?.team_name ?? "Opponent"),
        debug_team: {
          league: row.league,
          raw_team: row.team,
          raw_opponent: row.opponent,
          team_resolved: true,
          opponent_resolved: true,
          team_strategy: "game_data",
          opp_strategy: "game_data",
          game_data: { home: game.home_team, away: game.away_team }
        }
      };
    }
  }
  
  // Final fallback: UNK
  return {
    ...row,
    team_abbr: "UNK",
    team_logo: null,
    team_name: "Unknown Team",
    opponent_abbr: "UNK",
    opponent_logo: null,
    opponent_name: "Unknown Opponent",
    debug_team: {
      league: row.league,
      raw_team: row.team,
      raw_opponent: row.opponent,
      team_resolved: false,
      opponent_resolved: false,
      team_strategy: "fallback",
      opp_strategy: "fallback",
      game_id: row.game_id,
      player_id: row.player_id,
      player_team_mapping: playerTeam,
      registry_keys_count: Object.keys(registry).length,
      registry_sample_keys: Object.keys(registry).slice(0, 5)
    }
  };
}

/**
 * Fetch raw player game logs data (lean query)
 * Falls back to empty array if table is empty or has errors
 */
export async function fetchPlayerGameLogs(
  env: any,
  league: string,
  dateISO: string,
  limit: number = 10000
): Promise<GameLogRow[]> {
  try {
    const { data, error } = await supabaseFetch(
      env,
      `player_game_logs?league=eq.${league.toLowerCase()}&date=lte.${dateISO}&order=date.desc&limit=${limit}`
    );

    if (error) {
      console.warn("[worker:fetchProps] player_game_logs error:", error);
      console.log("[worker:fetchProps] returning empty game logs array");
      return [];
    }

    console.log(`[worker:fetchProps] fetched ${data?.length ?? 0} game logs for ${league} up to ${dateISO}`);
    return (data ?? []) as GameLogRow[];
  } catch (error) {
    console.warn("[worker:fetchProps] player_game_logs exception:", error);
    console.log("[worker:fetchProps] returning empty game logs array");
    return [];
  }
}

/**
 * Calculate EV% with guardrails
 */
export function calcEV(
  overOdds: number | null,
  underOdds: number | null,
  line: number | null,
  logs: GameLogRow[],
  playerId: string,
  propType: string
): { ev_percent: number | null; debug_ev?: any } {
  if (!overOdds || !line) {
    return { ev_percent: null };
  }

  // Implied probability calculation
  let impliedProb: number | null = null;
  if (overOdds > 0) {
    impliedProb = 100 / (overOdds + 100);
  } else if (overOdds < 0) {
    impliedProb = -overOdds / (-overOdds + 100);
  }

  if (!impliedProb || impliedProb <= 0 || impliedProb >= 1) {
    return { ev_percent: null };
  }

  // Hit rate from logs
  const playerLogs = logs.filter(
    l => l.player_id === playerId && l.prop_type === propType && l.value !== null
  );
  
  if (playerLogs.length === 0) {
    return { ev_percent: null };
  }

  const hits = playerLogs.filter(l => (l.value ?? 0) >= line).length;
  const hitRate = hits / playerLogs.length;

  // Calculate EV
  const rawEv = (hitRate - impliedProb) * 100;
  const evPercent = Math.round(rawEv * 10) / 10;

  // Guardrails: cap at reasonable values
  const cappedEv = Math.max(-50, Math.min(50, evPercent));

  return {
    ev_percent: cappedEv,
    debug_ev: {
      over_odds: overOdds,
      implied_prob: Math.round(impliedProb * 1000) / 1000,
      hit_rate: Math.round(hitRate * 1000) / 1000,
      raw_ev: rawEv,
    }
  };
}

/**
 * Calculate streaks from game logs
 */
export function calcStreaks(
  logs: GameLogRow[],
  playerId: string,
  propType: string,
  line: number | null,
  propDate: string,
  opponent: string | null
): {
  last5_hits: string;
  last10_hits: string;
  last20_hits: string;
  h2h_hits: string;
} {
  if (!line) {
    return {
      last5_hits: "0/0",
      last10_hits: "0/0",
      last20_hits: "0/0",
      h2h_hits: "0/0"
    };
  }

  // Get player logs for this prop type, before the prop date
  const playerLogs = logs
    .filter(l => 
      l.player_id === playerId && 
      l.prop_type === propType && 
      l.date < propDate &&
      l.value !== null
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Calculate streaks for last N games
  const streak = (n: number) => {
    const lastN = playerLogs.slice(0, n);
    const hits = lastN.filter(l => (l.value ?? 0) >= line).length;
    return `${hits}/${lastN.length}`;
  };

  // Calculate head-to-head streak
  const h2hLogs = playerLogs.filter(l => opponent && l.opponent === opponent);
  const h2hHits = h2hLogs.filter(l => (l.value ?? 0) >= line).length;
  const h2hHitsStr = h2hLogs.length ? `${h2hHits}/${h2hLogs.length}` : "0/0";

  return {
    last5_hits: streak(5),
    last10_hits: streak(10),
    last20_hits: streak(20),
    h2h_hits: h2hHitsStr
  };
}

/**
 * Main function: Fetch and enrich props for a date
 */
export async function fetchPropsForDate(
  env: any,
  league: string,
  dateISO: string
): Promise<EnrichedProp[]> {
  console.log(`[worker:fetchProps] Starting enrichment for ${league} on ${dateISO}`);

  // 1. Fetch raw data in parallel
  const [propLines, gameLogs] = await Promise.all([
    fetchPropLines(env, league, dateISO),
    fetchPlayerGameLogs(env, league, dateISO)
  ]);

  if (propLines.length === 0) {
    console.log(`[worker:fetchProps] No props found for ${league} on ${dateISO}`);
    return [];
  }

  // 2. Clean player names
  console.log(`[worker:fetchProps] Cleaning player names for ${propLines.length} props...`);
  const cleanedProps = cleanPlayerNames(propLines, "[worker:fetchProps:names]");

  // 3. Load team registry and games data for runtime team resolution
  console.log(`[worker:fetchProps] Loading team registry and games data...`);
  const [teamRegistry, gamesData] = await Promise.all([
    loadTeamRegistry(env, league),
    // For now, we'll create an empty games map since we don't have a games table yet
    Promise.resolve({})
  ]);

  // 4. Attach teams at runtime using worker-centric approach
  console.log(`[worker:fetchProps] Attaching teams at runtime for ${cleanedProps.length} props...`);
  const enrichedTeams = cleanedProps.map((row: any) => attachTeams(row, teamRegistry, gamesData));

  // 5. Debug team mapping
  debugTeamMapping(enrichedTeams, gamesData, "[worker:fetchProps:teams]");

  // 6. Calculate EV% and streaks
  console.log(`[worker:fetchProps] Calculating metrics for ${enrichedTeams.length} props...`);
  const enriched = enrichedTeams.map((row: any) => {
    const evResult = calcEV(
      row.over_odds,
      row.under_odds,
      row.line,
      gameLogs,
      row.player_id,
      row.prop_type
    );

    const streaks = calcStreaks(
      gameLogs,
      row.player_id,
      row.prop_type,
      row.line,
      row.date_normalized,
      row.opponent_abbr // Use resolved opponent
    );

    return {
      // Core prop data
      player_id: row.player_id,
      clean_player_name: row.clean_player_name,
      team_abbr: row.team_abbr,
      team_logo: row.team_logo,
      team_name: row.team_name,
      opponent_abbr: row.opponent_abbr,
      opponent_logo: row.opponent_logo,
      opponent_name: row.opponent_name,
      prop_type: row.prop_type,
      line: row.line,
      over_odds: row.over_odds,
      under_odds: row.under_odds,
      
      // Calculated metrics
      ev_percent: evResult.ev_percent,
      last5_hits: streaks.last5_hits,
      last10_hits: streaks.last10_hits,
      last20_hits: streaks.last20_hits,
      h2h_hits: streaks.h2h_hits,
      
      // Additional data
      game_id: row.game_id,
      date_normalized: row.date_normalized,
      league: row.league,
      season: row.season,
      
      // Debug info
      debug_team: row.debug_team,
      debug_ev: evResult.debug_ev,
    } as EnrichedProp;
  });

  console.log(`[worker:fetchProps] Worker-centric enrichment complete: ${enriched.length} props`);
  return enriched;
}