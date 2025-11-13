import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!conn) throw new Error("DATABASE_URL missing");
const db = postgres(conn);

async function checkUtahTeams() {
  console.log("🔍 Checking Utah teams...\n");

  const utahTeams = await db`
    SELECT t.id, t.name, t.abbreviation, l.code as league
    FROM teams t
    JOIN leagues l ON l.id = t.league_id
    WHERE t.name LIKE '%Utah%' OR t.abbreviation IN ('UTA', 'UMA', 'UJA')
    ORDER BY l.code, t.name, t.abbreviation
  `;

  console.table(utahTeams);

  // Check for players
  for (const team of utahTeams) {
    const players = await db`
      SELECT COUNT(*) as count FROM players WHERE team_id = ${team.id}
    `;
    console.log(`${team.name} (${team.abbreviation}): ${players[0].count} players`);
  }

  process.exit(0);
}

checkUtahTeams().catch(console.error);
