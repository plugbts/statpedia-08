var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-QktIh6/checked-fetch.js
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

// .wrangler/tmp/bundle-QktIh6/strip-cf-connecting-ip-header.js
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
__name(storeMissingPlayer, "storeMissingPlayer");
function normalizePlayerName(name) {
  return name.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").replace(/\s(jr|sr|iii|iv|v)$/i, "").trim();
}
__name(normalizePlayerName, "normalizePlayerName");

// src/normalizeName.ts
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
    prop_type: normalizedPropType,
    line: parseFloat(line),
    over_odds: overOdds ? parseInt(overOdds) : null,
    under_odds: underOdds ? parseInt(underOdds) : null,
    sportsbook,
    sportsbook_key: odd.bookmaker?.id || "consensus",
    game_id: gameId,
    game_time: gameTime.toISOString(),
    home_team: homeTeam || "",
    away_team: awayTeam || "",
    league: league.toLowerCase(),
    season,
    week: week || null,
    conflict_key: `${playerID}-${normalizedPropType}-${line}-${sportsbook}-${gameDate}`,
    last_updated: (/* @__PURE__ */ new Date()).toISOString(),
    is_available: true
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
  try {
    allEvents = await fetchEventsWithParams(env, sportID, season, week);
    console.log(`Primary query successful: ${allEvents.length} events`);
    return allEvents;
  } catch (error) {
    console.error("Primary query failed:", error);
  }
  if (season === "2025" && allEvents.length === 0) {
    console.log("Trying fallback: season 2024");
    try {
      const fallbackEvents = await fetchEventsWithParams(env, sportID, "2024", week);
      if (fallbackEvents.length > 0) {
        console.log(`Fallback successful: found ${fallbackEvents.length} events for season 2024`);
        return fallbackEvents;
      }
    } catch (error) {
      console.error("Season 2024 fallback failed:", error);
    }
  }
  if (week && allEvents.length === 0) {
    console.log("Trying fallback: without week filter");
    try {
      const fallbackEvents = await fetchEventsWithParams(env, sportID, season);
      if (fallbackEvents.length > 0) {
        console.log(`Fallback successful: found ${fallbackEvents.length} events without week filter`);
        return fallbackEvents;
      }
    } catch (error) {
      console.error("No week filter fallback failed:", error);
    }
  }
  if (allEvents.length === 0) {
    console.log("Trying fallback: relaxed filters");
    try {
      const fallbackEvents = await fetchEventsWithParams(env, sportID, season, week, true);
      if (fallbackEvents.length > 0) {
        console.log(`Fallback successful: found ${fallbackEvents.length} events with relaxed filters`);
        return fallbackEvents;
      }
    } catch (error) {
      console.error("Relaxed filters fallback failed:", error);
    }
  }
  console.log(`All fallback attempts exhausted. Total events: ${allEvents.length}`);
  return allEvents;
}
__name(fetchEvents, "fetchEvents");
async function fetchEventsWithParams(env, sportID, season, week, relaxed = false) {
  let allEvents = [];
  let nextCursor = null;
  let pageCount = 0;
  const maxPages = 2;
  do {
    try {
      let endpoint = `/v2/events?sportID=${sportID}&season=${season}&limit=10`;
      if (!relaxed) {
        endpoint += `&oddsAvailable=true&markets=playerProps`;
      }
      if (week) {
        endpoint += `&week=${week}`;
      }
      if (nextCursor) {
        endpoint += `&cursor=${nextCursor}`;
      }
      console.log(`Fetching events from: ${endpoint}${relaxed ? " (relaxed filters)" : ""}`);
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
__name(fetchEventsWithParams, "fetchEventsWithParams");
async function extractPlayerPropsFromEvent(event, league, season, week, env) {
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
        const playerProps = await createPlayerPropsFromOdd(odd, oddId, event, league, season, week, env);
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
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}
__name(chunk, "chunk");
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
        console.error(`\u274C Error upserting batch, retrying:`, error);
        try {
          await supabaseFetch(env, "proplines", {
            method: "POST",
            body: batch
          });
          inserted += batch.length;
          console.log(`\u2705 Successfully upserted batch of ${batch.length} proplines records on retry`);
        } catch (retryError) {
          console.error(`\u274C Failed to upsert batch after retry:`, retryError);
          errors += batch.length;
        }
      }
    }
    console.log(`\u{1F4CA} Inserted ${inserted} props, dropped ${props.length - inserted - errors}, errors: ${errors}`);
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
async function scheduledHandler(env, event) {
  console.log(`\u{1F550} Scheduled ingestion triggered at ${(/* @__PURE__ */ new Date()).toISOString()}`);
  try {
    const leagues = ["NFL", "NBA", "MLB", "NHL"];
    const season = (/* @__PURE__ */ new Date()).getFullYear().toString();
    let totalInserted = 0;
    let totalErrors = 0;
    for (const league of leagues) {
      console.log(`\u{1F3C8} Starting scheduled ingestion for ${league}`);
      try {
        const sportID = league === "NFL" || league === "NCAAF" ? "FOOTBALL" : league === "NBA" || league === "NCAAB" ? "BASKETBALL" : league === "MLB" ? "BASEBALL" : league === "NHL" ? "HOCKEY" : "FOOTBALL";
        const events = await fetchEvents(env, sportID, season);
        console.log(`Fetched ${events.length} events for ${league}`);
        if (events.length === 0) {
          console.log(`No events found for ${league}, skipping`);
          continue;
        }
        let leagueInserted = 0;
        let leagueErrors = 0;
        for (const event2 of events) {
          try {
            const props = await extractPlayerPropsFromEvent(event2, league, season, void 0, env);
            if (props.length > 0) {
              const upsertResult = await upsertProps(env, props);
              leagueInserted += upsertResult.inserted;
              leagueErrors += upsertResult.errors;
            }
          } catch (error) {
            console.error(`Error processing event ${event2.eventID}:`, error);
            leagueErrors++;
          }
        }
        totalInserted += leagueInserted;
        totalErrors += leagueErrors;
        console.log(`\u2705 ${league}: ${leagueInserted} inserted, ${leagueErrors} errors`);
      } catch (error) {
        console.error(`\u274C Error processing ${league}:`, error);
        totalErrors++;
      }
    }
    console.log(`\u{1F3AF} Scheduled ingestion complete: ${totalInserted} total inserted, ${totalErrors} total errors`);
  } catch (error) {
    console.error("\u274C Scheduled ingestion failed:", error);
  }
}
__name(scheduledHandler, "scheduledHandler");
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
          let totalProps = 0;
          let totalInserted = 0;
          let totalUpdated = 0;
          let totalErrors = 0;
          if (events.length > 0) {
            console.log(`Processing ${events.length} events`);
            for (const event of events) {
              try {
                console.log(`Processing event ${event.eventID} with ${Object.keys(event.odds || {}).length} odds`);
                const props = await extractPlayerPropsFromEvent(event, league, season, week, env);
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
  },
  // Scheduled handler for cron jobs
  async scheduled(event, env, ctx) {
    ctx.waitUntil(scheduledHandler(env, event));
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

// .wrangler/tmp/bundle-QktIh6/middleware-insertion-facade.js
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

// .wrangler/tmp/bundle-QktIh6/middleware-loader.entry.ts
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
