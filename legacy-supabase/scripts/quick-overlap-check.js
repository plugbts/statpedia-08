/**
 * Quick overlap check to see current status
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

async function quickOverlapCheck() {
  console.log("⚡ Quick Overlap Check");
  console.log("=".repeat(30));

  try {
    // Get sample of player IDs from each table
    console.log("\n📊 Sample Player IDs from Game Logs:");
    const { data: gameLogs, error: gameLogsError } = await supabase
      .from("playergamelogs")
      .select("player_id, player_name")
      .limit(10);

    if (gameLogsError) {
      console.error("❌ Game logs error:", gameLogsError);
    } else {
      gameLogs?.forEach((log, i) => {
        console.log(`${i + 1}. ${log.player_name}: ${log.player_id}`);
      });
    }

    console.log("\n🎯 Sample Player IDs from Prop Lines:");
    const { data: propLines, error: propLinesError } = await supabase
      .from("proplines")
      .select("player_id, player_name")
      .limit(10);

    if (propLinesError) {
      console.error("❌ Prop lines error:", propLinesError);
    } else {
      propLines?.forEach((prop, i) => {
        console.log(`${i + 1}. ${prop.player_name}: ${prop.player_id}`);
      });
    }

    // Check if JAXON SMITHNJIGBA is now properly mapped
    console.log("\n🎯 JAXON SMITHNJIGBA Check:");
    const { data: jaxonGameLogs, error: jaxonGameLogsError } = await supabase
      .from("playergamelogs")
      .select("player_id, player_name")
      .or("player_name.ilike.%jaxon%")
      .limit(3);

    const { data: jaxonPropLines, error: jaxonPropLinesError } = await supabase
      .from("proplines")
      .select("player_id, player_name")
      .or("player_name.ilike.%jaxon%")
      .limit(3);

    if (jaxonGameLogsError || jaxonPropLinesError) {
      console.error("❌ Jaxon check error:", jaxonGameLogsError || jaxonPropLinesError);
    } else {
      console.log("Game logs:");
      jaxonGameLogs?.forEach((log, i) => {
        console.log(`  ${i + 1}. ${log.player_name}: ${log.player_id}`);
      });
      console.log("Prop lines:");
      jaxonPropLines?.forEach((prop, i) => {
        console.log(`  ${i + 1}. ${prop.player_name}: ${prop.player_id}`);
      });

      // Check if IDs match
      if (jaxonGameLogs?.length > 0 && jaxonPropLines?.length > 0) {
        const gameLogId = jaxonGameLogs[0].player_id;
        const propLineId = jaxonPropLines[0].player_id;
        if (gameLogId === propLineId) {
          console.log("✅ JAXON SMITHNJIGBA IDs now match!");
        } else {
          console.log("❌ JAXON SMITHNJIGBA IDs still don't match");
          console.log(`   Game logs: ${gameLogId}`);
          console.log(`   Prop lines: ${propLineId}`);
        }
      }
    }

    console.log("\n🎉 Quick check complete!");
    console.log("=".repeat(30));
  } catch (error) {
    console.error("❌ Fatal error during quick check:", error);
  }
}

quickOverlapCheck().catch(console.error);
