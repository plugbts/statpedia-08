import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!conn) throw new Error("DATABASE_URL missing");
const sql = postgres(conn, { prepare: false });

async function main() {
  console.log("📊 Checking Active Props Date Range\n");

  // Check player_props date range
  const propsDateRange = await sql`
    SELECT 
      MIN(g.game_date) as earliest,
      MAX(g.game_date) as latest,
      COUNT(DISTINCT pp.id) as total_props,
      COUNT(DISTINCT CASE WHEN l.sport = 'NFL' THEN pp.id END) as nfl_props
    FROM player_props pp
    JOIN games g ON g.id = pp.game_id
    LEFT JOIN leagues l ON l.id = g.league_id
  `;

  console.log("Player Props:");
  console.log(`  Date Range: ${propsDateRange[0].earliest} → ${propsDateRange[0].latest}`);
  console.log(`  Total Props: ${propsDateRange[0].total_props}`);
  console.log(`  NFL Props: ${propsDateRange[0].nfl_props}`);

  // Check NFL props in different windows
  const windows = [
    { back: 3, ahead: 7, label: "Default (3 back, 7 ahead)" },
    { back: 30, ahead: 14, label: "Wide (30 back, 14 ahead)" },
    { back: 60, ahead: 14, label: "Very Wide (60 back, 14 ahead)" },
  ];

  console.log("\n📅 NFL Props by Date Window:");
  for (const window of windows) {
    const count = await sql`
      SELECT COUNT(DISTINCT pp.id) as count
      FROM player_props pp
      JOIN games g ON g.id = pp.game_id
      JOIN leagues l ON l.id = g.league_id
      WHERE l.sport = 'NFL'
        AND g.game_date BETWEEN (CURRENT_DATE - ${window.back}::int) AND (CURRENT_DATE + ${window.ahead}::int)
    `;
    console.log(`  ${window.label}: ${count[0].count} props`);
  }

  // Check player_game_logs for NFL
  const nflLogs = await sql`
    SELECT 
      COUNT(*) as total_logs,
      MIN(game_date) as earliest,
      MAX(game_date) as latest,
      COUNT(DISTINCT player_id) as unique_players,
      COUNT(DISTINCT prop_type) as unique_prop_types
    FROM player_game_logs
    WHERE prop_type IN ('Passing Yards', 'Rushing Yards', 'Receiving Yards', 
                        'Passing TDs', 'Rushing TDs', 'Receiving TDs',
                        'Receptions', 'Total Tackles', 'Sacks')
  `;

  console.log("\n📈 NFL Game Logs:");
  console.log(`  Total Logs: ${nflLogs[0].total_logs}`);
  console.log(`  Date Range: ${nflLogs[0].earliest} → ${nflLogs[0].latest}`);
  console.log(`  Unique Players: ${nflLogs[0].unique_players}`);
  console.log(`  Unique Prop Types: ${nflLogs[0].unique_prop_types}`);

  await sql.end();
}

main().catch(console.error);
