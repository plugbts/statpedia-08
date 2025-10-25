/**
 * Debug prop types in both tables
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

async function debugPropTypes() {
  console.log("🔍 Debugging Prop Types");
  console.log("=".repeat(50));

  try {
    // Check game logs prop types
    console.log("\n📊 Game Logs Prop Types:");
    const { data: gameLogsProps, error: gameLogsPropsError } = await supabase
      .from("playergamelogs")
      .select("prop_type")
      .order("prop_type");

    if (gameLogsPropsError) {
      console.error("❌ Error fetching game logs props:", gameLogsPropsError);
    } else {
      const gameLogsPropTypes = [...new Set(gameLogsProps?.map((p) => p.prop_type) || [])];
      console.log(`📊 Found ${gameLogsPropTypes.length} unique prop types:`);
      gameLogsPropTypes.forEach((prop) => console.log(`   - ${prop}`));
    }

    // Check prop lines prop types (sample)
    console.log("\n🎯 Prop Lines Prop Types (sample):");
    const { data: propLinesProps, error: propLinesPropsError } = await supabase
      .from("proplines")
      .select("prop_type")
      .limit(100)
      .order("prop_type");

    if (propLinesPropsError) {
      console.error("❌ Error fetching prop lines props:", propLinesPropsError);
    } else {
      const propLinesPropTypes = [...new Set(propLinesProps?.map((p) => p.prop_type) || [])];
      console.log(`🎯 Found ${propLinesPropTypes.length} unique prop types (from sample):`);
      propLinesPropTypes.slice(0, 20).forEach((prop) => console.log(`   - ${prop}`));
      if (propLinesPropTypes.length > 20) {
        console.log(`   ... and ${propLinesPropTypes.length - 20} more`);
      }
    }

    // Check specific overlapping players
    console.log("\n🎯 Overlapping Players Analysis:");
    const { data: overlappingPlayers, error: overlapError } = await supabase
      .from("playergamelogs")
      .select("player_id, player_name, prop_type")
      .in("player_id", ["JAXON_SMITHNJIGBA-UNK", "JAXON SMITHNJIGBA-UNK"]);

    if (overlapError) {
      console.error("❌ Error fetching overlapping players:", overlapError);
    } else {
      console.log(`✅ Found ${overlappingPlayers?.length || 0} records for overlapping players:`);
      overlappingPlayers?.forEach((player) => {
        console.log(`   - ${player.player_name} (${player.player_id}) - ${player.prop_type}`);
      });
    }

    // Check prop lines for the same players
    console.log("\n🎯 Prop Lines for Overlapping Players:");
    const { data: propLinesForPlayers, error: propLinesError } = await supabase
      .from("proplines")
      .select("player_id, player_name, prop_type")
      .in("player_id", ["JAXON_SMITHNJIGBA-UNK", "JAXON SMITHNJIGBA-UNK"]);

    if (propLinesError) {
      console.error("❌ Error fetching prop lines for players:", propLinesError);
    } else {
      console.log(`✅ Found ${propLinesForPlayers?.length || 0} prop line records:`);
      propLinesForPlayers?.forEach((prop) => {
        console.log(`   - ${prop.player_name} (${prop.player_id}) - ${prop.prop_type}`);
      });
    }

    console.log("\n🎉 Prop type debugging complete!");
    console.log("=".repeat(50));
  } catch (error) {
    console.error("❌ Fatal error during prop type debugging:", error);
  }
}

debugPropTypes().catch(console.error);
