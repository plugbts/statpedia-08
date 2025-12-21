#!/usr/bin/env tsx

/**
 * Complete setup for defense_ranks table in Supabase:
 * 1. Create table if it doesn't exist
 * 2. Populate NFL defense ranks for specified seasons
 * 3. Verify the data
 *
 * Usage:
 *   npx --yes tsx scripts/setup-defense-ranks-supabase.ts --season=2024
 *   npx --yes tsx scripts/setup-defense-ranks-supabase.ts --season=2024 --season=2025
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

async function getSupabaseConnection(): Promise<string> {
  const supabaseUrl = process.env.SUPABASE_DATABASE_URL;
  if (!supabaseUrl) {
    throw new Error("SUPABASE_DATABASE_URL is required for matchup database");
  }

  const postgres = (await import("postgres")).default;
  const probe = postgres(supabaseUrl, { prepare: false, max: 1 });
  try {
    await probe`select 1 as ok`;
    await probe.end({ timeout: 1 });
    console.log("[setup-defense-ranks] ✅ Supabase connection verified");
    return supabaseUrl;
  } catch (e: any) {
    await probe.end({ timeout: 1 }).catch(() => {});
    throw new Error(`Failed to connect to Supabase: ${e?.message || e}`);
  }
}

async function createTable(client: any) {
  console.log("[setup-defense-ranks] Creating table if not exists...");

  await client.unsafe(`
    CREATE TABLE IF NOT EXISTS public.defense_ranks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
      league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
      prop_type TEXT NOT NULL,
      rank INT NOT NULL,
      rank_percentile NUMERIC NOT NULL,
      season TEXT NOT NULL,
      games_tracked INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT unique_defense_rank UNIQUE(team_id, prop_type, season)
    );
  `);

  await client.unsafe(`
    CREATE INDEX IF NOT EXISTS idx_defense_ranks_team ON public.defense_ranks(team_id);
    CREATE INDEX IF NOT EXISTS idx_defense_ranks_prop_type ON public.defense_ranks(prop_type);
    CREATE INDEX IF NOT EXISTS idx_defense_ranks_league ON public.defense_ranks(league_id);
    CREATE INDEX IF NOT EXISTS idx_defense_ranks_performance ON public.defense_ranks(team_id, prop_type, season);
  `);

  console.log("[setup-defense-ranks] ✅ Table and indexes created");
}

async function populateSeasons(client: any, leagueId: string, seasons: string[]) {
  for (const season of seasons) {
    for (const propType of CORE_PROP_TYPES) {
      const pt = String(propType).trim().toLowerCase();
      console.log(`[setup-defense-ranks] season=${season} prop_type=${pt} ...`);

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
        RETURNING id;
      `,
        [season, pt, leagueId, pt, season],
      )) as Array<{ id: string }>;

      console.log(
        `[setup-defense-ranks] ✅ season=${season} prop_type=${pt} inserted ${inserted.length} rows`,
      );
    }
  }
}

async function verify(client: any, leagueId: string, season: string) {
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

  console.log("[setup-defense-ranks] Verification:", { season, ...counts?.[0] });

  const sample = (await client.unsafe(
    `
    SELECT
      t.abbreviation AS team,
      dr.prop_type,
      dr.rank,
      dr.games_tracked
    FROM public.defense_ranks dr
    JOIN public.teams t ON t.id = dr.team_id
    WHERE dr.league_id = $1
      AND dr.season = $2
    ORDER BY dr.prop_type, dr.rank
    LIMIT 10
  `,
    [leagueId, season],
  )) as Array<{ team: string; prop_type: string; rank: number; games_tracked: number }>;

  if (sample.length > 0) {
    console.log("\n[setup-defense-ranks] Sample ranks:");
    for (const r of sample) {
      console.log(`  ${r.team} ${r.prop_type}: rank=${r.rank} (${r.games_tracked} games)`);
    }
  }
}

async function main() {
  const seasons = uniq(argValues("season")).filter(Boolean);
  if (seasons.length === 0) {
    console.error(
      "Usage: tsx scripts/setup-defense-ranks-supabase.ts --season=2024 [--season=2025]",
    );
    process.exit(1);
  }

  const connectionString = await getSupabaseConnection();
  const postgres = (await import("postgres")).default;
  const client = postgres(connectionString, { prepare: false });

  try {
    // Step 1: Create table
    await createTable(client);

    // Step 2: Get NFL league ID
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

    // Step 3: Populate
    console.log(
      `[setup-defense-ranks] Populating NFL defense ranks for seasons: ${seasons.join(", ")}`,
    );
    await populateSeasons(client, leagueId, seasons);

    // Step 4: Verify
    for (const season of seasons) {
      await verify(client, leagueId, season);
    }

    console.log("\n[setup-defense-ranks] ✅ Complete!");
  } catch (e: any) {
    console.error("[setup-defense-ranks] ❌ failed:", e?.message || e);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("[setup-defense-ranks] fatal:", e);
  process.exit(1);
});
