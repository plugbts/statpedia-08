/**
 * Check current data status after normalization
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

async function checkCurrentStatus() {
  console.log("🔍 Checking Current Data Status");
  console.log("=".repeat(50));

  try {
    // Check unique player counts
    console.log("\n📊 Player Counts:");

    const { data: gameLogsCount, error: gameLogsCountError } = await supabase
      .from("playergamelogs")
      .select("player_id", { count: "exact", head: true });

    const { data: propLinesCount, error: propLinesCountError } = await supabase
      .from("proplines")
      .select("player_id", { count: "exact", head: true });

    console.log(`📊 Unique players in playergamelogs: ${gameLogsCount || "Unknown"}`);
    console.log(`🎯 Unique players in proplines: ${propLinesCount || "Unknown"}`);

    // Check player ID map statistics
    console.log("\n🗺️ Player ID Map Statistics:");
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

    // Check overlap players
    console.log("\n🎯 Overlap Analysis:");
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
      .limit(20);

    if (overlapError) {
      console.error("❌ Error fetching overlap players:", overlapError);
    } else {
      console.log(`✅ Found ${overlapPlayers?.length || 0} overlapping players`);
      if (overlapPlayers && overlapPlayers.length > 0) {
        console.log("\n📋 Sample overlapping players:");
        overlapPlayers.slice(0, 10).forEach((player, i) => {
          console.log(
            `  ${i + 1}. ${player.player_name} (${player.player_id}) - ${player.prop_type}`,
          );
        });
      }
    }

    // Check prop type consistency
    console.log("\n🏷️ Prop Type Analysis:");
    const { data: gameLogsProps, error: gameLogsPropsError } = await supabase
      .from("playergamelogs")
      .select("prop_type")
      .order("prop_type");

    const { data: propLinesProps, error: propLinesPropsError } = await supabase
      .from("proplines")
      .select("prop_type")
      .order("prop_type");

    if (gameLogsPropsError || propLinesPropsError) {
      console.error("❌ Error fetching prop types:", gameLogsPropsError || propLinesPropsError);
    } else {
      const gameLogsPropTypes = [...new Set(gameLogsProps?.map((p) => p.prop_type) || [])];
      const propLinesPropTypes = [...new Set(propLinesProps?.map((p) => p.prop_type) || [])];

      console.log(`📊 Game logs prop types: ${gameLogsPropTypes.length}`);
      console.log(`🎯 Prop lines prop types: ${propLinesPropTypes.length}`);

      const commonProps = gameLogsPropTypes.filter((prop) => propLinesPropTypes.includes(prop));
      console.log(`✅ Common prop types: ${commonProps.length}`);

      if (commonProps.length > 0) {
        console.log("\n📋 Common prop types:");
        commonProps.forEach((prop) => console.log(`   - ${prop}`));
      }
    }

    // Check analytics records
    console.log("\n📈 Analytics Status:");
    const { data: analyticsCount, error: analyticsCountError } = await supabase
      .from("playeranalytics")
      .select("id", { count: "exact", head: true });

    if (analyticsCountError) {
      console.error("❌ Error fetching analytics count:", analyticsCountError);
    } else {
      console.log(`📊 Total analytics records: ${analyticsCount || "Unknown"}`);
    }

    console.log("\n🎉 Status check complete!");
    console.log("=".repeat(50));
  } catch (error) {
    console.error("❌ Fatal error during status check:", error);
  }
}

checkCurrentStatus().catch(console.error);
