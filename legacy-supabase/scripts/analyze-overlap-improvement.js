/**
 * Analyze the overlap improvement and identify remaining issues
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

async function analyzeOverlapImprovement() {
  console.log("🔍 Analyzing Overlap Improvement (15 → 18)");
  console.log("=".repeat(50));

  try {
    // Check current overlap details
    console.log("\n🎯 Current Overlap Analysis:");
    const { data: overlapPlayers, error: overlapError } = await supabase
      .from("playergamelogs")
      .select(
        `
        player_id,
        player_name,
        prop_type,
        proplines!inner(player_id)
      `,
      )
      .limit(25);

    if (overlapError) {
      console.error("❌ Error fetching overlap players:", overlapError);
    } else {
      console.log(`✅ Found ${overlapPlayers?.length || 0} overlapping player/prop combinations:`);
      overlapPlayers?.forEach((player, i) => {
        console.log(
          `${i + 1}. ${player.player_name} - ${player.prop_type} (ID: ${player.player_id})`,
        );
      });
    }

    // Check unique player counts in each table
    console.log("\n📊 Unique Player Counts:");

    // Get unique players from game logs
    const { data: gameLogsPlayers, error: gameLogsError } = await supabase
      .from("playergamelogs")
      .select("player_id")
      .order("player_id");

    // Get unique players from prop lines
    const { data: propLinesPlayers, error: propLinesError } = await supabase
      .from("proplines")
      .select("player_id")
      .order("player_id");

    if (gameLogsError || propLinesError) {
      console.error("❌ Error fetching player counts:", gameLogsError || propLinesError);
    } else {
      const gameLogsUnique = [...new Set(gameLogsPlayers?.map((p) => p.player_id) || [])];
      const propLinesUnique = [...new Set(propLinesPlayers?.map((p) => p.player_id) || [])];

      console.log(`📊 Game Logs: ${gameLogsUnique.length} unique players`);
      console.log(`🎯 Prop Lines: ${propLinesUnique.length} unique players`);
      console.log(
        `✅ Overlap: ${gameLogsUnique.filter((id) => propLinesUnique.includes(id)).length} players`,
      );

      // Show some examples of non-overlapping players
      console.log("\n📋 Sample Non-Overlapping Players:");
      const nonOverlapping = gameLogsUnique.filter((id) => !propLinesUnique.includes(id));
      console.log(`Game logs players not in prop lines (${nonOverlapping.length}):`);
      nonOverlapping.slice(0, 10).forEach((id, i) => {
        console.log(`  ${i + 1}. ${id}`);
      });

      const nonOverlappingProps = propLinesUnique.filter((id) => !gameLogsUnique.includes(id));
      console.log(`\nProp lines players not in game logs (${nonOverlappingProps.length}):`);
      nonOverlappingProps.slice(0, 10).forEach((id, i) => {
        console.log(`  ${i + 1}. ${id}`);
      });
    }

    // Check if there are still unmapped players
    console.log("\n🗺️ Player ID Mapping Status:");
    const { data: mappingStats, error: mappingStatsError } = await supabase
      .from("player_id_map")
      .select("source")
      .order("source");

    if (mappingStatsError) {
      console.error("❌ Error fetching mapping stats:", mappingStatsError);
    } else {
      const sourceCounts = mappingStats.reduce((acc, item) => {
        acc[item.source] = (acc[item.source] || 0) + 1;
        return acc;
      }, {});

      Object.entries(sourceCounts).forEach(([source, count]) => {
        console.log(`   ${source}: ${count} mappings`);
      });
    }

    // Check for players that might need mapping
    console.log("\n🔍 Checking for Players That Need Mapping:");

    // Check game logs for players that might not be mapped
    const { data: unmappedGameLogs, error: unmappedGameLogsError } = await supabase
      .from("playergamelogs")
      .select("player_id, player_name")
      .not("player_id", "like", "%-%") // IDs without canonical format
      .limit(10);

    if (unmappedGameLogsError) {
      console.error("❌ Error fetching unmapped game logs:", unmappedGameLogsError);
    } else {
      console.log(
        `📊 Game logs players that might need mapping (${unmappedGameLogs?.length || 0}):`,
      );
      unmappedGameLogs?.forEach((player, i) => {
        console.log(`  ${i + 1}. ${player.player_name}: ${player.player_id}`);
      });
    }

    // Check prop lines for players that might not be mapped
    const { data: unmappedPropLines, error: unmappedPropLinesError } = await supabase
      .from("proplines")
      .select("player_id, player_name")
      .not("player_id", "like", "%-%") // IDs without canonical format
      .limit(10);

    if (unmappedPropLinesError) {
      console.error("❌ Error fetching unmapped prop lines:", unmappedPropLinesError);
    } else {
      console.log(
        `🎯 Prop lines players that might need mapping (${unmappedPropLines?.length || 0}):`,
      );
      unmappedPropLines?.forEach((player, i) => {
        console.log(`  ${i + 1}. ${player.player_name}: ${player.player_id}`);
      });
    }

    console.log("\n🎉 Overlap analysis complete!");
    console.log("=".repeat(50));
  } catch (error) {
    console.error("❌ Fatal error during overlap analysis:", error);
  }
}

analyzeOverlapImprovement().catch(console.error);
