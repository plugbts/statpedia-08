import "dotenv/config";
import postgres from "postgres";

async function main() {
  const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) {
    console.error("No DATABASE_URL/NEON_DATABASE_URL set");
    process.exit(1);
  }
  const sql = postgres(conn, { prepare: false });
  try {
    const gamesByLeague = await sql`
      SELECT l.code as league, COUNT(*)::int as games
      FROM public.games g
      JOIN public.leagues l ON l.id = g.league_id
      WHERE g.game_date >= NOW() - INTERVAL '30 days'
      GROUP BY l.code
      ORDER BY l.code;
    `;
    const rawByLeague = await sql`
      SELECT league, 
             COUNT(*)::int as total_raw,
             COUNT(*) FILTER (WHERE normalized=false)::int as not_normalized
      FROM public.player_game_logs_raw
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY league
      ORDER BY league;
    `;
    const logsByLeague = await sql`
      SELECT l.code as league, COUNT(*)::int as logs
      FROM public.player_game_logs p
      JOIN public.games g ON g.id = p.game_id
      JOIN public.leagues l ON l.id = g.league_id
      WHERE p.game_date >= NOW() - INTERVAL '30 days'
      GROUP BY l.code
      ORDER BY l.code;
    `;

    console.log("Ingestion Diagnostics (last 30 days):");
    console.log("- games by league:", gamesByLeague);
    console.log("- raw payloads by league:", rawByLeague);
    console.log("- normalized logs by league:", logsByLeague);
  } finally {
    await sql.end({ timeout: 2 });
  }
}

main().catch((e) => {
  console.error("ingestion-diagnostics failed:", e);
  process.exit(1);
});
