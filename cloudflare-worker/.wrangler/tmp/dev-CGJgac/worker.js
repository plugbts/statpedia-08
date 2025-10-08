var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// .wrangler/tmp/bundle-5tAbBl/checked-fetch.js
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
var urls;
var init_checked_fetch = __esm({
  ".wrangler/tmp/bundle-5tAbBl/checked-fetch.js"() {
    "use strict";
    urls = /* @__PURE__ */ new Set();
    __name(checkURL, "checkURL");
    globalThis.fetch = new Proxy(globalThis.fetch, {
      apply(target, thisArg, argArray) {
        const [request, init] = argArray;
        checkURL(request, init);
        return Reflect.apply(target, thisArg, argArray);
      }
    });
  }
});

// .wrangler/tmp/bundle-5tAbBl/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
var init_strip_cf_connecting_ip_header = __esm({
  ".wrangler/tmp/bundle-5tAbBl/strip-cf-connecting-ip-header.js"() {
    "use strict";
    __name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
    globalThis.fetch = new Proxy(globalThis.fetch, {
      apply(target, thisArg, argArray) {
        return Reflect.apply(target, thisArg, [
          stripCfConnectingIPHeader.apply(null, argArray)
        ]);
      }
    });
  }
});

// wrangler-modules-watch:wrangler:modules-watch
var init_wrangler_modules_watch = __esm({
  "wrangler-modules-watch:wrangler:modules-watch"() {
    init_checked_fetch();
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
  }
});

// node_modules/wrangler/templates/modules-watch-stub.js
var init_modules_watch_stub = __esm({
  "node_modules/wrangler/templates/modules-watch-stub.js"() {
    init_wrangler_modules_watch();
  }
});

// src/lib/api.ts
var api_exports = {};
__export(api_exports, {
  fetchEventsWithProps: () => fetchEventsWithProps,
  getEventsWithAggressiveFallbacks: () => getEventsWithAggressiveFallbacks,
  getEventsWithFallbacks: () => getEventsWithFallbacks
});
function buildUrl(base, params) {
  const u = new URL(base);
  Object.entries(params).filter(([, v]) => v !== void 0 && v !== null && v !== "").forEach(([k, v]) => u.searchParams.set(k, String(v)));
  return u.toString();
}
async function fetchEventsWithProps(env, leagueID, opts) {
  const base = "https://api.sportsgameodds.com/v2/events";
  const url = buildUrl(base, {
    apiKey: env.SPORTSGAMEODDS_API_KEY,
    leagueID,
    oddsAvailable: true,
    dateFrom: opts?.dateFrom,
    dateTo: opts?.dateTo,
    season: opts?.season,
    oddIDs: opts?.oddIDs,
    limit: opts?.limit ?? 250
  });
  console.log(`\u{1F50D} Fetching: ${url}`);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Events fetch failed (${res.status}): ${errorText}`);
    }
    const response = await res.json();
    const events = response.data || response;
    const eventsArray = Array.isArray(events) ? events : [];
    console.log(`\u2705 Fetched ${eventsArray.length} events for ${leagueID}`);
    return eventsArray;
  } catch (error) {
    console.error(`\u274C API fetch error for ${leagueID}:`, error);
    throw error;
  }
}
function ymd(d) {
  return d.toISOString().slice(0, 10);
}
function addDays(d, n) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}
async function getEventsWithFallbacks(env, leagueID, season, oddIDs) {
  const today = /* @__PURE__ */ new Date();
  const d7Past = ymd(addDays(today, -7));
  const d7Future = ymd(addDays(today, 7));
  const d14Past = ymd(addDays(today, -14));
  const d14Future = ymd(addDays(today, 14));
  console.log(`\u{1F504} Starting fallback strategy for ${leagueID} ${season}`);
  try {
    console.log(`Tier 1: ${leagueID} ${season} (\xB17 days)`);
    let events = await fetchEventsWithProps(env, leagueID, {
      season,
      dateFrom: d7Past,
      dateTo: d7Future,
      oddIDs
    });
    if (events?.length) {
      console.log(`\u2705 Tier 1 success: ${events.length} events`);
      return { events, tier: 1 };
    }
  } catch (error) {
    console.warn(`\u26A0\uFE0F Tier 1 failed for ${leagueID}:`, error.message);
  }
  try {
    console.log(`Tier 2: ${leagueID} ${season} (\xB114 days)`);
    let events = await fetchEventsWithProps(env, leagueID, {
      season,
      dateFrom: d14Past,
      dateTo: d14Future,
      oddIDs
    });
    if (events?.length) {
      console.log(`\u2705 Tier 2 success: ${events.length} events`);
      return { events, tier: 2 };
    }
  } catch (error) {
    console.warn(`\u26A0\uFE0F Tier 2 failed for ${leagueID}:`, error.message);
  }
  try {
    console.log(`Tier 3: ${leagueID} ${season - 1} (\xB114 days)`);
    let events = await fetchEventsWithProps(env, leagueID, {
      season: season - 1,
      dateFrom: d14Past,
      dateTo: d14Future,
      oddIDs
    });
    if (events?.length) {
      console.log(`\u2705 Tier 3 success: ${events.length} events`);
      return { events, tier: 3 };
    }
  } catch (error) {
    console.warn(`\u26A0\uFE0F Tier 3 failed for ${leagueID}:`, error.message);
  }
  try {
    console.log(`Tier 4: ${leagueID} ${season} (\xB114 days, no oddIDs)`);
    let events = await fetchEventsWithProps(env, leagueID, {
      season,
      dateFrom: d14Past,
      dateTo: d14Future
    });
    if (events?.length) {
      console.log(`\u2705 Tier 4 success: ${events.length} events`);
      return { events, tier: 4 };
    }
  } catch (error) {
    console.warn(`\u26A0\uFE0F Tier 4 failed for ${leagueID}:`, error.message);
  }
  try {
    console.log(`Tier 5: ${leagueID} ${season - 1} (\xB114 days, no oddIDs)`);
    let events = await fetchEventsWithProps(env, leagueID, {
      season: season - 1,
      dateFrom: d14Past,
      dateTo: d14Future
    });
    if (events?.length) {
      console.log(`\u2705 Tier 5 success: ${events.length} events`);
      return { events, tier: 5 };
    }
  } catch (error) {
    console.warn(`\u26A0\uFE0F Tier 5 failed for ${leagueID}:`, error.message);
  }
  console.warn(`\u274C All fallback tiers failed for ${leagueID} ${season}`);
  return { events: [], tier: 0 };
}
async function getEventsWithAggressiveFallbacks(env, leagueID, season, oddIDs) {
  const standardResult = await getEventsWithFallbacks(env, leagueID, season, oddIDs);
  if (standardResult.events.length > 0) {
    return standardResult;
  }
  const today = /* @__PURE__ */ new Date();
  const d30Past = ymd(addDays(today, -30));
  const d30Future = ymd(addDays(today, 30));
  const d90Past = ymd(addDays(today, -90));
  const d90Future = ymd(addDays(today, 90));
  try {
    console.log(`Tier 6: ${leagueID} ${season} (\xB130 days)`);
    let events = await fetchEventsWithProps(env, leagueID, {
      season,
      dateFrom: d30Past,
      dateTo: d30Future,
      oddIDs
    });
    if (events?.length) {
      console.log(`\u2705 Tier 6 success: ${events.length} events`);
      return { events, tier: 6 };
    }
  } catch (error) {
    console.warn(`\u26A0\uFE0F Tier 6 failed for ${leagueID}:`, error.message);
  }
  try {
    console.log(`Tier 7: ${leagueID} ${season} (\xB190 days)`);
    let events = await fetchEventsWithProps(env, leagueID, {
      season,
      dateFrom: d90Past,
      dateTo: d90Future,
      oddIDs
    });
    if (events?.length) {
      console.log(`\u2705 Tier 7 success: ${events.length} events`);
      return { events, tier: 7 };
    }
  } catch (error) {
    console.warn(`\u26A0\uFE0F Tier 7 failed for ${leagueID}:`, error.message);
  }
  try {
    console.log(`Tier 8: ${leagueID} ${season - 1} (\xB190 days)`);
    let events = await fetchEventsWithProps(env, leagueID, {
      season: season - 1,
      dateFrom: d90Past,
      dateTo: d90Future,
      oddIDs
    });
    if (events?.length) {
      console.log(`\u2705 Tier 8 success: ${events.length} events`);
      return { events, tier: 8 };
    }
  } catch (error) {
    console.warn(`\u26A0\uFE0F Tier 8 failed for ${leagueID}:`, error.message);
  }
  try {
    console.log(`Tier 9: ${leagueID} ${season} (no date filters)`);
    let events = await fetchEventsWithProps(env, leagueID, {
      season,
      oddIDs
    });
    if (events?.length) {
      console.log(`\u2705 Tier 9 success: ${events.length} events`);
      return { events, tier: 9 };
    }
  } catch (error) {
    console.warn(`\u26A0\uFE0F Tier 9 failed for ${leagueID}:`, error.message);
  }
  try {
    console.log(`Tier 10: ${leagueID} ${season - 1} (no date filters)`);
    let events = await fetchEventsWithProps(env, leagueID, {
      season: season - 1,
      oddIDs
    });
    if (events?.length) {
      console.log(`\u2705 Tier 10 success: ${events.length} events`);
      return { events, tier: 10 };
    }
  } catch (error) {
    console.warn(`\u26A0\uFE0F Tier 10 failed for ${leagueID}:`, error.message);
  }
  console.warn(`\u274C All aggressive fallback tiers failed for ${leagueID} ${season}`);
  return { events: [], tier: 0 };
}
var init_api = __esm({
  "src/lib/api.ts"() {
    "use strict";
    init_checked_fetch();
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    __name(buildUrl, "buildUrl");
    __name(fetchEventsWithProps, "fetchEventsWithProps");
    __name(ymd, "ymd");
    __name(addDays, "addDays");
    __name(getEventsWithFallbacks, "getEventsWithFallbacks");
    __name(getEventsWithAggressiveFallbacks, "getEventsWithAggressiveFallbacks");
  }
});

// src/lib/extract.ts
var extract_exports = {};
__export(extract_exports, {
  extractPlayerProps: () => extractPlayerProps,
  extractPlayerPropsWithLogging: () => extractPlayerPropsWithLogging,
  filterProps: () => filterProps,
  getUniqueValues: () => getUniqueValues,
  groupPropsByPlayer: () => groupPropsByPlayer
});
function extractPlayerProps(events) {
  const out = [];
  console.log(`\u{1F50D} Extracting player props from ${events?.length || 0} events`);
  for (const ev of events || []) {
    if (!ev)
      continue;
    const eventId = ev.id || ev.eventID || ev.event_id || "unknown";
    const league = ev.leagueID || ev.league || ev.league_id || "unknown";
    const eventStartUtc = ev.startTime || ev.commence_time || ev.startUtc || ev.date || (/* @__PURE__ */ new Date()).toISOString();
    const oddsData = ev?.odds || {};
    for (const [oddId, oddData] of Object.entries(oddsData)) {
      if (!oddData || typeof oddData !== "object")
        continue;
      const odd = oddData;
      if (!odd.playerID || !odd.statID)
        continue;
      const playerInfo = ev?.players?.[odd.playerID];
      const playerName = playerInfo?.name || odd.playerID || "Unknown Player";
      const playerId = odd.playerID;
      const marketName = odd.marketName || `${odd.statID} ${odd.betTypeID}`;
      let line = null;
      if (odd.fairOverUnder) {
        line = parseFloat(odd.fairOverUnder);
      } else if (odd.bookOverUnder) {
        line = parseFloat(odd.bookOverUnder);
      }
      const odds = odd.bookOdds || odd.fairOdds || null;
      const oddsValue = odds ? parseInt(odds.replace("+", "").replace("-", "")) : null;
      let sportsbook = "Consensus";
      if (odd.byBookmaker && typeof odd.byBookmaker === "object") {
        const bookmakers = Object.keys(odd.byBookmaker);
        if (bookmakers.length > 0) {
          sportsbook = bookmakers[0];
        }
      }
      let overUnder = "over";
      if (odd.sideID === "under") {
        overUnder = "under";
      } else if (odd.sideID === "yes") {
        overUnder = "yes";
      } else if (odd.sideID === "no") {
        overUnder = "no";
      }
      const extractedProp = {
        playerName: playerName.trim(),
        playerId,
        marketName: marketName.trim(),
        line,
        odds: oddsValue,
        sportsbook: sportsbook.trim(),
        eventStartUtc,
        league: league.toUpperCase(),
        eventId,
        marketId: odd.statID,
        oddId,
        overUnder,
        rawData: odd
        // Store raw data for debugging
      };
      if (extractedProp.playerName && extractedProp.playerName !== "Unknown Player" && extractedProp.marketName && extractedProp.marketName !== "unknown") {
        out.push(extractedProp);
      } else {
        console.warn(`\u26A0\uFE0F Skipping invalid prop:`, {
          playerName: extractedProp.playerName,
          marketName: extractedProp.marketName,
          eventId: extractedProp.eventId
        });
      }
    }
  }
  console.log(`\u2705 Extracted ${out.length} player props`);
  return out;
}
function extractPlayerPropsWithLogging(events) {
  const stats = {
    totalEvents: events?.length || 0,
    eventsWithMarkets: 0,
    totalMarkets: 0,
    playerPropMarkets: 0,
    extractedProps: 0,
    skippedProps: 0
  };
  const props = extractPlayerProps(events);
  stats.extractedProps = props.length;
  for (const ev of events || []) {
    if (!ev)
      continue;
    const markets = ev?.odds?.markets || ev?.markets || ev?.player_props || [];
    if (markets.length > 0) {
      stats.eventsWithMarkets++;
      stats.totalMarkets += markets.length;
      for (const m of markets) {
        if (!m)
          continue;
        const isPlayerProp = m.type === "player_prop" || m.isPlayerProp === true || m.market_type === "player_prop" || m.name && m.name.toLowerCase().includes("player") || m.marketName && m.marketName.toLowerCase().includes("player");
        if (isPlayerProp) {
          stats.playerPropMarkets++;
        }
      }
    }
  }
  stats.skippedProps = stats.totalMarkets - stats.extractedProps;
  console.log(`\u{1F4CA} Extraction stats:`, stats);
  return { props, stats };
}
function filterProps(props, filters) {
  return props.filter((prop) => {
    if (filters.league && prop.league !== filters.league)
      return false;
    if (filters.playerName && !prop.playerName.toLowerCase().includes(filters.playerName.toLowerCase()))
      return false;
    if (filters.marketName && !prop.marketName.toLowerCase().includes(filters.marketName.toLowerCase()))
      return false;
    if (filters.sportsbook && prop.sportsbook !== filters.sportsbook)
      return false;
    if (filters.minLine !== void 0 && (prop.line === null || prop.line < filters.minLine))
      return false;
    if (filters.maxLine !== void 0 && (prop.line === null || prop.line > filters.maxLine))
      return false;
    if (filters.minOdds !== void 0 && (prop.odds === null || prop.odds < filters.minOdds))
      return false;
    if (filters.maxOdds !== void 0 && (prop.odds === null || prop.odds > filters.maxOdds))
      return false;
    return true;
  });
}
function groupPropsByPlayer(props) {
  const grouped = {};
  for (const prop of props) {
    const key = prop.playerName.toLowerCase().trim();
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(prop);
  }
  return grouped;
}
function getUniqueValues(props) {
  const leagues = /* @__PURE__ */ new Set();
  const players = /* @__PURE__ */ new Set();
  const markets = /* @__PURE__ */ new Set();
  const sportsbooks = /* @__PURE__ */ new Set();
  for (const prop of props) {
    leagues.add(prop.league);
    players.add(prop.playerName);
    markets.add(prop.marketName);
    sportsbooks.add(prop.sportsbook);
  }
  return {
    leagues: Array.from(leagues).sort(),
    players: Array.from(players).sort(),
    markets: Array.from(markets).sort(),
    sportsbooks: Array.from(sportsbooks).sort()
  };
}
var init_extract = __esm({
  "src/lib/extract.ts"() {
    "use strict";
    init_checked_fetch();
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    __name(extractPlayerProps, "extractPlayerProps");
    __name(extractPlayerPropsWithLogging, "extractPlayerPropsWithLogging");
    __name(filterProps, "filterProps");
    __name(groupPropsByPlayer, "groupPropsByPlayer");
    __name(getUniqueValues, "getUniqueValues");
  }
});

// src/supabaseFetch.ts
var supabaseFetch_exports = {};
__export(supabaseFetch_exports, {
  supabaseFetch: () => supabaseFetch
});
async function supabaseFetch(env, table, { method = "GET", body, query = "" } = {}) {
  const url = `${env.SUPABASE_URL}/rest/v1/${table}${query}`;
  const res = await fetch(url, {
    method,
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...method === "POST" && body ? { Prefer: "resolution=merge-duplicates" } : {}
    },
    body: body ? JSON.stringify(body) : void 0
  });
  if (!res.ok) {
    const text2 = await res.text();
    console.error(`\u274C Supabase ${method} ${table} failed:`, text2);
    throw new Error(text2);
  }
  const contentLength = res.headers.get("content-length");
  if (contentLength === "0" || contentLength === null) {
    return null;
  }
  const text = await res.text();
  if (text.trim() === "") {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    console.warn(`\u26A0\uFE0F Failed to parse JSON response: ${text}`);
    return text;
  }
}
var init_supabaseFetch = __esm({
  "src/supabaseFetch.ts"() {
    "use strict";
    init_checked_fetch();
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    __name(supabaseFetch, "supabaseFetch");
  }
});

// .wrangler/tmp/bundle-5tAbBl/middleware-loader.entry.ts
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();

// .wrangler/tmp/bundle-5tAbBl/middleware-insertion-facade.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();

// src/worker.ts
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();

// src/jobs/multiBackfill.ts
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();

// src/jobs/backfill.ts
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_api();
init_extract();
init_supabaseFetch();

// src/helpers.ts
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size)
    out.push(arr.slice(i, i + size));
  return out;
}
__name(chunk, "chunk");

// src/createPlayerPropsFromOdd.ts
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();

// src/missingPlayers.ts
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
async function storeMissingPlayer(env, playerName, team, league, generatedId, oddId) {
  try {
    const missingPlayer = {
      player_name: playerName,
      team,
      league,
      normalized_name: normalizePlayerName(playerName),
      generated_id: generatedId,
      first_seen: (/* @__PURE__ */ new Date()).toISOString(),
      last_seen: (/* @__PURE__ */ new Date()).toISOString(),
      count: 1,
      sample_odd_id: oddId
    };
    await fetch(`${env.SUPABASE_URL}/rest/v1/missing_players`, {
      method: "POST",
      headers: {
        "apikey": env.SUPABASE_SERVICE_KEY,
        "Authorization": `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
      },
      body: JSON.stringify(missingPlayer)
    });
    console.log(`\u{1F4DD} Stored missing player: ${playerName} (${team})`);
  } catch (error) {
    console.error(`\u274C Failed to store missing player ${playerName}:`, error);
  }
}
__name(storeMissingPlayer, "storeMissingPlayer");
function normalizePlayerName(name) {
  return name.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").replace(/\s(jr|sr|iii|iv|v)$/i, "").trim();
}
__name(normalizePlayerName, "normalizePlayerName");

// src/playersLoader.ts
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_supabaseFetch();

// src/normalizeName.ts
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
function normalizeName(name) {
  return name.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").replace(/\s(jr|sr|iii|iv|v)$/i, "").trim();
}
__name(normalizeName, "normalizeName");
function aggressiveNormalizeName(name) {
  return name.toLowerCase().replace(/[^\w]/g, "").replace(/\s(jr|sr|iii|iv|v)$/i, "").trim();
}
__name(aggressiveNormalizeName, "aggressiveNormalizeName");
function generateNameVariations(name) {
  const normalized = normalizeName(name);
  const variations = [normalized];
  variations.push(aggressiveNormalizeName(name));
  const withoutPrefix = normalized.replace(/^(jr|sr|iii|iv|v)\s+/i, "");
  if (withoutPrefix !== normalized) {
    variations.push(withoutPrefix);
  }
  const firstName = normalized.split(" ")[0];
  if (firstName && firstName.length > 2) {
    variations.push(firstName);
  }
  const lastName = normalized.split(" ").pop();
  if (lastName && lastName.length > 2 && lastName !== firstName) {
    variations.push(lastName);
  }
  return [...new Set(variations)];
}
__name(generateNameVariations, "generateNameVariations");

// src/playersLoader.ts
async function loadPlayerIdMap(env) {
  try {
    console.log("\u{1F504} Loading players from Supabase...");
    const players = await supabaseFetch(env, "players", {
      query: "?select=player_id,full_name,team,league,position&limit=10000"
    });
    if (!players || !Array.isArray(players)) {
      console.error("\u274C Failed to load players from Supabase");
      return {};
    }
    const map = {};
    let loadedCount = 0;
    let skippedCount = 0;
    for (const player of players) {
      if (!player.full_name || !player.player_id) {
        skippedCount++;
        continue;
      }
      const normalizedKey = normalizeName(player.full_name);
      map[normalizedKey] = player.player_id;
      loadedCount++;
      const variations = generateNameVariations(player.full_name);
      for (const variation of variations) {
        if (variation !== normalizedKey && !map[variation]) {
          map[variation] = player.player_id;
        }
      }
    }
    console.log(`\u2705 Loaded ${loadedCount} players into PLAYER_ID_MAP (${Object.keys(map).length} total mappings)`);
    console.log(`\u26A0\uFE0F Skipped ${skippedCount} players due to missing data`);
    return map;
  } catch (error) {
    console.error("\u274C Error loading player ID map:", error);
    return {};
  }
}
__name(loadPlayerIdMap, "loadPlayerIdMap");
var playerMapCache = null;
var cacheTimestamp = 0;
var CACHE_TTL = 30 * 60 * 1e3;
async function getCachedPlayerIdMap(env) {
  const now = Date.now();
  if (playerMapCache && now - cacheTimestamp < CACHE_TTL) {
    return playerMapCache;
  }
  playerMapCache = await loadPlayerIdMap(env);
  cacheTimestamp = now;
  return playerMapCache;
}
__name(getCachedPlayerIdMap, "getCachedPlayerIdMap");
async function updateMissingPlayersSuccess(env, playerName, canonicalId) {
  try {
    const normalizedName = normalizeName(playerName);
    await fetch(`${env.SUPABASE_URL}/rest/v1/missing_players?normalized_name=eq.${normalizedName}`, {
      method: "DELETE",
      headers: {
        "apikey": env.SUPABASE_SERVICE_KEY,
        "Authorization": `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        "Content-Type": "application/json"
      }
    });
    console.log(`\u2705 Removed ${playerName} from missing players (mapped to ${canonicalId})`);
  } catch (error) {
    console.error(`\u274C Failed to update missing players for ${playerName}:`, error);
  }
}
__name(updateMissingPlayersSuccess, "updateMissingPlayersSuccess");

// src/createPlayerPropsFromOdd.ts
var MARKET_MAP = {
  // NFL Passing
  "passing yards": "Passing Yards",
  "pass yards": "Passing Yards",
  "passing yds": "Passing Yards",
  "pass yds": "Passing Yards",
  "passing yards passing": "Passing Yards",
  "passing touchdowns": "Passing Touchdowns",
  "pass tds": "Passing Touchdowns",
  "passing td": "Passing Touchdowns",
  "pass td": "Passing Touchdowns",
  "passing attempts": "Passing Attempts",
  "pass attempts": "Passing Attempts",
  "pass att": "Passing Attempts",
  "passing completions": "Passing Completions",
  "pass completions": "Passing Completions",
  "pass comp": "Passing Completions",
  "passing interceptions": "Passing Interceptions",
  "pass interceptions": "Passing Interceptions",
  "pass int": "Passing Interceptions",
  // NFL Rushing
  "rushing yards": "Rushing Yards",
  "rush yards": "Rushing Yards",
  "rushing yds": "Rushing Yards",
  "rush yds": "Rushing Yards",
  "rushing touchdowns": "Rushing Touchdowns",
  "rush tds": "Rushing Touchdowns",
  "rushing td": "Rushing Touchdowns",
  "rush td": "Rushing Touchdowns",
  "rushing attempts": "Rushing Attempts",
  "rush attempts": "Rushing Attempts",
  "rush att": "Rushing Attempts",
  // NFL Receiving
  "receiving yards": "Receiving Yards",
  "rec yards": "Receiving Yards",
  "receiving yds": "Receiving Yards",
  "rec yds": "Receiving Yards",
  "receiving touchdowns": "Receiving Touchdowns",
  "rec tds": "Receiving Touchdowns",
  "receiving td": "Receiving Touchdowns",
  "rec td": "Receiving Touchdowns",
  "receptions": "Receptions",
  "rec": "Receptions",
  // NFL Defense
  "defense sacks": "Defense Sacks",
  "defense interceptions": "Defense Interceptions",
  "defense combined tackles": "Defense Combined Tackles",
  "defense total tackles": "Defense Combined Tackles",
  // NFL Kicking
  "field goals made": "Field Goals Made",
  "kicking total points": "Kicking Total Points",
  "extra points kicks made": "Extra Points Made",
  // NBA
  "points": "Points",
  "rebounds": "Rebounds",
  "assists": "Assists",
  "steals": "Steals",
  "blocks": "Blocks",
  "threes made": "Three Pointers Made",
  "3-pointers made": "Three Pointers Made",
  // MLB
  "hits": "Hits",
  "runs": "Runs",
  "rbis": "RBIs",
  "strikeouts": "Strikeouts",
  "walks": "Walks",
  "home runs": "Home Runs",
  // NHL
  "goals": "Goals",
  "shots": "Shots",
  "saves": "Saves"
};
async function getPlayerID(playerName, team, league, env) {
  if (!env) {
    const canonicalName = playerName.toUpperCase().replace(/[^\w\s]/g, "").replace(/\s+/g, "_").replace(/\s(jr|sr|iii|iv|v)$/i, "").trim();
    return `${canonicalName}-UNK-${team}`;
  }
  try {
    const playerMap = await getCachedPlayerIdMap(env);
    const normalizedName = normalizeName(playerName);
    if (playerMap[normalizedName]) {
      const canonicalId = playerMap[normalizedName];
      console.log(`\u2705 Found player mapping: ${playerName} \u2192 ${canonicalId}`);
      await updateMissingPlayersSuccess(env, playerName, canonicalId);
      return canonicalId;
    }
    for (const [key, value] of Object.entries(playerMap)) {
      if (key.includes(normalizedName) || normalizedName.includes(key)) {
        const canonicalId = value;
        console.log(`\u2705 Found fuzzy player mapping: ${playerName} \u2192 ${canonicalId}`);
        await updateMissingPlayersSuccess(env, playerName, canonicalId);
        return canonicalId;
      }
    }
    const canonicalName = playerName.toUpperCase().replace(/[^\w\s]/g, "").replace(/\s+/g, "_").replace(/\s(jr|sr|iii|iv|v)$/i, "").trim();
    return `${canonicalName}-UNK-${team}`;
  } catch (error) {
    console.error(`\u274C Error loading player map for ${playerName}:`, error);
    const canonicalName = playerName.toUpperCase().replace(/[^\w\s]/g, "").replace(/\s+/g, "_").replace(/\s(jr|sr|iii|iv|v)$/i, "").trim();
    return `${canonicalName}-UNK-${team}`;
  }
}
__name(getPlayerID, "getPlayerID");
async function createPlayerPropsFromOdd(odd, oddId, event, league, season, week, env) {
  const props = [];
  const playerName = odd.player?.name;
  const team = odd.player?.team;
  if (!playerName || !team) {
    console.log(`Skipping odd ${oddId}: missing player name or team`);
    return props;
  }
  const playerID = await getPlayerID(playerName, team, league, env);
  if (!playerID) {
    console.error("Failed to generate player_id mapping", {
      playerName,
      team,
      league,
      normalizedName: normalizeName(playerName)
    });
    return props;
  }
  if (playerID.includes("-UNK-") && env) {
    console.error("Missing player_id mapping", {
      playerName,
      team,
      league,
      generatedId: playerID,
      normalizedName: normalizeName(playerName)
    });
    await storeMissingPlayer(env, playerName, team, league, playerID, oddId);
  }
  const gameDate = event.date ? event.date.split("T")[0] : (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const rawPropType = odd.prop?.name;
  const line = odd.line;
  const overOdds = odd.overOdds;
  const underOdds = odd.underOdds;
  const sportsbook = mapBookmakerIdToName(odd.bookmaker?.id || "unknown") || "Consensus";
  if (!rawPropType || line == null) {
    console.log(`Skipping odd ${oddId}: missing prop type or line`);
    return props;
  }
  const normalizedPropType = MARKET_MAP[rawPropType.toLowerCase()] || rawPropType;
  if (!MARKET_MAP[rawPropType.toLowerCase()]) {
    console.warn("Unmapped market:", {
      rawMarket: rawPropType,
      oddId,
      player: playerName,
      league
    });
  }
  const gameId = event.eventID || `${team}-${event.teams?.find((t) => t !== team)}-${gameDate}`;
  const homeTeam = event.homeTeam || event.teams?.[0];
  const awayTeam = event.awayTeam || event.teams?.[1];
  const gameTime = event.date ? new Date(event.date) : /* @__PURE__ */ new Date();
  const prop = {
    player_id: playerID,
    player_name: playerName,
    team,
    opponent: event.teams?.find((t) => t !== team) || null,
    season: parseInt(season),
    date: gameDate,
    // ✅ REQUIRED field that was missing!
    prop_type: normalizedPropType,
    line: parseFloat(line),
    over_odds: overOdds ? parseInt(overOdds) : null,
    under_odds: underOdds ? parseInt(underOdds) : null,
    sportsbook,
    league: league.toLowerCase(),
    game_id: gameId,
    conflict_key: `${playerID}|${gameDate}|${normalizedPropType}|${sportsbook}|${league.toLowerCase()}|${season}`
    // Removed extra fields that don't exist in schema:
    // - sportsbook_key, game_time, home_team, away_team, week, last_updated, is_available
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

// src/jobs/backfill.ts
async function runBackfill(env, leagueID, season, days) {
  console.log(`\u{1F504} Starting backfill for ${leagueID} season ${season} (${days} days)`);
  const startTime = Date.now();
  let propsInserted = 0;
  let gameLogsInserted = 0;
  let errors = 0;
  let tier = 0;
  let eventsProcessed = 0;
  let extractionStats = null;
  try {
    const { events, tier: fetchedTier } = await getEventsWithAggressiveFallbacks(env, leagueID, season);
    tier = fetchedTier;
    eventsProcessed = events.length;
    console.log(`\u{1F4CA} ${leagueID} ${season}: Fetched ${events.length} events (tier ${tier})`);
    if (events.length === 0) {
      console.log(`\u26A0\uFE0F ${leagueID} ${season}: No events found for backfill`);
      return { propsInserted: 0, gameLogsInserted: 0, errors: 1, tier: 0, eventsProcessed: 0, extractionStats: null };
    }
    const { props: extractedProps, stats } = extractPlayerPropsWithLogging(events);
    extractionStats = stats;
    console.log(`\u{1F4CA} ${leagueID} ${season}: Extracted ${extractedProps.length} player props`);
    if (extractedProps.length === 0) {
      console.log(`\u26A0\uFE0F ${leagueID} ${season}: No player props extracted`);
      return { propsInserted: 0, gameLogsInserted: 0, errors: 0, tier, eventsProcessed, extractionStats };
    }
    const playerIdMap = await getCachedPlayerIdMap(env);
    console.log(`\u{1F4CA} ${leagueID} ${season}: Loaded player map with ${Object.keys(playerIdMap).length} players`);
    const mappedProps = [];
    for (const prop of extractedProps) {
      try {
        const mockEvent = {
          id: prop.eventId,
          date: prop.eventStartUtc,
          homeTeam: "HOME",
          // Will be extracted from actual event data
          awayTeam: "AWAY",
          // Will be extracted from actual event data
          teams: ["HOME", "AWAY"]
        };
        const mockOdd = {
          player_name: prop.playerName,
          playerID: prop.playerId,
          market_key: prop.marketName,
          point: prop.line,
          over_price: prop.overUnder === "over" ? prop.odds : null,
          under_price: prop.overUnder === "under" ? prop.odds : null,
          bookmaker_name: prop.sportsbook,
          id: prop.oddId
        };
        const eventProps = await createPlayerPropsFromOdd(
          mockOdd,
          prop.oddId,
          mockEvent,
          prop.league.toLowerCase(),
          season.toString(),
          void 0,
          env
        );
        mappedProps.push(...eventProps);
      } catch (error) {
        console.error(`\u274C Error mapping prop ${prop.oddId}:`, error);
        errors++;
      }
    }
    console.log(`\u{1F4CA} ${leagueID} ${season}: Mapped ${mappedProps.length} props for insertion`);
    if (mappedProps.length > 0) {
      const propChunks = chunk(mappedProps, 500);
      console.log(`\u{1F4CA} ${leagueID} ${season}: Inserting ${propChunks.length} prop batches`);
      for (let i = 0; i < propChunks.length; i++) {
        try {
          if (propChunks[i].length > 0) {
            console.log("\u{1F50D} Sample propline row:", JSON.stringify(propChunks[i][0], null, 2));
            console.log("\u{1F50D} Batch size:", propChunks[i].length);
          }
          const { data, error } = await supabaseFetch(env, "proplines", {
            method: "POST",
            body: propChunks[i],
            query: "?on_conflict=conflict_key"
          });
          if (error) {
            console.error(`\u274C ${leagueID} ${season}: Props batch ${i + 1} failed:`, error);
            errors += propChunks[i].length;
          } else {
            propsInserted += propChunks[i].length;
            console.log(`\u2705 ${leagueID} ${season}: Inserted props batch ${i + 1}/${propChunks.length} (${propChunks[i].length} props)`);
          }
        } catch (error) {
          console.error(`\u274C ${leagueID} ${season}: Props batch ${i + 1} exception:`, error);
          errors += propChunks[i].length;
        }
      }
    }
    const gameLogRows = mappedProps.map((row) => ({
      player_id: row.player_id,
      player_name: row.player_name,
      team: row.team,
      opponent: row.opponent || "UNK",
      season,
      date: row.game_time ? row.game_time.split("T")[0] : (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      prop_type: row.prop_type,
      value: row.line || 0,
      // Use line as value for now
      sport: getSportFromLeague(leagueID),
      position: row.position || "UNK",
      game_id: row.game_id,
      home_away: row.home_away || "HOME",
      weather_conditions: row.weather_conditions,
      injury_status: "Active"
    }));
    if (gameLogRows.length > 0) {
      const gameLogChunks = chunk(gameLogRows, 500);
      console.log(`\u{1F4CA} ${leagueID} ${season}: Inserting ${gameLogChunks.length} game log batches`);
      for (let i = 0; i < gameLogChunks.length; i++) {
        try {
          const { data, error } = await supabaseFetch(env, "player_game_logs", {
            method: "POST",
            body: gameLogChunks[i],
            query: "?on_conflict=unique_player_game_log"
          });
          if (error) {
            console.error(`\u274C ${leagueID} ${season}: Game logs batch ${i + 1} failed:`, error);
            errors += gameLogChunks[i].length;
          } else {
            gameLogsInserted += gameLogChunks[i].length;
            console.log(`\u2705 ${leagueID} ${season}: Inserted game logs batch ${i + 1}/${gameLogChunks.length} (${gameLogChunks[i].length} logs)`);
          }
        } catch (error) {
          console.error(`\u274C ${leagueID} ${season}: Game logs batch ${i + 1} exception:`, error);
          errors += gameLogChunks[i].length;
        }
      }
    }
    const duration = Date.now() - startTime;
    console.log(`\u2705 ${leagueID} ${season} backfill complete: ${propsInserted} props, ${gameLogsInserted} game logs, ${errors} errors in ${duration}ms`);
    return {
      propsInserted,
      gameLogsInserted,
      errors,
      tier,
      eventsProcessed,
      extractionStats
    };
  } catch (error) {
    console.error(`\u274C ${leagueID} ${season} backfill failed:`, error);
    return { propsInserted: 0, gameLogsInserted: 0, errors: 1, tier: 0, eventsProcessed: 0, extractionStats: null };
  }
}
__name(runBackfill, "runBackfill");
function getSportFromLeague(leagueId) {
  const leagueMap = {
    "NFL": "football",
    "NCAAF": "football",
    "NBA": "basketball",
    "NCAAB": "basketball",
    "MLB": "baseball",
    "NHL": "hockey",
    "EPL": "soccer"
  };
  return leagueMap[leagueId] || "unknown";
}
__name(getSportFromLeague, "getSportFromLeague");
async function runBatchBackfill(env, combinations) {
  console.log(`\u{1F680} Starting batch backfill for ${combinations.length} league/season combinations`);
  let totalProps = 0;
  let totalGameLogs = 0;
  let totalErrors = 0;
  const results = {};
  for (const combo of combinations) {
    const key = `${combo.leagueID}-${combo.season}`;
    console.log(`
\u{1F3C8} Backfilling ${key} (${combo.days} days)`);
    try {
      const result = await runBackfill(env, combo.leagueID, combo.season, combo.days);
      totalProps += result.propsInserted;
      totalGameLogs += result.gameLogsInserted;
      totalErrors += result.errors;
      results[key] = result;
      console.log(`\u2705 ${key}: ${result.propsInserted} props, ${result.gameLogsInserted} game logs, ${result.errors} errors`);
    } catch (error) {
      console.error(`\u274C ${key} backfill failed:`, error);
      results[key] = { propsInserted: 0, gameLogsInserted: 0, errors: 1, tier: 0, eventsProcessed: 0, extractionStats: null };
      totalErrors++;
    }
  }
  console.log(`
\u{1F389} Batch backfill complete:`);
  console.log(`\u{1F4CA} Total: ${totalProps} props, ${totalGameLogs} game logs, ${totalErrors} errors`);
  return {
    totalProps,
    totalGameLogs,
    totalErrors,
    results
  };
}
__name(runBatchBackfill, "runBatchBackfill");

// src/config/leagues.ts
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
var LEAGUES = [
  {
    id: "NFL",
    displayName: "National Football League",
    sport: "football",
    seasons: [2023, 2024, 2025],
    isActive: true,
    oddIDs: "passing_yards-PLAYER_ID-game-ou-over,rushing_yards-PLAYER_ID-game-ou-over,receiving_yards-PLAYER_ID-game-ou-over,receptions-PLAYER_ID-game-ou-over,passing_touchdowns-PLAYER_ID-game-ou-over,rushing_touchdowns-PLAYER_ID-game-ou-over,receiving_touchdowns-PLAYER_ID-game-ou-over"
  },
  {
    id: "NBA",
    displayName: "National Basketball Association",
    sport: "basketball",
    seasons: [2023, 2024, 2025],
    isActive: true,
    oddIDs: "points-PLAYER_ID-game-ou-over,rebounds-PLAYER_ID-game-ou-over,assists-PLAYER_ID-game-ou-over,steals-PLAYER_ID-game-ou-over,blocks-PLAYER_ID-game-ou-over,threes_made-PLAYER_ID-game-ou-over,points_rebounds_assists-PLAYER_ID-game-ou-over"
  },
  {
    id: "MLB",
    displayName: "Major League Baseball",
    sport: "baseball",
    seasons: [2023, 2024, 2025],
    isActive: true,
    oddIDs: "hits-PLAYER_ID-game-ou-over,runs-PLAYER_ID-game-ou-over,rbis-PLAYER_ID-game-ou-over,total_bases-PLAYER_ID-game-ou-over,strikeouts-PLAYER_ID-game-ou-over,pitching_outs-PLAYER_ID-game-ou-over"
  },
  {
    id: "NHL",
    displayName: "National Hockey League",
    sport: "hockey",
    seasons: [2023, 2024, 2025],
    isActive: true,
    oddIDs: "shots_on_goal-PLAYER_ID-game-ou-over,points-PLAYER_ID-game-ou-over,goals-PLAYER_ID-game-ou-over,assists-PLAYER_ID-game-ou-over,saves-PLAYER_ID-game-ou-over"
  },
  {
    id: "EPL",
    displayName: "English Premier League",
    sport: "soccer",
    seasons: [2023, 2024, 2025],
    isActive: false,
    // Set to false if not actively ingesting
    oddIDs: "shots-PLAYER_ID-game-ou-over,shots_on_target-PLAYER_ID-game-ou-over,goals-PLAYER_ID-game-ou-over,assists-PLAYER_ID-game-ou-over,passes-PLAYER_ID-game-ou-over,tackles-PLAYER_ID-game-ou-over"
  },
  {
    id: "NCAAF",
    displayName: "NCAA Football",
    sport: "football",
    seasons: [2023, 2024, 2025],
    isActive: false,
    oddIDs: "passing_yards-PLAYER_ID-game-ou-over,rushing_yards-PLAYER_ID-game-ou-over,receiving_yards-PLAYER_ID-game-ou-over,receptions-PLAYER_ID-game-ou-over"
  },
  {
    id: "NCAAB",
    displayName: "NCAA Basketball",
    sport: "basketball",
    seasons: [2023, 2024, 2025],
    isActive: false,
    oddIDs: "points-PLAYER_ID-game-ou-over,rebounds-PLAYER_ID-game-ou-over,assists-PLAYER_ID-game-ou-over,threes_made-PLAYER_ID-game-ou-over"
  }
];
function getActiveLeagues() {
  return LEAGUES.filter((league) => league.isActive);
}
__name(getActiveLeagues, "getActiveLeagues");
function getAllSeasons() {
  const seasons = /* @__PURE__ */ new Set();
  LEAGUES.forEach((league) => {
    league.seasons.forEach((season) => seasons.add(season));
  });
  return Array.from(seasons).sort((a, b) => b - a);
}
__name(getAllSeasons, "getAllSeasons");

// src/jobs/multiBackfill.ts
async function runMultiSeasonBackfill(env, config = {}) {
  const startTime = Date.now();
  console.log(`\u{1F680} Starting multi-season backfill with config:`, config);
  const leaguesToProcess = config.leagues || getActiveLeagues().map((l) => l.id);
  console.log(`\u{1F4CA} Processing leagues: ${leaguesToProcess.join(", ")}`);
  const seasonsToProcess = config.seasons || getAllSeasons();
  console.log(`\u{1F4CA} Processing seasons: ${seasonsToProcess.join(", ")}`);
  const daysPerSeason = config.daysPerSeason || 200;
  console.log(`\u{1F4CA} Days per season: ${daysPerSeason}`);
  const combinations = [];
  for (const leagueId of leaguesToProcess) {
    for (const season of seasonsToProcess) {
      combinations.push({
        leagueID: leagueId,
        season,
        days: daysPerSeason
      });
    }
  }
  console.log(`\u{1F4CA} Total combinations: ${combinations.length}`);
  console.log(`\u{1F4CA} Estimated duration: ${Math.ceil(combinations.length * 2)} minutes`);
  const batchResult = await runBatchBackfill(env, combinations);
  const duration = Date.now() - startTime;
  const leaguesProcessed = new Set(combinations.map((c) => c.leagueID)).size;
  const seasonsProcessed = new Set(combinations.map((c) => c.season)).size;
  const averagePropsPerLeague = batchResult.totalProps / leaguesProcessed;
  const averageGameLogsPerLeague = batchResult.totalGameLogs / leaguesProcessed;
  const totalCombinations = combinations.length;
  const successfulCombinations = Object.values(batchResult.results).filter((r) => r.errors === 0).length;
  const successRate = successfulCombinations / totalCombinations * 100;
  const result = {
    totalProps: batchResult.totalProps,
    totalGameLogs: batchResult.totalGameLogs,
    totalErrors: batchResult.totalErrors,
    duration,
    leagueSeasonResults: batchResult.results,
    summary: {
      leaguesProcessed,
      seasonsProcessed,
      averagePropsPerLeague: Math.round(averagePropsPerLeague),
      averageGameLogsPerLeague: Math.round(averageGameLogsPerLeague),
      successRate: Math.round(successRate * 100) / 100
    }
  };
  console.log(`
\u{1F389} Multi-season backfill complete!`);
  console.log(`\u23F1\uFE0F Duration: ${Math.round(duration / 1e3)}s`);
  console.log(`\u{1F4CA} Results: ${result.totalProps} props, ${result.totalGameLogs} game logs, ${result.totalErrors} errors`);
  console.log(`\u{1F4C8} Success Rate: ${result.summary.successRate}%`);
  console.log(`\u{1F3C6} Leagues: ${result.summary.leaguesProcessed}, Seasons: ${result.summary.seasonsProcessed}`);
  return result;
}
__name(runMultiSeasonBackfill, "runMultiSeasonBackfill");
async function runRecentSeasonsBackfill(env, daysPerSeason = 90) {
  console.log(`\u{1F504} Running recent seasons backfill (${daysPerSeason} days per season)`);
  return runMultiSeasonBackfill(env, {
    leagues: getActiveLeagues().map((l) => l.id),
    seasons: [2024, 2025],
    // Recent seasons only
    daysPerSeason
  });
}
__name(runRecentSeasonsBackfill, "runRecentSeasonsBackfill");
async function runFullHistoricalBackfill(env, daysPerSeason = 365) {
  console.log(`\u{1F504} Running full historical backfill (${daysPerSeason} days per season)`);
  return runMultiSeasonBackfill(env, {
    leagues: getActiveLeagues().map((l) => l.id),
    seasons: getAllSeasons(),
    daysPerSeason
  });
}
__name(runFullHistoricalBackfill, "runFullHistoricalBackfill");
async function runLeagueSpecificBackfill(env, leagueId, seasons, daysPerSeason = 200) {
  console.log(`\u{1F504} Running league-specific backfill for ${leagueId} (${seasons.join(", ")})`);
  return runMultiSeasonBackfill(env, {
    leagues: [leagueId],
    seasons,
    daysPerSeason
  });
}
__name(runLeagueSpecificBackfill, "runLeagueSpecificBackfill");
async function runSeasonSpecificBackfill(env, season, leagues, daysPerSeason = 200) {
  const leaguesToUse = leagues || getActiveLeagues().map((l) => l.id);
  console.log(`\u{1F504} Running season-specific backfill for ${season} (${leaguesToUse.join(", ")})`);
  return runMultiSeasonBackfill(env, {
    leagues: leaguesToUse,
    seasons: [season],
    daysPerSeason
  });
}
__name(runSeasonSpecificBackfill, "runSeasonSpecificBackfill");
async function runProgressiveBackfill(env, maxDays = 365) {
  console.log(`\u{1F504} Running progressive backfill (max ${maxDays} days)`);
  const activeLeagues = getActiveLeagues();
  const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
  const seasons = [currentYear, currentYear - 1, currentYear - 2];
  const combinations = [];
  for (const league of activeLeagues) {
    for (const season of seasons) {
      const days = Math.min(maxDays, Math.max(30, maxDays - (currentYear - season) * 50));
      combinations.push({
        leagueID: league.id,
        season,
        days
      });
    }
  }
  console.log(`\u{1F4CA} Progressive backfill: ${combinations.length} combinations`);
  const batchResult = await runBatchBackfill(env, combinations);
  const duration = Date.now();
  const leaguesProcessed = new Set(combinations.map((c) => c.leagueID)).size;
  const seasonsProcessed = new Set(combinations.map((c) => c.season)).size;
  const totalCombinations = combinations.length;
  const successfulCombinations = Object.values(batchResult.results).filter((r) => r.errors === 0).length;
  const successRate = successfulCombinations / totalCombinations * 100;
  return {
    totalProps: batchResult.totalProps,
    totalGameLogs: batchResult.totalGameLogs,
    totalErrors: batchResult.totalErrors,
    duration,
    leagueSeasonResults: batchResult.results,
    summary: {
      leaguesProcessed,
      seasonsProcessed,
      averagePropsPerLeague: Math.round(batchResult.totalProps / leaguesProcessed),
      averageGameLogsPerLeague: Math.round(batchResult.totalGameLogs / leaguesProcessed),
      successRate: Math.round(successRate * 100) / 100
    }
  };
}
__name(runProgressiveBackfill, "runProgressiveBackfill");

// src/jobs/ingest.ts
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_api();
init_extract();
init_supabaseFetch();
async function runIngestion(env) {
  console.log(`\u{1F504} Starting current season ingestion...`);
  const startTime = Date.now();
  let totalProps = 0;
  let totalInserted = 0;
  let totalUpdated = 0;
  let totalErrors = 0;
  const leagueResults = [];
  const activeLeagues = getActiveLeagues();
  console.log(`\u{1F4CA} Processing ${activeLeagues.length} active leagues: ${activeLeagues.map((l) => l.id).join(", ")}`);
  for (const leagueConfig of activeLeagues) {
    const { id: leagueID, season, oddIDs } = leagueConfig;
    console.log(`
\u{1F3C8} Starting ingestion for ${leagueID} ${season}`);
    try {
      const { events, tier } = await getEventsWithFallbacks(env, leagueID, season, oddIDs);
      console.log(`\u{1F4CA} ${leagueID}: Fetched ${events.length} events (tier ${tier})`);
      if (events.length === 0) {
        console.log(`\u26A0\uFE0F ${leagueID}: No events found`);
        leagueResults.push({ league: leagueID, props: 0, inserted: 0, errors: 0 });
        continue;
      }
      const { props: extractedProps, stats } = extractPlayerPropsWithLogging(events);
      console.log(`\u{1F4CA} ${leagueID}: Extracted ${extractedProps.length} player props`);
      if (extractedProps.length === 0) {
        console.log(`\u26A0\uFE0F ${leagueID}: No player props extracted`);
        leagueResults.push({ league: leagueID, props: 0, inserted: 0, errors: 0 });
        continue;
      }
      const mappedProps = [];
      for (const prop of extractedProps) {
        try {
          const mockEvent = {
            id: prop.eventId,
            date: prop.eventStartUtc,
            homeTeam: "HOME",
            awayTeam: "AWAY",
            teams: ["HOME", "AWAY"]
          };
          const mockOdd = {
            player_name: prop.playerName,
            playerID: prop.playerId,
            market_key: prop.marketName,
            point: prop.line,
            over_price: prop.overUnder === "over" ? prop.odds : null,
            under_price: prop.overUnder === "under" ? prop.odds : null,
            bookmaker_name: prop.sportsbook,
            id: prop.oddId
          };
          const eventProps = await createPlayerPropsFromOdd(
            mockOdd,
            prop.oddId,
            mockEvent,
            prop.league.toLowerCase(),
            season.toString(),
            void 0,
            env
          );
          mappedProps.push(...eventProps);
        } catch (error) {
          console.error(`\u274C Error mapping prop ${prop.oddId}:`, error);
          totalErrors++;
        }
      }
      console.log(`\u{1F4CA} ${leagueID}: Mapped ${mappedProps.length} props for insertion`);
      totalProps += mappedProps.length;
      let leagueInserted = 0;
      let leagueErrors = 0;
      if (mappedProps.length > 0) {
        const propChunks = chunk(mappedProps, 500);
        for (let i = 0; i < propChunks.length; i++) {
          try {
            const { data, error } = await supabaseFetch(env, "proplines", {
              method: "POST",
              body: propChunks[i],
              query: "?on_conflict=conflict_key"
            });
            if (error) {
              console.error(`\u274C ${leagueID}: Props batch ${i + 1} failed:`, error);
              leagueErrors += propChunks[i].length;
            } else {
              leagueInserted += propChunks[i].length;
              console.log(`\u2705 ${leagueID}: Inserted props batch ${i + 1}/${propChunks.length} (${propChunks[i].length} props)`);
            }
          } catch (error) {
            console.error(`\u274C ${leagueID}: Props batch ${i + 1} exception:`, error);
            leagueErrors += propChunks[i].length;
          }
        }
      }
      totalInserted += leagueInserted;
      totalErrors += leagueErrors;
      leagueResults.push({
        league: leagueID,
        props: mappedProps.length,
        inserted: leagueInserted,
        errors: leagueErrors
      });
      console.log(`\u2705 ${leagueID} ingestion complete: ${leagueInserted} inserted, ${leagueErrors} errors`);
    } catch (error) {
      console.error(`\u274C ${leagueID} ingestion failed:`, error);
      leagueResults.push({ league: leagueID, props: 0, inserted: 0, errors: 1 });
      totalErrors++;
    }
  }
  const duration = Date.now() - startTime;
  console.log(`
\u{1F389} Current season ingestion complete:`);
  console.log(`\u23F1\uFE0F Duration: ${Math.round(duration / 1e3)}s`);
  console.log(`\u{1F4CA} Total: ${totalProps} props processed, ${totalInserted} inserted, ${totalErrors} errors`);
  console.log(`\u{1F3C6} Leagues processed: ${leagueResults.length}`);
  return {
    totalProps,
    inserted: totalInserted,
    updated: totalUpdated,
    // Not implemented yet
    errors: totalErrors,
    leagues: leagueResults
  };
}
__name(runIngestion, "runIngestion");
async function runSingleLeagueIngestion(env, leagueId) {
  console.log(`\u{1F504} Starting single league ingestion for ${leagueId}...`);
  const activeLeagues = getActiveLeagues();
  const leagueConfig = activeLeagues.find((l) => l.id === leagueId);
  if (!leagueConfig) {
    throw new Error(`League ${leagueId} not found or not active`);
  }
  const originalActiveLeagues = getActiveLeagues();
  try {
    return await runIngestion(env);
  } finally {
    console.log(`\u2705 Single league ingestion complete for ${leagueId}`);
  }
}
__name(runSingleLeagueIngestion, "runSingleLeagueIngestion");

// src/worker.ts
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
      if (url.pathname === "/") {
        return new Response(JSON.stringify({
          message: "Multi-League Multi-Season Props Ingestion Worker",
          endpoints: {
            ingestion: ["/ingest", "/ingest/{league}"],
            backfill: ["/backfill-all", "/backfill-recent", "/backfill-full", "/backfill-league/{league}", "/backfill-season/{season}"],
            verification: ["/verify-backfill", "/verify-analytics"],
            status: ["/status", "/leagues", "/seasons"],
            debug: ["/debug-api", "/debug-comprehensive", "/debug-json", "/debug-extraction", "/debug-insert", "/debug-schema"]
          },
          leagues: getActiveLeagues().map((l) => l.id),
          seasons: getAllSeasons(),
          features: ["Multi-league ingestion", "Multi-season backfill", "Analytics computation", "Fallback logic", "Progressive backfill"]
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      }
      if (url.pathname === "/backfill-all") {
        const days = Number(url.searchParams.get("days") ?? "200");
        const leagues = url.searchParams.get("leagues")?.split(",");
        const seasons = url.searchParams.get("seasons")?.split(",").map((s) => parseInt(s));
        console.log(`\u{1F504} Starting multi-season backfill: days=${days}, leagues=${leagues}, seasons=${seasons}`);
        const startTime = Date.now();
        try {
          const result = await runMultiSeasonBackfill(env, {
            leagues,
            seasons,
            daysPerSeason: days
          });
          const duration = Date.now() - startTime;
          return new Response(JSON.stringify({
            success: true,
            message: "Multi-season backfill completed successfully",
            duration: `${duration}ms`,
            totalProps: result.totalProps,
            totalGameLogs: result.totalGameLogs,
            totalErrors: result.totalErrors,
            leagueSeasonResults: result.leagueSeasonResults,
            summary: result.summary
          }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        } catch (error) {
          console.error("\u274C Multi-season backfill failed:", error);
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            duration: `${Date.now() - startTime}ms`
          }), {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        }
      }
      if (url.pathname === "/backfill-recent") {
        const days = Number(url.searchParams.get("days") ?? "90");
        console.log(`\u{1F504} Starting recent seasons backfill: ${days} days`);
        const startTime = Date.now();
        try {
          const result = await runRecentSeasonsBackfill(env, days);
          const duration = Date.now() - startTime;
          return new Response(JSON.stringify({
            success: true,
            message: "Recent seasons backfill completed successfully",
            duration: `${duration}ms`,
            totalProps: result.totalProps,
            totalGameLogs: result.totalGameLogs,
            totalErrors: result.totalErrors,
            leagueSeasonResults: result.leagueSeasonResults,
            summary: result.summary
          }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        } catch (error) {
          console.error("\u274C Recent seasons backfill failed:", error);
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            duration: `${Date.now() - startTime}ms`
          }), {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        }
      }
      if (url.pathname === "/backfill-full") {
        const days = Number(url.searchParams.get("days") ?? "365");
        console.log(`\u{1F504} Starting full historical backfill: ${days} days`);
        const startTime = Date.now();
        try {
          const result = await runFullHistoricalBackfill(env, days);
          const duration = Date.now() - startTime;
          return new Response(JSON.stringify({
            success: true,
            message: "Full historical backfill completed successfully",
            duration: `${duration}ms`,
            totalProps: result.totalProps,
            totalGameLogs: result.totalGameLogs,
            totalErrors: result.totalErrors,
            leagueSeasonResults: result.leagueSeasonResults,
            summary: result.summary
          }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        } catch (error) {
          console.error("\u274C Full historical backfill failed:", error);
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            duration: `${Date.now() - startTime}ms`
          }), {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        }
      }
      if (url.pathname.startsWith("/backfill-league/")) {
        const leagueId = url.pathname.split("/")[2];
        const days = Number(url.searchParams.get("days") ?? "200");
        const seasons = url.searchParams.get("seasons")?.split(",").map((s) => parseInt(s)) || [2024, 2025];
        console.log(`\u{1F504} Starting league-specific backfill: ${leagueId}, ${days} days, seasons: ${seasons.join(", ")}`);
        const startTime = Date.now();
        try {
          const result = await runLeagueSpecificBackfill(env, leagueId, seasons, days);
          const duration = Date.now() - startTime;
          return new Response(JSON.stringify({
            success: true,
            message: `League-specific backfill completed successfully for ${leagueId}`,
            duration: `${duration}ms`,
            totalProps: result.totalProps,
            totalGameLogs: result.totalGameLogs,
            totalErrors: result.totalErrors,
            leagueSeasonResults: result.leagueSeasonResults,
            summary: result.summary
          }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        } catch (error) {
          console.error(`\u274C League-specific backfill failed for ${leagueId}:`, error);
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            duration: `${Date.now() - startTime}ms`
          }), {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        }
      }
      if (url.pathname.startsWith("/backfill-season/")) {
        const season = parseInt(url.pathname.split("/")[2]);
        const days = Number(url.searchParams.get("days") ?? "200");
        const leagues = url.searchParams.get("leagues")?.split(",");
        console.log(`\u{1F504} Starting season-specific backfill: ${season}, ${days} days, leagues: ${leagues?.join(", ") || "all"}`);
        const startTime = Date.now();
        try {
          const result = await runSeasonSpecificBackfill(env, season, leagues, days);
          const duration = Date.now() - startTime;
          return new Response(JSON.stringify({
            success: true,
            message: `Season-specific backfill completed successfully for ${season}`,
            duration: `${duration}ms`,
            totalProps: result.totalProps,
            totalGameLogs: result.totalGameLogs,
            totalErrors: result.totalErrors,
            leagueSeasonResults: result.leagueSeasonResults,
            summary: result.summary
          }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        } catch (error) {
          console.error(`\u274C Season-specific backfill failed for ${season}:`, error);
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            duration: `${Date.now() - startTime}ms`
          }), {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        }
      }
      if (url.pathname === "/backfill-progressive") {
        const maxDays = Number(url.searchParams.get("maxDays") ?? "365");
        console.log(`\u{1F504} Starting progressive backfill: max ${maxDays} days`);
        const startTime = Date.now();
        try {
          const result = await runProgressiveBackfill(env, maxDays);
          const duration = Date.now() - startTime;
          return new Response(JSON.stringify({
            success: true,
            message: "Progressive backfill completed successfully",
            duration: `${duration}ms`,
            totalProps: result.totalProps,
            totalGameLogs: result.totalGameLogs,
            totalErrors: result.totalErrors,
            leagueSeasonResults: result.leagueSeasonResults,
            summary: result.summary
          }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        } catch (error) {
          console.error("\u274C Progressive backfill failed:", error);
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            duration: `${Date.now() - startTime}ms`
          }), {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        }
      }
      if (url.pathname === "/ingest") {
        console.log(`\u{1F504} Starting current season ingestion...`);
        const startTime = Date.now();
        try {
          const result = await runIngestion(env);
          const duration = Date.now() - startTime;
          return new Response(JSON.stringify({
            success: true,
            message: "Current season ingestion completed successfully",
            duration: `${duration}ms`,
            ...result
          }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        } catch (error) {
          console.error("\u274C Ingestion failed:", error);
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            duration: `${Date.now() - startTime}ms`
          }), {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        }
      }
      if (url.pathname.startsWith("/ingest/")) {
        const leagueId = url.pathname.split("/")[2];
        console.log(`\u{1F504} Starting single league ingestion for ${leagueId}...`);
        const startTime = Date.now();
        try {
          const result = await runSingleLeagueIngestion(env, leagueId);
          const duration = Date.now() - startTime;
          return new Response(JSON.stringify({
            success: true,
            message: `Single league ingestion completed successfully for ${leagueId}`,
            duration: `${duration}ms`,
            ...result
          }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        } catch (error) {
          console.error(`\u274C Single league ingestion failed for ${leagueId}:`, error);
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            duration: `${Date.now() - startTime}ms`
          }), {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        }
      }
      if (url.pathname === "/debug-schema") {
        try {
          const { supabaseFetch: supabaseFetch2 } = await Promise.resolve().then(() => (init_supabaseFetch(), supabaseFetch_exports));
          console.log("\u{1F50D} Checking table schema...");
          const response = await supabaseFetch2(env, "proplines", {
            method: "GET",
            query: "?limit=1&select=*"
          });
          if (response.error) {
            console.error("\u274C Schema check failed:", response.error);
            return new Response(JSON.stringify({
              success: false,
              error: response.error instanceof Error ? response.error.message : String(response.error),
              details: response.error
            }), {
              status: 500,
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
          } else {
            console.log("\u2705 Schema check successful:", response.data);
            return new Response(JSON.stringify({
              success: true,
              message: "Table schema retrieved",
              data: response.data,
              note: "This shows what columns exist in the table"
            }), {
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
          }
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }
      }
      if (url.pathname === "/debug-insert") {
        try {
          const { supabaseFetch: supabaseFetch2 } = await Promise.resolve().then(() => (init_supabaseFetch(), supabaseFetch_exports));
          console.log("\u{1F50D} Testing isolated insert...");
          const timestamp = Date.now();
          const testProp = {
            player_id: `TEST_PLAYER_${timestamp}`,
            player_name: `Test Player ${timestamp}`,
            team: "TEST",
            opponent: "TEST2",
            season: 2025,
            date: "2025-10-08",
            prop_type: "Test Prop",
            sportsbook: "TestBook",
            line: 100.5,
            over_odds: -110,
            under_odds: -110,
            league: "nfl",
            game_id: `TEST-GAME-${timestamp}`,
            conflict_key: `TEST_CONFLICT_${timestamp}`
          };
          console.log("\u{1F50D} Test prop:", JSON.stringify(testProp, null, 2));
          const response = await supabaseFetch2(env, "proplines", {
            method: "POST",
            body: [testProp]
          });
          if (response === null || response === void 0) {
            console.log("\u2705 Insert successful - Empty response indicates success");
            return new Response(JSON.stringify({
              success: true,
              message: "Test insert successful",
              data: "Record inserted successfully (empty response from Supabase)",
              testProp
            }), {
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
          } else {
            console.log("\u2705 Insert successful with response:", response);
            return new Response(JSON.stringify({
              success: true,
              message: "Test insert successful",
              data: response,
              testProp
            }), {
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
          }
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }
      }
      if (url.pathname === "/debug-extraction") {
        try {
          const { fetchEventsWithProps: fetchEventsWithProps2 } = await Promise.resolve().then(() => (init_api(), api_exports));
          const { extractPlayerProps: extractPlayerProps2 } = await Promise.resolve().then(() => (init_extract(), extract_exports));
          console.log("\u{1F50D} Testing extraction...");
          const events = await fetchEventsWithProps2(env, "NFL", { limit: 1 });
          console.log(`\u{1F4CA} Fetched ${events.length} events`);
          if (events.length > 0) {
            const extracted = extractPlayerProps2(events);
            console.log(`\u{1F4CA} Extracted ${extracted.length} props`);
            return new Response(JSON.stringify({
              success: true,
              eventsCount: events.length,
              extractedPropsCount: extracted.length,
              firstEvent: events[0] ? {
                eventID: events[0].eventID,
                leagueID: events[0].leagueID,
                oddsKeys: Object.keys(events[0].odds || {}).length,
                playersKeys: Object.keys(events[0].players || {}).length
              } : null,
              firstExtractedProp: extracted.length > 0 ? {
                playerName: extracted[0].playerName,
                marketName: extracted[0].marketName,
                line: extracted[0].line,
                odds: extracted[0].odds,
                sportsbook: extracted[0].sportsbook
              } : null
            }), {
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
          } else {
            return new Response(JSON.stringify({
              success: false,
              error: "No events found"
            }), {
              status: 500,
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
          }
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }
      }
      if (url.pathname === "/debug-json") {
        try {
          const testUrl = `https://api.sportsgameodds.com/v2/events?apiKey=${env.SPORTSGAMEODDS_API_KEY}&leagueID=NFL`;
          console.log(`\u{1F50D} Testing JSON parsing: ${testUrl}`);
          const fetchResponse = await fetch(testUrl);
          const responseText = await fetchResponse.text();
          console.log(`\u{1F4CA} Raw response length: ${responseText.length}`);
          console.log(`\u{1F4CA} Raw response first 100 chars: ${responseText.substring(0, 100)}`);
          const response = JSON.parse(responseText);
          const events = response.data || response;
          const eventsArray = Array.isArray(events) ? events : [];
          console.log(`\u{1F4CA} Response type: ${typeof response}`);
          console.log(`\u{1F4CA} Has data field: ${!!response.data}`);
          console.log(`\u{1F4CA} Events array length: ${eventsArray.length}`);
          return new Response(JSON.stringify({
            success: true,
            responseLength: responseText.length,
            responseStart: responseText.substring(0, 100),
            responseType: typeof response,
            hasDataField: !!response.data,
            eventsArrayLength: eventsArray.length,
            firstEvent: eventsArray.length > 0 ? typeof eventsArray[0] : null
          }), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }
      }
      if (url.pathname === "/debug-comprehensive") {
        try {
          console.log("\u{1F50D} Running comprehensive API debug...");
          const testResults = [];
          const leagues = ["NFL", "NBA", "MLB", "NHL"];
          for (const league of leagues) {
            const url2 = `https://api.sportsgameodds.com/v2/events?apiKey=${env.SPORTSGAMEODDS_API_KEY}&leagueID=${league}`;
            console.log(`\u{1F50D} Testing ${league}: ${url2}`);
            try {
              const response = await fetch(url2);
              const data = await response.json();
              testResults.push({
                league,
                status: response.status,
                eventsCount: Array.isArray(data) ? data.length : "not array",
                dataType: typeof data,
                isArray: Array.isArray(data),
                firstItem: Array.isArray(data) && data.length > 0 ? typeof data[0] : null,
                responseHeaders: { contentType: response.headers.get("content-type") || "", status: response.status.toString() },
                rawResponse: data
                // Show the actual response
              });
            } catch (error) {
              testResults.push({
                league,
                error: error instanceof Error ? error.message : String(error)
              });
            }
          }
          const testUrls = [
            { name: "NFL without oddsAvailable", url: `https://api.sportsgameodds.com/v2/events?apiKey=${env.SPORTSGAMEODDS_API_KEY}&leagueID=NFL` },
            { name: "NFL with oddsAvailable=true", url: `https://api.sportsgameodds.com/v2/events?apiKey=${env.SPORTSGAMEODDS_API_KEY}&leagueID=NFL&oddsAvailable=true` },
            { name: "NFL with oddsAvailable=false", url: `https://api.sportsgameodds.com/v2/events?apiKey=${env.SPORTSGAMEODDS_API_KEY}&leagueID=NFL&oddsAvailable=false` }
          ];
          for (const test of testUrls) {
            console.log(`\u{1F50D} Testing ${test.name}: ${test.url}`);
            try {
              const response = await fetch(test.url);
              const data = await response.json();
              testResults.push({
                test: test.name,
                status: response.status,
                eventsCount: Array.isArray(data) ? data.length : "not array",
                dataType: typeof data,
                isArray: Array.isArray(data),
                firstItem: Array.isArray(data) && data.length > 0 ? typeof data[0] : null
              });
            } catch (error) {
              testResults.push({
                test: test.name,
                error: error instanceof Error ? error.message : String(error)
              });
            }
          }
          const endpoints = [
            "/v2/events",
            "/v2/odds",
            "/v2/playerprops"
          ];
          for (const endpoint of endpoints) {
            const url2 = `https://api.sportsgameodds.com${endpoint}?apiKey=${env.SPORTSGAMEODDS_API_KEY}&leagueID=NFL`;
            console.log(`\u{1F50D} Testing ${endpoint}: ${url2}`);
            try {
              const response = await fetch(url2);
              const data = await response.json();
              testResults.push({
                endpoint,
                status: response.status,
                eventsCount: Array.isArray(data) ? data.length : "not array",
                dataType: typeof data
              });
            } catch (error) {
              testResults.push({
                endpoint,
                error: error instanceof Error ? error.message : String(error)
              });
            }
          }
          return new Response(JSON.stringify({
            success: true,
            apiKeyLength: env.SPORTSGAMEODDS_API_KEY ? env.SPORTSGAMEODDS_API_KEY.length : 0,
            testResults
          }), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }
      }
      if (url.pathname === "/debug-api") {
        try {
          const { fetchEventsWithProps: fetchEventsWithProps2 } = await Promise.resolve().then(() => (init_api(), api_exports));
          console.log("\u{1F50D} Testing API directly...");
          console.log("\u{1F50D} API Key available:", !!env.SPORTSGAMEODDS_API_KEY);
          console.log("\u{1F50D} API Key length:", env.SPORTSGAMEODDS_API_KEY ? env.SPORTSGAMEODDS_API_KEY.length : 0);
          console.log("\u{1F50D} Test 1: Basic API call without filters");
          const basicUrl = `https://api.sportsgameodds.com/v2/events?apiKey=${env.SPORTSGAMEODDS_API_KEY}&leagueID=NFL&oddsAvailable=true`;
          console.log("\u{1F50D} Basic URL:", basicUrl);
          try {
            const basicResponse = await fetch(basicUrl);
            const basicData = await basicResponse.json();
            console.log("\u{1F4CA} Basic API Response:", {
              status: basicResponse.status,
              eventsCount: Array.isArray(basicData) ? basicData.length : "not array",
              dataType: typeof basicData,
              firstEvent: Array.isArray(basicData) && basicData.length > 0 ? basicData[0] : null
            });
          } catch (error) {
            console.error("\u274C Basic API call failed:", error);
          }
          console.log("\u{1F50D} Test 2: With season filter");
          const seasonUrl = `https://api.sportsgameodds.com/v2/events?apiKey=${env.SPORTSGAMEODDS_API_KEY}&leagueID=NFL&oddsAvailable=true&season=2024`;
          console.log("\u{1F50D} Season URL:", seasonUrl);
          try {
            const seasonResponse = await fetch(seasonUrl);
            const seasonData = await seasonResponse.json();
            console.log("\u{1F4CA} Season API Response:", {
              status: seasonResponse.status,
              eventsCount: Array.isArray(seasonData) ? seasonData.length : "not array"
            });
          } catch (error) {
            console.error("\u274C Season API call failed:", error);
          }
          console.log("\u{1F50D} Test 3: With date filter");
          const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
          const dateUrl = `https://api.sportsgameodds.com/v2/events?apiKey=${env.SPORTSGAMEODDS_API_KEY}&leagueID=NFL&oddsAvailable=true&dateFrom=${today}&dateTo=${today}`;
          console.log("\u{1F50D} Date URL:", dateUrl);
          try {
            const dateResponse = await fetch(dateUrl);
            const dateData = await dateResponse.json();
            console.log("\u{1F4CA} Date API Response:", {
              status: dateResponse.status,
              eventsCount: Array.isArray(dateData) ? dateData.length : "not array",
              dateUsed: today
            });
          } catch (error) {
            console.error("\u274C Date API call failed:", error);
          }
          console.log("\u{1F50D} Test 4: Using fetchEventsWithProps");
          const events = await fetchEventsWithProps2(env, "NFL", {
            limit: 5
          });
          console.log(`\u{1F4CA} fetchEventsWithProps result: ${events.length} events`);
          if (events.length > 0) {
            const firstEvent = events[0];
            console.log("\u{1F4CA} First event structure:", {
              id: firstEvent.id,
              leagueID: firstEvent.leagueID,
              oddsKeys: Object.keys(firstEvent.odds || {}).length,
              playersKeys: Object.keys(firstEvent.players || {}).length,
              sampleOdd: Object.values(firstEvent.odds || {})[0]
            });
          }
          return new Response(JSON.stringify({
            success: true,
            eventsCount: events.length,
            firstEvent: events.length > 0 ? {
              id: events[0].id,
              leagueID: events[0].leagueID,
              oddsCount: Object.keys(events[0].odds || {}).length,
              playersCount: Object.keys(events[0].players || {}).length
            } : null
          }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        } catch (error) {
          console.error("\u274C Debug API failed:", error);
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }), {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        }
      }
      if (url.pathname === "/status") {
        return new Response(JSON.stringify({
          status: "healthy",
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          activeLeagues: getActiveLeagues().length,
          totalLeagues: LEAGUES.length,
          availableSeasons: getAllSeasons()
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      }
      if (url.pathname === "/leagues") {
        return new Response(JSON.stringify({
          all: LEAGUES,
          active: getActiveLeagues(),
          total: LEAGUES.length,
          activeCount: getActiveLeagues().length
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      }
      if (url.pathname === "/seasons") {
        return new Response(JSON.stringify({
          all: getAllSeasons(),
          total: getAllSeasons().length,
          current: (/* @__PURE__ */ new Date()).getFullYear()
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      }
      return new Response(JSON.stringify({
        error: "Endpoint not found",
        availableEndpoints: ["/backfill-all", "/backfill-recent", "/backfill-full", "/backfill-league/{league}", "/backfill-season/{season}", "/backfill-progressive", "/ingest", "/ingest/{league}", "/status", "/leagues", "/seasons"]
      }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    } catch (error) {
      console.error("\u274C Worker fetch error:", error);
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error) || "Internal Server Error"
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
  },
  async scheduled(event, env, ctx) {
    console.log(`\u{1F550} Scheduled ingestion triggered at ${(/* @__PURE__ */ new Date()).toISOString()}`);
    ctx.waitUntil(runIngestion(env));
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
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
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
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

// .wrangler/tmp/bundle-5tAbBl/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// node_modules/wrangler/templates/middleware/common.ts
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
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

// .wrangler/tmp/bundle-5tAbBl/middleware-loader.entry.ts
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
