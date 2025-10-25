/**
 * Debug player names in both game logs and prop lines
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

async function debugPlayerNames() {
  console.log("🔍 Debugging player names in game logs vs prop lines...");

  try {
    // Get sample player names from game logs
    const { data: gameLogPlayers, error: gameLogError } = await supabase
      .from("playergamelogs")
      .select("player_name, player_id")
      .eq("season", 2025)
      .limit(10);

    if (gameLogError) {
      console.error("❌ Game logs error:", gameLogError);
      return;
    }

    console.log("\n📊 Sample players from game logs:");
    gameLogPlayers?.forEach((player, i) => {
      console.log(`  ${i + 1}. "${player.player_name}" (ID: ${player.player_id})`);
    });

    // Get sample player names from prop lines
    const { data: propLinePlayers, error: propLineError } = await supabase
      .from("proplines")
      .select("player_name, player_id")
      .eq("season", 2025)
      .limit(10);

    if (propLineError) {
      console.error("❌ Prop lines error:", propLineError);
      return;
    }

    console.log("\n🎯 Sample players from prop lines:");
    propLinePlayers?.forEach((player, i) => {
      console.log(`  ${i + 1}. "${player.player_name}" (ID: ${player.player_id})`);
    });

    // Check if JAXON SMITHNJIGBA exists in both
    const { data: jaxonGameLogs } = await supabase
      .from("playergamelogs")
      .select("player_name, player_id, prop_type")
      .eq("season", 2025)
      .ilike("player_name", "%jaxon%")
      .limit(5);

    const { data: jaxonProps } = await supabase
      .from("proplines")
      .select("player_name, player_id, prop_type")
      .eq("season", 2025)
      .ilike("player_name", "%jaxon%")
      .limit(5);

    console.log("\n🔍 JAXON SMITHNJIGBA comparison:");
    console.log("Game logs:", jaxonGameLogs?.length || 0, "records");
    console.log("Prop lines:", jaxonProps?.length || 0, "records");

    if (jaxonGameLogs?.length > 0) {
      console.log("Game log sample:", jaxonGameLogs[0]);
    }
    if (jaxonProps?.length > 0) {
      console.log("Prop line sample:", jaxonProps[0]);
    }
  } catch (error) {
    console.error("❌ Fatal error:", error);
  }
}

debugPlayerNames().catch(console.error);
