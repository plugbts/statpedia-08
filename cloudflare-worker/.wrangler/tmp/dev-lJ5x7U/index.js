var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-fun02F/checked-fetch.js
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

// .wrangler/tmp/bundle-fun02F/strip-cf-connecting-ip-header.js
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

// src/cors.ts
function withCORS(resp, origin = "*") {
  const headers = new Headers(resp.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  headers.set("Access-Control-Allow-Credentials", "true");
  return new Response(resp.body, { ...resp, headers });
}
__name(withCORS, "withCORS");
function handleOptions(request, origin = "*") {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Credentials": "true"
      }
    });
  }
  return null;
}
__name(handleOptions, "handleOptions");

// src/market-mapper.ts
var MARKET_ALIASES = {
  // Passing markets
  "Passing Yards": "Passing Yards",
  "passing_yards": "Passing Yards",
  "Passing Attempts": "Passing Attempts",
  "passing_attempts": "Passing Attempts",
  "Passing Completions": "Passing Completions",
  "passing_completions": "Passing Completions",
  "Passing Touchdowns": "Passing TDs",
  "passing_touchdowns": "Passing TDs",
  "Passing Interceptions": "Passing INTs",
  "passing_interceptions": "Passing INTs",
  // Rushing markets
  "Rushing Yards": "Rushing Yards",
  "rushing_yards": "Rushing Yards",
  "Rushing Attempts": "Rushing Attempts",
  "rushing_attempts": "Rushing Attempts",
  "Rushing Touchdowns": "Rushing TDs",
  "rushing_touchdowns": "Rushing TDs",
  // Receiving markets
  "Receiving Yards": "Receiving Yards",
  "receiving_yards": "Receiving Yards",
  "Receiving Receptions": "Receptions",
  "receiving_receptions": "Receptions",
  "Receiving Touchdowns": "Receiving TDs",
  "receiving_touchdowns": "Receiving TDs",
  "Receiving Longest Reception": "Longest Reception",
  "receiving_longestReception": "Longest Reception",
  // Touchdown markets
  "Touchdowns": "Touchdowns",
  "touchdowns": "Touchdowns",
  "First Touchdown": "First Touchdown",
  "first_touchdown": "First Touchdown",
  "Last Touchdown": "Last Touchdown",
  "last_touchdown": "Last Touchdown",
  "Anytime Touchdown": "Anytime Touchdown",
  "anytime_touchdown": "Anytime Touchdown",
  // Kicking markets
  "Field Goals Made": "Field Goals Made",
  "field_goals_made": "Field Goals Made",
  "Extra Points Made": "Extra Points Made",
  "extra_points_made": "Extra Points Made",
  "Kicking Total Points": "Kicking Total Points",
  "kicking_totalPoints": "Kicking Total Points",
  // Defensive markets
  "Tackles + Assists": "Tackles + Assists",
  "tackles_assists": "Tackles + Assists",
  "Tackles": "Tackles",
  "tackles": "Tackles",
  "Interceptions": "Interceptions",
  "interceptions": "Interceptions",
  "Sacks": "Sacks",
  "sacks": "Sacks",
  "Passes Defended": "Passes Defended",
  "passes_defended": "Passes Defended",
  "Forced Fumbles": "Forced Fumbles",
  "forced_fumbles": "Forced Fumbles",
  "Fumble Recoveries": "Fumble Recoveries",
  "fumble_recoveries": "Fumble Recoveries",
  // Fantasy/Scoring markets
  "Fantasy Score": "Fantasy Score",
  "fantasyScore": "Fantasy Score",
  "Turnovers": "Turnovers",
  "turnovers": "Turnovers",
  // Team markets
  "Team Total Points": "Team Total Points",
  "team_total_points": "Team Total Points",
  "Team Total Touchdowns": "Team Total Touchdowns",
  "team_total_touchdowns": "Team Total Touchdowns",
  "Team Total Field Goals": "Team Total Field Goals",
  "team_total_field_goals": "Team Total Field Goals",
  "Team Total Sacks": "Team Total Sacks",
  "team_total_sacks": "Team Total Sacks",
  "Team Total Interceptions": "Team Total Interceptions",
  "team_total_interceptions": "Team Total Interceptions",
  // NBA markets
  "Points": "Points",
  "points": "Points",
  "Rebounds": "Rebounds",
  "rebounds": "Rebounds",
  "Assists": "Assists",
  "assists": "Assists",
  "3-Pointers Made": "3-Pointers Made",
  "threes_made": "3-Pointers Made",
  "Steals": "Steals",
  "steals": "Steals",
  "Blocks": "Blocks",
  "blocks": "Blocks",
  // MLB markets
  "Hits": "Hits",
  "hits": "Hits",
  "Home Runs": "Home Runs",
  "home_runs": "Home Runs",
  "RBIs": "RBIs",
  "rbis": "RBIs",
  "Strikeouts": "Strikeouts",
  "strikeouts": "Strikeouts",
  "Total Bases": "Total Bases",
  "total_bases": "Total Bases",
  // NHL markets
  "Goals": "Goals",
  "goals": "Goals",
  "Shots on Goal": "Shots on Goal",
  "shots_on_goal": "Shots on Goal",
  "Saves": "Saves",
  "saves": "Saves"
  // NCAAF markets (same as NFL but with different naming)
  // Note: These are already defined above, so we don't need to redefine them
};
function normalizeMarketType(rawMarket) {
  let raw;
  if (typeof rawMarket === "string") {
    raw = rawMarket;
  } else if (rawMarket && typeof rawMarket === "object") {
    raw = rawMarket.marketName || rawMarket.name || rawMarket.type || rawMarket.statID || rawMarket.market_type || "Unknown";
  } else {
    raw = "Unknown";
  }
  raw = raw.trim();
  if (MARKET_ALIASES[raw]) {
    return MARKET_ALIASES[raw];
  }
  if (raw.includes("_")) {
    const titleCase = raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    if (MARKET_ALIASES[titleCase]) {
      return MARKET_ALIASES[titleCase];
    }
  }
  if (raw.match(/[a-z][A-Z]/)) {
    const titleCase = raw.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\b\w/g, (c) => c.toUpperCase());
    if (MARKET_ALIASES[titleCase]) {
      return MARKET_ALIASES[titleCase];
    }
  }
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
__name(normalizeMarketType, "normalizeMarketType");

// src/index.ts
var src_default = {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return handleOptions(request);
    }
    const url = new URL(request.url);
    let resp;
    if (url.pathname === "/debug/player-props") {
      resp = await handleDebugPlayerProps(url, env);
    } else if (url.pathname === "/api/debug-raw") {
      resp = await handlePropsDebug(request, env);
    } else if (url.pathname === "/metrics") {
      resp = await handleMetrics(url, request, env);
    } else if (url.pathname === "/api/cache/purge") {
      resp = await handleCachePurge(url, request, env);
    } else if (url.pathname.startsWith("/api/sportradar/")) {
      resp = new Response(
        JSON.stringify({
          error: "SportRadar API has been deprecated. Please use SportsGameOdds API instead.",
          migration: "Use /api/{league}/player-props endpoint instead"
        }),
        {
          status: 410,
          // Gone
          headers: { "content-type": "application/json" }
        }
      );
    } else {
      const match = url.pathname.match(/^\/api\/([a-z]+)\/player-props$/);
      if (match) {
        const league = match[1].toLowerCase();
        resp = await handlePlayerProps(request, env, ctx, league);
      } else {
        resp = withCORS(new Response("Not found", { status: 404 }), "*");
      }
    }
    return withCORS(resp, request.headers.get("Origin") || "*");
  }
};
async function handlePlayerProps(request, env, ctx, league) {
  return handlePropsEndpoint(request, env, league);
}
__name(handlePlayerProps, "handlePlayerProps");
async function handlePropsDebug(request, env) {
  const url = new URL(request.url);
  const league = url.searchParams.get("league") || "nfl";
  try {
    const result = await fetchSportsGameOddsDay(league.toUpperCase(), "2025-10-04", env);
    if (isErrorResponse(result)) {
      return json({ error: result.message }, 400);
    }
    const rawEvents = result.events;
    const sample = Array.isArray(rawEvents) ? rawEvents.find((ev) => ev.type === "match") || null : null;
    return withCORS(
      new Response(
        JSON.stringify(
          {
            league,
            rawCount: Array.isArray(rawEvents) ? rawEvents.length : 0,
            sampleEvent: sample
          },
          null,
          2
        ),
        { headers: { "content-type": "application/json" } }
      ),
      "*"
    );
  } catch (error) {
    return withCORS(
      new Response(
        JSON.stringify(
          {
            error: "Debug endpoint failed",
            message: error instanceof Error ? error.message : "Unknown error"
          },
          null,
          2
        ),
        { headers: { "content-type": "application/json" } }
      ),
      "*"
    );
  }
}
__name(handlePropsDebug, "handlePropsDebug");
async function handlePropsEndpoint(request, env, league) {
  try {
    const url = new URL(request.url);
    const leagues = league ? [league.toLowerCase()] : (url.searchParams.get("league") || "nfl").split(",").map((l) => l.trim().toLowerCase());
    const date = url.searchParams.get("date") || "2025-10-05";
    const view = url.searchParams.get("view") || "full";
    const debug = url.searchParams.has("debug");
    const responseData = { events: [] };
    const debugInfo = {};
    for (const league2 of leagues) {
      const result = await fetchSportsGameOddsDay(league2.toUpperCase(), date, env);
      if (isErrorResponse(result)) {
        responseData.errors = responseData.errors || {};
        responseData.errors[league2] = result;
        continue;
      }
      const rawEvents = result.events;
      let normalized = (rawEvents || []).filter((ev) => ev.type === "match").slice(0, 10).map((ev) => normalizeEventSGO(ev, request)).filter((ev) => ev !== null && ev !== void 0);
      console.log("DEBUG event normalization", {
        league: league2,
        rawEventsCount: rawEvents.length,
        normalizedCount: normalized.length,
        firstEventPropsCount: normalized[0]?.player_props?.length || 0
      });
      for (const event of normalized) {
        if (debug && event.player_props?.length) {
          console.log("DEBUG prop summary", {
            eventID: event.eventID,
            home: event.home_team,
            away: event.away_team,
            counts: summarizePropsByMarket(event, league2)
          });
        }
      }
      normalized = capPropsPerLeague(normalized, league2, 125);
      if (view === "compact") {
        responseData.events.push(
          ...normalized.filter((event) => event !== null).map((event) => ({
            eventID: event.eventID,
            leagueID: event.leagueID,
            start_time: event.start_time,
            home_team: event.home_team,
            away_team: event.away_team,
            player_props: (event.player_props || []).map((prop) => {
              const over = pickBest((prop.books || []).filter((b) => String(b.side).toLowerCase() === "over"));
              const under = pickBest((prop.books || []).filter((b) => String(b.side).toLowerCase() === "under"));
              return {
                player_name: prop.player_name,
                market_type: formatMarketType(prop.market_type, event.leagueID || "NFL"),
                line: prop.line,
                best_over: over?.price ?? null,
                best_under: under?.price ?? null,
                best_over_book: over?.bookmaker ?? null,
                best_under_book: under?.bookmaker ?? null
              };
            }),
            team_props: []
          }))
        );
      } else {
        responseData.events.push(...normalized.filter((event) => event !== null));
      }
      if (debug) {
        debugInfo[league2] = {
          upstreamEvents: rawEvents.length,
          normalizedEvents: normalized.length,
          totalProps: normalized.filter((e) => e !== null).reduce((a, e) => a + (e.player_props?.length || 0), 0),
          sampleEvent: normalized[0] || null
        };
      }
    }
    if (debug)
      responseData.debug = debugInfo;
    console.log("DEBUG final response", {
      eventsCount: responseData.events.length,
      firstEventPropsCount: responseData.events[0]?.player_props?.length || 0,
      sampleProp: responseData.events[0]?.player_props?.[0] || null
    });
    return withCORS(
      new Response(JSON.stringify(responseData), {
        headers: { "content-type": "application/json" }
      }),
      "*"
    );
  } catch (error) {
    console.error("Error in handlePropsEndpoint:", error);
    return withCORS(
      new Response(JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      }), {
        status: 500,
        headers: { "content-type": "application/json" }
      }),
      "*"
    );
  }
}
__name(handlePropsEndpoint, "handlePropsEndpoint");
async function handleDebugPlayerProps(url, env) {
  const league = url.searchParams.get("league")?.toUpperCase();
  const date = url.searchParams.get("date");
  if (!league || !date)
    return json({ error: "Missing league or date" }, 400);
  const upstream = new URL("https://api.sportsgameodds.com/v2/events");
  upstream.searchParams.set("leagueID", league);
  upstream.searchParams.set("date", date);
  upstream.searchParams.set("oddsAvailable", "true");
  upstream.searchParams.set("apikey", env.SGO_API_KEY);
  const res = await fetch(upstream.toString(), {
    headers: {
      "X-API-Key": env.SGO_API_KEY
    }
  });
  if (!res.ok)
    return json({ error: "Upstream error", status: res.status }, 502);
  const data = await res.json();
  const rawEvents = data?.data || [];
  const events = rawEvents.filter((ev) => String(ev.leagueID).toUpperCase() === league);
  const normalized = events.map(debugNormalizeEvent);
  const totalKept = normalized.reduce((a, ev) => a + (ev.debug_counts?.keptPlayerProps || 0), 0);
  const totalDropped = normalized.reduce((a, ev) => a + (ev.debug_counts?.droppedPlayerProps || 0), 0);
  return json({
    events: normalized,
    debug: {
      upstreamEvents: rawEvents.length,
      normalizedEvents: normalized.length,
      totalKeptPlayerProps: totalKept,
      totalDroppedPlayerProps: totalDropped
    }
  });
}
__name(handleDebugPlayerProps, "handleDebugPlayerProps");
async function handleCachePurge(url, request, env) {
  const league = url.searchParams.get("league")?.toUpperCase();
  const date = url.searchParams.get("date");
  if (!league || !date) {
    return withCORS(new Response("Missing league or date", { status: 400 }), "*");
  }
  const cacheKey = buildCacheKey(url, league, date);
  const cache = await caches.open("default");
  const deleted = await cache.delete(cacheKey);
  return withCORS(
    new Response(
      JSON.stringify({ message: "Cache purged", league, date, cacheKey, deleted }),
      {
        headers: {
          "content-type": "application/json"
        }
      }
    ),
    "*"
  );
}
__name(handleCachePurge, "handleCachePurge");
function buildCacheKey(url, league, date, oddIDs, bookmakerID, view, debug) {
  const key = new URL("https://edge-cache");
  key.pathname = `/api/${league}/player-props`;
  key.searchParams.set("date", date);
  if (oddIDs)
    key.searchParams.set("oddIDs", oddIDs);
  if (bookmakerID)
    key.searchParams.set("bookmakerID", bookmakerID);
  if (view)
    key.searchParams.set("view", view);
  if (debug)
    key.searchParams.set("debug", "true");
  return key.toString();
}
__name(buildCacheKey, "buildCacheKey");
function json(body, status = 200) {
  return withCORS(
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "content-type": "application/json"
      }
    }),
    "*"
  );
}
__name(json, "json");
function normalizeEventSGO(ev, request) {
  if (ev && typeof ev === "object" && ev.error === true) {
    console.log("DEBUG: Skipping error response in normalizer", ev.message);
    return null;
  }
  const normalized = normalizeEvent(ev);
  console.log(`DEBUG normalizeEventSGO: eventID=${ev.eventID}, player_props=${normalized.player_props?.length || 0}, team_props=${normalized.team_props?.length || 0}`);
  return {
    eventID: normalized.eventID,
    leagueID: normalized.leagueID,
    start_time: normalized.start_time,
    home_team: normalized.home_team,
    away_team: normalized.away_team,
    players: ev.players || {},
    player_props: normalized.player_props,
    team_props: normalized.team_props
  };
}
__name(normalizeEventSGO, "normalizeEventSGO");
function normalizeEvent(ev) {
  const eventId = ev.event_id || ev.eventID;
  const leagueId = ev.league_id || ev.leagueID;
  const startTime = ev.start_time || ev.scheduled;
  console.log(`Normalizing event ${eventId} with SGO schema`);
  let playerProps = [];
  let teamProps = [];
  if (ev.player_props && Array.isArray(ev.player_props)) {
    playerProps = ev.player_props;
    console.log(`Using SGO player_props: ${playerProps.length} props`);
  } else if (ev.odds && ev.players) {
    console.log(`Falling back to legacy normalization`);
    const players = ev.players || {};
    const oddsDict = ev.odds || {};
    const groups = {};
    for (const oddID in oddsDict) {
      const m = oddsDict[oddID];
      const key = [
        m.playerID || m.statEntityID || "",
        // which player/team this prop belongs to
        m.statID || "",
        // market type identifier
        m.sideID || "",
        // over/under side
        m.periodID || "",
        // period (full_game, 1H, etc.)
        m.marketID || ""
        // unique market identifier
      ].join("|");
      (groups[key] ||= []).push(m);
    }
    const sampleOddID = Object.keys(oddsDict)[0];
    if (sampleOddID) {
      console.log("DEBUG: Sample market data", {
        oddID: sampleOddID,
        market: oddsDict[sampleOddID]
      });
    }
    let playerMarketCount = 0;
    let teamMarketCount = 0;
    for (const oddID in oddsDict) {
      const m = oddsDict[oddID];
      if (m.playerID) {
        playerMarketCount++;
      } else if (m.statEntityID === "all" || m.statEntityID === "side1" || m.statEntityID === "side2") {
        teamMarketCount++;
      }
    }
    console.log(`DEBUG: Market counts - Player markets: ${playerMarketCount}, Team markets: ${teamMarketCount}`);
    console.log(`Created ${Object.keys(groups).length} groups`);
    for (const key in groups) {
      const markets = groups[key];
      const hasPlayer = markets.some((mm) => {
        if (mm.playerID)
          return true;
        if (mm.statEntityID === "all" || mm.statEntityID === "side1" || mm.statEntityID === "side2") {
          return false;
        }
        if (mm.statEntityID && players[mm.statEntityID]) {
          return true;
        }
        return false;
      });
      console.log(`Group ${key}: hasPlayer=${hasPlayer}, markets=${markets.length}`);
      if (hasPlayer) {
        const norm = normalizePlayerGroup(markets, players, leagueId || "NFL");
        if (norm) {
          playerProps.push(norm);
          console.log(`Added player prop: ${norm.player_name} ${norm.market_type}`);
        } else {
          console.log(`Failed to normalize player group: ${key}`);
        }
      } else {
        console.log(`Processing team prop group: ${key}`);
        const norm = normalizeTeamGroup(markets);
        if (norm) {
          teamProps.push(norm);
          console.log(`Added team prop: ${norm.market_type}`);
        } else {
          console.log(`Failed to normalize team group: ${key}`);
        }
      }
    }
  }
  if (ev.team_props && Array.isArray(ev.team_props)) {
    teamProps = ev.team_props;
  }
  console.log(`Final counts: playerProps=${playerProps.length}, teamProps=${teamProps.length}`);
  console.log(`Returning event ${eventId} with ${playerProps.length} player props and ${teamProps.length} team props`);
  return {
    eventID: eventId,
    leagueID: leagueId,
    start_time: toUserTime(startTime || "", "America/New_York"),
    home_team: normalizeTeamSGO(ev.home_team) || normalizeTeam(ev.teams?.home),
    away_team: normalizeTeamSGO(ev.away_team) || normalizeTeam(ev.teams?.away),
    team_props: teamProps,
    player_props: playerProps
  };
}
__name(normalizeEvent, "normalizeEvent");
function normalizePlayerGroup(markets, players, league) {
  const over = markets.find((m) => m.sideID?.toLowerCase() === "over" || m.sideID?.toLowerCase() === "yes");
  const under = markets.find((m) => m.sideID?.toLowerCase() === "under" || m.sideID?.toLowerCase() === "no");
  const base = over || under;
  if (!base)
    return null;
  const player = base.playerID ? players[base.playerID] : void 0;
  let playerName = player?.name ?? null;
  if (!playerName && base.oddID) {
    const oddIdParts = base.oddID.split("-");
    if (oddIdParts.length >= 2) {
      const potentialPlayerID = oddIdParts[1];
      if (potentialPlayerID && players[potentialPlayerID]) {
        playerName = players[potentialPlayerID].name;
      }
    }
  }
  if (!playerName && base.statEntityID && base.statEntityID !== "side1" && base.statEntityID !== "side2") {
    if (players[base.statEntityID]) {
      playerName = players[base.statEntityID].name;
    }
  }
  if (!playerName) {
    console.log("DEBUG: Skipping prop without player name", {
      oddID: base.oddID,
      statEntityID: base.statEntityID,
      statID: base.statID
    });
    return null;
  }
  const allBooks = [...collectBooks(over), ...collectBooks(under)];
  let teamID = player?.teamID ?? null;
  if (!teamID && playerName && base.oddID) {
    const oddIdParts = base.oddID.split("-");
    if (oddIdParts.length >= 2) {
      const potentialPlayerID = oddIdParts[1];
      if (potentialPlayerID && players[potentialPlayerID]) {
        teamID = players[potentialPlayerID].teamID;
      }
    }
  }
  if (!teamID && base.statEntityID && base.statEntityID !== "side1" && base.statEntityID !== "side2") {
    if (players[base.statEntityID]) {
      teamID = players[base.statEntityID].teamID;
    }
  }
  const result = {
    player_name: playerName,
    teamID,
    market_type: formatMarketType(base.statID, league),
    line: Number(base.bookOverUnder ?? null),
    best_over: pickBest(allBooks.filter((b) => b.side === "over")),
    best_under: pickBest(allBooks.filter((b) => b.side === "under")),
    books: allBooks
  };
  if (!playerName) {
    console.log("DEBUG: Skipping prop without player name", {
      oddID: base.oddID,
      statEntityID: base.statEntityID,
      statID: base.statID
    });
    return null;
  }
  console.log("DEBUG player group", {
    playerName,
    marketType: result.market_type,
    line: result.line,
    booksCount: allBooks.length,
    bestOver: result.best_over,
    bestUnder: result.best_under
  });
  return result;
}
__name(normalizePlayerGroup, "normalizePlayerGroup");
function normalizeSide(side) {
  if (!side)
    return null;
  const s = side.toLowerCase();
  if (s === "over" || s === "yes")
    return "over";
  if (s === "under" || s === "no")
    return "under";
  return null;
}
__name(normalizeSide, "normalizeSide");
function collectBooks(side) {
  if (!side)
    return [];
  const books = [];
  if (side.bookOdds || side.bookOverUnder) {
    books.push({
      bookmaker: "consensus",
      side: normalizeSide(side.sideID),
      price: side.bookOdds ?? null,
      line: Number(side.bookOverUnder ?? null)
    });
  }
  for (const [book, data] of Object.entries(side.byBookmaker || {})) {
    const bookData = data;
    if (!bookData.odds && !bookData.overUnder)
      continue;
    books.push({
      bookmaker: book,
      side: normalizeSide(side.sideID),
      price: bookData.odds ?? side.bookOdds ?? null,
      line: Number(bookData.overUnder ?? side.bookOverUnder ?? null),
      deeplink: bookData.deeplink
    });
  }
  return books;
}
__name(collectBooks, "collectBooks");
function summarizePropsByMarket(event, league) {
  const counts = {};
  for (const prop of event.player_props || []) {
    const label = formatMarketType(prop.market_type || prop.statID, league);
    counts[label] = (counts[label] || 0) + 1;
  }
  return counts;
}
__name(summarizePropsByMarket, "summarizePropsByMarket");
function normalizeTeamGroup(markets) {
  const over = markets.find((m) => isOverSide(m.sideID));
  const under = markets.find((m) => isUnderSide(m.sideID));
  if (!over && !under) {
    const base2 = markets[0];
    if (!base2)
      return null;
    const marketType2 = formatStatID(base2.statID);
    const books2 = collectBooks(base2);
    return {
      market_type: marketType2,
      line: toNumberOrNull(base2.bookOverUnder || base2.fairOverUnder),
      best_over: null,
      best_under: null,
      books: books2,
      oddIDs: {
        over: base2.oddID ?? null,
        under: null,
        opposingOver: base2.opposingOddID ?? null,
        opposingUnder: null
      },
      status: {
        started: base2.started ?? false,
        ended: base2.ended ?? false,
        cancelled: base2.cancelled ?? false
      }
    };
  }
  const base = over || under;
  if (!base)
    return null;
  const marketType = formatStatID(base.statID);
  const lineStr = firstDefined(over?.bookOverUnder, under?.bookOverUnder, over?.fairOverUnder, under?.fairOverUnder);
  const line = toNumberOrNull(lineStr);
  const books = [...collectBooks(over), ...collectBooks(under)];
  const best_over = pickBest(books.filter((b) => b.side === "over" || b.side === "yes"));
  const best_under = pickBest(books.filter((b) => b.side === "under" || b.side === "no"));
  return {
    market_type: marketType,
    line,
    best_over,
    best_under,
    books,
    oddIDs: {
      over: over?.oddID ?? null,
      under: under?.oddID ?? null,
      opposingOver: over?.opposingOddID ?? null,
      opposingUnder: under?.opposingOddID ?? null
    },
    status: {
      started: !!(over?.started || under?.started),
      ended: !!(over?.ended || under?.ended),
      cancelled: !!(over?.cancelled || under?.cancelled)
    }
  };
}
__name(normalizeTeamGroup, "normalizeTeamGroup");
function isOverSide(side) {
  const s = String(side || "").toLowerCase();
  return s === "over" || s === "yes";
}
__name(isOverSide, "isOverSide");
function isUnderSide(side) {
  const s = String(side || "").toLowerCase();
  return s === "under" || s === "no";
}
__name(isUnderSide, "isUnderSide");
function formatStatID(statID) {
  return normalizeMarketType(statID);
}
__name(formatStatID, "formatStatID");
function firstDefined(...vals) {
  for (const v of vals)
    if (v !== void 0 && v !== null)
      return v;
  return void 0;
}
__name(firstDefined, "firstDefined");
function toNumberOrNull(s) {
  if (s === void 0 || s === null)
    return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}
__name(toNumberOrNull, "toNumberOrNull");
function parseAmerican(odds) {
  if (odds === null || odds === void 0)
    return null;
  const s = String(odds).trim();
  if (!s)
    return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}
__name(parseAmerican, "parseAmerican");
function toUserTime(utcDate, tz = "America/New_York") {
  try {
    const d = typeof utcDate === "string" ? new Date(utcDate) : utcDate;
    if (isNaN(d.getTime()))
      return null;
    return d.toLocaleString("en-US", {
      timeZone: tz,
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  } catch {
    return null;
  }
}
__name(toUserTime, "toUserTime");
function normalizeTeam(team) {
  if (!team)
    return { id: null, abbr: "UNK", name: "Unknown" };
  return {
    id: team.teamID ?? team.id ?? null,
    abbr: team.names?.short ?? team.abbreviation ?? team.names?.abbr ?? team.alias ?? team.displayName ?? "UNK",
    name: team.names?.long ?? team.names?.full ?? team.displayName ?? (team.market && team.name ? `${team.market} ${team.name}` : null) ?? team.alias ?? "Unknown"
  };
}
__name(normalizeTeam, "normalizeTeam");
function normalizeTeamSGO(team) {
  if (!team)
    return { id: null, abbr: "UNK", name: "TBD" };
  return {
    id: team.id ?? null,
    abbr: team.abbreviation ?? team.alias ?? team.short_name ?? "UNK",
    name: team.name ?? team.full_name ?? team.display_name ?? "TBD",
    logo: team.logo ?? null
  };
}
__name(normalizeTeamSGO, "normalizeTeamSGO");
var PROP_PRIORITY = {
  nfl: [
    "passing_yards",
    "rushing_yards",
    "receiving_yards",
    "receptions",
    "touchdowns",
    "first_touchdown",
    "last_touchdown"
  ],
  nba: [
    "points",
    "rebounds",
    "assists",
    "threes_made",
    "steals",
    "blocks"
  ],
  mlb: [
    "hits",
    "home_runs",
    "rbis",
    "strikeouts",
    "total_bases"
  ],
  nhl: [
    "goals",
    "assists",
    "points",
    "shots_on_goal",
    "saves"
  ],
  ncaaf: [
    "passing_yards",
    "rushing_yards",
    "receiving_yards",
    "receptions",
    "touchdowns"
  ]
};
function formatMarketType(raw, league) {
  return normalizeMarketType(raw);
}
__name(formatMarketType, "formatMarketType");
function sortPropsByLeague(props, league) {
  const priorities = PROP_PRIORITY[league.toLowerCase()] || [];
  return props.sort((a, b) => {
    const ai = priorities.indexOf(a.market_type);
    const bi = priorities.indexOf(b.market_type);
    if (ai !== -1 && bi !== -1)
      return ai - bi;
    if (ai !== -1)
      return -1;
    if (bi !== -1)
      return 1;
    return 0;
  });
}
__name(sortPropsByLeague, "sortPropsByLeague");
function capPropsPerLeague(normalizedEvents, league, maxProps = 125) {
  let total = 0;
  for (const event of normalizedEvents) {
    const remaining = maxProps - total;
    if (remaining <= 0) {
      event.player_props = [];
      continue;
    }
    const sorted = sortPropsByLeague(event.player_props || [], league);
    event.player_props = sorted.slice(0, remaining);
    total += event.player_props.length;
  }
  return normalizedEvents;
}
__name(capPropsPerLeague, "capPropsPerLeague");
var SUPPORTED_LEAGUES = /* @__PURE__ */ new Set([
  "nfl",
  "nba",
  "mlb",
  "nhl",
  "ncaaf",
  "ncaab",
  "epl"
  // add more as needed
]);
function isErrorResponse(response) {
  return response && typeof response === "object" && response.error === true;
}
__name(isErrorResponse, "isErrorResponse");
async function fetchSportsGameOddsDay(league, date, env) {
  if (!SUPPORTED_LEAGUES.has(league.toLowerCase())) {
    return {
      error: true,
      message: `League '${league}' not supported`,
      supported: Array.from(SUPPORTED_LEAGUES)
    };
  }
  const LEAGUE_IDS = {
    nfl: "NFL",
    nba: "NBA",
    mlb: "MLB",
    nhl: "NHL",
    ncaaf: "NCAAF",
    ncaab: "NCAAB",
    epl: "EPL"
    // add more as needed
  };
  const leagueID = LEAGUE_IDS[league.toLowerCase()];
  if (!leagueID) {
    return {
      error: true,
      message: `Unsupported league '${league}'. Supported: ${Object.keys(
        LEAGUE_IDS
      ).join(", ")}`
    };
  }
  const requestedYear = new Date(date).getFullYear();
  const url = `https://api.sportsgameodds.com/v2/events?leagueID=${leagueID}&oddsAvailable=true&date=${date}&apikey=${env.SGO_API_KEY}`;
  console.log(`[fetchSportsGameOddsDay] Fetching: ${url.replace(env.SGO_API_KEY, "[API_KEY]")} (requestedYear: ${requestedYear})`);
  const res = await fetch(url, {
    headers: {
      "accept": "application/json",
      "X-API-Key": env.SGO_API_KEY
      // Use X-API-Key header format as required by SportsGameOdds API
    }
  });
  if (!res.ok) {
    return {
      error: true,
      message: `SGO fetch failed: ${res.status}`,
      body: await res.text()
    };
  }
  const raw = await res.json();
  const rawEvents = raw.data || raw.events || raw;
  const events = rawEvents.filter((ev) => {
    const startTime = ev.status?.startsAt;
    if (!startTime)
      return false;
    const evYear = new Date(startTime).getFullYear();
    const isCorrectYear = evYear === requestedYear;
    console.log(`[fetchSportsGameOddsDay] Event: startTime=${startTime}, evYear=${evYear}, requestedYear=${requestedYear}, match=${isCorrectYear}`);
    return isCorrectYear;
  });
  console.log(`[fetchSportsGameOddsDay] Filtered to ${events.length} events for year ${requestedYear}`);
  return { events };
}
__name(fetchSportsGameOddsDay, "fetchSportsGameOddsDay");
function pickBest(books) {
  const candidates = books.filter((b) => parseAmerican(b.price) !== null);
  if (candidates.length === 0)
    return null;
  const best = candidates.sort((a, b) => {
    const A = parseAmerican(a.price);
    const B = parseAmerican(b.price);
    if (A >= 0 && B >= 0)
      return B - A;
    if (A < 0 && B < 0)
      return A - B;
    return A >= 0 ? -1 : 1;
  })[0];
  return {
    price: String(best.price),
    bookmaker: best.bookmaker
  };
}
__name(pickBest, "pickBest");
function debugNormalizeEvent(ev) {
  try {
    return debugNormalizeEventInternal(ev);
  } catch (err) {
    return {
      eventID: ev?.eventID,
      leagueID: ev?.leagueID,
      start_time: ev?.scheduled,
      home_team: {
        id: ev?.teams?.home?.teamID ?? ev?.teams?.home?.id ?? null,
        abbr: ev?.teams?.home?.abbreviation ?? ev?.teams?.home?.names?.short ?? ev?.teams?.home?.names?.abbr ?? null,
        name: ev?.teams?.home?.names?.long ?? ev?.teams?.home?.names?.full ?? null
      },
      away_team: {
        id: ev?.teams?.away?.teamID ?? ev?.teams?.away?.id ?? null,
        abbr: ev?.teams?.away?.abbreviation ?? ev?.teams?.away?.names?.short ?? ev?.teams?.away?.names?.abbr ?? null,
        name: ev?.teams?.away?.names?.long ?? ev?.teams?.away?.names?.full ?? null
      },
      team_props: [],
      player_props: [],
      debug_counts: { keptPlayerProps: 0, droppedPlayerProps: 0 },
      _error: String(err)
    };
  }
}
__name(debugNormalizeEvent, "debugNormalizeEvent");
function debugNormalizeEventInternal(ev) {
  const players = ev.players || {};
  const oddsDict = ev.odds || {};
  const groups = {};
  for (const oddID in oddsDict) {
    const m = oddsDict[oddID];
    const key = [m.statEntityID || "", m.statID || "", m.periodID || "", m.betTypeID || ""].join("|");
    (groups[key] ||= []).push(m);
  }
  let keptPlayerProps = 0;
  let droppedPlayerProps = 0;
  const playerProps = [];
  const teamProps = [];
  for (const key in groups) {
    const markets = groups[key];
    const hasPlayer = markets.some((mm) => !!mm.playerID);
    if (hasPlayer) {
      const norm = debugNormalizePlayerGroup(markets, players);
      if (norm) {
        playerProps.push(norm);
        keptPlayerProps++;
      } else {
        droppedPlayerProps++;
      }
    } else {
      const norm = debugNormalizeTeamGroup(markets);
      if (norm)
        teamProps.push(norm);
    }
  }
  return {
    eventID: ev.eventID,
    leagueID: ev.leagueID,
    start_time: ev.scheduled,
    home_team: {
      id: ev.teams?.home?.teamID ?? ev.teams?.home?.id ?? null,
      abbr: ev.teams?.home?.abbreviation ?? ev.teams?.home?.names?.short ?? ev.teams?.home?.names?.abbr ?? null,
      name: ev.teams?.home?.names?.long ?? ev.teams?.home?.names?.full ?? null
    },
    away_team: {
      id: ev.teams?.away?.teamID ?? ev.teams?.away?.id ?? null,
      abbr: ev.teams?.away?.abbreviation ?? ev.teams?.away?.names?.short ?? ev.teams?.away?.names?.abbr ?? null,
      name: ev.teams?.away?.names?.long ?? ev.teams?.away?.names?.full ?? null
    },
    team_props: teamProps,
    player_props: playerProps,
    debug_counts: { keptPlayerProps, droppedPlayerProps }
  };
}
__name(debugNormalizeEventInternal, "debugNormalizeEventInternal");
function debugNormalizePlayerGroup(markets, players) {
  const over = markets.find((m) => isOverSide(m.sideID));
  const under = markets.find((m) => isUnderSide(m.sideID));
  const base = over || under;
  if (!base)
    return null;
  const player = base.playerID ? players[base.playerID] : void 0;
  const playerName = player?.name || base.marketName;
  const marketType = formatMarketType(base.statID, "NFL");
  const lineStr = over?.bookOverUnder ?? under?.bookOverUnder ?? over?.fairOverUnder ?? under?.fairOverUnder ?? null;
  const line = lineStr && isFinite(parseFloat(lineStr)) ? parseFloat(lineStr) : null;
  const books = [];
  for (const side of [over, under]) {
    if (!side)
      continue;
    if (side.bookOdds || side.bookOverUnder || side.fairOdds || side.fairOverUnder) {
      books.push({
        bookmaker: "consensus",
        side: String(side.sideID).toLowerCase(),
        price: side.bookOdds ?? side.fairOdds ?? "",
        line: toNumberOrNull(side.bookOverUnder ?? side.fairOverUnder)
      });
    }
    for (const [book, data] of Object.entries(side.byBookmaker || {})) {
      const bookData = data;
      if (!bookData || !bookData.odds && !bookData.overUnder)
        continue;
      books.push({
        bookmaker: book,
        side: String(side.sideID).toLowerCase(),
        price: bookData.odds ?? side.bookOdds ?? "",
        line: toNumberOrNull(bookData.overUnder ?? side.bookOverUnder),
        deeplink: bookData.deeplink
      });
    }
  }
  return {
    player_name: playerName,
    teamID: player?.teamID ?? null,
    market_type: marketType,
    line,
    books
  };
}
__name(debugNormalizePlayerGroup, "debugNormalizePlayerGroup");
function debugNormalizeTeamGroup(markets) {
  const over = markets.find((m) => isOverSide(m.sideID));
  const under = markets.find((m) => isUnderSide(m.sideID));
  const base = over || under;
  if (!base)
    return null;
  const marketType = base.statID;
  const lineStr = over?.bookOverUnder ?? under?.bookOverUnder ?? over?.fairOverUnder ?? under?.fairOverUnder ?? null;
  const line = lineStr && isFinite(parseFloat(lineStr)) ? parseFloat(lineStr) : null;
  const books = [];
  for (const side of [over, under]) {
    if (!side)
      continue;
    if (side.bookOdds || side.bookOverUnder || side.fairOdds || side.fairOverUnder) {
      books.push({
        bookmaker: "consensus",
        side: String(side.sideID).toLowerCase(),
        price: side.bookOdds ?? side.fairOdds ?? "",
        line: toNumberOrNull(side.bookOverUnder ?? side.fairOverUnder)
      });
    }
    for (const [book, data] of Object.entries(side.byBookmaker || {})) {
      const bookData = data;
      if (!bookData || !bookData.odds && !bookData.overUnder)
        continue;
      books.push({
        bookmaker: book,
        side: String(side.sideID).toLowerCase(),
        price: bookData.odds ?? side.bookOdds ?? "",
        line: toNumberOrNull(bookData.overUnder ?? side.bookOverUnder),
        deeplink: bookData.deeplink
      });
    }
  }
  return {
    market_type: marketType,
    line,
    books
  };
}
__name(debugNormalizeTeamGroup, "debugNormalizeTeamGroup");
async function handleMetrics(url, request, env) {
  if (env.PURGE_TOKEN) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${env.PURGE_TOKEN}`) {
      return withCORS(new Response("Unauthorized", { status: 401 }), "*");
    }
  }
  const reset = url.searchParams.get("reset") === "true";
  try {
    const metrics = await getMetrics(env, reset);
    return withCORS(
      new Response(JSON.stringify(metrics), {
        headers: {
          "content-type": "application/json"
        }
      }),
      "*"
    );
  } catch (error) {
    return withCORS(
      new Response(JSON.stringify({ error: "Failed to get metrics" }), {
        status: 500,
        headers: {
          "content-type": "application/json"
        }
      }),
      "*"
    );
  }
}
__name(handleMetrics, "handleMetrics");
async function getMetrics(env, reset = false) {
  if (!env.METRICS) {
    return {
      totalKeptPlayerProps: 0,
      totalDroppedPlayerProps: 0,
      cacheHits: 0,
      cacheMisses: 0,
      upstreamStatusCounts: { "200": 0, "4xx": 0, "5xx": 0 },
      avgResponseTimeMs: 0,
      totalRequests: 0,
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  const keys = [
    "totalKeptPlayerProps",
    "totalDroppedPlayerProps",
    "cacheHits",
    "cacheMisses",
    "upstreamStatus200",
    "upstreamStatus4xx",
    "upstreamStatus5xx",
    "totalResponseTime",
    "totalRequests"
  ];
  const values = await Promise.all(
    keys.map((key) => env.METRICS.get(key).then((v) => parseInt(v || "0", 10)))
  );
  const [
    totalKeptPlayerProps,
    totalDroppedPlayerProps,
    cacheHits,
    cacheMisses,
    upstreamStatus200,
    upstreamStatus4xx,
    upstreamStatus5xx,
    totalResponseTime,
    totalRequests
  ] = values;
  const metrics = {
    totalKeptPlayerProps,
    totalDroppedPlayerProps,
    cacheHits,
    cacheMisses,
    upstreamStatusCounts: {
      "200": upstreamStatus200,
      "4xx": upstreamStatus4xx,
      "5xx": upstreamStatus5xx
    },
    avgResponseTimeMs: totalRequests > 0 ? Math.round(totalResponseTime / totalRequests) : 0,
    totalRequests,
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (reset) {
    await Promise.all(keys.map((key) => env.METRICS.put(key, "0")));
  }
  return metrics;
}
__name(getMetrics, "getMetrics");

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

// .wrangler/tmp/bundle-fun02F/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

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

// .wrangler/tmp/bundle-fun02F/middleware-loader.entry.ts
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
  middleware_loader_entry_default as default,
  fetchSportsGameOddsDay,
  handlePropsDebug,
  handlePropsEndpoint
};
//# sourceMappingURL=index.js.map
