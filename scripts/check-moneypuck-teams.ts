import postgres from "postgres";
import { config } from "dotenv";
config();
config({ path: ".env.local" });

const sql = postgres(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || "");

async function check() {
  const result = await sql`
    SELECT DISTINCT team_abbr, COUNT(*) as count
    FROM public.moneypuck_shots
    WHERE team_abbr IS NOT NULL
    GROUP BY team_abbr
    ORDER BY count DESC
    LIMIT 30
  `;
  console.log("Team abbreviations in moneypuck_shots:");
  for (const row of result) {
    console.log(`  ${row.team_abbr}: ${row.count} shots`);
  }
  await sql.end();
}

check();
