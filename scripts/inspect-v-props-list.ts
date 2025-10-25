import "dotenv/config";
import postgres from "postgres";

async function run() {
  const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) throw new Error("No DB URL");
  const sql = postgres(conn, { prepare: false });
  try {
    const [{ c }] = await sql`SELECT COUNT(*)::int AS c FROM public.v_props_list`;
    console.log("v_props_list count:", c);
    const rows = await sql`
      SELECT league, full_name, market, line, game_date, over_odds_american, under_odds_american
      FROM public.v_props_list
      ORDER BY game_date DESC NULLS LAST
      LIMIT 10`;
    console.log(rows);
  } finally {
    await sql.end({ timeout: 2 });
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
