#!/usr/bin/env tsx

import "dotenv/config";
import postgres from "postgres";

async function main() {
  const conn =
    process.env.SUPABASE_DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) {
    console.error("❌ No DB URL found");
    process.exit(1);
  }

  const sql = postgres(conn, { prepare: false });

  // Get latest game date processed
  const latest = await sql`
    SELECT 
      DATE(g.game_date) as latest_date,
      COUNT(DISTINCT g.id) as total_games,
      COUNT(pgl.id) as total_logs
    FROM player_game_logs pgl
    INNER JOIN games g ON pgl.game_id = g.id
    WHERE g.league_code = 'NFL'
      AND g.game_date >= '2024-09-01'
      AND g.game_date <= '2025-02-28'
    GROUP BY DATE(g.game_date)
    ORDER BY DATE(g.game_date) DESC
    LIMIT 1
  `;

  // Get totals
  const totals = await sql`
    SELECT 
      COUNT(DISTINCT g.id) as total_games,
      COUNT(pgl.id) as total_logs,
      MIN(g.game_date) as first_date,
      MAX(g.game_date) as last_date
    FROM player_game_logs pgl
    INNER JOIN games g ON pgl.game_id = g.id
    WHERE g.league_code = 'NFL'
      AND g.game_date >= '2024-09-01'
      AND g.game_date <= '2025-02-28'
  `;

  console.log("\n📊 NFL 2024 Season Backfill Status:");
  console.log("=".repeat(50));
  if (totals[0] && totals[0].total_games > 0) {
    console.log(`✅ Total Games Processed: ${totals[0].total_games}`);
    console.log(`✅ Total Player Logs: ${totals[0].total_logs}`);
    console.log(`📅 Date Range: ${totals[0].first_date} → ${totals[0].last_date}`);
    if (latest[0]) {
      console.log(
        `🔄 Latest Date: ${latest[0].latest_date} (${latest[0].total_games} games, ${latest[0].total_logs} logs)`,
      );
    }
  } else {
    console.log("⏳ No data yet - backfill may be starting...");
  }
  console.log("=".repeat(50) + "\n");

  await sql.end();
}

main().catch(console.error);
