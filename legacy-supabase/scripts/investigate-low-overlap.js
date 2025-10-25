/**
 * Investigate why overlap count is only 19 instead of hundreds
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

async function investigateLowOverlap() {
  console.log("🔍 Investigating Low Overlap Count (Expected: Hundreds, Actual: 19)");
  console.log("=".repeat(60));

  try {
    // Check total unique players in each table
    console.log("\n📊 Total Player Counts:");

    const { data: allGameLogs, error: gameLogsError } = await supabase
      .from("playergamelogs")
      .select("player_id");

    const { data: allPropLines, error: propLinesError } = await supabase
      .from("proplines")
      .select("player_id");

    if (gameLogsError || propLinesError) {
      console.error("❌ Error fetching all players:", gameLogsError || propLinesError);
    } else {
      const gameLogsUnique = [...new Set(allGameLogs?.map((p) => p.player_id) || [])];
      const propLinesUnique = [...new Set(allPropLines?.map((p) => p.player_id) || [])];

      console.log(`📊 Game Logs: ${gameLogsUnique.length} unique players`);
      console.log(`🎯 Prop Lines: ${propLinesUnique.length} unique players`);
      console.log(
        `✅ Overlap: ${gameLogsUnique.filter((id) => propLinesUnique.includes(id)).length} players`,
      );

      // Show the actual overlap percentage
      const overlapPercentage = (
        (gameLogsUnique.filter((id) => propLinesUnique.includes(id)).length /
          gameLogsUnique.length) *
        100
      ).toFixed(1);
      console.log(`📈 Overlap Percentage: ${overlapPercentage}% of game logs players`);
    }

    // Check what leagues we have data for
    console.log("\n🏈 League Coverage Analysis:");

    const { data: gameLogsLeagues, error: gameLogsLeaguesError } = await supabase
      .from("playergamelogs")
      .select("player_id, player_name")
      .limit(50);

    const { data: propLinesLeagues, error: propLinesLeaguesError } = await supabase
      .from("proplines")
      .select("player_id, player_name")
      .limit(50);

    if (gameLogsLeaguesError || propLinesLeaguesError) {
      console.error(
        "❌ Error fetching league data:",
        gameLogsLeaguesError || propLinesLeaguesError,
      );
    } else {
      console.log("📊 Game Logs Players (sample):");
      gameLogsLeagues?.forEach((log, i) => {
        console.log(`  ${i + 1}. ${log.player_name}: ${log.player_id}`);
      });

      console.log("\n🎯 Prop Lines Players (sample):");
      propLinesLeagues?.forEach((prop, i) => {
        console.log(`  ${i + 1}. ${prop.player_name}: ${prop.player_id}`);
      });
    }

    // Check if we have data from different leagues/sports
    console.log("\n🔍 League/Sport Analysis:");

    // Check game logs for different sports
    const { data: gameLogsSports, error: gameLogsSportsError } = await supabase
      .from("playergamelogs")
      .select("player_id")
      .or("player_id.like.*_NFL,player_id.like.*_NBA,player_id.like.*_MLB,player_id.like.*_NHL");

    // Check prop lines for different sports
    const { data: propLinesSports, error: propLinesSportsError } = await supabase
      .from("proplines")
      .select("player_id")
      .or("player_id.like.*_NFL,player_id.like.*_NBA,player_id.like.*_MLB,player_id.like.*_NHL");

    if (gameLogsSportsError || propLinesSportsError) {
      console.error("❌ Error fetching sports data:", gameLogsSportsError || propLinesSportsError);
    } else {
      const gameLogsNFL = gameLogsSports?.filter((p) => p.player_id.includes("_NFL")).length || 0;
      const gameLogsNBA = gameLogsSports?.filter((p) => p.player_id.includes("_NBA")).length || 0;
      const gameLogsMLB = gameLogsSports?.filter((p) => p.player_id.includes("_MLB")).length || 0;
      const gameLogsNHL = gameLogsSports?.filter((p) => p.player_id.includes("_NHL")).length || 0;

      const propLinesNFL = propLinesSports?.filter((p) => p.player_id.includes("_NFL")).length || 0;
      const propLinesNBA = propLinesSports?.filter((p) => p.player_id.includes("_NBA")).length || 0;
      const propLinesMLB = propLinesSports?.filter((p) => p.player_id.includes("_MLB")).length || 0;
      const propLinesNHL = propLinesSports?.filter((p) => p.player_id.includes("_NHL")).length || 0;

      console.log("📊 Game Logs by Sport:");
      console.log(`  NFL: ${gameLogsNFL} players`);
      console.log(`  NBA: ${gameLogsNBA} players`);
      console.log(`  MLB: ${gameLogsMLB} players`);
      console.log(`  NHL: ${gameLogsNHL} players`);

      console.log("\n🎯 Prop Lines by Sport:");
      console.log(`  NFL: ${propLinesNFL} players`);
      console.log(`  NBA: ${propLinesNBA} players`);
      console.log(`  MLB: ${propLinesMLB} players`);
      console.log(`  NHL: ${propLinesNHL} players`);
    }

    // Check if the issue is that we're only getting limited data from the API
    console.log("\n🔍 API Data Coverage Analysis:");

    // Check how many records we have per league
    const { data: gameLogsCount, error: gameLogsCountError } = await supabase
      .from("playergamelogs")
      .select("id", { count: "exact", head: true });

    const { data: propLinesCount, error: propLinesCountError } = await supabase
      .from("proplines")
      .select("id", { count: "exact", head: true });

    if (gameLogsCountError || propLinesCountError) {
      console.error("❌ Error fetching counts:", gameLogsCountError || propLinesCountError);
    } else {
      console.log(`📊 Total Game Logs Records: ${gameLogsCount || "Unknown"}`);
      console.log(`🎯 Total Prop Lines Records: ${propLinesCount || "Unknown"}`);

      // Calculate records per unique player
      const gameLogsPlayers = [...new Set(allGameLogs?.map((p) => p.player_id) || [])].length;
      const propLinesPlayers = [...new Set(allPropLines?.map((p) => p.player_id) || [])].length;

      if (gameLogsPlayers > 0) {
        console.log(`📊 Avg Game Logs per Player: ${(gameLogsCount / gameLogsPlayers).toFixed(1)}`);
      }
      if (propLinesPlayers > 0) {
        console.log(
          `🎯 Avg Prop Lines per Player: ${(propLinesCount / propLinesPlayers).toFixed(1)}`,
        );
      }
    }

    // Check specific players that should have overlap
    console.log("\n🎯 Specific Player Analysis:");

    // Check for some common NFL players
    const commonPlayers = ["JOSH ALLEN", "PATRICK MAHOMES", "LAMAR JACKSON", "AARON RODGERS"];

    for (const playerName of commonPlayers) {
      const { data: gameLogsPlayer, error: gameLogsPlayerError } = await supabase
        .from("playergamelogs")
        .select("player_id, player_name")
        .ilike("player_name", `%${playerName}%`)
        .limit(3);

      const { data: propLinesPlayer, error: propLinesPlayerError } = await supabase
        .from("proplines")
        .select("player_id, player_name")
        .ilike("player_name", `%${playerName}%`)
        .limit(3);

      if (gameLogsPlayerError || propLinesPlayerError) {
        console.error(
          `❌ Error checking ${playerName}:`,
          gameLogsPlayerError || propLinesPlayerError,
        );
      } else {
        const hasGameLogs = gameLogsPlayer?.length > 0;
        const hasPropLines = propLinesPlayer?.length > 0;

        console.log(`${playerName}:`);
        console.log(
          `  Game Logs: ${hasGameLogs ? "✅" : "❌"} (${gameLogsPlayer?.length || 0} records)`,
        );
        console.log(
          `  Prop Lines: ${hasPropLines ? "✅" : "❌"} (${propLinesPlayer?.length || 0} records)`,
        );
        console.log(`  Overlap: ${hasGameLogs && hasPropLines ? "✅" : "❌"}`);
      }
    }

    console.log("\n🎉 Investigation complete!");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Fatal error during investigation:", error);
  }
}

investigateLowOverlap().catch(console.error);
