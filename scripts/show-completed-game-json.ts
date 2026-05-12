#!/usr/bin/env tsx
import { config } from "dotenv";
import { aggregateMoneyPuckShotsForGame } from "../src/services/icura/early-goal/dataset";
import postgres from "postgres";

config();
config({ path: ".env.local" });

const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!conn) {
  console.error("No database URL");
  process.exit(1);
}

async function showGame() {
  const sql = postgres(conn, { prepare: false });

  try {
    // Get a game with shots and find its teams
    const gameResult = await sql`
      SELECT DISTINCT 
        game_external_id,
        team_abbr,
        opponent_abbr
      FROM public.moneypuck_shots
      WHERE game_time_seconds IS NOT NULL
        AND game_time_seconds <= 600
        AND team_abbr IS NOT NULL
      LIMIT 1
    `;

    if (gameResult.length === 0) {
      console.log("No games found");
      return;
    }

    const gameId = gameResult[0].game_external_id;
    const team1 = gameResult[0].team_abbr;

    // Get the other team
    const team2Result = await sql`
      SELECT DISTINCT team_abbr
      FROM public.moneypuck_shots
      WHERE game_external_id = ${gameId}
        AND team_abbr IS NOT NULL
        AND team_abbr != ${team1}
      LIMIT 1
    `;

    const team2 = team2Result[0]?.team_abbr || "UNK";

    // Determine home/away (arbitrary for this demo)
    const homeTeam = team1;
    const awayTeam = team2;

    console.log(`\n=== Game ${gameId}: ${awayTeam} @ ${homeTeam} ===\n`);

    // Aggregate MoneyPuck shots
    const gameStats = await aggregateMoneyPuckShotsForGame(gameId, homeTeam, awayTeam);

    // Get first shot times
    const firstShots = await sql`
      SELECT 
        team_abbr,
        MIN(game_time_seconds) as first_shot_time
      FROM public.moneypuck_shots
      WHERE game_external_id = ${gameId}
        AND game_time_seconds IS NOT NULL
        AND game_time_seconds <= 600
      GROUP BY team_abbr
    `;

    const homeFirstShot = firstShots.find((s) => s.team_abbr === homeTeam)?.first_shot_time || null;
    const awayFirstShot = firstShots.find((s) => s.team_abbr === awayTeam)?.first_shot_time || null;

    // Build feature row (simplified - just current game features)
    const featureRow = {
      gameId,
      dateISO: "2025-01-01", // Placeholder
      // Current game features
      home_team_xgf_first5_current: gameStats[homeTeam]?.xg_first5 || 0,
      home_team_xga_first5_current: gameStats[awayTeam]?.xg_first5 || 0,
      home_team_shots_first5_current: gameStats[homeTeam]?.shots_first5 || 0,
      home_team_high_danger_first5_current: gameStats[homeTeam]?.high_danger_first5 || 0,
      home_team_rush_chances_first5_current: gameStats[homeTeam]?.rush_chances_first5 || 0,
      home_team_time_to_first_shot: homeFirstShot,
      away_team_xgf_first5_current: gameStats[awayTeam]?.xg_first5 || 0,
      away_team_xga_first5_current: gameStats[homeTeam]?.xg_first5 || 0,
      away_team_shots_first5_current: gameStats[awayTeam]?.shots_first5 || 0,
      away_team_high_danger_first5_current: gameStats[awayTeam]?.high_danger_first5 || 0,
      away_team_rush_chances_first5_current: gameStats[awayTeam]?.rush_chances_first5 || 0,
      away_team_time_to_first_shot: awayFirstShot,
      home_team_xgf_first10_current: gameStats[homeTeam]?.xg_first10 || 0,
      home_team_xga_first10_current: gameStats[awayTeam]?.xg_first10 || 0,
      home_team_shots_first10_current: gameStats[homeTeam]?.shots_first10 || 0,
      home_team_high_danger_first10_current: gameStats[homeTeam]?.high_danger_first10 || 0,
      home_team_rush_chances_first10_current: gameStats[homeTeam]?.rush_chances_first10 || 0,
      away_team_xgf_first10_current: gameStats[awayTeam]?.xg_first10 || 0,
      away_team_xga_first10_current: gameStats[homeTeam]?.xg_first10 || 0,
      away_team_shots_first10_current: gameStats[awayTeam]?.shots_first10 || 0,
      away_team_high_danger_first10_current: gameStats[awayTeam]?.high_danger_first10 || 0,
      away_team_rush_chances_first10_current: gameStats[awayTeam]?.rush_chances_first10 || 0,
      // Historical (null for this demo)
      home_team_xgf_first10_last20: null,
      home_team_xga_first10_last20: null,
      home_team_rush_chances_first10_last20: null,
      home_team_high_danger_first10_last20: null,
      home_team_shot_attempts_first10: gameStats[homeTeam]?.shots_first10 || null,
      away_team_xgf_first10_last20: null,
      away_team_xga_first10_last20: null,
      away_team_rush_chances_first10_last20: null,
      away_team_high_danger_first10_last20: null,
      away_team_shot_attempts_first10: gameStats[awayTeam]?.shots_first10 || null,
      home_team_xgf_first5_last20: null,
      home_team_xga_first5_last20: null,
      home_team_rush_chances_first5_last20: null,
      home_team_high_danger_first5_last20: null,
      home_team_time_to_first_hd: null,
      home_team_time_to_first_rush: null,
      away_team_xgf_first5_last20: null,
      away_team_xga_first5_last20: null,
      away_team_rush_chances_first5_last20: null,
      away_team_high_danger_first5_last20: null,
      away_team_time_to_first_hd: null,
      away_team_time_to_first_rush: null,
    };

    // Output complete JSON
    console.log(
      JSON.stringify(
        {
          game: {
            gameId,
            homeTeam,
            awayTeam,
            dateISO: "2025-01-01",
          },
          features: {
            current_game: {
              g1f5: {
                home_xgf_first5: featureRow.home_team_xgf_first5_current,
                home_xga_first5: featureRow.home_team_xga_first5_current,
                home_shots_first5: featureRow.home_team_shots_first5_current,
                home_hd_first5: featureRow.home_team_high_danger_first5_current,
                home_rush_first5: featureRow.home_team_rush_chances_first5_current,
                home_time_to_first_shot: featureRow.home_team_time_to_first_shot,
                away_xgf_first5: featureRow.away_team_xgf_first5_current,
                away_xga_first5: featureRow.away_team_xga_first5_current,
                away_shots_first5: featureRow.away_team_shots_first5_current,
                away_hd_first5: featureRow.away_team_high_danger_first5_current,
                away_rush_first5: featureRow.away_team_rush_chances_first5_current,
                away_time_to_first_shot: featureRow.away_team_time_to_first_shot,
              },
              g1f10: {
                home_xgf_first10: featureRow.home_team_xgf_first10_current,
                home_xga_first10: featureRow.home_team_xga_first10_current,
                home_shots_first10: featureRow.home_team_shots_first10_current,
                home_hd_first10: featureRow.home_team_high_danger_first10_current,
                home_rush_first10: featureRow.home_team_rush_chances_first10_current,
                away_xgf_first10: featureRow.away_team_xgf_first10_current,
                away_xga_first10: featureRow.away_team_xga_first10_current,
                away_shots_first10: featureRow.away_team_shots_first10_current,
                away_hd_first10: featureRow.away_team_high_danger_first10_current,
                away_rush_first10: featureRow.away_team_rush_chances_first10_current,
              },
            },
            historical: {
              home_team_xgf_first10_last20: null,
              home_team_xga_first10_last20: null,
              away_team_xgf_first10_last20: null,
              away_team_xga_first10_last20: null,
            },
          },
          raw_probabilities: {
            note: "These would be calculated by estimateEarlyXG5/10 and runEarlyGoalEngineAsync",
            example_g1f5: {
              home_xg:
                featureRow.home_team_xgf_first5_current +
                featureRow.home_team_xga_first5_current * 0.45,
              away_xg:
                featureRow.away_team_xgf_first5_current +
                featureRow.away_team_xga_first5_current * 0.45,
            },
            example_g1f10: {
              home_xg:
                featureRow.home_team_xgf_first10_current +
                featureRow.home_team_xga_first10_current * 0.45,
              away_xg:
                featureRow.away_team_xgf_first10_current +
                featureRow.away_team_xga_first10_current * 0.45,
            },
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await sql.end({ timeout: 2 });
  }
}

showGame().then(() => process.exit(0));
