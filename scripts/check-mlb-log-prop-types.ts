import "dotenv/config";
import postgres from "postgres";

async function checkMLBLogPropTypes() {
  const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) throw new Error("No DB URL");
  const sql = postgres(conn, { prepare: false });

  // Check what prop types exist in player_game_logs (all)
  const logs = await sql`
    SELECT DISTINCT prop_type, COUNT(*) as count
    FROM player_game_logs
    GROUP BY prop_type
    ORDER BY count DESC
    LIMIT 50
  `;

  console.log("\nALL prop types in player_game_logs:");
  logs.forEach((r) => console.log(`  - ${r.prop_type}: ${r.count} logs`));

  // Check what prop types exist in player_props for MLB
  const props = await sql`
    SELECT DISTINCT pt.name, COUNT(*) as count
    FROM player_props pp
    JOIN prop_types pt ON pt.prop_type_id = pp.prop_type_id
    JOIN games g ON g.game_id = pp.game_id
    LEFT JOIN leagues l ON l.league_id = g.league_id
    WHERE (l.abbreviation = 'MLB' OR l.code = 'MLB' OR l.abbreviation IS NULL)
      AND pp.game_date BETWEEN CURRENT_DATE - INTERVAL '30 days' AND CURRENT_DATE + INTERVAL '14 days'
    GROUP BY pt.name
    ORDER BY count DESC
  `;

  console.log("\n\nMLB prop types in player_props:");
  props.forEach((r) => console.log(`  - ${r.name}: ${r.count} props`));

  await sql.end();
}

checkMLBLogPropTypes().catch(console.error);
