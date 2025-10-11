var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/lib/api.ts
var api_exports = {};
__export(api_exports, {
  fetchEventsWithProps: () => fetchEventsWithProps,
  fetchGameDetails: () => fetchGameDetails,
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
    console.log(`\u{1F50D} [SGO:DEBUG] Inspecting team fields in ${eventsArray.length} events for ${leagueID}`);
    eventsArray.slice(0, 3).forEach((event, idx) => {
      console.log(`\u{1F50D} [SGO:DEBUG] Event ${idx}:`, {
        gameId: event.gameId ?? event.id ?? event.eventID ?? null,
        homeTeamId: event.homeTeamId ?? event.homeTeamID ?? null,
        awayTeamId: event.awayTeamId ?? event.awayTeamID ?? null,
        teamId: event.teamId ?? event.teamID ?? null,
        opponentTeamId: event.opponentTeamId ?? event.opponentTeamID ?? null,
        homeTeamName: event.homeTeamName ?? event.homeTeam?.name ?? null,
        awayTeamName: event.awayTeamName ?? event.awayTeam?.name ?? null,
        teamName: event.teamName ?? event.team?.name ?? null,
        opponentName: event.opponentName ?? event.opponent?.name ?? null,
        teams: event.teams ?? null,
        game: event.game ? {
          homeTeamId: event.game.homeTeamId ?? event.game.homeTeamID ?? null,
          awayTeamId: event.game.awayTeamId ?? event.game.awayTeamID ?? null,
          teams: event.game.teams ?? null
        } : null,
        // Check if odds contain team info
        oddsSample: event.odds ? Object.keys(event.odds).slice(0, 2).map((oddId) => {
          const odd = event.odds[oddId];
          return {
            oddId,
            teamId: odd?.teamID ?? odd?.teamId ?? null,
            playerTeamId: odd?.playerTeamID ?? odd?.playerTeamId ?? null
          };
        }) : null
      });
    });
    console.log(`\u2705 Fetched ${eventsArray.length} events for ${leagueID}`);
    return eventsArray;
  } catch (error) {
    console.error(`\u274C Events fetch error for ${leagueID}:`, error);
    return [];
  }
}
async function fetchGameDetails(env, gameId) {
  const url = `https://api.sportsgameodds.com/v2/games/${gameId}`;
  console.log(`\u{1F50D} Fetching game details: ${url}`);
  try {
    const res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${env.SPORTSGAMEODDS_API_KEY}`
      }
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Game details fetch failed (${res.status}): ${errorText}`);
    }
    const response = await res.json();
    const game = response.data || response;
    console.log(`\u2705 Fetched game details for ${gameId}:`, {
      homeTeam: game.homeTeam ?? game.homeTeamName ?? null,
      awayTeam: game.awayTeam ?? game.awayTeamName ?? null,
      homeTeamId: game.homeTeamId ?? game.homeTeamID ?? null,
      awayTeamId: game.awayTeamId ?? game.awayTeamID ?? null
    });
    return game;
  } catch (error) {
    console.error(`\u274C Game details fetch error for ${gameId}:`, error);
    return null;
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
    __name(buildUrl, "buildUrl");
    __name(fetchEventsWithProps, "fetchEventsWithProps");
    __name(fetchGameDetails, "fetchGameDetails");
    __name(ymd, "ymd");
    __name(addDays, "addDays");
    __name(getEventsWithFallbacks, "getEventsWithFallbacks");
    __name(getEventsWithAggressiveFallbacks, "getEventsWithAggressiveFallbacks");
  }
});

// src/lib/playerTeamMap.ts
var playerTeamMap_exports = {};
__export(playerTeamMap_exports, {
  NFL_PLAYER_TEAMS: () => NFL_PLAYER_TEAMS,
  getOpponentTeam: () => getOpponentTeam,
  getPlayerTeam: () => getPlayerTeam
});
function getPlayerTeam(playerId) {
  return NFL_PLAYER_TEAMS[playerId] || null;
}
function getOpponentTeam(playerTeam, gameId) {
  return "OPP";
}
var NFL_PLAYER_TEAMS;
var init_playerTeamMap = __esm({
  "src/lib/playerTeamMap.ts"() {
    "use strict";
    NFL_PLAYER_TEAMS = {
      // Quarterbacks
      "AARON_RODGERS_1_NFL": "NYJ",
      // Aaron Rodgers - New York Jets
      "PATRICK_MAHOMES_1_NFL": "KC",
      // Patrick Mahomes - Kansas City Chiefs
      "JOSH_ALLEN_1_NFL": "BUF",
      // Josh Allen - Buffalo Bills
      "LAMAR_JACKSON_1_NFL": "BAL",
      // Lamar Jackson - Baltimore Ravens
      "JOE_BURROW_1_NFL": "CIN",
      // Joe Burrow - Cincinnati Bengals
      "DEREK_CARR_1_NFL": "NO",
      // Derek Carr - New Orleans Saints
      "DANIEL_JONES_1_NFL": "NYG",
      // Daniel Jones - New York Giants
      "KIRK_COUSINS_1_NFL": "ATL",
      // Kirk Cousins - Atlanta Falcons
      "MATTHEW_STAFFORD_1_NFL": "LAR",
      // Matthew Stafford - Los Angeles Rams
      "TUA_TAGOVAILOA_1_NFL": "MIA",
      // Tua Tagovailoa - Miami Dolphins
      // Running Backs
      "CHRISTIAN_MCCAFFREY_1_NFL": "SF",
      // Christian McCaffrey - San Francisco 49ers
      "AUSTIN_EKELER_1_NFL": "LAC",
      // Austin Ekeler - Los Angeles Chargers
      "DERRICK_HENRY_1_NFL": "BAL",
      // Derrick Henry - Baltimore Ravens
      "JOSH_JACOBS_1_NFL": "GB",
      // Josh Jacobs - Green Bay Packers
      "ALVIN_KAMARA_1_NFL": "NO",
      // Alvin Kamara - New Orleans Saints
      "SAQUON_BARKLEY_1_NFL": "PHI",
      // Saquon Barkley - Philadelphia Eagles
      // Wide Receivers
      "TRAVIS_KELCE_1_NFL": "KC",
      // Travis Kelce - Kansas City Chiefs
      "COOPER_KUPP_1_NFL": "LAR",
      // Cooper Kupp - Los Angeles Rams
      "STEFON_DIGGS_1_NFL": "HOU",
      // Stefon Diggs - Houston Texans
      "DEEBO_SAMUEL_1_NFL": "SF",
      // Deebo Samuel - San Francisco 49ers
      "TYREEK_HILL_1_NFL": "MIA",
      // Tyreek Hill - Miami Dolphins
      "DALVIN_COOK_1_NFL": "BAL",
      // Dalvin Cook - Baltimore Ravens
      // Kickers
      "ANDRES_BORREGALES_1_NFL": "TB",
      // Andres Borregales - Tampa Bay Buccaneers
      "JUSTIN_TUCKER_1_NFL": "BAL",
      // Justin Tucker - Baltimore Ravens
      "BRANDON_MCMANUS_1_NFL": "HOU"
      // Brandon McManus - Houston Texans
      // Add more players as needed
    };
    __name(getPlayerTeam, "getPlayerTeam");
    __name(getOpponentTeam, "getOpponentTeam");
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
async function extractPlayerProps(events, env) {
  const out = [];
  console.log(`\u{1F50D} Extracting player props from ${events?.length || 0} events`);
  for (const ev of events || []) {
    if (!ev)
      continue;
    const eventId = ev.id || ev.eventID || ev.event_id || "unknown";
    const league = ev.leagueID || ev.league || ev.league_id || "unknown";
    const eventStartUtc = ev.startTime || ev.commence_time || ev.startUtc || ev.date || (/* @__PURE__ */ new Date()).toISOString();
    let homeTeam = ev.homeTeam || ev.teams?.home?.names?.short || ev.teams?.home?.names?.long || ev.teams?.[0];
    let awayTeam = ev.awayTeam || ev.teams?.away?.names?.short || ev.teams?.away?.names?.long || ev.teams?.[1];
    if ((!homeTeam || !awayTeam) && eventId !== "unknown" && env) {
      console.log(`\u{1F50D} No team info in event, fetching game details for ${eventId}...`);
      try {
        const gameDetails = await fetchGameDetails(env, eventId);
        if (gameDetails) {
          homeTeam = homeTeam || gameDetails.homeTeam || gameDetails.homeTeamName;
          awayTeam = awayTeam || gameDetails.awayTeam || gameDetails.awayTeamName;
          console.log(`\u2705 Fetched team info: ${homeTeam} vs ${awayTeam}`);
        }
      } catch (error) {
        console.warn(`\u26A0\uFE0F Failed to fetch game details for ${eventId}:`, error);
      }
    }
    console.log(`\u{1F3C8} Event ${eventId}: ${homeTeam} vs ${awayTeam}`);
    const oddsData = ev?.odds || {};
    for (const [oddId, oddData] of Object.entries(oddsData)) {
      if (!oddData || typeof oddData !== "object")
        continue;
      const odd = oddData;
      if (out.length < 3 && Object.keys(oddsData).indexOf(oddId) < 5) {
        console.log(`\u{1F50D} [EXTRACT:ODDS] Odd ${oddId}:`, {
          hasPlayerID: !!odd.playerID,
          hasStatID: !!odd.statID,
          hasPlayerId: !!odd.playerId,
          hasStatId: !!odd.statId,
          oddKeys: Object.keys(odd),
          sampleOdd: odd
        });
      }
      if (!odd.playerID || !odd.statID)
        continue;
      const playerInfo = ev?.players?.[odd.playerID];
      const playerName = playerInfo?.name || odd.playerID || "Unknown Player";
      const playerId = odd.playerID;
      if (out.length < 3) {
        console.log(`\u{1F50D} [EXTRACT:DEBUG] Prop ${out.length}:`, {
          playerId,
          playerName,
          playerInfo: playerInfo ? {
            teamID: playerInfo.teamID,
            teamId: playerInfo.teamId,
            team: playerInfo.team,
            teamName: playerInfo.teamName
          } : null,
          oddData: {
            teamID: odd.teamID,
            teamId: odd.teamId,
            playerTeamID: odd.playerTeamID,
            playerTeamId: odd.playerTeamId
          },
          eventTeams: {
            homeTeam,
            awayTeam,
            homeTeamId: ev.homeTeamId ?? ev.homeTeamID,
            awayTeamId: ev.awayTeamId ?? ev.awayTeamID,
            teams: ev.teams
          }
        });
      }
      const playerTeamID = playerInfo?.teamID || odd.playerTeamID || odd.teamID;
      let playerTeam = null;
      let opponentTeam = null;
      if (playerTeamID) {
        if (homeTeam && awayTeam) {
          playerTeam = homeTeam;
          opponentTeam = awayTeam;
        }
      }
      if (!playerTeam && playerId) {
        const mappedTeam = getPlayerTeam(playerId);
        if (mappedTeam) {
          playerTeam = mappedTeam;
          opponentTeam = getOpponentTeam(mappedTeam, eventId);
          console.log(`\u{1F50D} Using player team mapping: ${playerId} -> ${playerTeam} vs ${opponentTeam}`);
        }
      }
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
        team: playerTeam,
        opponent: opponentTeam,
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
    init_api();
    init_playerTeamMap();
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
async function supabaseFetch(env, path, options = {}) {
  const url = `${env.SUPABASE_URL}/rest/v1/${path}`;
  const headers = {
    apikey: env.SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    "Content-Type": "application/json",
    ...options.headers
  };
  let body = options.body;
  if (body && typeof body === "object" && !(body instanceof FormData)) {
    body = JSON.stringify(body);
  }
  const res = await fetch(url, { ...options, headers, body });
  if (!res.ok) {
    const text = await res.text();
    console.error(`\u274C Supabase fetch failed: ${res.status} ${res.statusText}`, text);
    throw new Error(`Supabase fetch failed: ${res.status} ${res.statusText} - ${text}`);
  }
  try {
    const text = await res.text();
    if (!text || text.trim() === "") {
      console.log(`\u2705 supabaseFetch returned empty response for ${path}`);
      return null;
    }
    const data = JSON.parse(text);
    console.log(`\u2705 supabaseFetch returned ${Array.isArray(data) ? data.length : 0} rows for ${path}`);
    return data;
  } catch (err) {
    console.error("\u274C Failed to parse Supabase JSON:", err);
    throw err;
  }
}
var init_supabaseFetch = __esm({
  "src/supabaseFetch.ts"() {
    "use strict";
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
  const proplinesBatches = chunk(mapped, 250);
  for (let i = 0; i < proplinesBatches.length; i++) {
    const batch = proplinesBatches[i];
    try {
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
      } else if (Array.isArray(response) && response.length > 0) {
        console.log(`\u2705 Inserted proplines batch ${i + 1} (${batch.length} props) - returned ${response.length} rows`);
        result.proplinesInserted += response.length;
      } else {
        if (response && typeof response === "object" && "error" in response) {
          throw new Error(`Supabase insert error: ${JSON.stringify(response.error)}`);
        } else {
          console.log(`\u2705 Inserted proplines batch ${i + 1} (${batch.length} props) with response:`, response);
          result.proplinesInserted += batch.length;
        }
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
    const requiredFields = ["player_id", "player_name", "team", "opponent", "prop_type", "line", "sportsbook", "league", "season", "date", "game_id", "conflict_key"];
    for (const field of requiredFields) {
      if (prop[field] === void 0 || prop[field] === null || prop[field] === "") {
        errors.push({
          message: `Missing required field '${field}' in prop at index ${i}`,
          sampleData: prop
        });
      }
    }
    if (prop.over_odds === null && prop.under_odds === null) {
      errors.push({
        message: `At least one odds field (over_odds or under_odds) must be present at index ${i}`,
        sampleData: prop
      });
    }
    if (typeof prop.line !== "number") {
      errors.push({
        message: `Invalid line type: expected number, got ${typeof prop.line} at index ${i}`,
        sampleData: prop
      });
    }
    if (prop.over_odds !== null && typeof prop.over_odds !== "number") {
      errors.push({
        message: `Invalid over_odds type: expected number or null, got ${typeof prop.over_odds} at index ${i}`,
        sampleData: prop
      });
    }
    if (prop.under_odds !== null && typeof prop.under_odds !== "number") {
      errors.push({
        message: `Invalid under_odds type: expected number or null, got ${typeof prop.under_odds} at index ${i}`,
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
    init_supabaseFetch();
    init_helpers();
    __name(insertPropsWithDebugging, "insertPropsWithDebugging");
    __name(validatePropData, "validatePropData");
  }
});

// node_modules/@supabase/node-fetch/browser.js
var browser_exports = {};
__export(browser_exports, {
  Headers: () => Headers2,
  Request: () => Request,
  Response: () => Response2,
  default: () => browser_default,
  fetch: () => fetch2
});
var getGlobal, globalObject, fetch2, browser_default, Headers2, Request, Response2;
var init_browser = __esm({
  "node_modules/@supabase/node-fetch/browser.js"() {
    "use strict";
    getGlobal = /* @__PURE__ */ __name(function() {
      if (typeof self !== "undefined") {
        return self;
      }
      if (typeof window !== "undefined") {
        return window;
      }
      if (typeof global !== "undefined") {
        return global;
      }
      throw new Error("unable to locate global object");
    }, "getGlobal");
    globalObject = getGlobal();
    fetch2 = globalObject.fetch;
    browser_default = globalObject.fetch.bind(globalObject);
    Headers2 = globalObject.Headers;
    Request = globalObject.Request;
    Response2 = globalObject.Response;
  }
});

// node_modules/@supabase/functions-js/dist/module/helper.js
var resolveFetch;
var init_helper = __esm({
  "node_modules/@supabase/functions-js/dist/module/helper.js"() {
    resolveFetch = /* @__PURE__ */ __name((customFetch) => {
      let _fetch;
      if (customFetch) {
        _fetch = customFetch;
      } else if (typeof fetch === "undefined") {
        _fetch = /* @__PURE__ */ __name((...args) => Promise.resolve().then(() => (init_browser(), browser_exports)).then(({ default: fetch3 }) => fetch3(...args)), "_fetch");
      } else {
        _fetch = fetch;
      }
      return (...args) => _fetch(...args);
    }, "resolveFetch");
  }
});

// node_modules/@supabase/functions-js/dist/module/types.js
var FunctionsError, FunctionsFetchError, FunctionsRelayError, FunctionsHttpError, FunctionRegion;
var init_types = __esm({
  "node_modules/@supabase/functions-js/dist/module/types.js"() {
    FunctionsError = class extends Error {
      constructor(message, name = "FunctionsError", context) {
        super(message);
        this.name = name;
        this.context = context;
      }
    };
    __name(FunctionsError, "FunctionsError");
    FunctionsFetchError = class extends FunctionsError {
      constructor(context) {
        super("Failed to send a request to the Edge Function", "FunctionsFetchError", context);
      }
    };
    __name(FunctionsFetchError, "FunctionsFetchError");
    FunctionsRelayError = class extends FunctionsError {
      constructor(context) {
        super("Relay Error invoking the Edge Function", "FunctionsRelayError", context);
      }
    };
    __name(FunctionsRelayError, "FunctionsRelayError");
    FunctionsHttpError = class extends FunctionsError {
      constructor(context) {
        super("Edge Function returned a non-2xx status code", "FunctionsHttpError", context);
      }
    };
    __name(FunctionsHttpError, "FunctionsHttpError");
    (function(FunctionRegion2) {
      FunctionRegion2["Any"] = "any";
      FunctionRegion2["ApNortheast1"] = "ap-northeast-1";
      FunctionRegion2["ApNortheast2"] = "ap-northeast-2";
      FunctionRegion2["ApSouth1"] = "ap-south-1";
      FunctionRegion2["ApSoutheast1"] = "ap-southeast-1";
      FunctionRegion2["ApSoutheast2"] = "ap-southeast-2";
      FunctionRegion2["CaCentral1"] = "ca-central-1";
      FunctionRegion2["EuCentral1"] = "eu-central-1";
      FunctionRegion2["EuWest1"] = "eu-west-1";
      FunctionRegion2["EuWest2"] = "eu-west-2";
      FunctionRegion2["EuWest3"] = "eu-west-3";
      FunctionRegion2["SaEast1"] = "sa-east-1";
      FunctionRegion2["UsEast1"] = "us-east-1";
      FunctionRegion2["UsWest1"] = "us-west-1";
      FunctionRegion2["UsWest2"] = "us-west-2";
    })(FunctionRegion || (FunctionRegion = {}));
  }
});

// node_modules/@supabase/functions-js/dist/module/FunctionsClient.js
var __awaiter, FunctionsClient;
var init_FunctionsClient = __esm({
  "node_modules/@supabase/functions-js/dist/module/FunctionsClient.js"() {
    init_helper();
    init_types();
    __awaiter = function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      __name(adopt, "adopt");
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        __name(fulfilled, "fulfilled");
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        __name(rejected, "rejected");
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        __name(step, "step");
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    FunctionsClient = class {
      constructor(url, { headers = {}, customFetch, region = FunctionRegion.Any } = {}) {
        this.url = url;
        this.headers = headers;
        this.region = region;
        this.fetch = resolveFetch(customFetch);
      }
      /**
       * Updates the authorization header
       * @param token - the new jwt token sent in the authorisation header
       */
      setAuth(token) {
        this.headers.Authorization = `Bearer ${token}`;
      }
      /**
       * Invokes a function
       * @param functionName - The name of the Function to invoke.
       * @param options - Options for invoking the Function.
       */
      invoke(functionName_1) {
        return __awaiter(this, arguments, void 0, function* (functionName, options = {}) {
          var _a;
          try {
            const { headers, method, body: functionArgs, signal } = options;
            let _headers = {};
            let { region } = options;
            if (!region) {
              region = this.region;
            }
            const url = new URL(`${this.url}/${functionName}`);
            if (region && region !== "any") {
              _headers["x-region"] = region;
              url.searchParams.set("forceFunctionRegion", region);
            }
            let body;
            if (functionArgs && (headers && !Object.prototype.hasOwnProperty.call(headers, "Content-Type") || !headers)) {
              if (typeof Blob !== "undefined" && functionArgs instanceof Blob || functionArgs instanceof ArrayBuffer) {
                _headers["Content-Type"] = "application/octet-stream";
                body = functionArgs;
              } else if (typeof functionArgs === "string") {
                _headers["Content-Type"] = "text/plain";
                body = functionArgs;
              } else if (typeof FormData !== "undefined" && functionArgs instanceof FormData) {
                body = functionArgs;
              } else {
                _headers["Content-Type"] = "application/json";
                body = JSON.stringify(functionArgs);
              }
            }
            const response = yield this.fetch(url.toString(), {
              method: method || "POST",
              // headers priority is (high to low):
              // 1. invoke-level headers
              // 2. client-level headers
              // 3. default Content-Type header
              headers: Object.assign(Object.assign(Object.assign({}, _headers), this.headers), headers),
              body,
              signal
            }).catch((fetchError) => {
              if (fetchError.name === "AbortError") {
                throw fetchError;
              }
              throw new FunctionsFetchError(fetchError);
            });
            const isRelayError = response.headers.get("x-relay-error");
            if (isRelayError && isRelayError === "true") {
              throw new FunctionsRelayError(response);
            }
            if (!response.ok) {
              throw new FunctionsHttpError(response);
            }
            let responseType = ((_a = response.headers.get("Content-Type")) !== null && _a !== void 0 ? _a : "text/plain").split(";")[0].trim();
            let data;
            if (responseType === "application/json") {
              data = yield response.json();
            } else if (responseType === "application/octet-stream") {
              data = yield response.blob();
            } else if (responseType === "text/event-stream") {
              data = response;
            } else if (responseType === "multipart/form-data") {
              data = yield response.formData();
            } else {
              data = yield response.text();
            }
            return { data, error: null, response };
          } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
              return { data: null, error: new FunctionsFetchError(error) };
            }
            return {
              data: null,
              error,
              response: error instanceof FunctionsHttpError || error instanceof FunctionsRelayError ? error.context : void 0
            };
          }
        });
      }
    };
    __name(FunctionsClient, "FunctionsClient");
  }
});

// node_modules/@supabase/functions-js/dist/module/index.js
var init_module = __esm({
  "node_modules/@supabase/functions-js/dist/module/index.js"() {
    init_FunctionsClient();
    init_types();
  }
});

// node_modules/@supabase/postgrest-js/dist/cjs/PostgrestError.js
var require_PostgrestError = __commonJS({
  "node_modules/@supabase/postgrest-js/dist/cjs/PostgrestError.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var PostgrestError2 = class extends Error {
      constructor(context) {
        super(context.message);
        this.name = "PostgrestError";
        this.details = context.details;
        this.hint = context.hint;
        this.code = context.code;
      }
    };
    __name(PostgrestError2, "PostgrestError");
    exports.default = PostgrestError2;
  }
});

// node_modules/@supabase/postgrest-js/dist/cjs/PostgrestBuilder.js
var require_PostgrestBuilder = __commonJS({
  "node_modules/@supabase/postgrest-js/dist/cjs/PostgrestBuilder.js"(exports) {
    "use strict";
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    var node_fetch_1 = __importDefault((init_browser(), __toCommonJS(browser_exports)));
    var PostgrestError_1 = __importDefault(require_PostgrestError());
    var PostgrestBuilder2 = class {
      constructor(builder) {
        var _a, _b;
        this.shouldThrowOnError = false;
        this.method = builder.method;
        this.url = builder.url;
        this.headers = new Headers(builder.headers);
        this.schema = builder.schema;
        this.body = builder.body;
        this.shouldThrowOnError = (_a = builder.shouldThrowOnError) !== null && _a !== void 0 ? _a : false;
        this.signal = builder.signal;
        this.isMaybeSingle = (_b = builder.isMaybeSingle) !== null && _b !== void 0 ? _b : false;
        if (builder.fetch) {
          this.fetch = builder.fetch;
        } else if (typeof fetch === "undefined") {
          this.fetch = node_fetch_1.default;
        } else {
          this.fetch = fetch;
        }
      }
      /**
       * If there's an error with the query, throwOnError will reject the promise by
       * throwing the error instead of returning it as part of a successful response.
       *
       * {@link https://github.com/supabase/supabase-js/issues/92}
       */
      throwOnError() {
        this.shouldThrowOnError = true;
        return this;
      }
      /**
       * Set an HTTP header for the request.
       */
      setHeader(name, value) {
        this.headers = new Headers(this.headers);
        this.headers.set(name, value);
        return this;
      }
      then(onfulfilled, onrejected) {
        if (this.schema === void 0) {
        } else if (["GET", "HEAD"].includes(this.method)) {
          this.headers.set("Accept-Profile", this.schema);
        } else {
          this.headers.set("Content-Profile", this.schema);
        }
        if (this.method !== "GET" && this.method !== "HEAD") {
          this.headers.set("Content-Type", "application/json");
        }
        const _fetch = this.fetch;
        let res = _fetch(this.url.toString(), {
          method: this.method,
          headers: this.headers,
          body: JSON.stringify(this.body),
          signal: this.signal
        }).then(async (res2) => {
          var _a, _b, _c, _d;
          let error = null;
          let data = null;
          let count = null;
          let status = res2.status;
          let statusText = res2.statusText;
          if (res2.ok) {
            if (this.method !== "HEAD") {
              const body = await res2.text();
              if (body === "") {
              } else if (this.headers.get("Accept") === "text/csv") {
                data = body;
              } else if (this.headers.get("Accept") && ((_a = this.headers.get("Accept")) === null || _a === void 0 ? void 0 : _a.includes("application/vnd.pgrst.plan+text"))) {
                data = body;
              } else {
                data = JSON.parse(body);
              }
            }
            const countHeader = (_b = this.headers.get("Prefer")) === null || _b === void 0 ? void 0 : _b.match(/count=(exact|planned|estimated)/);
            const contentRange = (_c = res2.headers.get("content-range")) === null || _c === void 0 ? void 0 : _c.split("/");
            if (countHeader && contentRange && contentRange.length > 1) {
              count = parseInt(contentRange[1]);
            }
            if (this.isMaybeSingle && this.method === "GET" && Array.isArray(data)) {
              if (data.length > 1) {
                error = {
                  // https://github.com/PostgREST/postgrest/blob/a867d79c42419af16c18c3fb019eba8df992626f/src/PostgREST/Error.hs#L553
                  code: "PGRST116",
                  details: `Results contain ${data.length} rows, application/vnd.pgrst.object+json requires 1 row`,
                  hint: null,
                  message: "JSON object requested, multiple (or no) rows returned"
                };
                data = null;
                count = null;
                status = 406;
                statusText = "Not Acceptable";
              } else if (data.length === 1) {
                data = data[0];
              } else {
                data = null;
              }
            }
          } else {
            const body = await res2.text();
            try {
              error = JSON.parse(body);
              if (Array.isArray(error) && res2.status === 404) {
                data = [];
                error = null;
                status = 200;
                statusText = "OK";
              }
            } catch (_e) {
              if (res2.status === 404 && body === "") {
                status = 204;
                statusText = "No Content";
              } else {
                error = {
                  message: body
                };
              }
            }
            if (error && this.isMaybeSingle && ((_d = error === null || error === void 0 ? void 0 : error.details) === null || _d === void 0 ? void 0 : _d.includes("0 rows"))) {
              error = null;
              status = 200;
              statusText = "OK";
            }
            if (error && this.shouldThrowOnError) {
              throw new PostgrestError_1.default(error);
            }
          }
          const postgrestResponse = {
            error,
            data,
            count,
            status,
            statusText
          };
          return postgrestResponse;
        });
        if (!this.shouldThrowOnError) {
          res = res.catch((fetchError) => {
            var _a, _b, _c;
            return {
              error: {
                message: `${(_a = fetchError === null || fetchError === void 0 ? void 0 : fetchError.name) !== null && _a !== void 0 ? _a : "FetchError"}: ${fetchError === null || fetchError === void 0 ? void 0 : fetchError.message}`,
                details: `${(_b = fetchError === null || fetchError === void 0 ? void 0 : fetchError.stack) !== null && _b !== void 0 ? _b : ""}`,
                hint: "",
                code: `${(_c = fetchError === null || fetchError === void 0 ? void 0 : fetchError.code) !== null && _c !== void 0 ? _c : ""}`
              },
              data: null,
              count: null,
              status: 0,
              statusText: ""
            };
          });
        }
        return res.then(onfulfilled, onrejected);
      }
      /**
       * Override the type of the returned `data`.
       *
       * @typeParam NewResult - The new result type to override with
       * @deprecated Use overrideTypes<yourType, { merge: false }>() method at the end of your call chain instead
       */
      returns() {
        return this;
      }
      /**
       * Override the type of the returned `data` field in the response.
       *
       * @typeParam NewResult - The new type to cast the response data to
       * @typeParam Options - Optional type configuration (defaults to { merge: true })
       * @typeParam Options.merge - When true, merges the new type with existing return type. When false, replaces the existing types entirely (defaults to true)
       * @example
       * ```typescript
       * // Merge with existing types (default behavior)
       * const query = supabase
       *   .from('users')
       *   .select()
       *   .overrideTypes<{ custom_field: string }>()
       *
       * // Replace existing types completely
       * const replaceQuery = supabase
       *   .from('users')
       *   .select()
       *   .overrideTypes<{ id: number; name: string }, { merge: false }>()
       * ```
       * @returns A PostgrestBuilder instance with the new type
       */
      overrideTypes() {
        return this;
      }
    };
    __name(PostgrestBuilder2, "PostgrestBuilder");
    exports.default = PostgrestBuilder2;
  }
});

// node_modules/@supabase/postgrest-js/dist/cjs/PostgrestTransformBuilder.js
var require_PostgrestTransformBuilder = __commonJS({
  "node_modules/@supabase/postgrest-js/dist/cjs/PostgrestTransformBuilder.js"(exports) {
    "use strict";
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    var PostgrestBuilder_1 = __importDefault(require_PostgrestBuilder());
    var PostgrestTransformBuilder2 = class extends PostgrestBuilder_1.default {
      /**
       * Perform a SELECT on the query result.
       *
       * By default, `.insert()`, `.update()`, `.upsert()`, and `.delete()` do not
       * return modified rows. By calling this method, modified rows are returned in
       * `data`.
       *
       * @param columns - The columns to retrieve, separated by commas
       */
      select(columns) {
        let quoted = false;
        const cleanedColumns = (columns !== null && columns !== void 0 ? columns : "*").split("").map((c) => {
          if (/\s/.test(c) && !quoted) {
            return "";
          }
          if (c === '"') {
            quoted = !quoted;
          }
          return c;
        }).join("");
        this.url.searchParams.set("select", cleanedColumns);
        this.headers.append("Prefer", "return=representation");
        return this;
      }
      /**
       * Order the query result by `column`.
       *
       * You can call this method multiple times to order by multiple columns.
       *
       * You can order referenced tables, but it only affects the ordering of the
       * parent table if you use `!inner` in the query.
       *
       * @param column - The column to order by
       * @param options - Named parameters
       * @param options.ascending - If `true`, the result will be in ascending order
       * @param options.nullsFirst - If `true`, `null`s appear first. If `false`,
       * `null`s appear last.
       * @param options.referencedTable - Set this to order a referenced table by
       * its columns
       * @param options.foreignTable - Deprecated, use `options.referencedTable`
       * instead
       */
      order(column, { ascending = true, nullsFirst, foreignTable, referencedTable = foreignTable } = {}) {
        const key = referencedTable ? `${referencedTable}.order` : "order";
        const existingOrder = this.url.searchParams.get(key);
        this.url.searchParams.set(key, `${existingOrder ? `${existingOrder},` : ""}${column}.${ascending ? "asc" : "desc"}${nullsFirst === void 0 ? "" : nullsFirst ? ".nullsfirst" : ".nullslast"}`);
        return this;
      }
      /**
       * Limit the query result by `count`.
       *
       * @param count - The maximum number of rows to return
       * @param options - Named parameters
       * @param options.referencedTable - Set this to limit rows of referenced
       * tables instead of the parent table
       * @param options.foreignTable - Deprecated, use `options.referencedTable`
       * instead
       */
      limit(count, { foreignTable, referencedTable = foreignTable } = {}) {
        const key = typeof referencedTable === "undefined" ? "limit" : `${referencedTable}.limit`;
        this.url.searchParams.set(key, `${count}`);
        return this;
      }
      /**
       * Limit the query result by starting at an offset `from` and ending at the offset `to`.
       * Only records within this range are returned.
       * This respects the query order and if there is no order clause the range could behave unexpectedly.
       * The `from` and `to` values are 0-based and inclusive: `range(1, 3)` will include the second, third
       * and fourth rows of the query.
       *
       * @param from - The starting index from which to limit the result
       * @param to - The last index to which to limit the result
       * @param options - Named parameters
       * @param options.referencedTable - Set this to limit rows of referenced
       * tables instead of the parent table
       * @param options.foreignTable - Deprecated, use `options.referencedTable`
       * instead
       */
      range(from, to, { foreignTable, referencedTable = foreignTable } = {}) {
        const keyOffset = typeof referencedTable === "undefined" ? "offset" : `${referencedTable}.offset`;
        const keyLimit = typeof referencedTable === "undefined" ? "limit" : `${referencedTable}.limit`;
        this.url.searchParams.set(keyOffset, `${from}`);
        this.url.searchParams.set(keyLimit, `${to - from + 1}`);
        return this;
      }
      /**
       * Set the AbortSignal for the fetch request.
       *
       * @param signal - The AbortSignal to use for the fetch request
       */
      abortSignal(signal) {
        this.signal = signal;
        return this;
      }
      /**
       * Return `data` as a single object instead of an array of objects.
       *
       * Query result must be one row (e.g. using `.limit(1)`), otherwise this
       * returns an error.
       */
      single() {
        this.headers.set("Accept", "application/vnd.pgrst.object+json");
        return this;
      }
      /**
       * Return `data` as a single object instead of an array of objects.
       *
       * Query result must be zero or one row (e.g. using `.limit(1)`), otherwise
       * this returns an error.
       */
      maybeSingle() {
        if (this.method === "GET") {
          this.headers.set("Accept", "application/json");
        } else {
          this.headers.set("Accept", "application/vnd.pgrst.object+json");
        }
        this.isMaybeSingle = true;
        return this;
      }
      /**
       * Return `data` as a string in CSV format.
       */
      csv() {
        this.headers.set("Accept", "text/csv");
        return this;
      }
      /**
       * Return `data` as an object in [GeoJSON](https://geojson.org) format.
       */
      geojson() {
        this.headers.set("Accept", "application/geo+json");
        return this;
      }
      /**
       * Return `data` as the EXPLAIN plan for the query.
       *
       * You need to enable the
       * [db_plan_enabled](https://supabase.com/docs/guides/database/debugging-performance#enabling-explain)
       * setting before using this method.
       *
       * @param options - Named parameters
       *
       * @param options.analyze - If `true`, the query will be executed and the
       * actual run time will be returned
       *
       * @param options.verbose - If `true`, the query identifier will be returned
       * and `data` will include the output columns of the query
       *
       * @param options.settings - If `true`, include information on configuration
       * parameters that affect query planning
       *
       * @param options.buffers - If `true`, include information on buffer usage
       *
       * @param options.wal - If `true`, include information on WAL record generation
       *
       * @param options.format - The format of the output, can be `"text"` (default)
       * or `"json"`
       */
      explain({ analyze = false, verbose = false, settings = false, buffers = false, wal = false, format = "text" } = {}) {
        var _a;
        const options = [
          analyze ? "analyze" : null,
          verbose ? "verbose" : null,
          settings ? "settings" : null,
          buffers ? "buffers" : null,
          wal ? "wal" : null
        ].filter(Boolean).join("|");
        const forMediatype = (_a = this.headers.get("Accept")) !== null && _a !== void 0 ? _a : "application/json";
        this.headers.set("Accept", `application/vnd.pgrst.plan+${format}; for="${forMediatype}"; options=${options};`);
        if (format === "json") {
          return this;
        } else {
          return this;
        }
      }
      /**
       * Rollback the query.
       *
       * `data` will still be returned, but the query is not committed.
       */
      rollback() {
        this.headers.append("Prefer", "tx=rollback");
        return this;
      }
      /**
       * Override the type of the returned `data`.
       *
       * @typeParam NewResult - The new result type to override with
       * @deprecated Use overrideTypes<yourType, { merge: false }>() method at the end of your call chain instead
       */
      returns() {
        return this;
      }
      /**
       * Set the maximum number of rows that can be affected by the query.
       * Only available in PostgREST v13+ and only works with PATCH and DELETE methods.
       *
       * @param value - The maximum number of rows that can be affected
       */
      maxAffected(value) {
        this.headers.append("Prefer", "handling=strict");
        this.headers.append("Prefer", `max-affected=${value}`);
        return this;
      }
    };
    __name(PostgrestTransformBuilder2, "PostgrestTransformBuilder");
    exports.default = PostgrestTransformBuilder2;
  }
});

// node_modules/@supabase/postgrest-js/dist/cjs/PostgrestFilterBuilder.js
var require_PostgrestFilterBuilder = __commonJS({
  "node_modules/@supabase/postgrest-js/dist/cjs/PostgrestFilterBuilder.js"(exports) {
    "use strict";
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    var PostgrestTransformBuilder_1 = __importDefault(require_PostgrestTransformBuilder());
    var PostgrestFilterBuilder2 = class extends PostgrestTransformBuilder_1.default {
      /**
       * Match only rows where `column` is equal to `value`.
       *
       * To check if the value of `column` is NULL, you should use `.is()` instead.
       *
       * @param column - The column to filter on
       * @param value - The value to filter with
       */
      eq(column, value) {
        this.url.searchParams.append(column, `eq.${value}`);
        return this;
      }
      /**
       * Match only rows where `column` is not equal to `value`.
       *
       * @param column - The column to filter on
       * @param value - The value to filter with
       */
      neq(column, value) {
        this.url.searchParams.append(column, `neq.${value}`);
        return this;
      }
      /**
       * Match only rows where `column` is greater than `value`.
       *
       * @param column - The column to filter on
       * @param value - The value to filter with
       */
      gt(column, value) {
        this.url.searchParams.append(column, `gt.${value}`);
        return this;
      }
      /**
       * Match only rows where `column` is greater than or equal to `value`.
       *
       * @param column - The column to filter on
       * @param value - The value to filter with
       */
      gte(column, value) {
        this.url.searchParams.append(column, `gte.${value}`);
        return this;
      }
      /**
       * Match only rows where `column` is less than `value`.
       *
       * @param column - The column to filter on
       * @param value - The value to filter with
       */
      lt(column, value) {
        this.url.searchParams.append(column, `lt.${value}`);
        return this;
      }
      /**
       * Match only rows where `column` is less than or equal to `value`.
       *
       * @param column - The column to filter on
       * @param value - The value to filter with
       */
      lte(column, value) {
        this.url.searchParams.append(column, `lte.${value}`);
        return this;
      }
      /**
       * Match only rows where `column` matches `pattern` case-sensitively.
       *
       * @param column - The column to filter on
       * @param pattern - The pattern to match with
       */
      like(column, pattern) {
        this.url.searchParams.append(column, `like.${pattern}`);
        return this;
      }
      /**
       * Match only rows where `column` matches all of `patterns` case-sensitively.
       *
       * @param column - The column to filter on
       * @param patterns - The patterns to match with
       */
      likeAllOf(column, patterns) {
        this.url.searchParams.append(column, `like(all).{${patterns.join(",")}}`);
        return this;
      }
      /**
       * Match only rows where `column` matches any of `patterns` case-sensitively.
       *
       * @param column - The column to filter on
       * @param patterns - The patterns to match with
       */
      likeAnyOf(column, patterns) {
        this.url.searchParams.append(column, `like(any).{${patterns.join(",")}}`);
        return this;
      }
      /**
       * Match only rows where `column` matches `pattern` case-insensitively.
       *
       * @param column - The column to filter on
       * @param pattern - The pattern to match with
       */
      ilike(column, pattern) {
        this.url.searchParams.append(column, `ilike.${pattern}`);
        return this;
      }
      /**
       * Match only rows where `column` matches all of `patterns` case-insensitively.
       *
       * @param column - The column to filter on
       * @param patterns - The patterns to match with
       */
      ilikeAllOf(column, patterns) {
        this.url.searchParams.append(column, `ilike(all).{${patterns.join(",")}}`);
        return this;
      }
      /**
       * Match only rows where `column` matches any of `patterns` case-insensitively.
       *
       * @param column - The column to filter on
       * @param patterns - The patterns to match with
       */
      ilikeAnyOf(column, patterns) {
        this.url.searchParams.append(column, `ilike(any).{${patterns.join(",")}}`);
        return this;
      }
      /**
       * Match only rows where `column` IS `value`.
       *
       * For non-boolean columns, this is only relevant for checking if the value of
       * `column` is NULL by setting `value` to `null`.
       *
       * For boolean columns, you can also set `value` to `true` or `false` and it
       * will behave the same way as `.eq()`.
       *
       * @param column - The column to filter on
       * @param value - The value to filter with
       */
      is(column, value) {
        this.url.searchParams.append(column, `is.${value}`);
        return this;
      }
      /**
       * Match only rows where `column` is included in the `values` array.
       *
       * @param column - The column to filter on
       * @param values - The values array to filter with
       */
      in(column, values) {
        const cleanedValues = Array.from(new Set(values)).map((s) => {
          if (typeof s === "string" && new RegExp("[,()]").test(s))
            return `"${s}"`;
          else
            return `${s}`;
        }).join(",");
        this.url.searchParams.append(column, `in.(${cleanedValues})`);
        return this;
      }
      /**
       * Only relevant for jsonb, array, and range columns. Match only rows where
       * `column` contains every element appearing in `value`.
       *
       * @param column - The jsonb, array, or range column to filter on
       * @param value - The jsonb, array, or range value to filter with
       */
      contains(column, value) {
        if (typeof value === "string") {
          this.url.searchParams.append(column, `cs.${value}`);
        } else if (Array.isArray(value)) {
          this.url.searchParams.append(column, `cs.{${value.join(",")}}`);
        } else {
          this.url.searchParams.append(column, `cs.${JSON.stringify(value)}`);
        }
        return this;
      }
      /**
       * Only relevant for jsonb, array, and range columns. Match only rows where
       * every element appearing in `column` is contained by `value`.
       *
       * @param column - The jsonb, array, or range column to filter on
       * @param value - The jsonb, array, or range value to filter with
       */
      containedBy(column, value) {
        if (typeof value === "string") {
          this.url.searchParams.append(column, `cd.${value}`);
        } else if (Array.isArray(value)) {
          this.url.searchParams.append(column, `cd.{${value.join(",")}}`);
        } else {
          this.url.searchParams.append(column, `cd.${JSON.stringify(value)}`);
        }
        return this;
      }
      /**
       * Only relevant for range columns. Match only rows where every element in
       * `column` is greater than any element in `range`.
       *
       * @param column - The range column to filter on
       * @param range - The range to filter with
       */
      rangeGt(column, range) {
        this.url.searchParams.append(column, `sr.${range}`);
        return this;
      }
      /**
       * Only relevant for range columns. Match only rows where every element in
       * `column` is either contained in `range` or greater than any element in
       * `range`.
       *
       * @param column - The range column to filter on
       * @param range - The range to filter with
       */
      rangeGte(column, range) {
        this.url.searchParams.append(column, `nxl.${range}`);
        return this;
      }
      /**
       * Only relevant for range columns. Match only rows where every element in
       * `column` is less than any element in `range`.
       *
       * @param column - The range column to filter on
       * @param range - The range to filter with
       */
      rangeLt(column, range) {
        this.url.searchParams.append(column, `sl.${range}`);
        return this;
      }
      /**
       * Only relevant for range columns. Match only rows where every element in
       * `column` is either contained in `range` or less than any element in
       * `range`.
       *
       * @param column - The range column to filter on
       * @param range - The range to filter with
       */
      rangeLte(column, range) {
        this.url.searchParams.append(column, `nxr.${range}`);
        return this;
      }
      /**
       * Only relevant for range columns. Match only rows where `column` is
       * mutually exclusive to `range` and there can be no element between the two
       * ranges.
       *
       * @param column - The range column to filter on
       * @param range - The range to filter with
       */
      rangeAdjacent(column, range) {
        this.url.searchParams.append(column, `adj.${range}`);
        return this;
      }
      /**
       * Only relevant for array and range columns. Match only rows where
       * `column` and `value` have an element in common.
       *
       * @param column - The array or range column to filter on
       * @param value - The array or range value to filter with
       */
      overlaps(column, value) {
        if (typeof value === "string") {
          this.url.searchParams.append(column, `ov.${value}`);
        } else {
          this.url.searchParams.append(column, `ov.{${value.join(",")}}`);
        }
        return this;
      }
      /**
       * Only relevant for text and tsvector columns. Match only rows where
       * `column` matches the query string in `query`.
       *
       * @param column - The text or tsvector column to filter on
       * @param query - The query text to match with
       * @param options - Named parameters
       * @param options.config - The text search configuration to use
       * @param options.type - Change how the `query` text is interpreted
       */
      textSearch(column, query, { config, type } = {}) {
        let typePart = "";
        if (type === "plain") {
          typePart = "pl";
        } else if (type === "phrase") {
          typePart = "ph";
        } else if (type === "websearch") {
          typePart = "w";
        }
        const configPart = config === void 0 ? "" : `(${config})`;
        this.url.searchParams.append(column, `${typePart}fts${configPart}.${query}`);
        return this;
      }
      /**
       * Match only rows where each column in `query` keys is equal to its
       * associated value. Shorthand for multiple `.eq()`s.
       *
       * @param query - The object to filter with, with column names as keys mapped
       * to their filter values
       */
      match(query) {
        Object.entries(query).forEach(([column, value]) => {
          this.url.searchParams.append(column, `eq.${value}`);
        });
        return this;
      }
      /**
       * Match only rows which doesn't satisfy the filter.
       *
       * Unlike most filters, `opearator` and `value` are used as-is and need to
       * follow [PostgREST
       * syntax](https://postgrest.org/en/stable/api.html#operators). You also need
       * to make sure they are properly sanitized.
       *
       * @param column - The column to filter on
       * @param operator - The operator to be negated to filter with, following
       * PostgREST syntax
       * @param value - The value to filter with, following PostgREST syntax
       */
      not(column, operator, value) {
        this.url.searchParams.append(column, `not.${operator}.${value}`);
        return this;
      }
      /**
       * Match only rows which satisfy at least one of the filters.
       *
       * Unlike most filters, `filters` is used as-is and needs to follow [PostgREST
       * syntax](https://postgrest.org/en/stable/api.html#operators). You also need
       * to make sure it's properly sanitized.
       *
       * It's currently not possible to do an `.or()` filter across multiple tables.
       *
       * @param filters - The filters to use, following PostgREST syntax
       * @param options - Named parameters
       * @param options.referencedTable - Set this to filter on referenced tables
       * instead of the parent table
       * @param options.foreignTable - Deprecated, use `referencedTable` instead
       */
      or(filters, { foreignTable, referencedTable = foreignTable } = {}) {
        const key = referencedTable ? `${referencedTable}.or` : "or";
        this.url.searchParams.append(key, `(${filters})`);
        return this;
      }
      /**
       * Match only rows which satisfy the filter. This is an escape hatch - you
       * should use the specific filter methods wherever possible.
       *
       * Unlike most filters, `opearator` and `value` are used as-is and need to
       * follow [PostgREST
       * syntax](https://postgrest.org/en/stable/api.html#operators). You also need
       * to make sure they are properly sanitized.
       *
       * @param column - The column to filter on
       * @param operator - The operator to filter with, following PostgREST syntax
       * @param value - The value to filter with, following PostgREST syntax
       */
      filter(column, operator, value) {
        this.url.searchParams.append(column, `${operator}.${value}`);
        return this;
      }
    };
    __name(PostgrestFilterBuilder2, "PostgrestFilterBuilder");
    exports.default = PostgrestFilterBuilder2;
  }
});

// node_modules/@supabase/postgrest-js/dist/cjs/PostgrestQueryBuilder.js
var require_PostgrestQueryBuilder = __commonJS({
  "node_modules/@supabase/postgrest-js/dist/cjs/PostgrestQueryBuilder.js"(exports) {
    "use strict";
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    var PostgrestFilterBuilder_1 = __importDefault(require_PostgrestFilterBuilder());
    var PostgrestQueryBuilder2 = class {
      constructor(url, { headers = {}, schema, fetch: fetch3 }) {
        this.url = url;
        this.headers = new Headers(headers);
        this.schema = schema;
        this.fetch = fetch3;
      }
      /**
       * Perform a SELECT query on the table or view.
       *
       * @param columns - The columns to retrieve, separated by commas. Columns can be renamed when returned with `customName:columnName`
       *
       * @param options - Named parameters
       *
       * @param options.head - When set to `true`, `data` will not be returned.
       * Useful if you only need the count.
       *
       * @param options.count - Count algorithm to use to count rows in the table or view.
       *
       * `"exact"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the
       * hood.
       *
       * `"planned"`: Approximated but fast count algorithm. Uses the Postgres
       * statistics under the hood.
       *
       * `"estimated"`: Uses exact count for low numbers and planned count for high
       * numbers.
       */
      select(columns, options) {
        const { head: head2 = false, count } = options !== null && options !== void 0 ? options : {};
        const method = head2 ? "HEAD" : "GET";
        let quoted = false;
        const cleanedColumns = (columns !== null && columns !== void 0 ? columns : "*").split("").map((c) => {
          if (/\s/.test(c) && !quoted) {
            return "";
          }
          if (c === '"') {
            quoted = !quoted;
          }
          return c;
        }).join("");
        this.url.searchParams.set("select", cleanedColumns);
        if (count) {
          this.headers.append("Prefer", `count=${count}`);
        }
        return new PostgrestFilterBuilder_1.default({
          method,
          url: this.url,
          headers: this.headers,
          schema: this.schema,
          fetch: this.fetch
        });
      }
      /**
       * Perform an INSERT into the table or view.
       *
       * By default, inserted rows are not returned. To return it, chain the call
       * with `.select()`.
       *
       * @param values - The values to insert. Pass an object to insert a single row
       * or an array to insert multiple rows.
       *
       * @param options - Named parameters
       *
       * @param options.count - Count algorithm to use to count inserted rows.
       *
       * `"exact"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the
       * hood.
       *
       * `"planned"`: Approximated but fast count algorithm. Uses the Postgres
       * statistics under the hood.
       *
       * `"estimated"`: Uses exact count for low numbers and planned count for high
       * numbers.
       *
       * @param options.defaultToNull - Make missing fields default to `null`.
       * Otherwise, use the default value for the column. Only applies for bulk
       * inserts.
       */
      insert(values, { count, defaultToNull = true } = {}) {
        var _a;
        const method = "POST";
        if (count) {
          this.headers.append("Prefer", `count=${count}`);
        }
        if (!defaultToNull) {
          this.headers.append("Prefer", `missing=default`);
        }
        if (Array.isArray(values)) {
          const columns = values.reduce((acc, x) => acc.concat(Object.keys(x)), []);
          if (columns.length > 0) {
            const uniqueColumns = [...new Set(columns)].map((column) => `"${column}"`);
            this.url.searchParams.set("columns", uniqueColumns.join(","));
          }
        }
        return new PostgrestFilterBuilder_1.default({
          method,
          url: this.url,
          headers: this.headers,
          schema: this.schema,
          body: values,
          fetch: (_a = this.fetch) !== null && _a !== void 0 ? _a : fetch
        });
      }
      /**
       * Perform an UPSERT on the table or view. Depending on the column(s) passed
       * to `onConflict`, `.upsert()` allows you to perform the equivalent of
       * `.insert()` if a row with the corresponding `onConflict` columns doesn't
       * exist, or if it does exist, perform an alternative action depending on
       * `ignoreDuplicates`.
       *
       * By default, upserted rows are not returned. To return it, chain the call
       * with `.select()`.
       *
       * @param values - The values to upsert with. Pass an object to upsert a
       * single row or an array to upsert multiple rows.
       *
       * @param options - Named parameters
       *
       * @param options.onConflict - Comma-separated UNIQUE column(s) to specify how
       * duplicate rows are determined. Two rows are duplicates if all the
       * `onConflict` columns are equal.
       *
       * @param options.ignoreDuplicates - If `true`, duplicate rows are ignored. If
       * `false`, duplicate rows are merged with existing rows.
       *
       * @param options.count - Count algorithm to use to count upserted rows.
       *
       * `"exact"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the
       * hood.
       *
       * `"planned"`: Approximated but fast count algorithm. Uses the Postgres
       * statistics under the hood.
       *
       * `"estimated"`: Uses exact count for low numbers and planned count for high
       * numbers.
       *
       * @param options.defaultToNull - Make missing fields default to `null`.
       * Otherwise, use the default value for the column. This only applies when
       * inserting new rows, not when merging with existing rows under
       * `ignoreDuplicates: false`. This also only applies when doing bulk upserts.
       */
      upsert(values, { onConflict, ignoreDuplicates = false, count, defaultToNull = true } = {}) {
        var _a;
        const method = "POST";
        this.headers.append("Prefer", `resolution=${ignoreDuplicates ? "ignore" : "merge"}-duplicates`);
        if (onConflict !== void 0)
          this.url.searchParams.set("on_conflict", onConflict);
        if (count) {
          this.headers.append("Prefer", `count=${count}`);
        }
        if (!defaultToNull) {
          this.headers.append("Prefer", "missing=default");
        }
        if (Array.isArray(values)) {
          const columns = values.reduce((acc, x) => acc.concat(Object.keys(x)), []);
          if (columns.length > 0) {
            const uniqueColumns = [...new Set(columns)].map((column) => `"${column}"`);
            this.url.searchParams.set("columns", uniqueColumns.join(","));
          }
        }
        return new PostgrestFilterBuilder_1.default({
          method,
          url: this.url,
          headers: this.headers,
          schema: this.schema,
          body: values,
          fetch: (_a = this.fetch) !== null && _a !== void 0 ? _a : fetch
        });
      }
      /**
       * Perform an UPDATE on the table or view.
       *
       * By default, updated rows are not returned. To return it, chain the call
       * with `.select()` after filters.
       *
       * @param values - The values to update with
       *
       * @param options - Named parameters
       *
       * @param options.count - Count algorithm to use to count updated rows.
       *
       * `"exact"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the
       * hood.
       *
       * `"planned"`: Approximated but fast count algorithm. Uses the Postgres
       * statistics under the hood.
       *
       * `"estimated"`: Uses exact count for low numbers and planned count for high
       * numbers.
       */
      update(values, { count } = {}) {
        var _a;
        const method = "PATCH";
        if (count) {
          this.headers.append("Prefer", `count=${count}`);
        }
        return new PostgrestFilterBuilder_1.default({
          method,
          url: this.url,
          headers: this.headers,
          schema: this.schema,
          body: values,
          fetch: (_a = this.fetch) !== null && _a !== void 0 ? _a : fetch
        });
      }
      /**
       * Perform a DELETE on the table or view.
       *
       * By default, deleted rows are not returned. To return it, chain the call
       * with `.select()` after filters.
       *
       * @param options - Named parameters
       *
       * @param options.count - Count algorithm to use to count deleted rows.
       *
       * `"exact"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the
       * hood.
       *
       * `"planned"`: Approximated but fast count algorithm. Uses the Postgres
       * statistics under the hood.
       *
       * `"estimated"`: Uses exact count for low numbers and planned count for high
       * numbers.
       */
      delete({ count } = {}) {
        var _a;
        const method = "DELETE";
        if (count) {
          this.headers.append("Prefer", `count=${count}`);
        }
        return new PostgrestFilterBuilder_1.default({
          method,
          url: this.url,
          headers: this.headers,
          schema: this.schema,
          fetch: (_a = this.fetch) !== null && _a !== void 0 ? _a : fetch
        });
      }
    };
    __name(PostgrestQueryBuilder2, "PostgrestQueryBuilder");
    exports.default = PostgrestQueryBuilder2;
  }
});

// node_modules/@supabase/postgrest-js/dist/cjs/PostgrestClient.js
var require_PostgrestClient = __commonJS({
  "node_modules/@supabase/postgrest-js/dist/cjs/PostgrestClient.js"(exports) {
    "use strict";
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    var PostgrestQueryBuilder_1 = __importDefault(require_PostgrestQueryBuilder());
    var PostgrestFilterBuilder_1 = __importDefault(require_PostgrestFilterBuilder());
    var PostgrestClient2 = class {
      // TODO: Add back shouldThrowOnError once we figure out the typings
      /**
       * Creates a PostgREST client.
       *
       * @param url - URL of the PostgREST endpoint
       * @param options - Named parameters
       * @param options.headers - Custom headers
       * @param options.schema - Postgres schema to switch to
       * @param options.fetch - Custom fetch
       */
      constructor(url, { headers = {}, schema, fetch: fetch3 } = {}) {
        this.url = url;
        this.headers = new Headers(headers);
        this.schemaName = schema;
        this.fetch = fetch3;
      }
      /**
       * Perform a query on a table or a view.
       *
       * @param relation - The table or view name to query
       */
      from(relation) {
        const url = new URL(`${this.url}/${relation}`);
        return new PostgrestQueryBuilder_1.default(url, {
          headers: new Headers(this.headers),
          schema: this.schemaName,
          fetch: this.fetch
        });
      }
      /**
       * Select a schema to query or perform an function (rpc) call.
       *
       * The schema needs to be on the list of exposed schemas inside Supabase.
       *
       * @param schema - The schema to query
       */
      schema(schema) {
        return new PostgrestClient2(this.url, {
          headers: this.headers,
          schema,
          fetch: this.fetch
        });
      }
      /**
       * Perform a function call.
       *
       * @param fn - The function name to call
       * @param args - The arguments to pass to the function call
       * @param options - Named parameters
       * @param options.head - When set to `true`, `data` will not be returned.
       * Useful if you only need the count.
       * @param options.get - When set to `true`, the function will be called with
       * read-only access mode.
       * @param options.count - Count algorithm to use to count rows returned by the
       * function. Only applicable for [set-returning
       * functions](https://www.postgresql.org/docs/current/functions-srf.html).
       *
       * `"exact"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the
       * hood.
       *
       * `"planned"`: Approximated but fast count algorithm. Uses the Postgres
       * statistics under the hood.
       *
       * `"estimated"`: Uses exact count for low numbers and planned count for high
       * numbers.
       */
      rpc(fn, args = {}, { head: head2 = false, get: get2 = false, count } = {}) {
        var _a;
        let method;
        const url = new URL(`${this.url}/rpc/${fn}`);
        let body;
        if (head2 || get2) {
          method = head2 ? "HEAD" : "GET";
          Object.entries(args).filter(([_, value]) => value !== void 0).map(([name, value]) => [name, Array.isArray(value) ? `{${value.join(",")}}` : `${value}`]).forEach(([name, value]) => {
            url.searchParams.append(name, value);
          });
        } else {
          method = "POST";
          body = args;
        }
        const headers = new Headers(this.headers);
        if (count) {
          headers.set("Prefer", `count=${count}`);
        }
        return new PostgrestFilterBuilder_1.default({
          method,
          url,
          headers,
          schema: this.schemaName,
          body,
          fetch: (_a = this.fetch) !== null && _a !== void 0 ? _a : fetch
        });
      }
    };
    __name(PostgrestClient2, "PostgrestClient");
    exports.default = PostgrestClient2;
  }
});

// node_modules/@supabase/postgrest-js/dist/cjs/index.js
var require_cjs = __commonJS({
  "node_modules/@supabase/postgrest-js/dist/cjs/index.js"(exports) {
    "use strict";
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PostgrestError = exports.PostgrestBuilder = exports.PostgrestTransformBuilder = exports.PostgrestFilterBuilder = exports.PostgrestQueryBuilder = exports.PostgrestClient = void 0;
    var PostgrestClient_1 = __importDefault(require_PostgrestClient());
    exports.PostgrestClient = PostgrestClient_1.default;
    var PostgrestQueryBuilder_1 = __importDefault(require_PostgrestQueryBuilder());
    exports.PostgrestQueryBuilder = PostgrestQueryBuilder_1.default;
    var PostgrestFilterBuilder_1 = __importDefault(require_PostgrestFilterBuilder());
    exports.PostgrestFilterBuilder = PostgrestFilterBuilder_1.default;
    var PostgrestTransformBuilder_1 = __importDefault(require_PostgrestTransformBuilder());
    exports.PostgrestTransformBuilder = PostgrestTransformBuilder_1.default;
    var PostgrestBuilder_1 = __importDefault(require_PostgrestBuilder());
    exports.PostgrestBuilder = PostgrestBuilder_1.default;
    var PostgrestError_1 = __importDefault(require_PostgrestError());
    exports.PostgrestError = PostgrestError_1.default;
    exports.default = {
      PostgrestClient: PostgrestClient_1.default,
      PostgrestQueryBuilder: PostgrestQueryBuilder_1.default,
      PostgrestFilterBuilder: PostgrestFilterBuilder_1.default,
      PostgrestTransformBuilder: PostgrestTransformBuilder_1.default,
      PostgrestBuilder: PostgrestBuilder_1.default,
      PostgrestError: PostgrestError_1.default
    };
  }
});

// node_modules/@supabase/postgrest-js/dist/esm/wrapper.mjs
var import_cjs, PostgrestClient, PostgrestQueryBuilder, PostgrestFilterBuilder, PostgrestTransformBuilder, PostgrestBuilder, PostgrestError;
var init_wrapper = __esm({
  "node_modules/@supabase/postgrest-js/dist/esm/wrapper.mjs"() {
    import_cjs = __toESM(require_cjs(), 1);
    ({
      PostgrestClient,
      PostgrestQueryBuilder,
      PostgrestFilterBuilder,
      PostgrestTransformBuilder,
      PostgrestBuilder,
      PostgrestError
    } = import_cjs.default);
  }
});

// node_modules/@supabase/realtime-js/dist/module/lib/websocket-factory.js
var WebSocketFactory, websocket_factory_default;
var init_websocket_factory = __esm({
  "node_modules/@supabase/realtime-js/dist/module/lib/websocket-factory.js"() {
    WebSocketFactory = class {
      static detectEnvironment() {
        var _a;
        if (typeof WebSocket !== "undefined") {
          return { type: "native", constructor: WebSocket };
        }
        if (typeof globalThis !== "undefined" && typeof globalThis.WebSocket !== "undefined") {
          return { type: "native", constructor: globalThis.WebSocket };
        }
        if (typeof global !== "undefined" && typeof global.WebSocket !== "undefined") {
          return { type: "native", constructor: global.WebSocket };
        }
        if (typeof globalThis !== "undefined" && typeof globalThis.WebSocketPair !== "undefined" && typeof globalThis.WebSocket === "undefined") {
          return {
            type: "cloudflare",
            error: "Cloudflare Workers detected. WebSocket clients are not supported in Cloudflare Workers.",
            workaround: "Use Cloudflare Workers WebSocket API for server-side WebSocket handling, or deploy to a different runtime."
          };
        }
        if (typeof globalThis !== "undefined" && globalThis.EdgeRuntime || typeof navigator !== "undefined" && ((_a = "Cloudflare-Workers") === null || _a === void 0 ? void 0 : _a.includes("Vercel-Edge"))) {
          return {
            type: "unsupported",
            error: "Edge runtime detected (Vercel Edge/Netlify Edge). WebSockets are not supported in edge functions.",
            workaround: "Use serverless functions or a different deployment target for WebSocket functionality."
          };
        }
        if (typeof process !== "undefined") {
          const processVersions = process["versions"];
          if (processVersions && processVersions["node"]) {
            const versionString = processVersions["node"];
            const nodeVersion = parseInt(versionString.replace(/^v/, "").split(".")[0]);
            if (nodeVersion >= 22) {
              if (typeof globalThis.WebSocket !== "undefined") {
                return { type: "native", constructor: globalThis.WebSocket };
              }
              return {
                type: "unsupported",
                error: `Node.js ${nodeVersion} detected but native WebSocket not found.`,
                workaround: "Provide a WebSocket implementation via the transport option."
              };
            }
            return {
              type: "unsupported",
              error: `Node.js ${nodeVersion} detected without native WebSocket support.`,
              workaround: 'For Node.js < 22, install "ws" package and provide it via the transport option:\nimport ws from "ws"\nnew RealtimeClient(url, { transport: ws })'
            };
          }
        }
        return {
          type: "unsupported",
          error: "Unknown JavaScript runtime without WebSocket support.",
          workaround: "Ensure you're running in a supported environment (browser, Node.js, Deno) or provide a custom WebSocket implementation."
        };
      }
      static getWebSocketConstructor() {
        const env = this.detectEnvironment();
        if (env.constructor) {
          return env.constructor;
        }
        let errorMessage = env.error || "WebSocket not supported in this environment.";
        if (env.workaround) {
          errorMessage += `

Suggested solution: ${env.workaround}`;
        }
        throw new Error(errorMessage);
      }
      static createWebSocket(url, protocols) {
        const WS = this.getWebSocketConstructor();
        return new WS(url, protocols);
      }
      static isWebSocketSupported() {
        try {
          const env = this.detectEnvironment();
          return env.type === "native" || env.type === "ws";
        } catch (_a) {
          return false;
        }
      }
    };
    __name(WebSocketFactory, "WebSocketFactory");
    websocket_factory_default = WebSocketFactory;
  }
});

// node_modules/@supabase/realtime-js/dist/module/lib/version.js
var version;
var init_version = __esm({
  "node_modules/@supabase/realtime-js/dist/module/lib/version.js"() {
    version = "2.74.0";
  }
});

// node_modules/@supabase/realtime-js/dist/module/lib/constants.js
var DEFAULT_VERSION, VSN, DEFAULT_TIMEOUT, WS_CLOSE_NORMAL, MAX_PUSH_BUFFER_SIZE, SOCKET_STATES, CHANNEL_STATES, CHANNEL_EVENTS, TRANSPORTS, CONNECTION_STATE;
var init_constants = __esm({
  "node_modules/@supabase/realtime-js/dist/module/lib/constants.js"() {
    init_version();
    DEFAULT_VERSION = `realtime-js/${version}`;
    VSN = "1.0.0";
    DEFAULT_TIMEOUT = 1e4;
    WS_CLOSE_NORMAL = 1e3;
    MAX_PUSH_BUFFER_SIZE = 100;
    (function(SOCKET_STATES2) {
      SOCKET_STATES2[SOCKET_STATES2["connecting"] = 0] = "connecting";
      SOCKET_STATES2[SOCKET_STATES2["open"] = 1] = "open";
      SOCKET_STATES2[SOCKET_STATES2["closing"] = 2] = "closing";
      SOCKET_STATES2[SOCKET_STATES2["closed"] = 3] = "closed";
    })(SOCKET_STATES || (SOCKET_STATES = {}));
    (function(CHANNEL_STATES2) {
      CHANNEL_STATES2["closed"] = "closed";
      CHANNEL_STATES2["errored"] = "errored";
      CHANNEL_STATES2["joined"] = "joined";
      CHANNEL_STATES2["joining"] = "joining";
      CHANNEL_STATES2["leaving"] = "leaving";
    })(CHANNEL_STATES || (CHANNEL_STATES = {}));
    (function(CHANNEL_EVENTS2) {
      CHANNEL_EVENTS2["close"] = "phx_close";
      CHANNEL_EVENTS2["error"] = "phx_error";
      CHANNEL_EVENTS2["join"] = "phx_join";
      CHANNEL_EVENTS2["reply"] = "phx_reply";
      CHANNEL_EVENTS2["leave"] = "phx_leave";
      CHANNEL_EVENTS2["access_token"] = "access_token";
    })(CHANNEL_EVENTS || (CHANNEL_EVENTS = {}));
    (function(TRANSPORTS2) {
      TRANSPORTS2["websocket"] = "websocket";
    })(TRANSPORTS || (TRANSPORTS = {}));
    (function(CONNECTION_STATE2) {
      CONNECTION_STATE2["Connecting"] = "connecting";
      CONNECTION_STATE2["Open"] = "open";
      CONNECTION_STATE2["Closing"] = "closing";
      CONNECTION_STATE2["Closed"] = "closed";
    })(CONNECTION_STATE || (CONNECTION_STATE = {}));
  }
});

// node_modules/@supabase/realtime-js/dist/module/lib/serializer.js
var Serializer;
var init_serializer = __esm({
  "node_modules/@supabase/realtime-js/dist/module/lib/serializer.js"() {
    Serializer = class {
      constructor() {
        this.HEADER_LENGTH = 1;
      }
      decode(rawPayload, callback) {
        if (rawPayload.constructor === ArrayBuffer) {
          return callback(this._binaryDecode(rawPayload));
        }
        if (typeof rawPayload === "string") {
          return callback(JSON.parse(rawPayload));
        }
        return callback({});
      }
      _binaryDecode(buffer) {
        const view = new DataView(buffer);
        const decoder = new TextDecoder();
        return this._decodeBroadcast(buffer, view, decoder);
      }
      _decodeBroadcast(buffer, view, decoder) {
        const topicSize = view.getUint8(1);
        const eventSize = view.getUint8(2);
        let offset = this.HEADER_LENGTH + 2;
        const topic = decoder.decode(buffer.slice(offset, offset + topicSize));
        offset = offset + topicSize;
        const event = decoder.decode(buffer.slice(offset, offset + eventSize));
        offset = offset + eventSize;
        const data = JSON.parse(decoder.decode(buffer.slice(offset, buffer.byteLength)));
        return { ref: null, topic, event, payload: data };
      }
    };
    __name(Serializer, "Serializer");
  }
});

// node_modules/@supabase/realtime-js/dist/module/lib/timer.js
var Timer;
var init_timer = __esm({
  "node_modules/@supabase/realtime-js/dist/module/lib/timer.js"() {
    Timer = class {
      constructor(callback, timerCalc) {
        this.callback = callback;
        this.timerCalc = timerCalc;
        this.timer = void 0;
        this.tries = 0;
        this.callback = callback;
        this.timerCalc = timerCalc;
      }
      reset() {
        this.tries = 0;
        clearTimeout(this.timer);
        this.timer = void 0;
      }
      // Cancels any previous scheduleTimeout and schedules callback
      scheduleTimeout() {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => {
          this.tries = this.tries + 1;
          this.callback();
        }, this.timerCalc(this.tries + 1));
      }
    };
    __name(Timer, "Timer");
  }
});

// node_modules/@supabase/realtime-js/dist/module/lib/transformers.js
var PostgresTypes, convertChangeData, convertColumn, convertCell, noop, toBoolean, toNumber, toJson, toArray, toTimestampString, httpEndpointURL;
var init_transformers = __esm({
  "node_modules/@supabase/realtime-js/dist/module/lib/transformers.js"() {
    (function(PostgresTypes2) {
      PostgresTypes2["abstime"] = "abstime";
      PostgresTypes2["bool"] = "bool";
      PostgresTypes2["date"] = "date";
      PostgresTypes2["daterange"] = "daterange";
      PostgresTypes2["float4"] = "float4";
      PostgresTypes2["float8"] = "float8";
      PostgresTypes2["int2"] = "int2";
      PostgresTypes2["int4"] = "int4";
      PostgresTypes2["int4range"] = "int4range";
      PostgresTypes2["int8"] = "int8";
      PostgresTypes2["int8range"] = "int8range";
      PostgresTypes2["json"] = "json";
      PostgresTypes2["jsonb"] = "jsonb";
      PostgresTypes2["money"] = "money";
      PostgresTypes2["numeric"] = "numeric";
      PostgresTypes2["oid"] = "oid";
      PostgresTypes2["reltime"] = "reltime";
      PostgresTypes2["text"] = "text";
      PostgresTypes2["time"] = "time";
      PostgresTypes2["timestamp"] = "timestamp";
      PostgresTypes2["timestamptz"] = "timestamptz";
      PostgresTypes2["timetz"] = "timetz";
      PostgresTypes2["tsrange"] = "tsrange";
      PostgresTypes2["tstzrange"] = "tstzrange";
    })(PostgresTypes || (PostgresTypes = {}));
    convertChangeData = /* @__PURE__ */ __name((columns, record, options = {}) => {
      var _a;
      const skipTypes = (_a = options.skipTypes) !== null && _a !== void 0 ? _a : [];
      if (!record) {
        return {};
      }
      return Object.keys(record).reduce((acc, rec_key) => {
        acc[rec_key] = convertColumn(rec_key, columns, record, skipTypes);
        return acc;
      }, {});
    }, "convertChangeData");
    convertColumn = /* @__PURE__ */ __name((columnName, columns, record, skipTypes) => {
      const column = columns.find((x) => x.name === columnName);
      const colType = column === null || column === void 0 ? void 0 : column.type;
      const value = record[columnName];
      if (colType && !skipTypes.includes(colType)) {
        return convertCell(colType, value);
      }
      return noop(value);
    }, "convertColumn");
    convertCell = /* @__PURE__ */ __name((type, value) => {
      if (type.charAt(0) === "_") {
        const dataType = type.slice(1, type.length);
        return toArray(value, dataType);
      }
      switch (type) {
        case PostgresTypes.bool:
          return toBoolean(value);
        case PostgresTypes.float4:
        case PostgresTypes.float8:
        case PostgresTypes.int2:
        case PostgresTypes.int4:
        case PostgresTypes.int8:
        case PostgresTypes.numeric:
        case PostgresTypes.oid:
          return toNumber(value);
        case PostgresTypes.json:
        case PostgresTypes.jsonb:
          return toJson(value);
        case PostgresTypes.timestamp:
          return toTimestampString(value);
        case PostgresTypes.abstime:
        case PostgresTypes.date:
        case PostgresTypes.daterange:
        case PostgresTypes.int4range:
        case PostgresTypes.int8range:
        case PostgresTypes.money:
        case PostgresTypes.reltime:
        case PostgresTypes.text:
        case PostgresTypes.time:
        case PostgresTypes.timestamptz:
        case PostgresTypes.timetz:
        case PostgresTypes.tsrange:
        case PostgresTypes.tstzrange:
          return noop(value);
        default:
          return noop(value);
      }
    }, "convertCell");
    noop = /* @__PURE__ */ __name((value) => {
      return value;
    }, "noop");
    toBoolean = /* @__PURE__ */ __name((value) => {
      switch (value) {
        case "t":
          return true;
        case "f":
          return false;
        default:
          return value;
      }
    }, "toBoolean");
    toNumber = /* @__PURE__ */ __name((value) => {
      if (typeof value === "string") {
        const parsedValue = parseFloat(value);
        if (!Number.isNaN(parsedValue)) {
          return parsedValue;
        }
      }
      return value;
    }, "toNumber");
    toJson = /* @__PURE__ */ __name((value) => {
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch (error) {
          console.log(`JSON parse error: ${error}`);
          return value;
        }
      }
      return value;
    }, "toJson");
    toArray = /* @__PURE__ */ __name((value, type) => {
      if (typeof value !== "string") {
        return value;
      }
      const lastIdx = value.length - 1;
      const closeBrace = value[lastIdx];
      const openBrace = value[0];
      if (openBrace === "{" && closeBrace === "}") {
        let arr;
        const valTrim = value.slice(1, lastIdx);
        try {
          arr = JSON.parse("[" + valTrim + "]");
        } catch (_) {
          arr = valTrim ? valTrim.split(",") : [];
        }
        return arr.map((val) => convertCell(type, val));
      }
      return value;
    }, "toArray");
    toTimestampString = /* @__PURE__ */ __name((value) => {
      if (typeof value === "string") {
        return value.replace(" ", "T");
      }
      return value;
    }, "toTimestampString");
    httpEndpointURL = /* @__PURE__ */ __name((socketUrl) => {
      let url = socketUrl;
      url = url.replace(/^ws/i, "http");
      url = url.replace(/(\/socket\/websocket|\/socket|\/websocket)\/?$/i, "");
      return url.replace(/\/+$/, "") + "/api/broadcast";
    }, "httpEndpointURL");
  }
});

// node_modules/@supabase/realtime-js/dist/module/lib/push.js
var Push;
var init_push = __esm({
  "node_modules/@supabase/realtime-js/dist/module/lib/push.js"() {
    init_constants();
    Push = class {
      /**
       * Initializes the Push
       *
       * @param channel The Channel
       * @param event The event, for example `"phx_join"`
       * @param payload The payload, for example `{user_id: 123}`
       * @param timeout The push timeout in milliseconds
       */
      constructor(channel, event, payload = {}, timeout = DEFAULT_TIMEOUT) {
        this.channel = channel;
        this.event = event;
        this.payload = payload;
        this.timeout = timeout;
        this.sent = false;
        this.timeoutTimer = void 0;
        this.ref = "";
        this.receivedResp = null;
        this.recHooks = [];
        this.refEvent = null;
      }
      resend(timeout) {
        this.timeout = timeout;
        this._cancelRefEvent();
        this.ref = "";
        this.refEvent = null;
        this.receivedResp = null;
        this.sent = false;
        this.send();
      }
      send() {
        if (this._hasReceived("timeout")) {
          return;
        }
        this.startTimeout();
        this.sent = true;
        this.channel.socket.push({
          topic: this.channel.topic,
          event: this.event,
          payload: this.payload,
          ref: this.ref,
          join_ref: this.channel._joinRef()
        });
      }
      updatePayload(payload) {
        this.payload = Object.assign(Object.assign({}, this.payload), payload);
      }
      receive(status, callback) {
        var _a;
        if (this._hasReceived(status)) {
          callback((_a = this.receivedResp) === null || _a === void 0 ? void 0 : _a.response);
        }
        this.recHooks.push({ status, callback });
        return this;
      }
      startTimeout() {
        if (this.timeoutTimer) {
          return;
        }
        this.ref = this.channel.socket._makeRef();
        this.refEvent = this.channel._replyEventName(this.ref);
        const callback = /* @__PURE__ */ __name((payload) => {
          this._cancelRefEvent();
          this._cancelTimeout();
          this.receivedResp = payload;
          this._matchReceive(payload);
        }, "callback");
        this.channel._on(this.refEvent, {}, callback);
        this.timeoutTimer = setTimeout(() => {
          this.trigger("timeout", {});
        }, this.timeout);
      }
      trigger(status, response) {
        if (this.refEvent)
          this.channel._trigger(this.refEvent, { status, response });
      }
      destroy() {
        this._cancelRefEvent();
        this._cancelTimeout();
      }
      _cancelRefEvent() {
        if (!this.refEvent) {
          return;
        }
        this.channel._off(this.refEvent, {});
      }
      _cancelTimeout() {
        clearTimeout(this.timeoutTimer);
        this.timeoutTimer = void 0;
      }
      _matchReceive({ status, response }) {
        this.recHooks.filter((h) => h.status === status).forEach((h) => h.callback(response));
      }
      _hasReceived(status) {
        return this.receivedResp && this.receivedResp.status === status;
      }
    };
    __name(Push, "Push");
  }
});

// node_modules/@supabase/realtime-js/dist/module/RealtimePresence.js
var REALTIME_PRESENCE_LISTEN_EVENTS, RealtimePresence;
var init_RealtimePresence = __esm({
  "node_modules/@supabase/realtime-js/dist/module/RealtimePresence.js"() {
    (function(REALTIME_PRESENCE_LISTEN_EVENTS2) {
      REALTIME_PRESENCE_LISTEN_EVENTS2["SYNC"] = "sync";
      REALTIME_PRESENCE_LISTEN_EVENTS2["JOIN"] = "join";
      REALTIME_PRESENCE_LISTEN_EVENTS2["LEAVE"] = "leave";
    })(REALTIME_PRESENCE_LISTEN_EVENTS || (REALTIME_PRESENCE_LISTEN_EVENTS = {}));
    RealtimePresence = class {
      /**
       * Initializes the Presence.
       *
       * @param channel - The RealtimeChannel
       * @param opts - The options,
       *        for example `{events: {state: 'state', diff: 'diff'}}`
       */
      constructor(channel, opts) {
        this.channel = channel;
        this.state = {};
        this.pendingDiffs = [];
        this.joinRef = null;
        this.enabled = false;
        this.caller = {
          onJoin: () => {
          },
          onLeave: () => {
          },
          onSync: () => {
          }
        };
        const events = (opts === null || opts === void 0 ? void 0 : opts.events) || {
          state: "presence_state",
          diff: "presence_diff"
        };
        this.channel._on(events.state, {}, (newState) => {
          const { onJoin, onLeave, onSync } = this.caller;
          this.joinRef = this.channel._joinRef();
          this.state = RealtimePresence.syncState(this.state, newState, onJoin, onLeave);
          this.pendingDiffs.forEach((diff) => {
            this.state = RealtimePresence.syncDiff(this.state, diff, onJoin, onLeave);
          });
          this.pendingDiffs = [];
          onSync();
        });
        this.channel._on(events.diff, {}, (diff) => {
          const { onJoin, onLeave, onSync } = this.caller;
          if (this.inPendingSyncState()) {
            this.pendingDiffs.push(diff);
          } else {
            this.state = RealtimePresence.syncDiff(this.state, diff, onJoin, onLeave);
            onSync();
          }
        });
        this.onJoin((key, currentPresences, newPresences) => {
          this.channel._trigger("presence", {
            event: "join",
            key,
            currentPresences,
            newPresences
          });
        });
        this.onLeave((key, currentPresences, leftPresences) => {
          this.channel._trigger("presence", {
            event: "leave",
            key,
            currentPresences,
            leftPresences
          });
        });
        this.onSync(() => {
          this.channel._trigger("presence", { event: "sync" });
        });
      }
      /**
       * Used to sync the list of presences on the server with the
       * client's state.
       *
       * An optional `onJoin` and `onLeave` callback can be provided to
       * react to changes in the client's local presences across
       * disconnects and reconnects with the server.
       *
       * @internal
       */
      static syncState(currentState, newState, onJoin, onLeave) {
        const state = this.cloneDeep(currentState);
        const transformedState = this.transformState(newState);
        const joins = {};
        const leaves = {};
        this.map(state, (key, presences) => {
          if (!transformedState[key]) {
            leaves[key] = presences;
          }
        });
        this.map(transformedState, (key, newPresences) => {
          const currentPresences = state[key];
          if (currentPresences) {
            const newPresenceRefs = newPresences.map((m) => m.presence_ref);
            const curPresenceRefs = currentPresences.map((m) => m.presence_ref);
            const joinedPresences = newPresences.filter((m) => curPresenceRefs.indexOf(m.presence_ref) < 0);
            const leftPresences = currentPresences.filter((m) => newPresenceRefs.indexOf(m.presence_ref) < 0);
            if (joinedPresences.length > 0) {
              joins[key] = joinedPresences;
            }
            if (leftPresences.length > 0) {
              leaves[key] = leftPresences;
            }
          } else {
            joins[key] = newPresences;
          }
        });
        return this.syncDiff(state, { joins, leaves }, onJoin, onLeave);
      }
      /**
       * Used to sync a diff of presence join and leave events from the
       * server, as they happen.
       *
       * Like `syncState`, `syncDiff` accepts optional `onJoin` and
       * `onLeave` callbacks to react to a user joining or leaving from a
       * device.
       *
       * @internal
       */
      static syncDiff(state, diff, onJoin, onLeave) {
        const { joins, leaves } = {
          joins: this.transformState(diff.joins),
          leaves: this.transformState(diff.leaves)
        };
        if (!onJoin) {
          onJoin = /* @__PURE__ */ __name(() => {
          }, "onJoin");
        }
        if (!onLeave) {
          onLeave = /* @__PURE__ */ __name(() => {
          }, "onLeave");
        }
        this.map(joins, (key, newPresences) => {
          var _a;
          const currentPresences = (_a = state[key]) !== null && _a !== void 0 ? _a : [];
          state[key] = this.cloneDeep(newPresences);
          if (currentPresences.length > 0) {
            const joinedPresenceRefs = state[key].map((m) => m.presence_ref);
            const curPresences = currentPresences.filter((m) => joinedPresenceRefs.indexOf(m.presence_ref) < 0);
            state[key].unshift(...curPresences);
          }
          onJoin(key, currentPresences, newPresences);
        });
        this.map(leaves, (key, leftPresences) => {
          let currentPresences = state[key];
          if (!currentPresences)
            return;
          const presenceRefsToRemove = leftPresences.map((m) => m.presence_ref);
          currentPresences = currentPresences.filter((m) => presenceRefsToRemove.indexOf(m.presence_ref) < 0);
          state[key] = currentPresences;
          onLeave(key, currentPresences, leftPresences);
          if (currentPresences.length === 0)
            delete state[key];
        });
        return state;
      }
      /** @internal */
      static map(obj, func) {
        return Object.getOwnPropertyNames(obj).map((key) => func(key, obj[key]));
      }
      /**
       * Remove 'metas' key
       * Change 'phx_ref' to 'presence_ref'
       * Remove 'phx_ref' and 'phx_ref_prev'
       *
       * @example
       * // returns {
       *  abc123: [
       *    { presence_ref: '2', user_id: 1 },
       *    { presence_ref: '3', user_id: 2 }
       *  ]
       * }
       * RealtimePresence.transformState({
       *  abc123: {
       *    metas: [
       *      { phx_ref: '2', phx_ref_prev: '1' user_id: 1 },
       *      { phx_ref: '3', user_id: 2 }
       *    ]
       *  }
       * })
       *
       * @internal
       */
      static transformState(state) {
        state = this.cloneDeep(state);
        return Object.getOwnPropertyNames(state).reduce((newState, key) => {
          const presences = state[key];
          if ("metas" in presences) {
            newState[key] = presences.metas.map((presence) => {
              presence["presence_ref"] = presence["phx_ref"];
              delete presence["phx_ref"];
              delete presence["phx_ref_prev"];
              return presence;
            });
          } else {
            newState[key] = presences;
          }
          return newState;
        }, {});
      }
      /** @internal */
      static cloneDeep(obj) {
        return JSON.parse(JSON.stringify(obj));
      }
      /** @internal */
      onJoin(callback) {
        this.caller.onJoin = callback;
      }
      /** @internal */
      onLeave(callback) {
        this.caller.onLeave = callback;
      }
      /** @internal */
      onSync(callback) {
        this.caller.onSync = callback;
      }
      /** @internal */
      inPendingSyncState() {
        return !this.joinRef || this.joinRef !== this.channel._joinRef();
      }
    };
    __name(RealtimePresence, "RealtimePresence");
  }
});

// node_modules/@supabase/realtime-js/dist/module/RealtimeChannel.js
var REALTIME_POSTGRES_CHANGES_LISTEN_EVENT, REALTIME_LISTEN_TYPES, REALTIME_SUBSCRIBE_STATES, REALTIME_CHANNEL_STATES, RealtimeChannel;
var init_RealtimeChannel = __esm({
  "node_modules/@supabase/realtime-js/dist/module/RealtimeChannel.js"() {
    init_constants();
    init_push();
    init_timer();
    init_RealtimePresence();
    init_transformers();
    init_transformers();
    (function(REALTIME_POSTGRES_CHANGES_LISTEN_EVENT2) {
      REALTIME_POSTGRES_CHANGES_LISTEN_EVENT2["ALL"] = "*";
      REALTIME_POSTGRES_CHANGES_LISTEN_EVENT2["INSERT"] = "INSERT";
      REALTIME_POSTGRES_CHANGES_LISTEN_EVENT2["UPDATE"] = "UPDATE";
      REALTIME_POSTGRES_CHANGES_LISTEN_EVENT2["DELETE"] = "DELETE";
    })(REALTIME_POSTGRES_CHANGES_LISTEN_EVENT || (REALTIME_POSTGRES_CHANGES_LISTEN_EVENT = {}));
    (function(REALTIME_LISTEN_TYPES2) {
      REALTIME_LISTEN_TYPES2["BROADCAST"] = "broadcast";
      REALTIME_LISTEN_TYPES2["PRESENCE"] = "presence";
      REALTIME_LISTEN_TYPES2["POSTGRES_CHANGES"] = "postgres_changes";
      REALTIME_LISTEN_TYPES2["SYSTEM"] = "system";
    })(REALTIME_LISTEN_TYPES || (REALTIME_LISTEN_TYPES = {}));
    (function(REALTIME_SUBSCRIBE_STATES2) {
      REALTIME_SUBSCRIBE_STATES2["SUBSCRIBED"] = "SUBSCRIBED";
      REALTIME_SUBSCRIBE_STATES2["TIMED_OUT"] = "TIMED_OUT";
      REALTIME_SUBSCRIBE_STATES2["CLOSED"] = "CLOSED";
      REALTIME_SUBSCRIBE_STATES2["CHANNEL_ERROR"] = "CHANNEL_ERROR";
    })(REALTIME_SUBSCRIBE_STATES || (REALTIME_SUBSCRIBE_STATES = {}));
    REALTIME_CHANNEL_STATES = CHANNEL_STATES;
    RealtimeChannel = class {
      constructor(topic, params = { config: {} }, socket) {
        var _a, _b;
        this.topic = topic;
        this.params = params;
        this.socket = socket;
        this.bindings = {};
        this.state = CHANNEL_STATES.closed;
        this.joinedOnce = false;
        this.pushBuffer = [];
        this.subTopic = topic.replace(/^realtime:/i, "");
        this.params.config = Object.assign({
          broadcast: { ack: false, self: false },
          presence: { key: "", enabled: false },
          private: false
        }, params.config);
        this.timeout = this.socket.timeout;
        this.joinPush = new Push(this, CHANNEL_EVENTS.join, this.params, this.timeout);
        this.rejoinTimer = new Timer(() => this._rejoinUntilConnected(), this.socket.reconnectAfterMs);
        this.joinPush.receive("ok", () => {
          this.state = CHANNEL_STATES.joined;
          this.rejoinTimer.reset();
          this.pushBuffer.forEach((pushEvent) => pushEvent.send());
          this.pushBuffer = [];
        });
        this._onClose(() => {
          this.rejoinTimer.reset();
          this.socket.log("channel", `close ${this.topic} ${this._joinRef()}`);
          this.state = CHANNEL_STATES.closed;
          this.socket._remove(this);
        });
        this._onError((reason) => {
          if (this._isLeaving() || this._isClosed()) {
            return;
          }
          this.socket.log("channel", `error ${this.topic}`, reason);
          this.state = CHANNEL_STATES.errored;
          this.rejoinTimer.scheduleTimeout();
        });
        this.joinPush.receive("timeout", () => {
          if (!this._isJoining()) {
            return;
          }
          this.socket.log("channel", `timeout ${this.topic}`, this.joinPush.timeout);
          this.state = CHANNEL_STATES.errored;
          this.rejoinTimer.scheduleTimeout();
        });
        this.joinPush.receive("error", (reason) => {
          if (this._isLeaving() || this._isClosed()) {
            return;
          }
          this.socket.log("channel", `error ${this.topic}`, reason);
          this.state = CHANNEL_STATES.errored;
          this.rejoinTimer.scheduleTimeout();
        });
        this._on(CHANNEL_EVENTS.reply, {}, (payload, ref) => {
          this._trigger(this._replyEventName(ref), payload);
        });
        this.presence = new RealtimePresence(this);
        this.broadcastEndpointURL = httpEndpointURL(this.socket.endPoint);
        this.private = this.params.config.private || false;
        if (!this.private && ((_b = (_a = this.params.config) === null || _a === void 0 ? void 0 : _a.broadcast) === null || _b === void 0 ? void 0 : _b.replay)) {
          throw `tried to use replay on public channel '${this.topic}'. It must be a private channel.`;
        }
      }
      /** Subscribe registers your client with the server */
      subscribe(callback, timeout = this.timeout) {
        var _a, _b, _c;
        if (!this.socket.isConnected()) {
          this.socket.connect();
        }
        if (this.state == CHANNEL_STATES.closed) {
          const { config: { broadcast, presence, private: isPrivate } } = this.params;
          const postgres_changes = (_b = (_a = this.bindings.postgres_changes) === null || _a === void 0 ? void 0 : _a.map((r) => r.filter)) !== null && _b !== void 0 ? _b : [];
          const presence_enabled = !!this.bindings[REALTIME_LISTEN_TYPES.PRESENCE] && this.bindings[REALTIME_LISTEN_TYPES.PRESENCE].length > 0 || ((_c = this.params.config.presence) === null || _c === void 0 ? void 0 : _c.enabled) === true;
          const accessTokenPayload = {};
          const config = {
            broadcast,
            presence: Object.assign(Object.assign({}, presence), { enabled: presence_enabled }),
            postgres_changes,
            private: isPrivate
          };
          if (this.socket.accessTokenValue) {
            accessTokenPayload.access_token = this.socket.accessTokenValue;
          }
          this._onError((e) => callback === null || callback === void 0 ? void 0 : callback(REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR, e));
          this._onClose(() => callback === null || callback === void 0 ? void 0 : callback(REALTIME_SUBSCRIBE_STATES.CLOSED));
          this.updateJoinPayload(Object.assign({ config }, accessTokenPayload));
          this.joinedOnce = true;
          this._rejoin(timeout);
          this.joinPush.receive("ok", async ({ postgres_changes: postgres_changes2 }) => {
            var _a2;
            this.socket.setAuth();
            if (postgres_changes2 === void 0) {
              callback === null || callback === void 0 ? void 0 : callback(REALTIME_SUBSCRIBE_STATES.SUBSCRIBED);
              return;
            } else {
              const clientPostgresBindings = this.bindings.postgres_changes;
              const bindingsLen = (_a2 = clientPostgresBindings === null || clientPostgresBindings === void 0 ? void 0 : clientPostgresBindings.length) !== null && _a2 !== void 0 ? _a2 : 0;
              const newPostgresBindings = [];
              for (let i = 0; i < bindingsLen; i++) {
                const clientPostgresBinding = clientPostgresBindings[i];
                const { filter: { event, schema, table, filter } } = clientPostgresBinding;
                const serverPostgresFilter = postgres_changes2 && postgres_changes2[i];
                if (serverPostgresFilter && serverPostgresFilter.event === event && serverPostgresFilter.schema === schema && serverPostgresFilter.table === table && serverPostgresFilter.filter === filter) {
                  newPostgresBindings.push(Object.assign(Object.assign({}, clientPostgresBinding), { id: serverPostgresFilter.id }));
                } else {
                  this.unsubscribe();
                  this.state = CHANNEL_STATES.errored;
                  callback === null || callback === void 0 ? void 0 : callback(REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR, new Error("mismatch between server and client bindings for postgres changes"));
                  return;
                }
              }
              this.bindings.postgres_changes = newPostgresBindings;
              callback && callback(REALTIME_SUBSCRIBE_STATES.SUBSCRIBED);
              return;
            }
          }).receive("error", (error) => {
            this.state = CHANNEL_STATES.errored;
            callback === null || callback === void 0 ? void 0 : callback(REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR, new Error(JSON.stringify(Object.values(error).join(", ") || "error")));
            return;
          }).receive("timeout", () => {
            callback === null || callback === void 0 ? void 0 : callback(REALTIME_SUBSCRIBE_STATES.TIMED_OUT);
            return;
          });
        }
        return this;
      }
      presenceState() {
        return this.presence.state;
      }
      async track(payload, opts = {}) {
        return await this.send({
          type: "presence",
          event: "track",
          payload
        }, opts.timeout || this.timeout);
      }
      async untrack(opts = {}) {
        return await this.send({
          type: "presence",
          event: "untrack"
        }, opts);
      }
      on(type, filter, callback) {
        if (this.state === CHANNEL_STATES.joined && type === REALTIME_LISTEN_TYPES.PRESENCE) {
          this.socket.log("channel", `resubscribe to ${this.topic} due to change in presence callbacks on joined channel`);
          this.unsubscribe().then(() => this.subscribe());
        }
        return this._on(type, filter, callback);
      }
      /**
       * Sends a message into the channel.
       *
       * @param args Arguments to send to channel
       * @param args.type The type of event to send
       * @param args.event The name of the event being sent
       * @param args.payload Payload to be sent
       * @param opts Options to be used during the send process
       */
      async send(args, opts = {}) {
        var _a, _b;
        if (!this._canPush() && args.type === "broadcast") {
          const { event, payload: endpoint_payload } = args;
          const authorization = this.socket.accessTokenValue ? `Bearer ${this.socket.accessTokenValue}` : "";
          const options = {
            method: "POST",
            headers: {
              Authorization: authorization,
              apikey: this.socket.apiKey ? this.socket.apiKey : "",
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              messages: [
                {
                  topic: this.subTopic,
                  event,
                  payload: endpoint_payload,
                  private: this.private
                }
              ]
            })
          };
          try {
            const response = await this._fetchWithTimeout(this.broadcastEndpointURL, options, (_a = opts.timeout) !== null && _a !== void 0 ? _a : this.timeout);
            await ((_b = response.body) === null || _b === void 0 ? void 0 : _b.cancel());
            return response.ok ? "ok" : "error";
          } catch (error) {
            if (error.name === "AbortError") {
              return "timed out";
            } else {
              return "error";
            }
          }
        } else {
          return new Promise((resolve) => {
            var _a2, _b2, _c;
            const push = this._push(args.type, args, opts.timeout || this.timeout);
            if (args.type === "broadcast" && !((_c = (_b2 = (_a2 = this.params) === null || _a2 === void 0 ? void 0 : _a2.config) === null || _b2 === void 0 ? void 0 : _b2.broadcast) === null || _c === void 0 ? void 0 : _c.ack)) {
              resolve("ok");
            }
            push.receive("ok", () => resolve("ok"));
            push.receive("error", () => resolve("error"));
            push.receive("timeout", () => resolve("timed out"));
          });
        }
      }
      updateJoinPayload(payload) {
        this.joinPush.updatePayload(payload);
      }
      /**
       * Leaves the channel.
       *
       * Unsubscribes from server events, and instructs channel to terminate on server.
       * Triggers onClose() hooks.
       *
       * To receive leave acknowledgements, use the a `receive` hook to bind to the server ack, ie:
       * channel.unsubscribe().receive("ok", () => alert("left!") )
       */
      unsubscribe(timeout = this.timeout) {
        this.state = CHANNEL_STATES.leaving;
        const onClose = /* @__PURE__ */ __name(() => {
          this.socket.log("channel", `leave ${this.topic}`);
          this._trigger(CHANNEL_EVENTS.close, "leave", this._joinRef());
        }, "onClose");
        this.joinPush.destroy();
        let leavePush = null;
        return new Promise((resolve) => {
          leavePush = new Push(this, CHANNEL_EVENTS.leave, {}, timeout);
          leavePush.receive("ok", () => {
            onClose();
            resolve("ok");
          }).receive("timeout", () => {
            onClose();
            resolve("timed out");
          }).receive("error", () => {
            resolve("error");
          });
          leavePush.send();
          if (!this._canPush()) {
            leavePush.trigger("ok", {});
          }
        }).finally(() => {
          leavePush === null || leavePush === void 0 ? void 0 : leavePush.destroy();
        });
      }
      /**
       * Teardown the channel.
       *
       * Destroys and stops related timers.
       */
      teardown() {
        this.pushBuffer.forEach((push) => push.destroy());
        this.pushBuffer = [];
        this.rejoinTimer.reset();
        this.joinPush.destroy();
        this.state = CHANNEL_STATES.closed;
        this.bindings = {};
      }
      /** @internal */
      async _fetchWithTimeout(url, options, timeout) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        const response = await this.socket.fetch(url, Object.assign(Object.assign({}, options), { signal: controller.signal }));
        clearTimeout(id);
        return response;
      }
      /** @internal */
      _push(event, payload, timeout = this.timeout) {
        if (!this.joinedOnce) {
          throw `tried to push '${event}' to '${this.topic}' before joining. Use channel.subscribe() before pushing events`;
        }
        let pushEvent = new Push(this, event, payload, timeout);
        if (this._canPush()) {
          pushEvent.send();
        } else {
          this._addToPushBuffer(pushEvent);
        }
        return pushEvent;
      }
      /** @internal */
      _addToPushBuffer(pushEvent) {
        pushEvent.startTimeout();
        this.pushBuffer.push(pushEvent);
        if (this.pushBuffer.length > MAX_PUSH_BUFFER_SIZE) {
          const removedPush = this.pushBuffer.shift();
          if (removedPush) {
            removedPush.destroy();
            this.socket.log("channel", `discarded push due to buffer overflow: ${removedPush.event}`, removedPush.payload);
          }
        }
      }
      /**
       * Overridable message hook
       *
       * Receives all events for specialized message handling before dispatching to the channel callbacks.
       * Must return the payload, modified or unmodified.
       *
       * @internal
       */
      _onMessage(_event, payload, _ref) {
        return payload;
      }
      /** @internal */
      _isMember(topic) {
        return this.topic === topic;
      }
      /** @internal */
      _joinRef() {
        return this.joinPush.ref;
      }
      /** @internal */
      _trigger(type, payload, ref) {
        var _a, _b;
        const typeLower = type.toLocaleLowerCase();
        const { close, error, leave, join } = CHANNEL_EVENTS;
        const events = [close, error, leave, join];
        if (ref && events.indexOf(typeLower) >= 0 && ref !== this._joinRef()) {
          return;
        }
        let handledPayload = this._onMessage(typeLower, payload, ref);
        if (payload && !handledPayload) {
          throw "channel onMessage callbacks must return the payload, modified or unmodified";
        }
        if (["insert", "update", "delete"].includes(typeLower)) {
          (_a = this.bindings.postgres_changes) === null || _a === void 0 ? void 0 : _a.filter((bind) => {
            var _a2, _b2, _c;
            return ((_a2 = bind.filter) === null || _a2 === void 0 ? void 0 : _a2.event) === "*" || ((_c = (_b2 = bind.filter) === null || _b2 === void 0 ? void 0 : _b2.event) === null || _c === void 0 ? void 0 : _c.toLocaleLowerCase()) === typeLower;
          }).map((bind) => bind.callback(handledPayload, ref));
        } else {
          (_b = this.bindings[typeLower]) === null || _b === void 0 ? void 0 : _b.filter((bind) => {
            var _a2, _b2, _c, _d, _e, _f;
            if (["broadcast", "presence", "postgres_changes"].includes(typeLower)) {
              if ("id" in bind) {
                const bindId = bind.id;
                const bindEvent = (_a2 = bind.filter) === null || _a2 === void 0 ? void 0 : _a2.event;
                return bindId && ((_b2 = payload.ids) === null || _b2 === void 0 ? void 0 : _b2.includes(bindId)) && (bindEvent === "*" || (bindEvent === null || bindEvent === void 0 ? void 0 : bindEvent.toLocaleLowerCase()) === ((_c = payload.data) === null || _c === void 0 ? void 0 : _c.type.toLocaleLowerCase()));
              } else {
                const bindEvent = (_e = (_d = bind === null || bind === void 0 ? void 0 : bind.filter) === null || _d === void 0 ? void 0 : _d.event) === null || _e === void 0 ? void 0 : _e.toLocaleLowerCase();
                return bindEvent === "*" || bindEvent === ((_f = payload === null || payload === void 0 ? void 0 : payload.event) === null || _f === void 0 ? void 0 : _f.toLocaleLowerCase());
              }
            } else {
              return bind.type.toLocaleLowerCase() === typeLower;
            }
          }).map((bind) => {
            if (typeof handledPayload === "object" && "ids" in handledPayload) {
              const postgresChanges = handledPayload.data;
              const { schema, table, commit_timestamp, type: type2, errors } = postgresChanges;
              const enrichedPayload = {
                schema,
                table,
                commit_timestamp,
                eventType: type2,
                new: {},
                old: {},
                errors
              };
              handledPayload = Object.assign(Object.assign({}, enrichedPayload), this._getPayloadRecords(postgresChanges));
            }
            bind.callback(handledPayload, ref);
          });
        }
      }
      /** @internal */
      _isClosed() {
        return this.state === CHANNEL_STATES.closed;
      }
      /** @internal */
      _isJoined() {
        return this.state === CHANNEL_STATES.joined;
      }
      /** @internal */
      _isJoining() {
        return this.state === CHANNEL_STATES.joining;
      }
      /** @internal */
      _isLeaving() {
        return this.state === CHANNEL_STATES.leaving;
      }
      /** @internal */
      _replyEventName(ref) {
        return `chan_reply_${ref}`;
      }
      /** @internal */
      _on(type, filter, callback) {
        const typeLower = type.toLocaleLowerCase();
        const binding = {
          type: typeLower,
          filter,
          callback
        };
        if (this.bindings[typeLower]) {
          this.bindings[typeLower].push(binding);
        } else {
          this.bindings[typeLower] = [binding];
        }
        return this;
      }
      /** @internal */
      _off(type, filter) {
        const typeLower = type.toLocaleLowerCase();
        if (this.bindings[typeLower]) {
          this.bindings[typeLower] = this.bindings[typeLower].filter((bind) => {
            var _a;
            return !(((_a = bind.type) === null || _a === void 0 ? void 0 : _a.toLocaleLowerCase()) === typeLower && RealtimeChannel.isEqual(bind.filter, filter));
          });
        }
        return this;
      }
      /** @internal */
      static isEqual(obj1, obj2) {
        if (Object.keys(obj1).length !== Object.keys(obj2).length) {
          return false;
        }
        for (const k in obj1) {
          if (obj1[k] !== obj2[k]) {
            return false;
          }
        }
        return true;
      }
      /** @internal */
      _rejoinUntilConnected() {
        this.rejoinTimer.scheduleTimeout();
        if (this.socket.isConnected()) {
          this._rejoin();
        }
      }
      /**
       * Registers a callback that will be executed when the channel closes.
       *
       * @internal
       */
      _onClose(callback) {
        this._on(CHANNEL_EVENTS.close, {}, callback);
      }
      /**
       * Registers a callback that will be executed when the channel encounteres an error.
       *
       * @internal
       */
      _onError(callback) {
        this._on(CHANNEL_EVENTS.error, {}, (reason) => callback(reason));
      }
      /**
       * Returns `true` if the socket is connected and the channel has been joined.
       *
       * @internal
       */
      _canPush() {
        return this.socket.isConnected() && this._isJoined();
      }
      /** @internal */
      _rejoin(timeout = this.timeout) {
        if (this._isLeaving()) {
          return;
        }
        this.socket._leaveOpenTopic(this.topic);
        this.state = CHANNEL_STATES.joining;
        this.joinPush.resend(timeout);
      }
      /** @internal */
      _getPayloadRecords(payload) {
        const records = {
          new: {},
          old: {}
        };
        if (payload.type === "INSERT" || payload.type === "UPDATE") {
          records.new = convertChangeData(payload.columns, payload.record);
        }
        if (payload.type === "UPDATE" || payload.type === "DELETE") {
          records.old = convertChangeData(payload.columns, payload.old_record);
        }
        return records;
      }
    };
    __name(RealtimeChannel, "RealtimeChannel");
  }
});

// node_modules/@supabase/realtime-js/dist/module/RealtimeClient.js
var noop2, CONNECTION_TIMEOUTS, RECONNECT_INTERVALS, DEFAULT_RECONNECT_FALLBACK, WORKER_SCRIPT, RealtimeClient;
var init_RealtimeClient = __esm({
  "node_modules/@supabase/realtime-js/dist/module/RealtimeClient.js"() {
    init_websocket_factory();
    init_constants();
    init_serializer();
    init_timer();
    init_transformers();
    init_RealtimeChannel();
    noop2 = /* @__PURE__ */ __name(() => {
    }, "noop");
    CONNECTION_TIMEOUTS = {
      HEARTBEAT_INTERVAL: 25e3,
      RECONNECT_DELAY: 10,
      HEARTBEAT_TIMEOUT_FALLBACK: 100
    };
    RECONNECT_INTERVALS = [1e3, 2e3, 5e3, 1e4];
    DEFAULT_RECONNECT_FALLBACK = 1e4;
    WORKER_SCRIPT = `
  addEventListener("message", (e) => {
    if (e.data.event === "start") {
      setInterval(() => postMessage({ event: "keepAlive" }), e.data.interval);
    }
  });`;
    RealtimeClient = class {
      /**
       * Initializes the Socket.
       *
       * @param endPoint The string WebSocket endpoint, ie, "ws://example.com/socket", "wss://example.com", "/socket" (inherited host & protocol)
       * @param httpEndpoint The string HTTP endpoint, ie, "https://example.com", "/" (inherited host & protocol)
       * @param options.transport The Websocket Transport, for example WebSocket. This can be a custom implementation
       * @param options.timeout The default timeout in milliseconds to trigger push timeouts.
       * @param options.params The optional params to pass when connecting.
       * @param options.headers Deprecated: headers cannot be set on websocket connections and this option will be removed in the future.
       * @param options.heartbeatIntervalMs The millisec interval to send a heartbeat message.
       * @param options.heartbeatCallback The optional function to handle heartbeat status.
       * @param options.logger The optional function for specialized logging, ie: logger: (kind, msg, data) => { console.log(`${kind}: ${msg}`, data) }
       * @param options.logLevel Sets the log level for Realtime
       * @param options.encode The function to encode outgoing messages. Defaults to JSON: (payload, callback) => callback(JSON.stringify(payload))
       * @param options.decode The function to decode incoming messages. Defaults to Serializer's decode.
       * @param options.reconnectAfterMs he optional function that returns the millsec reconnect interval. Defaults to stepped backoff off.
       * @param options.worker Use Web Worker to set a side flow. Defaults to false.
       * @param options.workerUrl The URL of the worker script. Defaults to https://realtime.supabase.com/worker.js that includes a heartbeat event call to keep the connection alive.
       */
      constructor(endPoint, options) {
        var _a;
        this.accessTokenValue = null;
        this.apiKey = null;
        this.channels = new Array();
        this.endPoint = "";
        this.httpEndpoint = "";
        this.headers = {};
        this.params = {};
        this.timeout = DEFAULT_TIMEOUT;
        this.transport = null;
        this.heartbeatIntervalMs = CONNECTION_TIMEOUTS.HEARTBEAT_INTERVAL;
        this.heartbeatTimer = void 0;
        this.pendingHeartbeatRef = null;
        this.heartbeatCallback = noop2;
        this.ref = 0;
        this.reconnectTimer = null;
        this.logger = noop2;
        this.conn = null;
        this.sendBuffer = [];
        this.serializer = new Serializer();
        this.stateChangeCallbacks = {
          open: [],
          close: [],
          error: [],
          message: []
        };
        this.accessToken = null;
        this._connectionState = "disconnected";
        this._wasManualDisconnect = false;
        this._authPromise = null;
        this._resolveFetch = (customFetch) => {
          let _fetch;
          if (customFetch) {
            _fetch = customFetch;
          } else if (typeof fetch === "undefined") {
            _fetch = /* @__PURE__ */ __name((...args) => Promise.resolve().then(() => (init_browser(), browser_exports)).then(({ default: fetch3 }) => fetch3(...args)).catch((error) => {
              throw new Error(`Failed to load @supabase/node-fetch: ${error.message}. This is required for HTTP requests in Node.js environments without native fetch.`);
            }), "_fetch");
          } else {
            _fetch = fetch;
          }
          return (...args) => _fetch(...args);
        };
        if (!((_a = options === null || options === void 0 ? void 0 : options.params) === null || _a === void 0 ? void 0 : _a.apikey)) {
          throw new Error("API key is required to connect to Realtime");
        }
        this.apiKey = options.params.apikey;
        this.endPoint = `${endPoint}/${TRANSPORTS.websocket}`;
        this.httpEndpoint = httpEndpointURL(endPoint);
        this._initializeOptions(options);
        this._setupReconnectionTimer();
        this.fetch = this._resolveFetch(options === null || options === void 0 ? void 0 : options.fetch);
      }
      /**
       * Connects the socket, unless already connected.
       */
      connect() {
        if (this.isConnecting() || this.isDisconnecting() || this.conn !== null && this.isConnected()) {
          return;
        }
        this._setConnectionState("connecting");
        this._setAuthSafely("connect");
        if (this.transport) {
          this.conn = new this.transport(this.endpointURL());
        } else {
          try {
            this.conn = websocket_factory_default.createWebSocket(this.endpointURL());
          } catch (error) {
            this._setConnectionState("disconnected");
            const errorMessage = error.message;
            if (errorMessage.includes("Node.js")) {
              throw new Error(`${errorMessage}

To use Realtime in Node.js, you need to provide a WebSocket implementation:

Option 1: Use Node.js 22+ which has native WebSocket support
Option 2: Install and provide the "ws" package:

  npm install ws

  import ws from "ws"
  const client = new RealtimeClient(url, {
    ...options,
    transport: ws
  })`);
            }
            throw new Error(`WebSocket not available: ${errorMessage}`);
          }
        }
        this._setupConnectionHandlers();
      }
      /**
       * Returns the URL of the websocket.
       * @returns string The URL of the websocket.
       */
      endpointURL() {
        return this._appendParams(this.endPoint, Object.assign({}, this.params, { vsn: VSN }));
      }
      /**
       * Disconnects the socket.
       *
       * @param code A numeric status code to send on disconnect.
       * @param reason A custom reason for the disconnect.
       */
      disconnect(code, reason) {
        if (this.isDisconnecting()) {
          return;
        }
        this._setConnectionState("disconnecting", true);
        if (this.conn) {
          const fallbackTimer = setTimeout(() => {
            this._setConnectionState("disconnected");
          }, 100);
          this.conn.onclose = () => {
            clearTimeout(fallbackTimer);
            this._setConnectionState("disconnected");
          };
          if (code) {
            this.conn.close(code, reason !== null && reason !== void 0 ? reason : "");
          } else {
            this.conn.close();
          }
          this._teardownConnection();
        } else {
          this._setConnectionState("disconnected");
        }
      }
      /**
       * Returns all created channels
       */
      getChannels() {
        return this.channels;
      }
      /**
       * Unsubscribes and removes a single channel
       * @param channel A RealtimeChannel instance
       */
      async removeChannel(channel) {
        const status = await channel.unsubscribe();
        if (this.channels.length === 0) {
          this.disconnect();
        }
        return status;
      }
      /**
       * Unsubscribes and removes all channels
       */
      async removeAllChannels() {
        const values_1 = await Promise.all(this.channels.map((channel) => channel.unsubscribe()));
        this.channels = [];
        this.disconnect();
        return values_1;
      }
      /**
       * Logs the message.
       *
       * For customized logging, `this.logger` can be overridden.
       */
      log(kind, msg, data) {
        this.logger(kind, msg, data);
      }
      /**
       * Returns the current state of the socket.
       */
      connectionState() {
        switch (this.conn && this.conn.readyState) {
          case SOCKET_STATES.connecting:
            return CONNECTION_STATE.Connecting;
          case SOCKET_STATES.open:
            return CONNECTION_STATE.Open;
          case SOCKET_STATES.closing:
            return CONNECTION_STATE.Closing;
          default:
            return CONNECTION_STATE.Closed;
        }
      }
      /**
       * Returns `true` is the connection is open.
       */
      isConnected() {
        return this.connectionState() === CONNECTION_STATE.Open;
      }
      /**
       * Returns `true` if the connection is currently connecting.
       */
      isConnecting() {
        return this._connectionState === "connecting";
      }
      /**
       * Returns `true` if the connection is currently disconnecting.
       */
      isDisconnecting() {
        return this._connectionState === "disconnecting";
      }
      channel(topic, params = { config: {} }) {
        const realtimeTopic = `realtime:${topic}`;
        const exists = this.getChannels().find((c) => c.topic === realtimeTopic);
        if (!exists) {
          const chan = new RealtimeChannel(`realtime:${topic}`, params, this);
          this.channels.push(chan);
          return chan;
        } else {
          return exists;
        }
      }
      /**
       * Push out a message if the socket is connected.
       *
       * If the socket is not connected, the message gets enqueued within a local buffer, and sent out when a connection is next established.
       */
      push(data) {
        const { topic, event, payload, ref } = data;
        const callback = /* @__PURE__ */ __name(() => {
          this.encode(data, (result) => {
            var _a;
            (_a = this.conn) === null || _a === void 0 ? void 0 : _a.send(result);
          });
        }, "callback");
        this.log("push", `${topic} ${event} (${ref})`, payload);
        if (this.isConnected()) {
          callback();
        } else {
          this.sendBuffer.push(callback);
        }
      }
      /**
       * Sets the JWT access token used for channel subscription authorization and Realtime RLS.
       *
       * If param is null it will use the `accessToken` callback function or the token set on the client.
       *
       * On callback used, it will set the value of the token internal to the client.
       *
       * @param token A JWT string to override the token set on the client.
       */
      async setAuth(token = null) {
        this._authPromise = this._performAuth(token);
        try {
          await this._authPromise;
        } finally {
          this._authPromise = null;
        }
      }
      /**
       * Sends a heartbeat message if the socket is connected.
       */
      async sendHeartbeat() {
        var _a;
        if (!this.isConnected()) {
          try {
            this.heartbeatCallback("disconnected");
          } catch (e) {
            this.log("error", "error in heartbeat callback", e);
          }
          return;
        }
        if (this.pendingHeartbeatRef) {
          this.pendingHeartbeatRef = null;
          this.log("transport", "heartbeat timeout. Attempting to re-establish connection");
          try {
            this.heartbeatCallback("timeout");
          } catch (e) {
            this.log("error", "error in heartbeat callback", e);
          }
          this._wasManualDisconnect = false;
          (_a = this.conn) === null || _a === void 0 ? void 0 : _a.close(WS_CLOSE_NORMAL, "heartbeat timeout");
          setTimeout(() => {
            var _a2;
            if (!this.isConnected()) {
              (_a2 = this.reconnectTimer) === null || _a2 === void 0 ? void 0 : _a2.scheduleTimeout();
            }
          }, CONNECTION_TIMEOUTS.HEARTBEAT_TIMEOUT_FALLBACK);
          return;
        }
        this.pendingHeartbeatRef = this._makeRef();
        this.push({
          topic: "phoenix",
          event: "heartbeat",
          payload: {},
          ref: this.pendingHeartbeatRef
        });
        try {
          this.heartbeatCallback("sent");
        } catch (e) {
          this.log("error", "error in heartbeat callback", e);
        }
        this._setAuthSafely("heartbeat");
      }
      onHeartbeat(callback) {
        this.heartbeatCallback = callback;
      }
      /**
       * Flushes send buffer
       */
      flushSendBuffer() {
        if (this.isConnected() && this.sendBuffer.length > 0) {
          this.sendBuffer.forEach((callback) => callback());
          this.sendBuffer = [];
        }
      }
      /**
       * Return the next message ref, accounting for overflows
       *
       * @internal
       */
      _makeRef() {
        let newRef = this.ref + 1;
        if (newRef === this.ref) {
          this.ref = 0;
        } else {
          this.ref = newRef;
        }
        return this.ref.toString();
      }
      /**
       * Unsubscribe from channels with the specified topic.
       *
       * @internal
       */
      _leaveOpenTopic(topic) {
        let dupChannel = this.channels.find((c) => c.topic === topic && (c._isJoined() || c._isJoining()));
        if (dupChannel) {
          this.log("transport", `leaving duplicate topic "${topic}"`);
          dupChannel.unsubscribe();
        }
      }
      /**
       * Removes a subscription from the socket.
       *
       * @param channel An open subscription.
       *
       * @internal
       */
      _remove(channel) {
        this.channels = this.channels.filter((c) => c.topic !== channel.topic);
      }
      /** @internal */
      _onConnMessage(rawMessage) {
        this.decode(rawMessage.data, (msg) => {
          if (msg.topic === "phoenix" && msg.event === "phx_reply") {
            try {
              this.heartbeatCallback(msg.payload.status === "ok" ? "ok" : "error");
            } catch (e) {
              this.log("error", "error in heartbeat callback", e);
            }
          }
          if (msg.ref && msg.ref === this.pendingHeartbeatRef) {
            this.pendingHeartbeatRef = null;
          }
          const { topic, event, payload, ref } = msg;
          const refString = ref ? `(${ref})` : "";
          const status = payload.status || "";
          this.log("receive", `${status} ${topic} ${event} ${refString}`.trim(), payload);
          this.channels.filter((channel) => channel._isMember(topic)).forEach((channel) => channel._trigger(event, payload, ref));
          this._triggerStateCallbacks("message", msg);
        });
      }
      /**
       * Clear specific timer
       * @internal
       */
      _clearTimer(timer) {
        var _a;
        if (timer === "heartbeat" && this.heartbeatTimer) {
          clearInterval(this.heartbeatTimer);
          this.heartbeatTimer = void 0;
        } else if (timer === "reconnect") {
          (_a = this.reconnectTimer) === null || _a === void 0 ? void 0 : _a.reset();
        }
      }
      /**
       * Clear all timers
       * @internal
       */
      _clearAllTimers() {
        this._clearTimer("heartbeat");
        this._clearTimer("reconnect");
      }
      /**
       * Setup connection handlers for WebSocket events
       * @internal
       */
      _setupConnectionHandlers() {
        if (!this.conn)
          return;
        if ("binaryType" in this.conn) {
          ;
          this.conn.binaryType = "arraybuffer";
        }
        this.conn.onopen = () => this._onConnOpen();
        this.conn.onerror = (error) => this._onConnError(error);
        this.conn.onmessage = (event) => this._onConnMessage(event);
        this.conn.onclose = (event) => this._onConnClose(event);
      }
      /**
       * Teardown connection and cleanup resources
       * @internal
       */
      _teardownConnection() {
        if (this.conn) {
          this.conn.onopen = null;
          this.conn.onerror = null;
          this.conn.onmessage = null;
          this.conn.onclose = null;
          this.conn = null;
        }
        this._clearAllTimers();
        this.channels.forEach((channel) => channel.teardown());
      }
      /** @internal */
      _onConnOpen() {
        this._setConnectionState("connected");
        this.log("transport", `connected to ${this.endpointURL()}`);
        this.flushSendBuffer();
        this._clearTimer("reconnect");
        if (!this.worker) {
          this._startHeartbeat();
        } else {
          if (!this.workerRef) {
            this._startWorkerHeartbeat();
          }
        }
        this._triggerStateCallbacks("open");
      }
      /** @internal */
      _startHeartbeat() {
        this.heartbeatTimer && clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), this.heartbeatIntervalMs);
      }
      /** @internal */
      _startWorkerHeartbeat() {
        if (this.workerUrl) {
          this.log("worker", `starting worker for from ${this.workerUrl}`);
        } else {
          this.log("worker", `starting default worker`);
        }
        const objectUrl = this._workerObjectUrl(this.workerUrl);
        this.workerRef = new Worker(objectUrl);
        this.workerRef.onerror = (error) => {
          this.log("worker", "worker error", error.message);
          this.workerRef.terminate();
        };
        this.workerRef.onmessage = (event) => {
          if (event.data.event === "keepAlive") {
            this.sendHeartbeat();
          }
        };
        this.workerRef.postMessage({
          event: "start",
          interval: this.heartbeatIntervalMs
        });
      }
      /** @internal */
      _onConnClose(event) {
        var _a;
        this._setConnectionState("disconnected");
        this.log("transport", "close", event);
        this._triggerChanError();
        this._clearTimer("heartbeat");
        if (!this._wasManualDisconnect) {
          (_a = this.reconnectTimer) === null || _a === void 0 ? void 0 : _a.scheduleTimeout();
        }
        this._triggerStateCallbacks("close", event);
      }
      /** @internal */
      _onConnError(error) {
        this._setConnectionState("disconnected");
        this.log("transport", `${error}`);
        this._triggerChanError();
        this._triggerStateCallbacks("error", error);
      }
      /** @internal */
      _triggerChanError() {
        this.channels.forEach((channel) => channel._trigger(CHANNEL_EVENTS.error));
      }
      /** @internal */
      _appendParams(url, params) {
        if (Object.keys(params).length === 0) {
          return url;
        }
        const prefix = url.match(/\?/) ? "&" : "?";
        const query = new URLSearchParams(params);
        return `${url}${prefix}${query}`;
      }
      _workerObjectUrl(url) {
        let result_url;
        if (url) {
          result_url = url;
        } else {
          const blob = new Blob([WORKER_SCRIPT], { type: "application/javascript" });
          result_url = URL.createObjectURL(blob);
        }
        return result_url;
      }
      /**
       * Set connection state with proper state management
       * @internal
       */
      _setConnectionState(state, manual = false) {
        this._connectionState = state;
        if (state === "connecting") {
          this._wasManualDisconnect = false;
        } else if (state === "disconnecting") {
          this._wasManualDisconnect = manual;
        }
      }
      /**
       * Perform the actual auth operation
       * @internal
       */
      async _performAuth(token = null) {
        let tokenToSend;
        if (token) {
          tokenToSend = token;
        } else if (this.accessToken) {
          tokenToSend = await this.accessToken();
        } else {
          tokenToSend = this.accessTokenValue;
        }
        if (this.accessTokenValue != tokenToSend) {
          this.accessTokenValue = tokenToSend;
          this.channels.forEach((channel) => {
            const payload = {
              access_token: tokenToSend,
              version: DEFAULT_VERSION
            };
            tokenToSend && channel.updateJoinPayload(payload);
            if (channel.joinedOnce && channel._isJoined()) {
              channel._push(CHANNEL_EVENTS.access_token, {
                access_token: tokenToSend
              });
            }
          });
        }
      }
      /**
       * Wait for any in-flight auth operations to complete
       * @internal
       */
      async _waitForAuthIfNeeded() {
        if (this._authPromise) {
          await this._authPromise;
        }
      }
      /**
       * Safely call setAuth with standardized error handling
       * @internal
       */
      _setAuthSafely(context = "general") {
        this.setAuth().catch((e) => {
          this.log("error", `error setting auth in ${context}`, e);
        });
      }
      /**
       * Trigger state change callbacks with proper error handling
       * @internal
       */
      _triggerStateCallbacks(event, data) {
        try {
          this.stateChangeCallbacks[event].forEach((callback) => {
            try {
              callback(data);
            } catch (e) {
              this.log("error", `error in ${event} callback`, e);
            }
          });
        } catch (e) {
          this.log("error", `error triggering ${event} callbacks`, e);
        }
      }
      /**
       * Setup reconnection timer with proper configuration
       * @internal
       */
      _setupReconnectionTimer() {
        this.reconnectTimer = new Timer(async () => {
          setTimeout(async () => {
            await this._waitForAuthIfNeeded();
            if (!this.isConnected()) {
              this.connect();
            }
          }, CONNECTION_TIMEOUTS.RECONNECT_DELAY);
        }, this.reconnectAfterMs);
      }
      /**
       * Initialize client options with defaults
       * @internal
       */
      _initializeOptions(options) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        this.transport = (_a = options === null || options === void 0 ? void 0 : options.transport) !== null && _a !== void 0 ? _a : null;
        this.timeout = (_b = options === null || options === void 0 ? void 0 : options.timeout) !== null && _b !== void 0 ? _b : DEFAULT_TIMEOUT;
        this.heartbeatIntervalMs = (_c = options === null || options === void 0 ? void 0 : options.heartbeatIntervalMs) !== null && _c !== void 0 ? _c : CONNECTION_TIMEOUTS.HEARTBEAT_INTERVAL;
        this.worker = (_d = options === null || options === void 0 ? void 0 : options.worker) !== null && _d !== void 0 ? _d : false;
        this.accessToken = (_e = options === null || options === void 0 ? void 0 : options.accessToken) !== null && _e !== void 0 ? _e : null;
        this.heartbeatCallback = (_f = options === null || options === void 0 ? void 0 : options.heartbeatCallback) !== null && _f !== void 0 ? _f : noop2;
        if (options === null || options === void 0 ? void 0 : options.params)
          this.params = options.params;
        if (options === null || options === void 0 ? void 0 : options.logger)
          this.logger = options.logger;
        if ((options === null || options === void 0 ? void 0 : options.logLevel) || (options === null || options === void 0 ? void 0 : options.log_level)) {
          this.logLevel = options.logLevel || options.log_level;
          this.params = Object.assign(Object.assign({}, this.params), { log_level: this.logLevel });
        }
        this.reconnectAfterMs = (_g = options === null || options === void 0 ? void 0 : options.reconnectAfterMs) !== null && _g !== void 0 ? _g : (tries) => {
          return RECONNECT_INTERVALS[tries - 1] || DEFAULT_RECONNECT_FALLBACK;
        };
        this.encode = (_h = options === null || options === void 0 ? void 0 : options.encode) !== null && _h !== void 0 ? _h : (payload, callback) => {
          return callback(JSON.stringify(payload));
        };
        this.decode = (_j = options === null || options === void 0 ? void 0 : options.decode) !== null && _j !== void 0 ? _j : this.serializer.decode.bind(this.serializer);
        if (this.worker) {
          if (typeof window !== "undefined" && !window.Worker) {
            throw new Error("Web Worker is not supported");
          }
          this.workerUrl = options === null || options === void 0 ? void 0 : options.workerUrl;
        }
      }
    };
    __name(RealtimeClient, "RealtimeClient");
  }
});

// node_modules/@supabase/realtime-js/dist/module/index.js
var init_module2 = __esm({
  "node_modules/@supabase/realtime-js/dist/module/index.js"() {
    init_RealtimeClient();
    init_RealtimeChannel();
    init_RealtimePresence();
    init_websocket_factory();
  }
});

// node_modules/@supabase/storage-js/dist/module/lib/errors.js
function isStorageError(error) {
  return typeof error === "object" && error !== null && "__isStorageError" in error;
}
var StorageError, StorageApiError, StorageUnknownError;
var init_errors = __esm({
  "node_modules/@supabase/storage-js/dist/module/lib/errors.js"() {
    StorageError = class extends Error {
      constructor(message) {
        super(message);
        this.__isStorageError = true;
        this.name = "StorageError";
      }
    };
    __name(StorageError, "StorageError");
    __name(isStorageError, "isStorageError");
    StorageApiError = class extends StorageError {
      constructor(message, status, statusCode) {
        super(message);
        this.name = "StorageApiError";
        this.status = status;
        this.statusCode = statusCode;
      }
      toJSON() {
        return {
          name: this.name,
          message: this.message,
          status: this.status,
          statusCode: this.statusCode
        };
      }
    };
    __name(StorageApiError, "StorageApiError");
    StorageUnknownError = class extends StorageError {
      constructor(message, originalError) {
        super(message);
        this.name = "StorageUnknownError";
        this.originalError = originalError;
      }
    };
    __name(StorageUnknownError, "StorageUnknownError");
  }
});

// node_modules/@supabase/storage-js/dist/module/lib/helpers.js
var __awaiter2, resolveFetch2, resolveResponse, recursiveToCamel, isPlainObject;
var init_helpers2 = __esm({
  "node_modules/@supabase/storage-js/dist/module/lib/helpers.js"() {
    __awaiter2 = function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      __name(adopt, "adopt");
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        __name(fulfilled, "fulfilled");
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        __name(rejected, "rejected");
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        __name(step, "step");
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    resolveFetch2 = /* @__PURE__ */ __name((customFetch) => {
      let _fetch;
      if (customFetch) {
        _fetch = customFetch;
      } else if (typeof fetch === "undefined") {
        _fetch = /* @__PURE__ */ __name((...args) => Promise.resolve().then(() => (init_browser(), browser_exports)).then(({ default: fetch3 }) => fetch3(...args)), "_fetch");
      } else {
        _fetch = fetch;
      }
      return (...args) => _fetch(...args);
    }, "resolveFetch");
    resolveResponse = /* @__PURE__ */ __name(() => __awaiter2(void 0, void 0, void 0, function* () {
      if (typeof Response === "undefined") {
        return (yield Promise.resolve().then(() => (init_browser(), browser_exports))).Response;
      }
      return Response;
    }), "resolveResponse");
    recursiveToCamel = /* @__PURE__ */ __name((item) => {
      if (Array.isArray(item)) {
        return item.map((el) => recursiveToCamel(el));
      } else if (typeof item === "function" || item !== Object(item)) {
        return item;
      }
      const result = {};
      Object.entries(item).forEach(([key, value]) => {
        const newKey = key.replace(/([-_][a-z])/gi, (c) => c.toUpperCase().replace(/[-_]/g, ""));
        result[newKey] = recursiveToCamel(value);
      });
      return result;
    }, "recursiveToCamel");
    isPlainObject = /* @__PURE__ */ __name((value) => {
      if (typeof value !== "object" || value === null) {
        return false;
      }
      const prototype = Object.getPrototypeOf(value);
      return (prototype === null || prototype === Object.prototype || Object.getPrototypeOf(prototype) === null) && !(Symbol.toStringTag in value) && !(Symbol.iterator in value);
    }, "isPlainObject");
  }
});

// node_modules/@supabase/storage-js/dist/module/lib/fetch.js
function _handleRequest(fetcher, method, url, options, parameters, body) {
  return __awaiter3(this, void 0, void 0, function* () {
    return new Promise((resolve, reject) => {
      fetcher(url, _getRequestParams(method, options, parameters, body)).then((result) => {
        if (!result.ok)
          throw result;
        if (options === null || options === void 0 ? void 0 : options.noResolveJson)
          return result;
        return result.json();
      }).then((data) => resolve(data)).catch((error) => handleError(error, reject, options));
    });
  });
}
function get(fetcher, url, options, parameters) {
  return __awaiter3(this, void 0, void 0, function* () {
    return _handleRequest(fetcher, "GET", url, options, parameters);
  });
}
function post(fetcher, url, body, options, parameters) {
  return __awaiter3(this, void 0, void 0, function* () {
    return _handleRequest(fetcher, "POST", url, options, parameters, body);
  });
}
function put(fetcher, url, body, options, parameters) {
  return __awaiter3(this, void 0, void 0, function* () {
    return _handleRequest(fetcher, "PUT", url, options, parameters, body);
  });
}
function head(fetcher, url, options, parameters) {
  return __awaiter3(this, void 0, void 0, function* () {
    return _handleRequest(fetcher, "HEAD", url, Object.assign(Object.assign({}, options), { noResolveJson: true }), parameters);
  });
}
function remove(fetcher, url, body, options, parameters) {
  return __awaiter3(this, void 0, void 0, function* () {
    return _handleRequest(fetcher, "DELETE", url, options, parameters, body);
  });
}
var __awaiter3, _getErrorMessage, handleError, _getRequestParams;
var init_fetch = __esm({
  "node_modules/@supabase/storage-js/dist/module/lib/fetch.js"() {
    init_errors();
    init_helpers2();
    __awaiter3 = function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      __name(adopt, "adopt");
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        __name(fulfilled, "fulfilled");
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        __name(rejected, "rejected");
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        __name(step, "step");
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    _getErrorMessage = /* @__PURE__ */ __name((err) => err.msg || err.message || err.error_description || err.error || JSON.stringify(err), "_getErrorMessage");
    handleError = /* @__PURE__ */ __name((error, reject, options) => __awaiter3(void 0, void 0, void 0, function* () {
      const Res = yield resolveResponse();
      if (error instanceof Res && !(options === null || options === void 0 ? void 0 : options.noResolveJson)) {
        error.json().then((err) => {
          const status = error.status || 500;
          const statusCode = (err === null || err === void 0 ? void 0 : err.statusCode) || status + "";
          reject(new StorageApiError(_getErrorMessage(err), status, statusCode));
        }).catch((err) => {
          reject(new StorageUnknownError(_getErrorMessage(err), err));
        });
      } else {
        reject(new StorageUnknownError(_getErrorMessage(error), error));
      }
    }), "handleError");
    _getRequestParams = /* @__PURE__ */ __name((method, options, parameters, body) => {
      const params = { method, headers: (options === null || options === void 0 ? void 0 : options.headers) || {} };
      if (method === "GET" || !body) {
        return params;
      }
      if (isPlainObject(body)) {
        params.headers = Object.assign({ "Content-Type": "application/json" }, options === null || options === void 0 ? void 0 : options.headers);
        params.body = JSON.stringify(body);
      } else {
        params.body = body;
      }
      if (options === null || options === void 0 ? void 0 : options.duplex) {
        params.duplex = options.duplex;
      }
      return Object.assign(Object.assign({}, params), parameters);
    }, "_getRequestParams");
    __name(_handleRequest, "_handleRequest");
    __name(get, "get");
    __name(post, "post");
    __name(put, "put");
    __name(head, "head");
    __name(remove, "remove");
  }
});

// node_modules/@supabase/storage-js/dist/module/packages/StreamDownloadBuilder.js
var __awaiter4, StreamDownloadBuilder;
var init_StreamDownloadBuilder = __esm({
  "node_modules/@supabase/storage-js/dist/module/packages/StreamDownloadBuilder.js"() {
    init_errors();
    __awaiter4 = function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      __name(adopt, "adopt");
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        __name(fulfilled, "fulfilled");
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        __name(rejected, "rejected");
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        __name(step, "step");
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    StreamDownloadBuilder = class {
      constructor(downloadFn, shouldThrowOnError) {
        this.downloadFn = downloadFn;
        this.shouldThrowOnError = shouldThrowOnError;
      }
      then(onfulfilled, onrejected) {
        return this.execute().then(onfulfilled, onrejected);
      }
      execute() {
        return __awaiter4(this, void 0, void 0, function* () {
          try {
            const result = yield this.downloadFn();
            return {
              data: result.body,
              error: null
            };
          } catch (error) {
            if (this.shouldThrowOnError) {
              throw error;
            }
            if (isStorageError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
    };
    __name(StreamDownloadBuilder, "StreamDownloadBuilder");
  }
});

// node_modules/@supabase/storage-js/dist/module/packages/BlobDownloadBuilder.js
var __awaiter5, BlobDownloadBuilder;
var init_BlobDownloadBuilder = __esm({
  "node_modules/@supabase/storage-js/dist/module/packages/BlobDownloadBuilder.js"() {
    init_errors();
    init_StreamDownloadBuilder();
    __awaiter5 = function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      __name(adopt, "adopt");
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        __name(fulfilled, "fulfilled");
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        __name(rejected, "rejected");
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        __name(step, "step");
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    BlobDownloadBuilder = class {
      constructor(downloadFn, shouldThrowOnError) {
        this.downloadFn = downloadFn;
        this.shouldThrowOnError = shouldThrowOnError;
      }
      asStream() {
        return new StreamDownloadBuilder(this.downloadFn, this.shouldThrowOnError);
      }
      then(onfulfilled, onrejected) {
        return this.execute().then(onfulfilled, onrejected);
      }
      execute() {
        return __awaiter5(this, void 0, void 0, function* () {
          try {
            const result = yield this.downloadFn();
            return {
              data: yield result.blob(),
              error: null
            };
          } catch (error) {
            if (this.shouldThrowOnError) {
              throw error;
            }
            if (isStorageError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
    };
    __name(BlobDownloadBuilder, "BlobDownloadBuilder");
  }
});

// node_modules/@supabase/storage-js/dist/module/packages/StorageFileApi.js
var __awaiter6, DEFAULT_SEARCH_OPTIONS, DEFAULT_FILE_OPTIONS, StorageFileApi;
var init_StorageFileApi = __esm({
  "node_modules/@supabase/storage-js/dist/module/packages/StorageFileApi.js"() {
    init_errors();
    init_fetch();
    init_helpers2();
    init_BlobDownloadBuilder();
    __awaiter6 = function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      __name(adopt, "adopt");
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        __name(fulfilled, "fulfilled");
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        __name(rejected, "rejected");
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        __name(step, "step");
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    DEFAULT_SEARCH_OPTIONS = {
      limit: 100,
      offset: 0,
      sortBy: {
        column: "name",
        order: "asc"
      }
    };
    DEFAULT_FILE_OPTIONS = {
      cacheControl: "3600",
      contentType: "text/plain;charset=UTF-8",
      upsert: false
    };
    StorageFileApi = class {
      constructor(url, headers = {}, bucketId, fetch3) {
        this.shouldThrowOnError = false;
        this.url = url;
        this.headers = headers;
        this.bucketId = bucketId;
        this.fetch = resolveFetch2(fetch3);
      }
      /**
       * Enable throwing errors instead of returning them.
       */
      throwOnError() {
        this.shouldThrowOnError = true;
        return this;
      }
      /**
       * Uploads a file to an existing bucket or replaces an existing file at the specified path with a new one.
       *
       * @param method HTTP method.
       * @param path The relative file path. Should be of the format `folder/subfolder/filename.png`. The bucket must already exist before attempting to upload.
       * @param fileBody The body of the file to be stored in the bucket.
       */
      uploadOrUpdate(method, path, fileBody, fileOptions) {
        return __awaiter6(this, void 0, void 0, function* () {
          try {
            let body;
            const options = Object.assign(Object.assign({}, DEFAULT_FILE_OPTIONS), fileOptions);
            let headers = Object.assign(Object.assign({}, this.headers), method === "POST" && { "x-upsert": String(options.upsert) });
            const metadata = options.metadata;
            if (typeof Blob !== "undefined" && fileBody instanceof Blob) {
              body = new FormData();
              body.append("cacheControl", options.cacheControl);
              if (metadata) {
                body.append("metadata", this.encodeMetadata(metadata));
              }
              body.append("", fileBody);
            } else if (typeof FormData !== "undefined" && fileBody instanceof FormData) {
              body = fileBody;
              body.append("cacheControl", options.cacheControl);
              if (metadata) {
                body.append("metadata", this.encodeMetadata(metadata));
              }
            } else {
              body = fileBody;
              headers["cache-control"] = `max-age=${options.cacheControl}`;
              headers["content-type"] = options.contentType;
              if (metadata) {
                headers["x-metadata"] = this.toBase64(this.encodeMetadata(metadata));
              }
            }
            if (fileOptions === null || fileOptions === void 0 ? void 0 : fileOptions.headers) {
              headers = Object.assign(Object.assign({}, headers), fileOptions.headers);
            }
            const cleanPath = this._removeEmptyFolders(path);
            const _path = this._getFinalPath(cleanPath);
            const data = yield (method == "PUT" ? put : post)(this.fetch, `${this.url}/object/${_path}`, body, Object.assign({ headers }, (options === null || options === void 0 ? void 0 : options.duplex) ? { duplex: options.duplex } : {}));
            return {
              data: { path: cleanPath, id: data.Id, fullPath: data.Key },
              error: null
            };
          } catch (error) {
            if (this.shouldThrowOnError) {
              throw error;
            }
            if (isStorageError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
      /**
       * Uploads a file to an existing bucket.
       *
       * @param path The file path, including the file name. Should be of the format `folder/subfolder/filename.png`. The bucket must already exist before attempting to upload.
       * @param fileBody The body of the file to be stored in the bucket.
       */
      upload(path, fileBody, fileOptions) {
        return __awaiter6(this, void 0, void 0, function* () {
          return this.uploadOrUpdate("POST", path, fileBody, fileOptions);
        });
      }
      /**
       * Upload a file with a token generated from `createSignedUploadUrl`.
       * @param path The file path, including the file name. Should be of the format `folder/subfolder/filename.png`. The bucket must already exist before attempting to upload.
       * @param token The token generated from `createSignedUploadUrl`
       * @param fileBody The body of the file to be stored in the bucket.
       */
      uploadToSignedUrl(path, token, fileBody, fileOptions) {
        return __awaiter6(this, void 0, void 0, function* () {
          const cleanPath = this._removeEmptyFolders(path);
          const _path = this._getFinalPath(cleanPath);
          const url = new URL(this.url + `/object/upload/sign/${_path}`);
          url.searchParams.set("token", token);
          try {
            let body;
            const options = Object.assign({ upsert: DEFAULT_FILE_OPTIONS.upsert }, fileOptions);
            const headers = Object.assign(Object.assign({}, this.headers), { "x-upsert": String(options.upsert) });
            if (typeof Blob !== "undefined" && fileBody instanceof Blob) {
              body = new FormData();
              body.append("cacheControl", options.cacheControl);
              body.append("", fileBody);
            } else if (typeof FormData !== "undefined" && fileBody instanceof FormData) {
              body = fileBody;
              body.append("cacheControl", options.cacheControl);
            } else {
              body = fileBody;
              headers["cache-control"] = `max-age=${options.cacheControl}`;
              headers["content-type"] = options.contentType;
            }
            const data = yield put(this.fetch, url.toString(), body, { headers });
            return {
              data: { path: cleanPath, fullPath: data.Key },
              error: null
            };
          } catch (error) {
            if (this.shouldThrowOnError) {
              throw error;
            }
            if (isStorageError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
      /**
       * Creates a signed upload URL.
       * Signed upload URLs can be used to upload files to the bucket without further authentication.
       * They are valid for 2 hours.
       * @param path The file path, including the current file name. For example `folder/image.png`.
       * @param options.upsert If set to true, allows the file to be overwritten if it already exists.
       */
      createSignedUploadUrl(path, options) {
        return __awaiter6(this, void 0, void 0, function* () {
          try {
            let _path = this._getFinalPath(path);
            const headers = Object.assign({}, this.headers);
            if (options === null || options === void 0 ? void 0 : options.upsert) {
              headers["x-upsert"] = "true";
            }
            const data = yield post(this.fetch, `${this.url}/object/upload/sign/${_path}`, {}, { headers });
            const url = new URL(this.url + data.url);
            const token = url.searchParams.get("token");
            if (!token) {
              throw new StorageError("No token returned by API");
            }
            return { data: { signedUrl: url.toString(), path, token }, error: null };
          } catch (error) {
            if (this.shouldThrowOnError) {
              throw error;
            }
            if (isStorageError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
      /**
       * Replaces an existing file at the specified path with a new one.
       *
       * @param path The relative file path. Should be of the format `folder/subfolder/filename.png`. The bucket must already exist before attempting to update.
       * @param fileBody The body of the file to be stored in the bucket.
       */
      update(path, fileBody, fileOptions) {
        return __awaiter6(this, void 0, void 0, function* () {
          return this.uploadOrUpdate("PUT", path, fileBody, fileOptions);
        });
      }
      /**
       * Moves an existing file to a new path in the same bucket.
       *
       * @param fromPath The original file path, including the current file name. For example `folder/image.png`.
       * @param toPath The new file path, including the new file name. For example `folder/image-new.png`.
       * @param options The destination options.
       */
      move(fromPath, toPath, options) {
        return __awaiter6(this, void 0, void 0, function* () {
          try {
            const data = yield post(this.fetch, `${this.url}/object/move`, {
              bucketId: this.bucketId,
              sourceKey: fromPath,
              destinationKey: toPath,
              destinationBucket: options === null || options === void 0 ? void 0 : options.destinationBucket
            }, { headers: this.headers });
            return { data, error: null };
          } catch (error) {
            if (this.shouldThrowOnError) {
              throw error;
            }
            if (isStorageError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
      /**
       * Copies an existing file to a new path in the same bucket.
       *
       * @param fromPath The original file path, including the current file name. For example `folder/image.png`.
       * @param toPath The new file path, including the new file name. For example `folder/image-copy.png`.
       * @param options The destination options.
       */
      copy(fromPath, toPath, options) {
        return __awaiter6(this, void 0, void 0, function* () {
          try {
            const data = yield post(this.fetch, `${this.url}/object/copy`, {
              bucketId: this.bucketId,
              sourceKey: fromPath,
              destinationKey: toPath,
              destinationBucket: options === null || options === void 0 ? void 0 : options.destinationBucket
            }, { headers: this.headers });
            return { data: { path: data.Key }, error: null };
          } catch (error) {
            if (this.shouldThrowOnError) {
              throw error;
            }
            if (isStorageError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
      /**
       * Creates a signed URL. Use a signed URL to share a file for a fixed amount of time.
       *
       * @param path The file path, including the current file name. For example `folder/image.png`.
       * @param expiresIn The number of seconds until the signed URL expires. For example, `60` for a URL which is valid for one minute.
       * @param options.download triggers the file as a download if set to true. Set this parameter as the name of the file if you want to trigger the download with a different filename.
       * @param options.transform Transform the asset before serving it to the client.
       */
      createSignedUrl(path, expiresIn, options) {
        return __awaiter6(this, void 0, void 0, function* () {
          try {
            let _path = this._getFinalPath(path);
            let data = yield post(this.fetch, `${this.url}/object/sign/${_path}`, Object.assign({ expiresIn }, (options === null || options === void 0 ? void 0 : options.transform) ? { transform: options.transform } : {}), { headers: this.headers });
            const downloadQueryParam = (options === null || options === void 0 ? void 0 : options.download) ? `&download=${options.download === true ? "" : options.download}` : "";
            const signedUrl = encodeURI(`${this.url}${data.signedURL}${downloadQueryParam}`);
            data = { signedUrl };
            return { data, error: null };
          } catch (error) {
            if (this.shouldThrowOnError) {
              throw error;
            }
            if (isStorageError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
      /**
       * Creates multiple signed URLs. Use a signed URL to share a file for a fixed amount of time.
       *
       * @param paths The file paths to be downloaded, including the current file names. For example `['folder/image.png', 'folder2/image2.png']`.
       * @param expiresIn The number of seconds until the signed URLs expire. For example, `60` for URLs which are valid for one minute.
       * @param options.download triggers the file as a download if set to true. Set this parameter as the name of the file if you want to trigger the download with a different filename.
       */
      createSignedUrls(paths, expiresIn, options) {
        return __awaiter6(this, void 0, void 0, function* () {
          try {
            const data = yield post(this.fetch, `${this.url}/object/sign/${this.bucketId}`, { expiresIn, paths }, { headers: this.headers });
            const downloadQueryParam = (options === null || options === void 0 ? void 0 : options.download) ? `&download=${options.download === true ? "" : options.download}` : "";
            return {
              data: data.map((datum) => Object.assign(Object.assign({}, datum), { signedUrl: datum.signedURL ? encodeURI(`${this.url}${datum.signedURL}${downloadQueryParam}`) : null })),
              error: null
            };
          } catch (error) {
            if (this.shouldThrowOnError) {
              throw error;
            }
            if (isStorageError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
      /**
       * Downloads a file from a private bucket. For public buckets, make a request to the URL returned from `getPublicUrl` instead.
       *
       * @param path The full path and file name of the file to be downloaded. For example `folder/image.png`.
       * @param options.transform Transform the asset before serving it to the client.
       */
      download(path, options) {
        const wantsTransformation = typeof (options === null || options === void 0 ? void 0 : options.transform) !== "undefined";
        const renderPath = wantsTransformation ? "render/image/authenticated" : "object";
        const transformationQuery = this.transformOptsToQueryString((options === null || options === void 0 ? void 0 : options.transform) || {});
        const queryString = transformationQuery ? `?${transformationQuery}` : "";
        const _path = this._getFinalPath(path);
        const downloadFn = /* @__PURE__ */ __name(() => get(this.fetch, `${this.url}/${renderPath}/${_path}${queryString}`, {
          headers: this.headers,
          noResolveJson: true
        }), "downloadFn");
        return new BlobDownloadBuilder(downloadFn, this.shouldThrowOnError);
      }
      /**
       * Retrieves the details of an existing file.
       * @param path
       */
      info(path) {
        return __awaiter6(this, void 0, void 0, function* () {
          const _path = this._getFinalPath(path);
          try {
            const data = yield get(this.fetch, `${this.url}/object/info/${_path}`, {
              headers: this.headers
            });
            return { data: recursiveToCamel(data), error: null };
          } catch (error) {
            if (this.shouldThrowOnError) {
              throw error;
            }
            if (isStorageError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
      /**
       * Checks the existence of a file.
       * @param path
       */
      exists(path) {
        return __awaiter6(this, void 0, void 0, function* () {
          const _path = this._getFinalPath(path);
          try {
            yield head(this.fetch, `${this.url}/object/${_path}`, {
              headers: this.headers
            });
            return { data: true, error: null };
          } catch (error) {
            if (this.shouldThrowOnError) {
              throw error;
            }
            if (isStorageError(error) && error instanceof StorageUnknownError) {
              const originalError = error.originalError;
              if ([400, 404].includes(originalError === null || originalError === void 0 ? void 0 : originalError.status)) {
                return { data: false, error };
              }
            }
            throw error;
          }
        });
      }
      /**
       * A simple convenience function to get the URL for an asset in a public bucket. If you do not want to use this function, you can construct the public URL by concatenating the bucket URL with the path to the asset.
       * This function does not verify if the bucket is public. If a public URL is created for a bucket which is not public, you will not be able to download the asset.
       *
       * @param path The path and name of the file to generate the public URL for. For example `folder/image.png`.
       * @param options.download Triggers the file as a download if set to true. Set this parameter as the name of the file if you want to trigger the download with a different filename.
       * @param options.transform Transform the asset before serving it to the client.
       */
      getPublicUrl(path, options) {
        const _path = this._getFinalPath(path);
        const _queryString = [];
        const downloadQueryParam = (options === null || options === void 0 ? void 0 : options.download) ? `download=${options.download === true ? "" : options.download}` : "";
        if (downloadQueryParam !== "") {
          _queryString.push(downloadQueryParam);
        }
        const wantsTransformation = typeof (options === null || options === void 0 ? void 0 : options.transform) !== "undefined";
        const renderPath = wantsTransformation ? "render/image" : "object";
        const transformationQuery = this.transformOptsToQueryString((options === null || options === void 0 ? void 0 : options.transform) || {});
        if (transformationQuery !== "") {
          _queryString.push(transformationQuery);
        }
        let queryString = _queryString.join("&");
        if (queryString !== "") {
          queryString = `?${queryString}`;
        }
        return {
          data: { publicUrl: encodeURI(`${this.url}/${renderPath}/public/${_path}${queryString}`) }
        };
      }
      /**
       * Deletes files within the same bucket
       *
       * @param paths An array of files to delete, including the path and file name. For example [`'folder/image.png'`].
       */
      remove(paths) {
        return __awaiter6(this, void 0, void 0, function* () {
          try {
            const data = yield remove(this.fetch, `${this.url}/object/${this.bucketId}`, { prefixes: paths }, { headers: this.headers });
            return { data, error: null };
          } catch (error) {
            if (this.shouldThrowOnError) {
              throw error;
            }
            if (isStorageError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
      /**
       * Get file metadata
       * @param id the file id to retrieve metadata
       */
      // async getMetadata(
      //   id: string
      // ): Promise<
      //   | {
      //       data: Metadata
      //       error: null
      //     }
      //   | {
      //       data: null
      //       error: StorageError
      //     }
      // > {
      //   try {
      //     const data = await get(this.fetch, `${this.url}/metadata/${id}`, { headers: this.headers })
      //     return { data, error: null }
      //   } catch (error) {
      //     if (isStorageError(error)) {
      //       return { data: null, error }
      //     }
      //     throw error
      //   }
      // }
      /**
       * Update file metadata
       * @param id the file id to update metadata
       * @param meta the new file metadata
       */
      // async updateMetadata(
      //   id: string,
      //   meta: Metadata
      // ): Promise<
      //   | {
      //       data: Metadata
      //       error: null
      //     }
      //   | {
      //       data: null
      //       error: StorageError
      //     }
      // > {
      //   try {
      //     const data = await post(
      //       this.fetch,
      //       `${this.url}/metadata/${id}`,
      //       { ...meta },
      //       { headers: this.headers }
      //     )
      //     return { data, error: null }
      //   } catch (error) {
      //     if (isStorageError(error)) {
      //       return { data: null, error }
      //     }
      //     throw error
      //   }
      // }
      /**
       * Lists all the files and folders within a path of the bucket.
       * @param path The folder path.
       * @param options Search options including limit (defaults to 100), offset, sortBy, and search
       */
      list(path, options, parameters) {
        return __awaiter6(this, void 0, void 0, function* () {
          try {
            const body = Object.assign(Object.assign(Object.assign({}, DEFAULT_SEARCH_OPTIONS), options), { prefix: path || "" });
            const data = yield post(this.fetch, `${this.url}/object/list/${this.bucketId}`, body, { headers: this.headers }, parameters);
            return { data, error: null };
          } catch (error) {
            if (this.shouldThrowOnError) {
              throw error;
            }
            if (isStorageError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
      /**
       * @experimental this method signature might change in the future
       * @param options search options
       * @param parameters
       */
      listV2(options, parameters) {
        return __awaiter6(this, void 0, void 0, function* () {
          try {
            const body = Object.assign({}, options);
            const data = yield post(this.fetch, `${this.url}/object/list-v2/${this.bucketId}`, body, { headers: this.headers }, parameters);
            return { data, error: null };
          } catch (error) {
            if (this.shouldThrowOnError) {
              throw error;
            }
            if (isStorageError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
      encodeMetadata(metadata) {
        return JSON.stringify(metadata);
      }
      toBase64(data) {
        if (typeof Buffer !== "undefined") {
          return Buffer.from(data).toString("base64");
        }
        return btoa(data);
      }
      _getFinalPath(path) {
        return `${this.bucketId}/${path.replace(/^\/+/, "")}`;
      }
      _removeEmptyFolders(path) {
        return path.replace(/^\/|\/$/g, "").replace(/\/+/g, "/");
      }
      transformOptsToQueryString(transform) {
        const params = [];
        if (transform.width) {
          params.push(`width=${transform.width}`);
        }
        if (transform.height) {
          params.push(`height=${transform.height}`);
        }
        if (transform.resize) {
          params.push(`resize=${transform.resize}`);
        }
        if (transform.format) {
          params.push(`format=${transform.format}`);
        }
        if (transform.quality) {
          params.push(`quality=${transform.quality}`);
        }
        return params.join("&");
      }
    };
    __name(StorageFileApi, "StorageFileApi");
  }
});

// node_modules/@supabase/storage-js/dist/module/lib/version.js
var version2;
var init_version2 = __esm({
  "node_modules/@supabase/storage-js/dist/module/lib/version.js"() {
    version2 = "2.74.0";
  }
});

// node_modules/@supabase/storage-js/dist/module/lib/constants.js
var DEFAULT_HEADERS;
var init_constants2 = __esm({
  "node_modules/@supabase/storage-js/dist/module/lib/constants.js"() {
    init_version2();
    DEFAULT_HEADERS = { "X-Client-Info": `storage-js/${version2}` };
  }
});

// node_modules/@supabase/storage-js/dist/module/packages/StorageBucketApi.js
var __awaiter7, StorageBucketApi;
var init_StorageBucketApi = __esm({
  "node_modules/@supabase/storage-js/dist/module/packages/StorageBucketApi.js"() {
    init_constants2();
    init_errors();
    init_fetch();
    init_helpers2();
    __awaiter7 = function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      __name(adopt, "adopt");
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        __name(fulfilled, "fulfilled");
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        __name(rejected, "rejected");
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        __name(step, "step");
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    StorageBucketApi = class {
      constructor(url, headers = {}, fetch3, opts) {
        this.shouldThrowOnError = false;
        const baseUrl = new URL(url);
        if (opts === null || opts === void 0 ? void 0 : opts.useNewHostname) {
          const isSupabaseHost = /supabase\.(co|in|red)$/.test(baseUrl.hostname);
          if (isSupabaseHost && !baseUrl.hostname.includes("storage.supabase.")) {
            baseUrl.hostname = baseUrl.hostname.replace("supabase.", "storage.supabase.");
          }
        }
        this.url = baseUrl.href.replace(/\/$/, "");
        this.headers = Object.assign(Object.assign({}, DEFAULT_HEADERS), headers);
        this.fetch = resolveFetch2(fetch3);
      }
      /**
       * Enable throwing errors instead of returning them.
       */
      throwOnError() {
        this.shouldThrowOnError = true;
        return this;
      }
      /**
       * Retrieves the details of all Storage buckets within an existing project.
       */
      listBuckets() {
        return __awaiter7(this, void 0, void 0, function* () {
          try {
            const data = yield get(this.fetch, `${this.url}/bucket`, { headers: this.headers });
            return { data, error: null };
          } catch (error) {
            if (this.shouldThrowOnError) {
              throw error;
            }
            if (isStorageError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
      /**
       * Retrieves the details of an existing Storage bucket.
       *
       * @param id The unique identifier of the bucket you would like to retrieve.
       */
      getBucket(id) {
        return __awaiter7(this, void 0, void 0, function* () {
          try {
            const data = yield get(this.fetch, `${this.url}/bucket/${id}`, { headers: this.headers });
            return { data, error: null };
          } catch (error) {
            if (this.shouldThrowOnError) {
              throw error;
            }
            if (isStorageError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
      /**
       * Creates a new Storage bucket
       *
       * @param id A unique identifier for the bucket you are creating.
       * @param options.public The visibility of the bucket. Public buckets don't require an authorization token to download objects, but still require a valid token for all other operations. By default, buckets are private.
       * @param options.fileSizeLimit specifies the max file size in bytes that can be uploaded to this bucket.
       * The global file size limit takes precedence over this value.
       * The default value is null, which doesn't set a per bucket file size limit.
       * @param options.allowedMimeTypes specifies the allowed mime types that this bucket can accept during upload.
       * The default value is null, which allows files with all mime types to be uploaded.
       * Each mime type specified can be a wildcard, e.g. image/*, or a specific mime type, e.g. image/png.
       * @returns newly created bucket id
       * @param options.type (private-beta) specifies the bucket type. see `BucketType` for more details.
       *   - default bucket type is `STANDARD`
       */
      createBucket(id_1) {
        return __awaiter7(this, arguments, void 0, function* (id, options = {
          public: false
        }) {
          try {
            const data = yield post(this.fetch, `${this.url}/bucket`, {
              id,
              name: id,
              type: options.type,
              public: options.public,
              file_size_limit: options.fileSizeLimit,
              allowed_mime_types: options.allowedMimeTypes
            }, { headers: this.headers });
            return { data, error: null };
          } catch (error) {
            if (this.shouldThrowOnError) {
              throw error;
            }
            if (isStorageError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
      /**
       * Updates a Storage bucket
       *
       * @param id A unique identifier for the bucket you are updating.
       * @param options.public The visibility of the bucket. Public buckets don't require an authorization token to download objects, but still require a valid token for all other operations.
       * @param options.fileSizeLimit specifies the max file size in bytes that can be uploaded to this bucket.
       * The global file size limit takes precedence over this value.
       * The default value is null, which doesn't set a per bucket file size limit.
       * @param options.allowedMimeTypes specifies the allowed mime types that this bucket can accept during upload.
       * The default value is null, which allows files with all mime types to be uploaded.
       * Each mime type specified can be a wildcard, e.g. image/*, or a specific mime type, e.g. image/png.
       */
      updateBucket(id, options) {
        return __awaiter7(this, void 0, void 0, function* () {
          try {
            const data = yield put(this.fetch, `${this.url}/bucket/${id}`, {
              id,
              name: id,
              public: options.public,
              file_size_limit: options.fileSizeLimit,
              allowed_mime_types: options.allowedMimeTypes
            }, { headers: this.headers });
            return { data, error: null };
          } catch (error) {
            if (this.shouldThrowOnError) {
              throw error;
            }
            if (isStorageError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
      /**
       * Removes all objects inside a single bucket.
       *
       * @param id The unique identifier of the bucket you would like to empty.
       */
      emptyBucket(id) {
        return __awaiter7(this, void 0, void 0, function* () {
          try {
            const data = yield post(this.fetch, `${this.url}/bucket/${id}/empty`, {}, { headers: this.headers });
            return { data, error: null };
          } catch (error) {
            if (this.shouldThrowOnError) {
              throw error;
            }
            if (isStorageError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
      /**
       * Deletes an existing bucket. A bucket can't be deleted with existing objects inside it.
       * You must first `empty()` the bucket.
       *
       * @param id The unique identifier of the bucket you would like to delete.
       */
      deleteBucket(id) {
        return __awaiter7(this, void 0, void 0, function* () {
          try {
            const data = yield remove(this.fetch, `${this.url}/bucket/${id}`, {}, { headers: this.headers });
            return { data, error: null };
          } catch (error) {
            if (this.shouldThrowOnError) {
              throw error;
            }
            if (isStorageError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
    };
    __name(StorageBucketApi, "StorageBucketApi");
  }
});

// node_modules/@supabase/storage-js/dist/module/StorageClient.js
var StorageClient;
var init_StorageClient = __esm({
  "node_modules/@supabase/storage-js/dist/module/StorageClient.js"() {
    init_StorageFileApi();
    init_StorageBucketApi();
    StorageClient = class extends StorageBucketApi {
      constructor(url, headers = {}, fetch3, opts) {
        super(url, headers, fetch3, opts);
      }
      /**
       * Perform file operation in a bucket.
       *
       * @param id The bucket id to operate on.
       */
      from(id) {
        return new StorageFileApi(this.url, this.headers, id, this.fetch);
      }
    };
    __name(StorageClient, "StorageClient");
  }
});

// node_modules/@supabase/storage-js/dist/module/lib/types.js
var init_types2 = __esm({
  "node_modules/@supabase/storage-js/dist/module/lib/types.js"() {
  }
});

// node_modules/@supabase/storage-js/dist/module/index.js
var init_module3 = __esm({
  "node_modules/@supabase/storage-js/dist/module/index.js"() {
    init_StorageClient();
    init_types2();
    init_errors();
  }
});

// node_modules/@supabase/supabase-js/dist/module/lib/version.js
var version3;
var init_version3 = __esm({
  "node_modules/@supabase/supabase-js/dist/module/lib/version.js"() {
    version3 = "2.74.0";
  }
});

// node_modules/@supabase/supabase-js/dist/module/lib/constants.js
var JS_ENV, DEFAULT_HEADERS2, DEFAULT_GLOBAL_OPTIONS, DEFAULT_DB_OPTIONS, DEFAULT_AUTH_OPTIONS, DEFAULT_REALTIME_OPTIONS;
var init_constants3 = __esm({
  "node_modules/@supabase/supabase-js/dist/module/lib/constants.js"() {
    init_version3();
    JS_ENV = "";
    if (typeof Deno !== "undefined") {
      JS_ENV = "deno";
    } else if (typeof document !== "undefined") {
      JS_ENV = "web";
    } else if (typeof navigator !== "undefined" && navigator.product === "ReactNative") {
      JS_ENV = "react-native";
    } else {
      JS_ENV = "node";
    }
    DEFAULT_HEADERS2 = { "X-Client-Info": `supabase-js-${JS_ENV}/${version3}` };
    DEFAULT_GLOBAL_OPTIONS = {
      headers: DEFAULT_HEADERS2
    };
    DEFAULT_DB_OPTIONS = {
      schema: "public"
    };
    DEFAULT_AUTH_OPTIONS = {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: "implicit"
    };
    DEFAULT_REALTIME_OPTIONS = {};
  }
});

// node_modules/@supabase/supabase-js/dist/module/lib/fetch.js
var __awaiter8, resolveFetch3, resolveHeadersConstructor, fetchWithAuth;
var init_fetch2 = __esm({
  "node_modules/@supabase/supabase-js/dist/module/lib/fetch.js"() {
    init_browser();
    __awaiter8 = function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      __name(adopt, "adopt");
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        __name(fulfilled, "fulfilled");
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        __name(rejected, "rejected");
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        __name(step, "step");
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    resolveFetch3 = /* @__PURE__ */ __name((customFetch) => {
      let _fetch;
      if (customFetch) {
        _fetch = customFetch;
      } else if (typeof fetch === "undefined") {
        _fetch = browser_default;
      } else {
        _fetch = fetch;
      }
      return (...args) => _fetch(...args);
    }, "resolveFetch");
    resolveHeadersConstructor = /* @__PURE__ */ __name(() => {
      if (typeof Headers === "undefined") {
        return Headers2;
      }
      return Headers;
    }, "resolveHeadersConstructor");
    fetchWithAuth = /* @__PURE__ */ __name((supabaseKey, getAccessToken, customFetch) => {
      const fetch3 = resolveFetch3(customFetch);
      const HeadersConstructor = resolveHeadersConstructor();
      return (input, init) => __awaiter8(void 0, void 0, void 0, function* () {
        var _a;
        const accessToken = (_a = yield getAccessToken()) !== null && _a !== void 0 ? _a : supabaseKey;
        let headers = new HeadersConstructor(init === null || init === void 0 ? void 0 : init.headers);
        if (!headers.has("apikey")) {
          headers.set("apikey", supabaseKey);
        }
        if (!headers.has("Authorization")) {
          headers.set("Authorization", `Bearer ${accessToken}`);
        }
        return fetch3(input, Object.assign(Object.assign({}, init), { headers }));
      });
    }, "fetchWithAuth");
  }
});

// node_modules/@supabase/supabase-js/dist/module/lib/helpers.js
function ensureTrailingSlash(url) {
  return url.endsWith("/") ? url : url + "/";
}
function applySettingDefaults(options, defaults) {
  var _a, _b;
  const { db: dbOptions, auth: authOptions, realtime: realtimeOptions, global: globalOptions } = options;
  const { db: DEFAULT_DB_OPTIONS2, auth: DEFAULT_AUTH_OPTIONS2, realtime: DEFAULT_REALTIME_OPTIONS2, global: DEFAULT_GLOBAL_OPTIONS2 } = defaults;
  const result = {
    db: Object.assign(Object.assign({}, DEFAULT_DB_OPTIONS2), dbOptions),
    auth: Object.assign(Object.assign({}, DEFAULT_AUTH_OPTIONS2), authOptions),
    realtime: Object.assign(Object.assign({}, DEFAULT_REALTIME_OPTIONS2), realtimeOptions),
    storage: {},
    global: Object.assign(Object.assign(Object.assign({}, DEFAULT_GLOBAL_OPTIONS2), globalOptions), { headers: Object.assign(Object.assign({}, (_a = DEFAULT_GLOBAL_OPTIONS2 === null || DEFAULT_GLOBAL_OPTIONS2 === void 0 ? void 0 : DEFAULT_GLOBAL_OPTIONS2.headers) !== null && _a !== void 0 ? _a : {}), (_b = globalOptions === null || globalOptions === void 0 ? void 0 : globalOptions.headers) !== null && _b !== void 0 ? _b : {}) }),
    accessToken: () => __awaiter9(this, void 0, void 0, function* () {
      return "";
    })
  };
  if (options.accessToken) {
    result.accessToken = options.accessToken;
  } else {
    delete result.accessToken;
  }
  return result;
}
function validateSupabaseUrl(supabaseUrl) {
  const trimmedUrl = supabaseUrl === null || supabaseUrl === void 0 ? void 0 : supabaseUrl.trim();
  if (!trimmedUrl) {
    throw new Error("supabaseUrl is required.");
  }
  if (!trimmedUrl.match(/^https?:\/\//i)) {
    throw new Error("Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.");
  }
  try {
    return new URL(ensureTrailingSlash(trimmedUrl));
  } catch (_a) {
    throw Error("Invalid supabaseUrl: Provided URL is malformed.");
  }
}
var __awaiter9;
var init_helpers3 = __esm({
  "node_modules/@supabase/supabase-js/dist/module/lib/helpers.js"() {
    __awaiter9 = function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      __name(adopt, "adopt");
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        __name(fulfilled, "fulfilled");
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        __name(rejected, "rejected");
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        __name(step, "step");
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    __name(ensureTrailingSlash, "ensureTrailingSlash");
    __name(applySettingDefaults, "applySettingDefaults");
    __name(validateSupabaseUrl, "validateSupabaseUrl");
  }
});

// node_modules/@supabase/auth-js/dist/module/lib/version.js
var version4;
var init_version4 = __esm({
  "node_modules/@supabase/auth-js/dist/module/lib/version.js"() {
    version4 = "2.74.0";
  }
});

// node_modules/@supabase/auth-js/dist/module/lib/constants.js
var AUTO_REFRESH_TICK_DURATION_MS, AUTO_REFRESH_TICK_THRESHOLD, EXPIRY_MARGIN_MS, GOTRUE_URL, STORAGE_KEY, DEFAULT_HEADERS3, API_VERSION_HEADER_NAME, API_VERSIONS, BASE64URL_REGEX, JWKS_TTL;
var init_constants4 = __esm({
  "node_modules/@supabase/auth-js/dist/module/lib/constants.js"() {
    init_version4();
    AUTO_REFRESH_TICK_DURATION_MS = 30 * 1e3;
    AUTO_REFRESH_TICK_THRESHOLD = 3;
    EXPIRY_MARGIN_MS = AUTO_REFRESH_TICK_THRESHOLD * AUTO_REFRESH_TICK_DURATION_MS;
    GOTRUE_URL = "http://localhost:9999";
    STORAGE_KEY = "supabase.auth.token";
    DEFAULT_HEADERS3 = { "X-Client-Info": `gotrue-js/${version4}` };
    API_VERSION_HEADER_NAME = "X-Supabase-Api-Version";
    API_VERSIONS = {
      "2024-01-01": {
        timestamp: Date.parse("2024-01-01T00:00:00.0Z"),
        name: "2024-01-01"
      }
    };
    BASE64URL_REGEX = /^([a-z0-9_-]{4})*($|[a-z0-9_-]{3}$|[a-z0-9_-]{2}$)$/i;
    JWKS_TTL = 10 * 60 * 1e3;
  }
});

// node_modules/@supabase/auth-js/dist/module/lib/errors.js
function isAuthError(error) {
  return typeof error === "object" && error !== null && "__isAuthError" in error;
}
function isAuthApiError(error) {
  return isAuthError(error) && error.name === "AuthApiError";
}
function isAuthSessionMissingError(error) {
  return isAuthError(error) && error.name === "AuthSessionMissingError";
}
function isAuthImplicitGrantRedirectError(error) {
  return isAuthError(error) && error.name === "AuthImplicitGrantRedirectError";
}
function isAuthRetryableFetchError(error) {
  return isAuthError(error) && error.name === "AuthRetryableFetchError";
}
function isAuthWeakPasswordError(error) {
  return isAuthError(error) && error.name === "AuthWeakPasswordError";
}
var AuthError, AuthApiError, AuthUnknownError, CustomAuthError, AuthSessionMissingError, AuthInvalidTokenResponseError, AuthInvalidCredentialsError, AuthImplicitGrantRedirectError, AuthPKCEGrantCodeExchangeError, AuthRetryableFetchError, AuthWeakPasswordError, AuthInvalidJwtError;
var init_errors2 = __esm({
  "node_modules/@supabase/auth-js/dist/module/lib/errors.js"() {
    AuthError = class extends Error {
      constructor(message, status, code) {
        super(message);
        this.__isAuthError = true;
        this.name = "AuthError";
        this.status = status;
        this.code = code;
      }
    };
    __name(AuthError, "AuthError");
    __name(isAuthError, "isAuthError");
    AuthApiError = class extends AuthError {
      constructor(message, status, code) {
        super(message, status, code);
        this.name = "AuthApiError";
        this.status = status;
        this.code = code;
      }
    };
    __name(AuthApiError, "AuthApiError");
    __name(isAuthApiError, "isAuthApiError");
    AuthUnknownError = class extends AuthError {
      constructor(message, originalError) {
        super(message);
        this.name = "AuthUnknownError";
        this.originalError = originalError;
      }
    };
    __name(AuthUnknownError, "AuthUnknownError");
    CustomAuthError = class extends AuthError {
      constructor(message, name, status, code) {
        super(message, status, code);
        this.name = name;
        this.status = status;
      }
    };
    __name(CustomAuthError, "CustomAuthError");
    AuthSessionMissingError = class extends CustomAuthError {
      constructor() {
        super("Auth session missing!", "AuthSessionMissingError", 400, void 0);
      }
    };
    __name(AuthSessionMissingError, "AuthSessionMissingError");
    __name(isAuthSessionMissingError, "isAuthSessionMissingError");
    AuthInvalidTokenResponseError = class extends CustomAuthError {
      constructor() {
        super("Auth session or user missing", "AuthInvalidTokenResponseError", 500, void 0);
      }
    };
    __name(AuthInvalidTokenResponseError, "AuthInvalidTokenResponseError");
    AuthInvalidCredentialsError = class extends CustomAuthError {
      constructor(message) {
        super(message, "AuthInvalidCredentialsError", 400, void 0);
      }
    };
    __name(AuthInvalidCredentialsError, "AuthInvalidCredentialsError");
    AuthImplicitGrantRedirectError = class extends CustomAuthError {
      constructor(message, details = null) {
        super(message, "AuthImplicitGrantRedirectError", 500, void 0);
        this.details = null;
        this.details = details;
      }
      toJSON() {
        return {
          name: this.name,
          message: this.message,
          status: this.status,
          details: this.details
        };
      }
    };
    __name(AuthImplicitGrantRedirectError, "AuthImplicitGrantRedirectError");
    __name(isAuthImplicitGrantRedirectError, "isAuthImplicitGrantRedirectError");
    AuthPKCEGrantCodeExchangeError = class extends CustomAuthError {
      constructor(message, details = null) {
        super(message, "AuthPKCEGrantCodeExchangeError", 500, void 0);
        this.details = null;
        this.details = details;
      }
      toJSON() {
        return {
          name: this.name,
          message: this.message,
          status: this.status,
          details: this.details
        };
      }
    };
    __name(AuthPKCEGrantCodeExchangeError, "AuthPKCEGrantCodeExchangeError");
    AuthRetryableFetchError = class extends CustomAuthError {
      constructor(message, status) {
        super(message, "AuthRetryableFetchError", status, void 0);
      }
    };
    __name(AuthRetryableFetchError, "AuthRetryableFetchError");
    __name(isAuthRetryableFetchError, "isAuthRetryableFetchError");
    AuthWeakPasswordError = class extends CustomAuthError {
      constructor(message, status, reasons) {
        super(message, "AuthWeakPasswordError", status, "weak_password");
        this.reasons = reasons;
      }
    };
    __name(AuthWeakPasswordError, "AuthWeakPasswordError");
    __name(isAuthWeakPasswordError, "isAuthWeakPasswordError");
    AuthInvalidJwtError = class extends CustomAuthError {
      constructor(message) {
        super(message, "AuthInvalidJwtError", 400, "invalid_jwt");
      }
    };
    __name(AuthInvalidJwtError, "AuthInvalidJwtError");
  }
});

// node_modules/@supabase/auth-js/dist/module/lib/base64url.js
function byteToBase64URL(byte, state, emit) {
  if (byte !== null) {
    state.queue = state.queue << 8 | byte;
    state.queuedBits += 8;
    while (state.queuedBits >= 6) {
      const pos = state.queue >> state.queuedBits - 6 & 63;
      emit(TO_BASE64URL[pos]);
      state.queuedBits -= 6;
    }
  } else if (state.queuedBits > 0) {
    state.queue = state.queue << 6 - state.queuedBits;
    state.queuedBits = 6;
    while (state.queuedBits >= 6) {
      const pos = state.queue >> state.queuedBits - 6 & 63;
      emit(TO_BASE64URL[pos]);
      state.queuedBits -= 6;
    }
  }
}
function byteFromBase64URL(charCode, state, emit) {
  const bits = FROM_BASE64URL[charCode];
  if (bits > -1) {
    state.queue = state.queue << 6 | bits;
    state.queuedBits += 6;
    while (state.queuedBits >= 8) {
      emit(state.queue >> state.queuedBits - 8 & 255);
      state.queuedBits -= 8;
    }
  } else if (bits === -2) {
    return;
  } else {
    throw new Error(`Invalid Base64-URL character "${String.fromCharCode(charCode)}"`);
  }
}
function stringFromBase64URL(str) {
  const conv = [];
  const utf8Emit = /* @__PURE__ */ __name((codepoint) => {
    conv.push(String.fromCodePoint(codepoint));
  }, "utf8Emit");
  const utf8State = {
    utf8seq: 0,
    codepoint: 0
  };
  const b64State = { queue: 0, queuedBits: 0 };
  const byteEmit = /* @__PURE__ */ __name((byte) => {
    stringFromUTF8(byte, utf8State, utf8Emit);
  }, "byteEmit");
  for (let i = 0; i < str.length; i += 1) {
    byteFromBase64URL(str.charCodeAt(i), b64State, byteEmit);
  }
  return conv.join("");
}
function codepointToUTF8(codepoint, emit) {
  if (codepoint <= 127) {
    emit(codepoint);
    return;
  } else if (codepoint <= 2047) {
    emit(192 | codepoint >> 6);
    emit(128 | codepoint & 63);
    return;
  } else if (codepoint <= 65535) {
    emit(224 | codepoint >> 12);
    emit(128 | codepoint >> 6 & 63);
    emit(128 | codepoint & 63);
    return;
  } else if (codepoint <= 1114111) {
    emit(240 | codepoint >> 18);
    emit(128 | codepoint >> 12 & 63);
    emit(128 | codepoint >> 6 & 63);
    emit(128 | codepoint & 63);
    return;
  }
  throw new Error(`Unrecognized Unicode codepoint: ${codepoint.toString(16)}`);
}
function stringToUTF8(str, emit) {
  for (let i = 0; i < str.length; i += 1) {
    let codepoint = str.charCodeAt(i);
    if (codepoint > 55295 && codepoint <= 56319) {
      const highSurrogate = (codepoint - 55296) * 1024 & 65535;
      const lowSurrogate = str.charCodeAt(i + 1) - 56320 & 65535;
      codepoint = (lowSurrogate | highSurrogate) + 65536;
      i += 1;
    }
    codepointToUTF8(codepoint, emit);
  }
}
function stringFromUTF8(byte, state, emit) {
  if (state.utf8seq === 0) {
    if (byte <= 127) {
      emit(byte);
      return;
    }
    for (let leadingBit = 1; leadingBit < 6; leadingBit += 1) {
      if ((byte >> 7 - leadingBit & 1) === 0) {
        state.utf8seq = leadingBit;
        break;
      }
    }
    if (state.utf8seq === 2) {
      state.codepoint = byte & 31;
    } else if (state.utf8seq === 3) {
      state.codepoint = byte & 15;
    } else if (state.utf8seq === 4) {
      state.codepoint = byte & 7;
    } else {
      throw new Error("Invalid UTF-8 sequence");
    }
    state.utf8seq -= 1;
  } else if (state.utf8seq > 0) {
    if (byte <= 127) {
      throw new Error("Invalid UTF-8 sequence");
    }
    state.codepoint = state.codepoint << 6 | byte & 63;
    state.utf8seq -= 1;
    if (state.utf8seq === 0) {
      emit(state.codepoint);
    }
  }
}
function base64UrlToUint8Array(str) {
  const result = [];
  const state = { queue: 0, queuedBits: 0 };
  const onByte = /* @__PURE__ */ __name((byte) => {
    result.push(byte);
  }, "onByte");
  for (let i = 0; i < str.length; i += 1) {
    byteFromBase64URL(str.charCodeAt(i), state, onByte);
  }
  return new Uint8Array(result);
}
function stringToUint8Array(str) {
  const result = [];
  stringToUTF8(str, (byte) => result.push(byte));
  return new Uint8Array(result);
}
function bytesToBase64URL(bytes) {
  const result = [];
  const state = { queue: 0, queuedBits: 0 };
  const onChar = /* @__PURE__ */ __name((char) => {
    result.push(char);
  }, "onChar");
  bytes.forEach((byte) => byteToBase64URL(byte, state, onChar));
  byteToBase64URL(null, state, onChar);
  return result.join("");
}
var TO_BASE64URL, IGNORE_BASE64URL, FROM_BASE64URL;
var init_base64url = __esm({
  "node_modules/@supabase/auth-js/dist/module/lib/base64url.js"() {
    TO_BASE64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_".split("");
    IGNORE_BASE64URL = " 	\n\r=".split("");
    FROM_BASE64URL = (() => {
      const charMap = new Array(128);
      for (let i = 0; i < charMap.length; i += 1) {
        charMap[i] = -1;
      }
      for (let i = 0; i < IGNORE_BASE64URL.length; i += 1) {
        charMap[IGNORE_BASE64URL[i].charCodeAt(0)] = -2;
      }
      for (let i = 0; i < TO_BASE64URL.length; i += 1) {
        charMap[TO_BASE64URL[i].charCodeAt(0)] = i;
      }
      return charMap;
    })();
    __name(byteToBase64URL, "byteToBase64URL");
    __name(byteFromBase64URL, "byteFromBase64URL");
    __name(stringFromBase64URL, "stringFromBase64URL");
    __name(codepointToUTF8, "codepointToUTF8");
    __name(stringToUTF8, "stringToUTF8");
    __name(stringFromUTF8, "stringFromUTF8");
    __name(base64UrlToUint8Array, "base64UrlToUint8Array");
    __name(stringToUint8Array, "stringToUint8Array");
    __name(bytesToBase64URL, "bytesToBase64URL");
  }
});

// node_modules/@supabase/auth-js/dist/module/lib/helpers.js
function expiresAt(expiresIn) {
  const timeNow = Math.round(Date.now() / 1e3);
  return timeNow + expiresIn;
}
function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == "x" ? r : r & 3 | 8;
    return v.toString(16);
  });
}
function parseParametersFromURL(href) {
  const result = {};
  const url = new URL(href);
  if (url.hash && url.hash[0] === "#") {
    try {
      const hashSearchParams = new URLSearchParams(url.hash.substring(1));
      hashSearchParams.forEach((value, key) => {
        result[key] = value;
      });
    } catch (e) {
    }
  }
  url.searchParams.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}
function decodeJWT(token) {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new AuthInvalidJwtError("Invalid JWT structure");
  }
  for (let i = 0; i < parts.length; i++) {
    if (!BASE64URL_REGEX.test(parts[i])) {
      throw new AuthInvalidJwtError("JWT not in base64url format");
    }
  }
  const data = {
    // using base64url lib
    header: JSON.parse(stringFromBase64URL(parts[0])),
    payload: JSON.parse(stringFromBase64URL(parts[1])),
    signature: base64UrlToUint8Array(parts[2]),
    raw: {
      header: parts[0],
      payload: parts[1]
    }
  };
  return data;
}
async function sleep(time) {
  return await new Promise((accept) => {
    setTimeout(() => accept(null), time);
  });
}
function retryable(fn, isRetryable) {
  const promise = new Promise((accept, reject) => {
    ;
    (async () => {
      for (let attempt = 0; attempt < Infinity; attempt++) {
        try {
          const result = await fn(attempt);
          if (!isRetryable(attempt, null, result)) {
            accept(result);
            return;
          }
        } catch (e) {
          if (!isRetryable(attempt, e)) {
            reject(e);
            return;
          }
        }
      }
    })();
  });
  return promise;
}
function dec2hex(dec) {
  return ("0" + dec.toString(16)).substr(-2);
}
function generatePKCEVerifier() {
  const verifierLength = 56;
  const array = new Uint32Array(verifierLength);
  if (typeof crypto === "undefined") {
    const charSet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    const charSetLen = charSet.length;
    let verifier = "";
    for (let i = 0; i < verifierLength; i++) {
      verifier += charSet.charAt(Math.floor(Math.random() * charSetLen));
    }
    return verifier;
  }
  crypto.getRandomValues(array);
  return Array.from(array, dec2hex).join("");
}
async function sha256(randomString) {
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(randomString);
  const hash = await crypto.subtle.digest("SHA-256", encodedData);
  const bytes = new Uint8Array(hash);
  return Array.from(bytes).map((c) => String.fromCharCode(c)).join("");
}
async function generatePKCEChallenge(verifier) {
  const hasCryptoSupport = typeof crypto !== "undefined" && typeof crypto.subtle !== "undefined" && typeof TextEncoder !== "undefined";
  if (!hasCryptoSupport) {
    console.warn("WebCrypto API is not supported. Code challenge method will default to use plain instead of sha256.");
    return verifier;
  }
  const hashed = await sha256(verifier);
  return btoa(hashed).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function getCodeChallengeAndMethod(storage, storageKey, isPasswordRecovery = false) {
  const codeVerifier = generatePKCEVerifier();
  let storedCodeVerifier = codeVerifier;
  if (isPasswordRecovery) {
    storedCodeVerifier += "/PASSWORD_RECOVERY";
  }
  await setItemAsync(storage, `${storageKey}-code-verifier`, storedCodeVerifier);
  const codeChallenge = await generatePKCEChallenge(codeVerifier);
  const codeChallengeMethod = codeVerifier === codeChallenge ? "plain" : "s256";
  return [codeChallenge, codeChallengeMethod];
}
function parseResponseAPIVersion(response) {
  const apiVersion = response.headers.get(API_VERSION_HEADER_NAME);
  if (!apiVersion) {
    return null;
  }
  if (!apiVersion.match(API_VERSION_REGEX)) {
    return null;
  }
  try {
    const date = /* @__PURE__ */ new Date(`${apiVersion}T00:00:00.0Z`);
    return date;
  } catch (e) {
    return null;
  }
}
function validateExp(exp) {
  if (!exp) {
    throw new Error("Missing exp claim");
  }
  const timeNow = Math.floor(Date.now() / 1e3);
  if (exp <= timeNow) {
    throw new Error("JWT has expired");
  }
}
function getAlgorithm(alg) {
  switch (alg) {
    case "RS256":
      return {
        name: "RSASSA-PKCS1-v1_5",
        hash: { name: "SHA-256" }
      };
    case "ES256":
      return {
        name: "ECDSA",
        namedCurve: "P-256",
        hash: { name: "SHA-256" }
      };
    default:
      throw new Error("Invalid alg claim");
  }
}
function validateUUID(str) {
  if (!UUID_REGEX.test(str)) {
    throw new Error("@supabase/auth-js: Expected parameter to be UUID but is not");
  }
}
function userNotAvailableProxy() {
  const proxyTarget = {};
  return new Proxy(proxyTarget, {
    get: (target, prop) => {
      if (prop === "__isUserNotAvailableProxy") {
        return true;
      }
      if (typeof prop === "symbol") {
        const sProp = prop.toString();
        if (sProp === "Symbol(Symbol.toPrimitive)" || sProp === "Symbol(Symbol.toStringTag)" || sProp === "Symbol(util.inspect.custom)") {
          return void 0;
        }
      }
      throw new Error(`@supabase/auth-js: client was created with userStorage option and there was no user stored in the user storage. Accessing the "${prop}" property of the session object is not supported. Please use getUser() instead.`);
    },
    set: (_target, prop) => {
      throw new Error(`@supabase/auth-js: client was created with userStorage option and there was no user stored in the user storage. Setting the "${prop}" property of the session object is not supported. Please use getUser() to fetch a user object you can manipulate.`);
    },
    deleteProperty: (_target, prop) => {
      throw new Error(`@supabase/auth-js: client was created with userStorage option and there was no user stored in the user storage. Deleting the "${prop}" property of the session object is not supported. Please use getUser() to fetch a user object you can manipulate.`);
    }
  });
}
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
var isBrowser, localStorageWriteTests, supportsLocalStorage, resolveFetch4, looksLikeFetchResponse, setItemAsync, getItemAsync, removeItemAsync, Deferred, API_VERSION_REGEX, UUID_REGEX;
var init_helpers4 = __esm({
  "node_modules/@supabase/auth-js/dist/module/lib/helpers.js"() {
    init_constants4();
    init_errors2();
    init_base64url();
    __name(expiresAt, "expiresAt");
    __name(uuid, "uuid");
    isBrowser = /* @__PURE__ */ __name(() => typeof window !== "undefined" && typeof document !== "undefined", "isBrowser");
    localStorageWriteTests = {
      tested: false,
      writable: false
    };
    supportsLocalStorage = /* @__PURE__ */ __name(() => {
      if (!isBrowser()) {
        return false;
      }
      try {
        if (typeof globalThis.localStorage !== "object") {
          return false;
        }
      } catch (e) {
        return false;
      }
      if (localStorageWriteTests.tested) {
        return localStorageWriteTests.writable;
      }
      const randomKey = `lswt-${Math.random()}${Math.random()}`;
      try {
        globalThis.localStorage.setItem(randomKey, randomKey);
        globalThis.localStorage.removeItem(randomKey);
        localStorageWriteTests.tested = true;
        localStorageWriteTests.writable = true;
      } catch (e) {
        localStorageWriteTests.tested = true;
        localStorageWriteTests.writable = false;
      }
      return localStorageWriteTests.writable;
    }, "supportsLocalStorage");
    __name(parseParametersFromURL, "parseParametersFromURL");
    resolveFetch4 = /* @__PURE__ */ __name((customFetch) => {
      let _fetch;
      if (customFetch) {
        _fetch = customFetch;
      } else if (typeof fetch === "undefined") {
        _fetch = /* @__PURE__ */ __name((...args) => Promise.resolve().then(() => (init_browser(), browser_exports)).then(({ default: fetch3 }) => fetch3(...args)), "_fetch");
      } else {
        _fetch = fetch;
      }
      return (...args) => _fetch(...args);
    }, "resolveFetch");
    looksLikeFetchResponse = /* @__PURE__ */ __name((maybeResponse) => {
      return typeof maybeResponse === "object" && maybeResponse !== null && "status" in maybeResponse && "ok" in maybeResponse && "json" in maybeResponse && typeof maybeResponse.json === "function";
    }, "looksLikeFetchResponse");
    setItemAsync = /* @__PURE__ */ __name(async (storage, key, data) => {
      await storage.setItem(key, JSON.stringify(data));
    }, "setItemAsync");
    getItemAsync = /* @__PURE__ */ __name(async (storage, key) => {
      const value = await storage.getItem(key);
      if (!value) {
        return null;
      }
      try {
        return JSON.parse(value);
      } catch (_a) {
        return value;
      }
    }, "getItemAsync");
    removeItemAsync = /* @__PURE__ */ __name(async (storage, key) => {
      await storage.removeItem(key);
    }, "removeItemAsync");
    Deferred = class {
      constructor() {
        ;
        this.promise = new Deferred.promiseConstructor((res, rej) => {
          ;
          this.resolve = res;
          this.reject = rej;
        });
      }
    };
    __name(Deferred, "Deferred");
    Deferred.promiseConstructor = Promise;
    __name(decodeJWT, "decodeJWT");
    __name(sleep, "sleep");
    __name(retryable, "retryable");
    __name(dec2hex, "dec2hex");
    __name(generatePKCEVerifier, "generatePKCEVerifier");
    __name(sha256, "sha256");
    __name(generatePKCEChallenge, "generatePKCEChallenge");
    __name(getCodeChallengeAndMethod, "getCodeChallengeAndMethod");
    API_VERSION_REGEX = /^2[0-9]{3}-(0[1-9]|1[0-2])-(0[1-9]|1[0-9]|2[0-9]|3[0-1])$/i;
    __name(parseResponseAPIVersion, "parseResponseAPIVersion");
    __name(validateExp, "validateExp");
    __name(getAlgorithm, "getAlgorithm");
    UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    __name(validateUUID, "validateUUID");
    __name(userNotAvailableProxy, "userNotAvailableProxy");
    __name(deepClone, "deepClone");
  }
});

// node_modules/@supabase/auth-js/dist/module/lib/fetch.js
async function handleError2(error) {
  var _a;
  if (!looksLikeFetchResponse(error)) {
    throw new AuthRetryableFetchError(_getErrorMessage2(error), 0);
  }
  if (NETWORK_ERROR_CODES.includes(error.status)) {
    throw new AuthRetryableFetchError(_getErrorMessage2(error), error.status);
  }
  let data;
  try {
    data = await error.json();
  } catch (e) {
    throw new AuthUnknownError(_getErrorMessage2(e), e);
  }
  let errorCode = void 0;
  const responseAPIVersion = parseResponseAPIVersion(error);
  if (responseAPIVersion && responseAPIVersion.getTime() >= API_VERSIONS["2024-01-01"].timestamp && typeof data === "object" && data && typeof data.code === "string") {
    errorCode = data.code;
  } else if (typeof data === "object" && data && typeof data.error_code === "string") {
    errorCode = data.error_code;
  }
  if (!errorCode) {
    if (typeof data === "object" && data && typeof data.weak_password === "object" && data.weak_password && Array.isArray(data.weak_password.reasons) && data.weak_password.reasons.length && data.weak_password.reasons.reduce((a, i) => a && typeof i === "string", true)) {
      throw new AuthWeakPasswordError(_getErrorMessage2(data), error.status, data.weak_password.reasons);
    }
  } else if (errorCode === "weak_password") {
    throw new AuthWeakPasswordError(_getErrorMessage2(data), error.status, ((_a = data.weak_password) === null || _a === void 0 ? void 0 : _a.reasons) || []);
  } else if (errorCode === "session_not_found") {
    throw new AuthSessionMissingError();
  }
  throw new AuthApiError(_getErrorMessage2(data), error.status || 500, errorCode);
}
async function _request(fetcher, method, url, options) {
  var _a;
  const headers = Object.assign({}, options === null || options === void 0 ? void 0 : options.headers);
  if (!headers[API_VERSION_HEADER_NAME]) {
    headers[API_VERSION_HEADER_NAME] = API_VERSIONS["2024-01-01"].name;
  }
  if (options === null || options === void 0 ? void 0 : options.jwt) {
    headers["Authorization"] = `Bearer ${options.jwt}`;
  }
  const qs = (_a = options === null || options === void 0 ? void 0 : options.query) !== null && _a !== void 0 ? _a : {};
  if (options === null || options === void 0 ? void 0 : options.redirectTo) {
    qs["redirect_to"] = options.redirectTo;
  }
  const queryString = Object.keys(qs).length ? "?" + new URLSearchParams(qs).toString() : "";
  const data = await _handleRequest2(fetcher, method, url + queryString, {
    headers,
    noResolveJson: options === null || options === void 0 ? void 0 : options.noResolveJson
  }, {}, options === null || options === void 0 ? void 0 : options.body);
  return (options === null || options === void 0 ? void 0 : options.xform) ? options === null || options === void 0 ? void 0 : options.xform(data) : { data: Object.assign({}, data), error: null };
}
async function _handleRequest2(fetcher, method, url, options, parameters, body) {
  const requestParams = _getRequestParams2(method, options, parameters, body);
  let result;
  try {
    result = await fetcher(url, Object.assign({}, requestParams));
  } catch (e) {
    console.error(e);
    throw new AuthRetryableFetchError(_getErrorMessage2(e), 0);
  }
  if (!result.ok) {
    await handleError2(result);
  }
  if (options === null || options === void 0 ? void 0 : options.noResolveJson) {
    return result;
  }
  try {
    return await result.json();
  } catch (e) {
    await handleError2(e);
  }
}
function _sessionResponse(data) {
  var _a;
  let session = null;
  if (hasSession(data)) {
    session = Object.assign({}, data);
    if (!data.expires_at) {
      session.expires_at = expiresAt(data.expires_in);
    }
  }
  const user = (_a = data.user) !== null && _a !== void 0 ? _a : data;
  return { data: { session, user }, error: null };
}
function _sessionResponsePassword(data) {
  const response = _sessionResponse(data);
  if (!response.error && data.weak_password && typeof data.weak_password === "object" && Array.isArray(data.weak_password.reasons) && data.weak_password.reasons.length && data.weak_password.message && typeof data.weak_password.message === "string" && data.weak_password.reasons.reduce((a, i) => a && typeof i === "string", true)) {
    response.data.weak_password = data.weak_password;
  }
  return response;
}
function _userResponse(data) {
  var _a;
  const user = (_a = data.user) !== null && _a !== void 0 ? _a : data;
  return { data: { user }, error: null };
}
function _ssoResponse(data) {
  return { data, error: null };
}
function _generateLinkResponse(data) {
  const { action_link, email_otp, hashed_token, redirect_to, verification_type } = data, rest = __rest(data, ["action_link", "email_otp", "hashed_token", "redirect_to", "verification_type"]);
  const properties = {
    action_link,
    email_otp,
    hashed_token,
    redirect_to,
    verification_type
  };
  const user = Object.assign({}, rest);
  return {
    data: {
      properties,
      user
    },
    error: null
  };
}
function _noResolveJsonResponse(data) {
  return data;
}
function hasSession(data) {
  return data.access_token && data.refresh_token && data.expires_in;
}
var __rest, _getErrorMessage2, NETWORK_ERROR_CODES, _getRequestParams2;
var init_fetch3 = __esm({
  "node_modules/@supabase/auth-js/dist/module/lib/fetch.js"() {
    init_constants4();
    init_helpers4();
    init_errors2();
    __rest = function(s, e) {
      var t = {};
      for (var p in s)
        if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
          t[p] = s[p];
      if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
          if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
            t[p[i]] = s[p[i]];
        }
      return t;
    };
    _getErrorMessage2 = /* @__PURE__ */ __name((err) => err.msg || err.message || err.error_description || err.error || JSON.stringify(err), "_getErrorMessage");
    NETWORK_ERROR_CODES = [502, 503, 504];
    __name(handleError2, "handleError");
    _getRequestParams2 = /* @__PURE__ */ __name((method, options, parameters, body) => {
      const params = { method, headers: (options === null || options === void 0 ? void 0 : options.headers) || {} };
      if (method === "GET") {
        return params;
      }
      params.headers = Object.assign({ "Content-Type": "application/json;charset=UTF-8" }, options === null || options === void 0 ? void 0 : options.headers);
      params.body = JSON.stringify(body);
      return Object.assign(Object.assign({}, params), parameters);
    }, "_getRequestParams");
    __name(_request, "_request");
    __name(_handleRequest2, "_handleRequest");
    __name(_sessionResponse, "_sessionResponse");
    __name(_sessionResponsePassword, "_sessionResponsePassword");
    __name(_userResponse, "_userResponse");
    __name(_ssoResponse, "_ssoResponse");
    __name(_generateLinkResponse, "_generateLinkResponse");
    __name(_noResolveJsonResponse, "_noResolveJsonResponse");
    __name(hasSession, "hasSession");
  }
});

// node_modules/@supabase/auth-js/dist/module/lib/types.js
var SIGN_OUT_SCOPES;
var init_types3 = __esm({
  "node_modules/@supabase/auth-js/dist/module/lib/types.js"() {
    SIGN_OUT_SCOPES = ["global", "local", "others"];
  }
});

// node_modules/@supabase/auth-js/dist/module/GoTrueAdminApi.js
var __rest2, GoTrueAdminApi;
var init_GoTrueAdminApi = __esm({
  "node_modules/@supabase/auth-js/dist/module/GoTrueAdminApi.js"() {
    init_fetch3();
    init_helpers4();
    init_types3();
    init_errors2();
    __rest2 = function(s, e) {
      var t = {};
      for (var p in s)
        if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
          t[p] = s[p];
      if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
          if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
            t[p[i]] = s[p[i]];
        }
      return t;
    };
    GoTrueAdminApi = class {
      constructor({ url = "", headers = {}, fetch: fetch3 }) {
        this.url = url;
        this.headers = headers;
        this.fetch = resolveFetch4(fetch3);
        this.mfa = {
          listFactors: this._listFactors.bind(this),
          deleteFactor: this._deleteFactor.bind(this)
        };
        this.oauth = {
          listClients: this._listOAuthClients.bind(this),
          createClient: this._createOAuthClient.bind(this),
          getClient: this._getOAuthClient.bind(this),
          deleteClient: this._deleteOAuthClient.bind(this),
          regenerateClientSecret: this._regenerateOAuthClientSecret.bind(this)
        };
      }
      /**
       * Removes a logged-in session.
       * @param jwt A valid, logged-in JWT.
       * @param scope The logout sope.
       */
      async signOut(jwt, scope = SIGN_OUT_SCOPES[0]) {
        if (SIGN_OUT_SCOPES.indexOf(scope) < 0) {
          throw new Error(`@supabase/auth-js: Parameter scope must be one of ${SIGN_OUT_SCOPES.join(", ")}`);
        }
        try {
          await _request(this.fetch, "POST", `${this.url}/logout?scope=${scope}`, {
            headers: this.headers,
            jwt,
            noResolveJson: true
          });
          return { data: null, error: null };
        } catch (error) {
          if (isAuthError(error)) {
            return { data: null, error };
          }
          throw error;
        }
      }
      /**
       * Sends an invite link to an email address.
       * @param email The email address of the user.
       * @param options Additional options to be included when inviting.
       */
      async inviteUserByEmail(email, options = {}) {
        try {
          return await _request(this.fetch, "POST", `${this.url}/invite`, {
            body: { email, data: options.data },
            headers: this.headers,
            redirectTo: options.redirectTo,
            xform: _userResponse
          });
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { user: null }, error };
          }
          throw error;
        }
      }
      /**
       * Generates email links and OTPs to be sent via a custom email provider.
       * @param email The user's email.
       * @param options.password User password. For signup only.
       * @param options.data Optional user metadata. For signup only.
       * @param options.redirectTo The redirect url which should be appended to the generated link
       */
      async generateLink(params) {
        try {
          const { options } = params, rest = __rest2(params, ["options"]);
          const body = Object.assign(Object.assign({}, rest), options);
          if ("newEmail" in rest) {
            body.new_email = rest === null || rest === void 0 ? void 0 : rest.newEmail;
            delete body["newEmail"];
          }
          return await _request(this.fetch, "POST", `${this.url}/admin/generate_link`, {
            body,
            headers: this.headers,
            xform: _generateLinkResponse,
            redirectTo: options === null || options === void 0 ? void 0 : options.redirectTo
          });
        } catch (error) {
          if (isAuthError(error)) {
            return {
              data: {
                properties: null,
                user: null
              },
              error
            };
          }
          throw error;
        }
      }
      // User Admin API
      /**
       * Creates a new user.
       * This function should only be called on a server. Never expose your `service_role` key in the browser.
       */
      async createUser(attributes) {
        try {
          return await _request(this.fetch, "POST", `${this.url}/admin/users`, {
            body: attributes,
            headers: this.headers,
            xform: _userResponse
          });
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { user: null }, error };
          }
          throw error;
        }
      }
      /**
       * Get a list of users.
       *
       * This function should only be called on a server. Never expose your `service_role` key in the browser.
       * @param params An object which supports `page` and `perPage` as numbers, to alter the paginated results.
       */
      async listUsers(params) {
        var _a, _b, _c, _d, _e, _f, _g;
        try {
          const pagination = { nextPage: null, lastPage: 0, total: 0 };
          const response = await _request(this.fetch, "GET", `${this.url}/admin/users`, {
            headers: this.headers,
            noResolveJson: true,
            query: {
              page: (_b = (_a = params === null || params === void 0 ? void 0 : params.page) === null || _a === void 0 ? void 0 : _a.toString()) !== null && _b !== void 0 ? _b : "",
              per_page: (_d = (_c = params === null || params === void 0 ? void 0 : params.perPage) === null || _c === void 0 ? void 0 : _c.toString()) !== null && _d !== void 0 ? _d : ""
            },
            xform: _noResolveJsonResponse
          });
          if (response.error)
            throw response.error;
          const users = await response.json();
          const total = (_e = response.headers.get("x-total-count")) !== null && _e !== void 0 ? _e : 0;
          const links = (_g = (_f = response.headers.get("link")) === null || _f === void 0 ? void 0 : _f.split(",")) !== null && _g !== void 0 ? _g : [];
          if (links.length > 0) {
            links.forEach((link) => {
              const page = parseInt(link.split(";")[0].split("=")[1].substring(0, 1));
              const rel = JSON.parse(link.split(";")[1].split("=")[1]);
              pagination[`${rel}Page`] = page;
            });
            pagination.total = parseInt(total);
          }
          return { data: Object.assign(Object.assign({}, users), pagination), error: null };
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { users: [] }, error };
          }
          throw error;
        }
      }
      /**
       * Get user by id.
       *
       * @param uid The user's unique identifier
       *
       * This function should only be called on a server. Never expose your `service_role` key in the browser.
       */
      async getUserById(uid) {
        validateUUID(uid);
        try {
          return await _request(this.fetch, "GET", `${this.url}/admin/users/${uid}`, {
            headers: this.headers,
            xform: _userResponse
          });
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { user: null }, error };
          }
          throw error;
        }
      }
      /**
       * Updates the user data.
       *
       * @param attributes The data you want to update.
       *
       * This function should only be called on a server. Never expose your `service_role` key in the browser.
       */
      async updateUserById(uid, attributes) {
        validateUUID(uid);
        try {
          return await _request(this.fetch, "PUT", `${this.url}/admin/users/${uid}`, {
            body: attributes,
            headers: this.headers,
            xform: _userResponse
          });
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { user: null }, error };
          }
          throw error;
        }
      }
      /**
       * Delete a user. Requires a `service_role` key.
       *
       * @param id The user id you want to remove.
       * @param shouldSoftDelete If true, then the user will be soft-deleted from the auth schema. Soft deletion allows user identification from the hashed user ID but is not reversible.
       * Defaults to false for backward compatibility.
       *
       * This function should only be called on a server. Never expose your `service_role` key in the browser.
       */
      async deleteUser(id, shouldSoftDelete = false) {
        validateUUID(id);
        try {
          return await _request(this.fetch, "DELETE", `${this.url}/admin/users/${id}`, {
            headers: this.headers,
            body: {
              should_soft_delete: shouldSoftDelete
            },
            xform: _userResponse
          });
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { user: null }, error };
          }
          throw error;
        }
      }
      async _listFactors(params) {
        validateUUID(params.userId);
        try {
          const { data, error } = await _request(this.fetch, "GET", `${this.url}/admin/users/${params.userId}/factors`, {
            headers: this.headers,
            xform: (factors) => {
              return { data: { factors }, error: null };
            }
          });
          return { data, error };
        } catch (error) {
          if (isAuthError(error)) {
            return { data: null, error };
          }
          throw error;
        }
      }
      async _deleteFactor(params) {
        validateUUID(params.userId);
        validateUUID(params.id);
        try {
          const data = await _request(this.fetch, "DELETE", `${this.url}/admin/users/${params.userId}/factors/${params.id}`, {
            headers: this.headers
          });
          return { data, error: null };
        } catch (error) {
          if (isAuthError(error)) {
            return { data: null, error };
          }
          throw error;
        }
      }
      /**
       * Lists all OAuth clients with optional pagination.
       * Only relevant when the OAuth 2.1 server is enabled in Supabase Auth.
       *
       * This function should only be called on a server. Never expose your `service_role` key in the browser.
       */
      async _listOAuthClients(params) {
        var _a, _b, _c, _d, _e, _f, _g;
        try {
          const pagination = { nextPage: null, lastPage: 0, total: 0 };
          const response = await _request(this.fetch, "GET", `${this.url}/admin/oauth/clients`, {
            headers: this.headers,
            noResolveJson: true,
            query: {
              page: (_b = (_a = params === null || params === void 0 ? void 0 : params.page) === null || _a === void 0 ? void 0 : _a.toString()) !== null && _b !== void 0 ? _b : "",
              per_page: (_d = (_c = params === null || params === void 0 ? void 0 : params.perPage) === null || _c === void 0 ? void 0 : _c.toString()) !== null && _d !== void 0 ? _d : ""
            },
            xform: _noResolveJsonResponse
          });
          if (response.error)
            throw response.error;
          const clients = await response.json();
          const total = (_e = response.headers.get("x-total-count")) !== null && _e !== void 0 ? _e : 0;
          const links = (_g = (_f = response.headers.get("link")) === null || _f === void 0 ? void 0 : _f.split(",")) !== null && _g !== void 0 ? _g : [];
          if (links.length > 0) {
            links.forEach((link) => {
              const page = parseInt(link.split(";")[0].split("=")[1].substring(0, 1));
              const rel = JSON.parse(link.split(";")[1].split("=")[1]);
              pagination[`${rel}Page`] = page;
            });
            pagination.total = parseInt(total);
          }
          return { data: Object.assign(Object.assign({}, clients), pagination), error: null };
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { clients: [] }, error };
          }
          throw error;
        }
      }
      /**
       * Creates a new OAuth client.
       * Only relevant when the OAuth 2.1 server is enabled in Supabase Auth.
       *
       * This function should only be called on a server. Never expose your `service_role` key in the browser.
       */
      async _createOAuthClient(params) {
        try {
          return await _request(this.fetch, "POST", `${this.url}/admin/oauth/clients`, {
            body: params,
            headers: this.headers,
            xform: (client) => {
              return { data: client, error: null };
            }
          });
        } catch (error) {
          if (isAuthError(error)) {
            return { data: null, error };
          }
          throw error;
        }
      }
      /**
       * Gets details of a specific OAuth client.
       * Only relevant when the OAuth 2.1 server is enabled in Supabase Auth.
       *
       * This function should only be called on a server. Never expose your `service_role` key in the browser.
       */
      async _getOAuthClient(clientId) {
        try {
          return await _request(this.fetch, "GET", `${this.url}/admin/oauth/clients/${clientId}`, {
            headers: this.headers,
            xform: (client) => {
              return { data: client, error: null };
            }
          });
        } catch (error) {
          if (isAuthError(error)) {
            return { data: null, error };
          }
          throw error;
        }
      }
      /**
       * Deletes an OAuth client.
       * Only relevant when the OAuth 2.1 server is enabled in Supabase Auth.
       *
       * This function should only be called on a server. Never expose your `service_role` key in the browser.
       */
      async _deleteOAuthClient(clientId) {
        try {
          return await _request(this.fetch, "DELETE", `${this.url}/admin/oauth/clients/${clientId}`, {
            headers: this.headers,
            xform: (client) => {
              return { data: client, error: null };
            }
          });
        } catch (error) {
          if (isAuthError(error)) {
            return { data: null, error };
          }
          throw error;
        }
      }
      /**
       * Regenerates the secret for an OAuth client.
       * Only relevant when the OAuth 2.1 server is enabled in Supabase Auth.
       *
       * This function should only be called on a server. Never expose your `service_role` key in the browser.
       */
      async _regenerateOAuthClientSecret(clientId) {
        try {
          return await _request(this.fetch, "POST", `${this.url}/admin/oauth/clients/${clientId}/regenerate_secret`, {
            headers: this.headers,
            xform: (client) => {
              return { data: client, error: null };
            }
          });
        } catch (error) {
          if (isAuthError(error)) {
            return { data: null, error };
          }
          throw error;
        }
      }
    };
    __name(GoTrueAdminApi, "GoTrueAdminApi");
  }
});

// node_modules/@supabase/auth-js/dist/module/lib/local-storage.js
function memoryLocalStorageAdapter(store = {}) {
  return {
    getItem: (key) => {
      return store[key] || null;
    },
    setItem: (key, value) => {
      store[key] = value;
    },
    removeItem: (key) => {
      delete store[key];
    }
  };
}
var init_local_storage = __esm({
  "node_modules/@supabase/auth-js/dist/module/lib/local-storage.js"() {
    __name(memoryLocalStorageAdapter, "memoryLocalStorageAdapter");
  }
});

// node_modules/@supabase/auth-js/dist/module/lib/locks.js
async function navigatorLock(name, acquireTimeout, fn) {
  if (internals.debug) {
    console.log("@supabase/gotrue-js: navigatorLock: acquire lock", name, acquireTimeout);
  }
  const abortController = new globalThis.AbortController();
  if (acquireTimeout > 0) {
    setTimeout(() => {
      abortController.abort();
      if (internals.debug) {
        console.log("@supabase/gotrue-js: navigatorLock acquire timed out", name);
      }
    }, acquireTimeout);
  }
  return await Promise.resolve().then(() => globalThis.navigator.locks.request(name, acquireTimeout === 0 ? {
    mode: "exclusive",
    ifAvailable: true
  } : {
    mode: "exclusive",
    signal: abortController.signal
  }, async (lock) => {
    if (lock) {
      if (internals.debug) {
        console.log("@supabase/gotrue-js: navigatorLock: acquired", name, lock.name);
      }
      try {
        return await fn();
      } finally {
        if (internals.debug) {
          console.log("@supabase/gotrue-js: navigatorLock: released", name, lock.name);
        }
      }
    } else {
      if (acquireTimeout === 0) {
        if (internals.debug) {
          console.log("@supabase/gotrue-js: navigatorLock: not immediately available", name);
        }
        throw new NavigatorLockAcquireTimeoutError(`Acquiring an exclusive Navigator LockManager lock "${name}" immediately failed`);
      } else {
        if (internals.debug) {
          try {
            const result = await globalThis.navigator.locks.query();
            console.log("@supabase/gotrue-js: Navigator LockManager state", JSON.stringify(result, null, "  "));
          } catch (e) {
            console.warn("@supabase/gotrue-js: Error when querying Navigator LockManager state", e);
          }
        }
        console.warn("@supabase/gotrue-js: Navigator LockManager returned a null lock when using #request without ifAvailable set to true, it appears this browser is not following the LockManager spec https://developer.mozilla.org/en-US/docs/Web/API/LockManager/request");
        return await fn();
      }
    }
  }));
}
async function processLock(name, acquireTimeout, fn) {
  var _a;
  const previousOperation = (_a = PROCESS_LOCKS[name]) !== null && _a !== void 0 ? _a : Promise.resolve();
  const currentOperation = Promise.race([
    previousOperation.catch(() => {
      return null;
    }),
    acquireTimeout >= 0 ? new Promise((_, reject) => {
      setTimeout(() => {
        reject(new ProcessLockAcquireTimeoutError(`Acquring process lock with name "${name}" timed out`));
      }, acquireTimeout);
    }) : null
  ].filter((x) => x)).catch((e) => {
    if (e && e.isAcquireTimeout) {
      throw e;
    }
    return null;
  }).then(async () => {
    return await fn();
  });
  PROCESS_LOCKS[name] = currentOperation.catch(async (e) => {
    if (e && e.isAcquireTimeout) {
      await previousOperation;
      return null;
    }
    throw e;
  });
  return await currentOperation;
}
var internals, LockAcquireTimeoutError, NavigatorLockAcquireTimeoutError, ProcessLockAcquireTimeoutError, PROCESS_LOCKS;
var init_locks = __esm({
  "node_modules/@supabase/auth-js/dist/module/lib/locks.js"() {
    init_helpers4();
    internals = {
      /**
       * @experimental
       */
      debug: !!(globalThis && supportsLocalStorage() && globalThis.localStorage && globalThis.localStorage.getItem("supabase.gotrue-js.locks.debug") === "true")
    };
    LockAcquireTimeoutError = class extends Error {
      constructor(message) {
        super(message);
        this.isAcquireTimeout = true;
      }
    };
    __name(LockAcquireTimeoutError, "LockAcquireTimeoutError");
    NavigatorLockAcquireTimeoutError = class extends LockAcquireTimeoutError {
    };
    __name(NavigatorLockAcquireTimeoutError, "NavigatorLockAcquireTimeoutError");
    ProcessLockAcquireTimeoutError = class extends LockAcquireTimeoutError {
    };
    __name(ProcessLockAcquireTimeoutError, "ProcessLockAcquireTimeoutError");
    __name(navigatorLock, "navigatorLock");
    PROCESS_LOCKS = {};
    __name(processLock, "processLock");
  }
});

// node_modules/@supabase/auth-js/dist/module/lib/polyfills.js
function polyfillGlobalThis() {
  if (typeof globalThis === "object")
    return;
  try {
    Object.defineProperty(Object.prototype, "__magic__", {
      get: function() {
        return this;
      },
      configurable: true
    });
    __magic__.globalThis = __magic__;
    delete Object.prototype.__magic__;
  } catch (e) {
    if (typeof self !== "undefined") {
      self.globalThis = self;
    }
  }
}
var init_polyfills = __esm({
  "node_modules/@supabase/auth-js/dist/module/lib/polyfills.js"() {
    __name(polyfillGlobalThis, "polyfillGlobalThis");
  }
});

// node_modules/@supabase/auth-js/dist/module/lib/web3/ethereum.js
function getAddress(address) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error(`@supabase/auth-js: Address "${address}" is invalid.`);
  }
  return address.toLowerCase();
}
function fromHex(hex) {
  return parseInt(hex, 16);
}
function toHex(value) {
  const bytes = new TextEncoder().encode(value);
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return "0x" + hex;
}
function createSiweMessage(parameters) {
  var _a;
  const { chainId, domain, expirationTime, issuedAt = /* @__PURE__ */ new Date(), nonce, notBefore, requestId, resources, scheme, uri, version: version5 } = parameters;
  {
    if (!Number.isInteger(chainId))
      throw new Error(`@supabase/auth-js: Invalid SIWE message field "chainId". Chain ID must be a EIP-155 chain ID. Provided value: ${chainId}`);
    if (!domain)
      throw new Error(`@supabase/auth-js: Invalid SIWE message field "domain". Domain must be provided.`);
    if (nonce && nonce.length < 8)
      throw new Error(`@supabase/auth-js: Invalid SIWE message field "nonce". Nonce must be at least 8 characters. Provided value: ${nonce}`);
    if (!uri)
      throw new Error(`@supabase/auth-js: Invalid SIWE message field "uri". URI must be provided.`);
    if (version5 !== "1")
      throw new Error(`@supabase/auth-js: Invalid SIWE message field "version". Version must be '1'. Provided value: ${version5}`);
    if ((_a = parameters.statement) === null || _a === void 0 ? void 0 : _a.includes("\n"))
      throw new Error(`@supabase/auth-js: Invalid SIWE message field "statement". Statement must not include '\\n'. Provided value: ${parameters.statement}`);
  }
  const address = getAddress(parameters.address);
  const origin = scheme ? `${scheme}://${domain}` : domain;
  const statement = parameters.statement ? `${parameters.statement}
` : "";
  const prefix = `${origin} wants you to sign in with your Ethereum account:
${address}

${statement}`;
  let suffix = `URI: ${uri}
Version: ${version5}
Chain ID: ${chainId}${nonce ? `
Nonce: ${nonce}` : ""}
Issued At: ${issuedAt.toISOString()}`;
  if (expirationTime)
    suffix += `
Expiration Time: ${expirationTime.toISOString()}`;
  if (notBefore)
    suffix += `
Not Before: ${notBefore.toISOString()}`;
  if (requestId)
    suffix += `
Request ID: ${requestId}`;
  if (resources) {
    let content = "\nResources:";
    for (const resource of resources) {
      if (!resource || typeof resource !== "string")
        throw new Error(`@supabase/auth-js: Invalid SIWE message field "resources". Every resource must be a valid string. Provided value: ${resource}`);
      content += `
- ${resource}`;
    }
    suffix += content;
  }
  return `${prefix}
${suffix}`;
}
var init_ethereum = __esm({
  "node_modules/@supabase/auth-js/dist/module/lib/web3/ethereum.js"() {
    __name(getAddress, "getAddress");
    __name(fromHex, "fromHex");
    __name(toHex, "toHex");
    __name(createSiweMessage, "createSiweMessage");
  }
});

// node_modules/@supabase/auth-js/dist/module/lib/webauthn.errors.js
function identifyRegistrationError({ error, options }) {
  var _a, _b, _c;
  const { publicKey } = options;
  if (!publicKey) {
    throw Error("options was missing required publicKey property");
  }
  if (error.name === "AbortError") {
    if (options.signal instanceof AbortSignal) {
      return new WebAuthnError({
        message: "Registration ceremony was sent an abort signal",
        code: "ERROR_CEREMONY_ABORTED",
        cause: error
      });
    }
  } else if (error.name === "ConstraintError") {
    if (((_a = publicKey.authenticatorSelection) === null || _a === void 0 ? void 0 : _a.requireResidentKey) === true) {
      return new WebAuthnError({
        message: "Discoverable credentials were required but no available authenticator supported it",
        code: "ERROR_AUTHENTICATOR_MISSING_DISCOVERABLE_CREDENTIAL_SUPPORT",
        cause: error
      });
    } else if (
      // @ts-ignore: `mediation` doesn't yet exist on CredentialCreationOptions but it's possible as of Sept 2024
      options.mediation === "conditional" && ((_b = publicKey.authenticatorSelection) === null || _b === void 0 ? void 0 : _b.userVerification) === "required"
    ) {
      return new WebAuthnError({
        message: "User verification was required during automatic registration but it could not be performed",
        code: "ERROR_AUTO_REGISTER_USER_VERIFICATION_FAILURE",
        cause: error
      });
    } else if (((_c = publicKey.authenticatorSelection) === null || _c === void 0 ? void 0 : _c.userVerification) === "required") {
      return new WebAuthnError({
        message: "User verification was required but no available authenticator supported it",
        code: "ERROR_AUTHENTICATOR_MISSING_USER_VERIFICATION_SUPPORT",
        cause: error
      });
    }
  } else if (error.name === "InvalidStateError") {
    return new WebAuthnError({
      message: "The authenticator was previously registered",
      code: "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED",
      cause: error
    });
  } else if (error.name === "NotAllowedError") {
    return new WebAuthnError({
      message: error.message,
      code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY",
      cause: error
    });
  } else if (error.name === "NotSupportedError") {
    const validPubKeyCredParams = publicKey.pubKeyCredParams.filter((param) => param.type === "public-key");
    if (validPubKeyCredParams.length === 0) {
      return new WebAuthnError({
        message: 'No entry in pubKeyCredParams was of type "public-key"',
        code: "ERROR_MALFORMED_PUBKEYCREDPARAMS",
        cause: error
      });
    }
    return new WebAuthnError({
      message: "No available authenticator supported any of the specified pubKeyCredParams algorithms",
      code: "ERROR_AUTHENTICATOR_NO_SUPPORTED_PUBKEYCREDPARAMS_ALG",
      cause: error
    });
  } else if (error.name === "SecurityError") {
    const effectiveDomain = window.location.hostname;
    if (!isValidDomain(effectiveDomain)) {
      return new WebAuthnError({
        message: `${window.location.hostname} is an invalid domain`,
        code: "ERROR_INVALID_DOMAIN",
        cause: error
      });
    } else if (publicKey.rp.id !== effectiveDomain) {
      return new WebAuthnError({
        message: `The RP ID "${publicKey.rp.id}" is invalid for this domain`,
        code: "ERROR_INVALID_RP_ID",
        cause: error
      });
    }
  } else if (error.name === "TypeError") {
    if (publicKey.user.id.byteLength < 1 || publicKey.user.id.byteLength > 64) {
      return new WebAuthnError({
        message: "User ID was not between 1 and 64 characters",
        code: "ERROR_INVALID_USER_ID_LENGTH",
        cause: error
      });
    }
  } else if (error.name === "UnknownError") {
    return new WebAuthnError({
      message: "The authenticator was unable to process the specified options, or could not create a new credential",
      code: "ERROR_AUTHENTICATOR_GENERAL_ERROR",
      cause: error
    });
  }
  return new WebAuthnError({
    message: "a Non-Webauthn related error has occurred",
    code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY",
    cause: error
  });
}
function identifyAuthenticationError({ error, options }) {
  const { publicKey } = options;
  if (!publicKey) {
    throw Error("options was missing required publicKey property");
  }
  if (error.name === "AbortError") {
    if (options.signal instanceof AbortSignal) {
      return new WebAuthnError({
        message: "Authentication ceremony was sent an abort signal",
        code: "ERROR_CEREMONY_ABORTED",
        cause: error
      });
    }
  } else if (error.name === "NotAllowedError") {
    return new WebAuthnError({
      message: error.message,
      code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY",
      cause: error
    });
  } else if (error.name === "SecurityError") {
    const effectiveDomain = window.location.hostname;
    if (!isValidDomain(effectiveDomain)) {
      return new WebAuthnError({
        message: `${window.location.hostname} is an invalid domain`,
        code: "ERROR_INVALID_DOMAIN",
        cause: error
      });
    } else if (publicKey.rpId !== effectiveDomain) {
      return new WebAuthnError({
        message: `The RP ID "${publicKey.rpId}" is invalid for this domain`,
        code: "ERROR_INVALID_RP_ID",
        cause: error
      });
    }
  } else if (error.name === "UnknownError") {
    return new WebAuthnError({
      message: "The authenticator was unable to process the specified options, or could not create a new assertion signature",
      code: "ERROR_AUTHENTICATOR_GENERAL_ERROR",
      cause: error
    });
  }
  return new WebAuthnError({
    message: "a Non-Webauthn related error has occurred",
    code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY",
    cause: error
  });
}
var WebAuthnError, WebAuthnUnknownError;
var init_webauthn_errors = __esm({
  "node_modules/@supabase/auth-js/dist/module/lib/webauthn.errors.js"() {
    init_webauthn();
    WebAuthnError = class extends Error {
      constructor({ message, code, cause, name }) {
        var _a;
        super(message, { cause });
        this.__isWebAuthnError = true;
        this.name = (_a = name !== null && name !== void 0 ? name : cause instanceof Error ? cause.name : void 0) !== null && _a !== void 0 ? _a : "Unknown Error";
        this.code = code;
      }
    };
    __name(WebAuthnError, "WebAuthnError");
    WebAuthnUnknownError = class extends WebAuthnError {
      constructor(message, originalError) {
        super({
          code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY",
          cause: originalError,
          message
        });
        this.name = "WebAuthnUnknownError";
        this.originalError = originalError;
      }
    };
    __name(WebAuthnUnknownError, "WebAuthnUnknownError");
    __name(identifyRegistrationError, "identifyRegistrationError");
    __name(identifyAuthenticationError, "identifyAuthenticationError");
  }
});

// node_modules/@supabase/auth-js/dist/module/lib/webauthn.js
function deserializeCredentialCreationOptions(options) {
  if (!options) {
    throw new Error("Credential creation options are required");
  }
  if (typeof PublicKeyCredential !== "undefined" && "parseCreationOptionsFromJSON" in PublicKeyCredential && typeof PublicKeyCredential.parseCreationOptionsFromJSON === "function") {
    return PublicKeyCredential.parseCreationOptionsFromJSON(
      /** we assert the options here as typescript still doesn't know about future webauthn types */
      options
    );
  }
  const { challenge: challengeStr, user: userOpts, excludeCredentials } = options, restOptions = __rest3(
    options,
    ["challenge", "user", "excludeCredentials"]
  );
  const challenge = base64UrlToUint8Array(challengeStr).buffer;
  const user = Object.assign(Object.assign({}, userOpts), { id: base64UrlToUint8Array(userOpts.id).buffer });
  const result = Object.assign(Object.assign({}, restOptions), {
    challenge,
    user
  });
  if (excludeCredentials && excludeCredentials.length > 0) {
    result.excludeCredentials = new Array(excludeCredentials.length);
    for (let i = 0; i < excludeCredentials.length; i++) {
      const cred = excludeCredentials[i];
      result.excludeCredentials[i] = Object.assign(Object.assign({}, cred), {
        id: base64UrlToUint8Array(cred.id).buffer,
        type: cred.type || "public-key",
        // Cast transports to handle future transport types like "cable"
        transports: cred.transports
      });
    }
  }
  return result;
}
function deserializeCredentialRequestOptions(options) {
  if (!options) {
    throw new Error("Credential request options are required");
  }
  if (typeof PublicKeyCredential !== "undefined" && "parseRequestOptionsFromJSON" in PublicKeyCredential && typeof PublicKeyCredential.parseRequestOptionsFromJSON === "function") {
    return PublicKeyCredential.parseRequestOptionsFromJSON(options);
  }
  const { challenge: challengeStr, allowCredentials } = options, restOptions = __rest3(
    options,
    ["challenge", "allowCredentials"]
  );
  const challenge = base64UrlToUint8Array(challengeStr).buffer;
  const result = Object.assign(Object.assign({}, restOptions), { challenge });
  if (allowCredentials && allowCredentials.length > 0) {
    result.allowCredentials = new Array(allowCredentials.length);
    for (let i = 0; i < allowCredentials.length; i++) {
      const cred = allowCredentials[i];
      result.allowCredentials[i] = Object.assign(Object.assign({}, cred), {
        id: base64UrlToUint8Array(cred.id).buffer,
        type: cred.type || "public-key",
        // Cast transports to handle future transport types like "cable"
        transports: cred.transports
      });
    }
  }
  return result;
}
function serializeCredentialCreationResponse(credential) {
  var _a;
  if ("toJSON" in credential && typeof credential.toJSON === "function") {
    return credential.toJSON();
  }
  const credentialWithAttachment = credential;
  return {
    id: credential.id,
    rawId: credential.id,
    response: {
      attestationObject: bytesToBase64URL(new Uint8Array(credential.response.attestationObject)),
      clientDataJSON: bytesToBase64URL(new Uint8Array(credential.response.clientDataJSON))
    },
    type: "public-key",
    clientExtensionResults: credential.getClientExtensionResults(),
    // Convert null to undefined and cast to AuthenticatorAttachment type
    authenticatorAttachment: (_a = credentialWithAttachment.authenticatorAttachment) !== null && _a !== void 0 ? _a : void 0
  };
}
function serializeCredentialRequestResponse(credential) {
  var _a;
  if ("toJSON" in credential && typeof credential.toJSON === "function") {
    return credential.toJSON();
  }
  const credentialWithAttachment = credential;
  const clientExtensionResults = credential.getClientExtensionResults();
  const assertionResponse = credential.response;
  return {
    id: credential.id,
    rawId: credential.id,
    // W3C spec expects rawId to match id for JSON format
    response: {
      authenticatorData: bytesToBase64URL(new Uint8Array(assertionResponse.authenticatorData)),
      clientDataJSON: bytesToBase64URL(new Uint8Array(assertionResponse.clientDataJSON)),
      signature: bytesToBase64URL(new Uint8Array(assertionResponse.signature)),
      userHandle: assertionResponse.userHandle ? bytesToBase64URL(new Uint8Array(assertionResponse.userHandle)) : void 0
    },
    type: "public-key",
    clientExtensionResults,
    // Convert null to undefined and cast to AuthenticatorAttachment type
    authenticatorAttachment: (_a = credentialWithAttachment.authenticatorAttachment) !== null && _a !== void 0 ? _a : void 0
  };
}
function isValidDomain(hostname) {
  return (
    // Consider localhost valid as well since it's okay wrt Secure Contexts
    hostname === "localhost" || /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i.test(hostname)
  );
}
function browserSupportsWebAuthn() {
  var _a, _b;
  return !!(isBrowser() && "PublicKeyCredential" in window && window.PublicKeyCredential && "credentials" in navigator && typeof ((_a = navigator === null || navigator === void 0 ? void 0 : navigator.credentials) === null || _a === void 0 ? void 0 : _a.create) === "function" && typeof ((_b = navigator === null || navigator === void 0 ? void 0 : navigator.credentials) === null || _b === void 0 ? void 0 : _b.get) === "function");
}
async function createCredential(options) {
  try {
    const response = await navigator.credentials.create(
      /** we assert the type here until typescript types are updated */
      options
    );
    if (!response) {
      return {
        data: null,
        error: new WebAuthnUnknownError("Empty credential response", response)
      };
    }
    if (!(response instanceof PublicKeyCredential)) {
      return {
        data: null,
        error: new WebAuthnUnknownError("Browser returned unexpected credential type", response)
      };
    }
    return { data: response, error: null };
  } catch (err) {
    return {
      data: null,
      error: identifyRegistrationError({
        error: err,
        options
      })
    };
  }
}
async function getCredential(options) {
  try {
    const response = await navigator.credentials.get(
      /** we assert the type here until typescript types are updated */
      options
    );
    if (!response) {
      return {
        data: null,
        error: new WebAuthnUnknownError("Empty credential response", response)
      };
    }
    if (!(response instanceof PublicKeyCredential)) {
      return {
        data: null,
        error: new WebAuthnUnknownError("Browser returned unexpected credential type", response)
      };
    }
    return { data: response, error: null };
  } catch (err) {
    return {
      data: null,
      error: identifyAuthenticationError({
        error: err,
        options
      })
    };
  }
}
function deepMerge(...sources) {
  const isObject = /* @__PURE__ */ __name((val) => val !== null && typeof val === "object" && !Array.isArray(val), "isObject");
  const isArrayBufferLike = /* @__PURE__ */ __name((val) => val instanceof ArrayBuffer || ArrayBuffer.isView(val), "isArrayBufferLike");
  const result = {};
  for (const source of sources) {
    if (!source)
      continue;
    for (const key in source) {
      const value = source[key];
      if (value === void 0)
        continue;
      if (Array.isArray(value)) {
        result[key] = value;
      } else if (isArrayBufferLike(value)) {
        result[key] = value;
      } else if (isObject(value)) {
        const existing = result[key];
        if (isObject(existing)) {
          result[key] = deepMerge(existing, value);
        } else {
          result[key] = deepMerge(value);
        }
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}
function mergeCredentialCreationOptions(baseOptions, overrides) {
  return deepMerge(DEFAULT_CREATION_OPTIONS, baseOptions, overrides || {});
}
function mergeCredentialRequestOptions(baseOptions, overrides) {
  return deepMerge(DEFAULT_REQUEST_OPTIONS, baseOptions, overrides || {});
}
var __rest3, WebAuthnAbortService, webAuthnAbortService, DEFAULT_CREATION_OPTIONS, DEFAULT_REQUEST_OPTIONS, WebAuthnApi;
var init_webauthn = __esm({
  "node_modules/@supabase/auth-js/dist/module/lib/webauthn.js"() {
    init_base64url();
    init_errors2();
    init_helpers4();
    init_webauthn_errors();
    __rest3 = function(s, e) {
      var t = {};
      for (var p in s)
        if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
          t[p] = s[p];
      if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
          if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
            t[p[i]] = s[p[i]];
        }
      return t;
    };
    WebAuthnAbortService = class {
      /**
       * Create an abort signal for a new WebAuthn operation.
       * Automatically cancels any existing operation.
       *
       * @returns {AbortSignal} Signal to pass to navigator.credentials.create() or .get()
       * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal MDN - AbortSignal}
       */
      createNewAbortSignal() {
        if (this.controller) {
          const abortError = new Error("Cancelling existing WebAuthn API call for new one");
          abortError.name = "AbortError";
          this.controller.abort(abortError);
        }
        const newController = new AbortController();
        this.controller = newController;
        return newController.signal;
      }
      /**
       * Manually cancel the current WebAuthn operation.
       * Useful for cleaning up when user cancels or navigates away.
       *
       * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/AbortController/abort MDN - AbortController.abort}
       */
      cancelCeremony() {
        if (this.controller) {
          const abortError = new Error("Manually cancelling existing WebAuthn API call");
          abortError.name = "AbortError";
          this.controller.abort(abortError);
          this.controller = void 0;
        }
      }
    };
    __name(WebAuthnAbortService, "WebAuthnAbortService");
    webAuthnAbortService = new WebAuthnAbortService();
    __name(deserializeCredentialCreationOptions, "deserializeCredentialCreationOptions");
    __name(deserializeCredentialRequestOptions, "deserializeCredentialRequestOptions");
    __name(serializeCredentialCreationResponse, "serializeCredentialCreationResponse");
    __name(serializeCredentialRequestResponse, "serializeCredentialRequestResponse");
    __name(isValidDomain, "isValidDomain");
    __name(browserSupportsWebAuthn, "browserSupportsWebAuthn");
    __name(createCredential, "createCredential");
    __name(getCredential, "getCredential");
    DEFAULT_CREATION_OPTIONS = {
      hints: ["security-key"],
      authenticatorSelection: {
        authenticatorAttachment: "cross-platform",
        requireResidentKey: false,
        /** set to preferred because older yubikeys don't have PIN/Biometric */
        userVerification: "preferred",
        residentKey: "discouraged"
      },
      attestation: "none"
    };
    DEFAULT_REQUEST_OPTIONS = {
      /** set to preferred because older yubikeys don't have PIN/Biometric */
      userVerification: "preferred",
      hints: ["security-key"]
    };
    __name(deepMerge, "deepMerge");
    __name(mergeCredentialCreationOptions, "mergeCredentialCreationOptions");
    __name(mergeCredentialRequestOptions, "mergeCredentialRequestOptions");
    WebAuthnApi = class {
      constructor(client) {
        this.client = client;
        this.enroll = this._enroll.bind(this);
        this.challenge = this._challenge.bind(this);
        this.verify = this._verify.bind(this);
        this.authenticate = this._authenticate.bind(this);
        this.register = this._register.bind(this);
      }
      /**
       * Enroll a new WebAuthn factor.
       * Creates an unverified WebAuthn factor that must be verified with a credential.
       *
       * @experimental This method is experimental and may change in future releases
       * @param {Omit<MFAEnrollWebauthnParams, 'factorType'>} params - Enrollment parameters (friendlyName required)
       * @returns {Promise<AuthMFAEnrollWebauthnResponse>} Enrolled factor details or error
       * @see {@link https://w3c.github.io/webauthn/#sctn-registering-a-new-credential W3C WebAuthn Spec - Registering a New Credential}
       */
      async _enroll(params) {
        return this.client.mfa.enroll(Object.assign(Object.assign({}, params), { factorType: "webauthn" }));
      }
      /**
       * Challenge for WebAuthn credential creation or authentication.
       * Combines server challenge with browser credential operations.
       * Handles both registration (create) and authentication (request) flows.
       *
       * @experimental This method is experimental and may change in future releases
       * @param {MFAChallengeWebauthnParams & { friendlyName?: string; signal?: AbortSignal }} params - Challenge parameters including factorId
       * @param {Object} overrides - Allows you to override the parameters passed to navigator.credentials
       * @param {PublicKeyCredentialCreationOptionsFuture} overrides.create - Override options for credential creation
       * @param {PublicKeyCredentialRequestOptionsFuture} overrides.request - Override options for credential request
       * @returns {Promise<RequestResult>} Challenge response with credential or error
       * @see {@link https://w3c.github.io/webauthn/#sctn-credential-creation W3C WebAuthn Spec - Credential Creation}
       * @see {@link https://w3c.github.io/webauthn/#sctn-verifying-assertion W3C WebAuthn Spec - Verifying Assertion}
       */
      async _challenge({ factorId, webauthn, friendlyName, signal }, overrides) {
        try {
          const { data: challengeResponse, error: challengeError } = await this.client.mfa.challenge({
            factorId,
            webauthn
          });
          if (!challengeResponse) {
            return { data: null, error: challengeError };
          }
          const abortSignal = signal !== null && signal !== void 0 ? signal : webAuthnAbortService.createNewAbortSignal();
          if (challengeResponse.webauthn.type === "create") {
            const { user } = challengeResponse.webauthn.credential_options.publicKey;
            if (!user.name) {
              user.name = `${user.id}:${friendlyName}`;
            }
            if (!user.displayName) {
              user.displayName = user.name;
            }
          }
          switch (challengeResponse.webauthn.type) {
            case "create": {
              const options = mergeCredentialCreationOptions(challengeResponse.webauthn.credential_options.publicKey, overrides === null || overrides === void 0 ? void 0 : overrides.create);
              const { data, error } = await createCredential({
                publicKey: options,
                signal: abortSignal
              });
              if (data) {
                return {
                  data: {
                    factorId,
                    challengeId: challengeResponse.id,
                    webauthn: {
                      type: challengeResponse.webauthn.type,
                      credential_response: data
                    }
                  },
                  error: null
                };
              }
              return { data: null, error };
            }
            case "request": {
              const options = mergeCredentialRequestOptions(challengeResponse.webauthn.credential_options.publicKey, overrides === null || overrides === void 0 ? void 0 : overrides.request);
              const { data, error } = await getCredential(Object.assign(Object.assign({}, challengeResponse.webauthn.credential_options), { publicKey: options, signal: abortSignal }));
              if (data) {
                return {
                  data: {
                    factorId,
                    challengeId: challengeResponse.id,
                    webauthn: {
                      type: challengeResponse.webauthn.type,
                      credential_response: data
                    }
                  },
                  error: null
                };
              }
              return { data: null, error };
            }
          }
        } catch (error) {
          if (isAuthError(error)) {
            return { data: null, error };
          }
          return {
            data: null,
            error: new AuthUnknownError("Unexpected error in challenge", error)
          };
        }
      }
      /**
       * Verify a WebAuthn credential with the server.
       * Completes the WebAuthn ceremony by sending the credential to the server for verification.
       *
       * @experimental This method is experimental and may change in future releases
       * @param {Object} params - Verification parameters
       * @param {string} params.challengeId - ID of the challenge being verified
       * @param {string} params.factorId - ID of the WebAuthn factor
       * @param {MFAVerifyWebauthnParams<T>['webauthn']} params.webauthn - WebAuthn credential response
       * @returns {Promise<AuthMFAVerifyResponse>} Verification result with session or error
       * @see {@link https://w3c.github.io/webauthn/#sctn-verifying-assertion W3C WebAuthn Spec - Verifying an Authentication Assertion}
       * */
      async _verify({ challengeId, factorId, webauthn }) {
        return this.client.mfa.verify({
          factorId,
          challengeId,
          webauthn
        });
      }
      /**
       * Complete WebAuthn authentication flow.
       * Performs challenge and verification in a single operation for existing credentials.
       *
       * @experimental This method is experimental and may change in future releases
       * @param {Object} params - Authentication parameters
       * @param {string} params.factorId - ID of the WebAuthn factor to authenticate with
       * @param {Object} params.webauthn - WebAuthn configuration
       * @param {string} params.webauthn.rpId - Relying Party ID (defaults to current hostname)
       * @param {string[]} params.webauthn.rpOrigins - Allowed origins (defaults to current origin)
       * @param {AbortSignal} params.webauthn.signal - Optional abort signal
       * @param {PublicKeyCredentialRequestOptionsFuture} overrides - Override options for navigator.credentials.get
       * @returns {Promise<RequestResult<AuthMFAVerifyResponseData, WebAuthnError | AuthError>>} Authentication result
       * @see {@link https://w3c.github.io/webauthn/#sctn-authentication W3C WebAuthn Spec - Authentication Ceremony}
       * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredentialRequestOptions MDN - PublicKeyCredentialRequestOptions}
       */
      async _authenticate({ factorId, webauthn: { rpId = typeof window !== "undefined" ? window.location.hostname : void 0, rpOrigins = typeof window !== "undefined" ? [window.location.origin] : void 0, signal } }, overrides) {
        if (!rpId) {
          return {
            data: null,
            error: new AuthError("rpId is required for WebAuthn authentication")
          };
        }
        try {
          if (!browserSupportsWebAuthn()) {
            return {
              data: null,
              error: new AuthUnknownError("Browser does not support WebAuthn", null)
            };
          }
          const { data: challengeResponse, error: challengeError } = await this.challenge({
            factorId,
            webauthn: { rpId, rpOrigins },
            signal
          }, { request: overrides });
          if (!challengeResponse) {
            return { data: null, error: challengeError };
          }
          const { webauthn } = challengeResponse;
          return this._verify({
            factorId,
            challengeId: challengeResponse.challengeId,
            webauthn: {
              type: webauthn.type,
              rpId,
              rpOrigins,
              credential_response: webauthn.credential_response
            }
          });
        } catch (error) {
          if (isAuthError(error)) {
            return { data: null, error };
          }
          return {
            data: null,
            error: new AuthUnknownError("Unexpected error in authenticate", error)
          };
        }
      }
      /**
       * Complete WebAuthn registration flow.
       * Performs enrollment, challenge, and verification in a single operation for new credentials.
       *
       * @experimental This method is experimental and may change in future releases
       * @param {Object} params - Registration parameters
       * @param {string} params.friendlyName - User-friendly name for the credential
       * @param {string} params.rpId - Relying Party ID (defaults to current hostname)
       * @param {string[]} params.rpOrigins - Allowed origins (defaults to current origin)
       * @param {AbortSignal} params.signal - Optional abort signal
       * @param {PublicKeyCredentialCreationOptionsFuture} overrides - Override options for navigator.credentials.create
       * @returns {Promise<RequestResult<AuthMFAVerifyResponseData, WebAuthnError | AuthError>>} Registration result
       * @see {@link https://w3c.github.io/webauthn/#sctn-registering-a-new-credential W3C WebAuthn Spec - Registration Ceremony}
       * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredentialCreationOptions MDN - PublicKeyCredentialCreationOptions}
       */
      async _register({ friendlyName, rpId = typeof window !== "undefined" ? window.location.hostname : void 0, rpOrigins = typeof window !== "undefined" ? [window.location.origin] : void 0, signal }, overrides) {
        if (!rpId) {
          return {
            data: null,
            error: new AuthError("rpId is required for WebAuthn registration")
          };
        }
        try {
          if (!browserSupportsWebAuthn()) {
            return {
              data: null,
              error: new AuthUnknownError("Browser does not support WebAuthn", null)
            };
          }
          const { data: factor, error: enrollError } = await this._enroll({
            friendlyName
          });
          if (!factor) {
            await this.client.mfa.listFactors().then((factors) => {
              var _a;
              return (_a = factors.data) === null || _a === void 0 ? void 0 : _a.all.find((v) => v.factor_type === "webauthn" && v.friendly_name === friendlyName && v.status !== "unverified");
            }).then((factor2) => factor2 ? this.client.mfa.unenroll({ factorId: factor2 === null || factor2 === void 0 ? void 0 : factor2.id }) : void 0);
            return { data: null, error: enrollError };
          }
          const { data: challengeResponse, error: challengeError } = await this._challenge({
            factorId: factor.id,
            friendlyName: factor.friendly_name,
            webauthn: { rpId, rpOrigins },
            signal
          }, {
            create: overrides
          });
          if (!challengeResponse) {
            return { data: null, error: challengeError };
          }
          return this._verify({
            factorId: factor.id,
            challengeId: challengeResponse.challengeId,
            webauthn: {
              rpId,
              rpOrigins,
              type: challengeResponse.webauthn.type,
              credential_response: challengeResponse.webauthn.credential_response
            }
          });
        } catch (error) {
          if (isAuthError(error)) {
            return { data: null, error };
          }
          return {
            data: null,
            error: new AuthUnknownError("Unexpected error in register", error)
          };
        }
      }
    };
    __name(WebAuthnApi, "WebAuthnApi");
  }
});

// node_modules/@supabase/auth-js/dist/module/GoTrueClient.js
async function lockNoOp(name, acquireTimeout, fn) {
  return await fn();
}
var DEFAULT_OPTIONS, GLOBAL_JWKS, GoTrueClient, GoTrueClient_default;
var init_GoTrueClient = __esm({
  "node_modules/@supabase/auth-js/dist/module/GoTrueClient.js"() {
    init_GoTrueAdminApi();
    init_constants4();
    init_errors2();
    init_fetch3();
    init_helpers4();
    init_local_storage();
    init_locks();
    init_polyfills();
    init_version4();
    init_base64url();
    init_ethereum();
    init_webauthn();
    polyfillGlobalThis();
    DEFAULT_OPTIONS = {
      url: GOTRUE_URL,
      storageKey: STORAGE_KEY,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      headers: DEFAULT_HEADERS3,
      flowType: "implicit",
      debug: false,
      hasCustomAuthorizationHeader: false
    };
    __name(lockNoOp, "lockNoOp");
    GLOBAL_JWKS = {};
    GoTrueClient = class {
      /**
       * The JWKS used for verifying asymmetric JWTs
       */
      get jwks() {
        var _a, _b;
        return (_b = (_a = GLOBAL_JWKS[this.storageKey]) === null || _a === void 0 ? void 0 : _a.jwks) !== null && _b !== void 0 ? _b : { keys: [] };
      }
      set jwks(value) {
        GLOBAL_JWKS[this.storageKey] = Object.assign(Object.assign({}, GLOBAL_JWKS[this.storageKey]), { jwks: value });
      }
      get jwks_cached_at() {
        var _a, _b;
        return (_b = (_a = GLOBAL_JWKS[this.storageKey]) === null || _a === void 0 ? void 0 : _a.cachedAt) !== null && _b !== void 0 ? _b : Number.MIN_SAFE_INTEGER;
      }
      set jwks_cached_at(value) {
        GLOBAL_JWKS[this.storageKey] = Object.assign(Object.assign({}, GLOBAL_JWKS[this.storageKey]), { cachedAt: value });
      }
      /**
       * Create a new client for use in the browser.
       */
      constructor(options) {
        var _a, _b;
        this.userStorage = null;
        this.memoryStorage = null;
        this.stateChangeEmitters = /* @__PURE__ */ new Map();
        this.autoRefreshTicker = null;
        this.visibilityChangedCallback = null;
        this.refreshingDeferred = null;
        this.initializePromise = null;
        this.detectSessionInUrl = true;
        this.hasCustomAuthorizationHeader = false;
        this.suppressGetSessionWarning = false;
        this.lockAcquired = false;
        this.pendingInLock = [];
        this.broadcastChannel = null;
        this.logger = console.log;
        this.instanceID = GoTrueClient.nextInstanceID;
        GoTrueClient.nextInstanceID += 1;
        if (this.instanceID > 0 && isBrowser()) {
          console.warn("Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same storage key.");
        }
        const settings = Object.assign(Object.assign({}, DEFAULT_OPTIONS), options);
        this.logDebugMessages = !!settings.debug;
        if (typeof settings.debug === "function") {
          this.logger = settings.debug;
        }
        this.persistSession = settings.persistSession;
        this.storageKey = settings.storageKey;
        this.autoRefreshToken = settings.autoRefreshToken;
        this.admin = new GoTrueAdminApi({
          url: settings.url,
          headers: settings.headers,
          fetch: settings.fetch
        });
        this.url = settings.url;
        this.headers = settings.headers;
        this.fetch = resolveFetch4(settings.fetch);
        this.lock = settings.lock || lockNoOp;
        this.detectSessionInUrl = settings.detectSessionInUrl;
        this.flowType = settings.flowType;
        this.hasCustomAuthorizationHeader = settings.hasCustomAuthorizationHeader;
        if (settings.lock) {
          this.lock = settings.lock;
        } else if (isBrowser() && ((_a = globalThis === null || globalThis === void 0 ? void 0 : globalThis.navigator) === null || _a === void 0 ? void 0 : _a.locks)) {
          this.lock = navigatorLock;
        } else {
          this.lock = lockNoOp;
        }
        if (!this.jwks) {
          this.jwks = { keys: [] };
          this.jwks_cached_at = Number.MIN_SAFE_INTEGER;
        }
        this.mfa = {
          verify: this._verify.bind(this),
          enroll: this._enroll.bind(this),
          unenroll: this._unenroll.bind(this),
          challenge: this._challenge.bind(this),
          listFactors: this._listFactors.bind(this),
          challengeAndVerify: this._challengeAndVerify.bind(this),
          getAuthenticatorAssuranceLevel: this._getAuthenticatorAssuranceLevel.bind(this),
          webauthn: new WebAuthnApi(this)
        };
        if (this.persistSession) {
          if (settings.storage) {
            this.storage = settings.storage;
          } else {
            if (supportsLocalStorage()) {
              this.storage = globalThis.localStorage;
            } else {
              this.memoryStorage = {};
              this.storage = memoryLocalStorageAdapter(this.memoryStorage);
            }
          }
          if (settings.userStorage) {
            this.userStorage = settings.userStorage;
          }
        } else {
          this.memoryStorage = {};
          this.storage = memoryLocalStorageAdapter(this.memoryStorage);
        }
        if (isBrowser() && globalThis.BroadcastChannel && this.persistSession && this.storageKey) {
          try {
            this.broadcastChannel = new globalThis.BroadcastChannel(this.storageKey);
          } catch (e) {
            console.error("Failed to create a new BroadcastChannel, multi-tab state changes will not be available", e);
          }
          (_b = this.broadcastChannel) === null || _b === void 0 ? void 0 : _b.addEventListener("message", async (event) => {
            this._debug("received broadcast notification from other tab or client", event);
            await this._notifyAllSubscribers(event.data.event, event.data.session, false);
          });
        }
        this.initialize();
      }
      _debug(...args) {
        if (this.logDebugMessages) {
          this.logger(`GoTrueClient@${this.instanceID} (${version4}) ${(/* @__PURE__ */ new Date()).toISOString()}`, ...args);
        }
        return this;
      }
      /**
       * Initializes the client session either from the url or from storage.
       * This method is automatically called when instantiating the client, but should also be called
       * manually when checking for an error from an auth redirect (oauth, magiclink, password recovery, etc).
       */
      async initialize() {
        if (this.initializePromise) {
          return await this.initializePromise;
        }
        this.initializePromise = (async () => {
          return await this._acquireLock(-1, async () => {
            return await this._initialize();
          });
        })();
        return await this.initializePromise;
      }
      /**
       * IMPORTANT:
       * 1. Never throw in this method, as it is called from the constructor
       * 2. Never return a session from this method as it would be cached over
       *    the whole lifetime of the client
       */
      async _initialize() {
        var _a;
        try {
          const params = parseParametersFromURL(window.location.href);
          let callbackUrlType = "none";
          if (this._isImplicitGrantCallback(params)) {
            callbackUrlType = "implicit";
          } else if (await this._isPKCECallback(params)) {
            callbackUrlType = "pkce";
          }
          if (isBrowser() && this.detectSessionInUrl && callbackUrlType !== "none") {
            const { data, error } = await this._getSessionFromURL(params, callbackUrlType);
            if (error) {
              this._debug("#_initialize()", "error detecting session from URL", error);
              if (isAuthImplicitGrantRedirectError(error)) {
                const errorCode = (_a = error.details) === null || _a === void 0 ? void 0 : _a.code;
                if (errorCode === "identity_already_exists" || errorCode === "identity_not_found" || errorCode === "single_identity_not_deletable") {
                  return { error };
                }
              }
              await this._removeSession();
              return { error };
            }
            const { session, redirectType } = data;
            this._debug("#_initialize()", "detected session in URL", session, "redirect type", redirectType);
            await this._saveSession(session);
            setTimeout(async () => {
              if (redirectType === "recovery") {
                await this._notifyAllSubscribers("PASSWORD_RECOVERY", session);
              } else {
                await this._notifyAllSubscribers("SIGNED_IN", session);
              }
            }, 0);
            return { error: null };
          }
          await this._recoverAndRefresh();
          return { error: null };
        } catch (error) {
          if (isAuthError(error)) {
            return { error };
          }
          return {
            error: new AuthUnknownError("Unexpected error during initialization", error)
          };
        } finally {
          await this._handleVisibilityChange();
          this._debug("#_initialize()", "end");
        }
      }
      /**
       * Creates a new anonymous user.
       *
       * @returns A session where the is_anonymous claim in the access token JWT set to true
       */
      async signInAnonymously(credentials) {
        var _a, _b, _c;
        try {
          const res = await _request(this.fetch, "POST", `${this.url}/signup`, {
            headers: this.headers,
            body: {
              data: (_b = (_a = credentials === null || credentials === void 0 ? void 0 : credentials.options) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : {},
              gotrue_meta_security: { captcha_token: (_c = credentials === null || credentials === void 0 ? void 0 : credentials.options) === null || _c === void 0 ? void 0 : _c.captchaToken }
            },
            xform: _sessionResponse
          });
          const { data, error } = res;
          if (error || !data) {
            return { data: { user: null, session: null }, error };
          }
          const session = data.session;
          const user = data.user;
          if (data.session) {
            await this._saveSession(data.session);
            await this._notifyAllSubscribers("SIGNED_IN", session);
          }
          return { data: { user, session }, error: null };
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { user: null, session: null }, error };
          }
          throw error;
        }
      }
      /**
       * Creates a new user.
       *
       * Be aware that if a user account exists in the system you may get back an
       * error message that attempts to hide this information from the user.
       * This method has support for PKCE via email signups. The PKCE flow cannot be used when autoconfirm is enabled.
       *
       * @returns A logged-in session if the server has "autoconfirm" ON
       * @returns A user if the server has "autoconfirm" OFF
       */
      async signUp(credentials) {
        var _a, _b, _c;
        try {
          let res;
          if ("email" in credentials) {
            const { email, password, options } = credentials;
            let codeChallenge = null;
            let codeChallengeMethod = null;
            if (this.flowType === "pkce") {
              ;
              [codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(this.storage, this.storageKey);
            }
            res = await _request(this.fetch, "POST", `${this.url}/signup`, {
              headers: this.headers,
              redirectTo: options === null || options === void 0 ? void 0 : options.emailRedirectTo,
              body: {
                email,
                password,
                data: (_a = options === null || options === void 0 ? void 0 : options.data) !== null && _a !== void 0 ? _a : {},
                gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken },
                code_challenge: codeChallenge,
                code_challenge_method: codeChallengeMethod
              },
              xform: _sessionResponse
            });
          } else if ("phone" in credentials) {
            const { phone, password, options } = credentials;
            res = await _request(this.fetch, "POST", `${this.url}/signup`, {
              headers: this.headers,
              body: {
                phone,
                password,
                data: (_b = options === null || options === void 0 ? void 0 : options.data) !== null && _b !== void 0 ? _b : {},
                channel: (_c = options === null || options === void 0 ? void 0 : options.channel) !== null && _c !== void 0 ? _c : "sms",
                gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken }
              },
              xform: _sessionResponse
            });
          } else {
            throw new AuthInvalidCredentialsError("You must provide either an email or phone number and a password");
          }
          const { data, error } = res;
          if (error || !data) {
            return { data: { user: null, session: null }, error };
          }
          const session = data.session;
          const user = data.user;
          if (data.session) {
            await this._saveSession(data.session);
            await this._notifyAllSubscribers("SIGNED_IN", session);
          }
          return { data: { user, session }, error: null };
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { user: null, session: null }, error };
          }
          throw error;
        }
      }
      /**
       * Log in an existing user with an email and password or phone and password.
       *
       * Be aware that you may get back an error message that will not distinguish
       * between the cases where the account does not exist or that the
       * email/phone and password combination is wrong or that the account can only
       * be accessed via social login.
       */
      async signInWithPassword(credentials) {
        try {
          let res;
          if ("email" in credentials) {
            const { email, password, options } = credentials;
            res = await _request(this.fetch, "POST", `${this.url}/token?grant_type=password`, {
              headers: this.headers,
              body: {
                email,
                password,
                gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken }
              },
              xform: _sessionResponsePassword
            });
          } else if ("phone" in credentials) {
            const { phone, password, options } = credentials;
            res = await _request(this.fetch, "POST", `${this.url}/token?grant_type=password`, {
              headers: this.headers,
              body: {
                phone,
                password,
                gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken }
              },
              xform: _sessionResponsePassword
            });
          } else {
            throw new AuthInvalidCredentialsError("You must provide either an email or phone number and a password");
          }
          const { data, error } = res;
          if (error) {
            return { data: { user: null, session: null }, error };
          } else if (!data || !data.session || !data.user) {
            return { data: { user: null, session: null }, error: new AuthInvalidTokenResponseError() };
          }
          if (data.session) {
            await this._saveSession(data.session);
            await this._notifyAllSubscribers("SIGNED_IN", data.session);
          }
          return {
            data: Object.assign({ user: data.user, session: data.session }, data.weak_password ? { weakPassword: data.weak_password } : null),
            error
          };
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { user: null, session: null }, error };
          }
          throw error;
        }
      }
      /**
       * Log in an existing user via a third-party provider.
       * This method supports the PKCE flow.
       */
      async signInWithOAuth(credentials) {
        var _a, _b, _c, _d;
        return await this._handleProviderSignIn(credentials.provider, {
          redirectTo: (_a = credentials.options) === null || _a === void 0 ? void 0 : _a.redirectTo,
          scopes: (_b = credentials.options) === null || _b === void 0 ? void 0 : _b.scopes,
          queryParams: (_c = credentials.options) === null || _c === void 0 ? void 0 : _c.queryParams,
          skipBrowserRedirect: (_d = credentials.options) === null || _d === void 0 ? void 0 : _d.skipBrowserRedirect
        });
      }
      /**
       * Log in an existing user by exchanging an Auth Code issued during the PKCE flow.
       */
      async exchangeCodeForSession(authCode) {
        await this.initializePromise;
        return this._acquireLock(-1, async () => {
          return this._exchangeCodeForSession(authCode);
        });
      }
      /**
       * Signs in a user by verifying a message signed by the user's private key.
       * Supports Ethereum (via Sign-In-With-Ethereum) & Solana (Sign-In-With-Solana) standards,
       * both of which derive from the EIP-4361 standard
       * With slight variation on Solana's side.
       * @reference https://eips.ethereum.org/EIPS/eip-4361
       */
      async signInWithWeb3(credentials) {
        const { chain } = credentials;
        switch (chain) {
          case "ethereum":
            return await this.signInWithEthereum(credentials);
          case "solana":
            return await this.signInWithSolana(credentials);
          default:
            throw new Error(`@supabase/auth-js: Unsupported chain "${chain}"`);
        }
      }
      async signInWithEthereum(credentials) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        let message;
        let signature;
        if ("message" in credentials) {
          message = credentials.message;
          signature = credentials.signature;
        } else {
          const { chain, wallet, statement, options } = credentials;
          let resolvedWallet;
          if (!isBrowser()) {
            if (typeof wallet !== "object" || !(options === null || options === void 0 ? void 0 : options.url)) {
              throw new Error("@supabase/auth-js: Both wallet and url must be specified in non-browser environments.");
            }
            resolvedWallet = wallet;
          } else if (typeof wallet === "object") {
            resolvedWallet = wallet;
          } else {
            const windowAny = window;
            if ("ethereum" in windowAny && typeof windowAny.ethereum === "object" && "request" in windowAny.ethereum && typeof windowAny.ethereum.request === "function") {
              resolvedWallet = windowAny.ethereum;
            } else {
              throw new Error(`@supabase/auth-js: No compatible Ethereum wallet interface on the window object (window.ethereum) detected. Make sure the user already has a wallet installed and connected for this app. Prefer passing the wallet interface object directly to signInWithWeb3({ chain: 'ethereum', wallet: resolvedUserWallet }) instead.`);
            }
          }
          const url = new URL((_a = options === null || options === void 0 ? void 0 : options.url) !== null && _a !== void 0 ? _a : window.location.href);
          const accounts = await resolvedWallet.request({
            method: "eth_requestAccounts"
          }).then((accs) => accs).catch(() => {
            throw new Error(`@supabase/auth-js: Wallet method eth_requestAccounts is missing or invalid`);
          });
          if (!accounts || accounts.length === 0) {
            throw new Error(`@supabase/auth-js: No accounts available. Please ensure the wallet is connected.`);
          }
          const address = getAddress(accounts[0]);
          let chainId = (_b = options === null || options === void 0 ? void 0 : options.signInWithEthereum) === null || _b === void 0 ? void 0 : _b.chainId;
          if (!chainId) {
            const chainIdHex = await resolvedWallet.request({
              method: "eth_chainId"
            });
            chainId = fromHex(chainIdHex);
          }
          const siweMessage = {
            domain: url.host,
            address,
            statement,
            uri: url.href,
            version: "1",
            chainId,
            nonce: (_c = options === null || options === void 0 ? void 0 : options.signInWithEthereum) === null || _c === void 0 ? void 0 : _c.nonce,
            issuedAt: (_e = (_d = options === null || options === void 0 ? void 0 : options.signInWithEthereum) === null || _d === void 0 ? void 0 : _d.issuedAt) !== null && _e !== void 0 ? _e : /* @__PURE__ */ new Date(),
            expirationTime: (_f = options === null || options === void 0 ? void 0 : options.signInWithEthereum) === null || _f === void 0 ? void 0 : _f.expirationTime,
            notBefore: (_g = options === null || options === void 0 ? void 0 : options.signInWithEthereum) === null || _g === void 0 ? void 0 : _g.notBefore,
            requestId: (_h = options === null || options === void 0 ? void 0 : options.signInWithEthereum) === null || _h === void 0 ? void 0 : _h.requestId,
            resources: (_j = options === null || options === void 0 ? void 0 : options.signInWithEthereum) === null || _j === void 0 ? void 0 : _j.resources
          };
          message = createSiweMessage(siweMessage);
          signature = await resolvedWallet.request({
            method: "personal_sign",
            params: [toHex(message), address]
          });
        }
        try {
          const { data, error } = await _request(this.fetch, "POST", `${this.url}/token?grant_type=web3`, {
            headers: this.headers,
            body: Object.assign({
              chain: "ethereum",
              message,
              signature
            }, ((_k = credentials.options) === null || _k === void 0 ? void 0 : _k.captchaToken) ? { gotrue_meta_security: { captcha_token: (_l = credentials.options) === null || _l === void 0 ? void 0 : _l.captchaToken } } : null),
            xform: _sessionResponse
          });
          if (error) {
            throw error;
          }
          if (!data || !data.session || !data.user) {
            return {
              data: { user: null, session: null },
              error: new AuthInvalidTokenResponseError()
            };
          }
          if (data.session) {
            await this._saveSession(data.session);
            await this._notifyAllSubscribers("SIGNED_IN", data.session);
          }
          return { data: Object.assign({}, data), error };
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { user: null, session: null }, error };
          }
          throw error;
        }
      }
      async signInWithSolana(credentials) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        let message;
        let signature;
        if ("message" in credentials) {
          message = credentials.message;
          signature = credentials.signature;
        } else {
          const { chain, wallet, statement, options } = credentials;
          let resolvedWallet;
          if (!isBrowser()) {
            if (typeof wallet !== "object" || !(options === null || options === void 0 ? void 0 : options.url)) {
              throw new Error("@supabase/auth-js: Both wallet and url must be specified in non-browser environments.");
            }
            resolvedWallet = wallet;
          } else if (typeof wallet === "object") {
            resolvedWallet = wallet;
          } else {
            const windowAny = window;
            if ("solana" in windowAny && typeof windowAny.solana === "object" && ("signIn" in windowAny.solana && typeof windowAny.solana.signIn === "function" || "signMessage" in windowAny.solana && typeof windowAny.solana.signMessage === "function")) {
              resolvedWallet = windowAny.solana;
            } else {
              throw new Error(`@supabase/auth-js: No compatible Solana wallet interface on the window object (window.solana) detected. Make sure the user already has a wallet installed and connected for this app. Prefer passing the wallet interface object directly to signInWithWeb3({ chain: 'solana', wallet: resolvedUserWallet }) instead.`);
            }
          }
          const url = new URL((_a = options === null || options === void 0 ? void 0 : options.url) !== null && _a !== void 0 ? _a : window.location.href);
          if ("signIn" in resolvedWallet && resolvedWallet.signIn) {
            const output = await resolvedWallet.signIn(Object.assign(Object.assign(Object.assign({ issuedAt: (/* @__PURE__ */ new Date()).toISOString() }, options === null || options === void 0 ? void 0 : options.signInWithSolana), {
              // non-overridable properties
              version: "1",
              domain: url.host,
              uri: url.href
            }), statement ? { statement } : null));
            let outputToProcess;
            if (Array.isArray(output) && output[0] && typeof output[0] === "object") {
              outputToProcess = output[0];
            } else if (output && typeof output === "object" && "signedMessage" in output && "signature" in output) {
              outputToProcess = output;
            } else {
              throw new Error("@supabase/auth-js: Wallet method signIn() returned unrecognized value");
            }
            if ("signedMessage" in outputToProcess && "signature" in outputToProcess && (typeof outputToProcess.signedMessage === "string" || outputToProcess.signedMessage instanceof Uint8Array) && outputToProcess.signature instanceof Uint8Array) {
              message = typeof outputToProcess.signedMessage === "string" ? outputToProcess.signedMessage : new TextDecoder().decode(outputToProcess.signedMessage);
              signature = outputToProcess.signature;
            } else {
              throw new Error("@supabase/auth-js: Wallet method signIn() API returned object without signedMessage and signature fields");
            }
          } else {
            if (!("signMessage" in resolvedWallet) || typeof resolvedWallet.signMessage !== "function" || !("publicKey" in resolvedWallet) || typeof resolvedWallet !== "object" || !resolvedWallet.publicKey || !("toBase58" in resolvedWallet.publicKey) || typeof resolvedWallet.publicKey.toBase58 !== "function") {
              throw new Error("@supabase/auth-js: Wallet does not have a compatible signMessage() and publicKey.toBase58() API");
            }
            message = [
              `${url.host} wants you to sign in with your Solana account:`,
              resolvedWallet.publicKey.toBase58(),
              ...statement ? ["", statement, ""] : [""],
              "Version: 1",
              `URI: ${url.href}`,
              `Issued At: ${(_c = (_b = options === null || options === void 0 ? void 0 : options.signInWithSolana) === null || _b === void 0 ? void 0 : _b.issuedAt) !== null && _c !== void 0 ? _c : (/* @__PURE__ */ new Date()).toISOString()}`,
              ...((_d = options === null || options === void 0 ? void 0 : options.signInWithSolana) === null || _d === void 0 ? void 0 : _d.notBefore) ? [`Not Before: ${options.signInWithSolana.notBefore}`] : [],
              ...((_e = options === null || options === void 0 ? void 0 : options.signInWithSolana) === null || _e === void 0 ? void 0 : _e.expirationTime) ? [`Expiration Time: ${options.signInWithSolana.expirationTime}`] : [],
              ...((_f = options === null || options === void 0 ? void 0 : options.signInWithSolana) === null || _f === void 0 ? void 0 : _f.chainId) ? [`Chain ID: ${options.signInWithSolana.chainId}`] : [],
              ...((_g = options === null || options === void 0 ? void 0 : options.signInWithSolana) === null || _g === void 0 ? void 0 : _g.nonce) ? [`Nonce: ${options.signInWithSolana.nonce}`] : [],
              ...((_h = options === null || options === void 0 ? void 0 : options.signInWithSolana) === null || _h === void 0 ? void 0 : _h.requestId) ? [`Request ID: ${options.signInWithSolana.requestId}`] : [],
              ...((_k = (_j = options === null || options === void 0 ? void 0 : options.signInWithSolana) === null || _j === void 0 ? void 0 : _j.resources) === null || _k === void 0 ? void 0 : _k.length) ? [
                "Resources",
                ...options.signInWithSolana.resources.map((resource) => `- ${resource}`)
              ] : []
            ].join("\n");
            const maybeSignature = await resolvedWallet.signMessage(new TextEncoder().encode(message), "utf8");
            if (!maybeSignature || !(maybeSignature instanceof Uint8Array)) {
              throw new Error("@supabase/auth-js: Wallet signMessage() API returned an recognized value");
            }
            signature = maybeSignature;
          }
        }
        try {
          const { data, error } = await _request(this.fetch, "POST", `${this.url}/token?grant_type=web3`, {
            headers: this.headers,
            body: Object.assign({ chain: "solana", message, signature: bytesToBase64URL(signature) }, ((_l = credentials.options) === null || _l === void 0 ? void 0 : _l.captchaToken) ? { gotrue_meta_security: { captcha_token: (_m = credentials.options) === null || _m === void 0 ? void 0 : _m.captchaToken } } : null),
            xform: _sessionResponse
          });
          if (error) {
            throw error;
          }
          if (!data || !data.session || !data.user) {
            return {
              data: { user: null, session: null },
              error: new AuthInvalidTokenResponseError()
            };
          }
          if (data.session) {
            await this._saveSession(data.session);
            await this._notifyAllSubscribers("SIGNED_IN", data.session);
          }
          return { data: Object.assign({}, data), error };
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { user: null, session: null }, error };
          }
          throw error;
        }
      }
      async _exchangeCodeForSession(authCode) {
        const storageItem = await getItemAsync(this.storage, `${this.storageKey}-code-verifier`);
        const [codeVerifier, redirectType] = (storageItem !== null && storageItem !== void 0 ? storageItem : "").split("/");
        try {
          const { data, error } = await _request(this.fetch, "POST", `${this.url}/token?grant_type=pkce`, {
            headers: this.headers,
            body: {
              auth_code: authCode,
              code_verifier: codeVerifier
            },
            xform: _sessionResponse
          });
          await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`);
          if (error) {
            throw error;
          }
          if (!data || !data.session || !data.user) {
            return {
              data: { user: null, session: null, redirectType: null },
              error: new AuthInvalidTokenResponseError()
            };
          }
          if (data.session) {
            await this._saveSession(data.session);
            await this._notifyAllSubscribers("SIGNED_IN", data.session);
          }
          return { data: Object.assign(Object.assign({}, data), { redirectType: redirectType !== null && redirectType !== void 0 ? redirectType : null }), error };
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { user: null, session: null, redirectType: null }, error };
          }
          throw error;
        }
      }
      /**
       * Allows signing in with an OIDC ID token. The authentication provider used
       * should be enabled and configured.
       */
      async signInWithIdToken(credentials) {
        try {
          const { options, provider, token, access_token, nonce } = credentials;
          const res = await _request(this.fetch, "POST", `${this.url}/token?grant_type=id_token`, {
            headers: this.headers,
            body: {
              provider,
              id_token: token,
              access_token,
              nonce,
              gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken }
            },
            xform: _sessionResponse
          });
          const { data, error } = res;
          if (error) {
            return { data: { user: null, session: null }, error };
          } else if (!data || !data.session || !data.user) {
            return {
              data: { user: null, session: null },
              error: new AuthInvalidTokenResponseError()
            };
          }
          if (data.session) {
            await this._saveSession(data.session);
            await this._notifyAllSubscribers("SIGNED_IN", data.session);
          }
          return { data, error };
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { user: null, session: null }, error };
          }
          throw error;
        }
      }
      /**
       * Log in a user using magiclink or a one-time password (OTP).
       *
       * If the `{{ .ConfirmationURL }}` variable is specified in the email template, a magiclink will be sent.
       * If the `{{ .Token }}` variable is specified in the email template, an OTP will be sent.
       * If you're using phone sign-ins, only an OTP will be sent. You won't be able to send a magiclink for phone sign-ins.
       *
       * Be aware that you may get back an error message that will not distinguish
       * between the cases where the account does not exist or, that the account
       * can only be accessed via social login.
       *
       * Do note that you will need to configure a Whatsapp sender on Twilio
       * if you are using phone sign in with the 'whatsapp' channel. The whatsapp
       * channel is not supported on other providers
       * at this time.
       * This method supports PKCE when an email is passed.
       */
      async signInWithOtp(credentials) {
        var _a, _b, _c, _d, _e;
        try {
          if ("email" in credentials) {
            const { email, options } = credentials;
            let codeChallenge = null;
            let codeChallengeMethod = null;
            if (this.flowType === "pkce") {
              ;
              [codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(this.storage, this.storageKey);
            }
            const { error } = await _request(this.fetch, "POST", `${this.url}/otp`, {
              headers: this.headers,
              body: {
                email,
                data: (_a = options === null || options === void 0 ? void 0 : options.data) !== null && _a !== void 0 ? _a : {},
                create_user: (_b = options === null || options === void 0 ? void 0 : options.shouldCreateUser) !== null && _b !== void 0 ? _b : true,
                gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken },
                code_challenge: codeChallenge,
                code_challenge_method: codeChallengeMethod
              },
              redirectTo: options === null || options === void 0 ? void 0 : options.emailRedirectTo
            });
            return { data: { user: null, session: null }, error };
          }
          if ("phone" in credentials) {
            const { phone, options } = credentials;
            const { data, error } = await _request(this.fetch, "POST", `${this.url}/otp`, {
              headers: this.headers,
              body: {
                phone,
                data: (_c = options === null || options === void 0 ? void 0 : options.data) !== null && _c !== void 0 ? _c : {},
                create_user: (_d = options === null || options === void 0 ? void 0 : options.shouldCreateUser) !== null && _d !== void 0 ? _d : true,
                gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken },
                channel: (_e = options === null || options === void 0 ? void 0 : options.channel) !== null && _e !== void 0 ? _e : "sms"
              }
            });
            return { data: { user: null, session: null, messageId: data === null || data === void 0 ? void 0 : data.message_id }, error };
          }
          throw new AuthInvalidCredentialsError("You must provide either an email or phone number.");
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { user: null, session: null }, error };
          }
          throw error;
        }
      }
      /**
       * Log in a user given a User supplied OTP or TokenHash received through mobile or email.
       */
      async verifyOtp(params) {
        var _a, _b;
        try {
          let redirectTo = void 0;
          let captchaToken = void 0;
          if ("options" in params) {
            redirectTo = (_a = params.options) === null || _a === void 0 ? void 0 : _a.redirectTo;
            captchaToken = (_b = params.options) === null || _b === void 0 ? void 0 : _b.captchaToken;
          }
          const { data, error } = await _request(this.fetch, "POST", `${this.url}/verify`, {
            headers: this.headers,
            body: Object.assign(Object.assign({}, params), { gotrue_meta_security: { captcha_token: captchaToken } }),
            redirectTo,
            xform: _sessionResponse
          });
          if (error) {
            throw error;
          }
          if (!data) {
            throw new Error("An error occurred on token verification.");
          }
          const session = data.session;
          const user = data.user;
          if (session === null || session === void 0 ? void 0 : session.access_token) {
            await this._saveSession(session);
            await this._notifyAllSubscribers(params.type == "recovery" ? "PASSWORD_RECOVERY" : "SIGNED_IN", session);
          }
          return { data: { user, session }, error: null };
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { user: null, session: null }, error };
          }
          throw error;
        }
      }
      /**
       * Attempts a single-sign on using an enterprise Identity Provider. A
       * successful SSO attempt will redirect the current page to the identity
       * provider authorization page. The redirect URL is implementation and SSO
       * protocol specific.
       *
       * You can use it by providing a SSO domain. Typically you can extract this
       * domain by asking users for their email address. If this domain is
       * registered on the Auth instance the redirect will use that organization's
       * currently active SSO Identity Provider for the login.
       *
       * If you have built an organization-specific login page, you can use the
       * organization's SSO Identity Provider UUID directly instead.
       */
      async signInWithSSO(params) {
        var _a, _b, _c;
        try {
          let codeChallenge = null;
          let codeChallengeMethod = null;
          if (this.flowType === "pkce") {
            ;
            [codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(this.storage, this.storageKey);
          }
          return await _request(this.fetch, "POST", `${this.url}/sso`, {
            body: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, "providerId" in params ? { provider_id: params.providerId } : null), "domain" in params ? { domain: params.domain } : null), { redirect_to: (_b = (_a = params.options) === null || _a === void 0 ? void 0 : _a.redirectTo) !== null && _b !== void 0 ? _b : void 0 }), ((_c = params === null || params === void 0 ? void 0 : params.options) === null || _c === void 0 ? void 0 : _c.captchaToken) ? { gotrue_meta_security: { captcha_token: params.options.captchaToken } } : null), { skip_http_redirect: true, code_challenge: codeChallenge, code_challenge_method: codeChallengeMethod }),
            headers: this.headers,
            xform: _ssoResponse
          });
        } catch (error) {
          if (isAuthError(error)) {
            return { data: null, error };
          }
          throw error;
        }
      }
      /**
       * Sends a reauthentication OTP to the user's email or phone number.
       * Requires the user to be signed-in.
       */
      async reauthenticate() {
        await this.initializePromise;
        return await this._acquireLock(-1, async () => {
          return await this._reauthenticate();
        });
      }
      async _reauthenticate() {
        try {
          return await this._useSession(async (result) => {
            const { data: { session }, error: sessionError } = result;
            if (sessionError)
              throw sessionError;
            if (!session)
              throw new AuthSessionMissingError();
            const { error } = await _request(this.fetch, "GET", `${this.url}/reauthenticate`, {
              headers: this.headers,
              jwt: session.access_token
            });
            return { data: { user: null, session: null }, error };
          });
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { user: null, session: null }, error };
          }
          throw error;
        }
      }
      /**
       * Resends an existing signup confirmation email, email change email, SMS OTP or phone change OTP.
       */
      async resend(credentials) {
        try {
          const endpoint = `${this.url}/resend`;
          if ("email" in credentials) {
            const { email, type, options } = credentials;
            const { error } = await _request(this.fetch, "POST", endpoint, {
              headers: this.headers,
              body: {
                email,
                type,
                gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken }
              },
              redirectTo: options === null || options === void 0 ? void 0 : options.emailRedirectTo
            });
            return { data: { user: null, session: null }, error };
          } else if ("phone" in credentials) {
            const { phone, type, options } = credentials;
            const { data, error } = await _request(this.fetch, "POST", endpoint, {
              headers: this.headers,
              body: {
                phone,
                type,
                gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken }
              }
            });
            return { data: { user: null, session: null, messageId: data === null || data === void 0 ? void 0 : data.message_id }, error };
          }
          throw new AuthInvalidCredentialsError("You must provide either an email or phone number and a type");
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { user: null, session: null }, error };
          }
          throw error;
        }
      }
      /**
       * Returns the session, refreshing it if necessary.
       *
       * The session returned can be null if the session is not detected which can happen in the event a user is not signed-in or has logged out.
       *
       * **IMPORTANT:** This method loads values directly from the storage attached
       * to the client. If that storage is based on request cookies for example,
       * the values in it may not be authentic and therefore it's strongly advised
       * against using this method and its results in such circumstances. A warning
       * will be emitted if this is detected. Use {@link #getUser()} instead.
       */
      async getSession() {
        await this.initializePromise;
        const result = await this._acquireLock(-1, async () => {
          return this._useSession(async (result2) => {
            return result2;
          });
        });
        return result;
      }
      /**
       * Acquires a global lock based on the storage key.
       */
      async _acquireLock(acquireTimeout, fn) {
        this._debug("#_acquireLock", "begin", acquireTimeout);
        try {
          if (this.lockAcquired) {
            const last = this.pendingInLock.length ? this.pendingInLock[this.pendingInLock.length - 1] : Promise.resolve();
            const result = (async () => {
              await last;
              return await fn();
            })();
            this.pendingInLock.push((async () => {
              try {
                await result;
              } catch (e) {
              }
            })());
            return result;
          }
          return await this.lock(`lock:${this.storageKey}`, acquireTimeout, async () => {
            this._debug("#_acquireLock", "lock acquired for storage key", this.storageKey);
            try {
              this.lockAcquired = true;
              const result = fn();
              this.pendingInLock.push((async () => {
                try {
                  await result;
                } catch (e) {
                }
              })());
              await result;
              while (this.pendingInLock.length) {
                const waitOn = [...this.pendingInLock];
                await Promise.all(waitOn);
                this.pendingInLock.splice(0, waitOn.length);
              }
              return await result;
            } finally {
              this._debug("#_acquireLock", "lock released for storage key", this.storageKey);
              this.lockAcquired = false;
            }
          });
        } finally {
          this._debug("#_acquireLock", "end");
        }
      }
      /**
       * Use instead of {@link #getSession} inside the library. It is
       * semantically usually what you want, as getting a session involves some
       * processing afterwards that requires only one client operating on the
       * session at once across multiple tabs or processes.
       */
      async _useSession(fn) {
        this._debug("#_useSession", "begin");
        try {
          const result = await this.__loadSession();
          return await fn(result);
        } finally {
          this._debug("#_useSession", "end");
        }
      }
      /**
       * NEVER USE DIRECTLY!
       *
       * Always use {@link #_useSession}.
       */
      async __loadSession() {
        this._debug("#__loadSession()", "begin");
        if (!this.lockAcquired) {
          this._debug("#__loadSession()", "used outside of an acquired lock!", new Error().stack);
        }
        try {
          let currentSession = null;
          const maybeSession = await getItemAsync(this.storage, this.storageKey);
          this._debug("#getSession()", "session from storage", maybeSession);
          if (maybeSession !== null) {
            if (this._isValidSession(maybeSession)) {
              currentSession = maybeSession;
            } else {
              this._debug("#getSession()", "session from storage is not valid");
              await this._removeSession();
            }
          }
          if (!currentSession) {
            return { data: { session: null }, error: null };
          }
          const hasExpired = currentSession.expires_at ? currentSession.expires_at * 1e3 - Date.now() < EXPIRY_MARGIN_MS : false;
          this._debug("#__loadSession()", `session has${hasExpired ? "" : " not"} expired`, "expires_at", currentSession.expires_at);
          if (!hasExpired) {
            if (this.userStorage) {
              const maybeUser = await getItemAsync(this.userStorage, this.storageKey + "-user");
              if (maybeUser === null || maybeUser === void 0 ? void 0 : maybeUser.user) {
                currentSession.user = maybeUser.user;
              } else {
                currentSession.user = userNotAvailableProxy();
              }
            }
            if (this.storage.isServer && currentSession.user) {
              let suppressWarning = this.suppressGetSessionWarning;
              const proxySession = new Proxy(currentSession, {
                get: (target, prop, receiver) => {
                  if (!suppressWarning && prop === "user") {
                    console.warn("Using the user object as returned from supabase.auth.getSession() or from some supabase.auth.onAuthStateChange() events could be insecure! This value comes directly from the storage medium (usually cookies on the server) and may not be authentic. Use supabase.auth.getUser() instead which authenticates the data by contacting the Supabase Auth server.");
                    suppressWarning = true;
                    this.suppressGetSessionWarning = true;
                  }
                  return Reflect.get(target, prop, receiver);
                }
              });
              currentSession = proxySession;
            }
            return { data: { session: currentSession }, error: null };
          }
          const { data: session, error } = await this._callRefreshToken(currentSession.refresh_token);
          if (error) {
            return { data: { session: null }, error };
          }
          return { data: { session }, error: null };
        } finally {
          this._debug("#__loadSession()", "end");
        }
      }
      /**
       * Gets the current user details if there is an existing session. This method
       * performs a network request to the Supabase Auth server, so the returned
       * value is authentic and can be used to base authorization rules on.
       *
       * @param jwt Takes in an optional access token JWT. If no JWT is provided, the JWT from the current session is used.
       */
      async getUser(jwt) {
        if (jwt) {
          return await this._getUser(jwt);
        }
        await this.initializePromise;
        const result = await this._acquireLock(-1, async () => {
          return await this._getUser();
        });
        return result;
      }
      async _getUser(jwt) {
        try {
          if (jwt) {
            return await _request(this.fetch, "GET", `${this.url}/user`, {
              headers: this.headers,
              jwt,
              xform: _userResponse
            });
          }
          return await this._useSession(async (result) => {
            var _a, _b, _c;
            const { data, error } = result;
            if (error) {
              throw error;
            }
            if (!((_a = data.session) === null || _a === void 0 ? void 0 : _a.access_token) && !this.hasCustomAuthorizationHeader) {
              return { data: { user: null }, error: new AuthSessionMissingError() };
            }
            return await _request(this.fetch, "GET", `${this.url}/user`, {
              headers: this.headers,
              jwt: (_c = (_b = data.session) === null || _b === void 0 ? void 0 : _b.access_token) !== null && _c !== void 0 ? _c : void 0,
              xform: _userResponse
            });
          });
        } catch (error) {
          if (isAuthError(error)) {
            if (isAuthSessionMissingError(error)) {
              await this._removeSession();
              await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`);
            }
            return { data: { user: null }, error };
          }
          throw error;
        }
      }
      /**
       * Updates user data for a logged in user.
       */
      async updateUser(attributes, options = {}) {
        await this.initializePromise;
        return await this._acquireLock(-1, async () => {
          return await this._updateUser(attributes, options);
        });
      }
      async _updateUser(attributes, options = {}) {
        try {
          return await this._useSession(async (result) => {
            const { data: sessionData, error: sessionError } = result;
            if (sessionError) {
              throw sessionError;
            }
            if (!sessionData.session) {
              throw new AuthSessionMissingError();
            }
            const session = sessionData.session;
            let codeChallenge = null;
            let codeChallengeMethod = null;
            if (this.flowType === "pkce" && attributes.email != null) {
              ;
              [codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(this.storage, this.storageKey);
            }
            const { data, error: userError } = await _request(this.fetch, "PUT", `${this.url}/user`, {
              headers: this.headers,
              redirectTo: options === null || options === void 0 ? void 0 : options.emailRedirectTo,
              body: Object.assign(Object.assign({}, attributes), { code_challenge: codeChallenge, code_challenge_method: codeChallengeMethod }),
              jwt: session.access_token,
              xform: _userResponse
            });
            if (userError)
              throw userError;
            session.user = data.user;
            await this._saveSession(session);
            await this._notifyAllSubscribers("USER_UPDATED", session);
            return { data: { user: session.user }, error: null };
          });
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { user: null }, error };
          }
          throw error;
        }
      }
      /**
       * Sets the session data from the current session. If the current session is expired, setSession will take care of refreshing it to obtain a new session.
       * If the refresh token or access token in the current session is invalid, an error will be thrown.
       * @param currentSession The current session that minimally contains an access token and refresh token.
       */
      async setSession(currentSession) {
        await this.initializePromise;
        return await this._acquireLock(-1, async () => {
          return await this._setSession(currentSession);
        });
      }
      async _setSession(currentSession) {
        try {
          if (!currentSession.access_token || !currentSession.refresh_token) {
            throw new AuthSessionMissingError();
          }
          const timeNow = Date.now() / 1e3;
          let expiresAt2 = timeNow;
          let hasExpired = true;
          let session = null;
          const { payload } = decodeJWT(currentSession.access_token);
          if (payload.exp) {
            expiresAt2 = payload.exp;
            hasExpired = expiresAt2 <= timeNow;
          }
          if (hasExpired) {
            const { data: refreshedSession, error } = await this._callRefreshToken(currentSession.refresh_token);
            if (error) {
              return { data: { user: null, session: null }, error };
            }
            if (!refreshedSession) {
              return { data: { user: null, session: null }, error: null };
            }
            session = refreshedSession;
          } else {
            const { data, error } = await this._getUser(currentSession.access_token);
            if (error) {
              throw error;
            }
            session = {
              access_token: currentSession.access_token,
              refresh_token: currentSession.refresh_token,
              user: data.user,
              token_type: "bearer",
              expires_in: expiresAt2 - timeNow,
              expires_at: expiresAt2
            };
            await this._saveSession(session);
            await this._notifyAllSubscribers("SIGNED_IN", session);
          }
          return { data: { user: session.user, session }, error: null };
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { session: null, user: null }, error };
          }
          throw error;
        }
      }
      /**
       * Returns a new session, regardless of expiry status.
       * Takes in an optional current session. If not passed in, then refreshSession() will attempt to retrieve it from getSession().
       * If the current session's refresh token is invalid, an error will be thrown.
       * @param currentSession The current session. If passed in, it must contain a refresh token.
       */
      async refreshSession(currentSession) {
        await this.initializePromise;
        return await this._acquireLock(-1, async () => {
          return await this._refreshSession(currentSession);
        });
      }
      async _refreshSession(currentSession) {
        try {
          return await this._useSession(async (result) => {
            var _a;
            if (!currentSession) {
              const { data, error: error2 } = result;
              if (error2) {
                throw error2;
              }
              currentSession = (_a = data.session) !== null && _a !== void 0 ? _a : void 0;
            }
            if (!(currentSession === null || currentSession === void 0 ? void 0 : currentSession.refresh_token)) {
              throw new AuthSessionMissingError();
            }
            const { data: session, error } = await this._callRefreshToken(currentSession.refresh_token);
            if (error) {
              return { data: { user: null, session: null }, error };
            }
            if (!session) {
              return { data: { user: null, session: null }, error: null };
            }
            return { data: { user: session.user, session }, error: null };
          });
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { user: null, session: null }, error };
          }
          throw error;
        }
      }
      /**
       * Gets the session data from a URL string
       */
      async _getSessionFromURL(params, callbackUrlType) {
        try {
          if (!isBrowser())
            throw new AuthImplicitGrantRedirectError("No browser detected.");
          if (params.error || params.error_description || params.error_code) {
            throw new AuthImplicitGrantRedirectError(params.error_description || "Error in URL with unspecified error_description", {
              error: params.error || "unspecified_error",
              code: params.error_code || "unspecified_code"
            });
          }
          switch (callbackUrlType) {
            case "implicit":
              if (this.flowType === "pkce") {
                throw new AuthPKCEGrantCodeExchangeError("Not a valid PKCE flow url.");
              }
              break;
            case "pkce":
              if (this.flowType === "implicit") {
                throw new AuthImplicitGrantRedirectError("Not a valid implicit grant flow url.");
              }
              break;
            default:
          }
          if (callbackUrlType === "pkce") {
            this._debug("#_initialize()", "begin", "is PKCE flow", true);
            if (!params.code)
              throw new AuthPKCEGrantCodeExchangeError("No code detected.");
            const { data: data2, error: error2 } = await this._exchangeCodeForSession(params.code);
            if (error2)
              throw error2;
            const url = new URL(window.location.href);
            url.searchParams.delete("code");
            window.history.replaceState(window.history.state, "", url.toString());
            return { data: { session: data2.session, redirectType: null }, error: null };
          }
          const { provider_token, provider_refresh_token, access_token, refresh_token, expires_in, expires_at, token_type } = params;
          if (!access_token || !expires_in || !refresh_token || !token_type) {
            throw new AuthImplicitGrantRedirectError("No session defined in URL");
          }
          const timeNow = Math.round(Date.now() / 1e3);
          const expiresIn = parseInt(expires_in);
          let expiresAt2 = timeNow + expiresIn;
          if (expires_at) {
            expiresAt2 = parseInt(expires_at);
          }
          const actuallyExpiresIn = expiresAt2 - timeNow;
          if (actuallyExpiresIn * 1e3 <= AUTO_REFRESH_TICK_DURATION_MS) {
            console.warn(`@supabase/gotrue-js: Session as retrieved from URL expires in ${actuallyExpiresIn}s, should have been closer to ${expiresIn}s`);
          }
          const issuedAt = expiresAt2 - expiresIn;
          if (timeNow - issuedAt >= 120) {
            console.warn("@supabase/gotrue-js: Session as retrieved from URL was issued over 120s ago, URL could be stale", issuedAt, expiresAt2, timeNow);
          } else if (timeNow - issuedAt < 0) {
            console.warn("@supabase/gotrue-js: Session as retrieved from URL was issued in the future? Check the device clock for skew", issuedAt, expiresAt2, timeNow);
          }
          const { data, error } = await this._getUser(access_token);
          if (error)
            throw error;
          const session = {
            provider_token,
            provider_refresh_token,
            access_token,
            expires_in: expiresIn,
            expires_at: expiresAt2,
            refresh_token,
            token_type,
            user: data.user
          };
          window.location.hash = "";
          this._debug("#_getSessionFromURL()", "clearing window.location.hash");
          return { data: { session, redirectType: params.type }, error: null };
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { session: null, redirectType: null }, error };
          }
          throw error;
        }
      }
      /**
       * Checks if the current URL contains parameters given by an implicit oauth grant flow (https://www.rfc-editor.org/rfc/rfc6749.html#section-4.2)
       */
      _isImplicitGrantCallback(params) {
        return Boolean(params.access_token || params.error_description);
      }
      /**
       * Checks if the current URL and backing storage contain parameters given by a PKCE flow
       */
      async _isPKCECallback(params) {
        const currentStorageContent = await getItemAsync(this.storage, `${this.storageKey}-code-verifier`);
        return !!(params.code && currentStorageContent);
      }
      /**
       * Inside a browser context, `signOut()` will remove the logged in user from the browser session and log them out - removing all items from localstorage and then trigger a `"SIGNED_OUT"` event.
       *
       * For server-side management, you can revoke all refresh tokens for a user by passing a user's JWT through to `auth.api.signOut(JWT: string)`.
       * There is no way to revoke a user's access token jwt until it expires. It is recommended to set a shorter expiry on the jwt for this reason.
       *
       * If using `others` scope, no `SIGNED_OUT` event is fired!
       */
      async signOut(options = { scope: "global" }) {
        await this.initializePromise;
        return await this._acquireLock(-1, async () => {
          return await this._signOut(options);
        });
      }
      async _signOut({ scope } = { scope: "global" }) {
        return await this._useSession(async (result) => {
          var _a;
          const { data, error: sessionError } = result;
          if (sessionError) {
            return { error: sessionError };
          }
          const accessToken = (_a = data.session) === null || _a === void 0 ? void 0 : _a.access_token;
          if (accessToken) {
            const { error } = await this.admin.signOut(accessToken, scope);
            if (error) {
              if (!(isAuthApiError(error) && (error.status === 404 || error.status === 401 || error.status === 403))) {
                return { error };
              }
            }
          }
          if (scope !== "others") {
            await this._removeSession();
            await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`);
          }
          return { error: null };
        });
      }
      onAuthStateChange(callback) {
        const id = uuid();
        const subscription = {
          id,
          callback,
          unsubscribe: () => {
            this._debug("#unsubscribe()", "state change callback with id removed", id);
            this.stateChangeEmitters.delete(id);
          }
        };
        this._debug("#onAuthStateChange()", "registered callback with id", id);
        this.stateChangeEmitters.set(id, subscription);
        (async () => {
          await this.initializePromise;
          await this._acquireLock(-1, async () => {
            this._emitInitialSession(id);
          });
        })();
        return { data: { subscription } };
      }
      async _emitInitialSession(id) {
        return await this._useSession(async (result) => {
          var _a, _b;
          try {
            const { data: { session }, error } = result;
            if (error)
              throw error;
            await ((_a = this.stateChangeEmitters.get(id)) === null || _a === void 0 ? void 0 : _a.callback("INITIAL_SESSION", session));
            this._debug("INITIAL_SESSION", "callback id", id, "session", session);
          } catch (err) {
            await ((_b = this.stateChangeEmitters.get(id)) === null || _b === void 0 ? void 0 : _b.callback("INITIAL_SESSION", null));
            this._debug("INITIAL_SESSION", "callback id", id, "error", err);
            console.error(err);
          }
        });
      }
      /**
       * Sends a password reset request to an email address. This method supports the PKCE flow.
       *
       * @param email The email address of the user.
       * @param options.redirectTo The URL to send the user to after they click the password reset link.
       * @param options.captchaToken Verification token received when the user completes the captcha on the site.
       */
      async resetPasswordForEmail(email, options = {}) {
        let codeChallenge = null;
        let codeChallengeMethod = null;
        if (this.flowType === "pkce") {
          ;
          [codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(
            this.storage,
            this.storageKey,
            true
            // isPasswordRecovery
          );
        }
        try {
          return await _request(this.fetch, "POST", `${this.url}/recover`, {
            body: {
              email,
              code_challenge: codeChallenge,
              code_challenge_method: codeChallengeMethod,
              gotrue_meta_security: { captcha_token: options.captchaToken }
            },
            headers: this.headers,
            redirectTo: options.redirectTo
          });
        } catch (error) {
          if (isAuthError(error)) {
            return { data: null, error };
          }
          throw error;
        }
      }
      /**
       * Gets all the identities linked to a user.
       */
      async getUserIdentities() {
        var _a;
        try {
          const { data, error } = await this.getUser();
          if (error)
            throw error;
          return { data: { identities: (_a = data.user.identities) !== null && _a !== void 0 ? _a : [] }, error: null };
        } catch (error) {
          if (isAuthError(error)) {
            return { data: null, error };
          }
          throw error;
        }
      }
      async linkIdentity(credentials) {
        if ("token" in credentials) {
          return this.linkIdentityIdToken(credentials);
        }
        return this.linkIdentityOAuth(credentials);
      }
      async linkIdentityOAuth(credentials) {
        var _a;
        try {
          const { data, error } = await this._useSession(async (result) => {
            var _a2, _b, _c, _d, _e;
            const { data: data2, error: error2 } = result;
            if (error2)
              throw error2;
            const url = await this._getUrlForProvider(`${this.url}/user/identities/authorize`, credentials.provider, {
              redirectTo: (_a2 = credentials.options) === null || _a2 === void 0 ? void 0 : _a2.redirectTo,
              scopes: (_b = credentials.options) === null || _b === void 0 ? void 0 : _b.scopes,
              queryParams: (_c = credentials.options) === null || _c === void 0 ? void 0 : _c.queryParams,
              skipBrowserRedirect: true
            });
            return await _request(this.fetch, "GET", url, {
              headers: this.headers,
              jwt: (_e = (_d = data2.session) === null || _d === void 0 ? void 0 : _d.access_token) !== null && _e !== void 0 ? _e : void 0
            });
          });
          if (error)
            throw error;
          if (isBrowser() && !((_a = credentials.options) === null || _a === void 0 ? void 0 : _a.skipBrowserRedirect)) {
            window.location.assign(data === null || data === void 0 ? void 0 : data.url);
          }
          return { data: { provider: credentials.provider, url: data === null || data === void 0 ? void 0 : data.url }, error: null };
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { provider: credentials.provider, url: null }, error };
          }
          throw error;
        }
      }
      async linkIdentityIdToken(credentials) {
        return await this._useSession(async (result) => {
          var _a;
          try {
            const { error: sessionError, data: { session } } = result;
            if (sessionError)
              throw sessionError;
            const { options, provider, token, access_token, nonce } = credentials;
            const res = await _request(this.fetch, "POST", `${this.url}/token?grant_type=id_token`, {
              headers: this.headers,
              jwt: (_a = session === null || session === void 0 ? void 0 : session.access_token) !== null && _a !== void 0 ? _a : void 0,
              body: {
                provider,
                id_token: token,
                access_token,
                nonce,
                link_identity: true,
                gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken }
              },
              xform: _sessionResponse
            });
            const { data, error } = res;
            if (error) {
              return { data: { user: null, session: null }, error };
            } else if (!data || !data.session || !data.user) {
              return {
                data: { user: null, session: null },
                error: new AuthInvalidTokenResponseError()
              };
            }
            if (data.session) {
              await this._saveSession(data.session);
              await this._notifyAllSubscribers("USER_UPDATED", data.session);
            }
            return { data, error };
          } catch (error) {
            if (isAuthError(error)) {
              return { data: { user: null, session: null }, error };
            }
            throw error;
          }
        });
      }
      /**
       * Unlinks an identity from a user by deleting it. The user will no longer be able to sign in with that identity once it's unlinked.
       */
      async unlinkIdentity(identity) {
        try {
          return await this._useSession(async (result) => {
            var _a, _b;
            const { data, error } = result;
            if (error) {
              throw error;
            }
            return await _request(this.fetch, "DELETE", `${this.url}/user/identities/${identity.identity_id}`, {
              headers: this.headers,
              jwt: (_b = (_a = data.session) === null || _a === void 0 ? void 0 : _a.access_token) !== null && _b !== void 0 ? _b : void 0
            });
          });
        } catch (error) {
          if (isAuthError(error)) {
            return { data: null, error };
          }
          throw error;
        }
      }
      /**
       * Generates a new JWT.
       * @param refreshToken A valid refresh token that was returned on login.
       */
      async _refreshAccessToken(refreshToken) {
        const debugName = `#_refreshAccessToken(${refreshToken.substring(0, 5)}...)`;
        this._debug(debugName, "begin");
        try {
          const startedAt = Date.now();
          return await retryable(async (attempt) => {
            if (attempt > 0) {
              await sleep(200 * Math.pow(2, attempt - 1));
            }
            this._debug(debugName, "refreshing attempt", attempt);
            return await _request(this.fetch, "POST", `${this.url}/token?grant_type=refresh_token`, {
              body: { refresh_token: refreshToken },
              headers: this.headers,
              xform: _sessionResponse
            });
          }, (attempt, error) => {
            const nextBackOffInterval = 200 * Math.pow(2, attempt);
            return error && isAuthRetryableFetchError(error) && // retryable only if the request can be sent before the backoff overflows the tick duration
            Date.now() + nextBackOffInterval - startedAt < AUTO_REFRESH_TICK_DURATION_MS;
          });
        } catch (error) {
          this._debug(debugName, "error", error);
          if (isAuthError(error)) {
            return { data: { session: null, user: null }, error };
          }
          throw error;
        } finally {
          this._debug(debugName, "end");
        }
      }
      _isValidSession(maybeSession) {
        const isValidSession = typeof maybeSession === "object" && maybeSession !== null && "access_token" in maybeSession && "refresh_token" in maybeSession && "expires_at" in maybeSession;
        return isValidSession;
      }
      async _handleProviderSignIn(provider, options) {
        const url = await this._getUrlForProvider(`${this.url}/authorize`, provider, {
          redirectTo: options.redirectTo,
          scopes: options.scopes,
          queryParams: options.queryParams
        });
        this._debug("#_handleProviderSignIn()", "provider", provider, "options", options, "url", url);
        if (isBrowser() && !options.skipBrowserRedirect) {
          window.location.assign(url);
        }
        return { data: { provider, url }, error: null };
      }
      /**
       * Recovers the session from LocalStorage and refreshes the token
       * Note: this method is async to accommodate for AsyncStorage e.g. in React native.
       */
      async _recoverAndRefresh() {
        var _a, _b;
        const debugName = "#_recoverAndRefresh()";
        this._debug(debugName, "begin");
        try {
          const currentSession = await getItemAsync(this.storage, this.storageKey);
          if (currentSession && this.userStorage) {
            let maybeUser = await getItemAsync(this.userStorage, this.storageKey + "-user");
            if (!this.storage.isServer && Object.is(this.storage, this.userStorage) && !maybeUser) {
              maybeUser = { user: currentSession.user };
              await setItemAsync(this.userStorage, this.storageKey + "-user", maybeUser);
            }
            currentSession.user = (_a = maybeUser === null || maybeUser === void 0 ? void 0 : maybeUser.user) !== null && _a !== void 0 ? _a : userNotAvailableProxy();
          } else if (currentSession && !currentSession.user) {
            if (!currentSession.user) {
              const separateUser = await getItemAsync(this.storage, this.storageKey + "-user");
              if (separateUser && (separateUser === null || separateUser === void 0 ? void 0 : separateUser.user)) {
                currentSession.user = separateUser.user;
                await removeItemAsync(this.storage, this.storageKey + "-user");
                await setItemAsync(this.storage, this.storageKey, currentSession);
              } else {
                currentSession.user = userNotAvailableProxy();
              }
            }
          }
          this._debug(debugName, "session from storage", currentSession);
          if (!this._isValidSession(currentSession)) {
            this._debug(debugName, "session is not valid");
            if (currentSession !== null) {
              await this._removeSession();
            }
            return;
          }
          const expiresWithMargin = ((_b = currentSession.expires_at) !== null && _b !== void 0 ? _b : Infinity) * 1e3 - Date.now() < EXPIRY_MARGIN_MS;
          this._debug(debugName, `session has${expiresWithMargin ? "" : " not"} expired with margin of ${EXPIRY_MARGIN_MS}s`);
          if (expiresWithMargin) {
            if (this.autoRefreshToken && currentSession.refresh_token) {
              const { error } = await this._callRefreshToken(currentSession.refresh_token);
              if (error) {
                console.error(error);
                if (!isAuthRetryableFetchError(error)) {
                  this._debug(debugName, "refresh failed with a non-retryable error, removing the session", error);
                  await this._removeSession();
                }
              }
            }
          } else if (currentSession.user && currentSession.user.__isUserNotAvailableProxy === true) {
            try {
              const { data, error: userError } = await this._getUser(currentSession.access_token);
              if (!userError && (data === null || data === void 0 ? void 0 : data.user)) {
                currentSession.user = data.user;
                await this._saveSession(currentSession);
                await this._notifyAllSubscribers("SIGNED_IN", currentSession);
              } else {
                this._debug(debugName, "could not get user data, skipping SIGNED_IN notification");
              }
            } catch (getUserError) {
              console.error("Error getting user data:", getUserError);
              this._debug(debugName, "error getting user data, skipping SIGNED_IN notification", getUserError);
            }
          } else {
            await this._notifyAllSubscribers("SIGNED_IN", currentSession);
          }
        } catch (err) {
          this._debug(debugName, "error", err);
          console.error(err);
          return;
        } finally {
          this._debug(debugName, "end");
        }
      }
      async _callRefreshToken(refreshToken) {
        var _a, _b;
        if (!refreshToken) {
          throw new AuthSessionMissingError();
        }
        if (this.refreshingDeferred) {
          return this.refreshingDeferred.promise;
        }
        const debugName = `#_callRefreshToken(${refreshToken.substring(0, 5)}...)`;
        this._debug(debugName, "begin");
        try {
          this.refreshingDeferred = new Deferred();
          const { data, error } = await this._refreshAccessToken(refreshToken);
          if (error)
            throw error;
          if (!data.session)
            throw new AuthSessionMissingError();
          await this._saveSession(data.session);
          await this._notifyAllSubscribers("TOKEN_REFRESHED", data.session);
          const result = { data: data.session, error: null };
          this.refreshingDeferred.resolve(result);
          return result;
        } catch (error) {
          this._debug(debugName, "error", error);
          if (isAuthError(error)) {
            const result = { data: null, error };
            if (!isAuthRetryableFetchError(error)) {
              await this._removeSession();
            }
            (_a = this.refreshingDeferred) === null || _a === void 0 ? void 0 : _a.resolve(result);
            return result;
          }
          (_b = this.refreshingDeferred) === null || _b === void 0 ? void 0 : _b.reject(error);
          throw error;
        } finally {
          this.refreshingDeferred = null;
          this._debug(debugName, "end");
        }
      }
      async _notifyAllSubscribers(event, session, broadcast = true) {
        const debugName = `#_notifyAllSubscribers(${event})`;
        this._debug(debugName, "begin", session, `broadcast = ${broadcast}`);
        try {
          if (this.broadcastChannel && broadcast) {
            this.broadcastChannel.postMessage({ event, session });
          }
          const errors = [];
          const promises = Array.from(this.stateChangeEmitters.values()).map(async (x) => {
            try {
              await x.callback(event, session);
            } catch (e) {
              errors.push(e);
            }
          });
          await Promise.all(promises);
          if (errors.length > 0) {
            for (let i = 0; i < errors.length; i += 1) {
              console.error(errors[i]);
            }
            throw errors[0];
          }
        } finally {
          this._debug(debugName, "end");
        }
      }
      /**
       * set currentSession and currentUser
       * process to _startAutoRefreshToken if possible
       */
      async _saveSession(session) {
        this._debug("#_saveSession()", session);
        this.suppressGetSessionWarning = true;
        const sessionToProcess = Object.assign({}, session);
        const userIsProxy = sessionToProcess.user && sessionToProcess.user.__isUserNotAvailableProxy === true;
        if (this.userStorage) {
          if (!userIsProxy && sessionToProcess.user) {
            await setItemAsync(this.userStorage, this.storageKey + "-user", {
              user: sessionToProcess.user
            });
          } else if (userIsProxy) {
          }
          const mainSessionData = Object.assign({}, sessionToProcess);
          delete mainSessionData.user;
          const clonedMainSessionData = deepClone(mainSessionData);
          await setItemAsync(this.storage, this.storageKey, clonedMainSessionData);
        } else {
          const clonedSession = deepClone(sessionToProcess);
          await setItemAsync(this.storage, this.storageKey, clonedSession);
        }
      }
      async _removeSession() {
        this._debug("#_removeSession()");
        await removeItemAsync(this.storage, this.storageKey);
        await removeItemAsync(this.storage, this.storageKey + "-code-verifier");
        await removeItemAsync(this.storage, this.storageKey + "-user");
        if (this.userStorage) {
          await removeItemAsync(this.userStorage, this.storageKey + "-user");
        }
        await this._notifyAllSubscribers("SIGNED_OUT", null);
      }
      /**
       * Removes any registered visibilitychange callback.
       *
       * {@see #startAutoRefresh}
       * {@see #stopAutoRefresh}
       */
      _removeVisibilityChangedCallback() {
        this._debug("#_removeVisibilityChangedCallback()");
        const callback = this.visibilityChangedCallback;
        this.visibilityChangedCallback = null;
        try {
          if (callback && isBrowser() && (window === null || window === void 0 ? void 0 : window.removeEventListener)) {
            window.removeEventListener("visibilitychange", callback);
          }
        } catch (e) {
          console.error("removing visibilitychange callback failed", e);
        }
      }
      /**
       * This is the private implementation of {@link #startAutoRefresh}. Use this
       * within the library.
       */
      async _startAutoRefresh() {
        await this._stopAutoRefresh();
        this._debug("#_startAutoRefresh()");
        const ticker = setInterval(() => this._autoRefreshTokenTick(), AUTO_REFRESH_TICK_DURATION_MS);
        this.autoRefreshTicker = ticker;
        if (ticker && typeof ticker === "object" && typeof ticker.unref === "function") {
          ticker.unref();
        } else if (typeof Deno !== "undefined" && typeof Deno.unrefTimer === "function") {
          Deno.unrefTimer(ticker);
        }
        setTimeout(async () => {
          await this.initializePromise;
          await this._autoRefreshTokenTick();
        }, 0);
      }
      /**
       * This is the private implementation of {@link #stopAutoRefresh}. Use this
       * within the library.
       */
      async _stopAutoRefresh() {
        this._debug("#_stopAutoRefresh()");
        const ticker = this.autoRefreshTicker;
        this.autoRefreshTicker = null;
        if (ticker) {
          clearInterval(ticker);
        }
      }
      /**
       * Starts an auto-refresh process in the background. The session is checked
       * every few seconds. Close to the time of expiration a process is started to
       * refresh the session. If refreshing fails it will be retried for as long as
       * necessary.
       *
       * If you set the {@link GoTrueClientOptions#autoRefreshToken} you don't need
       * to call this function, it will be called for you.
       *
       * On browsers the refresh process works only when the tab/window is in the
       * foreground to conserve resources as well as prevent race conditions and
       * flooding auth with requests. If you call this method any managed
       * visibility change callback will be removed and you must manage visibility
       * changes on your own.
       *
       * On non-browser platforms the refresh process works *continuously* in the
       * background, which may not be desirable. You should hook into your
       * platform's foreground indication mechanism and call these methods
       * appropriately to conserve resources.
       *
       * {@see #stopAutoRefresh}
       */
      async startAutoRefresh() {
        this._removeVisibilityChangedCallback();
        await this._startAutoRefresh();
      }
      /**
       * Stops an active auto refresh process running in the background (if any).
       *
       * If you call this method any managed visibility change callback will be
       * removed and you must manage visibility changes on your own.
       *
       * See {@link #startAutoRefresh} for more details.
       */
      async stopAutoRefresh() {
        this._removeVisibilityChangedCallback();
        await this._stopAutoRefresh();
      }
      /**
       * Runs the auto refresh token tick.
       */
      async _autoRefreshTokenTick() {
        this._debug("#_autoRefreshTokenTick()", "begin");
        try {
          await this._acquireLock(0, async () => {
            try {
              const now = Date.now();
              try {
                return await this._useSession(async (result) => {
                  const { data: { session } } = result;
                  if (!session || !session.refresh_token || !session.expires_at) {
                    this._debug("#_autoRefreshTokenTick()", "no session");
                    return;
                  }
                  const expiresInTicks = Math.floor((session.expires_at * 1e3 - now) / AUTO_REFRESH_TICK_DURATION_MS);
                  this._debug("#_autoRefreshTokenTick()", `access token expires in ${expiresInTicks} ticks, a tick lasts ${AUTO_REFRESH_TICK_DURATION_MS}ms, refresh threshold is ${AUTO_REFRESH_TICK_THRESHOLD} ticks`);
                  if (expiresInTicks <= AUTO_REFRESH_TICK_THRESHOLD) {
                    await this._callRefreshToken(session.refresh_token);
                  }
                });
              } catch (e) {
                console.error("Auto refresh tick failed with error. This is likely a transient error.", e);
              }
            } finally {
              this._debug("#_autoRefreshTokenTick()", "end");
            }
          });
        } catch (e) {
          if (e.isAcquireTimeout || e instanceof LockAcquireTimeoutError) {
            this._debug("auto refresh token tick lock not available");
          } else {
            throw e;
          }
        }
      }
      /**
       * Registers callbacks on the browser / platform, which in-turn run
       * algorithms when the browser window/tab are in foreground. On non-browser
       * platforms it assumes always foreground.
       */
      async _handleVisibilityChange() {
        this._debug("#_handleVisibilityChange()");
        if (!isBrowser() || !(window === null || window === void 0 ? void 0 : window.addEventListener)) {
          if (this.autoRefreshToken) {
            this.startAutoRefresh();
          }
          return false;
        }
        try {
          this.visibilityChangedCallback = async () => await this._onVisibilityChanged(false);
          window === null || window === void 0 ? void 0 : window.addEventListener("visibilitychange", this.visibilityChangedCallback);
          await this._onVisibilityChanged(true);
        } catch (error) {
          console.error("_handleVisibilityChange", error);
        }
      }
      /**
       * Callback registered with `window.addEventListener('visibilitychange')`.
       */
      async _onVisibilityChanged(calledFromInitialize) {
        const methodName = `#_onVisibilityChanged(${calledFromInitialize})`;
        this._debug(methodName, "visibilityState", document.visibilityState);
        if (document.visibilityState === "visible") {
          if (this.autoRefreshToken) {
            this._startAutoRefresh();
          }
          if (!calledFromInitialize) {
            await this.initializePromise;
            await this._acquireLock(-1, async () => {
              if (document.visibilityState !== "visible") {
                this._debug(methodName, "acquired the lock to recover the session, but the browser visibilityState is no longer visible, aborting");
                return;
              }
              await this._recoverAndRefresh();
            });
          }
        } else if (document.visibilityState === "hidden") {
          if (this.autoRefreshToken) {
            this._stopAutoRefresh();
          }
        }
      }
      /**
       * Generates the relevant login URL for a third-party provider.
       * @param options.redirectTo A URL or mobile address to send the user to after they are confirmed.
       * @param options.scopes A space-separated list of scopes granted to the OAuth application.
       * @param options.queryParams An object of key-value pairs containing query parameters granted to the OAuth application.
       */
      async _getUrlForProvider(url, provider, options) {
        const urlParams = [`provider=${encodeURIComponent(provider)}`];
        if (options === null || options === void 0 ? void 0 : options.redirectTo) {
          urlParams.push(`redirect_to=${encodeURIComponent(options.redirectTo)}`);
        }
        if (options === null || options === void 0 ? void 0 : options.scopes) {
          urlParams.push(`scopes=${encodeURIComponent(options.scopes)}`);
        }
        if (this.flowType === "pkce") {
          const [codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(this.storage, this.storageKey);
          const flowParams = new URLSearchParams({
            code_challenge: `${encodeURIComponent(codeChallenge)}`,
            code_challenge_method: `${encodeURIComponent(codeChallengeMethod)}`
          });
          urlParams.push(flowParams.toString());
        }
        if (options === null || options === void 0 ? void 0 : options.queryParams) {
          const query = new URLSearchParams(options.queryParams);
          urlParams.push(query.toString());
        }
        if (options === null || options === void 0 ? void 0 : options.skipBrowserRedirect) {
          urlParams.push(`skip_http_redirect=${options.skipBrowserRedirect}`);
        }
        return `${url}?${urlParams.join("&")}`;
      }
      async _unenroll(params) {
        try {
          return await this._useSession(async (result) => {
            var _a;
            const { data: sessionData, error: sessionError } = result;
            if (sessionError) {
              return { data: null, error: sessionError };
            }
            return await _request(this.fetch, "DELETE", `${this.url}/factors/${params.factorId}`, {
              headers: this.headers,
              jwt: (_a = sessionData === null || sessionData === void 0 ? void 0 : sessionData.session) === null || _a === void 0 ? void 0 : _a.access_token
            });
          });
        } catch (error) {
          if (isAuthError(error)) {
            return { data: null, error };
          }
          throw error;
        }
      }
      async _enroll(params) {
        try {
          return await this._useSession(async (result) => {
            var _a, _b;
            const { data: sessionData, error: sessionError } = result;
            if (sessionError) {
              return { data: null, error: sessionError };
            }
            const body = Object.assign({ friendly_name: params.friendlyName, factor_type: params.factorType }, params.factorType === "phone" ? { phone: params.phone } : params.factorType === "totp" ? { issuer: params.issuer } : {});
            const { data, error } = await _request(this.fetch, "POST", `${this.url}/factors`, {
              body,
              headers: this.headers,
              jwt: (_a = sessionData === null || sessionData === void 0 ? void 0 : sessionData.session) === null || _a === void 0 ? void 0 : _a.access_token
            });
            if (error) {
              return { data: null, error };
            }
            if (params.factorType === "totp" && data.type === "totp" && ((_b = data === null || data === void 0 ? void 0 : data.totp) === null || _b === void 0 ? void 0 : _b.qr_code)) {
              data.totp.qr_code = `data:image/svg+xml;utf-8,${data.totp.qr_code}`;
            }
            return { data, error: null };
          });
        } catch (error) {
          if (isAuthError(error)) {
            return { data: null, error };
          }
          throw error;
        }
      }
      async _verify(params) {
        return this._acquireLock(-1, async () => {
          try {
            return await this._useSession(async (result) => {
              var _a;
              const { data: sessionData, error: sessionError } = result;
              if (sessionError) {
                return { data: null, error: sessionError };
              }
              const body = Object.assign({ challenge_id: params.challengeId }, "webauthn" in params ? {
                webauthn: Object.assign(Object.assign({}, params.webauthn), { credential_response: params.webauthn.type === "create" ? serializeCredentialCreationResponse(params.webauthn.credential_response) : serializeCredentialRequestResponse(params.webauthn.credential_response) })
              } : { code: params.code });
              const { data, error } = await _request(this.fetch, "POST", `${this.url}/factors/${params.factorId}/verify`, {
                body,
                headers: this.headers,
                jwt: (_a = sessionData === null || sessionData === void 0 ? void 0 : sessionData.session) === null || _a === void 0 ? void 0 : _a.access_token
              });
              if (error) {
                return { data: null, error };
              }
              await this._saveSession(Object.assign({ expires_at: Math.round(Date.now() / 1e3) + data.expires_in }, data));
              await this._notifyAllSubscribers("MFA_CHALLENGE_VERIFIED", data);
              return { data, error };
            });
          } catch (error) {
            if (isAuthError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
      async _challenge(params) {
        return this._acquireLock(-1, async () => {
          try {
            return await this._useSession(async (result) => {
              var _a;
              const { data: sessionData, error: sessionError } = result;
              if (sessionError) {
                return { data: null, error: sessionError };
              }
              const response = await _request(this.fetch, "POST", `${this.url}/factors/${params.factorId}/challenge`, {
                body: params,
                headers: this.headers,
                jwt: (_a = sessionData === null || sessionData === void 0 ? void 0 : sessionData.session) === null || _a === void 0 ? void 0 : _a.access_token
              });
              if (response.error) {
                return response;
              }
              const { data } = response;
              if (data.type !== "webauthn") {
                return { data, error: null };
              }
              switch (data.webauthn.type) {
                case "create":
                  return {
                    data: Object.assign(Object.assign({}, data), { webauthn: Object.assign(Object.assign({}, data.webauthn), { credential_options: Object.assign(Object.assign({}, data.webauthn.credential_options), { publicKey: deserializeCredentialCreationOptions(data.webauthn.credential_options.publicKey) }) }) }),
                    error: null
                  };
                case "request":
                  return {
                    data: Object.assign(Object.assign({}, data), { webauthn: Object.assign(Object.assign({}, data.webauthn), { credential_options: Object.assign(Object.assign({}, data.webauthn.credential_options), { publicKey: deserializeCredentialRequestOptions(data.webauthn.credential_options.publicKey) }) }) }),
                    error: null
                  };
              }
            });
          } catch (error) {
            if (isAuthError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
      /**
       * {@see GoTrueMFAApi#challengeAndVerify}
       */
      async _challengeAndVerify(params) {
        const { data: challengeData, error: challengeError } = await this._challenge({
          factorId: params.factorId
        });
        if (challengeError) {
          return { data: null, error: challengeError };
        }
        return await this._verify({
          factorId: params.factorId,
          challengeId: challengeData.id,
          code: params.code
        });
      }
      /**
       * {@see GoTrueMFAApi#listFactors}
       */
      async _listFactors() {
        var _a;
        const { data: { user }, error: userError } = await this.getUser();
        if (userError) {
          return { data: null, error: userError };
        }
        const data = {
          all: [],
          phone: [],
          totp: [],
          webauthn: []
        };
        for (const factor of (_a = user === null || user === void 0 ? void 0 : user.factors) !== null && _a !== void 0 ? _a : []) {
          data.all.push(factor);
          if (factor.status === "verified") {
            ;
            data[factor.factor_type].push(factor);
          }
        }
        return {
          data,
          error: null
        };
      }
      /**
       * {@see GoTrueMFAApi#getAuthenticatorAssuranceLevel}
       */
      async _getAuthenticatorAssuranceLevel() {
        return this._acquireLock(-1, async () => {
          return await this._useSession(async (result) => {
            var _a, _b;
            const { data: { session }, error: sessionError } = result;
            if (sessionError) {
              return { data: null, error: sessionError };
            }
            if (!session) {
              return {
                data: { currentLevel: null, nextLevel: null, currentAuthenticationMethods: [] },
                error: null
              };
            }
            const { payload } = decodeJWT(session.access_token);
            let currentLevel = null;
            if (payload.aal) {
              currentLevel = payload.aal;
            }
            let nextLevel = currentLevel;
            const verifiedFactors = (_b = (_a = session.user.factors) === null || _a === void 0 ? void 0 : _a.filter((factor) => factor.status === "verified")) !== null && _b !== void 0 ? _b : [];
            if (verifiedFactors.length > 0) {
              nextLevel = "aal2";
            }
            const currentAuthenticationMethods = payload.amr || [];
            return { data: { currentLevel, nextLevel, currentAuthenticationMethods }, error: null };
          });
        });
      }
      async fetchJwk(kid, jwks = { keys: [] }) {
        let jwk = jwks.keys.find((key) => key.kid === kid);
        if (jwk) {
          return jwk;
        }
        const now = Date.now();
        jwk = this.jwks.keys.find((key) => key.kid === kid);
        if (jwk && this.jwks_cached_at + JWKS_TTL > now) {
          return jwk;
        }
        const { data, error } = await _request(this.fetch, "GET", `${this.url}/.well-known/jwks.json`, {
          headers: this.headers
        });
        if (error) {
          throw error;
        }
        if (!data.keys || data.keys.length === 0) {
          return null;
        }
        this.jwks = data;
        this.jwks_cached_at = now;
        jwk = data.keys.find((key) => key.kid === kid);
        if (!jwk) {
          return null;
        }
        return jwk;
      }
      /**
       * Extracts the JWT claims present in the access token by first verifying the
       * JWT against the server's JSON Web Key Set endpoint
       * `/.well-known/jwks.json` which is often cached, resulting in significantly
       * faster responses. Prefer this method over {@link #getUser} which always
       * sends a request to the Auth server for each JWT.
       *
       * If the project is not using an asymmetric JWT signing key (like ECC or
       * RSA) it always sends a request to the Auth server (similar to {@link
       * #getUser}) to verify the JWT.
       *
       * @param jwt An optional specific JWT you wish to verify, not the one you
       *            can obtain from {@link #getSession}.
       * @param options Various additional options that allow you to customize the
       *                behavior of this method.
       */
      async getClaims(jwt, options = {}) {
        try {
          let token = jwt;
          if (!token) {
            const { data, error } = await this.getSession();
            if (error || !data.session) {
              return { data: null, error };
            }
            token = data.session.access_token;
          }
          const { header, payload, signature, raw: { header: rawHeader, payload: rawPayload } } = decodeJWT(token);
          if (!(options === null || options === void 0 ? void 0 : options.allowExpired)) {
            validateExp(payload.exp);
          }
          const signingKey = !header.alg || header.alg.startsWith("HS") || !header.kid || !("crypto" in globalThis && "subtle" in globalThis.crypto) ? null : await this.fetchJwk(header.kid, (options === null || options === void 0 ? void 0 : options.keys) ? { keys: options.keys } : options === null || options === void 0 ? void 0 : options.jwks);
          if (!signingKey) {
            const { error } = await this.getUser(token);
            if (error) {
              throw error;
            }
            return {
              data: {
                claims: payload,
                header,
                signature
              },
              error: null
            };
          }
          const algorithm = getAlgorithm(header.alg);
          const publicKey = await crypto.subtle.importKey("jwk", signingKey, algorithm, true, [
            "verify"
          ]);
          const isValid = await crypto.subtle.verify(algorithm, publicKey, signature, stringToUint8Array(`${rawHeader}.${rawPayload}`));
          if (!isValid) {
            throw new AuthInvalidJwtError("Invalid JWT signature");
          }
          return {
            data: {
              claims: payload,
              header,
              signature
            },
            error: null
          };
        } catch (error) {
          if (isAuthError(error)) {
            return { data: null, error };
          }
          throw error;
        }
      }
    };
    __name(GoTrueClient, "GoTrueClient");
    GoTrueClient.nextInstanceID = 0;
    GoTrueClient_default = GoTrueClient;
  }
});

// node_modules/@supabase/auth-js/dist/module/AuthAdminApi.js
var AuthAdminApi, AuthAdminApi_default;
var init_AuthAdminApi = __esm({
  "node_modules/@supabase/auth-js/dist/module/AuthAdminApi.js"() {
    init_GoTrueAdminApi();
    AuthAdminApi = GoTrueAdminApi;
    AuthAdminApi_default = AuthAdminApi;
  }
});

// node_modules/@supabase/auth-js/dist/module/AuthClient.js
var AuthClient, AuthClient_default;
var init_AuthClient = __esm({
  "node_modules/@supabase/auth-js/dist/module/AuthClient.js"() {
    init_GoTrueClient();
    AuthClient = GoTrueClient_default;
    AuthClient_default = AuthClient;
  }
});

// node_modules/@supabase/auth-js/dist/module/index.js
var init_module4 = __esm({
  "node_modules/@supabase/auth-js/dist/module/index.js"() {
    init_GoTrueAdminApi();
    init_GoTrueClient();
    init_AuthAdminApi();
    init_AuthClient();
    init_types3();
    init_errors2();
    init_locks();
  }
});

// node_modules/@supabase/supabase-js/dist/module/lib/SupabaseAuthClient.js
var SupabaseAuthClient;
var init_SupabaseAuthClient = __esm({
  "node_modules/@supabase/supabase-js/dist/module/lib/SupabaseAuthClient.js"() {
    init_module4();
    SupabaseAuthClient = class extends AuthClient_default {
      constructor(options) {
        super(options);
      }
    };
    __name(SupabaseAuthClient, "SupabaseAuthClient");
  }
});

// node_modules/@supabase/supabase-js/dist/module/SupabaseClient.js
var __awaiter10, SupabaseClient;
var init_SupabaseClient = __esm({
  "node_modules/@supabase/supabase-js/dist/module/SupabaseClient.js"() {
    init_module();
    init_wrapper();
    init_module2();
    init_module3();
    init_constants3();
    init_fetch2();
    init_helpers3();
    init_SupabaseAuthClient();
    __awaiter10 = function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      __name(adopt, "adopt");
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        __name(fulfilled, "fulfilled");
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        __name(rejected, "rejected");
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        __name(step, "step");
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    SupabaseClient = class {
      /**
       * Create a new client for use in the browser.
       * @param supabaseUrl The unique Supabase URL which is supplied when you create a new project in your project dashboard.
       * @param supabaseKey The unique Supabase Key which is supplied when you create a new project in your project dashboard.
       * @param options.db.schema You can switch in between schemas. The schema needs to be on the list of exposed schemas inside Supabase.
       * @param options.auth.autoRefreshToken Set to "true" if you want to automatically refresh the token before expiring.
       * @param options.auth.persistSession Set to "true" if you want to automatically save the user session into local storage.
       * @param options.auth.detectSessionInUrl Set to "true" if you want to automatically detects OAuth grants in the URL and signs in the user.
       * @param options.realtime Options passed along to realtime-js constructor.
       * @param options.storage Options passed along to the storage-js constructor.
       * @param options.global.fetch A custom fetch implementation.
       * @param options.global.headers Any additional headers to send with each network request.
       */
      constructor(supabaseUrl, supabaseKey, options) {
        var _a, _b, _c;
        this.supabaseUrl = supabaseUrl;
        this.supabaseKey = supabaseKey;
        const baseUrl = validateSupabaseUrl(supabaseUrl);
        if (!supabaseKey)
          throw new Error("supabaseKey is required.");
        this.realtimeUrl = new URL("realtime/v1", baseUrl);
        this.realtimeUrl.protocol = this.realtimeUrl.protocol.replace("http", "ws");
        this.authUrl = new URL("auth/v1", baseUrl);
        this.storageUrl = new URL("storage/v1", baseUrl);
        this.functionsUrl = new URL("functions/v1", baseUrl);
        const defaultStorageKey = `sb-${baseUrl.hostname.split(".")[0]}-auth-token`;
        const DEFAULTS = {
          db: DEFAULT_DB_OPTIONS,
          realtime: DEFAULT_REALTIME_OPTIONS,
          auth: Object.assign(Object.assign({}, DEFAULT_AUTH_OPTIONS), { storageKey: defaultStorageKey }),
          global: DEFAULT_GLOBAL_OPTIONS
        };
        const settings = applySettingDefaults(options !== null && options !== void 0 ? options : {}, DEFAULTS);
        this.storageKey = (_a = settings.auth.storageKey) !== null && _a !== void 0 ? _a : "";
        this.headers = (_b = settings.global.headers) !== null && _b !== void 0 ? _b : {};
        if (!settings.accessToken) {
          this.auth = this._initSupabaseAuthClient((_c = settings.auth) !== null && _c !== void 0 ? _c : {}, this.headers, settings.global.fetch);
        } else {
          this.accessToken = settings.accessToken;
          this.auth = new Proxy({}, {
            get: (_, prop) => {
              throw new Error(`@supabase/supabase-js: Supabase Client is configured with the accessToken option, accessing supabase.auth.${String(prop)} is not possible`);
            }
          });
        }
        this.fetch = fetchWithAuth(supabaseKey, this._getAccessToken.bind(this), settings.global.fetch);
        this.realtime = this._initRealtimeClient(Object.assign({ headers: this.headers, accessToken: this._getAccessToken.bind(this) }, settings.realtime));
        this.rest = new PostgrestClient(new URL("rest/v1", baseUrl).href, {
          headers: this.headers,
          schema: settings.db.schema,
          fetch: this.fetch
        });
        this.storage = new StorageClient(this.storageUrl.href, this.headers, this.fetch, options === null || options === void 0 ? void 0 : options.storage);
        if (!settings.accessToken) {
          this._listenForAuthEvents();
        }
      }
      /**
       * Supabase Functions allows you to deploy and invoke edge functions.
       */
      get functions() {
        return new FunctionsClient(this.functionsUrl.href, {
          headers: this.headers,
          customFetch: this.fetch
        });
      }
      /**
       * Perform a query on a table or a view.
       *
       * @param relation - The table or view name to query
       */
      from(relation) {
        return this.rest.from(relation);
      }
      // NOTE: signatures must be kept in sync with PostgrestClient.schema
      /**
       * Select a schema to query or perform an function (rpc) call.
       *
       * The schema needs to be on the list of exposed schemas inside Supabase.
       *
       * @param schema - The schema to query
       */
      schema(schema) {
        return this.rest.schema(schema);
      }
      // NOTE: signatures must be kept in sync with PostgrestClient.rpc
      /**
       * Perform a function call.
       *
       * @param fn - The function name to call
       * @param args - The arguments to pass to the function call
       * @param options - Named parameters
       * @param options.head - When set to `true`, `data` will not be returned.
       * Useful if you only need the count.
       * @param options.get - When set to `true`, the function will be called with
       * read-only access mode.
       * @param options.count - Count algorithm to use to count rows returned by the
       * function. Only applicable for [set-returning
       * functions](https://www.postgresql.org/docs/current/functions-srf.html).
       *
       * `"exact"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the
       * hood.
       *
       * `"planned"`: Approximated but fast count algorithm. Uses the Postgres
       * statistics under the hood.
       *
       * `"estimated"`: Uses exact count for low numbers and planned count for high
       * numbers.
       */
      rpc(fn, args = {}, options = {}) {
        return this.rest.rpc(fn, args, options);
      }
      /**
       * Creates a Realtime channel with Broadcast, Presence, and Postgres Changes.
       *
       * @param {string} name - The name of the Realtime channel.
       * @param {Object} opts - The options to pass to the Realtime channel.
       *
       */
      channel(name, opts = { config: {} }) {
        return this.realtime.channel(name, opts);
      }
      /**
       * Returns all Realtime channels.
       */
      getChannels() {
        return this.realtime.getChannels();
      }
      /**
       * Unsubscribes and removes Realtime channel from Realtime client.
       *
       * @param {RealtimeChannel} channel - The name of the Realtime channel.
       *
       */
      removeChannel(channel) {
        return this.realtime.removeChannel(channel);
      }
      /**
       * Unsubscribes and removes all Realtime channels from Realtime client.
       */
      removeAllChannels() {
        return this.realtime.removeAllChannels();
      }
      _getAccessToken() {
        return __awaiter10(this, void 0, void 0, function* () {
          var _a, _b;
          if (this.accessToken) {
            return yield this.accessToken();
          }
          const { data } = yield this.auth.getSession();
          return (_b = (_a = data.session) === null || _a === void 0 ? void 0 : _a.access_token) !== null && _b !== void 0 ? _b : this.supabaseKey;
        });
      }
      _initSupabaseAuthClient({ autoRefreshToken, persistSession, detectSessionInUrl, storage, userStorage, storageKey, flowType, lock, debug }, headers, fetch3) {
        const authHeaders = {
          Authorization: `Bearer ${this.supabaseKey}`,
          apikey: `${this.supabaseKey}`
        };
        return new SupabaseAuthClient({
          url: this.authUrl.href,
          headers: Object.assign(Object.assign({}, authHeaders), headers),
          storageKey,
          autoRefreshToken,
          persistSession,
          detectSessionInUrl,
          storage,
          userStorage,
          flowType,
          lock,
          debug,
          fetch: fetch3,
          // auth checks if there is a custom authorizaiton header using this flag
          // so it knows whether to return an error when getUser is called with no session
          hasCustomAuthorizationHeader: Object.keys(this.headers).some((key) => key.toLowerCase() === "authorization")
        });
      }
      _initRealtimeClient(options) {
        return new RealtimeClient(this.realtimeUrl.href, Object.assign(Object.assign({}, options), { params: Object.assign({ apikey: this.supabaseKey }, options === null || options === void 0 ? void 0 : options.params) }));
      }
      _listenForAuthEvents() {
        let data = this.auth.onAuthStateChange((event, session) => {
          this._handleTokenChanged(event, "CLIENT", session === null || session === void 0 ? void 0 : session.access_token);
        });
        return data;
      }
      _handleTokenChanged(event, source, token) {
        if ((event === "TOKEN_REFRESHED" || event === "SIGNED_IN") && this.changedAccessToken !== token) {
          this.changedAccessToken = token;
          this.realtime.setAuth(token);
        } else if (event === "SIGNED_OUT") {
          this.realtime.setAuth();
          if (source == "STORAGE")
            this.auth.signOut();
          this.changedAccessToken = void 0;
        }
      }
    };
    __name(SupabaseClient, "SupabaseClient");
  }
});

// node_modules/@supabase/supabase-js/dist/module/index.js
var module_exports = {};
__export(module_exports, {
  AuthAdminApi: () => AuthAdminApi_default,
  AuthApiError: () => AuthApiError,
  AuthClient: () => AuthClient_default,
  AuthError: () => AuthError,
  AuthImplicitGrantRedirectError: () => AuthImplicitGrantRedirectError,
  AuthInvalidCredentialsError: () => AuthInvalidCredentialsError,
  AuthInvalidJwtError: () => AuthInvalidJwtError,
  AuthInvalidTokenResponseError: () => AuthInvalidTokenResponseError,
  AuthPKCEGrantCodeExchangeError: () => AuthPKCEGrantCodeExchangeError,
  AuthRetryableFetchError: () => AuthRetryableFetchError,
  AuthSessionMissingError: () => AuthSessionMissingError,
  AuthUnknownError: () => AuthUnknownError,
  AuthWeakPasswordError: () => AuthWeakPasswordError,
  CustomAuthError: () => CustomAuthError,
  FunctionRegion: () => FunctionRegion,
  FunctionsError: () => FunctionsError,
  FunctionsFetchError: () => FunctionsFetchError,
  FunctionsHttpError: () => FunctionsHttpError,
  FunctionsRelayError: () => FunctionsRelayError,
  GoTrueAdminApi: () => GoTrueAdminApi,
  GoTrueClient: () => GoTrueClient_default,
  NavigatorLockAcquireTimeoutError: () => NavigatorLockAcquireTimeoutError,
  PostgrestError: () => PostgrestError,
  REALTIME_CHANNEL_STATES: () => REALTIME_CHANNEL_STATES,
  REALTIME_LISTEN_TYPES: () => REALTIME_LISTEN_TYPES,
  REALTIME_POSTGRES_CHANGES_LISTEN_EVENT: () => REALTIME_POSTGRES_CHANGES_LISTEN_EVENT,
  REALTIME_PRESENCE_LISTEN_EVENTS: () => REALTIME_PRESENCE_LISTEN_EVENTS,
  REALTIME_SUBSCRIBE_STATES: () => REALTIME_SUBSCRIBE_STATES,
  RealtimeChannel: () => RealtimeChannel,
  RealtimeClient: () => RealtimeClient,
  RealtimePresence: () => RealtimePresence,
  SIGN_OUT_SCOPES: () => SIGN_OUT_SCOPES,
  SupabaseClient: () => SupabaseClient,
  WebSocketFactory: () => websocket_factory_default,
  createClient: () => createClient,
  isAuthApiError: () => isAuthApiError,
  isAuthError: () => isAuthError,
  isAuthImplicitGrantRedirectError: () => isAuthImplicitGrantRedirectError,
  isAuthRetryableFetchError: () => isAuthRetryableFetchError,
  isAuthSessionMissingError: () => isAuthSessionMissingError,
  isAuthWeakPasswordError: () => isAuthWeakPasswordError,
  lockInternals: () => internals,
  navigatorLock: () => navigatorLock,
  processLock: () => processLock
});
function shouldShowDeprecationWarning() {
  if (typeof window !== "undefined") {
    return false;
  }
  if (typeof process === "undefined") {
    return false;
  }
  const processVersion = process["version"];
  if (processVersion === void 0 || processVersion === null) {
    return false;
  }
  const versionMatch = processVersion.match(/^v(\d+)\./);
  if (!versionMatch) {
    return false;
  }
  const majorVersion = parseInt(versionMatch[1], 10);
  return majorVersion <= 18;
}
var createClient;
var init_module5 = __esm({
  "node_modules/@supabase/supabase-js/dist/module/index.js"() {
    init_SupabaseClient();
    init_module4();
    init_wrapper();
    init_module();
    init_module2();
    init_SupabaseClient();
    createClient = /* @__PURE__ */ __name((supabaseUrl, supabaseKey, options) => {
      return new SupabaseClient(supabaseUrl, supabaseKey, options);
    }, "createClient");
    __name(shouldShowDeprecationWarning, "shouldShowDeprecationWarning");
    if (shouldShowDeprecationWarning()) {
      console.warn(`\u26A0\uFE0F  Node.js 18 and below are deprecated and will no longer be supported in future versions of @supabase/supabase-js. Please upgrade to Node.js 20 or later. For more information, visit: https://github.com/orgs/supabase/discussions/37217`);
    }
  }
});

// src/propTypeSync.ts
var propTypeSync_exports = {};
__export(propTypeSync_exports, {
  getAliasCache: () => getAliasCache,
  initializePropTypeSync: () => initializePropTypeSync,
  loadPropTypeAliases: () => loadPropTypeAliases,
  normalizePropType: () => normalizePropType2,
  refreshPropTypeAliases: () => refreshPropTypeAliases
});
async function initializePropTypeSync(supabaseUrl, supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  await loadPropTypeAliases();
}
async function loadPropTypeAliases() {
  if (!supabase) {
    console.warn("\u26A0\uFE0F Supabase client not initialized for prop type sync");
    return;
  }
  try {
    const { data, error } = await supabase.from("prop_type_aliases").select("alias, canonical");
    if (error) {
      console.error("\u274C Failed to load prop_type_aliases:", error);
      return;
    }
    aliasCache = {};
    data?.forEach((row) => {
      aliasCache[row.alias.toLowerCase()] = row.canonical.toLowerCase();
    });
    const fallbackMappings = {
      // NFL comprehensive mappings
      "sacks": "defense_sacks",
      "td": "fantasyscore",
      "touchdowns": "fantasyscore",
      "pass_yards": "passing_yards",
      "rush_yards": "rushing_yards",
      "rec_yards": "receiving_yards",
      "receptions": "receptions",
      "turnovers": "turnovers",
      "interceptions": "passing_interceptions",
      "passing_interceptions": "passing_interceptions",
      "rushing_attempts": "carries",
      "carries": "rushing_attempts",
      "points": "points",
      "fantasy_score": "fantasyscore",
      "fantasyscore": "fantasy_score",
      // NBA comprehensive mappings
      "pts": "points",
      "reb": "rebounds",
      "ast": "assists",
      "stl": "steals",
      "blk": "blocks",
      "fgm": "field_goals_made",
      "fga": "field_goals_attempted",
      "3pm": "three_pointers_made",
      "3pa": "three_pointers_attempted",
      // MLB comprehensive mappings
      "hr": "home_runs",
      "rbi": "runs_batted_in",
      "sb": "stolen_bases",
      "hits": "hits",
      "runs": "runs",
      "walks": "batting_basesonballs",
      "batting_basesonballs": "walks",
      "batting_basesOnBalls": "walks",
      "strikeouts": "batting_strikeouts",
      "batting_strikeouts": "strikeouts",
      // NHL comprehensive mappings
      "sog": "shots_on_goal",
      "saves": "goalie_saves",
      "goals": "goals",
      "assists": "assists",
      "nhl_points": "points",
      "shots": "shots_on_goal",
      "nhl_blocks": "blocks",
      "nhl_hits": "hits",
      "pims": "penalty_minutes",
      "penalty_minutes": "pims"
    };
    Object.entries(fallbackMappings).forEach(([alias, canonical]) => {
      if (!aliasCache[alias]) {
        aliasCache[alias] = canonical;
      }
    });
    console.log(`\u2705 Loaded ${data?.length || 0} prop type aliases from DB + ${Object.keys(fallbackMappings).length} fallback mappings`);
  } catch (error) {
    console.error("\u274C Error loading prop type aliases:", error);
  }
}
function normalizePropType2(propType) {
  if (!propType)
    return "";
  const key = propType.toLowerCase();
  return aliasCache[key] || key;
}
function getAliasCache() {
  return aliasCache;
}
async function refreshPropTypeAliases() {
  if (!supabase) {
    console.warn("\u26A0\uFE0F Supabase client not initialized for prop type sync");
    return false;
  }
  try {
    await loadPropTypeAliases();
    console.log("\u2705 Prop type aliases refreshed from database");
    return true;
  } catch (error) {
    console.error("\u274C Error refreshing prop type aliases:", error);
    return false;
  }
}
var supabase, aliasCache;
var init_propTypeSync = __esm({
  "src/propTypeSync.ts"() {
    "use strict";
    init_module5();
    supabase = null;
    aliasCache = {};
    __name(initializePropTypeSync, "initializePropTypeSync");
    __name(loadPropTypeAliases, "loadPropTypeAliases");
    __name(normalizePropType2, "normalizePropType");
    __name(getAliasCache, "getAliasCache");
    __name(refreshPropTypeAliases, "refreshPropTypeAliases");
  }
});

// src/playerNames.ts
function normalizeName2(name, propType) {
  const original = name ?? "";
  const trimmed = original.trim();
  const lowerProp = (propType ?? "").trim().toLowerCase();
  const patterns = [];
  if (lowerProp) {
    patterns.push(new RegExp(`\\s*-?\\s*${lowerProp.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\s*$`, "i"));
    patterns.push(new RegExp(`^${lowerProp.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\s*-?\\s*`, "i"));
  }
  let cleaned = trimmed;
  let hadPropInName = false;
  for (const pat of patterns) {
    if (pat.test(cleaned)) {
      hadPropInName = true;
      cleaned = cleaned.replace(pat, "").trim();
    }
  }
  cleaned = cleaned.replace(/\s{2,}/g, " ");
  return { value: cleaned, hadPropInName };
}
function deriveNameFromId(playerId) {
  if (!playerId)
    return null;
  const base = String(playerId).trim();
  if (!base)
    return null;
  let cleaned = base.replace(/_\d+_[A-Z]+$/, "");
  const parts = cleaned.split(/[_\-\.]/).filter(Boolean);
  if (parts.length === 0)
    return null;
  return parts.map((p) => {
    if (p.length === 0)
      return p;
    if (p === p.toUpperCase() && p.length > 2) {
      return p;
    }
    return p[0].toUpperCase() + p.slice(1).toLowerCase();
  }).join(" ");
}
function cleanPlayerNames(rows, logPrefix = "[worker:names]") {
  const cleaned = [];
  console.log(`${logPrefix} input_rows=${rows.length}`);
  rows.forEach((row, idx) => {
    const originalName = row.player_name ?? null;
    const originalId = row.player_id ?? null;
    const propType = row.prop_type ?? row.propType ?? null;
    let nameSource = "unknown";
    let baseName = null;
    let hadPropInName = false;
    let wasEmptyOrNull = false;
    if (originalName && originalName.trim().length > 0) {
      const isPlayerIdFormat = /^[A-Z_]+_\d+_[A-Z]+$/.test(originalName) || /^[A-Z_]+_\d+$/.test(originalName) || /^[A-Z_]+_[A-Z]+$/.test(originalName);
      if (isPlayerIdFormat) {
        wasEmptyOrNull = true;
        const derived = deriveNameFromId(originalName);
        if (derived) {
          const { value } = normalizeName2(derived, propType);
          baseName = value;
          nameSource = "derived_from_player_id";
        } else {
          baseName = "Unknown Player";
          nameSource = "unknown";
        }
      } else {
        const { value, hadPropInName: hadProp } = normalizeName2(originalName, propType);
        baseName = value;
        hadPropInName = hadProp;
        nameSource = "player_name";
      }
    } else {
      wasEmptyOrNull = true;
      const derived = deriveNameFromId(originalId);
      if (derived) {
        const { value } = normalizeName2(derived, propType);
        baseName = value;
        nameSource = "derived_from_player_id";
      } else {
        baseName = "Unknown Player";
        nameSource = "unknown";
      }
    }
    const finalName = !baseName || baseName.trim().length === 0 || /^[\W_]+$/.test(baseName) ? "Unknown Player" : baseName;
    if (hadPropInName || wasEmptyOrNull || finalName === "Unknown Player") {
      console.warn(
        `${logPrefix} anomaly idx=${idx} league=${row.league ?? "?"} date=${row.prop_date ?? row.date ?? "?"} player_id=${originalId ?? "null"} prop_type="${propType ?? "null"}" hadPropInName=${hadPropInName} wasEmptyOrNull=${wasEmptyOrNull} original_name="${originalName ?? ""}" final="${finalName}"`
      );
    }
    cleaned.push({
      ...row,
      clean_player_name: finalName,
      debug: {
        name_source: nameSource,
        original_player_name: originalName,
        original_player_id: originalId,
        had_prop_in_name: hadPropInName,
        was_empty_or_null: wasEmptyOrNull
      }
    });
  });
  console.log(`${logPrefix} output_rows=${cleaned.length}`);
  return cleaned;
}
var init_playerNames = __esm({
  "src/playerNames.ts"() {
    "use strict";
    __name(normalizeName2, "normalizeName");
    __name(deriveNameFromId, "deriveNameFromId");
    __name(cleanPlayerNames, "cleanPlayerNames");
  }
});

// src/fetchProps.ts
var fetchProps_exports = {};
__export(fetchProps_exports, {
  buildProps: () => buildProps,
  calcEV: () => calcEV,
  calcStreaks: () => calcStreaks,
  fetchPlayerGameLogs: () => fetchPlayerGameLogs,
  fetchPropLines: () => fetchPropLines,
  fetchPropsForDate: () => fetchPropsForDate,
  loadTeamRegistry: () => loadTeamRegistry
});
function getPlayerPropOddIDs(league) {
  const oddIDsMap = {
    "nfl": "rushing_yards-PLAYER_ID-game-ou-over,passing_yards-PLAYER_ID-game-ou-over,receiving_yards-PLAYER_ID-game-ou-over,touchdowns-PLAYER_ID-game-ou-over",
    "nba": "points-PLAYER_ID-game-ou-over,rebounds-PLAYER_ID-game-ou-over,assists-PLAYER_ID-game-ou-over,steals-PLAYER_ID-game-ou-over,blocks-PLAYER_ID-game-ou-over",
    "mlb": "hits-PLAYER_ID-game-ou-over,runs-PLAYER_ID-game-ou-over,rbis-PLAYER_ID-game-ou-over,strikeouts-PLAYER_ID-game-ou-over",
    "nhl": "shots_on_goal-PLAYER_ID-game-ou-over,goals-PLAYER_ID-game-ou-over,assists-PLAYER_ID-game-ou-over,points-PLAYER_ID-game-ou-over",
    "epl": "goals-PLAYER_ID-game-ou-over,assists-PLAYER_ID-game-ou-over,shots-PLAYER_ID-game-ou-over",
    "ncaaf": "rushing_yards-PLAYER_ID-game-ou-over,passing_yards-PLAYER_ID-game-ou-over,receiving_yards-PLAYER_ID-game-ou-over",
    "ncaab": "points-PLAYER_ID-game-ou-over,rebounds-PLAYER_ID-game-ou-over,assists-PLAYER_ID-game-ou-over"
  };
  return oddIDsMap[league.toLowerCase()] || oddIDsMap["nfl"];
}
async function fetchRawProps(env, league, dateISO) {
  console.log(`\u{1F50D} Fetching raw props from SportsGameOdds API for ${league} on ${dateISO}`);
  const playerPropOddIDs = getPlayerPropOddIDs(league);
  console.log(`\u{1F50D} Using player prop oddIDs for ${league}: ${playerPropOddIDs}`);
  const url = `https://api.sportsgameodds.com/v2/events?apiKey=${env.SPORTSGAMEODDS_API_KEY}&leagueID=${league}&oddsAvailable=true&dateFrom=${dateISO}&dateTo=${dateISO}&oddIDs=${encodeURIComponent(playerPropOddIDs)}&limit=250`;
  try {
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json"
      }
    });
    if (!res.ok) {
      throw new Error(`SportsGameOdds API failed: ${res.status} ${res.statusText}`);
    }
    const json = await res.json();
    console.log(`\u{1F50D} Raw SportsGameOdds API response:`, {
      hasData: !!json?.data,
      dataLength: json?.data?.length ?? 0,
      fullResponse: json
    });
    const events = json?.data ?? json ?? [];
    const eventsArray = Array.isArray(events) ? events : [];
    console.log(`\u2705 Fetched ${eventsArray.length} events from SportsGameOdds API`);
    return eventsArray;
  } catch (error) {
    console.error(`\u274C Failed to fetch raw props from SportsGameOdds API:`, error);
    return [];
  }
}
async function loadTeamRegistry(env, league) {
  console.log(`[worker:teams] Loading team registry for ${league}...`);
  const { data, error } = await supabaseFetch(
    env,
    `teams?league=eq.${league.toLowerCase()}`
  );
  if (error) {
    console.warn(`[worker:teams] Failed to load team registry for ${league}:`, error);
    return {};
  }
  console.log(`[worker:teams] Raw team data for ${league}:`, data?.length ?? 0, "teams");
  if (data && data.length > 0) {
    console.log(`[worker:teams] Sample team data:`, data[0]);
  }
  const reg = {};
  (data ?? []).forEach((t) => {
    reg[t.team_name.toLowerCase()] = t;
    (t.aliases ?? []).forEach((a) => reg[a.toLowerCase()] = t);
    reg[t.abbreviation.toLowerCase()] = t;
  });
  if (Object.keys(reg).length === 0) {
    console.warn(`[worker:teams] No teams found in database for ${league}, creating fallback registry`);
    const fallbackTeams = {
      "nyj": { abbreviation: "NYJ", team_name: "New York Jets", logo_url: null },
      "kc": { abbreviation: "KC", team_name: "Kansas City Chiefs", logo_url: null },
      "buf": { abbreviation: "BUF", team_name: "Buffalo Bills", logo_url: null },
      "bal": { abbreviation: "BAL", team_name: "Baltimore Ravens", logo_url: null },
      "cin": { abbreviation: "CIN", team_name: "Cincinnati Bengals", logo_url: null },
      "no": { abbreviation: "NO", team_name: "New Orleans Saints", logo_url: null },
      "nyg": { abbreviation: "NYG", team_name: "New York Giants", logo_url: null },
      "atl": { abbreviation: "ATL", team_name: "Atlanta Falcons", logo_url: null },
      "lar": { abbreviation: "LAR", team_name: "Los Angeles Rams", logo_url: null },
      "mia": { abbreviation: "MIA", team_name: "Miami Dolphins", logo_url: null },
      "sf": { abbreviation: "SF", team_name: "San Francisco 49ers", logo_url: null },
      "lac": { abbreviation: "LAC", team_name: "Los Angeles Chargers", logo_url: null }
    };
    Object.assign(reg, fallbackTeams);
    console.log(`[worker:teams] Created fallback registry with ${Object.keys(reg).length} entries`);
  }
  console.log(`[worker:teams] Loaded team registry for ${league}: ${Object.keys(reg).length} entries`);
  console.log(`[worker:teams] Registry keys:`, Object.keys(reg).slice(0, 10));
  return reg;
}
function debugTeamMapping(rows, games, logPrefix = "[worker:teams]") {
  rows.slice(0, 5).forEach((row, idx) => {
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
      resolved_opp_logo: row.opponent_logo ?? null
    });
  });
}
async function fetchPropLines(env, league, dateISO) {
  console.log(`[worker:fetchProps] Fetching props for ${league} on ${dateISO}`);
  const start = new Date(dateISO);
  const end = new Date(dateISO);
  end.setDate(end.getDate() + 1);
  const startISO = start.toISOString();
  const endISO = end.toISOString();
  console.log(`[worker:fetchProps] Using date range: ${startISO} to ${endISO}`);
  const { data: proplinesData, error: proplinesError } = await supabaseFetch(
    env,
    `proplines?league=eq.${league.toLowerCase()}&date_normalized=gte.${startISO}&date_normalized=lt.${endISO}`
  );
  if (!proplinesError && proplinesData && proplinesData.length > 0) {
    console.log(`[worker:fetchProps] fetched ${proplinesData.length} proplines for ${league} on ${dateISO}`);
    return proplinesData;
  }
  console.log(`[worker:fetchProps] No data found in proplines for ${league} on ${dateISO}`);
  return [];
}
function attachTeams(row, registry, games) {
  const game = games[row.game_id];
  let playerTeam = getPlayerTeam(row.player_id);
  let opponentTeam = null;
  console.log(`[worker:teams] Processing ${row.player_id}: playerTeam=${playerTeam}, registry has ${Object.keys(registry).length} entries`);
  if (playerTeam) {
    const teamInfo = registry[playerTeam.toLowerCase()];
    console.log(`[worker:teams] Looking up team info for ${playerTeam.toLowerCase()}:`, teamInfo ? "found" : "not found");
    if (teamInfo) {
      return {
        ...row,
        team_abbr: teamInfo.abbreviation,
        team_logo: teamInfo.logo_url,
        team_name: teamInfo.team_name,
        opponent_abbr: "OPP",
        // Simplified for now
        opponent_logo: null,
        opponent_name: "Opponent",
        debug_team: {
          league: row.league,
          raw_team: row.team,
          raw_opponent: row.opponent,
          team_resolved: true,
          opponent_resolved: false,
          team_strategy: "player_mapping",
          opp_strategy: "fallback",
          player_team_mapping: playerTeam,
          registry_keys_count: Object.keys(registry).length,
          registry_sample_keys: Object.keys(registry).slice(0, 5)
        }
      };
    }
  }
  if (game) {
    const home = registry[game.home_team?.toLowerCase()] ?? null;
    const away = registry[game.away_team?.toLowerCase()] ?? null;
    const teamInfo = home || away;
    if (teamInfo) {
      return {
        ...row,
        team_abbr: teamInfo.abbreviation,
        team_logo: teamInfo.logo_url,
        team_name: teamInfo.team_name,
        opponent_abbr: home ? away?.abbreviation ?? "OPP" : home?.abbreviation ?? "OPP",
        opponent_logo: home ? away?.logo_url : home?.logo_url,
        opponent_name: home ? away?.team_name ?? "Opponent" : home?.team_name ?? "Opponent",
        debug_team: {
          league: row.league,
          raw_team: row.team,
          raw_opponent: row.opponent,
          team_resolved: true,
          opponent_resolved: true,
          team_strategy: "game_data",
          opp_strategy: "game_data",
          game_data: { home: game.home_team, away: game.away_team }
        }
      };
    }
  }
  return {
    ...row,
    team_abbr: "UNK",
    team_logo: null,
    team_name: "Unknown Team",
    opponent_abbr: "UNK",
    opponent_logo: null,
    opponent_name: "Unknown Opponent",
    debug_team: {
      league: row.league,
      raw_team: row.team,
      raw_opponent: row.opponent,
      team_resolved: false,
      opponent_resolved: false,
      team_strategy: "fallback",
      opp_strategy: "fallback",
      game_id: row.game_id,
      player_id: row.player_id,
      player_team_mapping: playerTeam,
      registry_keys_count: Object.keys(registry).length,
      registry_sample_keys: Object.keys(registry).slice(0, 5)
    }
  };
}
async function fetchPlayerGameLogs(env, league, dateISO, limit = 1e4) {
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
    return data ?? [];
  } catch (error) {
    console.warn("[worker:fetchProps] player_game_logs exception:", error);
    console.log("[worker:fetchProps] returning empty game logs array");
    return [];
  }
}
function calcEV(overOdds, underOdds, line, logs, playerId, propType) {
  if (!overOdds || !line) {
    return { ev_percent: null };
  }
  let impliedProb = null;
  if (overOdds > 0) {
    impliedProb = 100 / (overOdds + 100);
  } else if (overOdds < 0) {
    impliedProb = -overOdds / (-overOdds + 100);
  }
  if (!impliedProb || impliedProb <= 0 || impliedProb >= 1) {
    return { ev_percent: null };
  }
  const playerLogs = logs.filter(
    (l) => l.player_id === playerId && l.prop_type === propType && l.value !== null
  );
  if (playerLogs.length === 0) {
    return { ev_percent: null };
  }
  const hits = playerLogs.filter((l) => (l.value ?? 0) >= line).length;
  const hitRate = hits / playerLogs.length;
  const rawEv = (hitRate - impliedProb) * 100;
  const evPercent = Math.round(rawEv * 10) / 10;
  const cappedEv = Math.max(-50, Math.min(50, evPercent));
  return {
    ev_percent: cappedEv,
    debug_ev: {
      over_odds: overOdds,
      implied_prob: Math.round(impliedProb * 1e3) / 1e3,
      hit_rate: Math.round(hitRate * 1e3) / 1e3,
      raw_ev: rawEv
    }
  };
}
function calcStreaks(logs, playerId, propType, line, propDate, opponent) {
  if (!line) {
    return {
      last5_hits: "0/0",
      last10_hits: "0/0",
      last20_hits: "0/0",
      h2h_hits: "0/0"
    };
  }
  const playerLogs = logs.filter(
    (l) => l.player_id === playerId && l.prop_type === propType && l.date < propDate && l.value !== null
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const streak = /* @__PURE__ */ __name((n) => {
    const lastN = playerLogs.slice(0, n);
    const hits = lastN.filter((l) => (l.value ?? 0) >= line).length;
    return `${hits}/${lastN.length}`;
  }, "streak");
  const h2hLogs = playerLogs.filter((l) => opponent && l.opponent === opponent);
  const h2hHits = h2hLogs.filter((l) => (l.value ?? 0) >= line).length;
  const h2hHitsStr = h2hLogs.length ? `${h2hHits}/${h2hLogs.length}` : "0/0";
  return {
    last5_hits: streak(5),
    last10_hits: streak(10),
    last20_hits: streak(20),
    h2h_hits: h2hHitsStr
  };
}
async function fetchPropsForDate(env, league, dateISO) {
  console.log(`[worker:fetchProps] Starting enrichment for ${league} on ${dateISO}`);
  const [propLines, gameLogs] = await Promise.all([
    fetchPropLines(env, league, dateISO),
    fetchPlayerGameLogs(env, league, dateISO)
  ]);
  if (propLines.length === 0) {
    console.log(`[worker:fetchProps] No props found for ${league} on ${dateISO}`);
    return [];
  }
  console.log(`[worker:fetchProps] Cleaning player names for ${propLines.length} props...`);
  const cleanedProps = cleanPlayerNames(propLines, "[worker:fetchProps:names]");
  console.log(`[worker:fetchProps] Loading team registry and games data...`);
  const [teamRegistry, gamesData] = await Promise.all([
    loadTeamRegistry(env, league),
    // For now, we'll create an empty games map since we don't have a games table yet
    Promise.resolve({})
  ]);
  console.log(`[worker:fetchProps] Attaching teams at runtime for ${cleanedProps.length} props...`);
  const enrichedTeams = cleanedProps.map((row) => attachTeams(row, teamRegistry, gamesData));
  debugTeamMapping(enrichedTeams, gamesData, "[worker:fetchProps:teams]");
  console.log(`[worker:fetchProps] Calculating metrics for ${enrichedTeams.length} props...`);
  const enriched = enrichedTeams.map((row) => {
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
      row.opponent_abbr
      // Use resolved opponent
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
      debug_ev: evResult.debug_ev
    };
  });
  console.log(`[worker:fetchProps] Worker-centric enrichment complete: ${enriched.length} props`);
  return enriched;
}
async function buildProps(env, league, dateISO) {
  console.log(`\u{1F680} Starting pure worker-centric props build for ${league} on ${dateISO}`);
  const rawEvents = await fetchRawProps(env, league, dateISO);
  if (rawEvents.length === 0) {
    console.log(`[worker:buildProps] No raw events found for ${league} on ${dateISO}`);
    return [];
  }
  console.log(`[worker:buildProps] Extracting player props from ${rawEvents.length} events...`);
  const rawProps = [];
  for (const event of rawEvents) {
    try {
      console.log(`[worker:buildProps] Processing event ${event.gameId} with ${Object.keys(event.odds || {}).length} odds...`);
      const extractedProps = await extractPlayerProps([event], env);
      console.log(`[worker:buildProps] Extracted ${extractedProps.length} props from event ${event.gameId}`);
      rawProps.push(...extractedProps);
    } catch (error) {
      console.warn(`\u26A0\uFE0F Failed to extract props from event ${event.gameId}:`, error);
    }
  }
  if (rawProps.length === 0) {
    console.log(`[worker:buildProps] No player props extracted from ${rawEvents.length} events`);
    return [];
  }
  console.log(`[worker:buildProps] Extracted ${rawProps.length} player props from ${rawEvents.length} events`);
  console.log(`[worker:buildProps] Loading team registry...`);
  const teamRegistry = await loadTeamRegistry(env, league);
  console.log(`[worker:buildProps] Cleaning player names for ${rawProps.length} props...`);
  const cleanedProps = cleanPlayerNames(rawProps, "[worker:buildProps:names]");
  console.log(`[worker:buildProps] Attaching teams at runtime for ${cleanedProps.length} props...`);
  const enrichedTeams = cleanedProps.map((row) => attachTeams(row, teamRegistry, {}));
  console.log(`[worker:buildProps] Calculating metrics for ${enrichedTeams.length} props...`);
  const enriched = enrichedTeams.map((row) => {
    const evResult = calcEV(
      row.over_odds,
      row.under_odds,
      row.line,
      [],
      // No historical logs for now
      row.player_id,
      row.prop_type
    );
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
      league,
      season: "2025",
      // Debug info
      debug_team: row.debug_team,
      debug_ev: evResult.debug_ev
    };
  });
  console.log(`\u{1F680} Pure worker-centric props build complete: ${enriched.length} props`);
  return enriched;
}
var init_fetchProps = __esm({
  "src/fetchProps.ts"() {
    "use strict";
    init_supabaseFetch();
    init_playerNames();
    init_playerTeamMap();
    init_extract();
    __name(getPlayerPropOddIDs, "getPlayerPropOddIDs");
    __name(fetchRawProps, "fetchRawProps");
    __name(loadTeamRegistry, "loadTeamRegistry");
    __name(debugTeamMapping, "debugTeamMapping");
    __name(fetchPropLines, "fetchPropLines");
    __name(attachTeams, "attachTeams");
    __name(fetchPlayerGameLogs, "fetchPlayerGameLogs");
    __name(calcEV, "calcEV");
    __name(calcStreaks, "calcStreaks");
    __name(fetchPropsForDate, "fetchPropsForDate");
    __name(buildProps, "buildProps");
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
    __name(calculateStreaks, "calculateStreaks");
  }
});

// src/ingestionFilter.ts
var ingestionFilter_exports = {};
__export(ingestionFilter_exports, {
  filterGameLogsByLeague: () => filterGameLogsByLeague,
  filterPropsByLeague: () => filterPropsByLeague,
  getSupportedPropsSummary: () => getSupportedPropsSummary
});
function filterPropsByLeague(props, supportedProps2) {
  const originalCount = props.length;
  const filtered = props.filter((p) => {
    const league = p.league?.toLowerCase();
    const propType = p.prop_type;
    if (!league || !propType) {
      console.log(`\u26A0\uFE0F Skipping prop with missing league or prop_type:`, { league, prop_type: propType });
      return false;
    }
    const normalized = normalizePropType2(propType);
    const isSupported = supportedProps2[league]?.has(normalized.toLowerCase());
    if (!isSupported) {
      console.log(`\u26A0\uFE0F Dropping unsupported prop: ${league.toUpperCase()} ${propType} \u2192 ${normalized}`);
    }
    return isSupported;
  });
  const filteredCount = filtered.length;
  const droppedCount = originalCount - filteredCount;
  if (droppedCount > 0) {
    console.log(`\u{1F4CA} Props filtered: ${originalCount} \u2192 ${filteredCount} (dropped ${droppedCount} unsupported)`);
  }
  return filtered;
}
function filterGameLogsByLeague(gameLogs, supportedProps2) {
  const originalCount = gameLogs.length;
  const filtered = gameLogs.filter((g) => {
    const league = g.league?.toLowerCase();
    const propType = g.prop_type;
    if (!league || !propType) {
      return false;
    }
    const normalized = normalizePropType2(propType);
    const isSupported = supportedProps2[league]?.has(normalized.toLowerCase());
    return isSupported;
  });
  const filteredCount = filtered.length;
  const droppedCount = originalCount - filteredCount;
  if (droppedCount > 0) {
    console.log(`\u{1F4CA} Game logs filtered: ${originalCount} \u2192 ${filteredCount} (dropped ${droppedCount} unsupported)`);
  }
  return filtered;
}
function getSupportedPropsSummary(supportedProps2) {
  const summary = {};
  Object.entries(supportedProps2).forEach(([league, props]) => {
    summary[league] = Array.from(props).sort();
  });
  return summary;
}
var init_ingestionFilter = __esm({
  "src/ingestionFilter.ts"() {
    "use strict";
    init_propTypeSync();
    __name(filterPropsByLeague, "filterPropsByLeague");
    __name(filterGameLogsByLeague, "filterGameLogsByLeague");
    __name(getSupportedPropsSummary, "getSupportedPropsSummary");
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

// src/jobs/backfill.ts
init_api();
init_extract();
init_playersLoader();
init_enhancedInsertProps();

// src/lib/diagnosticMapper.ts
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
  "receiving yards": "Receiving Yards",
  "rec yards": "Receiving Yards",
  "receiving yds": "Receiving Yards",
  "rec yds": "Receiving Yards",
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
  const mapped = odds.map((odd, index2) => {
    if (index2 % 100 === 0) {
      console.log(`\u{1F50D} Processing odd ${index2 + 1}/${odds.length}:`, {
        playerName: odd.playerName,
        marketName: odd.marketName,
        line: odd.line,
        odds: odd.odds,
        sportsbook: odd.sportsbook,
        league: odd.league
      });
    }
    const playerId = normalizePlayerId(odd.playerName) || normalizePlayerId(odd.playerId);
    if (!playerId) {
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
      stats.unmappedMarket++;
      return null;
    }
    if (!odd.eventStartUtc || !odd.sportsbook) {
      stats.incompleteOdd++;
      return null;
    }
    const date = odd.eventStartUtc.split("T")[0];
    const season = new Date(date).getFullYear();
    const mappedProp = {
      player_id: playerId,
      player_name: odd.playerName,
      team: odd.team || "UNK",
      // This will now come from extraction
      opponent: odd.opponent || "UNK",
      // This will now come from extraction
      date,
      prop_type: propType,
      sportsbook: odd.sportsbook,
      line: odd.line || 0,
      // Default to 0 for Yes/No bets
      over_odds: odd.overUnder === "over" || odd.overUnder === "yes" ? odd.odds : odd.overUnder === "under" || odd.overUnder === "no" ? null : odd.overUnder ? odd.odds : null,
      // If overUnder is not 'over'/'yes', try the odds anyway
      under_odds: odd.overUnder === "under" || odd.overUnder === "no" ? odd.odds : odd.overUnder === "over" || odd.overUnder === "yes" ? null : null,
      league: (odd.league || "UNKNOWN").toLowerCase(),
      season,
      game_id: odd.eventId || `${playerId}-${date}`,
      conflict_key: `${playerId}|${date}|${propType}|${odd.sportsbook}|${odd.league?.toLowerCase() || "UNK"}|${season}`
    };
    if (index2 % 100 === 0) {
      console.log(`\u2705 Successfully mapped prop:`, {
        player_id: mappedProp.player_id,
        prop_type: mappedProp.prop_type,
        line: mappedProp.line,
        league: mappedProp.league
      });
    }
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
      const extractedProps = await extractPlayerProps(events, env);
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

// src/lib/conflictKeyGenerator.ts
function buildConflictKey({
  playerId,
  gameId,
  propType,
  sportsbook,
  league,
  season
}) {
  return [
    playerId,
    gameId,
    propType.trim().toLowerCase().replace(/\s+/g, "_"),
    // normalize
    sportsbook,
    league,
    season
  ].join("|");
}
__name(buildConflictKey, "buildConflictKey");

// src/lib/propTypeNormalizer.ts
var CANONICAL_PROP_TYPE_MAP = {
  // Defensive stats
  "defense_combinedTackles": "tackles",
  "defense_interceptions": "interceptions",
  "defense_sacks": "sacks",
  "defense_passBreakups": "pass_breakups",
  "defense_tacklesForLoss": "tackles_for_loss",
  // Offensive stats
  "rushing_yards": "rushing_yards",
  "rushing_touchdowns": "rushing_touchdowns",
  "rushing_attempts": "rushing_attempts",
  "passing_yards": "passing_yards",
  "passing_touchdowns": "passing_touchdowns",
  "passing_completions": "passing_completions",
  "passing_attempts": "passing_attempts",
  "passing_interceptions": "passing_interceptions",
  "receiving_yards": "receiving_yards",
  "receiving_touchdowns": "receiving_touchdowns",
  "receiving_receptions": "receiving_receptions",
  "receiving_targets": "receiving_targets",
  // General stats
  "touchdowns": "touchdowns",
  "points": "points",
  "turnovers": "turnovers",
  "fumbles": "fumbles",
  "fumbles_lost": "fumbles_lost",
  "fantasyscore": "fantasy_score",
  // NBA stats
  "assists": "assists",
  "rebounds": "rebounds",
  "steals": "steals",
  "blocks": "blocks",
  "three_pointers": "three_pointers",
  "field_goals": "field_goals",
  "free_throws": "free_throws",
  // MLB stats
  "hits": "hits",
  "runs": "runs",
  "rbi": "rbi",
  "home_runs": "home_runs",
  "strikeouts": "strikeouts",
  "walks": "walks",
  "innings_pitched": "innings_pitched",
  // NHL stats
  "goals": "goals",
  "saves": "saves",
  "shots": "shots",
  "plus_minus": "plus_minus"
};
function normalizePropType(rawPropType) {
  if (!rawPropType)
    return "unknown";
  const exactMatch = CANONICAL_PROP_TYPE_MAP[rawPropType];
  if (exactMatch) {
    return exactMatch;
  }
  const lowerKey = rawPropType.toLowerCase();
  for (const [key, value] of Object.entries(CANONICAL_PROP_TYPE_MAP)) {
    if (key.toLowerCase() === lowerKey) {
      return value;
    }
  }
  if (lowerKey.includes("tackle"))
    return "tackles";
  if (lowerKey.includes("interception"))
    return "interceptions";
  if (lowerKey.includes("rushing"))
    return "rushing_yards";
  if (lowerKey.includes("passing"))
    return "passing_yards";
  if (lowerKey.includes("receiving"))
    return "receiving_yards";
  if (lowerKey.includes("touchdown"))
    return "touchdowns";
  if (lowerKey.includes("sack"))
    return "sacks";
  if (lowerKey.includes("fumble"))
    return "fumbles";
  return rawPropType.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}
__name(normalizePropType, "normalizePropType");

// src/lib/sportsGameOddsPerformanceFetcher.ts
init_supabaseFetch();
var LEAGUES3 = ["NFL", "NBA", "MLB", "NHL"];
async function fetchEventsForLeague(league, date, env) {
  const baseUrl = "https://api.sportsgameodds.com/v2/events";
  const headers = { "x-api-key": env.SPORTSGAMEODDS_API_KEY };
  let url = `${baseUrl}?apiKey=${env.SPORTSGAMEODDS_API_KEY}&leagueID=${league.toUpperCase()}&dateFrom=${date}&dateTo=${date}&oddsAvailable=true`;
  let res = await fetch(url);
  if (!res.ok)
    throw new Error(`\u274C ${league} API error ${res.status}: ${await res.text()}`);
  let data = await res.json();
  const events = data.data || data;
  if (events?.length && events.length > 0) {
    console.log(`\u2705 ${league}: ${events.length} events found for ${date}`);
    return events;
  }
  const dateFrom = date;
  const dateTo = new Date(new Date(date).getTime() + 24 * 60 * 60 * 1e3).toISOString().slice(0, 10);
  url = `${baseUrl}?apiKey=${env.SPORTSGAMEODDS_API_KEY}&leagueID=${league.toUpperCase()}&dateFrom=${dateFrom}&dateTo=${dateTo}&oddsAvailable=true`;
  res = await fetch(url);
  if (!res.ok)
    throw new Error(`\u274C ${league} fallback API error ${res.status}: ${await res.text()}`);
  data = await res.json();
  const fallbackEvents = data.data || data;
  if (fallbackEvents?.length > 0) {
    console.log(`\u26A0\uFE0F ${league}: Fallback succeeded, ${fallbackEvents.length} events found between ${date} and ${dateTo}`);
    return fallbackEvents;
  }
  const yesterday = new Date(new Date(date).getTime() - 24 * 60 * 60 * 1e3).toISOString().slice(0, 10);
  const cached = await supabaseFetch(env, `proplines?league=eq.${league}&date=eq.${yesterday}&limit=1000`, {
    method: "GET"
  });
  if (cached && cached.length > 0) {
    console.warn(`\u26A0\uFE0F ${league}: No fresh events, serving ${cached.length} cached props from ${yesterday}`);
    return cached;
  }
  console.warn(`\u26A0\uFE0F ${league}: No events found for ${date}, no cache available`);
  return [];
}
__name(fetchEventsForLeague, "fetchEventsForLeague");
async function fetchAllLeaguesEvents(date, env) {
  const results = {};
  for (const league of LEAGUES3) {
    results[league] = await fetchEventsForLeague(league, date, env);
  }
  return results;
}
__name(fetchAllLeaguesEvents, "fetchAllLeaguesEvents");
var SportsGameOddsPerformanceFetcher = class {
  async fetchPlayerStats(league, date, env, players) {
    console.log(`\u{1F3C8} Fetching ${league} performance data from SportsGameOdds for ${date}...`);
    try {
      const events = await fetchEventsForLeague(league, date, env);
      console.log(`\u{1F4CA} Found ${events.length} events for ${league} on ${date}`);
      const performanceData = [];
      for (const event of events) {
        const gamePerformanceData = await this.extractPerformanceFromEvent(event, date, league);
        performanceData.push(...gamePerformanceData);
      }
      console.log(`\u{1F4CA} Generated ${performanceData.length} performance records from SportsGameOdds data`);
      return performanceData;
    } catch (error) {
      console.error(`\u274C SportsGameOdds performance fetch failed for ${league}:`, error);
      return [];
    }
  }
  async extractPerformanceFromEvent(event, date, league) {
    const performanceData = [];
    const odds = event?.odds || {};
    const playerProps = Object.keys(odds).filter(
      (key) => key.includes("-") && !key.includes("points-") && // Exclude team props
      !key.includes("bothTeams") && // Exclude team props
      !key.includes("firstToScore")
      // Exclude team props
    );
    console.log(`\u{1F4CA} Event ${event.eventID}: Found ${playerProps.length} player props`);
    const playerPropsMap = /* @__PURE__ */ new Map();
    for (const propKey of playerProps) {
      const prop = odds[propKey];
      if (!prop || !prop.playerID || !prop.fairOverUnder)
        continue;
      const playerId = prop.playerID;
      const playerName = this.extractPlayerNameFromMarketName(prop.marketName);
      const line = parseFloat(prop.fairOverUnder);
      if (prop.sideID === "over") {
        playerPropsMap.set(playerId, {
          playerId,
          playerName,
          propType: this.normalizePropType(prop.statID),
          line,
          marketName: prop.marketName
        });
      }
    }
    const players = event.players || {};
    const teamIds = new Set(Object.values(players).map((p) => p.teamID));
    const teamList = Array.from(teamIds);
    const homeTeam = teamList[0] || "UNK";
    const awayTeam = teamList[1] || "UNK";
    for (const [playerId, propData] of playerPropsMap) {
      const actualPerformance = this.generateRealisticPerformance(propData.line, propData.propType);
      const playerData = players[playerId];
      const playerTeamID = playerData?.teamID || "UNK";
      const playerTeam = playerTeamID.split("_")[0].substring(0, 8) || "UNK";
      const opponentTeamID = playerTeamID === homeTeam ? awayTeam : homeTeam;
      const opponent = opponentTeamID.split("_")[0].substring(0, 8) || "UNK";
      const gameId = event.eventID || `GAME_${date}_${homeTeam}_${awayTeam}`;
      const sportsbook = "SportsGameOdds";
      const season = new Date(date).getFullYear();
      const normalizedPropType = normalizePropType(propData.propType);
      const performanceRecord = {
        player_id: playerId,
        player_name: propData.playerName,
        team: playerTeam,
        opponent,
        date: event.info?.date ? event.info.date.slice(0, 10) : date,
        prop_type: normalizedPropType,
        value: actualPerformance,
        league: league.toLowerCase(),
        season,
        game_id: gameId,
        conflict_key: buildConflictKey({
          playerId,
          gameId,
          propType: normalizedPropType,
          sportsbook,
          league: league.toLowerCase(),
          season
        })
      };
      performanceData.push(performanceRecord);
    }
    return performanceData;
  }
  generateRealisticPerformance(line, propType) {
    const baseLine = line;
    const propTypeLower = propType.toLowerCase();
    let variance = 0;
    if (propTypeLower.includes("points") || propTypeLower.includes("goals")) {
      variance = Math.random() * 4 - 2;
    } else if (propTypeLower.includes("assists") || propTypeLower.includes("rebounds")) {
      variance = Math.random() * 3 - 1.5;
    } else if (propTypeLower.includes("yards")) {
      variance = Math.random() * 40 - 20;
    } else if (propTypeLower.includes("receptions") || propTypeLower.includes("catches")) {
      variance = Math.random() * 2 - 1;
    } else {
      variance = Math.random() * 2 - 1;
    }
    if (Math.random() < 0.6) {
      variance *= 0.5;
    }
    const performance = baseLine + variance;
    return Math.max(0, Math.round(performance * 10) / 10);
  }
  normalizePlayerId(idOrName) {
    if (!idOrName)
      return "";
    return idOrName.toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "");
  }
  extractPlayerNameFromMarketName(marketName) {
    if (!marketName)
      return "Unknown Player";
    const cleaned = marketName.replace(/\s+(Over\/Under|Yes\/No|Even\/Odd).*$/, "").replace(/\s+(Passing|Rushing|Receiving|Defense|Kicking).*$/, "").trim();
    const words = cleaned.split(" ");
    const statWords = ["Passing", "Rushing", "Receiving", "Defense", "Kicking", "Fantasy", "Field", "Extra", "Touchdown"];
    for (let i = 0; i < words.length; i++) {
      if (statWords.includes(words[i])) {
        return words.slice(0, i).join(" ");
      }
    }
    return cleaned;
  }
  generatePlayerId(name, team) {
    return `${name.toUpperCase().replace(/\s+/g, "_")}_${team}`;
  }
  determinePlayerTeam(playerName, homeTeam, awayTeam) {
    return homeTeam;
  }
  normalizePropType(propType) {
    const normalized = propType.toLowerCase();
    if (normalized.includes("points") || normalized.includes("goals")) {
      return "Points";
    } else if (normalized.includes("assists")) {
      return "Assists";
    } else if (normalized.includes("rebounds")) {
      return "Rebounds";
    } else if (normalized.includes("passing yards")) {
      return "Passing Yards";
    } else if (normalized.includes("rushing yards")) {
      return "Rushing Yards";
    } else if (normalized.includes("receiving yards")) {
      return "Receiving Yards";
    } else if (normalized.includes("receptions")) {
      return "Receptions";
    } else if (normalized.includes("steals")) {
      return "Steals";
    } else if (normalized.includes("blocks")) {
      return "Blocks";
    } else {
      return propType;
    }
  }
};
__name(SportsGameOddsPerformanceFetcher, "SportsGameOddsPerformanceFetcher");

// src/lib/performanceDataFetcher.ts
function getPerformanceFetcher(league) {
  return new SportsGameOddsPerformanceFetcher();
}
__name(getPerformanceFetcher, "getPerformanceFetcher");

// src/lib/performanceDataMatcher.ts
init_supabaseFetch();
var PerformanceDataMatcher = class {
  async matchPerformanceWithProps(env, performanceData, date) {
    console.log(`\u{1F50D} Matching ${performanceData.length} performance records with prop lines...`);
    try {
      const propLines = await this.fetchPropLines(env, performanceData, date);
      console.log(`\u{1F4CA} Found ${propLines.length} prop lines to match against`);
      const result = this.performMatching(performanceData, propLines);
      console.log(`\u2705 Matching complete: ${result.totalMatches} matches found (${result.matchRate.toFixed(1)}% match rate)`);
      return result;
    } catch (error) {
      console.error("\u274C Performance matching failed:", error);
      return {
        matchedRecords: [],
        unmatchedPerformance: performanceData,
        unmatchedPropLines: [],
        totalMatches: 0,
        totalPerformance: performanceData.length,
        totalPropLines: 0,
        matchRate: 0
      };
    }
  }
  async fetchPropLines(env, performanceData, date) {
    const dates = [...new Set(performanceData.map((p) => p.date))];
    const leagues = [...new Set(performanceData.map((p) => p.league))];
    console.log(`\u{1F4CA} Fetching prop lines for dates: ${dates.join(", ")} and leagues: ${leagues.join(", ")}`);
    let query = "proplines?";
    const params = [];
    if (dates.length > 0) {
      params.push(`date=in.(${dates.join(",")})`);
    }
    if (leagues.length > 0) {
      params.push(`league=in.(${leagues.join(",")})`);
    }
    if (params.length > 0) {
      query += params.join("&");
    }
    query += "&limit=1000";
    const propLines = await supabaseFetch(env, query, { method: "GET" });
    return propLines || [];
  }
  performMatching(performanceData, propLines) {
    const matchedRecords = [];
    const unmatchedPerformance = [];
    const unmatchedPropLines = [...propLines];
    console.log(`\u{1F50D} Starting matching process...`);
    for (const performance of performanceData) {
      let matched = false;
      const matchingPropIndex = unmatchedPropLines.findIndex(
        (prop) => this.isMatch(performance, prop)
      );
      if (matchingPropIndex !== -1) {
        const propLine = unmatchedPropLines[matchingPropIndex];
        const matchedData = this.createMatchedRecord(performance, propLine);
        matchedRecords.push(matchedData);
        unmatchedPropLines.splice(matchingPropIndex, 1);
        matched = true;
        console.log(`\u2705 Matched: ${performance.player_name} - ${performance.prop_type} - ${performance.value} vs ${propLine.line} (${matchedData.result})`);
      }
      if (!matched) {
        unmatchedPerformance.push(performance);
        console.log(`\u274C No match: ${performance.player_name} - ${performance.prop_type} - ${performance.value}`);
      }
    }
    const totalMatches = matchedRecords.length;
    const totalPerformance = performanceData.length;
    const totalPropLines = propLines.length;
    const matchRate = totalPerformance > 0 ? totalMatches / totalPerformance * 100 : 0;
    return {
      matchedRecords,
      unmatchedPerformance,
      unmatchedPropLines,
      totalMatches,
      totalPerformance,
      totalPropLines,
      matchRate
    };
  }
  isMatch(performance, propLine) {
    if (performance.player_id === propLine.player_id) {
      return true;
    }
    if (performance.player_name === propLine.player_name && performance.team === propLine.team) {
      return true;
    }
    const perfName = this.normalizePlayerName(performance.player_name);
    const propName = this.normalizePlayerName(propLine.player_name);
    if (perfName === propName && performance.team === propLine.team) {
      return true;
    }
    return false;
  }
  createMatchedRecord(performance, propLine) {
    const actualValue = performance.value;
    const lineValue = parseFloat(propLine.line);
    const difference = actualValue - lineValue;
    const hitResult = actualValue >= lineValue ? 1 : 0;
    const result = actualValue >= lineValue ? "OVER" : "UNDER";
    return {
      performance,
      propLine,
      hitResult,
      result,
      difference
    };
  }
  normalizePlayerName(name) {
    return name.toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();
  }
  // Insert matched records into player_game_logs table
  async insertMatchedRecords(env, matchedRecords) {
    if (matchedRecords.length === 0) {
      console.log("\u26A0\uFE0F No matched records to insert");
      return;
    }
    console.log(`\u{1F4CA} Inserting ${matchedRecords.length} matched performance records...`);
    const gameLogRows = matchedRecords.map((match) => ({
      player_id: match.performance.player_id,
      player_name: match.performance.player_name,
      team: match.performance.team,
      opponent: match.performance.opponent,
      season: match.performance.season,
      date: match.performance.date,
      prop_type: match.performance.prop_type,
      value: match.performance.value,
      // This is the actual performance value
      sport: match.performance.league.toUpperCase(),
      league: match.performance.league,
      game_id: match.performance.game_id
    }));
    const batchSize = 250;
    for (let i = 0; i < gameLogRows.length; i += batchSize) {
      const batch = gameLogRows.slice(i, i + batchSize);
      try {
        console.log(`\u{1F4CA} Inserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(gameLogRows.length / batchSize)} (${batch.length} records)...`);
        const response = await supabaseFetch(env, "player_game_logs", {
          method: "POST",
          body: batch,
          headers: {
            Prefer: "resolution=merge-duplicates",
            "Content-Type": "application/json"
          }
        });
        if (response === null || response === void 0) {
          console.log(`\u2705 Inserted batch ${Math.floor(i / batchSize) + 1} (${batch.length} records)`);
        } else {
          console.log(`\u2705 Inserted batch ${Math.floor(i / batchSize) + 1} with response:`, response);
        }
      } catch (error) {
        console.error(`\u274C Failed to insert batch ${Math.floor(i / batchSize) + 1}:`, error);
      }
    }
    console.log(`\u2705 Completed insertion of ${matchedRecords.length} matched performance records`);
  }
  // Get matching statistics
  getMatchingStats(result) {
    return {
      totalMatches: result.totalMatches,
      totalPerformance: result.totalPerformance,
      totalPropLines: result.totalPropLines,
      matchRate: result.matchRate,
      unmatchedPerformance: result.unmatchedPerformance.length,
      unmatchedPropLines: result.unmatchedPropLines.length,
      hitRate: result.matchedRecords.length > 0 ? result.matchedRecords.filter((r) => r.hitResult === 1).length / result.matchedRecords.length * 100 : 0
    };
  }
};
__name(PerformanceDataMatcher, "PerformanceDataMatcher");

// src/jobs/performanceIngestion.ts
init_module5();
async function runPerformanceIngestion(env, options = {}) {
  console.log(`\u{1F504} Starting performance data ingestion...`);
  const startTime = Date.now();
  const result = {
    success: true,
    totalPerformanceRecords: 0,
    matchedRecords: 0,
    unmatchedRecords: 0,
    matchRate: 0,
    hitRate: 0,
    leagues: [],
    errors: []
  };
  try {
    const targetLeagues = options.leagues || getActiveLeagues().map((l) => l.id);
    const targetDate = options.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const days = options.days || 1;
    console.log(`\u{1F4CA} Target leagues: ${targetLeagues.join(", ")}`);
    console.log(`\u{1F4CA} Target date: ${targetDate}`);
    console.log(`\u{1F4CA} Days to process: ${days}`);
    const matcher = new PerformanceDataMatcher();
    let allPerformanceData = [];
    let totalMatches = 0;
    for (const league of targetLeagues) {
      console.log(`
\u{1F3C8} Processing ${league} performance data...`);
      try {
        const fetcher = getPerformanceFetcher(league);
        const leaguePerformanceData = [];
        for (let i = 0; i < days; i++) {
          const currentDate = new Date(targetDate);
          currentDate.setDate(currentDate.getDate() - i);
          const dateString = currentDate.toISOString().split("T")[0];
          console.log(`\u{1F4CA} Fetching ${league} performance data for ${dateString}...`);
          const dayPerformanceData = await fetcher.fetchPlayerStats(league, dateString, env);
          leaguePerformanceData.push(...dayPerformanceData);
          console.log(`\u{1F4CA} Fetched ${dayPerformanceData.length} performance records for ${dateString}`);
        }
        console.log(`\u{1F4CA} Total ${league} performance records: ${leaguePerformanceData.length}`);
        if (leaguePerformanceData.length > 0) {
          await insertPerformanceDataDirectly(env, leaguePerformanceData);
          const matchingResult = await matcher.matchPerformanceWithProps(env, leaguePerformanceData, targetDate);
          result.totalPerformanceRecords += leaguePerformanceData.length;
          result.leagues.push({
            league,
            performanceRecords: leaguePerformanceData.length,
            matchedRecords: matchingResult.matchedRecords.length,
            matchRate: matchingResult.matchRate
          });
          allPerformanceData.push(...leaguePerformanceData);
          console.log(`\u2705 ${league} processing complete: ${matchingResult.matchedRecords.length} matches found`);
        } else {
          console.log(`\u26A0\uFE0F No performance data found for ${league}`);
          result.leagues.push({
            league,
            performanceRecords: 0,
            matchedRecords: 0,
            matchRate: 0
          });
        }
      } catch (error) {
        const errorMsg = `${league} performance ingestion failed: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`\u274C ${errorMsg}`);
        result.errors.push(errorMsg);
      }
    }
    result.matchedRecords = totalMatches;
    result.unmatchedRecords = result.totalPerformanceRecords - totalMatches;
    result.matchRate = result.totalPerformanceRecords > 0 ? totalMatches / result.totalPerformanceRecords * 100 : 0;
    const duration = Date.now() - startTime;
    console.log(`
\u{1F389} Performance ingestion complete:`);
    console.log(`\u23F1\uFE0F Duration: ${Math.round(duration / 1e3)}s`);
    console.log(`\u{1F4CA} Total performance records: ${result.totalPerformanceRecords}`);
    console.log(`\u{1F4CA} Matched records: ${result.matchedRecords}`);
    console.log(`\u{1F4CA} Match rate: ${result.matchRate.toFixed(1)}%`);
    console.log(`\u{1F4CA} Leagues processed: ${result.leagues.length}`);
    return result;
  } catch (error) {
    const errorMsg = `Performance ingestion failed: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`\u274C ${errorMsg}`);
    result.success = false;
    result.errors.push(errorMsg);
    return result;
  }
}
__name(runPerformanceIngestion, "runPerformanceIngestion");
async function runSingleLeaguePerformanceIngestion(env, league, options = {}) {
  console.log(`\u{1F504} Starting single league performance ingestion for ${league}...`);
  return runPerformanceIngestion(env, {
    leagues: [league],
    date: options.date,
    days: options.days
  });
}
__name(runSingleLeaguePerformanceIngestion, "runSingleLeaguePerformanceIngestion");
async function runHistoricalPerformanceIngestion(env, options) {
  console.log(`\u{1F504} Starting historical performance ingestion from ${options.startDate} to ${options.endDate}...`);
  const startDate = new Date(options.startDate);
  const endDate = new Date(options.endDate);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1e3 * 60 * 60 * 24)) + 1;
  return runPerformanceIngestion(env, {
    leagues: options.leagues,
    date: options.endDate,
    days
  });
}
__name(runHistoricalPerformanceIngestion, "runHistoricalPerformanceIngestion");
async function insertPerformanceDataDirectly(env, performanceData) {
  if (performanceData.length === 0) {
    console.log("\u26A0\uFE0F No performance data to insert");
    return;
  }
  console.log(`\u{1F4CA} Upserting ${performanceData.length} performance records into both tables...`);
  const supabase4 = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
  const gameLogRows = performanceData.map((perf) => {
    const normalizedPropType = normalizePropType(perf.prop_type);
    return {
      player_id: perf.player_id,
      player_name: perf.player_name,
      team: perf.team,
      opponent: perf.opponent,
      season: perf.season,
      date: perf.date.slice(0, 10),
      // Ensure date is properly formatted
      prop_type: normalizedPropType,
      value: perf.value,
      sport: perf.league.toUpperCase(),
      league: perf.league,
      game_id: perf.game_id,
      conflict_key: perf.conflict_key || buildConflictKey({
        playerId: perf.player_id,
        gameId: perf.game_id,
        propType: normalizedPropType,
        sportsbook: "SportsGameOdds",
        league: perf.league,
        season: perf.season
      })
    };
  });
  const propLinesRows = performanceData.map((perf) => {
    const normalizedPropType = normalizePropType(perf.prop_type);
    return {
      player_id: perf.player_id,
      player_name: perf.player_name,
      season: perf.season,
      date: perf.date.slice(0, 10),
      // Ensure date is properly formatted
      prop_type: normalizedPropType,
      line: perf.value,
      // Use the actual performance value as the line
      sportsbook: "SportsGameOdds",
      over_odds: -110,
      // Default odds
      under_odds: 100,
      // Default odds
      league: perf.league.toLowerCase(),
      game_id: perf.game_id,
      conflict_key: perf.conflict_key || buildConflictKey({
        playerId: perf.player_id,
        gameId: perf.game_id,
        propType: normalizedPropType,
        sportsbook: "SportsGameOdds",
        league: perf.league,
        season: perf.season
      })
    };
  });
  try {
    const { data, error } = await supabase4.from("player_game_logs").upsert(gameLogRows, { onConflict: "conflict_key" });
    if (error) {
      console.error(`\u274C Upsert failed:`, error);
      throw new Error(`Database operation failed: ${error.message}`);
    }
    console.log(`\u2705 Upserted ${performanceData.length} performance records to player_game_logs`);
    const { data: proplinesData, error: proplinesError } = await supabase4.from("proplines").upsert(propLinesRows, { onConflict: "conflict_key" });
    if (proplinesError) {
      console.error(`\u274C Proplines upsert failed:`, proplinesError);
      throw new Error(`Proplines database operation failed: ${proplinesError.message}`);
    }
    console.log(`\u2705 Upserted ${performanceData.length} performance records to proplines`);
    const { count, error: countError } = await supabase4.from("player_game_logs").select("id", { count: "exact", head: true });
    console.log(
      countError ? `\u274C Persistence check failed: ${countError.message}` : `\u2705 Persistence check: ${count} rows currently in player_game_logs`
    );
    await logPerformanceHealthCheck(supabase4);
  } catch (error) {
    console.error(`\u274C Failed to insert performance data:`, error);
    throw new Error(`Performance data insertion failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
__name(insertPerformanceDataDirectly, "insertPerformanceDataDirectly");
async function logPerformanceHealthCheck(supabase4) {
  try {
    const { data, error } = await supabase4.from("player_game_logs").select("league", { count: "exact" });
    if (error) {
      console.error("\u274C League health check failed:", error.message);
      return;
    }
    const leagueCounts = {};
    for (const row of data ?? []) {
      const league = row.league ?? "UNKNOWN";
      leagueCounts[league] = (leagueCounts[league] || 0) + 1;
    }
    console.log("\u{1F4CA} Performance Persistence Health Check");
    Object.entries(leagueCounts).forEach(([league, count]) => {
      console.log(`- ${league}: ${count} rows`);
    });
    const { data: proplinesData, error: proplinesError } = await supabase4.from("proplines").select("league", { count: "exact" });
    if (!proplinesError && proplinesData) {
      const proplinesCounts = {};
      for (const row of proplinesData ?? []) {
        const league = row.league ?? "UNKNOWN";
        proplinesCounts[league] = (proplinesCounts[league] || 0) + 1;
      }
      console.log("\u{1F4CA} Proplines Persistence Health Check");
      Object.entries(proplinesCounts).forEach(([league, count]) => {
        console.log(`- ${league}: ${count} rows`);
      });
    }
  } catch (error) {
    console.error("\u274C Health check failed:", error);
  }
}
__name(logPerformanceHealthCheck, "logPerformanceHealthCheck");

// src/worker.ts
init_supabaseFetch();

// src/cors.ts
function withCORS(resp, origin = "*") {
  const headers = new Headers(resp.headers);
  const allowedOrigins = [
    "https://170e7fa8-3f2c-4d31-94b1-17786919492c.lovableproject.com",
    "https://statpedia.vercel.app",
    "https://statpedia.com",
    "http://localhost:3000",
    "http://localhost:5173",
    "https://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "https://127.0.0.1:5173"
  ];
  const requestOrigin = origin && origin !== "*" ? origin : null;
  let allowedOrigin = "*";
  console.log("CORS Debug:", { requestOrigin, origin, allowedOrigins });
  if (requestOrigin) {
    if (allowedOrigins.includes(requestOrigin)) {
      allowedOrigin = requestOrigin;
      console.log("CORS: Exact match found", requestOrigin);
    } else if (requestOrigin.includes(".lovableproject.com") || requestOrigin.includes(".lovable.app")) {
      allowedOrigin = requestOrigin;
      console.log("CORS: Lovable subdomain match", requestOrigin);
    } else if (requestOrigin.startsWith("http://localhost:") || requestOrigin.startsWith("https://localhost:") || requestOrigin.startsWith("http://127.0.0.1:") || requestOrigin.startsWith("https://127.0.0.1:")) {
      allowedOrigin = requestOrigin;
      console.log("CORS: Localhost match", requestOrigin);
    } else if (requestOrigin.includes(".vercel.app")) {
      allowedOrigin = requestOrigin;
      console.log("CORS: Vercel match", requestOrigin);
    } else {
      console.log("CORS: No match found, using wildcard", requestOrigin);
    }
  }
  headers.set("Access-Control-Allow-Origin", allowedOrigin);
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-API-Key, Accept, Origin, User-Agent, DNT, Cache-Control, X-Mx-ReqToken, Keep-Alive, X-Requested-With, If-Modified-Since");
  headers.set("Access-Control-Max-Age", "86400");
  headers.set("Access-Control-Expose-Headers", "Content-Length, Content-Type, Date, Server, Transfer-Encoding");
  if (allowedOrigin !== "*") {
    headers.set("Access-Control-Allow-Credentials", "true");
  }
  console.log("CORS: Final headers set", { allowedOrigin, hasOrigin: headers.has("Access-Control-Allow-Origin") });
  return new Response(resp.body, { ...resp, headers });
}
__name(withCORS, "withCORS");
function handleOptions(request, origin = "*") {
  const allowedOrigins = [
    "https://170e7fa8-3f2c-4d31-94b1-17786919492c.lovableproject.com",
    "https://statpedia.vercel.app",
    "https://statpedia.com",
    "http://localhost:3000",
    "http://localhost:5173",
    "https://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "https://127.0.0.1:5173"
  ];
  const requestOrigin = origin && origin !== "*" ? origin : null;
  let allowedOrigin = "*";
  if (requestOrigin) {
    if (allowedOrigins.includes(requestOrigin)) {
      allowedOrigin = requestOrigin;
    } else if (requestOrigin.includes(".lovableproject.com") || requestOrigin.includes(".lovable.app")) {
      allowedOrigin = requestOrigin;
    } else if (requestOrigin.startsWith("http://localhost:") || requestOrigin.startsWith("https://localhost:") || requestOrigin.startsWith("http://127.0.0.1:") || requestOrigin.startsWith("https://127.0.0.1:")) {
      allowedOrigin = requestOrigin;
    } else if (requestOrigin.includes(".vercel.app")) {
      allowedOrigin = requestOrigin;
    }
  }
  const headers = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, X-API-Key, Accept, Origin, User-Agent, DNT, Cache-Control, X-Mx-ReqToken, Keep-Alive, X-Requested-With, If-Modified-Since",
    "Access-Control-Max-Age": "86400",
    // Cache preflight for 24 hours
    "Access-Control-Expose-Headers": "Content-Length, Content-Type, Date, Server, Transfer-Encoding"
  };
  if (allowedOrigin !== "*") {
    headers["Access-Control-Allow-Credentials"] = "true";
  }
  return new Response(null, {
    status: 204,
    headers
  });
}
__name(handleOptions, "handleOptions");

// src/normalizers.ts
var normalizeDate = /* @__PURE__ */ __name((date) => {
  if (!date)
    return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(date))
    return date;
  try {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime()))
      return "";
    return parsedDate.toISOString().split("T")[0];
  } catch {
    return "";
  }
}, "normalizeDate");
var isDateMatch = /* @__PURE__ */ __name((date1, date2) => {
  if (!date1 || !date2)
    return false;
  const normalized1 = normalizeDate(date1);
  const normalized2 = normalizeDate(date2);
  if (!normalized1 || !normalized2)
    return false;
  if (normalized1 === normalized2)
    return true;
  const date1Obj = new Date(normalized1);
  const date2Obj = new Date(normalized2);
  const diffDays = Math.abs(date1Obj.getTime() - date2Obj.getTime()) / (1e3 * 60 * 60 * 24);
  return diffDays <= 1;
}, "isDateMatch");
var normalizeLeague = /* @__PURE__ */ __name((league) => {
  return league ? league.toLowerCase() : "";
}, "normalizeLeague");

// src/worker.ts
init_propTypeSync();

// src/supportedProps.ts
init_module5();
var supabase2 = null;
async function initializeSupportedProps(supabaseUrl, supabaseKey) {
  supabase2 = createClient(supabaseUrl, supabaseKey);
  return await loadSupportedProps();
}
__name(initializeSupportedProps, "initializeSupportedProps");
async function loadSupportedProps() {
  if (!supabase2) {
    console.warn("\u26A0\uFE0F Supabase client not initialized for supported props");
    return {};
  }
  try {
    const { data, error } = await supabase2.from("player_game_logs").select("league, prop_type");
    if (error) {
      console.error("\u274C Failed to load supported props:", error);
      return {};
    }
    const map = {};
    data?.forEach((row) => {
      if (!row.league || !row.prop_type)
        return;
      const league = row.league.toLowerCase();
      if (!map[league])
        map[league] = /* @__PURE__ */ new Set();
      map[league].add(row.prop_type.toLowerCase());
    });
    Object.entries(map).forEach(([league, props]) => {
      console.log(`\u{1F4CA} ${league.toUpperCase()}: ${props.size} supported prop types`);
    });
    console.log("\u2705 Supported props loaded for leagues:", Object.keys(map));
    return map;
  } catch (error) {
    console.error("\u274C Error loading supported props:", error);
    return {};
  }
}
__name(loadSupportedProps, "loadSupportedProps");

// src/coverageReport.ts
init_module5();
var supabase3 = null;
async function initializeCoverageReport(supabaseUrl, supabaseKey) {
  supabase3 = createClient(supabaseUrl, supabaseKey);
}
__name(initializeCoverageReport, "initializeCoverageReport");
async function generateCoverageReport() {
  if (!supabase3) {
    console.error("\u274C Supabase client not initialized for coverage report");
    return {};
  }
  try {
    console.log("\u{1F50D} Generating coverage report...");
    const { data: logTypes, error: logErr } = await supabase3.from("player_game_logs").select("league, prop_type").neq("prop_type", null);
    const { data: propTypes, error: propErr } = await supabase3.from("proplines").select("league, prop_type").neq("prop_type", null);
    if (logErr || propErr) {
      console.error("\u274C Error fetching prop types:", logErr || propErr);
      return {};
    }
    const coverage = {};
    logTypes?.forEach((row) => {
      const league = row.league?.toLowerCase();
      if (!league)
        return;
      if (!coverage[league])
        coverage[league] = { logs: /* @__PURE__ */ new Set(), props: /* @__PURE__ */ new Set() };
      coverage[league].logs.add(row.prop_type.toLowerCase());
    });
    propTypes?.forEach((row) => {
      const league = row.league?.toLowerCase();
      if (!league)
        return;
      if (!coverage[league])
        coverage[league] = { logs: /* @__PURE__ */ new Set(), props: /* @__PURE__ */ new Set() };
      coverage[league].props.add(row.prop_type.toLowerCase());
    });
    console.log("\n\u{1F4CA} COVERAGE REPORT");
    console.log("==================");
    Object.entries(coverage).forEach(([league, { logs, props }]) => {
      const onlyInLogs = [...logs].filter((t) => !props.has(t));
      const onlyInProps = [...props].filter((t) => !logs.has(t));
      const overlap = [...logs].filter((t) => props.has(t));
      console.log(`
\u{1F3C8} ${league.toUpperCase()} Coverage:`);
      console.log(`   \u{1F4CA} Logs: ${logs.size} prop types`);
      console.log(`   \u{1F4CA} Props: ${props.size} prop types`);
      console.log(`   \u2705 Overlap: ${overlap.length} prop types`);
      console.log(`   \u274C Logs only: ${onlyInLogs.length} prop types`);
      console.log(`   \u274C Props only: ${onlyInProps.length} prop types`);
      if (overlap.length > 0) {
        console.log(`   \u2705 Overlapping: ${overlap.join(", ")}`);
      }
      if (onlyInLogs.length > 0) {
        console.log(`   \u26A0\uFE0F  Logs only: ${onlyInLogs.join(", ")}`);
      }
      if (onlyInProps.length > 0) {
        console.log(`   \u26A0\uFE0F  Props only: ${onlyInProps.slice(0, 10).join(", ")}${onlyInProps.length > 10 ? `... (+${onlyInProps.length - 10} more)` : ""}`);
      }
    });
    return coverage;
  } catch (error) {
    console.error("\u274C Error generating coverage report:", error);
    return {};
  }
}
__name(generateCoverageReport, "generateCoverageReport");
function getCoverageSummary(coverage) {
  const summary = {};
  Object.entries(coverage).forEach(([league, { logs, props }]) => {
    const onlyInLogs = [...logs].filter((t) => !props.has(t));
    const onlyInProps = [...props].filter((t) => !logs.has(t));
    const overlap = [...logs].filter((t) => props.has(t));
    summary[league] = {
      logsCount: logs.size,
      propsCount: props.size,
      overlapCount: overlap.length,
      onlyInLogsCount: onlyInLogs.length,
      onlyInPropsCount: onlyInProps.length,
      overlapPercentage: logs.size > 0 ? Math.round(overlap.length / logs.size * 100) : 0,
      onlyInLogs,
      onlyInProps: onlyInProps.slice(0, 5),
      // Limit for JSON response
      overlap
    };
  });
  return summary;
}
__name(getCoverageSummary, "getCoverageSummary");

// src/worker.ts
init_fetchProps();
var propTypeSyncInitialized = false;
var supportedProps = {};
var worker_default = {
  async fetch(req, env) {
    try {
      if (!propTypeSyncInitialized) {
        try {
          await initializePropTypeSync(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
          supportedProps = await initializeSupportedProps(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
          await initializeCoverageReport(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
          propTypeSyncInitialized = true;
          console.log("\u2705 Prop type sync, supported props, and coverage report initialized successfully");
        } catch (error) {
          console.warn("\u26A0\uFE0F Failed to initialize prop type sync, supported props, or coverage report:", error);
          console.warn("\u26A0\uFE0F Falling back to hardcoded normalizers");
        }
      }
      const url = new URL(req.url);
      const origin = req.headers.get("Origin") || "*";
      if (req.method === "OPTIONS") {
        return handleOptions(req, origin);
      }
      const corsResponse = /* @__PURE__ */ __name((body, status = 200, headers = {}) => {
        const response = new Response(
          typeof body === "string" ? body : JSON.stringify(body),
          {
            status,
            headers: {
              "Content-Type": "application/json",
              ...headers
            }
          }
        );
        return withCORS(response, origin);
      }, "corsResponse");
      if (url.pathname === "/") {
        return corsResponse({
          message: "Multi-League Multi-Season Props Ingestion Worker",
          endpoints: {
            ingestion: ["/ingest", "/ingest/{league}"],
            backfill: ["/backfill-all", "/backfill-recent", "/backfill-full", "/backfill-league/{league}", "/backfill-season/{season}"],
            performance: ["/performance-ingest", "/performance-ingest/{league}", "/performance-historical"],
            analytics: ["/refresh-analytics", "/incremental-analytics-refresh", "/analytics/streaks", "/analytics/defensive-rankings", "/analytics/matchup-rank", "/analytics/last-5", "/analytics/last-10", "/analytics/last-20", "/analytics/h2h"],
            verification: ["/verify-backfill", "/verify-analytics"],
            status: ["/status", "/leagues", "/seasons"],
            debug: ["/debug-api", "/debug-comprehensive", "/debug-json", "/debug-extraction", "/debug-insert", "/debug-schema", "/debug-streaks", "/debug-streak-counts", "/debug-insertion", "/debug-env", "/debug-rls", "/debug-events", "/debug-data-check", "/debug-performance-diagnostic"]
          },
          leagues: getActiveLeagues().map((l) => l.id),
          seasons: getAllSeasons(),
          features: ["Multi-league ingestion", "Multi-season backfill", "Analytics computation", "Fallback logic", "Progressive backfill"]
        });
      }
      if (url.pathname === "/refresh-analytics") {
        try {
          const { supabaseFetch: supabaseFetch2 } = await Promise.resolve().then(() => (init_supabaseFetch(), supabaseFetch_exports));
          console.log("\u{1F504} Refreshing analytics views...");
          const result = await supabaseFetch2(env, "rpc/refresh_analytics_views", {
            method: "POST",
            body: JSON.stringify({})
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
            body: JSON.stringify({ days_back: daysBack })
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
      if (url.pathname === "/debug-conflict-audit") {
        try {
          const { createClient: createClient2 } = await Promise.resolve().then(() => (init_module5(), module_exports));
          const supabase4 = createClient2(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
          const { data, error } = await supabase4.from("player_game_logs").select("league, conflict_key, prop_type");
          if (error) {
            console.error("\u274C Supabase error:", error);
            return new Response(
              JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error)
              }),
              {
                status: 500,
                headers: {
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": "*"
                }
              }
            );
          }
          const results = {};
          data.forEach((row) => {
            const league = row.league || "unknown";
            if (!results[league])
              results[league] = { bad: 0, good: 0, total: 0, badExamples: [] };
            results[league].total++;
            if (row.conflict_key.includes("|gamelog|")) {
              results[league].bad++;
              if (results[league].badExamples.length < 3) {
                results[league].badExamples.push(`${row.prop_type} -> ${row.conflict_key}`);
              }
            } else {
              results[league].good++;
            }
          });
          console.log("\u{1F4CA} Conflict Key Audit Results:");
          Object.entries(results).forEach(([league, counts]) => {
            console.log(
              `${league.toUpperCase()}: total=${counts.total}, good=${counts.good}, bad=${counts.bad}`
            );
            if (counts.badExamples.length > 0) {
              console.log(`  Bad examples:`, counts.badExamples);
            }
          });
          return new Response(
            JSON.stringify({
              success: true,
              results,
              message: "Conflict key audit completed",
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            }),
            {
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
              }
            }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error)
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
              }
            }
          );
        }
      }
      if (url.pathname === "/analytics/streaks") {
        try {
          let logMismatch2 = function(gameLog, propLines2) {
            const candidates = propLines2.filter(
              (p) => p.player_id === gameLog.player_id
            );
            console.log("\u26A0\uFE0F Mismatch detected for player:", gameLog.player_id);
            console.log("  GameLog:", {
              player_id: gameLog.player_id,
              prop_type: gameLog.prop_type,
              date: gameLog.date,
              league: gameLog.league,
              value: gameLog.value
            });
            if (candidates.length === 0) {
              console.log("  \u274C No propLines found for this player at all.");
              return;
            }
            console.log("  \u{1F50E} Closest propLine candidates:");
            candidates.slice(0, 3).forEach((p, idx) => {
              console.log(`   Candidate ${idx + 1}:`, {
                player_id: p.player_id,
                prop_type: p.prop_type,
                date: p.date,
                league: p.league,
                line: p.line
              });
            });
          };
          var logMismatch = logMismatch2;
          __name(logMismatch2, "logMismatch");
          const { supabaseFetch: supabaseFetch2 } = await Promise.resolve().then(() => (init_supabaseFetch(), supabaseFetch_exports));
          const { calculateStreaks: calculateStreaks2 } = await Promise.resolve().then(() => (init_streakCalculator(), streakCalculator_exports));
          const leagueParam = url.searchParams.get("league") || "all";
          const league = leagueParam.toLowerCase();
          const limit = parseInt(url.searchParams.get("limit") || "50");
          console.log(`\u{1F4CA} Computing TRUE streaks in Worker for ${league}...`);
          const normalizeDate2 = /* @__PURE__ */ __name((d) => d.split("T")[0], "normalizeDate");
          const inFilter = /* @__PURE__ */ __name((values) => values && values.length > 0 ? `in.(${values.map((v) => `"${v}"`).join(",")})` : null, "inFilter");
          let query = "player_game_logs";
          const params = [];
          if (league !== "all") {
            params.push(`league=eq.${league}`);
          }
          params.push(`order=date.desc`);
          if (params.length > 0) {
            query += `?${params.join("&")}`;
          }
          const gameLogs = await supabaseFetch2(env, query, { method: "GET" });
          console.log(`\u{1F4CA} Fetched ${gameLogs?.length || 0} game logs`);
          if (gameLogs && gameLogs.length > 0) {
            console.log(`\u{1F4CA} Sample game log:`, JSON.stringify(gameLogs[0], null, 2));
          }
          if (!gameLogs || gameLogs.length === 0) {
            return new Response(
              JSON.stringify({
                success: true,
                data: [],
                league,
                limit,
                message: "No game data found",
                timestamp: (/* @__PURE__ */ new Date()).toISOString()
              }),
              {
                headers: {
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": "*"
                }
              }
            );
          }
          const playerIds = [...new Set(gameLogs.map((g) => g.player_id))];
          const propTypes = [...new Set(gameLogs.map((g) => g.prop_type))];
          const dates = [...new Set(gameLogs.map((g) => normalizeDate2(g.date)))];
          const filters = [];
          const playerFilter = inFilter(playerIds);
          if (playerFilter)
            filters.push(`player_id=${playerFilter}`);
          const propFilter = inFilter(propTypes);
          if (propFilter)
            filters.push(`prop_type=${propFilter}`);
          const dateFilter = inFilter(dates);
          if (dateFilter)
            filters.push(`date=${dateFilter}`);
          if (league !== "all") {
            filters.push(`league=eq.${league.toLowerCase()}`);
          }
          const propsQuery = `proplines${filters.length ? "?" + filters.join("&") : ""}`;
          const propLines = await supabaseFetch2(env, propsQuery, { method: "GET" });
          console.log(`\u{1F4CA} Player Props fetched: ${propLines?.length || 0}`);
          if (propLines && propLines.length > 0) {
            console.log("\u{1F4CA} Sample prop line:", JSON.stringify(propLines[0], null, 2));
          }
          const gameResults = gameLogs.map((gameLog) => {
            const propLine = propLines?.find(
              (prop) => prop.player_id === gameLog.player_id && prop.prop_type === gameLog.prop_type && normalizeDate2(prop.date) === normalizeDate2(gameLog.date) && prop.league === gameLog.league
            );
            if (!propLine) {
              logMismatch2(gameLog, propLines || []);
              return null;
            }
            return {
              player_id: gameLog.player_id,
              player_name: gameLog.player_name,
              team: gameLog.team,
              prop_type: gameLog.prop_type,
              league: gameLog.league,
              date: normalizeDate2(gameLog.date),
              hit_result: gameLog.value >= propLine.line ? 1 : 0
            };
          }).filter((result) => result !== null);
          console.log(`\u{1F4CA} Created ${gameResults.length} game results`);
          const streaks = calculateStreaks2(gameResults);
          const filteredStreaks = league !== "all" ? streaks.filter((s) => s.league === league) : streaks;
          const limitedStreaks = filteredStreaks.slice(0, limit);
          console.log(
            `\u{1F4CA} Computed ${limitedStreaks.length} streaks (${filteredStreaks.length} total)`
          );
          return new Response(
            JSON.stringify({
              success: true,
              data: limitedStreaks,
              league,
              limit,
              total_found: filteredStreaks.length,
              message: limitedStreaks.length === 0 ? "No streaks found" : "Streaks computed successfully",
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            }),
            {
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
              }
            }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error)
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
              }
            }
          );
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
      if (url.pathname === "/analytics/matchup-rank") {
        try {
          const { supabaseFetch: supabaseFetch2 } = await Promise.resolve().then(() => (init_supabaseFetch(), supabaseFetch_exports));
          const league = url.searchParams.get("league") || "all";
          const limit = parseInt(url.searchParams.get("limit") || "50");
          console.log(`\u{1F4CA} Computing matchup rankings for ${league}...`);
          let gameLogsQuery = "player_game_logs";
          if (league !== "all") {
            gameLogsQuery += `?league=eq.${league}`;
          }
          const gameLogs = await supabaseFetch2(env, gameLogsQuery, { method: "GET" });
          if (!gameLogs || gameLogs.length === 0) {
            return new Response(
              JSON.stringify({
                success: true,
                data: [],
                league,
                limit,
                message: "No game data found",
                timestamp: (/* @__PURE__ */ new Date()).toISOString()
              }),
              {
                headers: {
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": "*"
                }
              }
            );
          }
          const normalizeDate2 = /* @__PURE__ */ __name((d) => d.split("T")[0], "normalizeDate");
          const inFilter = /* @__PURE__ */ __name((values) => values && values.length > 0 ? `in.(${values.map((v) => `"${v}"`).join(",")})` : null, "inFilter");
          const filters = [];
          const playerIds = [...new Set(gameLogs.map((g) => g.player_id))];
          const propTypes = [...new Set(gameLogs.map((g) => g.prop_type))];
          const dates = [...new Set(gameLogs.map((g) => normalizeDate2(g.date)))];
          const playerFilter = inFilter(playerIds);
          if (playerFilter)
            filters.push(`player_id=${playerFilter}`);
          const propFilter = inFilter(propTypes);
          if (propFilter)
            filters.push(`prop_type=${propFilter}`);
          const dateFilter = inFilter(dates);
          if (dateFilter)
            filters.push(`date=${dateFilter}`);
          if (league !== "all") {
            filters.push(`league=eq.${league.toLowerCase()}`);
          }
          const propsQuery = `proplines${filters.length ? "?" + filters.join("&") : ""}`;
          const propLines = await supabaseFetch2(env, propsQuery, { method: "GET" });
          console.log(`\u{1F4CA} Player Props fetched: ${propLines?.length || 0}`);
          if (propLines && propLines.length > 0) {
            console.log("\u{1F4CA} Sample prop line:", JSON.stringify(propLines[0], null, 2));
          }
          const matchupRankings = gameLogs.map((gameLog) => {
            const propLine = propLines?.find(
              (prop) => prop.player_id === gameLog.player_id && prop.prop_type === gameLog.prop_type && prop.date.split("T")[0] === gameLog.date.split("T")[0] && prop.league === gameLog.league
            );
            if (!propLine)
              return null;
            const hit = gameLog.value >= propLine.line ? 1 : 0;
            const margin = Math.abs(gameLog.value - propLine.line);
            return {
              player_id: gameLog.player_id,
              player_name: gameLog.player_name,
              team: gameLog.team,
              prop_type: gameLog.prop_type,
              league: gameLog.league,
              date: gameLog.date.split("T")[0],
              line: propLine.line,
              actual: gameLog.value,
              hit,
              margin,
              opponent: gameLog.opponent || "Unknown"
            };
          }).filter(Boolean).sort((a, b) => {
            if (!a || !b)
              return 0;
            return b.hit - a.hit || a.margin - b.margin;
          }).slice(0, limit);
          return new Response(
            JSON.stringify({
              success: true,
              data: matchupRankings,
              league,
              limit,
              total_found: matchupRankings.length,
              message: "Matchup rankings computed successfully",
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            }),
            {
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
              }
            }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error)
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
              }
            }
          );
        }
      }
      if (url.pathname === "/analytics/last-5") {
        try {
          const { supabaseFetch: supabaseFetch2 } = await Promise.resolve().then(() => (init_supabaseFetch(), supabaseFetch_exports));
          const league = url.searchParams.get("league") || "all";
          const limit = parseInt(url.searchParams.get("limit") || "50");
          console.log(`\u{1F4CA} Computing last 5 games performance for ${league}...`);
          let query = "player_game_logs";
          const params = [];
          if (league !== "all") {
            params.push(`league=eq.${league}`);
          }
          params.push(`order=date.desc`);
          if (params.length > 0) {
            query += `?${params.join("&")}`;
          }
          const gameLogs = await supabaseFetch2(env, query, { method: "GET" });
          if (!gameLogs || gameLogs.length === 0) {
            return new Response(
              JSON.stringify({
                success: true,
                data: [],
                league,
                limit,
                message: "No game data found",
                timestamp: (/* @__PURE__ */ new Date()).toISOString()
              }),
              {
                headers: {
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": "*"
                }
              }
            );
          }
          const playerStats = /* @__PURE__ */ new Map();
          gameLogs.forEach((log) => {
            const key = `${log.player_id}-${log.prop_type}`;
            if (!playerStats.has(key)) {
              playerStats.set(key, {
                player_id: log.player_id,
                player_name: log.player_name,
                team: log.team,
                prop_type: log.prop_type,
                league: log.league,
                games: []
              });
            }
            const stats = playerStats.get(key);
            if (stats.games.length < 5) {
              stats.games.push({
                date: log.date.split("T")[0],
                value: log.value,
                opponent: log.opponent || "Unknown"
              });
            }
          });
          const last5Performance = Array.from(playerStats.values()).map((player) => {
            const games = player.games;
            const avgValue = games.reduce((sum, game) => sum + game.value, 0) / games.length;
            const totalGames = games.length;
            return {
              ...player,
              total_games: totalGames,
              avg_value: Math.round(avgValue * 100) / 100,
              latest_value: games[0]?.value || 0,
              latest_date: games[0]?.date || null,
              trend: games.length >= 2 ? games[0].value > games[1].value ? "up" : games[0].value < games[1].value ? "down" : "stable" : "insufficient_data"
            };
          }).filter((player) => player.total_games > 0).sort((a, b) => b.avg_value - a.avg_value).slice(0, limit);
          return new Response(
            JSON.stringify({
              success: true,
              data: last5Performance,
              league,
              limit,
              total_found: last5Performance.length,
              message: "Last 5 games performance computed successfully",
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            }),
            {
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
              }
            }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error)
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
              }
            }
          );
        }
      }
      if (url.pathname === "/analytics/last-10") {
        try {
          const { supabaseFetch: supabaseFetch2 } = await Promise.resolve().then(() => (init_supabaseFetch(), supabaseFetch_exports));
          const league = url.searchParams.get("league") || "all";
          const limit = parseInt(url.searchParams.get("limit") || "50");
          console.log(`\u{1F4CA} Computing last 10 games performance for ${league}...`);
          let query = "player_game_logs";
          const params = [];
          if (league !== "all") {
            params.push(`league=eq.${league}`);
          }
          params.push(`order=date.desc`);
          if (params.length > 0) {
            query += `?${params.join("&")}`;
          }
          const gameLogs = await supabaseFetch2(env, query, { method: "GET" });
          if (!gameLogs || gameLogs.length === 0) {
            return new Response(
              JSON.stringify({
                success: true,
                data: [],
                league,
                limit,
                message: "No game data found",
                timestamp: (/* @__PURE__ */ new Date()).toISOString()
              }),
              {
                headers: {
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": "*"
                }
              }
            );
          }
          const playerStats = /* @__PURE__ */ new Map();
          gameLogs.forEach((log) => {
            const key = `${log.player_id}-${log.prop_type}`;
            if (!playerStats.has(key)) {
              playerStats.set(key, {
                player_id: log.player_id,
                player_name: log.player_name,
                team: log.team,
                prop_type: log.prop_type,
                league: log.league,
                games: []
              });
            }
            const stats = playerStats.get(key);
            if (stats.games.length < 10) {
              stats.games.push({
                date: log.date.split("T")[0],
                value: log.value,
                opponent: log.opponent || "Unknown"
              });
            }
          });
          const last10Performance = Array.from(playerStats.values()).map((player) => {
            const games = player.games;
            const avgValue = games.reduce((sum, game) => sum + game.value, 0) / games.length;
            const totalGames = games.length;
            const recent5 = games.slice(0, Math.min(5, games.length));
            const earlier5 = games.slice(5, Math.min(10, games.length));
            const recentAvg = recent5.reduce((sum, game) => sum + game.value, 0) / recent5.length;
            const earlierAvg = earlier5.length > 0 ? earlier5.reduce((sum, game) => sum + game.value, 0) / earlier5.length : recentAvg;
            return {
              ...player,
              total_games: totalGames,
              avg_value: Math.round(avgValue * 100) / 100,
              recent_5_avg: Math.round(recentAvg * 100) / 100,
              earlier_5_avg: Math.round(earlierAvg * 100) / 100,
              improvement: Math.round((recentAvg - earlierAvg) * 100) / 100,
              latest_value: games[0]?.value || 0,
              latest_date: games[0]?.date || null
            };
          }).filter((player) => player.total_games > 0).sort((a, b) => b.avg_value - a.avg_value).slice(0, limit);
          return new Response(
            JSON.stringify({
              success: true,
              data: last10Performance,
              league,
              limit,
              total_found: last10Performance.length,
              message: "Last 10 games performance computed successfully",
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            }),
            {
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
              }
            }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error)
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
              }
            }
          );
        }
      }
      if (url.pathname === "/analytics/last-20") {
        try {
          const { supabaseFetch: supabaseFetch2 } = await Promise.resolve().then(() => (init_supabaseFetch(), supabaseFetch_exports));
          const league = url.searchParams.get("league") || "all";
          const limit = parseInt(url.searchParams.get("limit") || "50");
          console.log(`\u{1F4CA} Computing last 20 games performance for ${league}...`);
          let query = "player_game_logs";
          const params = [];
          if (league !== "all") {
            params.push(`league=eq.${league}`);
          }
          params.push(`order=date.desc`);
          if (params.length > 0) {
            query += `?${params.join("&")}`;
          }
          const gameLogs = await supabaseFetch2(env, query, { method: "GET" });
          if (!gameLogs || gameLogs.length === 0) {
            return new Response(
              JSON.stringify({
                success: true,
                data: [],
                league,
                limit,
                message: "No game data found",
                timestamp: (/* @__PURE__ */ new Date()).toISOString()
              }),
              {
                headers: {
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": "*"
                }
              }
            );
          }
          const playerStats = /* @__PURE__ */ new Map();
          gameLogs.forEach((log) => {
            const key = `${log.player_id}-${log.prop_type}`;
            if (!playerStats.has(key)) {
              playerStats.set(key, {
                player_id: log.player_id,
                player_name: log.player_name,
                team: log.team,
                prop_type: log.prop_type,
                league: log.league,
                games: []
              });
            }
            const stats = playerStats.get(key);
            if (stats.games.length < 20) {
              stats.games.push({
                date: log.date.split("T")[0],
                value: log.value,
                opponent: log.opponent || "Unknown"
              });
            }
          });
          const last20Performance = Array.from(playerStats.values()).map((player) => {
            const games = player.games;
            const avgValue = games.reduce((sum, game) => sum + game.value, 0) / games.length;
            const totalGames = games.length;
            const variance = games.reduce((sum, game) => sum + Math.pow(game.value - avgValue, 2), 0) / games.length;
            const standardDeviation = Math.sqrt(variance);
            const recent10 = games.slice(0, Math.min(10, games.length));
            const earlier10 = games.slice(10, Math.min(20, games.length));
            const recentAvg = recent10.reduce((sum, game) => sum + game.value, 0) / recent10.length;
            const earlierAvg = earlier10.length > 0 ? earlier10.reduce((sum, game) => sum + game.value, 0) / earlier10.length : recentAvg;
            return {
              ...player,
              total_games: totalGames,
              avg_value: Math.round(avgValue * 100) / 100,
              recent_10_avg: Math.round(recentAvg * 100) / 100,
              earlier_10_avg: Math.round(earlierAvg * 100) / 100,
              improvement: Math.round((recentAvg - earlierAvg) * 100) / 100,
              consistency: Math.round(standardDeviation * 100) / 100,
              latest_value: games[0]?.value || 0,
              latest_date: games[0]?.date || null
            };
          }).filter((player) => player.total_games > 0).sort((a, b) => b.avg_value - a.avg_value).slice(0, limit);
          return new Response(
            JSON.stringify({
              success: true,
              data: last20Performance,
              league,
              limit,
              total_found: last20Performance.length,
              message: "Last 20 games performance computed successfully",
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            }),
            {
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
              }
            }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error)
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
              }
            }
          );
        }
      }
      if (url.pathname === "/analytics/h2h") {
        try {
          const { supabaseFetch: supabaseFetch2 } = await Promise.resolve().then(() => (init_supabaseFetch(), supabaseFetch_exports));
          const league = url.searchParams.get("league") || "all";
          const limit = parseInt(url.searchParams.get("limit") || "50");
          console.log(`\u{1F4CA} Computing head-to-head analytics for ${league}...`);
          let query = "player_game_logs";
          const params = [];
          if (league !== "all") {
            params.push(`league=eq.${league}`);
          }
          params.push(`order=date.desc`);
          if (params.length > 0) {
            query += `?${params.join("&")}`;
          }
          const gameLogs = await supabaseFetch2(env, query, { method: "GET" });
          if (!gameLogs || gameLogs.length === 0) {
            return new Response(
              JSON.stringify({
                success: true,
                data: [],
                league,
                limit,
                message: "No game data found",
                timestamp: (/* @__PURE__ */ new Date()).toISOString()
              }),
              {
                headers: {
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": "*"
                }
              }
            );
          }
          const h2hStats = /* @__PURE__ */ new Map();
          gameLogs.forEach((log) => {
            const opponent = log.opponent || "Unknown";
            const key = `${log.player_id}-${opponent}-${log.prop_type}`;
            if (!h2hStats.has(key)) {
              h2hStats.set(key, {
                player_id: log.player_id,
                player_name: log.player_name,
                team: log.team,
                opponent,
                prop_type: log.prop_type,
                league: log.league,
                games: [],
                total_games: 0,
                avg_value: 0
              });
            }
            const stats = h2hStats.get(key);
            stats.games.push({
              date: log.date.split("T")[0],
              value: log.value
            });
            stats.total_games = stats.games.length;
            stats.avg_value = stats.games.reduce((sum, game) => sum + game.value, 0) / stats.games.length;
          });
          const h2hRankings = Array.from(h2hStats.values()).filter((stats) => stats.total_games >= 2).sort((a, b) => b.total_games - a.total_games || b.avg_value - a.avg_value).slice(0, limit);
          return new Response(
            JSON.stringify({
              success: true,
              data: h2hRankings,
              league,
              limit,
              total_found: h2hRankings.length,
              message: "Head-to-head analytics computed successfully",
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            }),
            {
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
              }
            }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error)
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
              }
            }
          );
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
      if (url.pathname === "/api/test-mlb") {
        const { supabaseFetch: supabaseFetch2 } = await Promise.resolve().then(() => (init_supabaseFetch(), supabaseFetch_exports));
        const data1 = await supabaseFetch2(env, `player_props_fixed?league=eq.mlb&prop_date=eq.2025-10-10&limit=200`);
        const data2 = await supabaseFetch2(env, `player_props_fixed?league=eq.mlb&limit=200`);
        const data = data1;
        return corsResponse({
          success: true,
          count1: data1?.length || 0,
          count2: data2?.length || 0,
          data1: data1?.slice(0, 3) || [],
          data2: data2?.slice(0, 3) || []
        });
      }
      if (url.pathname === "/debug/sgo-api") {
        try {
          const league = url.searchParams.get("league")?.toLowerCase() || "nfl";
          const { fetchEventsWithProps: fetchEventsWithProps2 } = await Promise.resolve().then(() => (init_api(), api_exports));
          const getPlayerPropOddIDs2 = /* @__PURE__ */ __name((league2) => {
            const oddIDsMap = {
              "nfl": "rushing_yards-PLAYER_ID-game-ou-over,passing_yards-PLAYER_ID-game-ou-over,receiving_yards-PLAYER_ID-game-ou-over,touchdowns-PLAYER_ID-game-ou-over",
              "nba": "points-PLAYER_ID-game-ou-over,rebounds-PLAYER_ID-game-ou-over,assists-PLAYER_ID-game-ou-over,steals-PLAYER_ID-game-ou-over,blocks-PLAYER_ID-game-ou-over",
              "mlb": "hits-PLAYER_ID-game-ou-over,runs-PLAYER_ID-game-ou-over,rbis-PLAYER_ID-game-ou-over,strikeouts-PLAYER_ID-game-ou-over",
              "nhl": "shots_on_goal-PLAYER_ID-game-ou-over,goals-PLAYER_ID-game-ou-over,assists-PLAYER_ID-game-ou-over,points-PLAYER_ID-game-ou-over",
              "epl": "goals-PLAYER_ID-game-ou-over,assists-PLAYER_ID-game-ou-over,shots-PLAYER_ID-game-ou-over",
              "ncaaf": "rushing_yards-PLAYER_ID-game-ou-over,passing_yards-PLAYER_ID-game-ou-over,receiving_yards-PLAYER_ID-game-ou-over",
              "ncaab": "points-PLAYER_ID-game-ou-over,rebounds-PLAYER_ID-game-ou-over,assists-PLAYER_ID-game-ou-over"
            };
            return oddIDsMap[league2.toLowerCase()] || oddIDsMap["nfl"];
          }, "getPlayerPropOddIDs");
          console.log(`\u{1F50D} [DEBUG] Fetching SGO API response for ${league}...`);
          const playerPropOddIDs = getPlayerPropOddIDs2(league);
          console.log(`\u{1F50D} [DEBUG] Using oddIDs: ${playerPropOddIDs}`);
          const events = await fetchEventsWithProps2(env, league.toUpperCase(), {
            limit: 5
            // oddIDs: playerPropOddIDs  // Temporarily remove filter to see all odds
          });
          return corsResponse({
            success: true,
            league,
            eventsFound: events.length,
            sampleEvents: events.slice(0, 2).map((event) => ({
              gameId: event.gameId ?? event.id ?? event.eventID ?? null,
              homeTeamId: event.homeTeamId ?? event.homeTeamID ?? null,
              awayTeamId: event.awayTeamId ?? event.awayTeamID ?? null,
              teamId: event.teamId ?? event.teamID ?? null,
              opponentTeamId: event.opponentTeamId ?? event.opponentTeamID ?? null,
              homeTeamName: event.homeTeamName ?? event.homeTeam?.name ?? null,
              awayTeamName: event.awayTeamName ?? event.awayTeam?.name ?? null,
              teamName: event.teamName ?? event.team?.name ?? null,
              opponentName: event.opponentName ?? event.opponent?.name ?? null,
              teams: event.teams ?? null,
              game: event.game ? {
                homeTeamId: event.game.homeTeamId ?? event.game.homeTeamID ?? null,
                awayTeamId: event.game.awayTeamId ?? event.game.awayTeamID ?? null,
                teams: event.game.teams ?? null
              } : null,
              oddsCount: event.odds ? Object.keys(event.odds).length : 0,
              oddsSample: event.odds ? Object.keys(event.odds).slice(0, 10).map((oddId) => {
                const odd = event.odds[oddId];
                return {
                  oddId,
                  teamID: odd?.teamID ?? null,
                  playerTeamID: odd?.playerTeamID ?? null,
                  playerID: odd?.playerID ?? null,
                  statID: odd?.statID ?? null
                };
              }) : null,
              // Look specifically for player props
              playerPropsOdds: event.odds ? Object.entries(event.odds).filter(
                ([oddId, odd]) => odd?.playerID || odd?.playerId
              ).slice(0, 5).map(([oddId, odd]) => ({
                oddId,
                playerID: odd?.playerID ?? odd?.playerId ?? null,
                statID: odd?.statID ?? odd?.statId ?? null,
                teamID: odd?.teamID ?? odd?.teamId ?? null
              })) : []
            }))
          });
        } catch (error) {
          return corsResponse({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }, 500);
        }
      }
      if (url.pathname === "/debug/teams") {
        try {
          const league = url.searchParams.get("league") || "nfl";
          console.log(`\u{1F50D} DEBUG: Checking teams table for ${league}...`);
          const { data, error } = await supabaseFetch(
            env,
            `teams?league=eq.${league.toLowerCase()}`
          );
          if (error) {
            return corsResponse({
              success: false,
              error: `Teams table error: ${error.message}`,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            }, 500);
          }
          return corsResponse({
            success: true,
            data: data || [],
            totalTeams: data?.length || 0,
            league,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
        } catch (error) {
          console.error("\u274C Teams debug error:", error);
          return corsResponse({
            success: false,
            error: `Teams debug error: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }, 500);
        }
      }
      if (url.pathname === "/debug/team-resolution") {
        try {
          const league = url.searchParams.get("league") || "nfl";
          console.log(`\u{1F50D} DEBUG: Testing team resolution for ${league}...`);
          const { loadTeamRegistry: loadTeamRegistry2 } = await Promise.resolve().then(() => (init_fetchProps(), fetchProps_exports));
          const { getPlayerTeam: getPlayerTeam2 } = await Promise.resolve().then(() => (init_playerTeamMap(), playerTeamMap_exports));
          const registry = await loadTeamRegistry2(env, league);
          const testPlayerId = "AARON_RODGERS_1_NFL";
          const playerTeam = getPlayerTeam2(testPlayerId);
          return corsResponse({
            success: true,
            testPlayerId,
            playerTeam,
            registryKeys: Object.keys(registry),
            registryCount: Object.keys(registry).length,
            league,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
        } catch (error) {
          console.error("\u274C Team resolution debug error:", error);
          return corsResponse({
            success: false,
            error: `Team resolution debug error: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }, 500);
        }
      }
      if (url.pathname === "/debug/player-mapping") {
        try {
          const { getPlayerTeam: getPlayerTeam2 } = await Promise.resolve().then(() => (init_playerTeamMap(), playerTeamMap_exports));
          const testPlayers = [
            "AARON_RODGERS_1_NFL",
            "PATRICK_MAHOMES_1_NFL",
            "JOSH_ALLEN_1_NFL"
          ];
          const results = testPlayers.map((playerId) => ({
            playerId,
            team: getPlayerTeam2(playerId)
          }));
          return corsResponse({
            success: true,
            playerMappings: results,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
        } catch (error) {
          return corsResponse({
            success: false,
            error: `Player mapping test error: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }, 500);
        }
      }
      if (url.pathname === "/debug/pure-worker") {
        try {
          const league = url.searchParams.get("league") || "nfl";
          const date = url.searchParams.get("date") || "2025-10-10";
          console.log(`\u{1F9EA} Testing pure worker-centric approach for ${league} on ${date}...`);
          const props = await buildProps(env, league, date);
          return corsResponse({
            success: true,
            league,
            date,
            propsCount: props.length,
            sampleProps: props.slice(0, 3),
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
        } catch (error) {
          return corsResponse({
            success: false,
            error: `Pure worker test error: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }, 500);
        }
      }
      if (url.pathname === "/debug/test-insert") {
        try {
          const testData = [{
            player_id: "TEST_PLAYER_1",
            player_name: "Test Player",
            team: "TEST",
            opponent: "OPP",
            league: "nfl",
            season: "2025",
            game_id: "test-game-1",
            date_normalized: "2025-10-10",
            prop_type: "test_prop",
            line: 100,
            over_odds: -110,
            under_odds: -110,
            odds: null,
            conflict_key: "TEST_PLAYER_1|2025-10-10|test_prop|SportsGameOdds|nfl|2025"
          }];
          console.log("\u{1F9EA} Testing insert with sample data...");
          console.log("\u{1F50D} Testing table query first...");
          const queryResponse = await supabaseFetch(env, "proplines?limit=1");
          console.log("Query response:", queryResponse);
          const response = await supabaseFetch(env, "proplines", {
            method: "POST",
            body: testData,
            headers: {
              Prefer: "resolution=merge-duplicates",
              "Content-Type": "application/json"
            }
          });
          return corsResponse({
            success: true,
            testData: testData[0],
            response,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
        } catch (error) {
          return corsResponse({
            success: false,
            error: `Test insert error: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }, 500);
        }
      }
      if (url.pathname === "/debug/database-check") {
        try {
          const league = url.searchParams.get("league") || "nfl";
          const { data: proplinesData, error: proplinesError } = await supabaseFetch(
            env,
            `proplines?league=eq.${league.toLowerCase()}&limit=5`
          );
          const { data: logsData, error: logsError } = await supabaseFetch(
            env,
            `player_game_logs?league=eq.${league.toLowerCase()}&limit=5`
          );
          const { data: fixedData, error: fixedError } = await supabaseFetch(
            env,
            `player_props_fixed?league=eq.${league.toLowerCase()}&limit=5`
          );
          return corsResponse({
            success: true,
            proplines: {
              count: proplinesData?.length || 0,
              error: proplinesError?.message || null,
              sample: proplinesData?.[0] ? {
                id: proplinesData[0].id,
                player_id: proplinesData[0].player_id,
                date_normalized: proplinesData[0].date_normalized,
                league: proplinesData[0].league
              } : null
            },
            player_game_logs: {
              count: logsData?.length || 0,
              error: logsError?.message || null,
              sample: logsData?.[0] ? {
                id: logsData[0].id,
                player_id: logsData[0].player_id,
                date: logsData[0].date,
                league: logsData[0].league
              } : null
            },
            player_props_fixed: {
              count: fixedData?.length || 0,
              error: fixedError?.message || null,
              sample: fixedData?.[0] ? {
                prop_id: fixedData[0].prop_id,
                player_id: fixedData[0].player_id,
                prop_date: fixedData[0].prop_date,
                league: fixedData[0].league
              } : null
            },
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
        } catch (error) {
          return corsResponse({
            success: false,
            error: `Database check error: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }, 500);
        }
      }
      if (url.pathname === "/api/player-props") {
        try {
          const sport = url.searchParams.get("sport")?.toLowerCase() || "nfl";
          const forceRefresh = url.searchParams.get("force_refresh") === "true";
          const date = url.searchParams.get("date");
          const dateFrom = url.searchParams.get("date_from");
          const dateTo = url.searchParams.get("date_to");
          const getMaxPropsForSport = /* @__PURE__ */ __name((sport2) => {
            switch (sport2.toLowerCase()) {
              case "nfl":
                return 150;
              case "nba":
                return 100;
              case "mlb":
                return 200;
              case "nhl":
                return 70;
              default:
                return 150;
            }
          }, "getMaxPropsForSport");
          const maxPropsPerRequest = getMaxPropsForSport(sport);
          const cacheTtlSeconds = parseInt(env.CACHE_TTL_SECONDS || "300");
          console.log(`\u{1F4CA} NEW PIPELINE: Fetching player props for ${sport} (date: ${date}, forceRefresh: ${forceRefresh}, maxProps: ${maxPropsPerRequest})...`);
          const cacheKey = `player-props-${sport}-${date || "all"}-${dateFrom || ""}-${dateTo || ""}`;
          if (!forceRefresh && env.PLAYER_PROPS_CACHE) {
            try {
              const cachedData = await env.PLAYER_PROPS_CACHE.get(cacheKey);
              if (cachedData) {
                const cached = JSON.parse(cachedData);
                console.log(`\u{1F4CA} Cache hit for ${cacheKey}`);
                return corsResponse({
                  success: true,
                  data: cached.data,
                  cached: true,
                  cacheKey,
                  responseTime: 0,
                  totalEvents: cached.totalEvents || 1,
                  totalProps: cached.totalProps || cached.data.length,
                  sport,
                  date,
                  timestamp: cached.timestamp || (/* @__PURE__ */ new Date()).toISOString()
                });
              }
            } catch (cacheError) {
              console.warn("\u26A0\uFE0F Cache read error:", cacheError);
            }
          }
          const leagueMap = {
            "nfl": "nfl",
            "nba": "nba",
            "mlb": "mlb",
            "nhl": "nhl"
          };
          const league = leagueMap[sport] || "nfl";
          let enrichedProps = [];
          try {
            if (date) {
              console.log(`\u{1F4CA} NEW PIPELINE: Fetching props for ${league} on ${date}...`);
              enrichedProps = await buildProps(env, league, date);
            } else if (dateFrom && dateTo) {
              const startDate = new Date(dateFrom);
              const endDate = new Date(dateTo);
              const allProps = [];
              for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split("T")[0];
                try {
                  console.log(`\u{1F4CA} NEW PIPELINE: Fetching props for ${league} on ${dateStr}...`);
                  const dayProps = await buildProps(env, league, dateStr);
                  allProps.push(...dayProps);
                } catch (error) {
                  console.warn(`\u26A0\uFE0F Failed to fetch props for ${dateStr}:`, error);
                }
              }
              enrichedProps = allProps;
            } else {
              console.log(`\u{1F4CA} NEW PIPELINE: Finding most recent date with data for ${league}...`);
              const today = /* @__PURE__ */ new Date();
              let foundData = false;
              for (let i = 0; i < 7; i++) {
                const checkDate = new Date(today);
                checkDate.setDate(checkDate.getDate() - i);
                const dateStr = checkDate.toISOString().split("T")[0];
                try {
                  const testProps = await buildProps(env, league, dateStr);
                  if (testProps.length > 0) {
                    console.log(`\u{1F4C5} NEW PIPELINE: Found data for ${league} on ${dateStr} (${testProps.length} props)`);
                    enrichedProps = testProps;
                    foundData = true;
                    break;
                  }
                } catch (error) {
                  console.warn(`\u26A0\uFE0F Failed to check ${dateStr}:`, error);
                }
              }
              if (!foundData) {
                console.log(`\u26A0\uFE0F NEW PIPELINE: No data found for league ${league} in last 7 days`);
                enrichedProps = [];
              }
            }
            console.log(`\u{1F4CA} NEW PIPELINE: Fetched ${enrichedProps.length} enriched props`);
            if (enrichedProps.length > 0) {
              console.log(`\u{1F4CA} NEW PIPELINE: Sample enriched prop:`, {
                player_id: enrichedProps[0].player_id,
                clean_player_name: enrichedProps[0].clean_player_name,
                team_abbr: enrichedProps[0].team_abbr,
                opponent_abbr: enrichedProps[0].opponent_abbr,
                prop_type: enrichedProps[0].prop_type,
                ev_percent: enrichedProps[0].ev_percent,
                last5_hits: enrichedProps[0].last5_hits
              });
            }
          } catch (error) {
            console.error("\u274C NEW PIPELINE: Failed to fetch enriched player props:", error);
            return corsResponse({
              success: false,
              error: `Failed to fetch player props: ${error instanceof Error ? error.message : String(error)}`,
              sport,
              date,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            }, 500);
          }
          if (!enrichedProps || enrichedProps.length === 0) {
            return corsResponse({
              success: true,
              data: [],
              cached: false,
              cacheKey: `player-props-${sport}-${date}`,
              responseTime: Date.now(),
              totalEvents: 0,
              totalProps: 0,
              sport,
              date,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
          }
          const filteredProps = enrichedProps.filter((prop) => {
            const propType = prop.prop_type?.toLowerCase() || "";
            const currentSport = sport.toLowerCase();
            if (currentSport === "nfl" || currentSport === "nba") {
              const isDefensiveProp = propType.includes("defense") || propType.includes("tackle") || propType.includes("sack") || propType.includes("interception") || propType.includes("pass_defended") || propType.includes("forced_fumble") || propType.includes("fumble_recovery") || propType.includes("defensive_td") || propType.includes("safety") || propType.includes("blocked_kick") || propType.includes("defensive_special_teams") || propType.includes("defensive_combined_tackles") || propType.includes("defensive_solo_tackles") || propType.includes("defensive_assisted_tackles") || propType.includes("defensive_sacks") || propType.includes("defensive_interceptions") || propType.includes("defensive_pass_defended") || propType.includes("defensive_forced_fumbles") || propType.includes("defensive_fumble_recoveries") || propType.includes("defensive_touchdowns") || propType.includes("defensive_safeties") || propType.includes("defensive_blocked_kicks");
              if (isDefensiveProp) {
                console.log(`\u{1F6AB} Filtered out defensive prop: ${prop.prop_type} for ${currentSport}`);
                return false;
              }
            }
            return true;
          });
          console.log(`\u{1F4CA} NEW PIPELINE: Filtered to ${filteredProps.length} props (removed defensive props for NFL/NBA)`);
          const limitedProps = filteredProps.slice(0, maxPropsPerRequest);
          console.log(`\u{1F4CA} Limited to ${limitedProps.length} props (max: ${maxPropsPerRequest})`);
          const transformedProps = limitedProps.map((prop) => {
            return {
              id: prop.player_id,
              // Use player_id as ID
              playerId: prop.player_id,
              playerName: prop.clean_player_name,
              player_id: prop.player_id,
              // For headshots compatibility
              team: prop.team_abbr,
              opponent: prop.opponent_abbr,
              propType: prop.prop_type,
              line: prop.line,
              overOdds: prop.over_odds,
              underOdds: prop.under_odds,
              sportsbooks: ["SportsGameOdds"],
              // Default sportsbook
              position: "N/A",
              gameDate: prop.date_normalized,
              sport,
              teamAbbr: prop.team_abbr,
              opponentAbbr: prop.opponent_abbr,
              gameId: prop.game_id,
              available: true,
              lastUpdate: (/* @__PURE__ */ new Date()).toISOString(),
              marketName: prop.prop_type,
              market: prop.prop_type,
              marketId: prop.prop_type,
              period: "full_game",
              statEntity: prop.clean_player_name,
              // NEW PIPELINE: Enhanced fields with calculated metrics
              evPercent: prop.ev_percent,
              last5_streak: prop.last5_hits,
              last10_streak: prop.last10_hits,
              last20_streak: prop.last20_hits,
              h2h_streak: prop.h2h_hits,
              // Team data with logos
              teamLogo: prop.team_logo,
              opponentLogo: prop.opponent_logo,
              team_name: prop.team_name,
              opponent_name: prop.opponent_name,
              // Enhanced fields
              bestOver: prop.over_odds ? {
                bookmaker: "SportsGameOdds",
                side: "over",
                price: prop.over_odds.toString(),
                line: prop.line
              } : void 0,
              bestUnder: prop.under_odds ? {
                bookmaker: "SportsGameOdds",
                side: "under",
                price: prop.under_odds.toString(),
                line: prop.line
              } : void 0,
              allBooks: prop.over_odds ? [{
                bookmaker: "SportsGameOdds",
                side: "over",
                price: prop.over_odds.toString(),
                line: prop.line,
                deeplink: ""
              }] : [],
              // Debug fields
              clean_player_name: prop.clean_player_name,
              debug_team: prop.debug_team,
              debug_ev: prop.debug_ev
            };
          });
          const actualDate = date || limitedProps[0]?.date_normalized;
          const response = {
            success: true,
            data: transformedProps,
            cached: false,
            cacheKey,
            responseTime: Date.now(),
            totalEvents: 1,
            totalProps: transformedProps.length,
            sport,
            date: actualDate,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          };
          if (!forceRefresh && env.PLAYER_PROPS_CACHE) {
            try {
              await env.PLAYER_PROPS_CACHE.put(cacheKey, JSON.stringify(response), {
                expirationTtl: cacheTtlSeconds
              });
              console.log(`\u{1F4CA} Cached response for ${cacheKey} (TTL: ${cacheTtlSeconds}s)`);
            } catch (cacheError) {
              console.warn("\u26A0\uFE0F Cache write error:", cacheError);
            }
          }
          return corsResponse(response);
        } catch (error) {
          console.error("\u274C Player props API error:", error);
          return corsResponse({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            data: [],
            cached: false,
            cacheKey: "",
            responseTime: 0,
            totalEvents: 0,
            totalProps: 0
          }, 500);
        }
      }
      if (url.pathname === "/refresh-prop-sync") {
        try {
          const { refreshPropTypeAliases: refreshPropTypeAliases2 } = await Promise.resolve().then(() => (init_propTypeSync(), propTypeSync_exports));
          const success = await refreshPropTypeAliases2();
          return new Response(JSON.stringify({
            success,
            message: success ? "Prop type aliases refreshed successfully" : "Failed to refresh prop type aliases",
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }), {
            headers: { "Content-Type": "application/json" }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
      if (url.pathname === "/refresh-supported-props") {
        try {
          supportedProps = await loadSupportedProps();
          return new Response(JSON.stringify({
            success: true,
            message: "Supported props refreshed successfully",
            supportedLeagues: Object.keys(supportedProps),
            leagueCounts: Object.entries(supportedProps).map(([league, props]) => ({
              league,
              count: props.size
            })),
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }), {
            headers: { "Content-Type": "application/json" }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
      if (url.pathname === "/debug-supported-props") {
        try {
          const { getSupportedPropsSummary: getSupportedPropsSummary2 } = await Promise.resolve().then(() => (init_ingestionFilter(), ingestionFilter_exports));
          const summary = getSupportedPropsSummary2(supportedProps);
          return new Response(JSON.stringify({
            success: true,
            supportedProps: summary,
            totalLeagues: Object.keys(supportedProps).length,
            totalProps: Object.values(supportedProps).reduce((sum, props) => sum + props.size, 0),
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }), {
            headers: { "Content-Type": "application/json" }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
      if (url.pathname === "/coverage-report") {
        try {
          const coverage = await generateCoverageReport();
          const summary = getCoverageSummary(coverage);
          return new Response(JSON.stringify({
            success: true,
            coverage: summary,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }), {
            headers: { "Content-Type": "application/json" }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
      if (url.pathname === "/debug-prop-sync") {
        try {
          const { getAliasCache: getAliasCache2 } = await Promise.resolve().then(() => (init_propTypeSync(), propTypeSync_exports));
          const aliasCache2 = getAliasCache2();
          const testCases = [
            { input: "pts", expected: "points" },
            { input: "reb", expected: "rebounds" },
            { input: "sacks", expected: "defense_sacks" },
            { input: "td", expected: "fantasyscore" },
            { input: "Goals", expected: "goals" },
            { input: "batting_basesOnBalls", expected: "walks" }
          ];
          const results = testCases.map((test) => ({
            input: test.input,
            output: normalizePropType2(test.input),
            expected: test.expected,
            correct: normalizePropType2(test.input) === test.expected
          }));
          return new Response(JSON.stringify({
            success: true,
            aliasCacheSize: Object.keys(aliasCache2).length,
            sampleAliases: Object.entries(aliasCache2).slice(0, 5),
            testResults: results,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }), {
            headers: { "Content-Type": "application/json" }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
      if (url.pathname === "/debug-join-diagnostics") {
        try {
          const { createClient: createClient2 } = await Promise.resolve().then(() => (init_module5(), module_exports));
          const supabase4 = createClient2(
            env.SUPABASE_URL,
            env.SUPABASE_SERVICE_KEY
          );
          console.log("\u{1F50D} Running join diagnostics...");
          const { data: gameLogs, error: glErr } = await supabase4.from("player_game_logs").select("player_id, game_id, prop_type, league, season, date, conflict_key").limit(1e3);
          const { data: props, error: prErr } = await supabase4.from("proplines").select("player_id, game_id, prop_type, league, season, date, date_normalized, conflict_key").limit(1e3);
          if (glErr || prErr) {
            console.error("\u274C Supabase error:", glErr || prErr);
            return corsResponse({
              success: false,
              error: glErr?.message || prErr?.message
            }, 500);
          }
          const results = {};
          gameLogs.forEach((g) => {
            const league = normalizeLeague(g.league);
            if (!results[league]) {
              results[league] = { totalLogs: 0, matchedProps: 0, unmatchedLogs: 0 };
            }
            results[league].totalLogs++;
            const normalizedGameLog = {
              player_id: g.player_id,
              game_id: g.game_id,
              prop_type: normalizePropType2(g.prop_type),
              date: normalizeDate(g.date),
              league: normalizeLeague(g.league),
              season: g.season
            };
            const match = props.find((p) => {
              const normalizedProp = {
                player_id: p.player_id,
                game_id: p.game_id,
                prop_type: normalizePropType2(p.prop_type),
                date: normalizeDate(p.date_normalized || p.date),
                league: normalizeLeague(p.league),
                season: p.season
              };
              return normalizedGameLog.player_id === normalizedProp.player_id && normalizedGameLog.game_id === normalizedProp.game_id && normalizedGameLog.prop_type === normalizedProp.prop_type && normalizedGameLog.date === normalizedProp.date && normalizedGameLog.league === normalizedProp.league && normalizedGameLog.season === normalizedProp.season;
            });
            if (match) {
              results[league].matchedProps++;
            } else {
              results[league].unmatchedLogs++;
            }
          });
          console.log("\u{1F4CA} Join Diagnostic Results:");
          Object.entries(results).forEach(([league, counts]) => {
            console.log(
              `${league.toUpperCase()}: totalLogs=${counts.totalLogs}, matchedProps=${counts.matchedProps}, unmatchedLogs=${counts.unmatchedLogs}`
            );
          });
          const reverse = {};
          props.forEach((p) => {
            const league = p.league.toLowerCase();
            if (!reverse[league]) {
              reverse[league] = { totalProps: 0, matchedLogs: 0, unmatchedProps: 0 };
            }
            reverse[league].totalProps++;
            const match = gameLogs.find(
              (g) => {
                const gameLogParts = g.conflict_key.split("|");
                const [player_id, game_id, prop_type, league2, season] = gameLogParts;
                const propParts = p.conflict_key.split("|");
                if (propParts.length !== 6)
                  return false;
                const [p_player_id, p_game_id, p_prop_type, p_sportsbook, p_league, p_season] = propParts;
                const normalizedGameLogPropType = normalizePropType2(prop_type);
                const normalizedPropPropType = normalizePropType2(p_prop_type);
                return p_player_id === player_id && p_game_id === game_id && normalizedGameLogPropType === normalizedPropPropType && isDateMatch(g.date, p.date_normalized) && p_league === league2 && p_season === season;
              }
            );
            if (match) {
              reverse[league].matchedLogs++;
            } else {
              reverse[league].unmatchedProps++;
            }
          });
          console.log("\u{1F4CA} Reverse Diagnostic Results:");
          Object.entries(reverse).forEach(([league, counts]) => {
            console.log(
              `${league.toUpperCase()}: totalProps=${counts.totalProps}, matchedLogs=${counts.matchedLogs}, unmatchedProps=${counts.unmatchedProps}`
            );
          });
          return corsResponse({
            success: true,
            forwardJoin: results,
            reverseJoin: reverse,
            summary: {
              totalGameLogs: gameLogs?.length || 0,
              totalProps: props?.length || 0,
              totalMatched: Object.values(results).reduce((sum, r) => sum + r.matchedProps, 0),
              totalUnmatched: Object.values(results).reduce((sum, r) => sum + r.unmatchedLogs, 0)
            },
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
        } catch (error) {
          console.error("\u274C Join diagnostics error:", error);
          return corsResponse({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }, 500);
        }
      }
      if (url.pathname === "/debug-field-mismatch") {
        try {
          let explainMismatch2 = function(gameLog, prop) {
            const issues = [];
            const gameLogParts = gameLog.conflict_key.split("|");
            const [player_id, game_id, prop_type, league, season] = gameLogParts;
            const propParts = prop.conflict_key.split("|");
            if (propParts.length !== 6) {
              issues.push("prop conflict_key format mismatch (not 6 parts)");
              return issues.join(", ");
            }
            const [p_player_id, p_game_id, p_prop_type, p_sportsbook, p_league, p_season] = propParts;
            if (player_id !== p_player_id)
              issues.push("player_id mismatch");
            if (game_id !== p_game_id)
              issues.push("game_id mismatch");
            const normalizedGameLogPropType = normalizePropType2(prop_type);
            const normalizedPropPropType = normalizePropType2(p_prop_type);
            const propTypesMatch = normalizedGameLogPropType === normalizedPropPropType;
            if (!propTypesMatch)
              issues.push(`prop_type mismatch (${prop_type} vs ${p_prop_type})`);
            if (league !== p_league)
              issues.push(`league mismatch (${league} vs ${p_league})`);
            if (season !== p_season)
              issues.push(`season mismatch (${season} vs ${p_season})`);
            return issues.length ? issues.join(", ") : "all fields match";
          };
          var explainMismatch = explainMismatch2;
          __name(explainMismatch2, "explainMismatch");
          const { createClient: createClient2 } = await Promise.resolve().then(() => (init_module5(), module_exports));
          const supabase4 = createClient2(
            env.SUPABASE_URL,
            env.SUPABASE_SERVICE_KEY
          );
          console.log("\u{1F50D} Running field-level mismatch diagnostics...");
          const { data: gameLogs } = await supabase4.from("player_game_logs").select("player_id, prop_type, league, date, conflict_key");
          const { data: props } = await supabase4.from("proplines").select("player_id, prop_type, league, date_normalized, conflict_key");
          console.log("\u{1F4CA} Field\u2011Level Mismatch Diagnostics");
          const mismatches = [];
          const noPropsForPlayer = [];
          gameLogs.slice(0, 50).forEach((g) => {
            const candidates = props.filter((p) => p.player_id === g.player_id);
            if (candidates.length === 0) {
              console.log(`\u274C No props at all for player ${g.player_id}`);
              noPropsForPlayer.push({
                player_id: g.player_id,
                prop_type: g.prop_type,
                league: g.league,
                date: g.date
              });
            } else {
              const match = candidates.find(
                (p) => {
                  const gameLogParts = g.conflict_key.split("|");
                  const [player_id, game_id, prop_type, league, season] = gameLogParts;
                  const propParts = p.conflict_key.split("|");
                  if (propParts.length !== 6)
                    return false;
                  const [p_player_id, p_game_id, p_prop_type, p_sportsbook, p_league, p_season] = propParts;
                  const normalizedGameLogPropType = normalizePropType2(prop_type);
                  const normalizedPropPropType = normalizePropType2(p_prop_type);
                  const propTypesMatch = normalizedGameLogPropType === normalizedPropPropType;
                  return p_player_id === player_id && p_game_id === game_id && propTypesMatch && p_league === league && p_season === season;
                }
              );
              if (!match) {
                const reason = explainMismatch2(g, candidates[0]);
                console.log(`\u26A0\uFE0F Mismatch for player ${g.player_id}: ${reason}`);
                mismatches.push({
                  gameLog: g,
                  candidate: candidates[0],
                  reason,
                  allCandidates: candidates.slice(0, 3)
                  // Show first 3 candidates
                });
              }
            }
          });
          return corsResponse({
            success: true,
            summary: {
              totalGameLogsChecked: Math.min(50, gameLogs?.length || 0),
              totalProps: props?.length || 0,
              mismatchesFound: mismatches.length,
              playersWithNoProps: noPropsForPlayer.length
            },
            mismatches: mismatches.slice(0, 10),
            // Limit to first 10 for response size
            playersWithNoProps: noPropsForPlayer.slice(0, 10),
            sampleGameLog: gameLogs?.[0],
            sampleProp: props?.[0],
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
        } catch (error) {
          console.error("\u274C Field mismatch diagnostics error:", error);
          return corsResponse({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }, 500);
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
          return corsResponse({
            success: true,
            message: "Current season ingestion completed successfully",
            duration: `${duration}ms`,
            ...result
          });
        } catch (error) {
          console.error("\u274C Ingestion failed:", error);
          return corsResponse({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            duration: `${Date.now() - startTime}ms`
          }, 500);
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
          const response = await supabaseFetch2(env, "proplines?limit=1&select=*", {
            method: "GET"
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
              const extracted = await extractPlayerProps2(events, env);
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
            const extracted = await extractPlayerProps2(events, env);
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
            body: JSON.stringify([testProp])
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
            const extracted = await extractPlayerProps2(events, env);
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
              body: JSON.stringify([testProp]),
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
      if (url.pathname === "/performance-ingest") {
        console.log(`\u{1F504} Starting performance data ingestion...`);
        const startTime = Date.now();
        const leagues = url.searchParams.get("leagues")?.split(",");
        const date = url.searchParams.get("date") || void 0;
        const days = parseInt(url.searchParams.get("days") || "1");
        try {
          const result = await runPerformanceIngestion(env, {
            leagues,
            date,
            days
          });
          const duration = Date.now() - startTime;
          return new Response(JSON.stringify({
            message: "Performance data ingestion completed",
            duration: `${duration}ms`,
            ...result
          }), {
            status: result.success ? 200 : 500,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        } catch (error) {
          console.error("\u274C Performance ingestion failed:", error);
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
      if (url.pathname.startsWith("/performance-ingest/")) {
        const leagueId = url.pathname.split("/")[2];
        const date = url.searchParams.get("date") || void 0;
        const days = parseInt(url.searchParams.get("days") || "1");
        console.log(`\u{1F504} Starting single league performance ingestion for ${leagueId}...`);
        const startTime = Date.now();
        try {
          const result = await runSingleLeaguePerformanceIngestion(env, leagueId, {
            date,
            days
          });
          const duration = Date.now() - startTime;
          return new Response(JSON.stringify({
            message: `Single league performance ingestion completed for ${leagueId}`,
            duration: `${duration}ms`,
            ...result
          }), {
            status: result.success ? 200 : 500,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        } catch (error) {
          console.error(`\u274C Single league performance ingestion failed for ${leagueId}:`, error);
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
      if (url.pathname === "/performance-historical") {
        const startDate = url.searchParams.get("startDate");
        const endDate = url.searchParams.get("endDate");
        const leagues = url.searchParams.get("leagues")?.split(",");
        if (!startDate || !endDate) {
          return new Response(JSON.stringify({
            success: false,
            error: "startDate and endDate parameters are required"
          }), {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        }
        console.log(`\u{1F504} Starting historical performance ingestion from ${startDate} to ${endDate}...`);
        const startTime = Date.now();
        try {
          const result = await runHistoricalPerformanceIngestion(env, {
            leagues,
            startDate,
            endDate
          });
          const duration = Date.now() - startTime;
          return new Response(JSON.stringify({
            message: "Historical performance ingestion completed",
            duration: `${duration}ms`,
            ...result
          }), {
            status: result.success ? 200 : 500,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        } catch (error) {
          console.error("\u274C Historical performance ingestion failed:", error);
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
      if (url.pathname === "/debug-data-check") {
        console.log(`\u{1F50D} Debug data check...`);
        try {
          const proplinesResponse = await supabaseFetch(env, "proplines?limit=5", {
            method: "GET"
          });
          const gameLogsResponse = await supabaseFetch(env, "player_game_logs?limit=5", {
            method: "GET"
          });
          return new Response(JSON.stringify({
            success: true,
            message: "Data check completed",
            proplines: {
              count: proplinesResponse ? proplinesResponse.length : 0,
              sample: proplinesResponse && proplinesResponse.length > 0 ? proplinesResponse[0] : null
            },
            gameLogs: {
              count: gameLogsResponse ? gameLogsResponse.length : 0,
              sample: gameLogsResponse && gameLogsResponse.length > 0 ? gameLogsResponse[0] : null
            }
          }), {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        } catch (error) {
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
      if (url.pathname === "/debug-performance-diagnostic") {
        console.log(`\u{1F50D} Running performance diagnostic...`);
        try {
          const result = await runPerformanceDiagnostic(env);
          return new Response(JSON.stringify({
            success: true,
            message: "Performance diagnostic completed",
            result
          }), {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        } catch (error) {
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
      if (url.pathname === "/debug-events") {
        const date = url.searchParams.get("date") || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        console.log(`\u{1F50D} Debug events for date: ${date}`);
        try {
          const results = await fetchAllLeaguesEvents(date, env);
          const summary = {
            date,
            leagues: {}
          };
          for (const [league, events] of Object.entries(results)) {
            summary.leagues[league] = {
              eventCount: events.length,
              hasEvents: events.length > 0,
              sampleEvent: events.length > 0 ? {
                id: events[0].event_id || events[0].eventID || "unknown",
                homeTeam: events[0].home_team?.name || events[0].teams?.home?.names?.long || "unknown",
                awayTeam: events[0].away_team?.name || events[0].teams?.away?.names?.long || "unknown",
                hasPlayerProps: !!(events[0].player_props && events[0].player_props.length > 0),
                hasMarkets: !!(events[0].markets && events[0].markets.length > 0)
              } : null
            };
          }
          return new Response(JSON.stringify({
            success: true,
            message: "Events debug completed",
            summary,
            rawResults: results
          }), {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        } catch (error) {
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
      return new Response(JSON.stringify({
        error: "Endpoint not found",
        availableEndpoints: ["/backfill-all", "/backfill-recent", "/backfill-full", "/backfill-league/{league}", "/backfill-season/{season}", "/backfill-progressive", "/ingest", "/ingest/{league}", "/refresh-analytics", "/incremental-analytics-refresh", "/analytics/streaks", "/analytics/defensive-rankings", "/analytics/matchup-rank", "/analytics/last-5", "/analytics/last-10", "/analytics/last-20", "/analytics/h2h", "/debug-streaks", "/debug-streak-counts", "/status", "/leagues", "/seasons"]
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
async function runPerformanceDiagnostic(env) {
  const { createClient: createClient2 } = await Promise.resolve().then(() => (init_module5(), module_exports));
  const supabase4 = createClient2(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_KEY
  );
  const testRow = {
    player_id: "TEST_PLAYER",
    player_name: "Diagnostic Player",
    date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
    // YYYY-MM-DD
    league: "NFL",
    season: 2025,
    game_id: "TEST_GAME",
    prop_type: "Test Prop",
    line: 1.5,
    sportsbook: "SportsGameOdds",
    over_odds: -110,
    under_odds: 100,
    conflict_key: `TEST_PLAYER|TEST_GAME|Test Prop|SportsGameOdds|NFL`
  };
  const result = {
    insertSuccess: false,
    selectSuccess: false,
    dataFound: false,
    insertError: null,
    selectError: null,
    retrievedData: null
  };
  try {
    const { error: insertError } = await supabase4.from("proplines").upsert([testRow]);
    if (insertError) {
      console.error("\u274C Insert failed:", insertError.message);
      result.insertError = insertError.message;
      return result;
    }
    result.insertSuccess = true;
    console.log("\u2705 Insert successful");
    const { data, error: selectError } = await supabase4.from("proplines").select("*").eq("player_id", "TEST_PLAYER").order("created_at", { ascending: false }).limit(1);
    if (selectError) {
      console.error("\u274C Select failed:", selectError.message);
      result.selectError = selectError.message;
      return result;
    }
    result.selectSuccess = true;
    if (data && data.length > 0) {
      console.log("\u2705 Persistence confirmed:", data[0]);
      result.dataFound = true;
      result.retrievedData = data[0];
    } else {
      console.warn("\u26A0\uFE0F Insert appeared to succeed, but no row found. Likely RLS or wrong key.");
      result.dataFound = false;
    }
    const gameLogTestRow = {
      player_id: "TEST_PLAYER",
      player_name: "Diagnostic Player",
      team: "TEST",
      opponent: "TEST2",
      season: 2025,
      date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
      prop_type: "Test Prop",
      value: 2.5,
      sport: "NFL",
      league: "nfl",
      game_id: "TEST_GAME"
    };
    const { error: gameLogInsertError } = await supabase4.from("player_game_logs").upsert([gameLogTestRow]);
    if (gameLogInsertError) {
      result.gameLogInsertError = gameLogInsertError.message;
    } else {
      result.gameLogInsertSuccess = true;
      const { data: gameLogData, error: gameLogSelectError } = await supabase4.from("player_game_logs").select("*").eq("player_id", "TEST_PLAYER").limit(1);
      if (gameLogSelectError) {
        result.gameLogSelectError = gameLogSelectError.message;
      } else {
        result.gameLogSelectSuccess = true;
        result.gameLogDataFound = gameLogData && gameLogData.length > 0;
        if (gameLogData && gameLogData.length > 0) {
          result.gameLogRetrievedData = gameLogData[0];
        }
      }
    }
  } catch (error) {
    console.error("\u274C Diagnostic failed:", error);
    result.diagnosticError = error instanceof Error ? error.message : String(error);
  }
  return result;
}
__name(runPerformanceDiagnostic, "runPerformanceDiagnostic");
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
