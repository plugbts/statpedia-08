/**
 * Debug NFL prop lines specifically
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

async function debugNFLProps() {
  console.log("🔍 Debugging NFL prop lines specifically...");

  try {
    // Get all unique NFL players from prop lines
    const { data: nflProps, error: nflError } = await supabase
      .from("proplines")
      .select("player_name, player_id")
      .eq("season", 2025)
      .like("player_id", "%_NFL")
      .limit(20);

    if (nflError) {
      console.error("❌ NFL props error:", nflError);
      return;
    }

    console.log("\n🏈 NFL players from prop lines:");
    nflProps?.forEach((player, i) => {
      console.log(`  ${i + 1}. "${player.player_name}" (ID: ${player.player_id})`);
    });

    // Get all unique players from game logs
    const { data: gameLogPlayers, error: gameLogError } = await supabase
      .from("playergamelogs")
      .select("player_name, player_id")
      .eq("season", 2025)
      .limit(20);

    if (gameLogError) {
      console.error("❌ Game logs error:", gameLogError);
      return;
    }

    console.log("\n📊 Sample players from game logs:");
    gameLogPlayers?.forEach((player, i) => {
      console.log(`  ${i + 1}. "${player.player_name}" (ID: ${player.player_id})`);
    });

    // Check for any matches
    const gameLogPlayerIds = new Set(gameLogPlayers?.map((p) => p.player_id) || []);
    const nflPropPlayerIds = new Set(nflProps?.map((p) => p.player_id) || []);

    const matches = [...gameLogPlayerIds].filter((id) => nflPropPlayerIds.has(id));

    console.log("\n🎯 Player ID matches found:");
    console.log(`  Game log players: ${gameLogPlayerIds.size}`);
    console.log(`  NFL prop players: ${nflPropPlayerIds.size}`);
    console.log(`  Matches: ${matches.length}`);

    if (matches.length > 0) {
      console.log("  Matching IDs:", matches);
    }
  } catch (error) {
    console.error("❌ Fatal error:", error);
  }
}

debugNFLProps().catch(console.error);
