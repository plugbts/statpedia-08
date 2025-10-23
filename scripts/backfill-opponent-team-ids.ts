#!/usr/bin/env tsx
import "dotenv/config";
import postgres from "postgres";

async function main() {
  const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) throw new Error("DATABASE_URL/NEON_DATABASE_URL is not set");
  const sql = postgres(conn, { prepare: false });
  try {
    console.log("Backfilling opponent_team_id in player_game_logs...");
    // Primary backfill using games.home_team_id/away_team_id
    const res1 = (await sql`
      WITH upd AS (
        SELECT l.id AS log_id,
               CASE 
                 WHEN l.team_id = g.home_team_id THEN g.away_team_id
                 WHEN l.team_id = g.away_team_id THEN g.home_team_id
                 ELSE NULL
               END AS opp_id
        FROM public.player_game_logs l
        JOIN public.games g ON g.id = l.game_id
        WHERE l.opponent_team_id IS NULL
      )
      UPDATE public.player_game_logs l
      SET opponent_team_id = u.opp_id
      FROM upd u
      WHERE l.id = u.log_id AND u.opp_id IS NOT NULL
      RETURNING 1 as updated;
    `) as any[];
    const updated1 = Array.isArray(res1) ? res1.length : 0;
    console.log(`- Updated via home/away mapping: ${updated1}`);

    // Safety fallback: if still NULL, but one of game teams is present, set to the other when unique
    const res2 = (await sql`
      WITH cand AS (
        SELECT l.id AS log_id,
               CASE 
                 WHEN l.team_id = g.home_team_id AND g.away_team_id IS NOT NULL THEN g.away_team_id
                 WHEN l.team_id = g.away_team_id AND g.home_team_id IS NOT NULL THEN g.home_team_id
                 ELSE NULL
               END AS opp_id
        FROM public.player_game_logs l
        JOIN public.games g ON g.id = l.game_id
        WHERE l.opponent_team_id IS NULL
      )
      UPDATE public.player_game_logs l
      SET opponent_team_id = c.opp_id
      FROM cand c
      WHERE l.id = c.log_id AND c.opp_id IS NOT NULL
      RETURNING 1 as updated;
    `) as any[];
    const updated2 = Array.isArray(res2) ? res2.length : 0;
    console.log(`- Updated via fallback mapping: ${updated2}`);

    const [remaining] = await sql<{ remaining: number }[]>`
      SELECT COUNT(*)::int AS remaining
      FROM public.player_game_logs
      WHERE opponent_team_id IS NULL;
    `;
    console.log(`Remaining NULL opponent_team_id: ${remaining?.remaining ?? 0}`);
  } finally {
    await sql.end({ timeout: 2 });
  }
}

main().catch((e) => {
  console.error("backfill-opponent-team-ids failed:", e);
  process.exit(1);
});
