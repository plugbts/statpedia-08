#!/usr/bin/env tsx

/**
 * Quick verification for public.defense_ranks (NFL).
 *
 * Usage:
 *   npx --yes tsx scripts/check-defense-ranks-nfl.ts --season=2024
 */

import { config as dotenvConfig } from "dotenv";

dotenvConfig({ path: ".env.local" });

function arg(name: string): string | null {
  for (const a of process.argv.slice(2)) {
    if (a.startsWith(`--${name}=`)) return a.slice(name.length + 3);
  }
  return null;
}

async function main() {
  const season = arg("season") || null;
  if (!season) {
    console.error("Usage: tsx scripts/check-defense-ranks-nfl.ts --season=2024");
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
    if (!leagueId) throw new Error("Could not find NFL league_id in public.leagues");

    const counts = (await client.unsafe(
      `
      SELECT
        COUNT(*)::int AS rows,
        COUNT(DISTINCT LOWER(TRIM(prop_type)))::int AS prop_types,
        COUNT(DISTINCT team_id)::int AS teams
      FROM public.defense_ranks
      WHERE league_id = $1
        AND season = $2
    `,
      [leagueId, season],
    )) as Array<{ rows: number; prop_types: number; teams: number }>;

    console.log("[check-defense-ranks:nfl]", { season, ...counts?.[0] });

    const sample = (await client.unsafe(
      `
      SELECT
        LOWER(TRIM(dr.prop_type)) AS prop_type,
        t.abbreviation AS team,
        dr.rank,
        dr.games_tracked,
        dr.rank_percentile
      FROM public.defense_ranks dr
      JOIN public.teams t ON t.id = dr.team_id
      WHERE dr.league_id = $1
        AND dr.season = $2
      ORDER BY LOWER(TRIM(dr.prop_type)) ASC, dr.rank ASC
      LIMIT 15
    `,
      [leagueId, season],
    )) as Array<any>;

    console.log("[check-defense-ranks:nfl] sample:");
    for (const r of sample) {
      console.log(
        `  ${r.prop_type}  ${r.team}  rank=${r.rank} games=${r.games_tracked} pct=${Number(r.rank_percentile).toFixed(1)}`,
      );
    }
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((e) => {
  console.error("[check-defense-ranks:nfl] failed:", e?.message || e);
  process.exit(1);
});
