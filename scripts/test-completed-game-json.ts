#!/usr/bin/env tsx
import { config } from "dotenv";
import { buildEarlyGameFeatureRowFromDbHistory } from "../src/services/icura/early-goal/dataset";
import { runEarlyGoalEngineAsync } from "../src/services/icura/early-goal/engine";
import { fetchIcuraUnifiedNhlDay } from "../src/services/icura/unified/unified-icura-nhl";
import postgres from "postgres";

config();
config({ path: ".env.local" });

const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!conn) {
  console.error("No database URL");
  process.exit(1);
}

async function findGameWithShots() {
  const sql = postgres(conn, { prepare: false });
  try {
    // Find a game that has MoneyPuck shots
    const gameResult = await sql`
      SELECT DISTINCT game_external_id
      FROM public.moneypuck_shots
      WHERE game_time_seconds IS NOT NULL
        AND game_time_seconds <= 600
      LIMIT 1
    `;

    if (gameResult.length === 0) {
      console.log("No games with MoneyPuck shots found");
      return null;
    }

    return gameResult[0].game_external_id;
  } finally {
    await sql.end({ timeout: 2 });
  }
}

async function testGame() {
  const gameId = await findGameWithShots();
  if (!gameId) {
    console.log("No game found");
    return;
  }

  console.log(`\n=== Testing Game ${gameId} ===\n`);

  // Try to find this game in the unified API by checking multiple dates
  const dates = ["2025-01-01", "2024-12-20", "2024-12-15", "2024-12-10", "2024-12-01"];

  for (const date of dates) {
    try {
      const packages = await fetchIcuraUnifiedNhlDay(date);
      const gamePkg = packages.find((p) => p.game.gameId === gameId);

      if (gamePkg) {
        console.log(`Found game ${gameId} on date ${date}`);

        // Resolve team IDs
        const sql = postgres(conn, { prepare: false });
        try {
          const homeTeam = await sql`
            SELECT t.id
            FROM public.teams t
            JOIN public.leagues l ON t.league_id = l.id
            WHERE UPPER(t.abbreviation) = UPPER(${gamePkg.game.homeTeamAbbr})
              AND UPPER(l.code) = 'NHL'
            LIMIT 1
          `;
          const awayTeam = await sql`
            SELECT t.id
            FROM public.teams t
            JOIN public.leagues l ON t.league_id = l.id
            WHERE UPPER(t.abbreviation) = UPPER(${gamePkg.game.awayTeamAbbr})
              AND UPPER(l.code) = 'NHL'
            LIMIT 1
          `;

          const homeTeamId = homeTeam[0]?.id;
          const awayTeamId = awayTeam[0]?.id;

          if (!homeTeamId || !awayTeamId) {
            console.log("Could not resolve team IDs");
            return;
          }

          // Build feature row
          const featureRow = await buildEarlyGameFeatureRowFromDbHistory({
            gamePkg,
            homeTeamId,
            awayTeamId,
          });

          // Get prediction
          const prediction = await runEarlyGoalEngineAsync(featureRow);

          // Output full JSON
          console.log("\n=== COMPLETE GAME JSON ===\n");
          console.log(
            JSON.stringify(
              {
                game: {
                  gameId: gamePkg.game.gameId,
                  homeTeam: gamePkg.game.homeTeamAbbr,
                  awayTeam: gamePkg.game.awayTeamAbbr,
                  dateISO: gamePkg.game.dateISO,
                },
                features: {
                  current_game: {
                    g1f5: {
                      home_xgf_first5: (featureRow as any).home_team_xgf_first5_current,
                      home_xga_first5: (featureRow as any).home_team_xga_first5_current,
                      home_shots_first5: (featureRow as any).home_team_shots_first5_current,
                      home_hd_first5: (featureRow as any).home_team_high_danger_first5_current,
                      home_rush_first5: (featureRow as any).home_team_rush_chances_first5_current,
                      home_time_to_first_shot: featureRow.home_team_time_to_first_shot,
                      away_xgf_first5: (featureRow as any).away_team_xgf_first5_current,
                      away_xga_first5: (featureRow as any).away_team_xga_first5_current,
                      away_shots_first5: (featureRow as any).away_team_shots_first5_current,
                      away_hd_first5: (featureRow as any).away_team_high_danger_first5_current,
                      away_rush_first5: (featureRow as any).away_team_rush_chances_first5_current,
                      away_time_to_first_shot: featureRow.away_team_time_to_first_shot,
                    },
                    g1f10: {
                      home_xgf_first10: (featureRow as any).home_team_xgf_first10_current,
                      home_xga_first10: (featureRow as any).home_team_xga_first10_current,
                      home_shots_first10: (featureRow as any).home_team_shots_first10_current,
                      home_hd_first10: (featureRow as any).home_team_high_danger_first10_current,
                      home_rush_first10: (featureRow as any).home_team_rush_chances_first10_current,
                      away_xgf_first10: (featureRow as any).away_team_xgf_first10_current,
                      away_xga_first10: (featureRow as any).away_team_xga_first10_current,
                      away_shots_first10: (featureRow as any).away_team_shots_first10_current,
                      away_hd_first10: (featureRow as any).away_team_high_danger_first10_current,
                      away_rush_first10: (featureRow as any).away_team_rush_chances_first10_current,
                    },
                  },
                },
                probabilities: {
                  g1f5: {
                    poisson_p5: prediction.poisson_p5,
                    ml_p5: prediction.ml_p5,
                    raw_prob: prediction.p_g1f5_raw,
                    calibrated_prob: prediction.p_g1f5,
                  },
                  g1f10: {
                    poisson_p10: prediction.poisson_p10,
                    ml_p10: prediction.ml_p10,
                    raw_prob: prediction.p_g1f10_raw,
                    calibrated_prob: prediction.p_g1f10,
                  },
                },
              },
              null,
              2,
            ),
          );

          return;
        } finally {
          await sql.end({ timeout: 2 });
        }
      }
    } catch (e) {
      // Continue to next date
    }
  }

  console.log(`Game ${gameId} not found in unified API for any test date`);
}

testGame().then(() => process.exit(0));
