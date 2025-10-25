/**
 * Analyze what we can do with just game logs data (since prop lines API is broken)
 */

import { createClient } from "@supabase/supabase-js";
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

async function analyzeGameLogsOnly() {
  console.log("📊 Analyzing Game Logs Data (Prop Lines API is Broken)");
  console.log("=".repeat(50));

  try {
    // Get comprehensive game logs analysis
    const { data: gameLogs, error: gameLogsError } = await supabase
      .from("playergamelogs")
      .select("player_id, player_name, prop_type, value, date, season")
      .order("date", { ascending: false });

    if (gameLogsError) {
      console.error("❌ Error fetching game logs:", gameLogsError);
      return;
    }

    console.log(`📊 Total game logs records: ${gameLogs?.length || 0}`);

    // Analyze unique players
    const uniquePlayers = [...new Set(gameLogs?.map((log) => log.player_id) || [])];
    console.log(`📊 Unique players: ${uniquePlayers.length}`);

    // Analyze prop types
    const uniquePropTypes = [...new Set(gameLogs?.map((log) => log.prop_type) || [])];
    console.log(`📊 Unique prop types: ${uniquePropTypes.length}`);
    console.log("📋 Prop types available:");
    uniquePropTypes.forEach((prop, i) => {
      console.log(`  ${i + 1}. ${prop}`);
    });

    // Analyze by season
    const playersBySeason = {};
    const recordsBySeason = {};
    gameLogs?.forEach((log) => {
      if (!playersBySeason[log.season]) {
        playersBySeason[log.season] = new Set();
        recordsBySeason[log.season] = 0;
      }
      playersBySeason[log.season].add(log.player_id);
      recordsBySeason[log.season]++;
    });

    console.log("\n📊 Data by season:");
    Object.entries(playersBySeason).forEach(([season, players]) => {
      console.log(
        `  ${season}: ${players.size} unique players, ${recordsBySeason[season]} records`,
      );
    });

    // Analyze top players by records
    const playerStats = {};
    gameLogs?.forEach((log) => {
      if (!playerStats[log.player_id]) {
        playerStats[log.player_id] = {
          name: log.player_name,
          records: 0,
          propTypes: new Set(),
        };
      }
      playerStats[log.player_id].records++;
      playerStats[log.player_id].propTypes.add(log.prop_type);
    });

    const topPlayers = Object.entries(playerStats)
      .sort(([, a], [, b]) => b.records - a.records)
      .slice(0, 20);

    console.log("\n📊 Top 20 players by record count:");
    topPlayers.forEach(([playerId, stats], i) => {
      console.log(
        `  ${i + 1}. ${stats.name} (${playerId}): ${stats.records} records, ${stats.propTypes.size} prop types`,
      );
    });

    // Analyze prop types by player
    const propTypeStats = {};
    gameLogs?.forEach((log) => {
      if (!propTypeStats[log.prop_type]) {
        propTypeStats[log.prop_type] = {
          records: 0,
          players: new Set(),
          avgValue: 0,
          totalValue: 0,
        };
      }
      propTypeStats[log.prop_type].records++;
      propTypeStats[log.prop_type].players.add(log.player_id);
      propTypeStats[log.prop_type].totalValue += Number(log.value) || 0;
    });

    // Calculate averages
    Object.keys(propTypeStats).forEach((propType) => {
      const stats = propTypeStats[propType];
      stats.avgValue = stats.totalValue / stats.records;
    });

    console.log("\n📊 Prop types analysis:");
    Object.entries(propTypeStats)
      .sort(([, a], [, b]) => b.records - a.records)
      .forEach(([propType, stats]) => {
        console.log(
          `  ${propType}: ${stats.records} records, ${stats.players.size} players, avg: ${stats.avgValue.toFixed(1)}`,
        );
      });

    // Check if we can do analytics without prop lines
    console.log("\n🎯 Analytics Potential (Without Prop Lines):");
    console.log("✅ We can calculate:");
    console.log("  - Player performance trends");
    console.log("  - Average values per prop type");
    console.log("  - Season-over-season comparisons");
    console.log("  - Player consistency metrics");

    console.log("\n❌ We cannot calculate (need prop lines):");
    console.log("  - Hit rates against sportsbook lines");
    console.log("  - Betting edge analysis");
    console.log("  - Over/under performance");
    console.log("  - Kelly criterion recommendations");

    // Show sample data for a specific player
    console.log("\n📋 Sample data for JAXON SMITHNJIGBA:");
    const jaxonData = gameLogs
      ?.filter((log) => log.player_name.includes("JAXON SMITHNJIGBA"))
      .slice(0, 10);
    if (jaxonData && jaxonData.length > 0) {
      jaxonData.forEach((log, i) => {
        console.log(`  ${i + 1}. ${log.date}: ${log.prop_type} = ${log.value}`);
      });
    } else {
      console.log("  No data found for JAXON SMITHNJIGBA");
    }

    console.log("\n🎉 Game logs analysis complete!");
    console.log("=".repeat(50));
  } catch (error) {
    console.error("❌ Fatal error during game logs analysis:", error);
  }
}

analyzeGameLogsOnly().catch(console.error);
