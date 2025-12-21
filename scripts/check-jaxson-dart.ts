#!/usr/bin/env tsx

import "dotenv/config";
import postgres from "postgres";

async function main() {
  const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) {
    console.error("No DB URL");
    process.exit(1);
  }
  const sql = postgres(conn, { prepare: false });

  // Check if Jaxson Dart has ANY logs, and what propTypes
  const rows = await sql.unsafe(
    `SELECT TRIM(pgl.prop_type) as prop_type, COUNT(*)::int as count
     FROM public.player_game_logs pgl
     JOIN public.players p ON p.id = pgl.player_id
     WHERE LOWER(p.name) LIKE '%jaxson dart%'
     GROUP BY TRIM(pgl.prop_type)
     ORDER BY count DESC`,
  );
  console.log("Jaxson Dart propTypes in DB:");
  rows.forEach((r: any) => console.log(`  ${r.prop_type}: ${r.count} logs`));

  // Check if he has Receiving Yards specifically
  const [r2] = await sql.unsafe(
    `SELECT COUNT(*)::int as count,
            SUM(CASE WHEN actual_value::numeric = 0 THEN 1 ELSE 0 END)::int as zeros
     FROM public.player_game_logs pgl
     JOIN public.players p ON p.id = pgl.player_id
     WHERE LOWER(p.name) LIKE '%jaxson dart%'
       AND LOWER(TRIM(pgl.prop_type)) = 'receiving yards'`,
  );
  console.log(`\nReceiving Yards logs: ${r2.count} (${r2.zeros} are zero-value)`);

  // Check how many games Jaxson Dart has played
  const [r3] = await sql.unsafe(
    `SELECT COUNT(DISTINCT pgl.game_id)::int as games
     FROM public.player_game_logs pgl
     JOIN public.players p ON p.id = pgl.player_id
     WHERE LOWER(p.name) LIKE '%jaxson dart%'`,
  );
  console.log(`Total games played: ${r3.games}`);

  await sql.end();
}

main().catch(console.error);
