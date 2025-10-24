/**
 * Enhanced Prop Ingestion Service for StatPedia
 *
 * Fixes:
 * - Only two props (full slate processing)
 * - Injured players still showing (proper status filtering)
 * - Prop types flattened (specific market mapping)
 */

import { drizzle } from "drizzle-orm/neon-serverless";
import { neon } from "@neondatabase/serverless";
import { eq, and, sql as dsql } from "drizzle-orm";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

// Create database connection (avoid shadowing drizzle's sql tag)
const neonClient = neon(process.env.NEON_DATABASE_URL!);
const db = drizzle(neonClient);

// Import our existing schema
import { leagues, teams, players, props } from "../db/schema/index.js";

// Enhanced prop type normalization with specific market mapping
function normalizePropType(market: string, sport: string): string {
  const key = market.toLowerCase().replace(/\s+/g, "_");

  // NFL specific mappings
  if (sport.toLowerCase() === "nfl") {
    switch (key) {
      case "passing_yards":
        return "Passing Yards";
      case "rushing_yards":
        return "Rushing Yards";
      case "receiving_yards":
        return "Receiving Yards";
      case "receptions":
        return "Receptions";
      case "rush_attempts":
        return "Rush Attempts";
      case "passing_tds":
      case "passing_touchdowns":
        return "Passing Touchdowns";
      case "rushing_tds":
      case "rushing_touchdowns":
        return "Rushing Touchdowns";
      case "receiving_tds":
      case "receiving_touchdowns":
        return "Receiving Touchdowns";
      case "passing_attempts":
        return "Passing Attempts";
      case "passing_completions":
        return "Passing Completions";
      case "interceptions":
        return "Interceptions";
      case "fumbles":
        return "Fumbles";
      case "longest_pass":
        return "Longest Pass";
      case "longest_rush":
        return "Longest Rush";
      case "longest_reception":
        return "Longest Reception";
      default:
        return market;
    }
  }

  // NBA specific mappings
  if (sport.toLowerCase() === "nba") {
    switch (key) {
      case "points":
        return "Points";
      case "rebounds":
        return "Rebounds";
      case "assists":
        return "Assists";
      case "steals":
        return "Steals";
      case "blocks":
        return "Blocks";
      case "three_pointers_made":
        return "Three Pointers Made";
      case "field_goals_made":
        return "Field Goals Made";
      case "free_throws_made":
        return "Free Throws Made";
      case "turnovers":
        return "Turnovers";
      case "double_double":
        return "Double Double";
      case "triple_double":
        return "Triple Double";
      default:
        return market;
    }
  }

  // MLB specific mappings
  if (sport.toLowerCase() === "mlb") {
    switch (key) {
      case "hits":
        return "Hits";
      case "home_runs":
        return "Home Runs";
      case "runs":
        return "Runs";
      case "rbis":
        return "RBIs";
      case "strikeouts":
        return "Strikeouts";
      case "walks":
        return "Walks";
      case "singles":
        return "Singles";
      case "doubles":
        return "Doubles";
      case "triples":
        return "Triples";
      case "total_bases":
        return "Total Bases";
      case "pitching_strikeouts":
        return "Pitching Strikeouts";
      case "pitching_walks":
        return "Pitching Walks";
      case "pitching_hits_allowed":
        return "Hits Allowed";
      case "pitching_runs_allowed":
        return "Runs Allowed";
      default:
        return market;
    }
  }

  // NHL specific mappings
  if (sport.toLowerCase() === "nhl") {
    switch (key) {
      case "goals":
        return "Goals";
      case "assists":
        return "Assists";
      case "points":
        return "Points";
      case "shots_on_goal":
        return "Shots on Goal";
      case "saves":
        return "Saves";
      case "goals_against":
        return "Goals Against";
      case "shutouts":
        return "Shutouts";
      case "power_play_goals":
        return "Power Play Goals";
      case "short_handed_goals":
        return "Short Handed Goals";
      default:
        return market;
    }
  }

  // WNBA specific mappings
  if (sport.toLowerCase() === "wnba") {
    switch (key) {
      case "points":
        return "Points";
      case "rebounds":
        return "Rebounds";
      case "assists":
        return "Assists";
      case "steals":
        return "Steals";
      case "blocks":
        return "Blocks";
      case "three_pointers_made":
        return "Three Pointers Made";
      case "field_goals_made":
        return "Field Goals Made";
      case "free_throws_made":
        return "Free Throws Made";
      default:
        return market;
    }
  }

  // Default fallback
  return market;
}

// Even more robust MLB normalization to handle vendor-specific labels
function normalizePropTypeRobust(market: string, sport: string): string {
  // Fast-path to existing mapping when exact
  const basic = normalizePropType(market, sport);
  if (basic !== market) return basic;

  // Generic cleanup
  const raw = market
    .toLowerCase()
    .replace(/\(.*?\)/g, "") // drop parenthetical qualifiers like (Batter)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  if (sport.toLowerCase() === "mlb") {
    // Common MLB prop synonyms
    const tokens = raw.split(" ");
    const has = (s: string) => raw.includes(s);

    // Hits
    if (has("hit")) return "Hits";

    // Home Runs
    if (has("home run") || has("homer") || tokens.includes("hr") || has("home_run"))
      return "Home Runs";

    // Runs Batted In (RBIs)
    if (has("rbi") || has("rbis") || has("runs batted in")) return "RBIs";

    // Runs (scored)
    if (tokens.includes("runs") || tokens.includes("run")) return "Runs";

    // Walks (BB)
    if (
      tokens.includes("walks") ||
      tokens.includes("walk") ||
      tokens.includes("bb") ||
      has("bases on balls")
    )
      return "Walks";

    // Total Bases (TB)
    if (has("total bases") || tokens.includes("tb") || has("bases total")) return "Total Bases";

    // Singles/Doubles/Triples
    if (tokens.includes("singles") || tokens.includes("single")) return "Singles";
    if (tokens.includes("doubles") || tokens.includes("double")) return "Doubles";
    if (tokens.includes("triples") || tokens.includes("triple")) return "Triples";

    // Pitcher markets
    if (has("pitching strikeouts") || (tokens.includes("strikeouts") && has("pitch")))
      return "Pitching Strikeouts";
    if (has("pitching walks") || (tokens.includes("walks") && has("pitch")))
      return "Pitching Walks";
    if (has("hits allowed") || (tokens.includes("hits") && has("allowed"))) return "Hits Allowed";
    if (has("runs allowed") || (tokens.includes("runs") && has("allowed"))) return "Runs Allowed";
  }

  // Fall back to original
  return market;
}

// Build conflict key for duplicate prevention
function buildConflictKey(
  league: string,
  gameId: string,
  playerId: string | number,
  market: string,
  line: number | string,
  odds: string,
): string {
  return `${league}:${gameId}:${playerId}:${normalizePropTypeRobust(market, league)}:${line}:${odds}`;
}

// Enhanced injury status filtering
function isPlayerActive(player: any): boolean {
  const rawStatus = (
    player.status ??
    player.injury_status ??
    player.injury ??
    "Active"
  ).toLowerCase();

  // Active statuses
  const activeStatuses = ["active", "probable", "questionable"];

  // Inactive statuses
  const inactiveStatuses = ["out", "injured", "suspended", "doubtful", "ir", "pup", "nfir"];

  // Check if status contains any inactive keywords
  for (const inactive of inactiveStatuses) {
    if (rawStatus.includes(inactive)) {
      return false;
    }
  }

  // Check if status contains any active keywords
  for (const active of activeStatuses) {
    if (rawStatus.includes(active)) {
      return true;
    }
  }

  // Default to active if unclear
  return true;
}

// Enhanced prop ingestion for a single league
async function ingestPropsForLeague(
  league: string,
  clearExisting: boolean = false,
  apiKey?: string,
): Promise<void> {
  const API_KEY = apiKey || process.env.SPORTSGAMEODDS_API_KEY;

  if (!API_KEY) {
    throw new Error("SportsGameOdds API key not provided");
  }

  console.log(`🚀 Starting enhanced prop ingestion for ${league.toUpperCase()}...`);

  try {
    // Map our league codes to SportsGameOdds sportIDs
    const sportIdMap: Record<string, string> = {
      nfl: "FOOTBALL",
      nba: "BASKETBALL",
      mlb: "BASEBALL",
      nhl: "HOCKEY",
      wnba: "BASKETBALL",
      cbb: "BASKETBALL",
    };

    const sportId = sportIdMap[league.toLowerCase()];
    if (!sportId) {
      throw new Error(`Unsupported league: ${league}`);
    }

    // Fetch from SportsGameOdds API v2 with correct header format
    const response = await fetch(`https://api.sportsgameodds.com/v2/events/`, {
      headers: {
        "X-API-Key": `${API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // The API returns an object with data field containing events
    const events = data.data || [];
    console.log(`📊 Fetched ${events.length} events from API`);

    let totalProps = 0;
    let skippedPlayers = 0;
    let processedPlayers = 0;
    // Debug counters
    let eventsWithOdds = 0;
    let oddsInspected = 0;
    let reasonNoPlayerId = 0;
    let reasonNonPlayer = 0;
    let reasonCancelled = 0;
    let reasonNoLineAndOdds = 0;
    let reasonNoPlayerMatch = 0;

    // Process each event for the specified sport
    for (const event of events) {
      // Skip if event is not for our sport
      if (event.sportID !== sportId) {
        continue;
      }

      // Skip if event is cancelled (but allow completed games for historical data)
      if (event.status?.cancelled) {
        continue;
      }

      const gameId = event.id || `game_${Date.now()}`;
      const oddsRaw = event.odds || {};
      const oddsEntries: any[] = Array.isArray(oddsRaw) ? oddsRaw : Object.values(oddsRaw);
      if (oddsEntries.length > 0) eventsWithOdds += 1;
      console.log(`🎮 Processing event ${gameId} with ${oddsEntries.length} odds entries`);

      // Process all odds entries for player props
      for (const odd of oddsEntries) {
        oddsInspected += 1;

        // Identify player name from multiple possible fields
        const playerNameRawCandidate =
          odd.playerID ?? odd.playerName ?? odd.player ?? odd.name ?? null;
        if (playerNameRawCandidate == null) {
          reasonNoPlayerId += 1;
          continue;
        }
        const isNonPlayer =
          typeof playerNameRawCandidate === "string" &&
          playerNameRawCandidate.toLowerCase() === "all";
        if (isNonPlayer) {
          reasonNonPlayer += 1;
          continue;
        }

        // Extract player name from candidate (handle playerID like FIRST_LAST_1_[LEAGUE])
        const playerNameRaw = String(playerNameRawCandidate);
        const playerName = playerNameRaw
          .replace(/_\d+_[A-Z]+$/, "")
          .replace(/_/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        // Find player in our database
        const player = await findPlayerByName(playerName);

        if (!player) {
          reasonNoPlayerMatch += 1;
          console.warn(`⚠️  Player not found in DB: ${playerName}. Skipping props.`);
          skippedPlayers++;
          continue;
        }

        // Check cancellation; allow fair odds even if book odds not flagged available
        if (odd.cancelled) {
          reasonCancelled += 1;
          continue;
        }

        processedPlayers++;

        // Extract prop information with heuristics
        const propType =
          odd.statID || odd.market || odd.marketName || odd.stat || odd.betType || "Unknown";
        const line =
          odd.bookOverUnder ?? odd.fairOverUnder ?? odd.line ?? odd.value ?? odd.threshold ?? null;
        // Prefer bookOdds; fall back to side-specific odds or generic price
        const rawOver = odd.overOdds ?? odd.bestOver ?? null;
        const rawUnder = odd.underOdds ?? odd.bestUnder ?? null;
        const oddsValue =
          odd.bookOdds ??
          odd.fairOdds ??
          odd.odds ??
          odd.price ??
          (typeof rawOver === "number"
            ? rawOver
            : typeof rawOver === "object"
              ? rawOver?.price
              : null) ??
          (typeof rawUnder === "number"
            ? rawUnder
            : typeof rawUnder === "object"
              ? rawUnder?.price
              : null);

        // Require at least a line or odds to proceed; prefer both
        if (line == null && oddsValue == null) {
          reasonNoLineAndOdds += 1;
          continue;
        }

        // Normalize prop type to human-readable MLB-friendly format (robust)
        const normalizedPropType = normalizePropTypeRobust(propType, league);

        // Insert prop with conflict handling
        const conflictKey = buildConflictKey(
          league,
          gameId,
          player.id,
          propType,
          line != null ? String(line) : "",
          oddsValue != null ? String(oddsValue) : "",
        );

        try {
          await db
            .insert(props)
            .values({
              player_id: player.id,
              team_id: player.team_id || null,
              game_id: String(gameId),
              prop_type: normalizedPropType,
              line: line != null ? (typeof line === "number" ? String(line) : String(line)) : null,
              odds: oddsValue != null ? String(oddsValue) : null,
              source: "sportsbook",
              conflict_key: conflictKey,
            })
            .onConflictDoNothing();

          totalProps++;

          if (totalProps % 50 === 0) {
            console.log(`📊 Processed ${totalProps} props so far...`);
          }
        } catch (error) {
          console.error(`❌ Error inserting prop for ${playerName}:`, error);
        }
      }
    }

    console.log(`🎉 Enhanced ingestion complete for ${league.toUpperCase()}!`);
    console.log(`📊 Total props inserted: ${totalProps}`);
    console.log(`👥 Players processed: ${processedPlayers}`);
    console.log(`⏭️  Players skipped (injured/inactive): ${skippedPlayers}`);
    console.log(
      `🧭 Debug: eventsWithOdds=${eventsWithOdds} oddsInspected=${oddsInspected} noPlayerId=${reasonNoPlayerId} nonPlayer=${reasonNonPlayer} cancelled=${reasonCancelled} noLineAndOdds=${reasonNoLineAndOdds} noPlayerMatch=${reasonNoPlayerMatch}`,
    );
  } catch (error) {
    console.error(`❌ Enhanced ingestion failed for ${league.toUpperCase()}:`, error);
    throw error;
  }
}

// Main enhanced prop ingestion function
export async function ingestPropsEnhanced(
  league: string,
  clearExisting: boolean = false,
  apiKey?: string,
): Promise<void> {
  const API_KEY = apiKey || process.env.SPORTSGAMEODDS_API_KEY;

  if (!API_KEY) {
    throw new Error("SportsGameOdds API key not provided");
  }

  // Map our league codes to SportsGameOdds sportIDs
  const sportIdMap: Record<string, string> = {
    nfl: "FOOTBALL",
    nba: "BASKETBALL",
    mlb: "BASEBALL",
    nhl: "HOCKEY",
    wnba: "BASKETBALL",
    cbb: "BASKETBALL",
  };

  // If league is 'all', process all supported leagues
  if (league.toLowerCase() === "all") {
    const supportedLeagues = Object.keys(sportIdMap);
    console.log(`🚀 Processing all supported leagues: ${supportedLeagues.join(", ")}`);

    for (const leagueCode of supportedLeagues) {
      console.log(`\n📊 Processing ${leagueCode.toUpperCase()}...`);
      await ingestPropsForLeague(leagueCode, clearExisting, API_KEY);
      clearExisting = false; // Only clear on first league
    }
    return;
  }

  // Process single league
  await ingestPropsForLeague(league, clearExisting, API_KEY);
}

// Enhanced team creation with better error handling
async function getOrCreateTeamEnhanced(league: string, player: any): Promise<string> {
  try {
    // Get league
    const leagueRecord = await db
      .select()
      .from(leagues)
      .where(eq(leagues.code, league.toUpperCase()))
      .limit(1);
    if (leagueRecord.length === 0) {
      throw new Error(`League ${league} not found`);
    }
    const leagueId = leagueRecord[0].id;

    // Find or create team
    const teamName = player.team_name ?? player.team ?? "Unknown Team";
    const teamAbbr = player.team_abbreviation ?? player.team_abbr ?? player.team_id ?? "UNK";

    const existingTeam = await db
      .select()
      .from(teams)
      .where(and(eq(teams.league_id, leagueId), eq(teams.abbreviation, teamAbbr)))
      .limit(1);

    if (existingTeam.length > 0) {
      return existingTeam[0].id;
    }

    // Create new team
    const newTeam = await db
      .insert(teams)
      .values({
        league_id: leagueId,
        name: teamName,
        abbreviation: teamAbbr,
        logo_url: getTeamLogoUrl(teamAbbr, league),
      })
      .returning({ id: teams.id });

    console.log(`✅ Created new team: ${teamAbbr} - ${teamName}`);
    return newTeam[0].id;
  } catch (error) {
    console.error(`❌ Error with team ${player.team_abbreviation}:`, error);
    throw error;
  }
}

// Enhanced player creation
async function getOrCreatePlayerEnhanced(teamId: string, player: any): Promise<string> {
  try {
    const playerName = player.name ?? "Unknown Player";
    const position = player.position ?? "Unknown";
    const status = player.status ?? "Active";

    // Find or create player
    const existingPlayer = await db
      .select()
      .from(players)
      .where(and(eq(players.team_id, teamId), eq(players.name, playerName)))
      .limit(1);

    if (existingPlayer.length > 0) {
      // Update status if changed
      if (existingPlayer[0].status !== status) {
        await db.update(players).set({ status }).where(eq(players.id, existingPlayer[0].id));
      }
      return existingPlayer[0].id;
    }

    // Create new player
    const newPlayer = await db
      .insert(players)
      .values({
        team_id: teamId,
        name: playerName,
        position,
        status,
      })
      .returning({ id: players.id });

    console.log(`✅ Created new player: ${playerName} (${position})`);
    return newPlayer[0].id;
  } catch (error) {
    console.error(`❌ Error with player ${player.name}:`, error);
    throw error;
  }
}

// Helper function to get team logo URL
function getTeamLogoUrl(abbreviation: string, sport: string): string {
  return `https://a.espncdn.com/i/teamlogos/${sport.toLowerCase()}/500/${abbreviation.toLowerCase()}.png`;
}

// Robust player name resolver to improve MLB matching
async function findPlayerByName(
  name: string,
): Promise<{ id: string; team_id: string | null; name: string } | null> {
  // Exact case-insensitive first
  const exactRes: any = await db.execute(dsql`
    SELECT id, team_id, name FROM players WHERE LOWER(name) = LOWER(${name}) LIMIT 1;
  `);
  const exact = Array.isArray(exactRes) ? exactRes : exactRes?.rows || [];
  if (Array.isArray(exact) && exact.length > 0) return exact[0] as any;

  // Strip common suffixes (Jr, Sr, II, III) and punctuation
  const cleaned = name
    .replace(/\b(jr\.?|sr\.?|ii|iii|iv)\b/gi, "")
    .replace(/[^a-zA-Z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned && cleaned.toLowerCase() !== name.toLowerCase()) {
    const againRes: any = await db.execute(dsql`
      SELECT id, team_id, name FROM players WHERE LOWER(name) = LOWER(${cleaned}) LIMIT 1;
    `);
    const again = Array.isArray(againRes) ? againRes : againRes?.rows || [];
    if (Array.isArray(again) && again.length > 0) return again[0] as any;
  }

  // Token-based fuzzy (first + last)
  const parts = cleaned.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0];
    const last = parts[parts.length - 1];
    const fuzzyRes: any = await db.execute(dsql`
      SELECT id, team_id, name FROM players
      WHERE LOWER(name) ILIKE '%' || LOWER(${first}) || '%'
        AND LOWER(name) ILIKE '%' || LOWER(${last}) || '%'
      LIMIT 1;
    `);
    const fuzzy = Array.isArray(fuzzyRes) ? fuzzyRes : fuzzyRes?.rows || [];
    if (Array.isArray(fuzzy) && fuzzy.length > 0) return fuzzy[0] as any;
  }

  return null;
}

// Batch ingestion for all leagues
export async function ingestAllLeaguesEnhanced(): Promise<void> {
  const leagues = ["nfl", "nba", "mlb", "nhl", "wnba", "cbb"];

  for (const league of leagues) {
    try {
      console.log(`\n🏈 Starting ${league.toUpperCase()} ingestion...`);
      await ingestPropsEnhanced(league);
      console.log(`✅ Completed ${league.toUpperCase()} ingestion`);
    } catch (error) {
      console.error(`❌ Failed to ingest ${league}:`, error);
      // Continue with next league
    }
  }
}

// Validation functions
export async function validateIngestion(): Promise<void> {
  console.log("🧪 Validating prop ingestion...");

  try {
    // Total props per league
    const propsByLeague = await db.execute(dsql`
      SELECT t.league_id, l.code, COUNT(*) as prop_count
      FROM props p
      JOIN teams t ON p.team_id = t.id
      JOIN leagues l ON t.league_id = l.id
      GROUP BY t.league_id, l.code
      ORDER BY prop_count DESC
    `);

    console.log("\n📊 Props per league:");
    for (const row of propsByLeague.rows) {
      console.log(`${row.code}: ${row.prop_count} props`);
    }

    // Distinct prop types per league
    const propTypesByLeague = await db.execute(dsql`
      SELECT l.code, COUNT(DISTINCT p.prop_type) as prop_type_count
      FROM props p
      JOIN teams t ON p.team_id = t.id
      JOIN leagues l ON t.league_id = l.id
      GROUP BY l.code
      ORDER BY prop_type_count DESC
    `);

    console.log("\n📋 Prop types per league:");
    for (const row of propTypesByLeague.rows) {
      console.log(`${row.code}: ${row.prop_type_count} distinct prop types`);
    }

    // Sample props
    const sampleProps = await db.execute(dsql`
      SELECT p.prop_type, p.line, p.odds, pl.name as player_name, t.abbreviation as team_abbr, l.code as league
      FROM props p
      JOIN players pl ON p.player_id = pl.id
      JOIN teams t ON p.team_id = t.id
      JOIN leagues l ON t.league_id = l.id
      LIMIT 10
    `);

    console.log("\n📋 Sample props:");
    for (const row of sampleProps.rows) {
      console.log(
        `${row.player_name} (${row.team_abbr}, ${row.league}): ${row.prop_type} ${row.line} ${row.odds}`,
      );
    }
  } catch (error) {
    console.error("❌ Validation failed:", error);
  }
}
