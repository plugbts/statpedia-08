var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-hMZNzw/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// .wrangler/tmp/bundle-hMZNzw/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// src/simple-ingestion.ts
var CANONICAL_PROP_TYPES = {
  "passing_yards": "Passing Yards",
  "passing_completions": "Passing Completions",
  "passing_touchdowns": "Passing TDs",
  "rushing_yards": "Rushing Yards",
  "rushing_attempts": "Rushing Attempts",
  "rushing_touchdowns": "Rushing TDs",
  "receiving_yards": "Receiving Yards",
  "receptions": "Receptions",
  "receiving_touchdowns": "Receiving TDs",
  "passing_interceptions": "Interceptions",
  "extraPoints_kicksMade": "Extra Points Made",
  "fieldGoals_made": "Field Goals Made",
  "kicking_totalPoints": "Kicking Total Points",
  "firstTouchdown": "First Touchdown",
  "firstToScore": "First to Score",
  "points": "Points",
  "assists": "Assists",
  "rebounds": "Rebounds",
  "three_pointers_made": "3PM",
  "steals": "Steals",
  "blocks": "Blocks",
  "turnovers": "Turnovers",
  "hits": "Hits",
  "runs": "Runs",
  "rbis": "RBIs",
  "home_runs": "Home Runs",
  "total_bases": "Total Bases",
  "stolen_bases": "Stolen Bases",
  "strikeouts": "Pitcher Ks",
  "outs": "Pitcher Outs",
  "earned_runs": "ER Allowed",
  "goals": "Goals",
  "shots_on_goal": "Shots",
  "power_play_points": "PPP",
  "saves": "Saves"
};
var SPORTSGAMEODDS_BASE_URL = "https://api.sportsgameodds.com";
var simple_ingestion_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
      });
    }
    if (url.pathname === "/ingest" && request.method === "POST") {
      return handleIngestion(request, env);
    }
    if (url.pathname === "/ingest" && request.method === "GET") {
      return handleIngestionStatus(request, env);
    }
    return new Response("Prop Ingestion Worker - Use POST /ingest to start ingestion", {
      status: 200,
      headers: { "Content-Type": "text/plain" }
    });
  }
};
async function handleIngestion(request, env) {
  try {
    const body = await request.json();
    const { league, season = "2025", week } = body;
    console.log(`Starting prop ingestion for league: ${league || "all"}, season: ${season}, week: ${week || "all"}`);
    const startTime = Date.now();
    const results = await runIngestion(env, league, season, week);
    const duration = Date.now() - startTime;
    return new Response(JSON.stringify({
      success: true,
      message: "Prop ingestion completed successfully",
      duration: `${duration}ms`,
      ...results
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (error) {
    console.error("Ingestion failed:", error);
    return new Response(JSON.stringify({
      success: false,
      message: "Ingestion failed",
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}
__name(handleIngestion, "handleIngestion");
async function handleIngestionStatus(request, env) {
  return new Response(JSON.stringify({
    status: "ready",
    message: "Prop ingestion worker is ready",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
__name(handleIngestionStatus, "handleIngestionStatus");
async function runIngestion(env, league, season = "2025", week) {
  console.log(`Starting prop ingestion for league: ${league || "all"}, season: ${season}, week: ${week || "all"}`);
  const startTime = Date.now();
  let totalProps = 0;
  let totalInserted = 0;
  let totalUpdated = 0;
  let totalErrors = 0;
  const leaguesToProcess = league ? [league] : ["NFL", "NBA"];
  for (const currentLeague of leaguesToProcess) {
    const sportID = currentLeague === "NFL" || currentLeague === "NCAAF" ? "FOOTBALL" : currentLeague === "NBA" || currentLeague === "NCAAB" ? "BASKETBALL" : currentLeague === "MLB" ? "BASEBALL" : currentLeague === "NHL" ? "HOCKEY" : "FOOTBALL";
    console.log(`Processing ${currentLeague} (${sportID})`);
    try {
      console.log(`About to fetch events for sportID: ${sportID}, season: ${season}, week: ${week}`);
      const events = await fetchEvents(env, sportID, season, week);
      console.log(`Fetched ${events.length} events for ${currentLeague}`);
      if (events.length === 0) {
        console.log(`No events found for ${currentLeague} - skipping`);
        continue;
      }
      console.log(`First event details for ${currentLeague}:`, {
        eventID: events[0]?.eventID,
        teams: events[0]?.teams,
        oddsCount: Object.keys(events[0]?.odds || {}).length,
        hasOdds: !!events[0]?.odds
      });
      for (const event of events) {
        try {
          console.log(`Processing event ${event.eventID} with ${Object.keys(event.odds || {}).length} odds`);
          const props = await extractPlayerPropsFromEvent(event, currentLeague, season, week);
          console.log(`Extracted ${props.length} props from event ${event.eventID}`);
          if (props.length > 0) {
            console.log(`Found ${props.length} props in event ${event.eventID}`);
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
    leagues: league ? [league] : ["NFL", "NBA"]
  };
}
__name(runIngestion, "runIngestion");
async function fetchEvents(env, sportID, season, week) {
  let allEvents = [];
  let nextCursor = null;
  let pageCount = 0;
  const maxPages = 2;
  do {
    try {
      let endpoint = `/v2/events?sportID=${sportID}&season=${season}&oddsAvailable=true&markets=playerProps&limit=10`;
      if (week)
        endpoint += `&week=${week}`;
      if (nextCursor)
        endpoint += `&cursor=${nextCursor}`;
      console.log(`Making API call to: ${SPORTSGAMEODDS_BASE_URL}${endpoint}`);
      const response = await fetch(`${SPORTSGAMEODDS_BASE_URL}${endpoint}`, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Statpedia/1.0",
          "x-api-key": env.SGO_API_KEY
        }
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
      console.log(`Page ${pageCount + 1}: Fetched ${events.length} events (${allEvents.length} total)`);
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
__name(fetchEvents, "fetchEvents");
async function extractPlayerPropsFromEvent(event, league, season, week) {
  const props = [];
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
          week
        );
        props.push(...playerProps);
        processedOdds += playerProps.length;
      }
    } catch (error) {
      console.error(`Error processing odd ${oddId}:`, error);
    }
  }
  console.log(`Event ${event.eventID}: ${playerPropOdds} player prop odds found, ${processedOdds} props created out of ${totalOdds} total odds`);
  return props;
}
__name(extractPlayerPropsFromEvent, "extractPlayerPropsFromEvent");
function isPlayerProp(odd, oddId) {
  if (!odd || !oddId)
    return false;
  const oddIdParts = oddId.split("-");
  if (oddIdParts.length < 5)
    return false;
  const [statID, playerID, periodID, betTypeID, sideID] = oddIdParts;
  const isPlayerID = /^[A-Z_]+_[A-Z_]+_\d+_[A-Z]+$/.test(playerID);
  const isOverUnder = betTypeID === "ou" || betTypeID === "over_under";
  const isOverSide = sideID === "over";
  const normalizedStatID = statID.toLowerCase();
  const isPlayerStat = Object.keys(CANONICAL_PROP_TYPES).includes(normalizedStatID) || normalizedStatID.includes("passing") || normalizedStatID.includes("rushing") || normalizedStatID.includes("receiving") || normalizedStatID.includes("touchdown") || normalizedStatID.includes("yards") || normalizedStatID.includes("receptions") || normalizedStatID.includes("field") || normalizedStatID.includes("kicking") || normalizedStatID.includes("points");
  return isPlayerID && isOverUnder && isOverSide && isPlayerStat;
}
__name(isPlayerProp, "isPlayerProp");
async function createPlayerPropsFromOdd(odd, oddId, event, league, season, week) {
  const props = [];
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
        if (!overData.available)
          continue;
        const underData = underOdd.byBookmaker?.[bookmakerId];
        if (!underData || !underData.available)
          continue;
        const prop = createIngestedPlayerProp(
          odd,
          oddId,
          overData,
          underData,
          bookmakerId,
          event,
          league,
          season,
          week
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
__name(createPlayerPropsFromOdd, "createPlayerPropsFromOdd");
function createIngestedPlayerProp(odd, oddId, overData, underData, bookmakerId, event, league, season, week) {
  try {
    const oddIdParts = oddId.split("-");
    const playerID = oddIdParts.length >= 2 ? oddIdParts[1] : odd.playerID || odd.statEntityID;
    const statID = oddIdParts.length >= 1 ? oddIdParts[0] : odd.statID;
    const playerName = extractPlayerName(playerID);
    const team = extractTeam(playerID, event.teams?.home?.names?.short, event.teams?.away?.names?.short);
    const sportsbookName = mapBookmakerIdToName(bookmakerId);
    const propType = normalizePropType(statID);
    const overOdds = parseOdds(overData.odds);
    const underOdds = parseOdds(underData.odds);
    const line = overData.overUnder || overData.line || 0;
    if (!overOdds || !underOdds || !line) {
      return null;
    }
    const gameTime = new Date(event.status?.startsAt || /* @__PURE__ */ new Date());
    const gameDate = gameTime.toISOString().split("T")[0];
    if (!gameDate || gameDate === "Invalid Date" || gameDate.includes("Invalid")) {
      return null;
    }
    if (!playerID || !playerName || !team || !propType || !sportsbookName) {
      return null;
    }
    const conflictKey = `${playerID}-${propType}-${line}-${sportsbookName}-${gameDate}`;
    return {
      player_id: playerID.substring(0, 64),
      player_name: playerName.substring(0, 128),
      team: team.substring(0, 8),
      opponent: (team === event.teams?.home?.names?.short ? event.teams?.away?.names?.short : event.teams?.home?.names?.short)?.substring(0, 8) || "UNKNOWN",
      season: parseInt(season),
      date: gameDate,
      prop_type: propType.substring(0, 64),
      line,
      over_odds: overOdds,
      under_odds: underOdds,
      sportsbook: sportsbookName.substring(0, 32),
      conflict_key: conflictKey
    };
  } catch (error) {
    console.error("Error creating player prop:", error);
    return null;
  }
}
__name(createIngestedPlayerProp, "createIngestedPlayerProp");
function extractPlayerName(playerID) {
  try {
    const parts = playerID.split("_");
    if (parts.length < 4)
      return "Unknown Player";
    const firstName = parts[0].charAt(0) + parts[0].slice(1).toLowerCase();
    const lastName = parts[1].charAt(0) + parts[1].slice(1).toLowerCase();
    return `${firstName} ${lastName}`;
  } catch (error) {
    return "Unknown Player";
  }
}
__name(extractPlayerName, "extractPlayerName");
function extractTeam(playerID, homeTeam, awayTeam) {
  return Math.random() > 0.5 ? homeTeam || "HOME" : awayTeam || "AWAY";
}
__name(extractTeam, "extractTeam");
function normalizePropType(statID) {
  return CANONICAL_PROP_TYPES[statID.toLowerCase()] || statID.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}
__name(normalizePropType, "normalizePropType");
function parseOdds(odds) {
  if (odds === null || odds === void 0)
    return null;
  if (typeof odds === "number")
    return odds;
  if (typeof odds === "string") {
    const cleanOdds = odds.replace(/[^-+0-9]/g, "");
    const parsed = parseInt(cleanOdds);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}
__name(parseOdds, "parseOdds");
function mapBookmakerIdToName(bookmakerId) {
  const bookmakerMap = {
    "fanduel": "FanDuel",
    "draftkings": "Draft Kings",
    "betmgm": "BetMGM",
    "caesars": "Caesars",
    "pointsbet": "PointsBet",
    "betrivers": "BetRivers",
    "foxbet": "FOX Bet",
    "bet365": "bet365",
    "williamhill": "William Hill",
    "pinnacle": "Pinnacle",
    "bovada": "Bovada",
    "betonline": "BetOnline",
    "betway": "Betway",
    "unibet": "Unibet",
    "ladbrokes": "Ladbrokes",
    "coral": "Coral",
    "paddypower": "Paddy Power",
    "skybet": "Sky Bet",
    "boylesports": "BoyleSports",
    "betfair": "Betfair",
    "betvictor": "Bet Victor",
    "betfred": "Betfred",
    "prizepicks": "PrizePicks",
    "fliff": "Fliff",
    "prophetexchange": "Prophet Exchange",
    "unknown": "Unknown Sportsbook"
  };
  return bookmakerMap[bookmakerId.toLowerCase()] || bookmakerId;
}
__name(mapBookmakerIdToName, "mapBookmakerIdToName");
async function upsertProps(env, props) {
  if (!props || props.length === 0) {
    return { inserted: 0, updated: 0, errors: 0 };
  }
  let inserted = 0;
  let updated = 0;
  let errors = 0;
  try {
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_KEY;
    const response = await fetch(`${supabaseUrl}/rest/v1/proplines`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
        "apikey": supabaseKey,
        "Prefer": "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify(props)
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Supabase upsert failed:", response.status, errorText);
      errors = props.length;
    } else {
      inserted = props.length;
    }
  } catch (error) {
    console.error("Error upserting props:", error);
    errors = props.length;
  }
  return { inserted, updated, errors };
}
__name(upsertProps, "upsertProps");

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-hMZNzw/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = simple_ingestion_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-hMZNzw/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=simple-ingestion.js.map
