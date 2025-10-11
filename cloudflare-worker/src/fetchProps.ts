/**
 * Worker-centric pipeline for fetching and enriching player props
 * 
 * This module implements a pure worker approach:
 * 1. Fetch raw data directly from SportsGameOdds API (no database dependency)
 * 2. Enrich data in the worker using our existing modules
 * 3. Calculate EV% and streaks in the worker
 * 4. Return fully enriched prop objects
 */

import { supabaseFetch } from "./supabaseFetch";
import { cleanPlayerNames, type RawPropRow, type CleanPropRow } from "./playerNames";
import { enrichTeams, type RawRow, type CleanTeamRow } from "./teams";
import { enrichTeams as enhancedEnrichTeams } from "./teamEnrichment";
import { getPlayerTeam, getOpponentTeam } from "./lib/playerTeamMap";
import { extractPlayerProps } from "./lib/extract";
import { getEventsWithFallbacks } from "./lib/api";
import { getActiveLeagues } from "./config/leagues";

/**
 * Prop labels mapping for clean UI display
 */
const PROP_LABELS: Record<string, string> = {
  passing_yards: "Passing Yards",
  rushing_yards: "Rushing Yards", 
  receiving_yards: "Receiving Yards",
  receptions: "Receptions",
  pass_attempts: "Pass Attempts",
  pass_completions: "Pass Completions",
  interceptions: "Interceptions",
  passing_touchdowns: "Passing Touchdowns",
  rushing_touchdowns: "Rushing Touchdowns",
  receiving_touchdowns: "Receiving Touchdowns",
  points: "Points",
  rebounds: "Rebounds",
  assists: "Assists",
  steals: "Steals",
  blocks: "Blocks",
  threes_made: "3-Pointers Made",
  points_rebounds_assists: "Points + Rebounds + Assists",
  hits: "Hits",
  runs: "Runs",
  rbis: "RBIs",
  total_bases: "Total Bases",
  strikeouts: "Strikeouts",
  pitching_outs: "Pitching Outs",
  shots_on_goal: "Shots on Goal",
  goals: "Goals",
  saves: "Saves"
};

/**
 * Format prop name for display
 */
function formatPropName(statType: string): string {
  return PROP_LABELS[statType] ?? statType.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Extract prop row from event data
 */
function extractPropRow(event: any, market: any, prop: any) {
  return {
    player_id: prop.playerId,
    player_name: prop.playerName,
    game_id: event.id || event.eventID,
    league: event.leagueID || event.league,
    date: event.startDate || event.startTime || event.commence_time,

    // ✅ Use statType (or market name) as the prop_type
    prop_type: prop.statType || market.name || "unknown",
    prop_type_display: formatPropName(prop.statType || market.name || "unknown"),

    // ✅ Keep bet_type separate
    bet_type: prop.betType, // "over" | "under"

    line: prop.line,
    odds: prop.odds,

    // Enrich with teams (resolved later)
    raw_home_team: event.teams?.home?.teamID || event.teams?.home?.names?.short,
    raw_away_team: event.teams?.away?.teamID || event.teams?.away?.names?.short,
  };
}

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
  prop_type_display: string;
  bet_type: string;
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
 * Get player prop oddIDs for a given league
 */
function getPlayerPropOddIDs(league: string): string {
  // Use the exact same oddIDs as the ingestion system from config/leagues.ts
  const oddIDsMap: Record<string, string> = {
    'nfl': 'passing_yards-PLAYER_ID-game-ou-over,rushing_yards-PLAYER_ID-game-ou-over,receiving_yards-PLAYER_ID-game-ou-over,receptions-PLAYER_ID-game-ou-over,passing_touchdowns-PLAYER_ID-game-ou-over,rushing_touchdowns-PLAYER_ID-game-ou-over,receiving_touchdowns-PLAYER_ID-game-ou-over',
    'nba': 'points-PLAYER_ID-game-ou-over,rebounds-PLAYER_ID-game-ou-over,assists-PLAYER_ID-game-ou-over,steals-PLAYER_ID-game-ou-over,blocks-PLAYER_ID-game-ou-over,threes_made-PLAYER_ID-game-ou-over,points_rebounds_assists-PLAYER_ID-game-ou-over',
    'mlb': 'hits-PLAYER_ID-game-ou-over,runs-PLAYER_ID-game-ou-over,rbis-PLAYER_ID-game-ou-over,total_bases-PLAYER_ID-game-ou-over,strikeouts-PLAYER_ID-game-ou-over,pitching_outs-PLAYER_ID-game-ou-over',
    'nhl': 'shots_on_goal-PLAYER_ID-game-ou-over,points-PLAYER_ID-game-ou-over,goals-PLAYER_ID-game-ou-over,assists-PLAYER_ID-game-ou-over,saves-PLAYER_ID-game-ou-over',
    'epl': 'shots-PLAYER_ID-game-ou-over,shots_on_target-PLAYER_ID-game-ou-over,goals-PLAYER_ID-game-ou-over,assists-PLAYER_ID-game-ou-over,passes-PLAYER_ID-game-ou-over,tackles-PLAYER_ID-game-ou-over',
    'ncaaf': 'passing_yards-PLAYER_ID-game-ou-over,rushing_yards-PLAYER_ID-game-ou-over,receiving_yards-PLAYER_ID-game-ou-over,receptions-PLAYER_ID-game-ou-over',
    'ncaab': 'points-PLAYER_ID-game-ou-over,rebounds-PLAYER_ID-game-ou-over,assists-PLAYER_ID-game-ou-over,threes_made-PLAYER_ID-game-ou-over'
  };
  
  return oddIDsMap[league.toLowerCase()] || oddIDsMap['nfl'];
}

/**
 * Fetch raw props directly from SportsGameOdds API
 * Uses the dual-mode approach: fetch from API, extract props, serve live data
 */
async function fetchRawPropsFromEvents(env: any, league: string, dateISO: string): Promise<any[]> {
  console.log(`🔍 Fetching raw events from SportsGameOdds API for ${league} on ${dateISO}`);
  
  try {
    // Get the league configuration from the same source as ingestion
    const activeLeagues = getActiveLeagues();
    const leagueConfig = activeLeagues.find(l => l.id.toLowerCase() === league.toLowerCase());
    
    if (!leagueConfig) {
      console.error(`❌ League ${league} not found in active leagues`);
      return [];
    }
    
    console.log(`🔍 Using league config: ${leagueConfig.id} ${leagueConfig.seasons[0]} with oddIDs: ${leagueConfig.oddIDs}`);
    
    // Use the exact same call as the ingestion system
    const { events, tier } = await getEventsWithFallbacks(env, leagueConfig.id, leagueConfig.seasons[0], leagueConfig.oddIDs);
    console.log(`✅ Fetched ${events.length} events from SportsGameOdds API (tier ${tier})`);
    
    // Debug: Log the raw events response structure
    console.log(`[debug:/events] Raw events structure:`, {
      eventsLength: events.length,
      firstEvent: events[0] ? Object.keys(events[0]) : [],
      hasMarkets: events[0]?.markets ? events[0].markets.length : 0,
      sampleEvent: events[0],
      allMarketTypes: events[0]?.markets?.map((m: any) => m.marketType) ?? []
    });
    
    // Filter events by date if specified
    const filteredEvents = events.filter(event => {
      if (!dateISO) return true;
      
      const eventDate = event.startTime || event.commence_time || event.date || event.status?.startsAt;
      if (!eventDate) return true;
      
      const eventDateStr = new Date(eventDate).toISOString().split('T')[0];
      // Allow events within a few days of the requested date
      const eventDateObj = new Date(eventDateStr);
      const requestedDateObj = new Date(dateISO);
      const daysDiff = Math.abs((eventDateObj.getTime() - requestedDateObj.getTime()) / (1000 * 60 * 60 * 24));
      
      return daysDiff <= 3; // Allow up to 3 days difference
    });
    
    console.log(`🔍 Filtered to ${filteredEvents.length} events matching date ${dateISO}`);
    
    // Use the same extraction logic as the ingestion system
    const props = await extractPlayerProps(filteredEvents, env);
    console.log(`🔍 Extracted ${props.length} props using ingestion extractor`);
    
    console.log(`[worker:/events] Extracted ${props.length} props for ${league} ${dateISO} from ${events.length} events`);
    return props;
  } catch (error) {
    console.error(`❌ Failed to fetch raw events from SportsGameOdds API:`, error);
    return [];
  }
}

/**
 * Dual-mode worker ingestion: fetch, enrich, and optionally persist
 */
export async function ingestAndEnrich(env: any, league: string, dateISO: string): Promise<EnrichedProp[]> {
  console.log(`🚀 Starting dual-mode ingestion for ${league} on ${dateISO}`);
  
  // Step 1: Fetch raw props from SportsGameOdds API
  const rawProps = await fetchRawPropsFromEvents(env, league, dateISO);
  
  if (rawProps.length === 0) {
    console.log(`[worker:ingestAndEnrich] No raw props found for ${league} on ${dateISO}`);
    return [];
  }

  // Step 2: Process and enrich props
  const enriched = await processRawProps(rawProps, env, league, dateISO);
  
  console.log(`✅ Dual-mode ingestion complete: ${enriched.length} enriched props`);
  return enriched;
}

/**
 * Persist enriched props to database (background operation)
 */
export async function persistProps(env: any, enriched: EnrichedProp[]): Promise<void> {
  if (!enriched.length) {
    console.log(`[worker:persistProps] No props to persist`);
    return;
  }

  console.log(`[worker:persistProps] Persisting ${enriched.length} props to database...`);
  
  try {
    // Import bulk persistence functions
    const { bulkUpsertProps } = await import("./bulkPersist");

    // Transform enriched props to database format
    const dbProps = enriched.map(prop => ({
      player_id: prop.player_id,
      player_name: prop.clean_player_name,
      team: prop.team_abbr,
      opponent: prop.opponent_abbr,
      league: prop.league,
      season: prop.season,
      game_id: prop.game_id,
      date_normalized: prop.date_normalized,
      date: prop.date_normalized,
      prop_type: prop.prop_type,
      line: prop.line,
      over_odds: prop.over_odds,
      under_odds: prop.under_odds,
      odds: null,
      sportsbook: 'SportsGameOdds',
      conflict_key: `${prop.player_id}|${prop.date_normalized}|${prop.prop_type}|SportsGameOdds|${prop.league}|${prop.season}`
    }));

    // Use bulk upsert to avoid subrequest limits
    const result = await bulkUpsertProps(env, dbProps);

    console.log(`✅ [worker:persistProps] Bulk persistence completed:`, {
      inserted: result.inserted_count,
      updated: result.updated_count,
      errors: result.error_count,
      total: enriched.length
    });

    if (result.error_count > 0) {
      console.warn(`⚠️ [worker:persistProps] ${result.error_count} props failed to persist:`, result.errors);
    }

  } catch (error) {
    console.error(`❌ [worker:persistProps] Persist failed:`, error);
  }
}

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
  console.log(`[worker:fetchProps] Fetching props for ${league} on ${dateISO}`);
  
  // Use range filter to handle date normalization mismatches
  // This works whether ingestion stored DATE, TIMESTAMP, or with timezone
  const start = new Date(dateISO);
  const end = new Date(dateISO);
  end.setDate(end.getDate() + 1);
  
  const startISO = start.toISOString();
  const endISO = end.toISOString();
  
  console.log(`[worker:fetchProps] Using date range: ${startISO} to ${endISO}`);
  
  // Try proplines table with range filter
  const { data: proplinesData, error: proplinesError } = await supabaseFetch(
    env,
    `proplines?league=eq.${league.toLowerCase()}&date_normalized=gte.${startISO}&date_normalized=lt.${endISO}`
  );

  if (!proplinesError && proplinesData && proplinesData.length > 0) {
    console.log(`[worker:fetchProps] fetched ${proplinesData.length} proplines for ${league} on ${dateISO}`);
    return proplinesData as PropLineRow[];
  }

  console.log(`[worker:fetchProps] No data found in proplines for ${league} on ${dateISO}`);
  return [];
}

/**
 * Enhanced attach team data using comprehensive fallback logic
 */
function attachTeams(
  row: any, 
  registry: Record<string, any>, 
  games: Record<string, any>,
  playersById: Record<string, any> = {}
): any {
  const game = games[row.game_id];
  
  // NEW: Direct team lookup from players table (no more guessing!)
  const player = playersById[row.player_id];
  const teamAbbr = player?.team || player?.team_abbr || "UNK";
  
  // Opponent still comes from event context
  let opponentAbbr = "UNK";
  if (game && game.homeTeam && game.awayTeam) {
    const homeAbbr = normalizeTeamFromEvent(game.homeTeam);
    const awayAbbr = normalizeTeamFromEvent(game.awayTeam);
    opponentAbbr = teamAbbr === homeAbbr ? awayAbbr : homeAbbr;
  }
  
  // Try to get additional team info from registry
  const teamInfo = registry[teamAbbr.toLowerCase()] || registry[teamAbbr.toUpperCase()];
  const opponentInfo = registry[opponentAbbr.toLowerCase()] || registry[opponentAbbr.toUpperCase()];

  console.log(`[worker:teams] Direct lookup for ${row.player_id}: ${teamAbbr} vs ${opponentAbbr} (from players table)`);

  return {
    ...row,
    team_abbr: teamAbbr,
    team_logo: teamInfo?.logo_url || null,
    team_name: teamInfo?.team_name || teamAbbr,
    opponent_abbr: opponentAbbr,
    opponent_logo: opponentInfo?.logo_url || null,
    opponent_name: opponentInfo?.team_name || opponentAbbr,
    debug_team: {
      league: row.league,
      raw_team: row.team,
      raw_opponent: row.opponent,
      team_resolved: teamAbbr !== 'UNK',
      opponent_resolved: opponentAbbr !== 'UNK',
      game_id: row.game_id,
      player_id: row.player_id,
      player_lookup_success: !!player,
      players_table_used: true,
      registry_keys_count: Object.keys(registry).length
    }
  };
}

// Helper function to normalize team names from event data
function normalizeTeamFromEvent(teamName: string): string {
  if (!teamName) return "UNK";
  
  // Simple normalization - could be enhanced with full team mapping
  const upper = teamName.toUpperCase();
  if (upper.includes('PHILADEL') || upper.includes('PHILADEPHIA')) return 'PHI';
  if (upper.includes('NEW YORK')) return 'NYG';
  if (upper.includes('PITTSBUR')) return 'PIT';
  if (upper.includes('SEATTLE')) return 'SEA';
  if (upper.includes('DENVER')) return 'DEN';
  if (upper.includes('CHICAGO')) return 'CHI';
  if (upper.includes('WASHING')) return 'WAS';
  if (upper.includes('ATLANTA')) return 'ATL';
  if (upper.includes('BUFFALO')) return 'BUF';
  if (upper.includes('CAROLIN')) return 'CAR';
  if (upper.includes('CINCINN')) return 'CIN';
  if (upper.includes('CLEVELA')) return 'CLE';
  if (upper.includes('DALLAS')) return 'DAL';
  if (upper.includes('DETROIT')) return 'DET';
  if (upper.includes('GREEN')) return 'GB';
  if (upper.includes('HOUSTON')) return 'HOU';
  if (upper.includes('INDIANA')) return 'IND';
  if (upper.includes('JACKSON')) return 'JAX';
  if (upper.includes('KANSAS')) return 'KC';
  if (upper.includes('LAS')) return 'LV';
  if (upper.includes('LOS')) return 'LAC';
  if (upper.includes('MIAMI')) return 'MIA';
  if (upper.includes('MINNESO')) return 'MIN';
  if (upper.includes('NEW ENGLAND')) return 'NE';
  if (upper.includes('NEW ORLEANS')) return 'NO';
  if (upper.includes('NEW YORK JETS')) return 'NYJ';
  if (upper.includes('SAN FRANCISCO')) return 'SF';
  if (upper.includes('TAMPA')) return 'TB';
  if (upper.includes('TENNESSE')) return 'TEN';
  
  return upper; // Return as-is if no mapping found
}

/**
 * Fetch players data from database for team lookup
 * Returns a map of player_id -> player data for fast lookup
 */
async function fetchPlayersData(env: any, league: string): Promise<Record<string, any>> {
  try {
    console.log(`[worker:fetchPlayersData] Fetching players data for ${league}...`);
    
    const data = await supabaseFetch(env, `players?league=eq.${league.toUpperCase()}`);
    
    if (!Array.isArray(data)) {
      console.log(`[worker:fetchPlayersData] No players data for ${league}`);
      return {};
    }
    
    // Convert array to map for fast lookup
    const playersById: Record<string, any> = {};
    data.forEach(player => {
      playersById[player.player_id] = player;
    });
    
    console.log(`[worker:fetchPlayersData] Loaded ${Object.keys(playersById).length} players for ${league}`);
    return playersById;
  } catch (error) {
    console.error(`[worker:fetchPlayersData] Error fetching players for ${league}:`, error);
    return {};
  }
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

  // 4. Fetch players data for team lookup
  const playersById = await fetchPlayersData(env, league);
  
  // 5. Attach teams at runtime using worker-centric approach with players table lookup
  console.log(`[worker:fetchProps] Attaching teams at runtime for ${cleanedProps.length} props...`);
  const enrichedTeams = cleanedProps.map((row: any) => attachTeams(row, teamRegistry, gamesData, playersById));

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

/**
 * Dual-mode worker props builder: fetch from API, enrich, serve live data
 */
export async function buildProps(env: any, league: string, dateISO: string): Promise<EnrichedProp[]> {
  console.log(`🚀 Starting dual-mode props build for ${league} on ${dateISO}`);

  // Use the dual-mode ingestion approach
  const enriched = await ingestAndEnrich(env, league, dateISO);
  
  return enriched;
}

/**
 * Process raw events through the enrichment pipeline
 */
async function processRawProps(rawProps: any[], env: any, league: string, dateISO: string): Promise<EnrichedProp[]> {
  if (rawProps.length === 0) {
    console.log(`[worker:processRawProps] No raw props found for ${league} on ${dateISO}`);
    return [];
  }

  console.log(`[worker:processRawProps] Processing ${rawProps.length} raw props...`);
  
  // Debug: Log the structure of the first prop
  if (rawProps.length > 0) {
    console.log(`[worker:processRawProps] Sample prop structure:`, {
      player_id: rawProps[0].player_id,
      player_name: rawProps[0].player_name,
      prop_type: rawProps[0].prop_type,
      prop_type_display: rawProps[0].prop_type_display,
      bet_type: rawProps[0].bet_type,
      line: rawProps[0].line,
      odds: rawProps[0].odds,
      game_id: rawProps[0].game_id,
      raw_home_team: rawProps[0].raw_home_team,
      raw_away_team: rawProps[0].raw_away_team,
      keys: Object.keys(rawProps[0])
    });
  }
  
  // Transform raw props from ingestion system format to our enriched format
  const transformedProps = rawProps.map(prop => {
    // Extract player name with fallback logic
    let playerName = prop.playerName || prop.player_name;
    
    // If no player name, try to derive from playerId
    if (!playerName && prop.playerId) {
      // Remove common suffixes and format as proper name
      playerName = prop.playerId
        .replace(/_1_NFL$/, '') // Remove _1_NFL suffix
        .replace(/_/g, ' ') // Replace underscores with spaces
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
    
    // Extract clean prop type from marketName
    let cleanPropType = prop.marketName || prop.prop_type;
    let cleanPropTypeDisplay = formatPropName(cleanPropType);
    
    // If marketName is verbose like "Bo Nix Passing Yards Over/Under", extract just the stat type
    if (prop.marketName && prop.marketName.includes('Over/Under')) {
      // Try to extract stat type from marketName (remove player name and "Over/Under")
      // Pattern: "Player Name Stat Type Over/Under" -> extract "Stat Type"
      // Handle cases like "Bo Nix Passing Yards Over/Under" -> "Passing Yards"
      const match = prop.marketName.match(/\w+\s+\w+\s+(\w+(?:\s+\w+)*)\s+Over\/Under/);
      if (match) {
        const statType = match[1].toLowerCase().replace(/\s+/g, '_');
        cleanPropType = statType;
        cleanPropTypeDisplay = formatPropName(statType);
      }
    }
    
    return {
      player_id: prop.playerId || prop.player_id || `unknown_${Math.random()}`,
      player_name: playerName, // Now properly extracted/derived
      clean_player_name: playerName, // Will be cleaned in next step
      team: prop.team, // Will be resolved in next step
      opponent: prop.opponent, // Will be resolved in next step
      league: prop.league?.toLowerCase() || league.toLowerCase(),
      season: "2025", // TODO: Extract from event
      game_id: prop.eventId || prop.game_id,
      date_normalized: new Date(prop.eventStartUtc || prop.date || dateISO).toISOString().split('T')[0],
      prop_type: cleanPropType, // Clean stat type
      prop_type_display: cleanPropTypeDisplay, // Clean display name
      bet_type: prop.overUnder || prop.bet_type, // "over" or "under"
      line: prop.line || null,
      over_odds: prop.overUnder === 'over' ? prop.odds : null,
      under_odds: prop.overUnder === 'under' ? prop.odds : null,
      odds: prop.odds,
      sportsbook: prop.sportsbook || "SportsGameOdds",
      raw_team: prop.team,
      raw_opponent: prop.opponent,
      raw_player_name: playerName
    };
  });
  
  console.log(`[worker:processRawProps] Transformed ${transformedProps.length} props to enriched format`);

  // Load team registry for runtime team resolution
  console.log(`[worker:processRawProps] Loading team registry...`);
  const teamRegistry = await loadTeamRegistry(env, league);

  // Clean player names
  console.log(`[worker:processRawProps] Cleaning player names for ${transformedProps.length} props...`);
  const cleanedProps = cleanPlayerNames(transformedProps, "[worker:processRawProps:names]");

  // Fetch players data for team lookup
  const playersById = await fetchPlayersData(env, league);
  
  // Attach teams at runtime using worker-centric approach with players table lookup
  console.log(`[worker:processRawProps] Attaching teams at runtime for ${cleanedProps.length} props...`);
  const enrichedTeams = cleanedProps.map((row: any) => attachTeams(row, teamRegistry, {}, playersById));

  // Calculate EV% and streaks (simplified for now - no historical data)
  console.log(`[worker:processRawProps] Calculating metrics for ${enrichedTeams.length} props...`);
  const enriched = enrichedTeams.map((row: any) => {
    const evResult = calcEV(
      row.over_odds,
      row.under_odds,
      row.line,
      [], // No historical logs for now
      row.player_id,
      row.prop_type
    );

    // Simplified streaks - no historical data for now
    const streaks = {
      last5_hits: "N/A",
      last10_hits: "N/A", 
      last20_hits: "N/A",
      h2h_hits: "N/A"
    };

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
      prop_type_display: row.prop_type_display,
      bet_type: row.bet_type,
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
      game_id: row.game_id || `${row.player_id}-${dateISO}`,
      date_normalized: dateISO,
      league: league,
      season: "2025",
      
      // Debug info
      debug_team: row.debug_team,
      debug_ev: evResult.debug_ev,
    } as EnrichedProp;
  });

  console.log(`🚀 Dual-mode props build complete: ${enriched.length} props`);
  return enriched;
}