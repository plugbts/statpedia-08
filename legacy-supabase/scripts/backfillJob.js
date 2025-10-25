/**
 * Historical Backfill Job
 * - Iterates over past seasons or date ranges
 * - Ingests PlayerGameLogs + PropLines for each season
 * - Runs precompute analytics after each season
 * - Handles large datasets with progress tracking and error recovery
 */

import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";
import { calculateHitRate, calculateStreak } from "./analyticsCalculators.js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
);

const API_KEY = process.env.SPORTSGAMEODDS_API_KEY;
const LEAGUES = ["nfl", "nba", "mlb", "nhl"];

// Configure seasons to backfill
const SEASONS = [2022, 2023, 2024]; // Adjust this list as needed

// Configuration options
const CONFIG = {
  BATCH_SIZE: 100,
  DELAY_BETWEEN_REQUESTS: 200, // ms
  DELAY_BETWEEN_SEASONS: 5000, // ms
  MAX_RETRIES: 3,
  PROGRESS_INTERVAL: 100, // Log progress every N records
};

async function runBackfill() {
  console.log("🚀 Starting Historical Backfill Job");
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log(`📅 Seasons to process: ${SEASONS.join(", ")}`);
  console.log(`🏈 Leagues: ${LEAGUES.join(", ").toUpperCase()}`);
  console.log("=".repeat(80));

  const totalResults = {
    seasons: {},
    totalGameLogs: 0,
    totalPropLines: 0,
    totalAnalytics: 0,
    errors: [],
  };

  try {
    for (let i = 0; i < SEASONS.length; i++) {
      const season = SEASONS[i];
      console.log(`\n🔄 BACKFILLING SEASON ${season} (${i + 1}/${SEASONS.length})`);
      console.log("=".repeat(60));

      const seasonStart = Date.now();
      const seasonResults = {
        gameLogs: { records: 0, leagues: {} },
        propLines: { records: 0, leagues: {} },
        analytics: { records: 0 },
        duration: 0,
        errors: [],
      };

      try {
        // Step 1: Ingest Game Logs
        console.log("\n📥 STEP 1: Ingest Season Game Logs");
        console.log("-".repeat(40));
        seasonResults.gameLogs = await ingestSeasonLogs(season);

        // Step 2: Ingest Prop Lines
        console.log("\n🎯 STEP 2: Ingest Season Prop Lines");
        console.log("-".repeat(40));
        seasonResults.propLines = await ingestSeasonProps(season);

        // Step 3: Precompute Analytics
        console.log("\n📊 STEP 3: Precompute Season Analytics");
        console.log("-".repeat(40));
        seasonResults.analytics = await precomputeAnalytics(season);

        seasonResults.duration = Date.now() - seasonStart;

        // Season Summary
        console.log(`\n✅ SEASON ${season} COMPLETE`);
        console.log("=".repeat(60));
        console.log(`⏱️ Duration: ${(seasonResults.duration / 1000).toFixed(2)}s`);
        console.log(`📊 Game Logs: ${seasonResults.gameLogs.records} records`);
        console.log(`🎯 Prop Lines: ${seasonResults.propLines.records} records`);
        console.log(`📈 Analytics: ${seasonResults.analytics.records} records`);

        totalResults.seasons[season] = seasonResults;
        totalResults.totalGameLogs += seasonResults.gameLogs.records;
        totalResults.totalPropLines += seasonResults.propLines.records;
        totalResults.totalAnalytics += seasonResults.analytics.records;

        // Delay between seasons to avoid overwhelming the API
        if (i < SEASONS.length - 1) {
          console.log(`\n⏳ Waiting ${CONFIG.DELAY_BETWEEN_SEASONS / 1000}s before next season...`);
          await new Promise((resolve) => setTimeout(resolve, CONFIG.DELAY_BETWEEN_SEASONS));
        }
      } catch (error) {
        console.error(`❌ Error processing season ${season}:`, error);
        seasonResults.errors.push(error.message);
        totalResults.errors.push(`Season ${season}: ${error.message}`);

        // Continue with next season
        continue;
      }
    }

    // Final Summary
    console.log("\n🎉 HISTORICAL BACKFILL COMPLETE");
    console.log("=".repeat(80));
    console.log(
      `📅 Seasons processed: ${Object.keys(totalResults.seasons).length}/${SEASONS.length}`,
    );
    console.log(`📊 Total Game Logs: ${totalResults.totalGameLogs.toLocaleString()} records`);
    console.log(`🎯 Total Prop Lines: ${totalResults.totalPropLines.toLocaleString()} records`);
    console.log(`📈 Total Analytics: ${totalResults.totalAnalytics.toLocaleString()} records`);

    if (totalResults.errors.length > 0) {
      console.log(`\n⚠️ Errors encountered: ${totalResults.errors.length}`);
      totalResults.errors.forEach((error) => console.log(`  - ${error}`));
    }

    console.log("\n✅ Historical backfill completed successfully!");
  } catch (error) {
    console.error("\n❌ FATAL ERROR in backfill job:", error);
    throw error;
  }
}

/* ------------------------------
   1. Ingest full season game logs
--------------------------------*/
async function ingestSeasonLogs(season) {
  const results = { records: 0, leagues: {} };

  for (const league of LEAGUES) {
    console.log(`📊 Processing ${league.toUpperCase()} ${season} game logs...`);
    let leagueRecords = 0;
    let nextCursor = null;
    let requestCount = 0;

    do {
      try {
        const url = `https://api.sportsgameodds.com/v1/${league}/events?season=${season}&limit=${CONFIG.BATCH_SIZE}${nextCursor ? `&cursor=${nextCursor}` : ""}`;

        const res = await fetchWithRetry(url, {
          headers: { "x-api-key": API_KEY },
        });

        if (!res.ok) {
          console.error(
            `❌ API request failed for ${league} ${season}: ${res.status} ${res.statusText}`,
          );
          break;
        }

        const data = await res.json();
        const rows = [];

        for (const event of data.events || []) {
          for (const player of event.players || []) {
            if (!player.stats || Object.keys(player.stats).length === 0) {
              continue;
            }

            // Process each stat
            for (const [statType, value] of Object.entries(player.stats)) {
              if (value === null || value === undefined) continue;

              rows.push({
                player_id: player.id || normalizePlayerId(player.name),
                player_name: player.name,
                team: normalizeTeam(player.team, league),
                opponent: normalizeTeam(event.opponent, league),
                season: event.season || season,
                date: event.date,
                prop_type: normalizeMarketType(statType),
                value: Number(value),
                position: player.position || "UNK",
              });
            }
          }
        }

        if (rows.length > 0) {
          const { error } = await supabase
            .from("playergamelogs")
            .upsert(rows, { onConflict: "player_id,date,prop_type" });

          if (error) {
            console.error(`❌ Insert error for ${league} ${season}:`, error);
          } else {
            leagueRecords += rows.length;
            if (leagueRecords % CONFIG.PROGRESS_INTERVAL === 0) {
              console.log(`  📊 Processed ${leagueRecords.toLocaleString()} records...`);
            }
          }
        }

        nextCursor = data.nextCursor;
        requestCount++;

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, CONFIG.DELAY_BETWEEN_REQUESTS));
      } catch (error) {
        console.error(`❌ Error processing ${league} ${season}:`, error);
        break;
      }
    } while (nextCursor);

    results.leagues[league] = leagueRecords;
    results.records += leagueRecords;
    console.log(
      `✅ ${league.toUpperCase()} ${season}: ${leagueRecords.toLocaleString()} game log records`,
    );
  }

  return results;
}

/* ------------------------------
   2. Ingest full season prop lines
--------------------------------*/
async function ingestSeasonProps(season) {
  const results = { records: 0, leagues: {} };

  for (const league of LEAGUES) {
    console.log(`🎯 Processing ${league.toUpperCase()} ${season} prop lines...`);
    let leagueRecords = 0;
    let nextCursor = null;
    let requestCount = 0;

    do {
      try {
        const url = `https://api.sportsgameodds.com/v1/${league}/props?season=${season}&limit=${CONFIG.BATCH_SIZE}${nextCursor ? `&cursor=${nextCursor}` : ""}`;

        const res = await fetchWithRetry(url, {
          headers: { "x-api-key": API_KEY },
        });

        if (!res.ok) {
          console.error(
            `❌ API request failed for ${league} ${season}: ${res.status} ${res.statusText}`,
          );
          break;
        }

        const data = await res.json();
        const rows = [];

        for (const prop of data.props || []) {
          if (!prop.player || !prop.player.id || !prop.player.name) {
            continue;
          }

          rows.push({
            player_id: prop.player.id,
            player_name: prop.player.name,
            team: normalizeTeam(prop.team, league),
            opponent: normalizeTeam(prop.opponent, league),
            season: prop.season || season,
            date: prop.date,
            prop_type: normalizeMarketType(prop.market),
            line: Number(prop.line),
            over_odds: parseOdds(prop.overOdds),
            under_odds: parseOdds(prop.underOdds),
            sportsbook: prop.sportsbook || "Consensus",
            league: league.toLowerCase(),
          });
        }

        if (rows.length > 0) {
          const { error } = await supabase
            .from("proplines")
            .upsert(rows, { onConflict: "player_id,date,prop_type,sportsbook" });

          if (error) {
            console.error(`❌ Insert error for ${league} ${season}:`, error);
          } else {
            leagueRecords += rows.length;
            if (leagueRecords % CONFIG.PROGRESS_INTERVAL === 0) {
              console.log(`  🎯 Processed ${leagueRecords.toLocaleString()} records...`);
            }
          }
        }

        nextCursor = data.nextCursor;
        requestCount++;

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, CONFIG.DELAY_BETWEEN_REQUESTS));
      } catch (error) {
        console.error(`❌ Error processing ${league} ${season}:`, error);
        break;
      }
    } while (nextCursor);

    results.leagues[league] = leagueRecords;
    results.records += leagueRecords;
    console.log(
      `✅ ${league.toUpperCase()} ${season}: ${leagueRecords.toLocaleString()} prop line records`,
    );
  }

  return results;
}

/* ------------------------------
   3. Precompute analytics for season
--------------------------------*/
async function precomputeAnalytics(season) {
  console.log(`📊 Precomputing analytics for season ${season}...`);

  try {
    // Get unique player/prop combinations for this season
    const { data: combos, error: combosError } = await supabase
      .from("playergamelogs")
      .select("player_id, player_name, prop_type")
      .eq("season", season)
      .neq("value", null)
      .neq("value", 0);

    if (combosError) {
      console.error("❌ Error fetching combinations:", combosError);
      return { records: 0 };
    }

    if (!combos || combos.length === 0) {
      console.log("⚠️ No combinations found for analytics");
      return { records: 0 };
    }

    console.log(`✅ Found ${combos.length.toLocaleString()} player/prop combinations`);

    // Get unique combinations
    const uniqueCombinations = combos.reduce((acc, combo) => {
      const key = `${combo.player_id}-${combo.prop_type}`;
      if (!acc.has(key)) {
        acc.set(key, combo);
      }
      return acc;
    }, new Map());

    const results = [];
    let processed = 0;

    for (const { player_id, player_name, prop_type } of uniqueCombinations.values()) {
      try {
        // Join game logs with prop lines for this specific season
        const { data: joined, error: joinError } = await supabase
          .from("playergamelogs")
          .select(
            `
            date,
            value,
            proplines!inner(line)
          `,
          )
          .eq("player_id", player_id)
          .eq("prop_type", prop_type)
          .eq("season", season)
          .order("date", { ascending: false });

        if (joinError) {
          console.error(`❌ Join error for ${player_name} ${prop_type}:`, joinError);
          continue;
        }

        if (!joined || joined.length === 0) {
          continue;
        }

        // Process data for analytics
        const processedData = joined.map((game) => ({
          date: game.date,
          value: game.value,
          line: game.proplines.line,
        }));

        // Calculate analytics for both directions
        const directions = ["over", "under"];

        for (const direction of directions) {
          const hitRateL5 = calculateHitRate(processedData, direction, 5);
          const hitRateL10 = calculateHitRate(processedData, direction, 10);
          const hitRateL20 = calculateHitRate(processedData, direction, 20);
          const hitRateSeason = calculateHitRate(processedData, direction);
          const streak = calculateStreak(processedData, direction);

          results.push({
            player_id,
            player_name,
            prop_type,
            line: processedData[0]?.line || 0,
            direction,
            season_hits: hitRateSeason.hits,
            season_total: hitRateSeason.total,
            season_pct: hitRateSeason.hitRate,
            l20_hits: hitRateL20.hits,
            l20_total: hitRateL20.total,
            l20_pct: hitRateL20.hitRate,
            l10_hits: hitRateL10.hits,
            l10_total: hitRateL10.total,
            l10_pct: hitRateL10.hitRate,
            l5_hits: hitRateL5.hits,
            l5_total: hitRateL5.total,
            l5_pct: hitRateL5.hitRate,
            streak_current: streak.currentStreak,
            streak_longest: streak.longestStreak,
            streak_direction: streak.streakDirection,
            last_computed_at: new Date().toISOString(),
            season,
          });
        }

        processed++;
        if (processed % 50 === 0) {
          console.log(
            `  📊 Processed ${processed.toLocaleString()}/${uniqueCombinations.size.toLocaleString()} combinations`,
          );
        }
      } catch (error) {
        console.error(`❌ Error processing ${player_name} - ${prop_type}:`, error);
        continue;
      }
    }

    // Upsert analytics results
    if (results.length > 0) {
      console.log(`💾 Upserting ${results.length.toLocaleString()} analytics records...`);

      const { error: upsertError } = await supabase
        .from("playeranalytics")
        .upsert(results, { onConflict: "player_id,prop_type,line,direction" });

      if (upsertError) {
        console.error("❌ Upsert error:", upsertError);
        return { records: 0 };
      } else {
        console.log(
          `✅ Successfully upserted ${results.length.toLocaleString()} analytics records`,
        );
        return { records: results.length };
      }
    }

    return { records: 0 };
  } catch (error) {
    console.error("❌ Fatal error in analytics precomputation:", error);
    return { records: 0 };
  }
}

/* ------------------------------
   Utility Functions
--------------------------------*/
async function fetchWithRetry(url, options, retries = CONFIG.MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }

      // If it's a rate limit error, wait longer
      if (response.status === 429) {
        const delay = Math.pow(2, i) * 1000; // Exponential backoff
        console.log(`⏳ Rate limited, waiting ${delay}ms before retry ${i + 1}/${retries}`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // For other errors, return the response
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;

      const delay = Math.pow(2, i) * 1000;
      console.log(`⏳ Request failed, retrying in ${delay}ms (${i + 1}/${retries})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

function normalizeMarketType(market) {
  if (!market) return "";
  const lower = market.toLowerCase();
  if (lower.includes("pass yard")) return "Passing Yards";
  if (lower.includes("rush yard")) return "Rushing Yards";
  if (lower.includes("rec yard")) return "Receiving Yards";
  if (lower.includes("comp")) return "Passing Completions";
  if (lower.includes("att")) return "Passing Attempts";
  if (lower.includes("td")) return "Touchdowns";
  if (lower.includes("point")) return "Points";
  if (lower.includes("rebound")) return "Rebounds";
  if (lower.includes("assist")) return "Assists";
  if (lower.includes("hit")) return "Hits";
  if (lower.includes("run")) return "Runs";
  if (lower.includes("rbi")) return "RBIs";
  if (lower.includes("home run")) return "Home Runs";
  if (lower.includes("strikeout")) return "Strikeouts";
  if (lower.includes("walk")) return "Walks";
  if (lower.includes("goal")) return "Goals";
  if (lower.includes("shot")) return "Shots";
  if (lower.includes("save")) return "Saves";
  return market;
}

function normalizeTeam(teamName, league) {
  if (!teamName) return teamName;

  const teamMaps = {
    NFL: {
      "Arizona Cardinals": "ARI",
      "Atlanta Falcons": "ATL",
      "Baltimore Ravens": "BAL",
      "Buffalo Bills": "BUF",
      "Carolina Panthers": "CAR",
      "Chicago Bears": "CHI",
      "Cincinnati Bengals": "CIN",
      "Cleveland Browns": "CLE",
      "Dallas Cowboys": "DAL",
      "Denver Broncos": "DEN",
      "Detroit Lions": "DET",
      "Green Bay Packers": "GB",
      "Houston Texans": "HOU",
      "Indianapolis Colts": "IND",
      "Jacksonville Jaguars": "JAX",
      "Kansas City Chiefs": "KC",
      "Las Vegas Raiders": "LV",
      "Los Angeles Chargers": "LAC",
      "Los Angeles Rams": "LAR",
      "Miami Dolphins": "MIA",
      "Minnesota Vikings": "MIN",
      "New England Patriots": "NE",
      "New Orleans Saints": "NO",
      "New York Giants": "NYG",
      "New York Jets": "NYJ",
      "Philadelphia Eagles": "PHI",
      "Pittsburgh Steelers": "PIT",
      "San Francisco 49ers": "SF",
      "Seattle Seahawks": "SEA",
      "Tampa Bay Buccaneers": "TB",
      "Tennessee Titans": "TEN",
      "Washington Commanders": "WAS",
    },
    NBA: {
      "Atlanta Hawks": "ATL",
      "Boston Celtics": "BOS",
      "Brooklyn Nets": "BKN",
      "Charlotte Hornets": "CHA",
      "Chicago Bulls": "CHI",
      "Cleveland Cavaliers": "CLE",
      "Dallas Mavericks": "DAL",
      "Denver Nuggets": "DEN",
      "Detroit Pistons": "DET",
      "Golden State Warriors": "GSW",
      "Houston Rockets": "HOU",
      "Indiana Pacers": "IND",
      "Los Angeles Clippers": "LAC",
      "Los Angeles Lakers": "LAL",
      "Memphis Grizzlies": "MEM",
      "Miami Heat": "MIA",
      "Milwaukee Bucks": "MIL",
      "Minnesota Timberwolves": "MIN",
      "New Orleans Pelicans": "NOP",
      "New York Knicks": "NYK",
      "Oklahoma City Thunder": "OKC",
      "Orlando Magic": "ORL",
      "Philadelphia 76ers": "PHI",
      "Phoenix Suns": "PHX",
      "Portland Trail Blazers": "POR",
      "Sacramento Kings": "SAC",
      "San Antonio Spurs": "SAS",
      "Toronto Raptors": "TOR",
      "Utah Jazz": "UTA",
      "Washington Wizards": "WAS",
    },
    MLB: {
      "Arizona Diamondbacks": "ARI",
      "Atlanta Braves": "ATL",
      "Baltimore Orioles": "BAL",
      "Boston Red Sox": "BOS",
      "Chicago Cubs": "CHC",
      "Chicago White Sox": "CWS",
      "Cincinnati Reds": "CIN",
      "Cleveland Guardians": "CLE",
      "Colorado Rockies": "COL",
      "Detroit Tigers": "DET",
      "Houston Astros": "HOU",
      "Kansas City Royals": "KC",
      "Los Angeles Angels": "LAA",
      "Los Angeles Dodgers": "LAD",
      "Miami Marlins": "MIA",
      "Milwaukee Brewers": "MIL",
      "Minnesota Twins": "MIN",
      "New York Mets": "NYM",
      "New York Yankees": "NYY",
      "Oakland Athletics": "OAK",
      "Philadelphia Phillies": "PHI",
      "Pittsburgh Pirates": "PIT",
      "San Diego Padres": "SD",
      "San Francisco Giants": "SF",
      "Seattle Mariners": "SEA",
      "St. Louis Cardinals": "STL",
      "Tampa Bay Rays": "TB",
      "Texas Rangers": "TEX",
      "Toronto Blue Jays": "TOR",
      "Washington Nationals": "WSH",
    },
    NHL: {
      "Anaheim Ducks": "ANA",
      "Arizona Coyotes": "ARI",
      "Boston Bruins": "BOS",
      "Buffalo Sabres": "BUF",
      "Calgary Flames": "CGY",
      "Carolina Hurricanes": "CAR",
      "Chicago Blackhawks": "CHI",
      "Colorado Avalanche": "COL",
      "Columbus Blue Jackets": "CBJ",
      "Dallas Stars": "DAL",
      "Detroit Red Wings": "DET",
      "Edmonton Oilers": "EDM",
      "Florida Panthers": "FLA",
      "Los Angeles Kings": "LAK",
      "Minnesota Wild": "MIN",
      "Montreal Canadiens": "MTL",
      "Nashville Predators": "NSH",
      "New Jersey Devils": "NJD",
      "New York Islanders": "NYI",
      "New York Rangers": "NYR",
      "Ottawa Senators": "OTT",
      "Philadelphia Flyers": "PHI",
      "Pittsburgh Penguins": "PIT",
      "San Jose Sharks": "SJ",
      "Seattle Kraken": "SEA",
      "St. Louis Blues": "STL",
      "Tampa Bay Lightning": "TB",
      "Toronto Maple Leafs": "TOR",
      "Vancouver Canucks": "VAN",
      "Vegas Golden Knights": "VGK",
      "Washington Capitals": "WSH",
      "Winnipeg Jets": "WPG",
    },
  };

  const leagueMap = teamMaps[league.toUpperCase()];
  return leagueMap?.[teamName] || teamName;
}

function normalizePlayerId(playerName) {
  if (!playerName) return "";
  return playerName.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseOdds(oddsStr) {
  if (!oddsStr) return null;

  const clean = oddsStr.toString().trim();
  if (!isNaN(clean)) {
    return parseInt(clean);
  }

  const match = clean.match(/^([+-]?)(\d+)$/);
  if (match) {
    const sign = match[1] === "-" ? -1 : 1;
    const value = parseInt(match[2]);
    return sign * value;
  }

  return null;
}

/**
 * Main execution function
 */
async function main() {
  try {
    await runBackfill();
    process.exit(0);
  } catch (error) {
    console.error("❌ Historical backfill failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { runBackfill, ingestSeasonLogs, ingestSeasonProps, precomputeAnalytics };
