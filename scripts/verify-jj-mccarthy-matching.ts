#!/usr/bin/env tsx

import "dotenv/config";
import postgres from "postgres";

function normalizeHumanNameForMatch(name: string): string {
  return String(name || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/-/g, "")
    .replace(/\b([a-z])\s*\.\s*([a-z])\b/g, "$1$2")
    .replace(/\b([a-z])\s+([a-z])\b/g, (m, a, b) => {
      if (m.length === 3 && m[1] === " ") return a + b;
      return m;
    })
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) {
    console.error("No DB URL");
    process.exit(1);
  }
  const sql = postgres(conn, { prepare: false });

  console.log("Checking J.J. McCarthy matching...\n");

  // Get J.J. McCarthy from DB
  const dbPlayer = await sql.unsafe(
    `SELECT p.id, p.name, p.team_id, t.abbreviation as team_abbr
     FROM public.players p
     LEFT JOIN public.teams t ON t.id = p.team_id
     WHERE LOWER(p.name) LIKE '%j.j.%mccarthy%' OR LOWER(p.name) LIKE '%jj%mccarthy%'
     LIMIT 1`,
  );

  if (dbPlayer.length === 0) {
    console.log("❌ J.J. McCarthy not found in DB");
    await sql.end();
    return;
  }

  const player = dbPlayer[0] as any;
  console.log(`✅ Found in DB: ${player.name} (${player.team_abbr || "no team"})`);
  console.log(`   Normalized: "${normalizeHumanNameForMatch(player.name)}"`);

  // Test SGO name
  const sgoName = "Jj Mccarthy";
  console.log(`\nSGO sends: "${sgoName}"`);
  console.log(`   Normalized: "${normalizeHumanNameForMatch(sgoName)}"`);

  const match = normalizeHumanNameForMatch(player.name) === normalizeHumanNameForMatch(sgoName);
  console.log(`\n${match ? "✅" : "❌"} Names ${match ? "MATCH" : "DON'T MATCH"}`);

  // Check what propTypes he has logs for
  const logs = await sql.unsafe(
    `SELECT TRIM(pgl.prop_type) as prop_type, COUNT(*)::int as count
     FROM public.player_game_logs pgl
     WHERE pgl.player_id = $1
     GROUP BY TRIM(pgl.prop_type)
     ORDER BY count DESC`,
    [player.id],
  );

  console.log(`\nPropTypes with logs:`);
  logs.forEach((r: any) => console.log(`  ${r.prop_type}: ${r.count} logs`));

  // Check if he has logs for "Passing Yards" (common SGO prop)
  const [passingYards] = await sql.unsafe(
    `SELECT COUNT(*)::int as count
     FROM public.player_game_logs pgl
     WHERE pgl.player_id = $1
       AND LOWER(TRIM(pgl.prop_type)) = 'passing yards'`,
    [player.id],
  );
  console.log(`\nPassing Yards logs: ${passingYards.count}`);

  await sql.end();
}

main().catch(console.error);
