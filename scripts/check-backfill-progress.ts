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

  const result = await sql`
    SELECT 
      DATE(g.game_date) as date,
      COUNT(DISTINCT g.id) as game_count,
      COUNT(pgl.id) as log_count
    FROM player_game_logs pgl
    INNER JOIN games g ON pgl.game_id = g.id
    WHERE g.league = 'NFL'
      AND g.game_date >= '2024-09-01'
      AND g.game_date <= '2025-02-28'
    GROUP BY DATE(g.game_date)
    ORDER BY DATE(g.game_date)
  `;

  const total = await sql`
    SELECT 
      COUNT(DISTINCT g.id) as total_games,
      COUNT(pgl.id) as total_logs
    FROM player_game_logs pgl
    INNER JOIN games g ON pgl.game_id = g.id
    WHERE g.league = 'NFL'
      AND g.game_date >= '2024-09-01'
      AND g.game_date <= '2025-02-28'
  `;

  console.log("\n📊 NFL 2024 Season Backfill Progress:\n");
  console.log("Date Range: 2024-09-01 → 2025-02-28\n");

  if (result.length > 0) {
    console.log("Recent dates (last 10):");
    result.slice(-10).forEach((r: any) => {
      console.log(`  ${r.date}: ${r.game_count} games, ${r.log_count} logs`);
    });
  } else {
    console.log("No data found yet (backfill may still be starting)...");
  }

  console.log("\n" + "=".repeat(50));
  console.log(
    `TOTAL: ${total[0]?.total_games || 0} games, ${total[0]?.total_logs || 0} player logs`,
  );
  console.log("=".repeat(50) + "\n");

  // Check 2025 season too
  const result2025 = await sql`
    SELECT 
      DATE(g.game_date) as date,
      COUNT(DISTINCT g.id) as game_count,
      COUNT(pgl.id) as log_count
    FROM player_game_logs pgl
    INNER JOIN games g ON pgl.game_id = g.id
    WHERE g.league = 'NFL'
      AND g.game_date >= '2025-09-01'
    GROUP BY DATE(g.game_date)
    ORDER BY DATE(g.game_date)
  `;

  const total2025 = await sql`
    SELECT 
      COUNT(DISTINCT g.id) as total_games,
      COUNT(pgl.id) as total_logs
    FROM player_game_logs pgl
    INNER JOIN games g ON pgl.game_id = g.id
    WHERE g.league = 'NFL'
      AND g.game_date >= '2025-09-01'
  `;

  if (total2025[0] && total2025[0].total_games > 0) {
    console.log("\n📊 NFL 2025 Season Backfill Progress:\n");
    console.log("Date Range: 2025-09-01 → today\n");
    if (result2025.length > 0) {
      console.log("Recent dates (last 10):");
      result2025.slice(-10).forEach((r: any) => {
        console.log(`  ${r.date}: ${r.game_count} games, ${r.log_count} logs`);
      });
    }
    console.log("\n" + "=".repeat(50));
    console.log(
      `TOTAL: ${total2025[0]?.total_games || 0} games, ${total2025[0]?.total_logs || 0} player logs`,
    );
    console.log("=".repeat(50) + "\n");
  }

  await sql.end();
  process.exit(0);
}

main().catch(console.error);
