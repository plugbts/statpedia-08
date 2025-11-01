import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!conn) throw new Error("DATABASE_URL missing");
const sql = postgres(conn, { prepare: false });

async function main() {
  console.log("🔧 Fixing League Sport Values\n");

  const updates = [
    { code: "NFL", sport: "NFL" },
    { code: "NBA", sport: "NBA" },
    { code: "MLB", sport: "MLB" },
    { code: "NHL", sport: "NHL" },
    { code: "WNBA", sport: "WNBA" },
  ];

  for (const { code, sport } of updates) {
    const result = await sql`
      UPDATE leagues
      SET sport = ${sport}
      WHERE code = ${code}
      RETURNING id, code, name, sport
    `;

    if (result.length > 0) {
      console.log(`✅ Updated ${code}: sport = '${sport}'`);
    } else {
      console.log(`⚠️  No league found with code '${code}'`);
    }
  }

  console.log("\n📊 Updated Leagues:");
  const leagues =
    await sql`SELECT id, code, name, sport FROM leagues WHERE code IN ('NFL', 'MLB', 'NHL', 'NBA', 'WNBA')`;
  console.table(leagues);

  await sql.end();
}

main().catch(console.error);
