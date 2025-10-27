import "dotenv/config";
import postgres from "postgres";

async function run() {
  const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) throw new Error("No DB URL");
  const sql = postgres(conn, { prepare: false });
  try {
    const rows = (await sql /* sql */ `
      SELECT league, full_name, market, team, opponent, l5, l10, l20, season_avg, ev_percent, team_logo, opponent_logo
      FROM public.v_props_list
      WHERE league = 'MLB'
      ORDER BY game_date DESC NULLS LAST
      LIMIT 50;
    `) as any[];

    const enriched = rows.filter(
      (r) =>
        (Number(r.l5) || 0) > 0 ||
        (Number(r.l10) || 0) > 0 ||
        (Number(r.l20) || 0) > 0 ||
        (Number(r.season_avg) || 0) > 0,
    );
    const logosOk = rows.every(
      (r) =>
        typeof r.team_logo === "string" &&
        r.team_logo.length > 0 &&
        typeof r.opponent_logo === "string" &&
        r.opponent_logo.length > 0,
    );

    console.log(
      JSON.stringify(
        {
          total: rows.length,
          enrichedCount: enriched.length,
          logosOk,
          sample: rows.slice(0, 5).map((r) => ({
            name: r.full_name,
            market: r.market,
            team: r.team,
            opponent: r.opponent,
            l5: r.l5,
            l10: r.l10,
            l20: r.l20,
            season_avg: r.season_avg,
            ev_percent: r.ev_percent,
            team_logo: r.team_logo,
            opponent_logo: r.opponent_logo,
          })),
        },
        null,
        2,
      ),
    );
  } finally {
    // @ts-ignore
    await sql.end({ timeout: 1 });
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
