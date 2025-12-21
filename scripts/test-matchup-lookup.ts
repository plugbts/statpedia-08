#!/usr/bin/env tsx

/**
 * Test matchup rank lookup flow:
 * 1. Test opponent team ID resolution
 * 2. Test rank computation
 * 3. Test full lookup
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
      return url;
    } catch (e: any) {
      await probe.end({ timeout: 1 }).catch(() => {});
    }
  }

  throw new Error("All DB URL candidates failed");
}

// NFL abbreviation aliases (same as in API server)
function nflAbbrAlias(abbr: string): string {
  const aliases: Record<string, string> = {
    WAS: "WSH",
    WSH: "WSH",
    JAC: "JAX",
    JAX: "JAX",
  };
  return aliases[abbr] || abbr;
}

async function main() {
  const connectionString = await getSupabaseConnection();
  const postgres = (await import("postgres")).default;
  const client = postgres(connectionString, { prepare: false });

  try {
    console.log("[test] Testing opponent team ID resolution...\n");

    // Test cases from actual API response
    const testCases = [
      { opponent: "MIN", propType: "Passing Yards", season: "2024" },
      { opponent: "NYG", propType: "Passing Yards", season: "2024" },
      { opponent: "CLE", propType: "Receiving Yards", season: "2024" },
      { opponent: "BUF", propType: "Receiving Yards", season: "2024" },
    ];

    // Build team ID map (same as API server)
    const teamIdByKey = new Map<string, string>();
    const opponentAbbrs = Array.from(new Set(testCases.map((tc) => tc.opponent)));
    const leagueCode = "NFL";

    const teamRows = (await client.unsafe(
      `
      SELECT
        t.id,
        UPPER(t.abbreviation) AS abbr,
        LOWER(t.name) AS name,
        LOWER(t.full_name) AS full_name
      FROM public.teams t
      JOIN public.leagues l ON l.id = t.league_id
      WHERE UPPER(t.abbreviation) = ANY($1::text[])
        AND (UPPER(l.code) = $2 OR UPPER(COALESCE(l.abbreviation, l.code)) = $2)
    `,
      [opponentAbbrs, leagueCode],
    )) as Array<{ id: string; abbr: string; name: string; full_name: string }>;

    for (const tr of teamRows) {
      teamIdByKey.set(String(tr.abbr), String(tr.id));
      if (tr.name) teamIdByKey.set(String(tr.name), String(tr.id));
      if (tr.full_name) teamIdByKey.set(String(tr.full_name), String(tr.id));
    }

    console.log("Team ID map:");
    for (const [key, id] of teamIdByKey.entries()) {
      console.log(`  ${key} -> ${id}`);
    }

    const resolveOpponentTeamId = (raw: string): string | undefined => {
      const s = String(raw || "").trim();
      if (!s) return undefined;
      const upper = nflAbbrAlias(s.toUpperCase());
      const fromAbbr = teamIdByKey.get(upper);
      if (fromAbbr) return fromAbbr;
      const fromName = teamIdByKey.get(s.toLowerCase());
      if (fromName) return fromName;
      return undefined;
    };

    // Test resolution
    console.log("\n[test] Testing opponent resolution:");
    for (const tc of testCases) {
      const oppId = resolveOpponentTeamId(tc.opponent);
      console.log(`  ${tc.opponent} -> ${oppId || "❌ NOT FOUND"}`);
    }

    // Test rank computation and lookup
    console.log("\n[test] Testing rank computation and lookup:\n");
    for (const tc of testCases) {
      const oppId = resolveOpponentTeamId(tc.opponent);
      if (!oppId) {
        console.log(`❌ ${tc.opponent} (${tc.propType}): Cannot resolve opponent team ID`);
        continue;
      }

      const propTypeLower = tc.propType.toLowerCase();
      const rows = (await client.unsafe(
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
        WHERE r.team_id = $3::uuid
      `,
        [tc.season, propTypeLower, oppId],
      )) as Array<{
        team_id: string;
        team_abbr: string;
        rank: number;
        games_tracked: number;
        allowed_per_game: string | number;
      }>;

      if (rows.length === 0) {
        console.log(
          `❌ ${tc.opponent} (${tc.propType}): Rank computation returned 0 rows for opponent_id ${oppId}`,
        );
      } else {
        const row = rows[0];
        const apg =
          typeof row.allowed_per_game === "number"
            ? row.allowed_per_game
            : Number(String(row.allowed_per_game));
        console.log(
          `✅ ${tc.opponent} (${tc.propType}): rank=${row.rank}, games=${row.games_tracked}, allowed=${apg.toFixed(2)}`,
        );
      }
    }

    console.log("\n[test] ✅ Complete!");
  } catch (e: any) {
    console.error("[test] ❌ failed:", e?.message || e);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("[test] fatal:", e);
  process.exit(1);
});
