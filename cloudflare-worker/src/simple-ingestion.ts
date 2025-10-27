// Simple Prop Ingestion Worker - Raw Fetch Approach
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

const SPORTSGAMEODDS_BASE_URL = "https://api.sportsgameodds.com";

// Step 3: Lightweight Supabase REST helper
async function supabaseFetch(
  env: Env,
  table: string,
  { method = "GET", body, query = "" }: { method?: string; body?: any; query?: string } = {},
) {
  const url = `${env.SUPABASE_URL}/rest/v1/${table}${query}`;
  const res = await fetch(url, {
    method,
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(method === "POST" ? { Prefer: "resolution=merge-duplicates" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Supabase ${method} failed: ${res.status} ${res.statusText} - ${errorText}`);
  }
  return res.json();
}

// Chunk helper for batching
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

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

    return new Response("Not Found", {
      status: 404,
      headers: { "Content-Type": "text/plain" },
    });
  },
};

async function handleIngestion(request: Request, env: Env): Promise<Response> {
  try {
    const body = (await request.json()) as { league?: string; season?: string; week?: string };
    const { league = "NFL", season = "2025", week } = body;

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
        ...results,
        duration: `${duration}ms`,
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
        error: error instanceof Error ? error.message : String(error),
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
  return new Response(
    JSON.stringify({
      status: "running",
      message: "Prop ingestion service is operational",
      timestamp: new Date().toISOString(),
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
  const leaguesToProcess = league ? [league] : ["NFL", "NBA"]; // Start with 2 leagues

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
      console.log(`Request params:`, { league: currentLeague, sportID, season, week });
      const events = await fetchEvents(env, sportID, season, week);
      console.log(`Fetched ${events.length} events for ${currentLeague}`);

      if (events.length === 0) {
        console.log(`No events found for ${currentLeague} - trying fallback strategies`);

        // Fallback 1: Try season 2024
        if (season === "2025") {
          console.log(`Trying fallback: season 2024`);
          const fallbackEvents = await fetchEvents(env, sportID, "2024", week);
          if (fallbackEvents.length > 0) {
            console.log(
              `Fallback successful: found ${fallbackEvents.length} events for season 2024`,
            );
            events.push(...fallbackEvents);
          }
        }

        // Fallback 2: Try without week filter
        if (events.length === 0 && week) {
          console.log(`Trying fallback: without week filter`);
          const fallbackEvents = await fetchEvents(env, sportID, season);
          if (fallbackEvents.length > 0) {
            console.log(
              `Fallback successful: found ${fallbackEvents.length} events without week filter`,
            );
            events.push(...fallbackEvents);
          }
        }

        if (events.length === 0) {
          console.log(`No events found for ${currentLeague} after fallbacks - skipping`);
          continue;
        }
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

  return {
    totalProps,
    inserted: totalInserted,
    updated: totalUpdated,
    errors: totalErrors,
    duration: `${duration}ms`,
    leagues: league ? [league] : ["NFL", "NBA"],
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
  const maxPages = 2; // Conservative for testing

  do {
    try {
      let endpoint = `/v2/events?sportID=${sportID}&season=${season}&oddsAvailable=true&markets=playerProps&limit=10`;

      if (week) {
        endpoint += `&week=${week}`;
      }

      if (nextCursor) {
        endpoint += `&cursor=${nextCursor}`;
      }

      console.log(`Fetching events from: ${endpoint}`);

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

      const data = (await response.json()) as { events?: any[]; nextCursor?: string };
      console.log(
        `API response: ${data.events?.length || 0} events, nextCursor: ${data.nextCursor || "null"}`,
      );

      if (data.events && Array.isArray(data.events)) {
        allEvents.push(...data.events);
        console.log(`Added ${data.events.length} events, total: ${allEvents.length}`);
      }

      nextCursor = data.nextCursor || null;
      pageCount++;

      if (pageCount >= maxPages) {
        console.log(`Reached max pages (${maxPages}), stopping`);
        break;
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      break;
    }
  } while (nextCursor);

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
  let totalOdds = 0;

  if (!event.odds) {
    console.log(`Event ${event.eventID} has no odds`);
    return props;
  }

  const odds = Object.entries(event.odds);
  console.log(`Fetched odds: ${odds.length}`);

  for (const [oddId, odd] of odds) {
    totalOdds++;

    if (isPlayerProp(odd)) {
      playerPropOdds++;
      console.log(`Found player prop odd: ${oddId}`);

      try {
        const playerProps = await createPlayerPropsFromOdd(odd, oddId, event, league, season, week);
        if (playerProps && playerProps.length > 0) {
          props.push(...playerProps);
        }
      } catch (error) {
        console.error(`Error creating player props for odd ${oddId}:`, error);
      }
    }
  }

  console.log(`After market filter: ${playerPropOdds} player prop odds found`);
  console.log(`After mapping: ${props.length} props created`);
  console.log(
    `Event ${event.eventID}: ${playerPropOdds} player prop odds found, ${props.length} props created out of ${totalOdds} total odds`,
  );
  return props;
}

// Step 5: Debug harness for validation
async function mapOddDebug(
  odd: any,
  oddId: string,
  event: any,
  league: string,
  season: string,
  week?: string,
) {
  const rows = await createPlayerPropsFromOdd(odd, oddId, event, league, season, week);
  if (!rows || rows.length === 0) {
    console.error("Rejected: no rows returned", { oddId, odd });
    return null;
  }

  // Process each row
  const validRows: any[] = [];
  for (const row of rows) {
    const { player_id, date, prop_type } = row;
    if (!player_id || !date || !prop_type) {
      console.error("Missing critical", { player_id, date, prop_type, oddId, odd });
      continue;
    }
    if (row.line == null) console.warn("Null line", { oddId, row });
    if (row.over_odds == null && row.under_odds == null) console.warn("Null odds", { oddId, row });
    if (!row.sportsbook) console.warn("Missing sportsbook", { oddId, row });
    validRows.push(row);
  }

  return validRows.length > 0 ? validRows : null;
}

async function createPlayerPropsFromOdd(
  odd: any,
  oddId: string,
  event: any,
  league: string,
  season: string,
  week?: string,
): Promise<any[]> {
  if (!odd || !event) {
    console.log(`Skipping invalid odd or event: odd=${!!odd}, event=${!!event}`);
    return [];
  }

  const props: any[] = [];

  // Extract basic information
  const playerName = odd.player?.name;
  const team = odd.player?.team;
  const opponent = event.teams?.find((t: any) => t.team !== team)?.team;

  if (!playerName || !team) {
    console.log(`Skipping odd ${oddId}: missing player name or team`);
    return [];
  }

  // Generate player ID
  const playerID = `${playerName.toUpperCase().replace(/\s+/g, "_")}_1_${league}`;

  if (!playerID || playerID.includes("_1_")) {
    console.error("Missing player_id mapping", {
      playerName,
      team,
      league,
      generatedId: playerID,
    });
  }

  // Extract game date - use event date, not ingestion date
  const gameDate = event.date ? event.date.split("T")[0] : new Date().toISOString().split("T")[0];

  // Extract prop information
  const propType = odd.prop?.name;
  const line = odd.line;
  const overOdds = odd.overOdds;
  const underOdds = odd.underOdds;
  const sportsbook = mapBookmakerIdToName(odd.bookmaker?.id || "unknown") || "Consensus";

  if (!propType || line == null) {
    console.log(`Skipping odd ${oddId}: missing prop type or line`);
    return [];
  }

  // Create conflict key for upsert
  const conflictKey = `${playerID}-${propType}-${line}-${sportsbook}-${gameDate}`;

  // Create the prop record
  const prop = {
    player_id: playerID,
    player_name: playerName,
    team: team,
    opponent: opponent,
    season: parseInt(season),
    date: gameDate,
    prop_type: propType,
    line: parseFloat(line),
    over_odds: overOdds ? parseInt(overOdds) : null,
    under_odds: underOdds ? parseInt(underOdds) : null,
    sportsbook: sportsbook,
    league: league.toLowerCase(),
    is_active: true,
    last_updated: new Date().toISOString(),
    conflict_key: conflictKey,
  };

  props.push(prop);
  return props;
}

function isPlayerProp(odd: any): boolean {
  if (!odd || !odd.prop || !odd.player) {
    return false;
  }

  // Check if it's a player prop by looking at the prop type
  const propType = odd.prop.name?.toLowerCase() || "";
  const playerPropTypes = [
    "passing yards",
    "rushing yards",
    "receiving yards",
    "passing touchdowns",
    "rushing touchdowns",
    "receiving touchdowns",
    "passing completions",
    "passing attempts",
    "receptions",
    "interceptions",
    "points",
    "rebounds",
    "assists",
    "steals",
    "blocks",
    "hits",
    "runs",
    "rbis",
    "strikeouts",
    "walks",
    "goals",
    "assists",
    "shots",
    "saves",
    // Additional variations
    "pass yards",
    "rush yards",
    "rec yards",
    "pass tds",
    "rush tds",
    "rec tds",
    "completions",
    "attempts",
    "anytime td",
    "player rush tds",
  ];

  const isPlayerProp = playerPropTypes.some((type) => propType.includes(type));

  if (!isPlayerProp) {
    console.warn("Unmapped market:", { propType, oddId: odd.id, player: odd.player?.name });
  }

  return isPlayerProp;
}

function mapBookmakerIdToName(bookmakerId: string): string {
  const bookmakerMap: Record<string, string> = {
    draftkings: "DraftKings",
    fanduel: "FanDuel",
    betmgm: "BetMGM",
    caesars: "Caesars",
    pointsbet: "PointsBet",
    betrivers: "BetRivers",
    unibet: "Unibet",
    betway: "Betway",
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

// Step 6: Batch and upsert props
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
    // Use debug harness to validate props
    const validatedProps = props
      .map((prop) => {
        const { player_id, date, prop_type } = prop;
        if (!player_id || !date || !prop_type) {
          console.error("Missing critical fields in prop:", { player_id, date, prop_type, prop });
          return null;
        }
        if (prop.line == null) console.warn("Null line value for:", prop);
        if (prop.over_odds == null || prop.under_odds == null)
          console.warn("Null odds value for:", prop);
        if (!prop.sportsbook) console.warn("Missing sportsbook for:", prop);
        return prop;
      })
      .filter(Boolean);

    console.log(`Validated ${validatedProps.length} props out of ${props.length} total`);

    if (validatedProps.length === 0) {
      console.log("No valid props to upsert");
      return { inserted: 0, updated: 0, errors: props.length };
    }

    // Chunk to avoid payload limits
    const batches = chunk(validatedProps, 500);
    console.log(`Processing ${batches.length} batches of props`);
    console.log(
      `After batching: ${batches.reduce((n, b) => n + b.length, 0)} total props in batches`,
    );

    for (const batch of batches) {
      try {
        await supabaseFetch(env, "proplines", {
          method: "POST",
          body: batch,
        });
        inserted += batch.length;
        console.log(`✅ Successfully upserted batch of ${batch.length} proplines records`);
      } catch (error) {
        console.error(`❌ Error upserting batch:`, error);
        errors += batch.length;
      }
    }
  } catch (error) {
    console.error("❌ Exception during proplines upsert:", {
      error: error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      propsCount: props.length,
    });
    errors = props.length;
  }

  return { inserted, updated, errors };
}
