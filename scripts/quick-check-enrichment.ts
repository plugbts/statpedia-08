import "dotenv/config";
import postgres from "postgres";

async function run() {
  const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) throw new Error("No DB URL");
  const sql = postgres(conn, { prepare: false });

  try {
    console.log("\n=== QUICK ENRICHMENT CHECK ===\n");

    // First check if players have names
    const playerCheck = await sql`
      SELECT COUNT(*) as total,
             COUNT(full_name) as with_name
      FROM players p
      JOIN player_props pp ON pp.player_id = p.id
      WHERE pp.is_active = true
      LIMIT 1
    `;
    console.log(
      `Player name check: ${playerCheck[0].with_name}/${playerCheck[0].total} have names\n`,
    );

    // Check a few MLB props with enrichment
    const rows = await sql`
      SELECT 
        COALESCE(p.full_name, p.name, 'UNKNOWN') as full_name,
        pt.name as prop_type,
        pp.line,
        COALESCE(pes.l5, pa.l5, 0) as l5,
        COALESCE(pes.l10, pa.l10, 0) as l10,
        COALESCE(pes.l20, pa.l20, 0) as l20,
        COALESCE(pes.season_avg, pa.season_avg, 0) as season_avg,
        COALESCE(pes.h2h_avg, pa.h2h_avg, 0) as h2h_avg,
        COALESCE(pes.ev_percent, pa.ev_percent, 0) as ev_percent,
        COALESCE(pes.streak_l5, pa.current_streak, 0) as streak
      FROM player_props pp
      JOIN players p ON p.id = pp.player_id
      JOIN prop_types pt ON pt.id = pp.prop_type_id
      JOIN games g ON g.id = pp.game_id
      LEFT JOIN leagues l ON l.id = g.league_id
      LEFT JOIN player_enriched_stats pes ON pes.player_id = pp.player_id AND pes.game_id = pp.game_id
      LEFT JOIN player_analytics pa ON pa.player_id = pp.player_id 
        AND pa.prop_type = pt.name 
        AND pa.season = EXTRACT(YEAR FROM g.game_date)::text
      WHERE pp.is_active = true
        AND (l.abbreviation = 'MLB' OR l.code = 'MLB')
      LIMIT 10
    `;

    console.log("Sample MLB props with enrichment values:\n");
    rows.forEach((r) => {
      const hasData = r.l5 > 0 || r.l10 > 0 || r.season_avg > 0;
      const status = hasData ? "✅" : "❌";
      console.log(`${status} ${r.full_name} - ${r.prop_type} ${r.line}`);
      console.log(`   L5: ${r.l5}% | L10: ${r.l10}% | L20: ${r.l20}%`);
      console.log(
        `   Season Avg: ${r.season_avg} | H2H: ${r.h2h_avg} | EV%: ${r.ev_percent}% | Streak: ${r.streak}`,
      );
      console.log();
    });
  } finally {
    await sql.end();
  }
}

run().catch(console.error);
