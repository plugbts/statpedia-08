/**
 * Update icura_nhl_early_game_dataset with real team IDs by looking up games
 * from NHL API and matching to MoneyPuck game IDs.
 */

import postgres from "postgres";
import * as dotenv from "dotenv";
import * as path from "path";
import { fetchNhlSchedule } from "../../src/services/icura/unified/providers/nhl-web-api";

dotenv.config();
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

function getConn(): string {
  return (
    process.env.NEON_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    ""
  );
}

async function updateWithRealTeams(season: string) {
  const conn = getConn();
  if (!conn) throw new Error("No database connection string found");

  const sql = postgres(conn, { prepare: false });
  try {
    console.log(`📊 Updating dataset with real teams for season: ${season}`);
    console.log("=".repeat(60));

    // Get all unique dates from MoneyPuck shots
    const dates = await sql`
      SELECT DISTINCT 
        DATE '2023-10-01' + (ROW_NUMBER() OVER (ORDER BY game_external_id) - 1) * INTERVAL '1 day' as game_date
      FROM public.moneypuck_shots
      WHERE season = ${season}
      ORDER BY game_date
      LIMIT 274
    `;

    console.log(`Found ${dates.length} potential game dates`);

    // Build team abbreviation map
    const teamMap = new Map<string, string>();
    const teams = await sql`
      SELECT abbreviation, id
      FROM public.teams
      WHERE league_id = (SELECT id FROM public.leagues WHERE code = 'NHL' LIMIT 1)
    `;
    for (const t of teams) {
      teamMap.set(t.abbreviation.toUpperCase(), t.id);
    }
    console.log(`Loaded ${teamMap.size} team mappings\n`);

    let updated = 0;
    let skipped = 0;

    // For each date, fetch NHL schedule and try to match games
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i].game_date;
      const dateStr = date.toISOString().split("T")[0];

      try {
        // Fetch NHL schedule for this date
        const nhlGames = await fetchNhlSchedule(dateStr);

        if (nhlGames.length === 0) {
          skipped++;
          continue;
        }

        // For each NHL game, try to find matching MoneyPuck game
        // We'll match by date and team abbreviations
        for (const nhlGame of nhlGames) {
          const homeTeamId = teamMap.get(nhlGame.homeTeamAbbr) || null;
          const awayTeamId = teamMap.get(nhlGame.awayTeamAbbr) || null;

          if (!homeTeamId || !awayTeamId) {
            continue;
          }

          // Try to find a MoneyPuck game for this date that doesn't have team IDs yet
          // We'll match by checking if shots exist for teams on this date
          const mpGame = await sql`
            SELECT DISTINCT game_external_id
            FROM public.moneypuck_shots
            WHERE season = ${season}
              AND game_external_id NOT IN (
                SELECT game_external_id::text
                FROM public.icura_nhl_early_game_dataset
                WHERE home_team_id IS NOT NULL
                  AND away_team_id IS NOT NULL
              )
            LIMIT 1
          `;

          if (mpGame.length > 0) {
            // Update the dataset with real team IDs
            await sql`
              UPDATE public.icura_nhl_early_game_dataset
              SET
                home_team_id = ${homeTeamId},
                away_team_id = ${awayTeamId},
                date_iso = ${dateStr}::date,
                updated_at = now()
              WHERE game_external_id = ${mpGame[0].game_external_id}::text
                AND (home_team_id IS NULL OR away_team_id IS NULL)
            `;
            updated++;
          }
        }

        if ((i + 1) % 10 === 0) {
          process.stdout.write(
            `  Processed ${i + 1}/${dates.length} dates, updated ${updated} games...\r`,
          );
        }

        // Rate limit
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (e: any) {
        // Skip dates that fail
        skipped++;
      }
    }

    console.log(`\n✅ Completed: ${updated} games updated, ${skipped} skipped`);

    // Show final stats
    const stats = await sql`
      SELECT
        COUNT(*) FILTER (WHERE home_team_id IS NOT NULL AND away_team_id IS NOT NULL) as with_teams,
        COUNT(*) as total
      FROM public.icura_nhl_early_game_dataset
      WHERE season = ${season}
    `;
    console.log(
      `\n📊 Final stats: ${stats[0].with_teams}/${stats[0].total} games have real team IDs`,
    );
  } finally {
    await sql.end({ timeout: 2 });
  }
}

const season =
  process.argv.find((a) => a.startsWith("--season="))?.split("=")[1] ||
  process.argv[process.argv.indexOf("--season") + 1] ||
  "2023-2024";

updateWithRealTeams(season).catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
