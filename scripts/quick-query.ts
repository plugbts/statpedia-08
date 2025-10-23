import "dotenv/config";
import postgres from "postgres";

async function run() {
  const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) throw new Error("No DB URL");
  const sql = postgres(conn, { prepare: false });
  const playerId = process.argv[2] || "";
  const propType = process.argv[3] || "";
  try {
    const props = await sql`
      SELECT id, line::numeric as line, odds, best_odds_over, best_odds_under, updated_at
      FROM public.props
      WHERE player_id = ${playerId}
        AND prop_type = ${propType}
      ORDER BY updated_at DESC NULLS LAST
      LIMIT 5;
    `;
    console.log("props:", props);
    const pp = await sql`
      SELECT pp.id, pp.over_odds, pp.under_odds, pp.over_odds_american, pp.under_odds_american, g.game_date
      FROM public.player_props pp
      JOIN public.prop_types pt ON pt.id = pp.prop_type_id
      JOIN public.games g ON g.id = pp.game_id
      WHERE pp.player_id = ${playerId}
        AND pt.name = ${propType}
      ORDER BY g.game_date DESC NULLS LAST
      LIMIT 5;
    `;
    console.log("player_props:", pp);
  } finally {
    await sql.end({ timeout: 2 });
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
