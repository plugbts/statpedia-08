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

  // Check if rookies like Jj Mccarthy exist in raw game logs but weren't extracted
  const rows = await sql.unsafe(
    `SELECT DISTINCT r.game_external_id, r.season
     FROM public.player_game_logs_raw r
     WHERE r.league = 'NFL'
       AND r.season IN ('2024', '2025')
     ORDER BY r.season DESC, r.game_external_id DESC
     LIMIT 5`,
  );
  console.log("Recent NFL games in raw table:");
  rows.forEach((r: any) => console.log(`  Game ${r.game_external_id} (season ${r.season})`));

  // Check if any players with 'mccarthy' in name exist
  const players = await sql.unsafe(
    `SELECT p.name, COUNT(DISTINCT pgl.game_id)::int as games
     FROM public.players p
     LEFT JOIN public.player_game_logs pgl ON pgl.player_id = p.id
     WHERE LOWER(p.name) LIKE '%mccarthy%'
     GROUP BY p.name
     ORDER BY games DESC`,
  );
  console.log('\nPlayers with "mccarthy" in name:');
  if (players.length === 0) {
    console.log("  None found");
  } else {
    players.forEach((p: any) => console.log(`  ${p.name}: ${p.games} games`));
  }

  // Check a specific raw game payload for "mccarthy" or "jj"
  const [sampleRaw] = await sql.unsafe(
    `SELECT payload, game_external_id, season
     FROM public.player_game_logs_raw
     WHERE league = 'NFL'
       AND season = '2024'
     ORDER BY fetched_at DESC
     LIMIT 1`,
  );
  if (sampleRaw) {
    console.log(`\nChecking sample game ${sampleRaw.game_external_id} for rookies...`);
    const payload = sampleRaw.payload;
    const teamsData = payload?.boxscore?.players || [];
    const found: string[] = [];
    for (const team of teamsData) {
      const statGroups = team?.statistics || [];
      for (const statGroup of statGroups) {
        const athletes = statGroup?.athletes || [];
        for (const athlete of athletes) {
          const name = athlete?.athlete?.displayName || athlete?.athlete?.shortName;
          if (
            name &&
            (name.toLowerCase().includes("mccarthy") || name.toLowerCase().includes("jj"))
          ) {
            found.push(name);
          }
        }
      }
    }
    if (found.length > 0) {
      console.log(`  Found in raw payload: ${Array.from(new Set(found)).join(", ")}`);
    } else {
      console.log("  No 'mccarthy' or 'jj' found in this game");
    }
  }

  await sql.end();
}

main().catch(console.error);
