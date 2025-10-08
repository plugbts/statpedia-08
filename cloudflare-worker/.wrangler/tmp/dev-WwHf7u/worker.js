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

// .wrangler/tmp/bundle-Q4S6Wx/checked-fetch.js
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
  ".wrangler/tmp/bundle-Q4S6Wx/checked-fetch.js"() {
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

// .wrangler/tmp/bundle-Q4S6Wx/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
var init_strip_cf_connecting_ip_header = __esm({
  ".wrangler/tmp/bundle-Q4S6Wx/strip-cf-connecting-ip-header.js"() {
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
async function supabaseFetch(env, table, { method = "GET", body, query = "", headers = {} } = {}) {
  const url = `${env.SUPABASE_URL}/rest/v1/${table}${query}`;
  const res = await fetch(url, {
    method,
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...method === "POST" && body ? { Prefer: "resolution=merge-duplicates" } : {},
      ...headers
      // Merge custom headers
    },
    body: body ? JSON.stringify(body) : void 0
  });
  if (!res.ok) {
    const text2 = await res.text();
    console.error(`\u274C Supabase ${method} ${table} failed:`, {
      status: res.status,
      statusText: res.statusText,
      url,
      method,
      table,
      responseText: text2,
      headers: Object.fromEntries(res.headers.entries())
    });
    throw new Error(`Supabase ${method} ${table} failed: ${res.status} ${res.statusText} - ${text2}`);
  }
  const contentLength = res.headers.get("content-length");
  if (contentLength === "0" || contentLength === null) {
    console.log(`\u2705 Supabase ${method} ${table} successful (empty response)`);
    return null;
  }
  const text = await res.text();
  if (text.trim() === "") {
    console.log(`\u2705 Supabase ${method} ${table} successful (empty text response)`);
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

// src/normalizeName.ts
function normalizeName(name) {
  return name.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").replace(/\s(jr|sr|iii|iv|v)$/i, "").trim();
}
function aggressiveNormalizeName(name) {
  return name.toLowerCase().replace(/[^\w]/g, "").replace(/\s(jr|sr|iii|iv|v)$/i, "").trim();
}
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
var init_normalizeName = __esm({
  "src/normalizeName.ts"() {
    "use strict";
    init_checked_fetch();
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    __name(normalizeName, "normalizeName");
    __name(aggressiveNormalizeName, "aggressiveNormalizeName");
    __name(generateNameVariations, "generateNameVariations");
  }
});

// src/playersLoader.ts
var playersLoader_exports = {};
__export(playersLoader_exports, {
  getCachedPlayerIdMap: () => getCachedPlayerIdMap,
  loadPlayerIdMap: () => loadPlayerIdMap,
  loadPlayerIdMapByLeague: () => loadPlayerIdMapByLeague,
  updateMissingPlayersSuccess: () => updateMissingPlayersSuccess
});
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
async function getCachedPlayerIdMap(env) {
  const now = Date.now();
  if (playerMapCache && now - cacheTimestamp < CACHE_TTL) {
    return playerMapCache;
  }
  playerMapCache = await loadPlayerIdMap(env);
  cacheTimestamp = now;
  return playerMapCache;
}
async function loadPlayerIdMapByLeague(env, league) {
  try {
    console.log(`\u{1F504} Loading ${league} players from Supabase...`);
    const players = await supabaseFetch(env, "players", {
      query: `?select=player_id,full_name,team,league,position&league=eq.${league}&limit=5000`
    });
    if (!players || !Array.isArray(players)) {
      console.error(`\u274C Failed to load ${league} players from Supabase`);
      return {};
    }
    const map = {};
    let loadedCount = 0;
    for (const player of players) {
      if (!player.full_name || !player.player_id)
        continue;
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
    console.log(`\u2705 Loaded ${loadedCount} ${league} players (${Object.keys(map).length} total mappings)`);
    return map;
  } catch (error) {
    console.error(`\u274C Error loading ${league} player ID map:`, error);
    return {};
  }
}
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
var playerMapCache, cacheTimestamp, CACHE_TTL;
var init_playersLoader = __esm({
  "src/playersLoader.ts"() {
    "use strict";
    init_checked_fetch();
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    init_supabaseFetch();
    init_normalizeName();
    __name(loadPlayerIdMap, "loadPlayerIdMap");
    playerMapCache = null;
    cacheTimestamp = 0;
    CACHE_TTL = 30 * 60 * 1e3;
    __name(getCachedPlayerIdMap, "getCachedPlayerIdMap");
    __name(loadPlayerIdMapByLeague, "loadPlayerIdMapByLeague");
    __name(updateMissingPlayersSuccess, "updateMissingPlayersSuccess");
  }
});

// src/helpers.ts
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size)
    out.push(arr.slice(i, i + size));
  return out;
}
var init_helpers = __esm({
  "src/helpers.ts"() {
    "use strict";
    init_checked_fetch();
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    __name(chunk, "chunk");
  }
});

// src/lib/enhancedInsertProps.ts
var enhancedInsertProps_exports = {};
__export(enhancedInsertProps_exports, {
  insertProps: () => insertPropsWithDebugging,
  insertPropsWithDebugging: () => insertPropsWithDebugging
});
async function insertPropsWithDebugging(env, mapped) {
  if (!mapped.length) {
    console.log("\u26A0\uFE0F No props to insert");
    return {
      success: true,
      proplinesInserted: 0,
      gameLogsInserted: 0,
      errors: 0,
      errorDetails: []
    };
  }
  console.log(`\u{1F504} Starting enhanced insertion of ${mapped.length} props...`);
  const result = {
    success: true,
    proplinesInserted: 0,
    gameLogsInserted: 0,
    errors: 0,
    errorDetails: []
  };
  console.log("\u{1F50D} Validating data structure...");
  const validationErrors = validatePropData(mapped);
  if (validationErrors.length > 0) {
    console.error("\u274C Data validation failed:", validationErrors);
    result.success = false;
    result.errors += validationErrors.length;
    result.errorDetails.push(...validationErrors.map((error) => ({
      table: "validation",
      batchIndex: -1,
      error: error.message,
      sampleData: error.sampleData
    })));
    return result;
  }
  console.log("\u{1F504} Inserting proplines...");
  const proplinesBatches = chunk(mapped, 250);
  for (let i = 0; i < proplinesBatches.length; i++) {
    const batch = proplinesBatches[i];
    try {
      console.log(`\u{1F504} Inserting proplines batch ${i + 1}/${proplinesBatches.length} (${batch.length} props)...`);
      if (i === 0 && batch.length > 0) {
        console.log("\u{1F4CA} Sample proplines data:", {
          player_id: batch[0].player_id,
          player_name: batch[0].player_name,
          prop_type: batch[0].prop_type,
          date: batch[0].date,
          league: batch[0].league,
          conflict_key: batch[0].conflict_key,
          over_odds: batch[0].over_odds,
          under_odds: batch[0].under_odds
        });
      }
      const response = await supabaseFetch(env, "proplines", {
        method: "POST",
        body: batch,
        headers: {
          Prefer: "resolution=merge-duplicates",
          "Content-Type": "application/json"
        }
      });
      if (response === null || response === void 0) {
        console.log(`\u2705 Inserted proplines batch ${i + 1} (${batch.length} props) - empty response = success`);
        result.proplinesInserted += batch.length;
      } else {
        console.log(`\u2705 Inserted proplines batch ${i + 1} (${batch.length} props) with response:`, response);
        result.proplinesInserted += batch.length;
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.error(`\u274C Proplines batch ${i + 1} insert failed:`, {
        batchIndex: i,
        batchSize: batch.length,
        error: errorMsg,
        sampleProp: batch[0] ? {
          player_id: batch[0].player_id,
          player_name: batch[0].player_name,
          prop_type: batch[0].prop_type,
          date: batch[0].date,
          league: batch[0].league,
          conflict_key: batch[0].conflict_key,
          over_odds: batch[0].over_odds,
          under_odds: batch[0].under_odds
        } : null,
        fullError: e
      });
      result.success = false;
      result.errors += batch.length;
      result.errorDetails.push({
        table: "proplines",
        batchIndex: i,
        error: errorMsg,
        sampleData: batch[0]
      });
    }
  }
  console.log("\u{1F504} Inserting player_game_logs...");
  const gamelogRows = mapped.map((row) => ({
    player_id: row.player_id,
    player_name: row.player_name,
    team: row.team,
    opponent: row.opponent,
    season: row.season,
    date: row.date,
    prop_type: row.prop_type,
    value: row.line,
    // Use line as the value for game logs
    sport: row.league?.toUpperCase() || "NFL",
    league: row.league,
    game_id: row.game_id
  }));
  const gameLogBatches = chunk(gamelogRows, 250);
  for (let i = 0; i < gameLogBatches.length; i++) {
    const batch = gameLogBatches[i];
    try {
      console.log(`\u{1F504} Inserting player_game_logs batch ${i + 1}/${gameLogBatches.length} (${batch.length} rows)...`);
      if (i === 0 && batch.length > 0) {
        console.log("\u{1F4CA} Sample game log data:", {
          player_id: batch[0].player_id,
          player_name: batch[0].player_name,
          prop_type: batch[0].prop_type,
          date: batch[0].date,
          league: batch[0].league,
          game_id: batch[0].game_id,
          value: batch[0].value,
          sport: batch[0].sport
        });
      }
      const response = await supabaseFetch(env, "player_game_logs", {
        method: "POST",
        body: batch,
        headers: {
          Prefer: "resolution=merge-duplicates",
          "Content-Type": "application/json"
        }
      });
      if (response === null || response === void 0) {
        console.log(`\u2705 Inserted player_game_logs batch ${i + 1} (${batch.length} rows) - empty response = success`);
        result.gameLogsInserted += batch.length;
      } else {
        console.log(`\u2705 Inserted player_game_logs batch ${i + 1} (${batch.length} rows) with response:`, response);
        result.gameLogsInserted += batch.length;
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.error(`\u274C Player_game_logs batch ${i + 1} insert failed:`, {
        batchIndex: i,
        batchSize: batch.length,
        error: errorMsg,
        sampleLog: batch[0] ? {
          player_id: batch[0].player_id,
          player_name: batch[0].player_name,
          prop_type: batch[0].prop_type,
          date: batch[0].date,
          league: batch[0].league,
          game_id: batch[0].game_id,
          value: batch[0].value,
          sport: batch[0].sport
        } : null,
        fullError: e
      });
      result.success = false;
      result.errors += batch.length;
      result.errorDetails.push({
        table: "player_game_logs",
        batchIndex: i,
        error: errorMsg,
        sampleData: batch[0]
      });
    }
  }
  console.log(`\u2705 Enhanced insertion complete:`, {
    totalProps: mapped.length,
    proplinesInserted: result.proplinesInserted,
    gameLogsInserted: result.gameLogsInserted,
    errors: result.errors,
    success: result.success
  });
  return result;
}
function validatePropData(mapped) {
  const errors = [];
  for (let i = 0; i < mapped.length; i++) {
    const prop = mapped[i];
    const requiredFields = ["player_id", "player_name", "team", "opponent", "prop_type", "line", "over_odds", "under_odds", "sportsbook", "league", "season", "date", "game_id", "conflict_key"];
    for (const field of requiredFields) {
      if (prop[field] === void 0 || prop[field] === null || prop[field] === "") {
        errors.push({
          message: `Missing required field '${field}' in prop at index ${i}`,
          sampleData: prop
        });
      }
    }
    if (typeof prop.line !== "number") {
      errors.push({
        message: `Invalid line type: expected number, got ${typeof prop.line} at index ${i}`,
        sampleData: prop
      });
    }
    if (typeof prop.over_odds !== "number") {
      errors.push({
        message: `Invalid over_odds type: expected number, got ${typeof prop.over_odds} at index ${i}`,
        sampleData: prop
      });
    }
    if (typeof prop.under_odds !== "number") {
      errors.push({
        message: `Invalid under_odds type: expected number, got ${typeof prop.under_odds} at index ${i}`,
        sampleData: prop
      });
    }
    if (typeof prop.season !== "number") {
      errors.push({
        message: `Invalid season type: expected number, got ${typeof prop.season} at index ${i}`,
        sampleData: prop
      });
    }
    if (prop.conflict_key && typeof prop.conflict_key !== "string") {
      errors.push({
        message: `Invalid conflict_key type: expected string, got ${typeof prop.conflict_key} at index ${i}`,
        sampleData: prop
      });
    }
  }
  return errors;
}
var init_enhancedInsertProps = __esm({
  "src/lib/enhancedInsertProps.ts"() {
    "use strict";
    init_checked_fetch();
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    init_supabaseFetch();
    init_helpers();
    __name(insertPropsWithDebugging, "insertPropsWithDebugging");
    __name(validatePropData, "validatePropData");
  }
});

// src/lib/streakCalculator.ts
var streakCalculator_exports = {};
__export(streakCalculator_exports, {
  calculateStreaks: () => calculateStreaks
});
function calculateStreaks(games) {
  const playerGroups = /* @__PURE__ */ new Map();
  games.forEach((game) => {
    const key = `${game.player_id}|${game.prop_type}|${game.league}`;
    if (!playerGroups.has(key)) {
      playerGroups.set(key, []);
    }
    playerGroups.get(key).push(game);
  });
  const streaks = [];
  playerGroups.forEach((playerGames, key) => {
    playerGames.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (playerGames.length === 0)
      return;
    const firstGame = playerGames[0];
    const currentResult = firstGame.hit_result;
    let currentStreak = 1;
    for (let i = 1; i < playerGames.length; i++) {
      if (playerGames[i].hit_result === currentResult) {
        currentStreak++;
      } else {
        break;
      }
    }
    const totalGames = playerGames.length;
    const totalHits = playerGames.filter((g) => g.hit_result === 1).length;
    const hitRate = totalHits / totalGames;
    let streakQuality;
    if (currentStreak >= 7) {
      streakQuality = currentResult === 1 ? "Extreme Hot" : "Extreme Cold";
    } else if (currentStreak >= 5) {
      streakQuality = currentResult === 1 ? "Very Hot" : "Very Cold";
    } else if (currentStreak >= 3) {
      streakQuality = currentResult === 1 ? "Hot" : "Cold";
    } else if (currentStreak >= 2) {
      streakQuality = "Building";
    } else {
      streakQuality = "Single Game";
    }
    let bettingSignal;
    if (currentStreak >= 5 && currentResult === 1 && hitRate > 0.6) {
      bettingSignal = "Fade Candidate";
    } else if (currentStreak >= 5 && currentResult === 0 && hitRate > 0.5) {
      bettingSignal = "Buy Low Candidate";
    } else if (currentStreak >= 3 && currentResult === 1 && hitRate > 0.7) {
      bettingSignal = "Ride the Wave";
    } else if (currentStreak >= 3 && currentResult === 0 && hitRate < 0.4) {
      bettingSignal = "Avoid";
    } else {
      bettingSignal = "Neutral";
    }
    streaks.push({
      player_id: firstGame.player_id,
      player_name: firstGame.player_name,
      team: firstGame.team,
      prop_type: firstGame.prop_type,
      league: firstGame.league,
      current_streak: currentStreak,
      streak_direction: currentResult === 1 ? "hit" : "miss",
      streak_quality: streakQuality,
      betting_signal: bettingSignal,
      total_games: totalGames,
      hit_rate: Math.round(hitRate * 100) / 100
    });
  });
  return streaks.sort((a, b) => b.current_streak - a.current_streak);
}
var init_streakCalculator = __esm({
  "src/lib/streakCalculator.ts"() {
    "use strict";
    init_checked_fetch();
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    __name(calculateStreaks, "calculateStreaks");
  }
});

// src/missingPlayers.ts
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
function normalizePlayerName(name) {
  return name.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").replace(/\s(jr|sr|iii|iv|v)$/i, "").trim();
}
var init_missingPlayers = __esm({
  "src/missingPlayers.ts"() {
    "use strict";
    init_checked_fetch();
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    __name(storeMissingPlayer, "storeMissingPlayer");
    __name(normalizePlayerName, "normalizePlayerName");
  }
});

// src/createPlayerPropsFromOdd.ts
var createPlayerPropsFromOdd_exports = {};
__export(createPlayerPropsFromOdd_exports, {
  createPlayerPropsFromOdd: () => createPlayerPropsFromOdd
});
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
  if (!rawPropType) {
    console.log(`Skipping odd ${oddId}: missing prop type`);
    return props;
  }
  const finalLine = line != null ? parseFloat(line) : 0;
  const normalizedPropType = MARKET_MAP2[rawPropType.toLowerCase()] || rawPropType;
  if (!MARKET_MAP2[rawPropType.toLowerCase()]) {
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
    line: finalLine,
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
var MARKET_MAP2;
var init_createPlayerPropsFromOdd = __esm({
  "src/createPlayerPropsFromOdd.ts"() {
    "use strict";
    init_checked_fetch();
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    init_missingPlayers();
    init_playersLoader();
    init_normalizeName();
    MARKET_MAP2 = {
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
    __name(getPlayerID, "getPlayerID");
    __name(createPlayerPropsFromOdd, "createPlayerPropsFromOdd");
    __name(mapBookmakerIdToName, "mapBookmakerIdToName");
  }
});

// .wrangler/tmp/bundle-Q4S6Wx/middleware-loader.entry.ts
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();

// .wrangler/tmp/bundle-Q4S6Wx/middleware-insertion-facade.js
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
init_playersLoader();
init_enhancedInsertProps();

// src/lib/diagnosticMapper.ts
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
var MARKET_MAP = {
  // Core markets
  "Passing Yards": "Passing Yards",
  "Rushing Yards": "Rushing Yards",
  "Receiving Yards": "Receiving Yards",
  "Completions": "Completions",
  "Receptions": "Receptions",
  "3PT Made": "3PT Made",
  "Points": "Points",
  "Assists": "Assists",
  "Rebounds": "Rebounds",
  // NFL specific - common abbreviations and variations
  "Pass Yards": "Passing Yards",
  "Passing Yards": "Passing Yards",
  "passing yards": "Passing Yards",
  "pass yards": "Passing Yards",
  "passing yds": "Passing Yards",
  "pass yds": "Passing Yards",
  "Pass Attempts": "Pass Attempts",
  "Passing Attempts": "Pass Attempts",
  "pass attempts": "Pass Attempts",
  "passing attempts": "Pass Attempts",
  "Pass Completions": "Completions",
  "Passing Completions": "Completions",
  "Completions": "Completions",
  "pass completions": "Completions",
  "passing completions": "Completions",
  "completions": "Completions",
  "Pass TDs": "Passing Touchdowns",
  "Passing TDs": "Passing Touchdowns",
  "passing touchdowns": "Passing Touchdowns",
  "pass tds": "Passing Touchdowns",
  "Interceptions": "Interceptions",
  "Pass Interceptions": "Interceptions",
  "interceptions": "Interceptions",
  "pass interceptions": "Interceptions",
  "pass int": "Interceptions",
  "Rush Yards": "Rushing Yards",
  "Rushing Yards": "Rushing Yards",
  "rushing yards": "Rushing Yards",
  "rush yards": "Rushing Yards",
  "rushing yds": "Rushing Yards",
  "rush yds": "Rushing Yards",
  "Rush Attempts": "Carries",
  "Rushing Attempts": "Carries",
  "Carries": "Carries",
  "rush attempts": "Carries",
  "rushing attempts": "Carries",
  "carries": "Carries",
  "Rush TDs": "Rushing Touchdowns",
  "Rushing TDs": "Rushing Touchdowns",
  "rushing touchdowns": "Rushing Touchdowns",
  "rush tds": "Rushing Touchdowns",
  "Longest Rush": "Longest Rush",
  "longest rush": "Longest Rush",
  "Rec Yards": "Receiving Yards",
  "Receiving Yards": "Receiving Yards",
  "receiving yards": "Receiving Yards",
  "rec yards": "Receiving Yards",
  "receiving yds": "Receiving Yards",
  "rec yds": "Receiving Yards",
  "Receptions": "Receptions",
  "receptions": "Receptions",
  "Longest Reception": "Longest Reception",
  "longest reception": "Longest Reception",
  "Rec TDs": "Receiving Touchdowns",
  "Receiving TDs": "Receiving Touchdowns",
  "receiving touchdowns": "Receiving Touchdowns",
  "rec tds": "Receiving Touchdowns",
  // NFL Over/Under patterns
  "passing yards over/under": "Passing Yards",
  "rushing yards over/under": "Rushing Yards",
  "receiving yards over/under": "Receiving Yards",
  "receptions over/under": "Receptions",
  "passing touchdowns over/under": "Passing Touchdowns",
  "rushing touchdowns over/under": "Rushing Touchdowns",
  "receiving touchdowns over/under": "Receiving Touchdowns",
  "interceptions over/under": "Interceptions",
  // NFL Yes/No patterns
  "to record first touchdown yes/no": "First Touchdown",
  "any touchdowns yes/no": "Anytime Touchdown",
  "anytime touchdown yes/no": "Anytime Touchdown",
  "first touchdown": "First Touchdown",
  "anytime touchdown": "Anytime Touchdown",
  "to record first touchdown": "First Touchdown",
  "to record anytime touchdown": "Anytime Touchdown",
  "to score": "Anytime Touchdown",
  // NBA specific
  "points": "Points",
  "assists": "Assists",
  "rebounds": "Rebounds",
  "threes made": "3PT Made",
  "3pt made": "3PT Made",
  "steals": "Steals",
  "blocks": "Blocks",
  "points over/under": "Points",
  "assists over/under": "Assists",
  "rebounds over/under": "Rebounds",
  "threes made over/under": "3PT Made",
  "steals over/under": "Steals",
  "blocks over/under": "Blocks",
  // MLB specific - expanded based on diagnostic analysis
  "Hits": "Hits",
  "hits": "Hits",
  "Runs": "Runs",
  "runs": "Runs",
  "RBIs": "RBIs",
  "rbis": "RBIs",
  "Total Bases": "Total Bases",
  "total bases": "Total Bases",
  "Strikeouts": "Strikeouts",
  "strikeouts": "Strikeouts",
  "Walks": "Walks",
  "walks": "Walks",
  "Singles": "Singles",
  "singles": "Singles",
  "Doubles": "Doubles",
  "doubles": "Doubles",
  "Triples": "Triples",
  "triples": "Triples",
  "Home Runs": "Home Runs",
  "home runs": "Home Runs",
  "Fantasy Score": "Fantasy Score",
  "fantasy score": "Fantasy Score",
  // Additional MLB markets from diagnostic analysis
  "Pitching Outs": "Pitching Outs",
  "pitching outs": "Pitching Outs",
  "Earned Runs": "Earned Runs",
  "earned runs": "Earned Runs",
  "Stolen Bases": "Stolen Bases",
  "stolen bases": "Stolen Bases",
  "Hits + Runs + RBIs": "Hits + Runs + RBIs",
  "hits + runs + rbis": "Hits + Runs + RBIs",
  // MLB Over/Under patterns
  "hits over/under": "Hits",
  "runs over/under": "Runs",
  "rbis over/under": "RBIs",
  "total bases over/under": "Total Bases",
  "strikeouts over/under": "Strikeouts",
  "walks over/under": "Walks",
  "singles over/under": "Singles",
  "doubles over/under": "Doubles",
  "triples over/under": "Triples",
  "home runs over/under": "Home Runs",
  "fantasy score over/under": "Fantasy Score",
  // NHL specific
  "shots on goal": "Shots on Goal",
  "goals": "Goals",
  "saves": "Saves",
  "shots on goal over/under": "Shots on Goal",
  "goals over/under": "Goals",
  "saves over/under": "Saves",
  // Common patterns that might appear in any league
  "over/under": "Over/Under",
  "yes/no": "Yes/No"
};
function normalizePlayerId(nameOrId) {
  if (!nameOrId)
    return null;
  return nameOrId.trim().replace(/\s+/g, "_").toUpperCase();
}
__name(normalizePlayerId, "normalizePlayerId");
function mapWithDiagnostics(odds) {
  const stats = {
    missingPlayerId: 0,
    unmappedMarket: 0,
    incompleteOdd: 0,
    success: 0,
    total: odds.length
  };
  const mapped = odds.map((odd, index) => {
    console.log(`\u{1F50D} Processing odd ${index + 1}/${odds.length}:`, {
      playerName: odd.playerName,
      marketName: odd.marketName,
      line: odd.line,
      odds: odd.odds,
      sportsbook: odd.sportsbook,
      league: odd.league
    });
    const playerId = normalizePlayerId(odd.playerName) || normalizePlayerId(odd.playerId);
    if (!playerId) {
      console.log(`\u274C Missing player ID for:`, odd.playerName);
      stats.missingPlayerId++;
      return null;
    }
    let propType = MARKET_MAP[odd.marketName];
    if (!propType) {
      propType = MARKET_MAP[odd.marketName?.toLowerCase()];
    }
    if (!propType) {
      const marketWords = odd.marketName?.toLowerCase().split(" ") || [];
      for (const word of marketWords) {
        if (MARKET_MAP[word]) {
          propType = MARKET_MAP[word];
          break;
        }
      }
    }
    if (!propType) {
      console.log(`\u274C Unmapped market:`, odd.marketName);
      stats.unmappedMarket++;
      return null;
    }
    if (!odd.eventStartUtc || !odd.sportsbook) {
      console.log(`\u274C Incomplete odd data:`, {
        eventStartUtc: odd.eventStartUtc,
        sportsbook: odd.sportsbook,
        line: odd.line
      });
      stats.incompleteOdd++;
      return null;
    }
    const date = odd.eventStartUtc.split("T")[0];
    const season = new Date(date).getFullYear();
    const mappedProp = {
      player_id: playerId,
      player_name: odd.playerName,
      team: odd.team || "UNK",
      opponent: odd.opponent || "UNK",
      date,
      prop_type: propType,
      sportsbook: odd.sportsbook,
      line: odd.line || 0,
      // Default to 0 for Yes/No bets
      over_odds: odd.overUnder === "over" || odd.overUnder === "yes" ? odd.odds : null,
      under_odds: odd.overUnder === "under" || odd.overUnder === "no" ? odd.odds : null,
      league: (odd.league || "UNKNOWN").toLowerCase(),
      season,
      game_id: odd.eventId || `${playerId}-${date}`,
      conflict_key: `${playerId}|${date}|${propType}|${odd.sportsbook}|${odd.league?.toLowerCase() || "UNK"}|${season}`
    };
    console.log(`\u2705 Successfully mapped prop:`, {
      player_id: mappedProp.player_id,
      prop_type: mappedProp.prop_type,
      line: mappedProp.line,
      league: mappedProp.league
    });
    stats.success++;
    return mappedProp;
  }).filter(Boolean);
  console.log("\u{1F50D} Mapping diagnostics summary:", stats);
  return { mapped, stats };
}
__name(mapWithDiagnostics, "mapWithDiagnostics");

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
    console.log(`\u{1F50D} Mapping ${extractedProps.length} extracted props using diagnostic mapper...`);
    const { mapped: mappedProps, stats: mappingStats } = mapWithDiagnostics(extractedProps);
    console.log(`\u{1F4CA} ${leagueID} ${season}: Mapping results:`, mappingStats);
    errors += mappingStats.missingPlayerId + mappingStats.unmappedMarket + mappingStats.incompleteOdd;
    console.log(`\u{1F4CA} ${leagueID} ${season}: Mapped ${mappedProps.length} props for insertion`);
    if (mappedProps.length > 0) {
      console.log(`\u{1F4CA} ${leagueID} ${season}: Inserting ${mappedProps.length} props using new insertProps function`);
      try {
        await insertPropsWithDebugging(env, mappedProps);
        propsInserted += mappedProps.length;
        console.log(`\u2705 ${leagueID} ${season}: Successfully inserted ${mappedProps.length} props`);
      } catch (error) {
        console.error(`\u274C ${leagueID} ${season}: Insert props failed:`, error);
        errors += mappedProps.length;
      }
    }
    gameLogsInserted = mappedProps.length;
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
init_enhancedInsertProps();
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
      console.log(`\u{1F50D} Mapping ${extractedProps.length} extracted props using diagnostic mapper...`);
      const { mapped: mappedProps, stats: mappingStats } = mapWithDiagnostics(extractedProps);
      console.log(`\u{1F4CA} ${leagueID}: Mapping results:`, mappingStats);
      totalErrors += mappingStats.missingPlayerId + mappingStats.unmappedMarket + mappingStats.incompleteOdd;
      console.log(`\u{1F4CA} ${leagueID}: Mapped ${mappedProps.length} props for insertion`);
      totalProps += mappedProps.length;
      let leagueInserted = 0;
      let leagueErrors = 0;
      if (mappedProps.length > 0) {
        try {
          await insertPropsWithDebugging(env, mappedProps);
          leagueInserted += mappedProps.length;
          console.log(`\u2705 ${leagueID}: Successfully inserted ${mappedProps.length} props using insertProps function`);
        } catch (error) {
          console.error(`\u274C ${leagueID}: Insert props failed:`, error);
          leagueErrors += mappedProps.length;
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
            analytics: ["/refresh-analytics", "/incremental-analytics-refresh", "/analytics/streaks", "/analytics/defensive-rankings"],
            verification: ["/verify-backfill", "/verify-analytics"],
            status: ["/status", "/leagues", "/seasons"],
            debug: ["/debug-api", "/debug-comprehensive", "/debug-json", "/debug-extraction", "/debug-insert", "/debug-schema", "/debug-streaks", "/debug-streak-counts", "/debug-insertion", "/debug-env", "/debug-rls"]
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
      if (url.pathname === "/refresh-analytics") {
        try {
          const { supabaseFetch: supabaseFetch2 } = await Promise.resolve().then(() => (init_supabaseFetch(), supabaseFetch_exports));
          console.log("\u{1F504} Refreshing analytics views...");
          const result = await supabaseFetch2(env, "rpc/refresh_analytics_views", {
            method: "POST",
            body: {}
          });
          return new Response(JSON.stringify({
            success: true,
            message: "Analytics views refreshed successfully",
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
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
      if (url.pathname === "/incremental-analytics-refresh") {
        try {
          const { supabaseFetch: supabaseFetch2 } = await Promise.resolve().then(() => (init_supabaseFetch(), supabaseFetch_exports));
          const daysBack = parseInt(url.searchParams.get("days") || "2");
          console.log(`\u{1F504} Running incremental analytics refresh for last ${daysBack} days...`);
          const result = await supabaseFetch2(env, "rpc/incremental_analytics_refresh", {
            method: "POST",
            body: { days_back: daysBack }
          });
          return new Response(JSON.stringify({
            success: true,
            message: `Incremental analytics refresh completed for last ${daysBack} days`,
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            daysBack
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
      if (url.pathname === "/analytics/streaks") {
        try {
          const { supabaseFetch: supabaseFetch2 } = await Promise.resolve().then(() => (init_supabaseFetch(), supabaseFetch_exports));
          const { calculateStreaks: calculateStreaks2 } = await Promise.resolve().then(() => (init_streakCalculator(), streakCalculator_exports));
          const league = url.searchParams.get("league") || "all";
          const limit = parseInt(url.searchParams.get("limit") || "50");
          console.log(`\u{1F4CA} Computing TRUE streaks in Worker for ${league}...`);
          let query = "player_game_logs";
          const params = [];
          if (league !== "all") {
            params.push(`league=eq.${league}`);
          }
          params.push(`order=date.desc`);
          if (params.length > 0) {
            query += `?${params.join("&")}`;
          }
          const gameLogs = await supabaseFetch2(env, query, {
            method: "GET"
          });
          console.log(`\u{1F4CA} Fetched ${gameLogs?.length || 0} game logs`);
          if (gameLogs && gameLogs.length > 0) {
            console.log(`\u{1F4CA} Sample game log:`, JSON.stringify(gameLogs[0], null, 2));
          }
          if (!gameLogs || gameLogs.length === 0) {
            return new Response(JSON.stringify({
              success: true,
              data: [],
              league,
              limit,
              message: "No game data found",
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            }), {
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
          }
          const playerIds = [...new Set(gameLogs.map((g) => g.player_id))];
          const propTypes = [...new Set(gameLogs.map((g) => g.prop_type))];
          const dates = [...new Set(gameLogs.map((g) => g.date))];
          const propsQuery = `proplines?player_id=in.(${playerIds.join(",")})&prop_type=in.(${propTypes.join(",")})&date=in.(${dates.join(",")})`;
          const propLines = await supabaseFetch2(env, propsQuery, {
            method: "GET"
          });
          console.log(`\u{1F4CA} Fetched ${propLines?.length || 0} prop lines`);
          if (propLines && propLines.length > 0) {
            console.log(`\u{1F4CA} Sample prop line:`, JSON.stringify(propLines[0], null, 2));
          }
          const gameResults = gameLogs.map((gameLog) => {
            const propLine = propLines?.find(
              (prop) => prop.player_id === gameLog.player_id && prop.prop_type === gameLog.prop_type && prop.date === gameLog.date && prop.league === gameLog.league
            );
            if (!propLine)
              return null;
            return {
              player_id: gameLog.player_id,
              player_name: gameLog.player_name,
              team: gameLog.team,
              prop_type: gameLog.prop_type,
              league: gameLog.league,
              date: gameLog.date,
              hit_result: gameLog.value >= propLine.line ? 1 : 0
            };
          }).filter(Boolean);
          console.log(`\u{1F4CA} Created ${gameResults.length} game results`);
          const streaks = calculateStreaks2(gameResults);
          const filteredStreaks = league !== "all" ? streaks.filter((s) => s.league === league) : streaks;
          const limitedStreaks = filteredStreaks.slice(0, limit);
          console.log(`\u{1F4CA} Computed ${limitedStreaks.length} streaks (${filteredStreaks.length} total)`);
          return new Response(JSON.stringify({
            success: true,
            data: limitedStreaks,
            league,
            limit,
            total_found: filteredStreaks.length,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
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
      if (url.pathname === "/debug-streaks") {
        try {
          const { supabaseFetch: supabaseFetch2 } = await Promise.resolve().then(() => (init_supabaseFetch(), supabaseFetch_exports));
          const league = url.searchParams.get("league") || "all";
          const limit = parseInt(url.searchParams.get("limit") || "20");
          console.log(`\u{1F50D} Fetching debug streak analysis for ${league}...`);
          let query = "debug_streak_summary";
          const params = [];
          if (league !== "all") {
            params.push(`league=eq.${league}`);
          }
          params.push(`order=current_streak.desc`);
          params.push(`limit=${limit}`);
          if (params.length > 0) {
            query += `?${params.join("&")}`;
          }
          const result = await supabaseFetch2(env, query, {
            method: "GET"
          });
          return new Response(JSON.stringify({
            success: true,
            data: result,
            league,
            limit,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        } catch (error) {
          console.error("\u274C Debug streaks error:", error);
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }
      }
      if (url.pathname === "/debug-query") {
        try {
          const { supabaseFetch: supabaseFetch2 } = await Promise.resolve().then(() => (init_supabaseFetch(), supabaseFetch_exports));
          const table = url.searchParams.get("table") || "player_game_logs";
          const limit = parseInt(url.searchParams.get("limit") || "5");
          console.log(`\u{1F50D} Direct query to ${table} table...`);
          const result = await supabaseFetch2(env, `${table}?limit=${limit}`, {
            method: "GET"
          });
          console.log(`\u{1F4CA} Query result:`, JSON.stringify(result, null, 2));
          return new Response(JSON.stringify({
            success: true,
            table,
            limit,
            count: result?.length || 0,
            data: result,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        } catch (error) {
          console.error("\u274C Direct query error:", error);
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }
      }
      if (url.pathname === "/debug-streak-counts") {
        try {
          const { supabaseFetch: supabaseFetch2 } = await Promise.resolve().then(() => (init_supabaseFetch(), supabaseFetch_exports));
          const league = url.searchParams.get("league") || "all";
          console.log(`\u{1F50D} Fetching debug streak counts for ${league}...`);
          let query = "debug_streak_counts";
          const params = [];
          if (league !== "all") {
            params.push(`league=eq.${league}`);
          }
          params.push(`order=current_streak.desc`);
          if (params.length > 0) {
            query += `?${params.join("&")}`;
          }
          const result = await supabaseFetch2(env, query, {
            method: "GET"
          });
          return new Response(JSON.stringify({
            success: true,
            data: result,
            league,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        } catch (error) {
          console.error("\u274C Debug streak counts error:", error);
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }
      }
      if (url.pathname === "/analytics/defensive-rankings") {
        try {
          const { supabaseFetch: supabaseFetch2 } = await Promise.resolve().then(() => (init_supabaseFetch(), supabaseFetch_exports));
          const league = url.searchParams.get("league") || "all";
          const propType = url.searchParams.get("prop_type") || "all";
          console.log(`\u{1F4CA} Fetching defensive rankings for ${league} - ${propType}...`);
          let query = "defensive_matchup_rankings";
          const filters = [];
          if (league !== "all") {
            filters.push(`league=eq.${league}`);
          }
          if (propType !== "all") {
            filters.push(`prop_type=eq.${propType}`);
          }
          if (filters.length > 0) {
            query += "?" + filters.join("&");
          }
          query += "&order=defensive_percentile.desc";
          const result = await supabaseFetch2(env, query, {
            method: "GET"
          });
          return new Response(JSON.stringify({
            success: true,
            data: result,
            league,
            propType,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
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
      if (url.pathname === "/debug-market-analysis") {
        try {
          const { fetchEventsWithProps: fetchEventsWithProps2 } = await Promise.resolve().then(() => (init_api(), api_exports));
          const { extractPlayerProps: extractPlayerProps2 } = await Promise.resolve().then(() => (init_extract(), extract_exports));
          console.log("\u{1F50D} Analyzing market patterns...");
          const leagues = ["NFL", "MLB"];
          const analysis = {};
          for (const league of leagues) {
            const events = await fetchEventsWithProps2(env, league, { limit: 2 });
            if (events.length > 0) {
              const extracted = extractPlayerProps2(events);
              console.log(`\u{1F4CA} ${league}: Extracted ${extracted.length} props`);
              const marketCounts = {};
              const unmappedMarkets = /* @__PURE__ */ new Set();
              for (const prop of extracted) {
                const market = prop.marketName;
                marketCounts[market] = (marketCounts[market] || 0) + 1;
                const MARKET_MAP3 = {
                  "Passing Yards": "Passing Yards",
                  "Rushing Yards": "Rushing Yards",
                  "Receiving Yards": "Receiving Yards",
                  "Completions": "Completions",
                  "Receptions": "Receptions",
                  "3PT Made": "3PT Made",
                  "Points": "Points",
                  "Assists": "Assists",
                  "Rebounds": "Rebounds",
                  "passing yards": "Passing Yards",
                  "pass yards": "Passing Yards",
                  "passing yds": "Passing Yards",
                  "pass yds": "Passing Yards",
                  "rushing yards": "Rushing Yards",
                  "rush yards": "Rushing Yards",
                  "rushing yds": "Rushing Yards",
                  "rush yds": "Rushing Yards",
                  "receiving yards": "Receiving Yards",
                  "rec yards": "Receiving Yards",
                  "receiving yds": "Receiving Yards",
                  "rec yds": "Receiving Yards",
                  "receptions": "Receptions",
                  "passing touchdowns": "Passing Touchdowns",
                  "pass tds": "Passing Touchdowns",
                  "rushing touchdowns": "Rushing Touchdowns",
                  "rush tds": "Rushing Touchdowns",
                  "receiving touchdowns": "Receiving Touchdowns",
                  "rec tds": "Receiving Touchdowns",
                  "points": "Points",
                  "assists": "Assists",
                  "rebounds": "Rebounds",
                  "threes made": "3PT Made",
                  "3pt made": "3PT Made",
                  "steals": "Steals",
                  "blocks": "Blocks",
                  "hits": "Hits",
                  "runs": "Runs",
                  "rbis": "RBIs",
                  "total bases": "Total Bases",
                  "strikeouts": "Strikeouts",
                  "shots on goal": "Shots on Goal",
                  "goals": "Goals",
                  "saves": "Saves",
                  "first touchdown": "First Touchdown",
                  "anytime touchdown": "Anytime Touchdown",
                  "to record first touchdown": "First Touchdown",
                  "to record anytime touchdown": "Anytime Touchdown",
                  "to score": "Anytime Touchdown"
                };
                let propType = MARKET_MAP3[market];
                if (!propType) {
                  propType = MARKET_MAP3[market?.toLowerCase()];
                }
                if (!propType) {
                  const marketWords = market?.toLowerCase().split(" ") || [];
                  for (const word of marketWords) {
                    if (MARKET_MAP3[word]) {
                      propType = MARKET_MAP3[word];
                      break;
                    }
                  }
                }
                if (!propType) {
                  unmappedMarkets.add(market);
                }
              }
              analysis[league] = {
                totalProps: extracted.length,
                marketCounts: Object.entries(marketCounts).sort(([, a], [, b]) => b - a).slice(0, 20),
                // Top 20 markets
                unmappedMarkets: Array.from(unmappedMarkets).slice(0, 20),
                // Top 20 unmapped
                sampleProps: extracted.slice(0, 5)
                // Sample props for analysis
              };
            }
          }
          return new Response(JSON.stringify({
            success: true,
            analysis,
            recommendations: {
              nfl: "Focus on 'Over/Under' patterns and 'To Record' markets",
              mlb: "Focus on 'Hits', 'Runs', 'RBIs' patterns"
            }
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
      if (url.pathname === "/debug-mapping") {
        try {
          const { fetchEventsWithProps: fetchEventsWithProps2 } = await Promise.resolve().then(() => (init_api(), api_exports));
          const { extractPlayerProps: extractPlayerProps2 } = await Promise.resolve().then(() => (init_extract(), extract_exports));
          const { createPlayerPropsFromOdd: createPlayerPropsFromOdd2 } = await Promise.resolve().then(() => (init_createPlayerPropsFromOdd(), createPlayerPropsFromOdd_exports));
          console.log("\u{1F50D} Testing mapping function...");
          const events = await fetchEventsWithProps2(env, "NFL", { limit: 1 });
          if (events.length > 0) {
            const extracted = extractPlayerProps2(events);
            if (extracted.length > 0) {
              const prop = extracted[0];
              console.log("\u{1F50D} Testing with prop:", prop);
              const mockOdd = {
                player: {
                  name: prop.playerName,
                  team: "PHI"
                },
                player_name: prop.playerName,
                playerID: prop.playerId,
                market_key: prop.marketName,
                point: prop.line,
                over_price: prop.overUnder === "over" ? prop.odds : null,
                under_price: prop.overUnder === "under" ? prop.odds : null,
                overOdds: prop.overUnder === "over" || prop.overUnder === "yes" ? prop.odds : null,
                underOdds: prop.overUnder === "under" || prop.overUnder === "no" ? prop.odds : null,
                bookmaker_name: prop.sportsbook,
                id: prop.oddId
              };
              const mockEvent = {
                eventID: prop.eventId,
                date: prop.eventStartUtc,
                homeTeam: "HOME",
                awayTeam: "AWAY",
                teams: ["HOME", "AWAY"]
              };
              console.log("\u{1F50D} Calling createPlayerPropsFromOdd...");
              const { getCachedPlayerIdMap: getCachedPlayerIdMap2 } = await Promise.resolve().then(() => (init_playersLoader(), playersLoader_exports));
              const playerIdMap = await getCachedPlayerIdMap2(env);
              console.log("\u{1F50D} Player ID map loaded:", Object.keys(playerIdMap).length, "players");
              const testPlayerId = playerIdMap[`Jalen Hurts-PHI`] || playerIdMap[`jalen hurts-PHI`] || "NOT_FOUND";
              console.log("\u{1F50D} Test player ID for Jalen Hurts-PHI:", testPlayerId);
              const mappedProps = await createPlayerPropsFromOdd2(
                mockOdd,
                prop.oddId,
                mockEvent,
                "nfl",
                "2024",
                void 0,
                env
              );
              console.log("\u{1F50D} Mapping result:", mappedProps);
              return new Response(JSON.stringify({
                success: true,
                extractedProp: prop,
                mockOdd,
                mockEvent,
                mappedProps,
                mappedCount: mappedProps.length
              }), {
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
              });
            }
          }
          return new Response(JSON.stringify({
            success: false,
            error: "No props found for testing"
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : void 0
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
      if (url.pathname === "/debug-insertion") {
        try {
          const { insertPropsWithDebugging: insertPropsWithDebugging2 } = await Promise.resolve().then(() => (init_enhancedInsertProps(), enhancedInsertProps_exports));
          console.log("\u{1F50D} Testing enhanced insertion with comprehensive debugging...");
          const timestamp = Date.now();
          const testProps = [
            {
              player_id: `TEST_PLAYER_${timestamp}`,
              player_name: `Test Player ${timestamp}`,
              team: "TEST",
              opponent: "TEST2",
              prop_type: "Passing Yards",
              line: 275.5,
              over_odds: -110,
              under_odds: -110,
              sportsbook: "TestBook",
              league: "nfl",
              season: 2025,
              date: "2025-01-08",
              game_id: `TEST-GAME-${timestamp}`,
              conflict_key: `TEST_CONFLICT_${timestamp}`
            }
          ];
          console.log("\u{1F50D} Test props:", JSON.stringify(testProps, null, 2));
          const result = await insertPropsWithDebugging2(env, testProps);
          return new Response(JSON.stringify({
            success: true,
            message: "Enhanced insertion test completed",
            result,
            testData: testProps,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : void 0
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }
      }
      if (url.pathname === "/debug-env") {
        try {
          console.log("\u{1F50D} Checking environment variables...");
          const envCheck = {
            SUPABASE_URL: env.SUPABASE_URL ? "\u2705 Set" : "\u274C Missing",
            SUPABASE_SERVICE_KEY: env.SUPABASE_SERVICE_KEY ? "\u2705 Set" : "\u274C Missing",
            SPORTSGAMEODDS_API_KEY: env.SPORTSGAMEODDS_API_KEY ? "\u2705 Set" : "\u274C Missing",
            SUPABASE_URL_LENGTH: env.SUPABASE_URL ? env.SUPABASE_URL.length : 0,
            SUPABASE_SERVICE_KEY_LENGTH: env.SUPABASE_SERVICE_KEY ? env.SUPABASE_SERVICE_KEY.length : 0,
            SPORTSGAMEODDS_API_KEY_LENGTH: env.SPORTSGAMEODDS_API_KEY ? env.SPORTSGAMEODDS_API_KEY.length : 0,
            SUPABASE_URL_PREFIX: env.SUPABASE_URL ? env.SUPABASE_URL.substring(0, 20) + "..." : "N/A",
            SUPABASE_SERVICE_KEY_PREFIX: env.SUPABASE_SERVICE_KEY ? env.SUPABASE_SERVICE_KEY.substring(0, 20) + "..." : "N/A",
            // Check if service key has the right role
            SERVICE_KEY_ROLE: env.SUPABASE_SERVICE_KEY ? env.SUPABASE_SERVICE_KEY.includes("service_role") ? "\u2705 service_role" : "\u26A0\uFE0F May not be service role" : "\u274C No key"
          };
          return new Response(JSON.stringify({
            success: true,
            message: "Environment variables check completed",
            envCheck,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
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
      if (url.pathname === "/debug-rls") {
        try {
          const { supabaseFetch: supabaseFetch2 } = await Promise.resolve().then(() => (init_supabaseFetch(), supabaseFetch_exports));
          console.log("\u{1F50D} Testing RLS permissions...");
          let proplinesReadTest = "Not tested";
          try {
            const proplinesData = await supabaseFetch2(env, "proplines?limit=1", {
              method: "GET"
            });
            proplinesReadTest = "\u2705 Success";
          } catch (error) {
            proplinesReadTest = `\u274C Failed: ${error instanceof Error ? error.message : String(error)}`;
          }
          let gameLogsReadTest = "Not tested";
          try {
            const gameLogsData = await supabaseFetch2(env, "player_game_logs?limit=1", {
              method: "GET"
            });
            gameLogsReadTest = "\u2705 Success";
          } catch (error) {
            gameLogsReadTest = `\u274C Failed: ${error instanceof Error ? error.message : String(error)}`;
          }
          let insertTest = "Not tested";
          const timestamp = Date.now();
          const testProp = {
            player_id: `RLS_TEST_${timestamp}`,
            player_name: `RLS Test Player`,
            team: "TEST",
            opponent: "TEST2",
            prop_type: "RLS Test",
            line: 100,
            over_odds: -110,
            under_odds: -110,
            sportsbook: "RLSTest",
            league: "nfl",
            season: 2025,
            date: "2025-01-08",
            game_id: `RLS-TEST-${timestamp}`,
            conflict_key: `RLS_TEST_${timestamp}`
          };
          try {
            const insertResult = await supabaseFetch2(env, "proplines", {
              method: "POST",
              body: [testProp],
              headers: { Prefer: "resolution=merge-duplicates" }
            });
            insertTest = "\u2705 Success";
            try {
              await supabaseFetch2(env, `proplines?player_id=eq.RLS_TEST_${timestamp}`, {
                method: "DELETE"
              });
              console.log("\u{1F9F9} Cleaned up test data");
            } catch (cleanupError) {
              console.log("\u26A0\uFE0F Failed to clean up test data:", cleanupError);
            }
          } catch (error) {
            insertTest = `\u274C Failed: ${error instanceof Error ? error.message : String(error)}`;
          }
          return new Response(JSON.stringify({
            success: true,
            message: "RLS permissions test completed",
            tests: {
              proplinesRead: proplinesReadTest,
              gameLogsRead: gameLogsReadTest,
              insertTest
            },
            testData: testProp,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
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
      return new Response(JSON.stringify({
        error: "Endpoint not found",
        availableEndpoints: ["/backfill-all", "/backfill-recent", "/backfill-full", "/backfill-league/{league}", "/backfill-season/{season}", "/backfill-progressive", "/ingest", "/ingest/{league}", "/refresh-analytics", "/incremental-analytics-refresh", "/analytics/streaks", "/analytics/defensive-rankings", "/debug-streaks", "/debug-streak-counts", "/status", "/leagues", "/seasons"]
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

// .wrangler/tmp/bundle-Q4S6Wx/middleware-insertion-facade.js
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

// .wrangler/tmp/bundle-Q4S6Wx/middleware-loader.entry.ts
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
