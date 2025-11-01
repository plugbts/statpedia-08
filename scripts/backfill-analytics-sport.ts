import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!conn) throw new Error("DATABASE_URL missing");
const sql = postgres(conn, { prepare: false });

async function main() {
  console.log("🔧 Back-filling Sport Values in player_analytics\n");

  // First, infer sport from prop_type since NFL game_logs might not be linked to games table
  const propTypeToSport = {
    "Passing Yards": "NFL",
    "Passing TDs": "NFL",
    "Passing Completions": "NFL",
    "Passing Interceptions": "NFL",
    "Rushing Yards": "NFL",
    "Rushing TDs": "NFL",
    "Rushing Attempts": "NFL",
    "Receiving Yards": "NFL",
    "Receiving TDs": "NFL",
    Receptions: "NFL",
    "Receiving Targets": "NFL",
    "Total Tackles": "NFL",
    "Solo Tackles": "NFL",
    Sacks: "NFL",
    Interceptions: "NFL",
    "Field Goals Made": "NFL",
    "Extra Points Made": "NFL",
    "Kicking Points": "NFL",
  };

  let totalUpdated = 0;

  // Update NFL analytics based on prop type
  for (const [propType, sport] of Object.entries(propTypeToSport)) {
    const updated = await sql`
      UPDATE player_analytics
      SET sport = ${sport}
      WHERE prop_type = ${propType}
        AND season = '2025'
        AND sport IS NULL
    `;
    totalUpdated += updated.count;
  }

  console.log(`✅ Updated ${totalUpdated} NFL analytics rows based on prop_type`);

  // Show updated counts
  console.log("\n📊 Updated Analytics by Sport:");
  const bySport = await sql`
    SELECT sport, COUNT(*) as count
    FROM player_analytics
    WHERE season = '2025'
    GROUP BY sport
    ORDER BY count DESC
  `;

  for (const row of bySport) {
    console.log(`  ${row.sport || "NULL"}: ${row.count}`);
  }

  // NFL-specific stats
  const nfl = await sql`
    SELECT 
      COUNT(*) as total,
      COUNT(DISTINCT player_id) as unique_players,
      COUNT(DISTINCT prop_type) as unique_prop_types
    FROM player_analytics
    WHERE sport = 'NFL' AND season = '2025'
  `;

  if (nfl[0].total > 0) {
    console.log(`\n🏈 NFL Analytics:`);
    console.log(`  Total Rows: ${nfl[0].total}`);
    console.log(`  Unique Players: ${nfl[0].unique_players}`);
    console.log(`  Unique Prop Types: ${nfl[0].unique_prop_types}`);
  }

  await sql.end();
}

main().catch(console.error);
