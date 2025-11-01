import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!conn) throw new Error("DATABASE_URL missing");
const sql = postgres(conn, { prepare: false });

async function main() {
  console.log("📊 Analyzing sport=NULL Analytics\n");

  // Check prop types in NULL sport analytics
  const propTypes = await sql`
    SELECT prop_type, COUNT(*) as count
    FROM player_analytics
    WHERE sport IS NULL AND season = '2025'
    GROUP BY prop_type
    ORDER BY count DESC
    LIMIT 20
  `;

  console.log("Prop Types in sport=NULL rows:");
  for (const row of propTypes) {
    const isNFL = [
      "Passing Yards",
      "Rushing Yards",
      "Receiving Yards",
      "Total Tackles",
      "Sacks",
    ].includes(row.prop_type);
    const marker = isNFL ? "🏈" : "⚾";
    console.log(`  ${marker} ${row.prop_type}: ${row.count}`);
  }

  // Sample a few NULL sport rows to see their data
  console.log("\n🔍 Sample NULL Sport Rows:");
  const samples = await sql`
    SELECT player_id, prop_type, l5, l10, season_avg
    FROM player_analytics
    WHERE sport IS NULL AND season = '2025' AND prop_type IN ('Passing Yards', 'Rushing Yards', 'Receiving Yards')
    LIMIT 5
  `;

  for (const row of samples) {
    console.log(`  ${row.prop_type}: L10=${row.l10}%, Avg=${row.season_avg}`);
  }

  // Check if these players have game logs with league info
  console.log("\n🔗 Checking League Linkage:");
  const leagueCheck = await sql`
    SELECT 
      pgl.prop_type,
      COUNT(DISTINCT pgl.player_id) as players_with_logs,
      COUNT(DISTINCT g.id) as games_with_link,
      COUNT(DISTINCT l.id) as leagues_found,
      STRING_AGG(DISTINCT l.sport, ', ') as sports
    FROM player_game_logs pgl
    LEFT JOIN games g ON g.id = pgl.game_id
    LEFT JOIN leagues l ON l.id = g.league_id
    WHERE pgl.prop_type IN ('Passing Yards', 'Rushing Yards', 'Receiving Yards', 'Total Tackles')
      AND EXTRACT(YEAR FROM pgl.game_date) = 2025
    GROUP BY pgl.prop_type
  `;

  for (const row of leagueCheck) {
    console.log(`  ${row.prop_type}:`);
    console.log(`    Players with logs: ${row.players_with_logs}`);
    console.log(`    Games with link: ${row.games_with_link}`);
    console.log(`    Leagues found: ${row.leagues_found}`);
    console.log(`    Sports: ${row.sports || "NULL"}`);
  }

  await sql.end();
}

main().catch(console.error);
