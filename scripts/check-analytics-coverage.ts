import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!conn) throw new Error("DATABASE_URL missing");
const sql = postgres(conn, { prepare: false });

async function main() {
  console.log("📊 Checking Player Analytics Coverage\n");

  // Total analytics rows
  const total = await sql`SELECT COUNT(*) as count FROM player_analytics`;
  console.log(`Total player_analytics rows: ${total[0].count}`);

  // By sport
  const bySport = await sql`
    SELECT sport, COUNT(*) as count
    FROM player_analytics
    WHERE season = '2025'
    GROUP BY sport
    ORDER BY count DESC
  `;

  console.log("\n📈 2025 Analytics by Sport:");
  for (const row of bySport) {
    console.log(`  ${row.sport || "NULL"}: ${row.count}`);
  }

  // NFL-specific
  const nfl = await sql`
    SELECT 
      COUNT(*) as total,
      COUNT(DISTINCT player_id) as unique_players,
      COUNT(DISTINCT prop_type) as unique_prop_types,
      AVG(l10) as avg_l10,
      AVG(season_avg) as avg_season_avg
    FROM player_analytics
    WHERE sport = 'NFL' AND season = '2025'
  `;

  if (nfl[0].total > 0) {
    console.log("\n🏈 NFL Analytics:");
    console.log(`  Total Rows: ${nfl[0].total}`);
    console.log(`  Unique Players: ${nfl[0].unique_players}`);
    console.log(`  Unique Prop Types: ${nfl[0].unique_prop_types}`);
    const avgL10 = nfl[0].avg_l10 != null ? Number(nfl[0].avg_l10).toFixed(2) : "N/A";
    const avgSeasonAvg =
      nfl[0].avg_season_avg != null ? Number(nfl[0].avg_season_avg).toFixed(2) : "N/A";
    console.log(`  Avg L10: ${avgL10}%`);
    console.log(`  Avg Season Avg: ${avgSeasonAvg}`);
  }

  // Sample some NFL analytics
  const samples = await sql`
    SELECT player_id, prop_type, l5, l10, l20, season_avg, current_streak
    FROM player_analytics
    WHERE sport = 'NFL' AND season = '2025'
    ORDER BY season_avg DESC NULLS LAST
    LIMIT 5
  `;

  if (samples.length > 0) {
    console.log("\n🎯 Sample NFL Analytics (Top 5 by Season Avg):");
    for (const row of samples) {
      console.log(`  Player: ${row.player_id.slice(0, 8)}... | ${row.prop_type}`);
      console.log(`    L5: ${row.l5}% | L10: ${row.l10}% | L20: ${row.l20}%`);
      console.log(`    Season Avg: ${row.season_avg} | Streak: ${row.current_streak}`);
    }
  }

  await sql.end();
}

main().catch(console.error);
