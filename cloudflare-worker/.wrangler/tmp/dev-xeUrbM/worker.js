var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-LDFw9b/checked-fetch.js
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

// .wrangler/tmp/bundle-LDFw9b/strip-cf-connecting-ip-header.js
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

// src/supabaseFetch.ts
async function supabaseFetch(env, table, { method = "GET", body, query = "" } = {}) {
  const url = `${env.SUPABASE_URL}/rest/v1/${table}${query}`;
  const res = await fetch(url, {
    method,
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...method === "POST" ? { Prefer: "resolution=merge-duplicates" } : {}
    },
    body: body ? JSON.stringify(body) : void 0
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`\u274C Supabase ${method} ${table} failed:`, text);
    throw new Error(text);
  }
  return res.json();
}
__name(supabaseFetch, "supabaseFetch");

// src/helpers.ts
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size)
    out.push(arr.slice(i, i + size));
  return out;
}
__name(chunk, "chunk");

// src/createPlayerPropsFromOdd.ts
function createPlayerPropsFromOdd(odd, oddId, event, league, season, week) {
  const props = [];
  const playerName = odd.player?.name;
  const team = odd.player?.team;
  if (!playerName || !team) {
    console.log(`Skipping odd ${oddId}: missing player name or team`);
    return props;
  }
  const playerID = `${playerName.toUpperCase().replace(/\s+/g, "_")}_1_${league}`;
  if (!playerID || playerID.includes("_1_")) {
    console.error("Missing player_id mapping", {
      playerName,
      team,
      league,
      generatedId: playerID
    });
  }
  const gameDate = event.date ? event.date.split("T")[0] : (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const propType = odd.prop?.name;
  const line = odd.line;
  const overOdds = odd.overOdds;
  const underOdds = odd.underOdds;
  const sportsbook = mapBookmakerIdToName(odd.bookmaker?.id || "unknown") || "Consensus";
  if (!propType || line == null) {
    console.log(`Skipping odd ${oddId}: missing prop type or line`);
    return props;
  }
  const prop = {
    player_id: playerID,
    player_name: playerName,
    team,
    opponent: event.teams?.find((t) => t !== team) || null,
    season: parseInt(season),
    date: gameDate,
    prop_type: propType,
    line: parseFloat(line),
    over_odds: overOdds ? parseInt(overOdds) : null,
    under_odds: underOdds ? parseInt(underOdds) : null,
    sportsbook,
    conflict_key: `${playerID}-${propType}-${line}-${sportsbook}-${gameDate}`
  };
  props.push(prop);
  return props;
}
__name(createPlayerPropsFromOdd, "createPlayerPropsFromOdd");
function mapBookmakerIdToName(bookmakerId) {
  const bookmakerMap = {
    "draftkings": "DraftKings",
    "fanduel": "FanDuel",
    "betmgm": "BetMGM",
    "caesars": "Caesars",
    "pointsbet": "PointsBet",
    "betrivers": "BetRivers",
    "unibet": "Unibet",
    "sugarhouse": "SugarHouse",
    "foxbet": "FOX Bet",
    "bet365": "Bet365",
    "williamhill": "William Hill",
    "pinnacle": "Pinnacle",
    "betfair": "Betfair",
    "bovada": "Bovada",
    "mybookie": "MyBookie",
    "consensus": "Consensus",
    "unknown": "Consensus"
  };
  return bookmakerMap[bookmakerId.toLowerCase()] || "Consensus";
}
__name(mapBookmakerIdToName, "mapBookmakerIdToName");

// src/worker.ts
async function fetchEvents(env, sportID, season, week) {
  let allEvents = [];
  let nextCursor = null;
  let pageCount = 0;
  const maxPages = 2;
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
      const response = await fetch(`https://api.sportsgameodds.com${endpoint}`, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Statpedia/1.0",
          "x-api-key": env.SGO_API_KEY
        }
      });
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      console.log(`API response: ${data.events?.length || 0} events, nextCursor: ${data.nextCursor || "null"}`);
      if (data.events && data.events.length > 0) {
        allEvents.push(...data.events);
      }
      nextCursor = data.nextCursor;
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
__name(fetchEvents, "fetchEvents");
async function extractPlayerPropsFromEvent(event, league, season, week) {
  const props = [];
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
  console.log(`Event ${event.eventID}: ${playerPropOdds} player prop odds found, ${props.length} props created out of ${totalOdds} total odds`);
  return props;
}
__name(extractPlayerPropsFromEvent, "extractPlayerPropsFromEvent");
function isPlayerProp(odd) {
  if (!odd || !odd.prop || !odd.player) {
    return false;
  }
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
    "player rush tds"
  ];
  const isPlayerProp2 = playerPropTypes.some((type) => propType.includes(type));
  if (!isPlayerProp2) {
    console.warn("Unmapped market:", { propType, oddId: odd.id, player: odd.player?.name });
  }
  return isPlayerProp2;
}
__name(isPlayerProp, "isPlayerProp");
async function upsertProps(env, props) {
  let inserted = 0;
  let updated = 0;
  let errors = 0;
  try {
    if (props.length === 0) {
      console.log("No props to upsert");
      return { inserted: 0, updated: 0, errors: 0 };
    }
    const validatedProps = props.filter((prop) => {
      if (!prop.player_id || !prop.date || !prop.prop_type) {
        console.error("Invalid prop missing critical fields:", prop);
        return false;
      }
      return true;
    });
    if (validatedProps.length === 0) {
      console.log("No valid props to upsert");
      return { inserted: 0, updated: 0, errors: props.length };
    }
    const batches = chunk(validatedProps, 500);
    console.log(`Processing ${batches.length} batches of props`);
    console.log(`After batching: ${batches.reduce((n, b) => n + b.length, 0)} total props in batches`);
    for (const batch of batches) {
      try {
        await supabaseFetch(env, "proplines", {
          method: "POST",
          body: batch
        });
        inserted += batch.length;
        console.log(`\u2705 Successfully upserted batch of ${batch.length} proplines records`);
      } catch (error) {
        console.error(`\u274C Error upserting batch:`, error);
        errors += batch.length;
      }
    }
  } catch (error) {
    console.error("\u274C Exception during proplines upsert:", {
      error,
      errorMessage: error.message,
      propsCount: props.length
    });
    errors += props.length;
  }
  return { inserted, updated, errors };
}
__name(upsertProps, "upsertProps");
var worker_default = {
  async fetch(req, env) {
    try {
      const url = new URL(req.url);
      if (req.method === "OPTIONS") {
        return new Response(null, {
          status: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
          }
        });
      }
      if (url.pathname === "/ingest") {
        const body = await req.json();
        const { league = "NFL", season = "2025", week } = body;
        console.log(`Starting prop ingestion for league: ${league}, season: ${season}, week: ${week || "all"}`);
        const startTime = Date.now();
        try {
          const sportID = league === "NFL" || league === "NCAAF" ? "FOOTBALL" : league === "NBA" || league === "NCAAB" ? "BASKETBALL" : league === "MLB" ? "BASEBALL" : league === "NHL" ? "HOCKEY" : "FOOTBALL";
          console.log(`Processing ${league} (${sportID})`);
          const events = await fetchEvents(env, sportID, season, week);
          console.log(`Fetched ${events.length} events for ${league}`);
          if (events.length === 0) {
            console.log(`No events found for ${league} - trying fallback strategies`);
            if (season === "2025") {
              console.log(`Trying fallback: season 2024`);
              const fallbackEvents = await fetchEvents(env, sportID, "2024", week);
              if (fallbackEvents.length > 0) {
                console.log(`Fallback successful: found ${fallbackEvents.length} events for season 2024`);
                events.push(...fallbackEvents);
              }
            }
            if (events.length === 0 && week) {
              console.log(`Trying fallback: without week filter`);
              const fallbackEvents = await fetchEvents(env, sportID, season);
              if (fallbackEvents.length > 0) {
                console.log(`Fallback successful: found ${fallbackEvents.length} events without week filter`);
                events.push(...fallbackEvents);
              }
            }
          }
          let totalProps = 0;
          let totalInserted = 0;
          let totalUpdated = 0;
          let totalErrors = 0;
          if (events.length > 0) {
            console.log(`Processing ${events.length} events`);
            for (const event of events) {
              try {
                console.log(`Processing event ${event.eventID} with ${Object.keys(event.odds || {}).length} odds`);
                const props = await extractPlayerPropsFromEvent(event, league, season, week);
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
          }
          const duration = Date.now() - startTime;
          return new Response(JSON.stringify({
            success: true,
            message: "Prop ingestion completed successfully",
            duration: `${duration}ms`,
            totalProps,
            inserted: totalInserted,
            updated: totalUpdated,
            errors: totalErrors,
            leagues: [league]
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
            message: "Prop ingestion failed",
            error: error.message
          }), {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        }
      }
      return new Response("Statpedia Player Props Worker", { status: 200 });
    } catch (err) {
      console.error("Worker error:", err);
      return new Response("Internal error", { status: 500 });
    }
  }
};

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

// .wrangler/tmp/bundle-LDFw9b/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

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

// .wrangler/tmp/bundle-LDFw9b/middleware-loader.entry.ts
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
//# sourceMappingURL=worker.js.map
