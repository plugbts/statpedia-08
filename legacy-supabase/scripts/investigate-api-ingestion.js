/**
 * Investigate why API ingestion is only returning limited players
 */

import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY,
);

const API_KEY = process.env.SPORTSGAMEODDS_API_KEY;

async function investigateApiIngestion() {
  console.log("🔍 Investigating API Ingestion - Why Only Limited Players?");
  console.log("=".repeat(60));

  try {
    // Test the game logs API directly
    console.log("\n📊 Testing Game Logs API:");

    // Test without any filters
    console.log("Testing: https://api.sportsgameodds.com/events?league=nfl&limit=100");
    const gameLogsResponse = await fetch(
      "https://api.sportsgameodds.com/events?league=nfl&limit=100",
      {
        headers: { "x-api-key": API_KEY },
      },
    );

    if (!gameLogsResponse.ok) {
      console.error(
        `❌ Game logs API error: ${gameLogsResponse.status} ${gameLogsResponse.statusText}`,
      );
    } else {
      const gameLogsData = await gameLogsResponse.json();
      console.log(`✅ Game logs API response: ${gameLogsData.data?.length || 0} events`);

      // Count unique players across all events
      let totalPlayers = 0;
      let uniquePlayers = new Set();

      for (const event of gameLogsData.data || []) {
        if (event.results?.game) {
          const playerCount = Object.keys(event.results.game).filter(
            (key) => key !== "away" && key !== "home",
          ).length;
          totalPlayers += playerCount;

          Object.keys(event.results.game).forEach((key) => {
            if (key !== "away" && key !== "home") {
              uniquePlayers.add(key);
            }
          });
        }
      }

      console.log(`📊 Total players across all events: ${totalPlayers}`);
      console.log(`📊 Unique players across all events: ${uniquePlayers.size}`);

      // Show sample players
      console.log("\n📋 Sample players from API:");
      Array.from(uniquePlayers)
        .slice(0, 10)
        .forEach((player, i) => {
          console.log(`  ${i + 1}. ${player}`);
        });
    }

    // Test the prop lines API directly
    console.log("\n🎯 Testing Prop Lines API:");

    // Test the v2 API that we're using
    console.log(
      "Testing: https://api.sportsgameodds.com/v2/events?apiKey=***&oddsAvailable=true&leagueID=NFL&season=2025&limit=100",
    );
    const propLinesResponse = await fetch(
      `https://api.sportsgameodds.com/v2/events?apiKey=${API_KEY}&oddsAvailable=true&leagueID=NFL&season=2025&limit=100`,
    );

    if (!propLinesResponse.ok) {
      console.error(
        `❌ Prop lines API error: ${propLinesResponse.status} ${propLinesResponse.statusText}`,
      );
    } else {
      const propLinesData = await propLinesResponse.json();
      console.log(`✅ Prop lines API response: ${propLinesData.events?.length || 0} events`);

      // Count unique players across all events
      let totalProps = 0;
      let uniquePropPlayers = new Set();

      for (const event of propLinesData.events || []) {
        for (const market of event.markets || []) {
          for (const prop of market.props || []) {
            totalProps++;
            if (prop.player?.id) {
              uniquePropPlayers.add(prop.player.id);
            }
          }
        }
      }

      console.log(`📊 Total props across all events: ${totalProps}`);
      console.log(`📊 Unique players across all events: ${uniquePropPlayers.size}`);

      // Show sample players
      console.log("\n📋 Sample prop players from API:");
      Array.from(uniquePropPlayers)
        .slice(0, 10)
        .forEach((player, i) => {
          console.log(`  ${i + 1}. ${player}`);
        });
    }

    // Check what's actually in our database
    console.log("\n🗄️ Database Analysis:");

    // Check game logs in database
    const { data: dbGameLogs, error: dbGameLogsError } = await supabase
      .from("playergamelogs")
      .select("player_id, player_name, date")
      .order("date", { ascending: false })
      .limit(20);

    if (dbGameLogsError) {
      console.error("❌ Database game logs error:", dbGameLogsError);
    } else {
      console.log(`📊 Database game logs: ${dbGameLogs?.length || 0} records`);
      console.log("\n📋 Sample database game logs:");
      dbGameLogs?.slice(0, 10).forEach((log, i) => {
        console.log(`  ${i + 1}. ${log.player_name} (${log.player_id}) - ${log.date}`);
      });
    }

    // Check prop lines in database
    const { data: dbPropLines, error: dbPropLinesError } = await supabase
      .from("proplines")
      .select("player_id, player_name, date")
      .order("date", { ascending: false })
      .limit(20);

    if (dbPropLinesError) {
      console.error("❌ Database prop lines error:", dbPropLinesError);
    } else {
      console.log(`🎯 Database prop lines: ${dbPropLines?.length || 0} records`);
      console.log("\n📋 Sample database prop lines:");
      dbPropLines?.slice(0, 10).forEach((prop, i) => {
        console.log(`  ${i + 1}. ${prop.player_name} (${prop.player_id}) - ${prop.date}`);
      });
    }

    // Check if we're filtering by date
    console.log("\n📅 Date Range Analysis:");

    const { data: gameLogsDates, error: gameLogsDatesError } = await supabase
      .from("playergamelogs")
      .select("date")
      .order("date", { ascending: false });

    const { data: propLinesDates, error: propLinesDatesError } = await supabase
      .from("proplines")
      .select("date")
      .order("date", { ascending: false });

    if (gameLogsDatesError || propLinesDatesError) {
      console.error("❌ Date analysis error:", gameLogsDatesError || propLinesDatesError);
    } else {
      const gameLogsDateRange =
        gameLogsDates?.length > 0
          ? {
              earliest: gameLogsDates[gameLogsDates.length - 1].date,
              latest: gameLogsDates[0].date,
            }
          : null;

      const propLinesDateRange =
        propLinesDates?.length > 0
          ? {
              earliest: propLinesDates[propLinesDates.length - 1].date,
              latest: propLinesDates[0].date,
            }
          : null;

      console.log("📊 Game logs date range:");
      if (gameLogsDateRange) {
        console.log(`  Earliest: ${gameLogsDateRange.earliest}`);
        console.log(`  Latest: ${gameLogsDateRange.latest}`);
      } else {
        console.log("  No date data");
      }

      console.log("\n🎯 Prop lines date range:");
      if (propLinesDateRange) {
        console.log(`  Earliest: ${propLinesDateRange.earliest}`);
        console.log(`  Latest: ${propLinesDateRange.latest}`);
      } else {
        console.log("  No date data");
      }
    }

    // Check if we're using pagination correctly
    console.log("\n📄 Pagination Analysis:");

    // Test if we can get more data with pagination
    console.log("Testing pagination on game logs API...");
    const gameLogsPage2Response = await fetch(
      "https://api.sportsgameodds.com/events?league=nfl&limit=100&cursor=2",
      {
        headers: { "x-api-key": API_KEY },
      },
    );

    if (gameLogsPage2Response.ok) {
      const gameLogsPage2Data = await gameLogsPage2Response.json();
      console.log(`✅ Game logs page 2: ${gameLogsPage2Data.data?.length || 0} events`);
      console.log(`📄 Has next cursor: ${gameLogsPage2Data.nextCursor ? "Yes" : "No"}`);
    } else {
      console.log("❌ Game logs page 2 failed");
    }

    console.log("\n🎉 API investigation complete!");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Fatal error during API investigation:", error);
  }
}

investigateApiIngestion().catch(console.error);
