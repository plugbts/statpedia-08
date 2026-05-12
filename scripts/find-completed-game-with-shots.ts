#!/usr/bin/env tsx
import postgres from "postgres";
import { config } from "dotenv";

config();
config({ path: ".env.local" });

const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!conn) {
  console.error("No database URL");
  process.exit(1);
}

const sql = postgres(conn, { prepare: false });

async function findGame() {
  try {
    // Find a game with MoneyPuck shots data
    // First, get a game ID that has shots
    const gameResult = await sql`
      SELECT DISTINCT game_external_id
      FROM public.moneypuck_shots
      WHERE game_time_seconds IS NOT NULL
        AND game_time_seconds <= 600
      LIMIT 1
    `;

    if (gameResult.length === 0) {
      console.log("No games with MoneyPuck shots data found");
      return null;
    }

    const gameId = gameResult[0].game_external_id;

    // Get stats for this game
    const stats = await sql`
      SELECT 
        COUNT(*) as shot_count,
        SUM(xg) FILTER (WHERE game_time_seconds <= 300) as xg_first5,
        SUM(xg) FILTER (WHERE game_time_seconds <= 600) as xg_first10,
        COUNT(*) FILTER (WHERE game_time_seconds <= 300) as shots_first5,
        COUNT(*) FILTER (WHERE game_time_seconds <= 600) as shots_first10
      FROM public.moneypuck_shots
      WHERE game_external_id = ${gameId}
        AND game_time_seconds IS NOT NULL
        AND game_time_seconds <= 600
    `;

    if (stats.length > 0) {
      const s = stats[0];
      console.log(
        JSON.stringify(
          {
            game_external_id: gameId,
            shot_count: Number(s.shot_count),
            xg_first5: Number(s.xg_first5 || 0),
            xg_first10: Number(s.xg_first10 || 0),
            shots_first5: Number(s.shots_first5 || 0),
            shots_first10: Number(s.shots_first10 || 0),
          },
          null,
          2,
        ),
      );

      // Try to get the date from games table
      const gameInfo = await sql`
        SELECT 
          COALESCE(game_date::text, date_iso::text) as date_str,
          home_team_id, 
          away_team_id
        FROM public.games
        WHERE external_id = ${gameId} OR api_game_id = ${gameId}
        LIMIT 1
      `;

      if (gameInfo.length > 0 && gameInfo[0].date_str) {
        return gameInfo[0].date_str;
      }

      // If no date found, return the game ID so we can use it directly
      console.log(`\nGame ID: ${gameId} (no date found in games table)`);
      return gameId;
    } else {
      console.log("No games with MoneyPuck shots data found");
      return null;
    }
  } finally {
    await sql.end({ timeout: 2 });
  }
}

findGame().then((date) => {
  if (date) {
    console.log(`\nUse this date: ${date}`);
  }
  process.exit(0);
});
