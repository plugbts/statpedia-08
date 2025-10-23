import "dotenv/config";
import postgres from "postgres";

async function run() {
  const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  const sql = postgres(conn!, { prepare: false });
  try {
    const [propsCounts] = await sql<{ total: number; with_best: number; with_odds: number }[]>`
      SELECT 
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE best_odds_over IS NOT NULL OR best_odds_under IS NOT NULL)::int AS with_best,
        COUNT(*) FILTER (WHERE odds IS NOT NULL)::int AS with_odds
      FROM public.props;
    `;
    console.log("propsCounts:", propsCounts);

    const byType = await sql<{ prop_type: string; n: number }[]>`
      SELECT prop_type, COUNT(*)::int as n
      FROM public.props
      GROUP BY 1
      ORDER BY n DESC
      LIMIT 10;
    `;
    console.log("top prop types:", byType);

    const [ppCounts] = await sql<{ total: number; with_over: number; with_under: number }[]>`
      SELECT 
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE over_odds IS NOT NULL OR over_odds_american IS NOT NULL)::int AS with_over,
        COUNT(*) FILTER (WHERE under_odds IS NOT NULL OR under_odds_american IS NOT NULL)::int AS with_under
      FROM public.player_props;
    `;
    console.log("player_props counts:", ppCounts);
  } finally {
    await sql.end({ timeout: 2 });
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
