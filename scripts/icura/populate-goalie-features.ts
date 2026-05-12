#!/usr/bin/env tsx
/**
 * Populate goalie early-game tendency features for G1F10 model
 *
 * Extracts goalie IDs from MoneyPuck shots data and calculates:
 * - First shot save percentage
 * - First 3 shots save percentage
 * - Rebound rate
 * - Rush save percentage
 * - Screened save percentage
 *
 * Usage:
 *   tsx scripts/icura/populate-goalie-features.ts --season 2024-2025
 */

import "dotenv/config";
import postgres from "postgres";

function getConn(): string {
  return (
    process.env.NEON_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    ""
  );
}

async function populateGoalieFeatures(season: string) {
  const conn = getConn();
  if (!conn) throw new Error("No database connection string found");

  const sql = postgres(conn, { prepare: false });
  try {
    console.log(`⚡ Populating goalie features for season: ${season}`);
    console.log("=".repeat(60));

    // Get games that need goalie features (limit to prevent hanging)
    const games = await sql`
      SELECT 
        d.game_external_id,
        d.home_team_id,
        d.away_team_id,
        d.date_iso
      FROM public.icura_nhl_early_game_dataset d
      WHERE d.season = ${season}
        AND (d.home_goalie_first_shot_save_pct IS NULL 
          OR d.away_goalie_first_shot_save_pct IS NULL)
      ORDER BY d.date_iso DESC
      LIMIT 50
    `;

    console.log(`Found ${games.length} games to process\n`);

    if (games.length === 0) {
      console.log("✅ All goalie features already populated or no games found\n");
      return;
    }

    // Batch get team abbreviations for all games at once
    const gameIds = games.map((g) => g.game_external_id);
    const teamMap = await sql`
      SELECT DISTINCT
        game_external_id,
        team_abbr,
        ROW_NUMBER() OVER (PARTITION BY game_external_id ORDER BY team_abbr) as rn
      FROM public.moneypuck_shots
      WHERE game_external_id = ANY(${gameIds})
        AND team_abbr IS NOT NULL
    `;

    // Create lookup map
    const teamsByGame = new Map<string, string[]>();
    for (const row of teamMap) {
      if (!teamsByGame.has(row.game_external_id)) {
        teamsByGame.set(row.game_external_id, []);
      }
      teamsByGame.get(row.game_external_id)!.push(row.team_abbr);
    }

    let updated = 0;
    const startTime = Date.now();
    for (let i = 0; i < games.length; i++) {
      const game = games[i];
      try {
        // Get team abbreviations from map
        const teamAbbrs = teamsByGame.get(game.game_external_id) || [];
        if (teamAbbrs.length < 2) {
          if (i % 10 === 0) console.log(`  Skipping game ${i + 1}/${games.length} (no team data)`);
          continue;
        }

        const homeTeamAbbr = teamAbbrs[0];
        const awayTeamAbbr = teamAbbrs[1];

        // Get starting goalies and calculate features in one query per goalie
        // Home goalie faces shots from away team
        const homeGoalieData = await sql`
          WITH goalie_shots AS (
            SELECT 
              goalie_name,
              game_time_seconds,
              is_goal,
              is_rush,
              is_rebound,
              is_high_danger,
              xg,
              ROW_NUMBER() OVER (PARTITION BY goalie_name ORDER BY game_time_seconds) as shot_num
            FROM public.moneypuck_shots
            WHERE game_external_id = ${game.game_external_id}
              AND game_time_seconds IS NOT NULL
              AND game_time_seconds <= 600
              AND goalie_name IS NOT NULL
              AND team_abbr = ${awayTeamAbbr}
          ),
          goalie_counts AS (
            SELECT goalie_name, COUNT(*) as shot_count
            FROM goalie_shots
            GROUP BY goalie_name
          )
          SELECT 
            gs.goalie_name,
            gc.shot_count,
            -- First shot
            MAX(CASE WHEN gs.shot_num = 1 THEN CASE WHEN gs.is_goal = false THEN 1.0 ELSE 0.0 END END) as first_shot_save,
            -- First 3 shots
            AVG(CASE WHEN gs.shot_num <= 3 THEN CASE WHEN gs.is_goal = false THEN 1.0 ELSE 0.0 END END) as first_3_save_pct,
            -- Rebound rate
            AVG(CASE WHEN gs.is_rebound = true THEN 1.0 ELSE 0.0 END) as rebound_rate,
            -- Rush save %
            AVG(CASE WHEN gs.is_rush = true THEN CASE WHEN gs.is_goal = false THEN 1.0 ELSE 0.0 END END) as rush_save_pct,
            -- Screened save % (high xG)
            AVG(CASE WHEN gs.xg > 0.15 THEN CASE WHEN gs.is_goal = false THEN 1.0 ELSE 0.0 END END) as screened_save_pct
          FROM goalie_shots gs
          JOIN goalie_counts gc ON gs.goalie_name = gc.goalie_name
          GROUP BY gs.goalie_name, gc.shot_count
          ORDER BY gc.shot_count DESC
          LIMIT 1
        `;

        // Away goalie faces shots from home team
        const awayGoalieData = await sql`
          WITH goalie_shots AS (
            SELECT 
              goalie_name,
              game_time_seconds,
              is_goal,
              is_rush,
              is_rebound,
              is_high_danger,
              xg,
              ROW_NUMBER() OVER (PARTITION BY goalie_name ORDER BY game_time_seconds) as shot_num
            FROM public.moneypuck_shots
            WHERE game_external_id = ${game.game_external_id}
              AND game_time_seconds IS NOT NULL
              AND game_time_seconds <= 600
              AND goalie_name IS NOT NULL
              AND team_abbr = ${homeTeamAbbr}
          ),
          goalie_counts AS (
            SELECT goalie_name, COUNT(*) as shot_count
            FROM goalie_shots
            GROUP BY goalie_name
          )
          SELECT 
            gs.goalie_name,
            gc.shot_count,
            -- First shot
            MAX(CASE WHEN gs.shot_num = 1 THEN CASE WHEN gs.is_goal = false THEN 1.0 ELSE 0.0 END END) as first_shot_save,
            -- First 3 shots
            AVG(CASE WHEN gs.shot_num <= 3 THEN CASE WHEN gs.is_goal = false THEN 1.0 ELSE 0.0 END END) as first_3_save_pct,
            -- Rebound rate
            AVG(CASE WHEN gs.is_rebound = true THEN 1.0 ELSE 0.0 END) as rebound_rate,
            -- Rush save %
            AVG(CASE WHEN gs.is_rush = true THEN CASE WHEN gs.is_goal = false THEN 1.0 ELSE 0.0 END END) as rush_save_pct,
            -- Screened save % (high xG)
            AVG(CASE WHEN gs.xg > 0.15 THEN CASE WHEN gs.is_goal = false THEN 1.0 ELSE 0.0 END END) as screened_save_pct
          FROM goalie_shots gs
          JOIN goalie_counts gc ON gs.goalie_name = gc.goalie_name
          GROUP BY gs.goalie_name, gc.shot_count
          ORDER BY gc.shot_count DESC
          LIMIT 1
        `;

        const homeGoalie = homeGoalieData[0];
        const awayGoalie = awayGoalieData[0];

        if (!homeGoalie && !awayGoalie) {
          if (i % 10 === 0)
            console.log(`  Skipping game ${i + 1}/${games.length} (no goalie data)`);
          continue;
        }

        // Extract features
        const homeFeatures = homeGoalie
          ? {
              first_shot_save_pct: homeGoalie.first_shot_save,
              first_3_shots_save_pct: homeGoalie.first_3_save_pct,
              rebound_rate_first10: homeGoalie.rebound_rate,
              rush_save_pct_first10: homeGoalie.rush_save_pct,
              screened_save_pct_first10: homeGoalie.screened_save_pct,
            }
          : {
              first_shot_save_pct: null,
              first_3_shots_save_pct: null,
              rebound_rate_first10: null,
              rush_save_pct_first10: null,
              screened_save_pct_first10: null,
            };

        const awayFeatures = awayGoalie
          ? {
              first_shot_save_pct: awayGoalie.first_shot_save,
              first_3_shots_save_pct: awayGoalie.first_3_save_pct,
              rebound_rate_first10: awayGoalie.rebound_rate,
              rush_save_pct_first10: awayGoalie.rush_save_pct,
              screened_save_pct_first10: awayGoalie.screened_save_pct,
            }
          : {
              first_shot_save_pct: null,
              first_3_shots_save_pct: null,
              rebound_rate_first10: null,
              rush_save_pct_first10: null,
              screened_save_pct_first10: null,
            };

        // Update dataset with goalie features
        await sql`
          UPDATE public.icura_nhl_early_game_dataset
          SET
            home_goalie_first_shot_save_pct = ${homeFeatures.first_shot_save_pct},
            home_goalie_first_3_shots_save_pct = ${homeFeatures.first_3_shots_save_pct},
            home_goalie_rebound_rate_first10 = ${homeFeatures.rebound_rate_first10},
            home_goalie_rush_save_pct_first10 = ${homeFeatures.rush_save_pct_first10},
            home_goalie_screened_save_pct_first10 = ${homeFeatures.screened_save_pct_first10},
            away_goalie_first_shot_save_pct = ${awayFeatures.first_shot_save_pct},
            away_goalie_first_3_shots_save_pct = ${awayFeatures.first_3_shots_save_pct},
            away_goalie_rebound_rate_first10 = ${awayFeatures.rebound_rate_first10},
            away_goalie_rush_save_pct_first10 = ${awayFeatures.rush_save_pct_first10},
            away_goalie_screened_save_pct_first10 = ${awayFeatures.screened_save_pct_first10},
            updated_at = now()
          WHERE game_external_id = ${game.game_external_id}
        `;

        updated++;
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        if (updated % 10 === 0 || i === games.length - 1) {
          const rate = (updated / (Date.now() - startTime)) * 1000;
          console.log(
            `  Progress: ${updated}/${games.length} games (${((updated / games.length) * 100).toFixed(1)}%) - ${rate.toFixed(2)} games/sec`,
          );
        }
      } catch (e: any) {
        console.error(`  Error processing game ${game.game_external_id}:`, e.message);
        // Continue processing other games
      }
    }

    console.log(`\n✅ Completed: Updated ${updated} games with goalie features`);
  } finally {
    await sql.end({ timeout: 2 });
  }
}

const season =
  process.argv.find((a) => a.startsWith("--season="))?.split("=")[1] ||
  process.argv[process.argv.indexOf("--season") + 1] ||
  "2024-2025";

populateGoalieFeatures(season).catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
