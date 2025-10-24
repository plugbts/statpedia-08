import "dotenv/config";
import postgres from "postgres";

async function run() {
  const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) throw new Error("No DB URL");
  const sql = postgres(conn, { prepare: false });
  const mlbTypes = ["Hits", "Runs", "Home Runs", "Walks", "Total Bases", "RBIs"];
  try {
    const propsCounts = await sql<{ prop_type: string; n: number }[]>`
      SELECT prop_type, COUNT(*)::int AS n
      FROM public.props
      WHERE prop_type IN ${sql(mlbTypes)}
      GROUP BY 1
      ORDER BY n DESC;
    `;
    console.log("props (Neon) MLB type counts:", propsCounts);

    const ppCounts = await sql<{ n: number }[]>`
      SELECT COUNT(*)::int AS n FROM public.player_props;
    `;
    console.log("player_props (Neon) total rows:", ppCounts[0]?.n ?? 0);
  } finally {
    await sql.end({ timeout: 2 });
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
