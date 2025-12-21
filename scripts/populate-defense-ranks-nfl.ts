#!/usr/bin/env tsx

/**
 * Populate public.defense_ranks for NFL using public.player_game_logs.
 *
 * Ranking definition (per season + prop_type):
 * - For each defense team D and game G: allowed(D,G,prop) = SUM(actual_value) for all offensive players
 *   who played *against* D in G for that prop_type.
 * - allowed_per_game(D,prop) = AVG(allowed(D,G,prop)) across games in that season.
 * - rank 1..32 by allowed_per_game ASC (1 = best defense; 32 = worst).
 *
 * Idempotency strategy:
 * - DELETE existing rows for (league_id, season, prop_type) before inserting.
 *
 * Usage:
 *   npx --yes tsx scripts/populate-defense-ranks-nfl.ts --season=2024
 *   npx --yes tsx scripts/populate-defense-ranks-nfl.ts --season=2024 --season=2025
 */

import { config as dotenvConfig } from "dotenv";

dotenvConfig({ path: ".env.local" });

const CORE_PROP_TYPES = [
  "passing yards",
  "passing attempts",
  "passing completions",
  "passing tds",
  "rushing yards",
  "rushing attempts",
  "rushing tds",
  "receiving yards",
  "receptions",
  "receiving tds",
] as const;

function argValues(name: string): string[] {
  const out: string[] = [];
  for (const a of process.argv.slice(2)) {
    if (a.startsWith(`--${name}=`)) out.push(a.slice(name.length + 3));
  }
  return out;
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

async function main() {
  const seasons = uniq(argValues("season")).filter(Boolean);
  if (seasons.length === 0) {
    console.error("Usage: tsx scripts/populate-defense-ranks-nfl.ts --season=2024 [--season=2025]");
    process.exit(1);
  }

  const connectionString =
    process.env.SUPABASE_DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error(
      "Missing database connection string (SUPABASE_DATABASE_URL/NEON_DATABASE_URL/DATABASE_URL).",
    );
    process.exit(1);
  }

  const postgres = (await import("postgres")).default;
  const client = postgres(connectionString, { prepare: false });

  console.log("[defense-ranks:nfl] starting", { seasons, propTypes: CORE_PROP_TYPES.length });

  try {
    const leagueRows = (await client.unsafe(
      `
      SELECT id
      FROM public.leagues
      WHERE UPPER(code) = 'NFL' OR UPPER(COALESCE(abbreviation, code)) = 'NFL'
      LIMIT 1
    `,
    )) as Array<{ id: string }>;
    const leagueId = leagueRows?.[0]?.id;
    if (!leagueId) {
      throw new Error("Could not find NFL league_id in public.leagues");
    }

    for (const season of seasons) {
      for (const propType of CORE_PROP_TYPES) {
        const pt = String(propType).trim().toLowerCase();
        console.log(`[defense-ranks:nfl] season=${season} prop_type=${pt} ...`);

        // delete existing for idempotency
        await client.unsafe(
          `
          DELETE FROM public.defense_ranks
          WHERE league_id = $1
            AND season = $2
            AND LOWER(TRIM(prop_type)) = $3
        `,
          [leagueId, season, pt],
        );

        const inserted = (await client.unsafe(
          `
          WITH per_game AS (
            SELECT
              pgl.opponent_id AS team_id,
              pgl.game_id,
              SUM(pgl.actual_value::numeric) AS allowed
            FROM public.player_game_logs pgl
            WHERE pgl.season = $1
              AND LOWER(TRIM(pgl.prop_type)) = $2
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
              RANK() OVER (ORDER BY allowed_per_game ASC) AS rank,
              COUNT(*) OVER ()::int AS n
            FROM per_team
          )
          INSERT INTO public.defense_ranks
            (team_id, league_id, prop_type, rank, rank_percentile, season, games_tracked, created_at, updated_at)
          SELECT
            team_id,
            $3::uuid AS league_id,
            $4::text AS prop_type,
            rank::int AS rank,
            CASE
              WHEN n <= 1 THEN 0
              ELSE ((rank - 1)::numeric / (n - 1)::numeric) * 100
            END AS rank_percentile,
            $5::text AS season,
            games_tracked::int AS games_tracked,
            NOW() AS created_at,
            NOW() AS updated_at
          FROM ranked
          RETURNING 1
        `,
          [season, pt, leagueId, pt, season],
        )) as Array<{ "1": number }>;

        console.log(
          `[defense-ranks:nfl] inserted ${inserted.length} rows (season=${season}, prop_type=${pt})`,
        );
      }
    }

    console.log("[defense-ranks:nfl] complete");
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((e) => {
  console.error("[defense-ranks:nfl] failed:", e?.message || e);
  process.exit(1);
});
