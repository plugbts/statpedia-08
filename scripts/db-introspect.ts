import "dotenv/config";
import postgres from "postgres";

async function run() {
  const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) throw new Error("DATABASE_URL not set");
  const sql = postgres(conn, { prepare: false, max: 1 });
  try {
    const tables = [
      "public.team_abbrev_map",
      "public.teams",
      "public.leagues",
      "public.player_game_logs",
      "public.player_analytics",
    ];
    for (const tbl of tables) {
      const rows = await sql`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${tbl.split(".")[1]}
        ORDER BY ordinal_position;
      `;
      console.log(`\n== Columns for ${tbl} ==`);
      for (const r of rows as any[]) console.log(`${r.column_name}: ${r.data_type}`);
    }
  } finally {
    await sql.end({ timeout: 2 });
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
