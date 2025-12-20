#!/usr/bin/env tsx
/**
 * Ingest NBA Game Logs for Specific Player
 *
 * 1. Ingests NBA game logs for recent games (last 30 days)
 * 2. Matches player by name
 * 3. Runs analytics enrichment
 */

import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and, gte, lte } from "drizzle-orm";
import { games, players, teams, player_game_logs, leagues } from "../src/db/schema/index";

async function main() {
  const playerName = process.argv[2] || "Donovan Mitchell";
  const daysBack = parseInt(process.argv[3] || "30", 10);

  const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) {
    console.error("❌ DATABASE_URL not set");
    process.exit(1);
  }

  const sql = postgres(conn, { prepare: false });
  const db = drizzle(sql);

  try {
    console.log(`🏀 NBA INGESTION FOR: ${playerName}\n`);
    console.log("=".repeat(80));

    // Step 1: Find player
    const playerRecords = await db.select().from(players).where(eq(players.name, playerName));

    if (playerRecords.length === 0) {
      console.log(`❌ Player "${playerName}" not found in database`);
      return;
    }

    const player = playerRecords[0];
    console.log(`✅ Found player: ${player.name} (${player.id})`);
    console.log(`   Team: ${player.team_id || "N/A"}`);

    // Step 2: Get NBA league
    const nbaLeague = await sql`
      SELECT id, code FROM public.leagues WHERE code = 'NBA' LIMIT 1
    `;
    if (nbaLeague.length === 0) {
      console.log("❌ NBA league not found");
      return;
    }
    const leagueId = nbaLeague[0].id;

    // Step 3: Get recent game dates (last N days)
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - daysBack);

    console.log(
      `\n📅 Fetching games from ${startDate.toISOString().split("T")[0]} to ${today.toISOString().split("T")[0]}`,
    );

    // Step 4: Fetch NBA schedule for each day
    const gameIds: string[] = [];
    const dates: string[] = [];

    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const yyyymmdd = dateStr.replace(/-/g, "");

      try {
        const url = `https://cdn.nba.com/static/json/liveData/scoreboard/v2/scoreboard_${yyyymmdd}.json`;
        console.log(`  Fetching ${dateStr}...`);

        const res = await fetch(url, {
          headers: { Accept: "application/json" },
        });

        if (res.ok) {
          const data: any = await res.json();
          const games = (data?.scoreboard?.games as any[]) || [];

          for (const game of games) {
            if (game.gameId && !gameIds.includes(game.gameId)) {
              gameIds.push(game.gameId);
              dates.push(dateStr);
            }
          }

          console.log(`    Found ${games.length} games`);
        }

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`    Error fetching ${dateStr}:`, error);
      }
    }

    console.log(`\n📊 Found ${gameIds.length} unique games to process`);

    // Step 5: Ingest game logs for each game
    let logsInserted = 0;
    let playerLogsFound = 0;

    for (let i = 0; i < gameIds.length; i++) {
      const gameId = gameIds[i];
      const dateStr = dates[i];

      try {
        console.log(`\n🎯 Processing game ${i + 1}/${gameIds.length}: ${gameId} (${dateStr})`);

        // Fetch boxscore
        const boxscoreUrl = `https://stats.nba.com/stats/boxscoretraditionalv2?GameID=${gameId}&StartPeriod=0&EndPeriod=14`;
        const res = await fetch(boxscoreUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "application/json",
            Referer: "https://www.nba.com/",
            Origin: "https://www.nba.com",
          },
        });

        if (!res.ok) {
          console.log(`    ⚠️  Failed to fetch boxscore: ${res.status}`);
          continue;
        }

        const data: any = await res.json();
        const playerSet = data.resultSets?.find((s: any) =>
          (s.name || "").toLowerCase().includes("player"),
        );

        if (!playerSet || !playerSet.rowSet) {
          console.log(`    ⚠️  No player data found`);
          continue;
        }

        const headers = playerSet.headers;
        const rows = playerSet.rowSet;

        // Get or create game
        const gameRecord = await sql`
          SELECT id FROM public.games WHERE api_game_id = ${gameId} LIMIT 1
        `;

        if (gameRecord.length === 0) {
          // Need to create game - get teams from boxscore
          const teamSet = data.resultSets?.find((s: any) =>
            (s.name || "").toLowerCase().includes("team"),
          );

          if (!teamSet || !teamSet.rowSet || teamSet.rowSet.length < 2) {
            console.log(`    ⚠️  Cannot create game - missing team data`);
            continue;
          }

          // For now, skip game creation and just process player logs
          // We'll match by player name instead
          console.log(`    ⚠️  Game not in DB, processing logs by player name match`);
        }

        // Process player rows
        for (const row of rows) {
          const playerObj: any = {};
          headers.forEach((h: string, i: number) => {
            playerObj[h] = row[i];
          });

          const apiPlayerName = playerObj.PLAYER_NAME;
          const teamAbbr = playerObj.TEAM_ABBREVIATION;
          const pts = playerObj.PTS;
          const reb = playerObj.REB;
          const ast = playerObj.AST;
          const min = playerObj.MIN;

          // Skip if player didn't play
          if (!min || min === "") continue;

          // Check if this is our target player (case-insensitive name match)
          if (
            (apiPlayerName && playerName.toLowerCase().includes(apiPlayerName.toLowerCase())) ||
            apiPlayerName.toLowerCase().includes(playerName.toLowerCase())
          ) {
            console.log(
              `    ✅ Found ${apiPlayerName} (${teamAbbr}): ${pts}PTS ${reb}REB ${ast}AST`,
            );

            // Get or create player by name match
            let targetPlayerId = player.id;

            // Check if we need to match by name
            if (apiPlayerName.toLowerCase() !== playerName.toLowerCase()) {
              const nameMatch = await sql`
                SELECT id FROM public.players 
                WHERE LOWER(name) = LOWER(${apiPlayerName}) 
                   OR LOWER(full_name) = LOWER(${apiPlayerName})
                LIMIT 1
              `;
              if (nameMatch.length > 0) {
                targetPlayerId = nameMatch[0].id;
              }
            }

            // Get team
            const teamRecord = await sql`
              SELECT id FROM public.teams 
              WHERE abbreviation = ${teamAbbr} 
                AND league_id = ${leagueId}
              LIMIT 1
            `;

            if (teamRecord.length === 0) {
              console.log(`    ⚠️  Team ${teamAbbr} not found`);
              continue;
            }

            const teamId = teamRecord[0].id;

            // Create game log entries for different prop types
            const logEntries = [];
            const gameDate = new Date(dateStr);

            // Points
            if (pts != null) {
              logEntries.push({
                player_id: targetPlayerId,
                team_id: teamId,
                game_id: null, // Will be set if game exists
                prop_type: "Points",
                actual_value: Number(pts),
                line: null,
                hit: null,
                game_date: gameDate,
                season: gameDate.getFullYear().toString(),
                home_away: null,
              });
            }

            // Rebounds
            if (reb != null) {
              logEntries.push({
                player_id: targetPlayerId,
                team_id: teamId,
                game_id: null,
                prop_type: "Rebounds",
                actual_value: Number(reb),
                line: null,
                hit: null,
                game_date: gameDate,
                season: gameDate.getFullYear().toString(),
                home_away: null,
              });
            }

            // Assists
            if (ast != null) {
              logEntries.push({
                player_id: targetPlayerId,
                team_id: teamId,
                game_id: null,
                prop_type: "Assists",
                actual_value: Number(ast),
                line: null,
                hit: null,
                game_date: gameDate,
                season: gameDate.getFullYear().toString(),
                home_away: null,
              });
            }

            // Insert logs
            for (const entry of logEntries) {
              try {
                await sql`
                  INSERT INTO public.player_game_logs (
                    player_id, team_id, game_id, prop_type, actual_value,
                    line, hit, game_date, season, home_away
                  ) VALUES (
                    ${entry.player_id}, ${entry.team_id}, ${entry.game_id},
                    ${entry.prop_type}, ${entry.actual_value},
                    ${entry.line}, ${entry.hit}, ${entry.game_date},
                    ${entry.season}, ${entry.home_away}
                  )
                  ON CONFLICT DO NOTHING
                `;
                logsInserted++;
              } catch (error) {
                console.error(`    ❌ Error inserting log:`, error);
              }
            }

            playerLogsFound++;
          }
        }

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`    ❌ Error processing game ${gameId}:`, error);
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log(`✅ INGESTION COMPLETE`);
    console.log(`   Games processed: ${gameIds.length}`);
    console.log(`   Logs inserted: ${logsInserted}`);
    console.log(`   Player logs found: ${playerLogsFound}`);
    console.log("=".repeat(80));

    // Step 6: Run analytics enrichment for this player
    if (playerLogsFound > 0) {
      console.log(`\n🔄 Running analytics enrichment...`);
      const { execSync } = await import("child_process");
      try {
        execSync(
          `ENRICH_SEASON=${new Date().getFullYear()} ENRICH_LIMIT=100 npx tsx scripts/enrich-player-analytics.ts`,
          {
            stdio: "inherit",
            env: { ...process.env, DATABASE_URL: conn },
          },
        );
        console.log(`✅ Analytics enrichment complete`);
      } catch (error) {
        console.error(`❌ Analytics enrichment failed:`, error);
      }
    }
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await sql.end({ timeout: 2 });
  }
}

main().catch(console.error);
