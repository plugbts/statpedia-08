import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!conn) throw new Error("DATABASE_URL missing");
const db = postgres(conn);

interface TeamMerge {
  name: string;
  league: string;
  keepAbbr: string;
  removeAbbr: string;
  reason: string;
}

// Define canonical team merges based on audit findings
const TEAM_MERGES: TeamMerge[] = [
  {
    name: "Washington Commanders",
    league: "NFL",
    keepAbbr: "WAS",
    removeAbbr: "WSH",
    reason: "WAS is the standard ESPN abbreviation",
  },
  {
    name: "New Orleans Pelicans",
    league: "NBA",
    keepAbbr: "NOP",
    removeAbbr: "NO",
    reason: "NOP is the standard 3-letter NBA abbreviation",
  },
  {
    name: "Boston Celtics",
    league: "NBA",
    keepAbbr: "BOS",
    removeAbbr: "BCE",
    reason: "BOS is the standard ESPN abbreviation",
  },
  {
    name: "New Jersey Devils",
    league: "NHL",
    keepAbbr: "NJD",
    removeAbbr: "NJ",
    reason: "NJD is the standard 3-letter NHL abbreviation",
  },
  {
    name: "Los Angeles Rams",
    league: "NFL",
    keepAbbr: "LAR",
    removeAbbr: "LA",
    reason: "LAR distinguishes from other LA teams",
  },
  {
    name: "Los Angeles Kings",
    league: "NHL",
    keepAbbr: "LAK",
    removeAbbr: "LA",
    reason: "LAK distinguishes from other LA teams",
  },
  {
    name: "Utah Jazz",
    league: "NBA",
    keepAbbr: "UTA",
    removeAbbr: "UJA",
    reason: "UTA is the standard ESPN abbreviation",
  },
  {
    name: "Boston Bruins",
    league: "NHL",
    keepAbbr: "BOS",
    removeAbbr: "BBR",
    reason: "BOS is the standard ESPN abbreviation",
  },
  {
    name: "Utah Mammoth",
    league: "NHL",
    keepAbbr: "UMA",
    removeAbbr: "UTA",
    reason: "UMA is correct for Utah Mammoth (UTA belongs to Utah Jazz in NBA)",
  },
];

async function mergeTeams() {
  console.log("🔄 Starting team merge process...\n");
  console.log(`Found ${TEAM_MERGES.length} team merges to process\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const merge of TEAM_MERGES) {
    try {
      console.log(`\n${"=".repeat(70)}`);
      console.log(`📋 Processing: ${merge.name} (${merge.league})`);
      console.log(`   Keep: ${merge.keepAbbr} | Remove: ${merge.removeAbbr}`);
      console.log(`   Reason: ${merge.reason}`);
      console.log(`${"=".repeat(70)}\n`);

      // Find both team records
      const teams = await db`
        SELECT t.id, t.name, t.abbreviation, l.code as league_code
        FROM teams t
        JOIN leagues l ON l.id = t.league_id
        WHERE l.code = ${merge.league}
          AND t.abbreviation IN (${merge.keepAbbr}, ${merge.removeAbbr})
        ORDER BY t.abbreviation
      `;

      if (teams.length === 0) {
        console.log(`⚠️  No teams found - may already be merged`);
        continue;
      }

      if (teams.length === 1) {
        console.log(`ℹ️  Only one team found (${teams[0].abbreviation}) - already merged`);
        continue;
      }

      const keepTeam = teams.find((t) => t.abbreviation === merge.keepAbbr);
      const removeTeam = teams.find((t) => t.abbreviation === merge.removeAbbr);

      if (!keepTeam || !removeTeam) {
        console.log(`⚠️  Could not find both teams:`);
        console.table(teams);
        continue;
      }

      console.log(`✅ Found both teams:`);
      console.table([keepTeam, removeTeam]);

      // Check for data to migrate
      const logsToMigrate = await db`
        SELECT COUNT(*) as count
        FROM player_game_logs
        WHERE team_id = ${removeTeam.id} OR opponent_team_id = ${removeTeam.id} OR opponent_id = ${removeTeam.id}
      `;

      console.log(`\n📊 Found ${logsToMigrate[0].count} player_game_logs to migrate`);

      if (parseInt(logsToMigrate[0].count) > 0) {
        // Migrate player_game_logs - team_id
        const teamIdUpdate = await db`
          UPDATE player_game_logs
          SET team_id = ${keepTeam.id}
          WHERE team_id = ${removeTeam.id}
        `;
        console.log(`   ✓ Updated ${teamIdUpdate.count} logs (team_id)`);

        // Migrate player_game_logs - opponent_team_id
        const opponentTeamIdUpdate = await db`
          UPDATE player_game_logs
          SET opponent_team_id = ${keepTeam.id}
          WHERE opponent_team_id = ${removeTeam.id}
        `;
        console.log(`   ✓ Updated ${opponentTeamIdUpdate.count} logs (opponent_team_id)`);

        // Migrate player_game_logs - opponent_id
        const opponentIdUpdate = await db`
          UPDATE player_game_logs
          SET opponent_id = ${keepTeam.id}
          WHERE opponent_id = ${removeTeam.id}
        `;
        console.log(`   ✓ Updated ${opponentIdUpdate.count} logs (opponent_id)`);
      }

      // Check and migrate players table
      const playersToMigrate = await db`
        SELECT COUNT(*) as count
        FROM players
        WHERE team_id = ${removeTeam.id}
      `;

      if (parseInt(playersToMigrate[0].count) > 0) {
        console.log(`\n👥 Found ${playersToMigrate[0].count} players to migrate`);
        const playersUpdate = await db`
          UPDATE players
          SET team_id = ${keepTeam.id}
          WHERE team_id = ${removeTeam.id}
        `;
        console.log(`   ✓ Updated ${playersUpdate.count} players`);
      }

      // Check and migrate games table
      const gamesToMigrate = await db`
        SELECT COUNT(*) as count
        FROM games
        WHERE home_team_id = ${removeTeam.id} OR away_team_id = ${removeTeam.id}
      `;

      if (parseInt(gamesToMigrate[0].count) > 0) {
        console.log(`\n🏟️  Found ${gamesToMigrate[0].count} games to migrate`);

        const homeTeamUpdate = await db`
          UPDATE games
          SET home_team_id = ${keepTeam.id}
          WHERE home_team_id = ${removeTeam.id}
        `;
        console.log(`   ✓ Updated ${homeTeamUpdate.count} games (home_team_id)`);

        const awayTeamUpdate = await db`
          UPDATE games
          SET away_team_id = ${keepTeam.id}
          WHERE away_team_id = ${removeTeam.id}
        `;
        console.log(`   ✓ Updated ${awayTeamUpdate.count} games (away_team_id)`);
      }

      // Check and migrate team_abbrev_map
      const abbrevMaps = await db`
        SELECT league, api_abbrev, team_id, canonical_abbrev
        FROM team_abbrev_map
        WHERE team_id = ${removeTeam.id}
      `;

      if (abbrevMaps.length > 0) {
        console.log(`\n📝 Found ${abbrevMaps.length} abbreviation mappings to migrate`);

        for (const map of abbrevMaps) {
          // Check if mapping already exists for keep team
          const existing = await db`
            SELECT league, api_abbrev FROM team_abbrev_map
            WHERE team_id = ${keepTeam.id}
              AND league = ${map.league}
              AND api_abbrev = ${map.api_abbrev}
          `;

          if (existing.length === 0) {
            // Move mapping to keep team
            await db`
              UPDATE team_abbrev_map
              SET team_id = ${keepTeam.id}
              WHERE league = ${map.league} AND api_abbrev = ${map.api_abbrev}
            `;
            console.log(`   ✓ Migrated mapping: ${map.league}/${map.api_abbrev}`);
          } else {
            // Delete duplicate mapping
            await db`
              DELETE FROM team_abbrev_map 
              WHERE league = ${map.league} AND api_abbrev = ${map.api_abbrev} AND team_id = ${removeTeam.id}
            `;
            console.log(`   ✓ Deleted duplicate mapping: ${map.league}/${map.api_abbrev}`);
          }
        }
      }

      // Delete the duplicate team
      await db`
        DELETE FROM teams WHERE id = ${removeTeam.id}
      `;
      console.log(`\n🗑️  Deleted duplicate team: ${removeTeam.abbreviation} (${removeTeam.id})`);

      // Verify the merge
      const verification = await db`
        SELECT COUNT(*) as count
        FROM player_game_logs
        WHERE team_id = ${keepTeam.id} OR opponent_team_id = ${keepTeam.id} OR opponent_id = ${keepTeam.id}
      `;

      console.log(
        `\n✅ Merge complete! ${verification[0].count} total logs now reference ${keepTeam.abbreviation}`,
      );

      successCount++;
    } catch (error) {
      console.error(`\n❌ Error merging ${merge.name}:`, error);
      errorCount++;
    }
  }

  console.log(`\n${"=".repeat(70)}`);
  console.log(`\n📊 Final Summary:`);
  console.log(`   ✅ Successful merges: ${successCount}`);
  console.log(`   ❌ Failed merges: ${errorCount}`);
  console.log(`   📋 Total processed: ${TEAM_MERGES.length}`);

  // Final verification - check for remaining duplicates
  console.log(`\n🔍 Checking for remaining duplicates...\n`);

  const remainingDuplicates = await db`
    SELECT t.name, l.code as league, array_agg(t.abbreviation) as abbreviations, COUNT(*) as count
    FROM teams t
    JOIN leagues l ON l.id = t.league_id
    GROUP BY t.name, l.code
    HAVING COUNT(*) > 1
    ORDER BY l.code, t.name
  `;

  if (remainingDuplicates.length > 0) {
    console.log(`⚠️  Found ${remainingDuplicates.length} remaining duplicate team names:`);
    console.table(remainingDuplicates);
  } else {
    console.log(`✅ No remaining duplicate team names found!`);
  }

  process.exit(errorCount > 0 ? 1 : 0);
}

mergeTeams().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
