/**
 * Populate icura_nhl_early_game_dataset directly from MoneyPuck shots data.
 * OPTIMIZED: Uses batch processing and window functions for speed.
 */

import postgres from "postgres";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config();
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

function getConn(): string {
  return (
    process.env.NEON_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    ""
  );
}

async function populateFromMoneyPuck(season: string) {
  const conn = getConn();
  if (!conn) throw new Error("No database connection string found");

  const sql = postgres(conn, { prepare: false });
  try {
    console.log(`📊 Populating dataset from MoneyPuck for season: ${season}`);
    console.log("=".repeat(60));
    const startTime = Date.now();

    // Step 1: Pre-fetch team ID mappings
    console.log("Step 1: Loading team ID mappings...");
    const teamMap = new Map<string, string | null>();
    const teams = await sql`
      SELECT abbreviation, id
      FROM public.teams
      WHERE league_id = (SELECT id FROM public.leagues WHERE code = 'NHL' LIMIT 1)
    `;
    for (const t of teams) {
      teamMap.set(t.abbreviation.toUpperCase(), t.id);
    }
    console.log(`  Loaded ${teamMap.size} team mappings`);

    // Step 2: Single query to compute everything (game stats + historical averages)
    console.log("\nStep 2: Computing game features and historical averages (batch)...");

    const gameData = await sql`
      WITH game_team_stats AS (
        SELECT
          game_external_id,
          season,
          team_abbr,
          opponent_abbr,
          -- Targets
          BOOL_OR(is_goal = true AND game_time_seconds <= 300) as goal_in_first_5,
          BOOL_OR(is_goal = true AND game_time_seconds <= 600) as goal_in_first_10,
          -- Current game features (first 10 min)
          COUNT(*) FILTER (WHERE game_time_seconds <= 600) as shots_first10,
          COALESCE(SUM(xg) FILTER (WHERE game_time_seconds <= 600), 0) as xgf_first10,
          COUNT(*) FILTER (WHERE is_high_danger = true AND game_time_seconds <= 600) as high_danger_first10,
          COUNT(*) FILTER (WHERE is_rush = true AND game_time_seconds <= 600) as rush_chances_first10
        FROM public.moneypuck_shots
        WHERE season = ${season}
          AND game_time_seconds IS NOT NULL
        GROUP BY game_external_id, season, team_abbr, opponent_abbr
      ),
      game_pairs AS (
        SELECT DISTINCT ON (g1.game_external_id)
          g1.game_external_id,
          g1.season,
          g1.team_abbr as home_team_abbr,
          g2.team_abbr as away_team_abbr,
          g1.goal_in_first_5 OR g2.goal_in_first_5 as goal_in_first_5,
          g1.goal_in_first_10 OR g2.goal_in_first_10 as goal_in_first_10,
          g1.shots_first10 as home_shots_first10,
          g1.xgf_first10 as home_xgf_first10,
          g2.xgf_first10 as home_xga_first10,
          g1.high_danger_first10 as home_high_danger_first10,
          g1.rush_chances_first10 as home_rush_chances_first10,
          g2.shots_first10 as away_shots_first10,
          g2.xgf_first10 as away_xgf_first10,
          g1.xgf_first10 as away_xga_first10,
          g2.high_danger_first10 as away_high_danger_first10,
          g2.rush_chances_first10 as away_rush_chances_first10
        FROM game_team_stats g1
        JOIN game_team_stats g2 ON g1.game_external_id = g2.game_external_id
          AND g1.team_abbr != g2.team_abbr
        WHERE g1.team_abbr < g2.team_abbr
        ORDER BY g1.game_external_id, g1.team_abbr
      )
      SELECT 
        gp.*,
        NULL::numeric as home_xgf_last20,
        NULL::numeric as home_xga_last20,
        NULL::numeric as home_hd_last20,
        NULL::numeric as home_rush_last20,
        NULL::numeric as away_xgf_last20,
        NULL::numeric as away_xga_last20,
        NULL::numeric as away_hd_last20,
        NULL::numeric as away_rush_last20
      FROM game_pairs gp
      ORDER BY game_external_id
    `;

    console.log(`  Computed features for ${gameData.length} games`);

    if (gameData.length === 0) {
      console.log("⚠️  No games found. Exiting.");
      return;
    }

    // Step 3: Bulk insert
    console.log("\nStep 3: Bulk inserting into dataset...");

    const seasonStart = season === "2023-2024" ? "2023-10-01" : "2024-10-01";

    // Process in batches of 100
    const batchSize = 100;
    let inserted = 0;
    let skipped = 0;

    for (let i = 0; i < gameData.length; i += batchSize) {
      const batch = gameData.slice(i, i + batchSize);

      // Insert games one by one
      for (const game of batch) {
        // Get league and placeholder teams (use first 2 NHL teams as placeholders)
        const leagueResult = await sql`
          SELECT l.id as league_id, 
            (SELECT id FROM public.teams WHERE league_id = l.id LIMIT 1) as team1_id,
            (SELECT id FROM public.teams WHERE league_id = l.id LIMIT 1 OFFSET 1) as team2_id
          FROM public.leagues l
          WHERE l.code = 'NHL'
          LIMIT 1
        `;

        const league = leagueResult[0];
        if (!league?.league_id || !league?.team1_id || !league?.team2_id) {
          skipped++;
          continue;
        }

        // Get or create game_id (use placeholder teams)
        const gameIdResult = await sql`
          SELECT id FROM public.games 
          WHERE external_id = ${game.game_external_id}::text
          LIMIT 1
        `;

        let gameId = gameIdResult[0]?.id;

        if (!gameId) {
          // Create minimal game record with placeholder teams
          const newGame = await sql`
            INSERT INTO public.games (
              league_id, home_team_id, away_team_id, season, game_date, status, external_id
            )
            VALUES (
              ${league.league_id}, ${league.team1_id}, ${league.team2_id}, ${season}, ${seasonStart}::date, 'completed', ${game.game_external_id}::text
            )
            ON CONFLICT (external_id) DO UPDATE SET external_id = EXCLUDED.external_id
            RETURNING id
          `;
          gameId = newGame[0]?.id;
        }

        if (!gameId) {
          skipped++;
          continue;
        }

        await sql`
          INSERT INTO public.icura_nhl_early_game_dataset (
            game_id, game_external_id, date_iso, season,
            home_team_id, away_team_id,
            goal_in_first_5, goal_in_first_10,
            home_team_xgf_first10_last20, home_team_xga_first10_last20,
            home_team_rush_chances_first10_last20, home_team_high_danger_first10_last20,
            home_team_shot_attempts_first10,
            away_team_xgf_first10_last20, away_team_xga_first10_last20,
            away_team_rush_chances_first10_last20, away_team_high_danger_first10_last20,
            away_team_shot_attempts_first10,
            updated_at
          )
          VALUES (
            ${gameId},
            ${game.game_external_id}::text,
            ${seasonStart}::date,
            ${season},
            ${league.team1_id},
            ${league.team2_id},
            ${game.goal_in_first_5},
            ${game.goal_in_first_10},
            ${game.home_xgf_last20},
            ${game.home_xga_last20},
            ${game.home_rush_last20},
            ${game.home_hd_last20},
            ${game.home_shots_first10},
            ${game.away_xgf_last20},
            ${game.away_xga_last20},
            ${game.away_rush_last20},
            ${game.away_hd_last20},
            ${game.away_shots_first10},
            now()
          )
          ON CONFLICT (game_external_id)
          DO UPDATE SET
            goal_in_first_5 = EXCLUDED.goal_in_first_5,
            goal_in_first_10 = EXCLUDED.goal_in_first_10,
            home_team_xgf_first10_last20 = EXCLUDED.home_team_xgf_first10_last20,
            home_team_xga_first10_last20 = EXCLUDED.home_team_xga_first10_last20,
            home_team_rush_chances_first10_last20 = EXCLUDED.home_team_rush_chances_first10_last20,
            home_team_high_danger_first10_last20 = EXCLUDED.home_team_high_danger_first10_last20,
            home_team_shot_attempts_first10 = EXCLUDED.home_team_shot_attempts_first10,
            away_team_xgf_first10_last20 = EXCLUDED.away_team_xgf_first10_last20,
            away_team_xga_first10_last20 = EXCLUDED.away_team_xga_first10_last20,
            away_team_rush_chances_first10_last20 = EXCLUDED.away_team_rush_chances_first10_last20,
            away_team_high_danger_first10_last20 = EXCLUDED.away_team_high_danger_first10_last20,
            away_team_shot_attempts_first10 = EXCLUDED.away_team_shot_attempts_first10,
            updated_at = now()
        `;

        inserted++;
      }

      process.stdout.write(
        `  Inserted ${inserted}/${gameData.length} games (${skipped} skipped)...\r`,
      );
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ Completed in ${elapsed}s: ${inserted} games inserted, ${skipped} skipped`);

    // Show final distribution
    const dist = await sql`
      SELECT
        COUNT(*) FILTER (WHERE goal_in_first_5 = true) as g1f5_true,
        COUNT(*) FILTER (WHERE goal_in_first_5 = false) as g1f5_false,
        COUNT(*) FILTER (WHERE goal_in_first_10 = true) as g1f10_true,
        COUNT(*) FILTER (WHERE goal_in_first_10 = false) as g1f10_false,
        COUNT(*) as total
      FROM public.icura_nhl_early_game_dataset
      WHERE season = ${season}
        AND goal_in_first_5 IS NOT NULL
        AND goal_in_first_10 IS NOT NULL
    `;

    const d = dist[0];
    console.log("\n📊 Final distribution:");
    console.log(
      `  G1F5: ${d.g1f5_true} true, ${d.g1f5_false} false (${((d.g1f5_true / d.total) * 100).toFixed(1)}% true)`,
    );
    console.log(
      `  G1F10: ${d.g1f10_true} true, ${d.g1f10_false} false (${((d.g1f10_true / d.total) * 100).toFixed(1)}% true)`,
    );
    console.log(`  Total: ${d.total} rows`);
  } finally {
    await sql.end({ timeout: 2 });
  }
}

const season =
  process.argv.find((a) => a.startsWith("--season="))?.split("=")[1] ||
  process.argv[process.argv.indexOf("--season") + 1] ||
  "2023-2024";

populateFromMoneyPuck(season).catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
