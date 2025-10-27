// Prop Ingestion Worker - Migrated from Supabase Edge Function
// Handles heavy data processing without timeout constraints

/// <reference types="@cloudflare/workers-types" />

export interface Env {
  SGO_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  CACHE_TTL_SECONDS?: string;
  MAX_EVENTS_PER_REQUEST?: string;
  MAX_PROPS_PER_REQUEST?: string;
}

// Canonical prop types mapping
const CANONICAL_PROP_TYPES: Record<string, string> = {
  passing_yards: "Passing Yards",
  passing_completions: "Passing Completions",
  passing_touchdowns: "Passing TDs",
  rushing_yards: "Rushing Yards",
  rushing_attempts: "Rushing Attempts",
  rushing_touchdowns: "Rushing TDs",
  receiving_yards: "Receiving Yards",
  receptions: "Receptions",
  receiving_touchdowns: "Receiving TDs",
  passing_interceptions: "Interceptions",
  extraPoints_kicksMade: "Extra Points Made",
  fieldGoals_made: "Field Goals Made",
  kicking_totalPoints: "Kicking Total Points",
  firstTouchdown: "First Touchdown",
  firstToScore: "First to Score",
  points: "Points",
  assists: "Assists",
  rebounds: "Rebounds",
  three_pointers_made: "3PM",
  steals: "Steals",
  blocks: "Blocks",
  turnovers: "Turnovers",
  hits: "Hits",
  runs: "Runs",
  rbis: "RBIs",
  home_runs: "Home Runs",
  total_bases: "Total Bases",
  stolen_bases: "Stolen Bases",
  strikeouts: "Pitcher Ks",
  outs: "Pitcher Outs",
  earned_runs: "ER Allowed",
  goals: "Goals",
  shots_on_goal: "Shots",
  power_play_points: "PPP",
  saves: "Saves",
};

// League configuration
const LEAGUE_CONFIG = {
  FOOTBALL: {
    sportID: "FOOTBALL",
    leagues: ["NFL", "NCAAF"],
    maxEventsPerRequest: 25,
    cacheDuration: 4 * 60 * 60 * 1000, // 4 hours
  },
  BASKETBALL: {
    sportID: "BASKETBALL",
    leagues: ["NBA", "NCAAB"],
    maxEventsPerRequest: 25,
    cacheDuration: 4 * 60 * 60 * 1000,
  },
  BASEBALL: {
    sportID: "BASEBALL",
    leagues: ["MLB"],
    maxEventsPerRequest: 25,
    cacheDuration: 4 * 60 * 60 * 1000,
  },
  HOCKEY: {
    sportID: "HOCKEY",
    leagues: ["NHL"],
    maxEventsPerRequest: 25,
    cacheDuration: 4 * 60 * 60 * 1000,
  },
};

const SPORTSGAMEODDS_BASE_URL = "https://api.sportsgameodds.com";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    // Route handling
    if (url.pathname === "/ingest" && request.method === "POST") {
      return handleIngestion(request, env);
    }

    if (url.pathname === "/ingest" && request.method === "GET") {
      return handleIngestionStatus(request, env);
    }

    return new Response("Prop Ingestion Worker - Use POST /ingest to start ingestion", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  },
};

async function handleIngestion(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json();
    const { league, season = "2025", week } = body;

    console.log(
      `Starting prop ingestion for league: ${league || "all"}, season: ${season}, week: ${week || "all"}`,
    );

    const startTime = Date.now();
    const results = await runIngestion(env, league, season, week);
    const duration = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Prop ingestion completed successfully",
        duration: `${duration}ms`,
        ...results,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (error) {
    console.error("Ingestion failed:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Ingestion failed",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
}

async function handleIngestionStatus(request: Request, env: Env): Promise<Response> {
  // Return current status - could be enhanced to show progress
  return new Response(
    JSON.stringify({
      status: "ready",
      message: "Prop ingestion worker is ready",
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}

async function runIngestion(env: Env, league?: string, season: string = "2025", week?: string) {
  console.log(
    `Starting prop ingestion for league: ${league || "all"}, season: ${season}, week: ${week || "all"}`,
  );

  const startTime = Date.now();
  let totalProps = 0;
  let totalInserted = 0;
  let totalUpdated = 0;
  let totalErrors = 0;

  // Process all leagues if no specific league provided
  const leaguesToProcess = league ? [league] : ["NFL", "NCAAF", "NBA", "NCAAB", "MLB", "NHL"];

  for (const currentLeague of leaguesToProcess) {
    const sportID =
      currentLeague === "NFL" || currentLeague === "NCAAF"
        ? "FOOTBALL"
        : currentLeague === "NBA" || currentLeague === "NCAAB"
          ? "BASKETBALL"
          : currentLeague === "MLB"
            ? "BASEBALL"
            : currentLeague === "NHL"
              ? "HOCKEY"
              : "FOOTBALL";

    console.log(`Processing ${currentLeague} (${sportID})`);

    try {
      // Fetch events from SportsGameOdds API
      console.log(
        `About to fetch events for sportID: ${sportID}, season: ${season}, week: ${week}`,
      );
      const events = await fetchEvents(env, sportID, season, week);
      console.log(`Fetched ${events.length} events for ${currentLeague}`);

      if (events.length === 0) {
        console.log(`No events found for ${currentLeague} - skipping`);
        continue;
      }

      // Log details about the first few events
      console.log(`First event details for ${currentLeague}:`, {
        eventID: events[0]?.eventID,
        teams: events[0]?.teams,
        oddsCount: Object.keys(events[0]?.odds || {}).length,
        hasOdds: !!events[0]?.odds,
      });

      // Extract and process player props
      for (const event of events) {
        try {
          console.log(
            `Processing event ${event.eventID} with ${Object.keys(event.odds || {}).length} odds`,
          );
          const props = await extractPlayerPropsFromEvent(event, currentLeague, season, week);
          console.log(`Extracted ${props.length} props from event ${event.eventID}`);

          if (props.length > 0) {
            console.log(`Found ${props.length} props in event ${event.eventID}`);
            // Process all props
            const upsertResult = await upsertProps(env, props);
            totalInserted += upsertResult.inserted;
            totalUpdated += upsertResult.updated;
            totalErrors += upsertResult.errors;
            totalProps += props.length;
          }
        } catch (error) {
          console.error(`Error processing event ${event.eventID}:`, error);
          totalErrors++;
        }
      }
    } catch (error) {
      console.error(`Error processing league ${currentLeague}:`, error);
      totalErrors++;
    }
  }

  const duration = Date.now() - startTime;

  // Log ingestion stats
  await logIngestionStats(env, {
    totalProps,
    inserted: totalInserted,
    updated: totalUpdated,
    errors: totalErrors,
    duration: `${duration}ms`,
    leagues: league ? [league] : ["NFL", "NCAAF", "NBA", "NCAAB", "MLB", "NHL"],
  });

  return {
    totalProps,
    inserted: totalInserted,
    updated: totalUpdated,
    errors: totalErrors,
    duration: `${duration}ms`,
    leagues: league ? [league] : ["NFL", "NCAAF", "NBA", "NCAAB", "MLB", "NHL"],
  };
}

async function fetchEvents(
  env: Env,
  sportID: string,
  season: string,
  week?: string,
): Promise<any[]> {
  const allEvents: any[] = [];
  let nextCursor: string | null = null;
  let pageCount = 0;
  const maxPages = 5; // Can be higher in worker environment

  do {
    try {
      let endpoint = `/v2/events?sportID=${sportID}&season=${season}&oddsAvailable=true&markets=playerProps&limit=25`;
      if (week) endpoint += `&week=${week}`;
      if (nextCursor) endpoint += `&cursor=${nextCursor}`;

      console.log(`Making API call to: ${SPORTSGAMEODDS_BASE_URL}${endpoint}`);

      const response = await fetch(`${SPORTSGAMEODDS_BASE_URL}${endpoint}`, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Statpedia/1.0",
          "x-api-key": env.SGO_API_KEY,
        },
      });

      if (!response.ok) {
        console.error(`API request failed: ${response.status} ${response.statusText}`);
        break;
      }

      const data = await response.json();

      if (!data.success || !data.data) {
        console.error("API returned unsuccessful response:", data);
        break;
      }

      const events = data.data;
      allEvents.push(...events);

      console.log(
        `Page ${pageCount + 1}: Fetched ${events.length} events (${allEvents.length} total)`,
      );

      // Check for next page
      nextCursor = data.pagination?.nextCursor || null;
      pageCount++;
    } catch (error) {
      console.error(`Error fetching events (page ${pageCount + 1}):`, error);
      break;
    }
  } while (nextCursor && pageCount < maxPages);

  console.log(`Total events fetched: ${allEvents.length}`);
  return allEvents;
}

async function extractPlayerPropsFromEvent(
  event: any,
  league: string,
  season: string,
  week?: string,
): Promise<any[]> {
  const props: any[] = [];

  let playerPropOdds = 0;
  let processedOdds = 0;
  let totalOdds = 0;

  for (const [oddId, oddData] of Object.entries(event.odds || {})) {
    totalOdds++;
    try {
      if (isPlayerProp(oddData, oddId)) {
        playerPropOdds++;
        const playerProps = await createPlayerPropsFromOdd(
          oddData,
          oddId,
          event,
          league,
          season,
          week,
        );
        props.push(...playerProps);
        processedOdds += playerProps.length;
      }
    } catch (error) {
      console.error(`Error processing odd ${oddId}:`, error);
    }
  }

  console.log(
    `Event ${event.eventID}: ${playerPropOdds} player prop odds found, ${processedOdds} props created out of ${totalOdds} total odds`,
  );
  return props;
}

function isPlayerProp(odd: any, oddId: string): boolean {
  if (!odd || !oddId) return false;

  const oddIdParts = oddId.split("-");
  if (oddIdParts.length < 5) return false;

  const [statID, playerID, periodID, betTypeID, sideID] = oddIdParts;

  // Check if the second part looks like a player ID (FIRSTNAME_LASTNAME_NUMBER_LEAGUE)
  const isPlayerID = /^[A-Z_]+_[A-Z_]+_\d+_[A-Z]+$/.test(playerID);

  // Check if it's an over/under bet
  const isOverUnder = betTypeID === "ou" || betTypeID === "over_under";

  // Only process 'over' side - we'll handle both over and under from the same odd
  const isOverSide = sideID === "over";

  // Check if the statID is one we can normalize (or is a common player prop)
  const normalizedStatID = statID.toLowerCase();
  const isPlayerStat =
    Object.keys(CANONICAL_PROP_TYPES).includes(normalizedStatID) ||
    normalizedStatID.includes("passing") ||
    normalizedStatID.includes("rushing") ||
    normalizedStatID.includes("receiving") ||
    normalizedStatID.includes("touchdown") ||
    normalizedStatID.includes("yards") ||
    normalizedStatID.includes("receptions") ||
    normalizedStatID.includes("field") ||
    normalizedStatID.includes("kicking") ||
    normalizedStatID.includes("points");

  return isPlayerID && isOverUnder && isOverSide && isPlayerStat;
}

async function createPlayerPropsFromOdd(
  odd: any,
  oddId: string,
  event: any,
  league: string,
  season: string,
  week?: string,
): Promise<any[]> {
  const props: any[] = [];

  if (!oddId.includes("-over")) {
    return props;
  }

  const underOddId = oddId.replace("-over", "-under");
  const underOdd = event.odds[underOddId];

  if (!underOdd) {
    return props;
  }

  if (odd.byBookmaker) {
    for (const [bookmakerId, bookmakerData] of Object.entries(odd.byBookmaker)) {
      try {
        const overData = bookmakerData;

        if (!overData.available) continue;

        const underData = underOdd.byBookmaker?.[bookmakerId];
        if (!underData || !underData.available) continue;

        const prop = createIngestedPlayerProp(
          odd,
          oddId,
          overData,
          underData,
          bookmakerId,
          event,
          league,
          season,
          week,
        );

        if (prop) {
          props.push(prop);
        }
      } catch (error) {
        console.error(`Error processing bookmaker ${bookmakerId}:`, error);
      }
    }
  }

  return props;
}

function createIngestedPlayerProp(
  odd: any,
  oddId: string,
  overData: any,
  underData: any,
  bookmakerId: string,
  event: any,
  league: string,
  season: string,
  week?: string,
): any {
  try {
    const oddIdParts = oddId.split("-");

    const playerID = oddIdParts.length >= 2 ? oddIdParts[1] : odd.playerID || odd.statEntityID;
    const statID = oddIdParts.length >= 1 ? oddIdParts[0] : odd.statID;

    const playerName = extractPlayerName(playerID);
    const team = extractTeam(
      playerID,
      event.teams?.home?.names?.short,
      event.teams?.away?.names?.short,
    );
    const sportsbookName = mapBookmakerIdToName(bookmakerId);

    const propType = normalizePropType(statID);
    const overOdds = parseOdds(overData.odds);
    const underOdds = parseOdds(underData.odds);
    const line = overData.overUnder || overData.line || 0;

    if (!overOdds || !underOdds || !line) {
      return null;
    }

    const gameTime = new Date(event.status?.startsAt || new Date());
    const gameDate = gameTime.toISOString().split("T")[0];

    if (!gameDate || gameDate === "Invalid Date" || gameDate.includes("Invalid")) {
      return null;
    }

    if (!playerID || !playerName || !team || !propType || !sportsbookName) {
      return null;
    }

    return {
      player_id: playerID.substring(0, 64),
      player_name: playerName.substring(0, 128),
      team: team.substring(0, 8),
      opponent:
        (team === event.teams?.home?.names?.short
          ? event.teams?.away?.names?.short
          : event.teams?.home?.names?.short
        )?.substring(0, 8) || "UNKNOWN",
      season: parseInt(season),
      date: gameDate,
      prop_type: propType.substring(0, 64),
      line: line,
      over_odds: overOdds,
      under_odds: underOdds,
      sportsbook: sportsbookName.substring(0, 32),
    };
  } catch (error) {
    console.error("Error creating player prop:", error);
    return null;
  }
}

function extractPlayerName(playerID: string): string {
  try {
    const parts = playerID.split("_");
    if (parts.length < 4) return "Unknown Player";

    const firstName = parts[0].charAt(0) + parts[0].slice(1).toLowerCase();
    const lastName = parts[1].charAt(0) + parts[1].slice(1).toLowerCase();

    return `${firstName} ${lastName}`;
  } catch (error) {
    return "Unknown Player";
  }
}

function extractTeam(playerID: string, homeTeam?: string, awayTeam?: string): string {
  return Math.random() > 0.5 ? homeTeam || "HOME" : awayTeam || "AWAY";
}

function normalizePropType(statID: string): string {
  return (
    CANONICAL_PROP_TYPES[statID.toLowerCase()] ||
    statID.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  );
}

function parseOdds(odds: any): number | null {
  if (odds === null || odds === undefined) return null;

  if (typeof odds === "number") return odds;

  if (typeof odds === "string") {
    const cleanOdds = odds.replace(/[^-+0-9]/g, "");
    const parsed = parseInt(cleanOdds);
    return isNaN(parsed) ? null : parsed;
  }

  return null;
}

function mapBookmakerIdToName(bookmakerId: string): string {
  const bookmakerMap: Record<string, string> = {
    fanduel: "FanDuel",
    draftkings: "Draft Kings",
    betmgm: "BetMGM",
    caesars: "Caesars",
    pointsbet: "PointsBet",
    betrivers: "BetRivers",
    foxbet: "FOX Bet",
    bet365: "bet365",
    williamhill: "William Hill",
    pinnacle: "Pinnacle",
    bovada: "Bovada",
    betonline: "BetOnline",
    betway: "Betway",
    unibet: "Unibet",
    ladbrokes: "Ladbrokes",
    coral: "Coral",
    paddypower: "Paddy Power",
    skybet: "Sky Bet",
    boylesports: "BoyleSports",
    betfair: "Betfair",
    betvictor: "Bet Victor",
    betfred: "Betfred",
    prizepicks: "PrizePicks",
    fliff: "Fliff",
    prophetexchange: "Prophet Exchange",
    unknown: "Unknown Sportsbook",
  };

  return bookmakerMap[bookmakerId.toLowerCase()] || bookmakerId;
}

async function upsertProps(
  env: Env,
  props: any[],
): Promise<{ inserted: number; updated: number; errors: number }> {
  if (!props || props.length === 0) {
    return { inserted: 0, updated: 0, errors: 0 };
  }

  let inserted = 0;
  const updated = 0;
  let errors = 0;

  try {
    // Create Supabase client
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_KEY;

    const response = await fetch(`${supabaseUrl}/rest/v1/player_props`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(props),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Supabase upsert failed:", response.status, errorText);
      errors = props.length;
    } else {
      const result = await response.json();
      inserted = result.length || props.length;
    }
  } catch (error) {
    console.error("Error upserting props:", error);
    errors = props.length;
  }

  return { inserted, updated, errors };
}

async function logIngestionStats(env: Env, stats: any): Promise<void> {
  try {
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_KEY;

    await fetch(`${supabaseUrl}/rest/v1/ingestion_stats`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
      },
      body: JSON.stringify({
        ...stats,
        timestamp: new Date().toISOString(),
        source: "cloudflare-worker",
      }),
    });
  } catch (error) {
    console.error("Error logging ingestion stats:", error);
  }
}
