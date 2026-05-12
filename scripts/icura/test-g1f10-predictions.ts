#!/usr/bin/env tsx
/**
 * Test G1F10 predictions with new features
 *
 * Verifies that the model loads correctly and can make predictions
 *
 * Usage:
 *   export ICURA_EARLY_GOAL_ML_ARTIFACT=icura_early_goal_logreg_g1f10.json
 *   tsx scripts/icura/test-g1f10-predictions.ts
 */

import "dotenv/config";
import { runEarlyGoalEngineAsync } from "../../src/services/icura/early-goal/engine";
import { buildEarlyGameFeatureRowFromDbHistory } from "../../src/services/icura/early-goal/dataset";
import type { IcuraUnifiedGamePackage } from "../../src/services/icura/unified/types";
import postgres from "postgres";

function getConn(): string {
  return (
    process.env.NEON_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    ""
  );
}

async function testPredictions() {
  const conn = getConn();
  if (!conn) {
    console.error("❌ No database connection found");
    process.exit(1);
  }

  const sql = postgres(conn, { prepare: false });
  try {
    console.log("🧪 Testing G1F10 Predictions with New Features");
    console.log("=".repeat(60));
    console.log("");

    // Get a sample game from the dataset
    const sampleGame = await sql`
      SELECT 
        d.game_external_id,
        d.game_id,
        d.home_team_id,
        d.away_team_id,
        d.date_iso,
        d.goal_in_first_10,
        -- Check if new features are populated
        d.home_goalie_first_shot_save_pct,
        d.ref_penalties_first10_avg,
        d.home_top_line_xgf_first10_last20,
        d.penalty_volatility_index,
        d.home_b2b_travel
      FROM public.icura_nhl_early_game_dataset d
      WHERE d.goal_in_first_10 IS NOT NULL
        AND d.date_iso >= '2023-10-01'
      ORDER BY d.date_iso DESC
      LIMIT 1
    `;

    if (sampleGame.length === 0) {
      console.log("⚠️  No games found in dataset");
      return;
    }

    const game = sampleGame[0];
    console.log(`📊 Testing with game: ${game.game_external_id}`);
    console.log(`   Date: ${game.date_iso}`);
    console.log(`   Actual G1F10: ${game.goal_in_first_10 ? "YES" : "NO"}`);
    console.log("");

    // Check feature availability
    console.log("🔍 Feature Availability:");
    console.log(
      `   Goalie features: ${game.home_goalie_first_shot_save_pct !== null ? "✅" : "❌"}`,
    );
    console.log(`   Referee features: ${game.ref_penalties_first10_avg !== null ? "✅" : "❌"}`);
    console.log(
      `   Shift features: ${game.home_top_line_xgf_first10_last20 !== null ? "✅" : "❌"}`,
    );
    console.log(`   Penalty volatility: ${game.penalty_volatility_index !== null ? "✅" : "❌"}`);
    console.log(`   Travel features: ${game.home_b2b_travel !== null ? "✅" : "❌"}`);
    console.log("");

    // Create a mock game package for testing
    // In production, this would come from the unified game package
    const mockGamePackage: IcuraUnifiedGamePackage = {
      game: {
        gameId: game.game_external_id,
        dateISO: game.date_iso,
        homeTeamAbbr: "HOME", // Would need to look up
        awayTeamAbbr: "AWAY",
        season: "2023-2024",
      },
      events: [],
    };

    // Build feature row
    console.log("🔧 Building feature row...");
    const featureRow = await buildEarlyGameFeatureRowFromDbHistory({
      gamePkg: mockGamePackage,
      homeTeamId: game.home_team_id,
      awayTeamId: game.away_team_id,
    });

    console.log("✅ Feature row built");
    console.log("");

    // Run prediction
    console.log("🤖 Running G1F10 prediction...");
    const prediction = await runEarlyGoalEngineAsync(featureRow);

    console.log("");
    console.log("📈 Prediction Results:");
    console.log(`   P(G1F10): ${(prediction.p_g1f10 * 100).toFixed(1)}%`);
    console.log(`   P(G1F5): ${(prediction.p_g1f5 * 100).toFixed(1)}%`);
    console.log(`   Fair Odds G1F10: ${prediction.fair_odds_g1f10.toFixed(2)}`);
    console.log(`   Fair Odds G1F5: ${prediction.fair_odds_g1f5.toFixed(2)}`);
    console.log("");
    console.log("🎯 Key Factors:");
    prediction.reasons.slice(0, 5).forEach((reason, i) => {
      console.log(`   ${i + 1}. ${reason}`);
    });
    console.log("");

    // Compare with actual
    const predictedYes = prediction.p_g1f10 >= 0.5;
    const actualYes = game.goal_in_first_10;
    const correct = predictedYes === actualYes;

    console.log("✅ Prediction Test:");
    console.log(
      `   Predicted: ${predictedYes ? "YES" : "NO"} (${(prediction.p_g1f10 * 100).toFixed(1)}%)`,
    );
    console.log(`   Actual: ${actualYes ? "YES" : "NO"}`);
    console.log(`   Result: ${correct ? "✅ CORRECT" : "❌ INCORRECT"}`);
    console.log("");

    console.log("✅ Model test complete!");
  } catch (e: any) {
    console.error("❌ Test failed:", e.message);
    console.error(e.stack);
    process.exit(1);
  } finally {
    await sql.end({ timeout: 2 });
  }
}

testPredictions().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
