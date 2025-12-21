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

  const missing = ["Jj Mccarthy", "Tj Hockenson", "Wandale Robinson", "Jaxson Dart"];
  console.log("Checking if missing players exist in DB with different name formats...\n");

  for (const name of missing) {
    const searchTerms = [
      name.toLowerCase(),
      name.replace(/\s+/g, " ").toLowerCase(),
      name.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase(),
    ];

    const rows = await sql.unsafe(
      `
      SELECT DISTINCT p.name, COUNT(DISTINCT pgl.id)::int as log_count
      FROM public.players p
      LEFT JOIN public.player_game_logs pgl ON pgl.player_id = p.id
      WHERE LOWER(p.name) LIKE ANY($1::text[])
      GROUP BY p.name
      ORDER BY log_count DESC
      LIMIT 5
    `,
      [searchTerms.map((t) => `%${t}%`)],
    );

    if (rows.length > 0) {
      console.log(`${name} -> Found:`);
      rows.forEach((r: any) => console.log(`  - ${r.name} (${r.log_count} logs)`));
    } else {
      console.log(`${name} -> NOT FOUND in DB`);
    }
  }

  await sql.end();
}

main().catch(console.error);
