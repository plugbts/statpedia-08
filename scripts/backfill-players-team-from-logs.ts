import "dotenv/config";
import postgres from "postgres";

async function run() {
  const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) throw new Error("No DB URL");
  const sql = postgres(conn, { prepare: false });
  try {
    const rows = (await sql /* sql */ `
      WITH latest AS (
        SELECT DISTINCT ON (pgl.player_id) pgl.player_id, pgl.team_id
        FROM public.player_game_logs pgl
        WHERE pgl.team_id IS NOT NULL
        ORDER BY pgl.player_id, pgl.game_date DESC NULLS LAST
      )
      UPDATE public.players p
      SET team_id = l.team_id
      FROM latest l
      WHERE p.id = l.player_id
        AND (p.team_id IS NULL OR p.team_id <> l.team_id)
      RETURNING p.id as player_id, l.team_id;
    `) as any[];
    console.log(`Updated players.team_id for ${rows.length} players from logs.`);
  } finally {
    // @ts-ignore
    await sql.end({ timeout: 1 });
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
