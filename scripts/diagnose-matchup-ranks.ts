#!/usr/bin/env tsx

/**
 * Diagnose why matchup ranks aren't computing:
 * - Check if opponent_id is populated in player_game_logs
 * - Check prop type normalization
 * - Check season alignment
 * - Test the actual computation query
 */

import { config as dotenvConfig } from "dotenv";

dotenvConfig({ path: ".env.local" });

async function getSupabaseConnection(): Promise<string> {
  const candidates = [
    process.env.SUPABASE_DATABASE_URL,
    process.env.NEON_DATABASE_URL,
    process.env.DATABASE_URL,
  ].filter(Boolean) as string[];

  if (!candidates.length) {
    throw new Error("No DB URL found");
  }

  const postgres = (await import("postgres")).default;
  for (const url of candidates) {
    const probe = postgres(url, { prepare: false, max: 1 });
    try {
      await probe`select 1 as ok`;
      await probe.end({ timeout: 1 });
      console.log("[diagnose] ✅ Connected to database");
      return url;
    } catch (e: any) {
      await probe.end({ timeout: 1 }).catch(() => {});
    }
  }

  throw new Error("All DB URL candidates failed");
}

async function main() {
  const connectionString = await getSupabaseConnection();
  const postgres = (await import("postgres")).default;
  const client = postgres(connectionString, { prepare: false });

  try {
    console.log("\n[diagnose] Checking opponent_id population in player_game_logs...\n");

    // 1. Check overall opponent_id population
    const overall = (await client.unsafe(`
      SELECT 
        COUNT(*)::bigint AS total_logs,
        COUNT(opponent_id)::bigint AS logs_with_opponent,
        COUNT(*) FILTER (WHERE opponent_id IS NOT NULL)::bigint AS logs_with_opponent_filter,
        ROUND(100.0 * COUNT(opponent_id) / NULLIF(COUNT(*), 0), 2) AS pct_with_opponent
      FROM public.player_game_logs
    `)) as Array<{
      total_logs: number;
      logs_with_opponent: number;
      logs_with_opponent_filter: number;
      pct_with_opponent: number;
    }>;

    console.log("Overall opponent_id coverage:");
    console.log(JSON.stringify(overall[0], null, 2));

    // 2. Check NFL-specific
    const nfl = (await client.unsafe(`
      SELECT 
        COUNT(*)::bigint AS total_logs,
        COUNT(pgl.opponent_id)::bigint AS logs_with_opponent,
        ROUND(100.0 * COUNT(pgl.opponent_id) / NULLIF(COUNT(*), 0), 2) AS pct_with_opponent,
        COUNT(DISTINCT pgl.opponent_id)::int AS unique_opponents
      FROM public.player_game_logs pgl
      JOIN public.teams t ON t.id = pgl.opponent_id
      JOIN public.leagues l ON l.id = t.league_id
      WHERE UPPER(l.code) = 'NFL' OR UPPER(COALESCE(l.abbreviation, l.code)) = 'NFL'
    `)) as Array<{
      total_logs: number;
      logs_with_opponent: number;
      pct_with_opponent: number;
      unique_opponents: number;
    }>;

    console.log("\nNFL logs with opponent_id (via join):");
    console.log(JSON.stringify(nfl[0], null, 2));

    // 3. Check NFL logs where opponent_id is directly populated (no join requirement)
    const nflDirect = (await client.unsafe(`
      SELECT 
        COUNT(*)::bigint AS total_logs,
        COUNT(pgl.opponent_id)::bigint AS logs_with_opponent,
        ROUND(100.0 * COUNT(pgl.opponent_id) / NULLIF(COUNT(*), 0), 2) AS pct_with_opponent,
        COUNT(DISTINCT pgl.opponent_id)::int AS unique_opponents
      FROM public.player_game_logs pgl
      WHERE EXISTS (
        SELECT 1 FROM public.games g
        JOIN public.leagues l ON l.id = g.league_id
        WHERE g.id = pgl.game_id
          AND (UPPER(l.code) = 'NFL' OR UPPER(COALESCE(l.abbreviation, l.code)) = 'NFL')
      )
    `)) as Array<{
      total_logs: number;
      logs_with_opponent: number;
      pct_with_opponent: number;
      unique_opponents: number;
    }>;

    console.log("\nNFL logs (direct check, no join requirement):");
    console.log(JSON.stringify(nflDirect[0], null, 2));

    // 4. Check by season
    const bySeason = (await client.unsafe(`
      SELECT 
        pgl.season,
        COUNT(*)::bigint AS total_logs,
        COUNT(pgl.opponent_id)::bigint AS logs_with_opponent,
        ROUND(100.0 * COUNT(pgl.opponent_id) / NULLIF(COUNT(*), 0), 2) AS pct_with_opponent
      FROM public.player_game_logs pgl
      WHERE EXISTS (
        SELECT 1 FROM public.games g
        JOIN public.leagues l ON l.id = g.league_id
        WHERE g.id = pgl.game_id
          AND (UPPER(l.code) = 'NFL' OR UPPER(COALESCE(l.abbreviation, l.code)) = 'NFL')
      )
      GROUP BY pgl.season
      ORDER BY pgl.season DESC
      LIMIT 5
    `)) as Array<{
      season: string;
      total_logs: number;
      logs_with_opponent: number;
      pct_with_opponent: number;
    }>;

    console.log("\nNFL logs by season (top 5):");
    for (const row of bySeason) {
      console.log(
        `  ${row.season}: ${row.logs_with_opponent}/${row.total_logs} (${row.pct_with_opponent}%)`,
      );
    }

    // 5. Test the actual computation query for a specific prop type
    const testPropType = "receiving yards";
    const testSeason = "2024";
    console.log(
      `\n[diagnose] Testing computation query for: ${testPropType} (season ${testSeason})`,
    );

    const testQuery = (await client.unsafe(
      `
      WITH per_game AS (
        SELECT
          pgl.opponent_id AS team_id,
          pgl.game_id,
          SUM(pgl.actual_value::numeric) AS allowed
        FROM public.player_game_logs pgl
        JOIN public.teams t ON t.id = pgl.opponent_id
        JOIN public.leagues l ON l.id = t.league_id
        WHERE pgl.season = $1
          AND LOWER(TRIM(pgl.prop_type)) = $2
          AND (UPPER(l.code) = 'NFL' OR UPPER(COALESCE(l.abbreviation, l.code)) = 'NFL')
          AND pgl.opponent_id IS NOT NULL
        GROUP BY pgl.opponent_id, pgl.game_id
      ),
      per_team AS (
        SELECT
          team_id,
          AVG(allowed) AS allowed_per_game,
          COUNT(*)::int AS games_tracked
        FROM per_game
        GROUP BY team_id
      ),
      ranked AS (
        SELECT
          team_id,
          games_tracked,
          allowed_per_game,
          RANK() OVER (ORDER BY allowed_per_game ASC) AS rank
        FROM per_team
      )
      SELECT 
        r.team_id,
        t.abbreviation AS team_abbr,
        r.rank::int AS rank,
        r.games_tracked,
        r.allowed_per_game
      FROM ranked r
      JOIN public.teams t ON t.id = r.team_id
      ORDER BY r.rank
      LIMIT 10
    `,
      [testSeason, testPropType],
    )) as Array<{
      team_id: string;
      team_abbr: string;
      rank: number;
      games_tracked: number;
      allowed_per_game: string | number;
    }>;

    if (testQuery.length === 0) {
      console.log(`  ❌ Query returned 0 rows for ${testPropType} (season ${testSeason})`);
      console.log(`  This means either:`);
      console.log(`    - No logs have opponent_id populated for this prop type`);
      console.log(`    - Prop type normalization doesn't match`);
      console.log(`    - Season doesn't match`);
    } else {
      console.log(`  ✅ Query returned ${testQuery.length} teams:`);
      for (const row of testQuery.slice(0, 5)) {
        const apg =
          typeof row.allowed_per_game === "number"
            ? row.allowed_per_game
            : Number(String(row.allowed_per_game));
        console.log(
          `    ${row.team_abbr}: rank=${row.rank}, games=${row.games_tracked}, allowed=${apg.toFixed(2)}`,
        );
      }
    }

    // 6. Check prop type normalization
    console.log(`\n[diagnose] Checking prop type normalization...`);
    const propTypes = (await client.unsafe(`
      SELECT DISTINCT
        LOWER(TRIM(prop_type)) AS normalized,
        prop_type AS raw,
        COUNT(*)::bigint AS count
      FROM public.player_game_logs
      WHERE EXISTS (
        SELECT 1 FROM public.games g
        JOIN public.leagues l ON l.id = g.league_id
        WHERE g.id = player_game_logs.game_id
          AND (UPPER(l.code) = 'NFL' OR UPPER(COALESCE(l.abbreviation, l.code)) = 'NFL')
      )
      GROUP BY LOWER(TRIM(prop_type)), prop_type
      ORDER BY count DESC
      LIMIT 20
    `)) as Array<{
      normalized: string;
      raw: string;
      count: number;
    }>;

    console.log("Top 20 NFL prop types:");
    for (const row of propTypes) {
      console.log(`  "${row.raw}" -> "${row.normalized}" (${row.count} logs)`);
    }

    // 7. Check if there are any logs without opponent_id that should have it
    console.log(`\n[diagnose] Checking logs missing opponent_id...`);
    const missingOpponent = (await client.unsafe(`
      SELECT 
        COUNT(*)::bigint AS missing_count,
        COUNT(DISTINCT game_id)::int AS unique_games
      FROM public.player_game_logs pgl
      WHERE pgl.opponent_id IS NULL
        AND EXISTS (
          SELECT 1 FROM public.games g
          JOIN public.leagues l ON l.id = g.league_id
          WHERE g.id = pgl.game_id
            AND (UPPER(l.code) = 'NFL' OR UPPER(COALESCE(l.abbreviation, l.code)) = 'NFL')
        )
    `)) as Array<{
      missing_count: number;
      unique_games: number;
    }>;

    console.log(JSON.stringify(missingOpponent[0], null, 2));

    if (missingOpponent[0].missing_count > 0) {
      console.log(
        `\n⚠️  Found ${missingOpponent[0].missing_count} NFL logs without opponent_id across ${missingOpponent[0].unique_games} games`,
      );
      console.log(`   This is why matchup ranks aren't computing!`);
      console.log(`   Solution: Backfill opponent_id in player_game_logs from games table`);
    }
  } catch (e: any) {
    console.error("[diagnose] ❌ failed:", e?.message || e);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("[diagnose] fatal:", e);
  process.exit(1);
});
