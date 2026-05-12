#!/usr/bin/env tsx
import postgres from "postgres";
import { config } from "dotenv";
import { fetchMoneyPuckShotsForGameFromDb } from "../src/services/icura/unified/providers/moneypuck-db";

config();
config({ path: ".env.local" });

const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!conn) {
  console.error("No database URL");
  process.exit(1);
}

async function testGame() {
  // Game ID from the CSV that has shots
  const gameId = "20001";

  console.log(`\n=== Testing MoneyPuck Shots for Game ${gameId} ===\n`);

  const shots = await fetchMoneyPuckShotsForGameFromDb(gameId);

  console.log(`Found ${shots.length} shots`);

  if (shots.length > 0) {
    const first5 = shots.filter((s) => s.game_time_seconds !== null && s.game_time_seconds <= 300);
    const first10 = shots.filter((s) => s.game_time_seconds !== null && s.game_time_seconds <= 600);

    const homeTeam = shots.find((s) => s.team_abbr)?.team_abbr || "HOME";
    const awayTeam =
      shots.find((s) => s.team_abbr && s.team_abbr !== homeTeam)?.team_abbr || "AWAY";

    const homeShots5 = first5.filter((s) => s.team_abbr === homeTeam);
    const awayShots5 = first5.filter((s) => s.team_abbr === awayTeam);
    const homeShots10 = first10.filter((s) => s.team_abbr === homeTeam);
    const awayShots10 = first10.filter((s) => s.team_abbr === awayTeam);

    const homeXG5 = homeShots5.reduce((sum, s) => sum + (s.xg || 0), 0);
    const awayXG5 = awayShots5.reduce((sum, s) => sum + (s.xg || 0), 0);
    const homeXG10 = homeShots10.reduce((sum, s) => sum + (s.xg || 0), 0);
    const awayXG10 = awayShots10.reduce((sum, s) => sum + (s.xg || 0), 0);

    console.log(
      JSON.stringify(
        {
          game_external_id: gameId,
          home_team: homeTeam,
          away_team: awayTeam,
          first5: {
            home_shots: homeShots5.length,
            home_xg: homeXG5,
            away_shots: awayShots5.length,
            away_xg: awayXG5,
          },
          first10: {
            home_shots: homeShots10.length,
            home_xg: homeXG10,
            away_shots: awayShots10.length,
            away_xg: awayXG10,
          },
        },
        null,
        2,
      ),
    );
  } else {
    console.log("No shots found - checking database directly...");
    const sql = postgres(conn, { prepare: false });
    try {
      const dbShots = await sql`
        SELECT game_external_id, COUNT(*) as count
        FROM public.moneypuck_shots
        WHERE game_external_id = ${gameId}
        GROUP BY game_external_id
      `;
      console.log("DB query result:", dbShots);
    } finally {
      await sql.end({ timeout: 2 });
    }
  }
}

testGame().then(() => process.exit(0));
