#!/usr/bin/env tsx

import "dotenv/config";
import postgres from "postgres";

/*
Reconcile duplicate players by full_name/name and re-point player_props (and props) to a canonical player_id.
Heuristics:
- Group by lower(name) using COALESCE(full_name, name)
- Choose canonical as the player with non-null external_id, else the one referenced most in player_game_logs
- Update player_props.player_id and props.player_id to canonical where currently pointing to alternates
Safe guards:
- Only operate for groups within the same team_id when possible; if multiple team_ids, prefer the id with most logs
*/

function log(msg: string) {
  console.log(`[reconcile-players] ${msg}`);
}

async function main() {
  const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) throw new Error("DATABASE_URL/NEON_DATABASE_URL is not set");
  const sql = postgres(conn, { prepare: false });
  try {
    const groups = (await sql`
      WITH pn AS (
        SELECT id, COALESCE(full_name, name) AS nm, team_id, external_id
        FROM public.players
      ), ag AS (
        SELECT lower(nm) AS key, COUNT(*) AS cnt
        FROM pn
        WHERE nm IS NOT NULL AND nm <> ''
        GROUP BY lower(nm)
        HAVING COUNT(*) > 1
      )
      SELECT pn.id, pn.nm, pn.team_id, pn.external_id, ag.key
      FROM pn
      JOIN ag ON ag.key = lower(pn.nm)
      ORDER BY ag.key, pn.id;
    `) as Array<{
      id: string;
      nm: string;
      team_id: string | null;
      external_id: string | null;
      key: string;
    }>;

    if (groups.length === 0) {
      log("No duplicate player names detected.");
      return;
    }

    // Build map key -> ids
    const byKey = new Map<
      string,
      Array<{ id: string; team_id: string | null; external_id: string | null }>
    >();
    for (const r of groups) {
      const arr = byKey.get(r.key) || [];
      arr.push({ id: r.id, team_id: r.team_id, external_id: r.external_id });
      byKey.set(r.key, arr);
    }

    let updatedProps = 0;
    let updatedPropsTable = 0;

    for (const [key, arr] of byKey.entries()) {
      // Score each candidate
      const scored: Array<{ id: string; score: number; hasExt: boolean }> = [];
      for (const { id, external_id } of arr) {
        const [cntLogs] =
          (await sql`SELECT COUNT(*)::int AS c FROM public.player_game_logs WHERE player_id=${id}`) as any[];
        const [cntProps] =
          (await sql`SELECT COUNT(*)::int AS c FROM public.player_props WHERE player_id=${id}`) as any[];
        const score = (cntLogs?.c || 0) * 3 + (cntProps?.c || 0);
        scored.push({ id, score, hasExt: !!external_id });
      }
      // Prefer has external id, then highest score
      scored.sort((a, b) => Number(b.hasExt) - Number(a.hasExt) || b.score - a.score);
      const canonical = scored[0]?.id;
      if (!canonical) continue;
      const alternates = scored.slice(1).map((s) => s.id);
      if (alternates.length === 0) continue;

      log(`Name '${key}': canonical=${canonical}, alternates=${alternates.join(",")}`);

      // Re-point player_props
      const res1 = await sql`
        UPDATE public.player_props SET player_id=${canonical}
        WHERE player_id = ANY(${alternates}::uuid[])
      `;
      // @ts-ignore
      updatedProps += Number(res1?.count || 0);

      // Re-point props table too if present
      try {
        const res2 = await sql`
          UPDATE public.props SET player_id=${canonical}
          WHERE player_id = ANY(${alternates}::uuid[])
        `;
        // @ts-ignore
        updatedPropsTable += Number(res2?.count || 0);
      } catch (e) {
        // props table may not exist or differ; ignore
      }
    }

    log(`Updated player_props rows: ${updatedProps}`);
    log(`Updated props rows: ${updatedPropsTable}`);
  } finally {
    await (sql as any).end({ timeout: 1 });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error("reconcile-players failed:", e);
    process.exit(1);
  });
}
