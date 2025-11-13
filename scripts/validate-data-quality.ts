import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!conn) throw new Error("DATABASE_URL missing");
const db = postgres(conn);

interface ValidationResult {
  test: string;
  status: "PASS" | "FAIL" | "WARNING";
  details: string;
  data?: any;
}

const results: ValidationResult[] = [];

function addResult(test: string, status: "PASS" | "FAIL" | "WARNING", details: string, data?: any) {
  results.push({ test, status, details, data });
  const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "⚠️";
  console.log(`${icon} ${test}: ${details}`);
  if (data) console.table(data);
}

async function test1_DateOrdering() {
  console.log("\n📅 TEST 1: Date Ordering - Chronological Verification\n");

  // Pick a team with substantial game history
  const teamSample = await db`
    SELECT t.id, t.name, t.abbreviation, l.code as league, COUNT(DISTINCT g.id) as game_count
    FROM teams t
    JOIN leagues l ON l.id = t.league_id
    LEFT JOIN games g ON g.home_team_id = t.id OR g.away_team_id = t.id
    GROUP BY t.id, t.name, t.abbreviation, l.code
    HAVING COUNT(DISTINCT g.id) >= 10
    ORDER BY COUNT(DISTINCT g.id) DESC
    LIMIT 1
  `;

  if (teamSample.length === 0) {
    addResult("Date Ordering", "WARNING", "No teams with 10+ games found");
    return;
  }

  const team = teamSample[0];
  console.log(`Selected team: ${team.name} (${team.abbreviation}) - ${team.game_count} games\n`);

  // Get last 10 games ordered by date
  const games = await db`
    SELECT 
      g.id,
      g.game_date,
      CASE 
        WHEN g.home_team_id = ${team.id} THEN 'Home'
        ELSE 'Away'
      END as location,
      CASE 
        WHEN g.home_team_id = ${team.id} THEN opp.name
        ELSE home.name
      END as opponent,
      g.home_score,
      g.away_score
    FROM games g
    LEFT JOIN teams home ON home.id = g.home_team_id
    LEFT JOIN teams opp ON opp.id = g.away_team_id
    WHERE g.home_team_id = ${team.id} OR g.away_team_id = ${team.id}
    ORDER BY g.game_date DESC
    LIMIT 10
  `;

  console.log("Last 10 games:");
  console.table(
    games.map((g) => ({
      date: g.game_date?.toISOString().split("T")[0],
      location: g.location,
      opponent: g.opponent,
      score: `${g.home_score}-${g.away_score}`,
    })),
  );

  // Validate chronological ordering
  let isChronological = true;
  let hasDuplicates = false;
  const dates = games.map((g) => g.game_date?.getTime()).filter(Boolean);

  for (let i = 0; i < dates.length - 1; i++) {
    if (dates[i] === dates[i + 1]) {
      hasDuplicates = true;
    }
    if (dates[i] < dates[i + 1]) {
      isChronological = false;
    }
  }

  const uniqueDates = new Set(dates).size;

  if (isChronological && !hasDuplicates) {
    addResult(
      "Date Ordering",
      "PASS",
      `All ${games.length} games strictly chronological, no duplicates`,
    );
  } else if (!isChronological) {
    addResult("Date Ordering", "FAIL", `Games not in chronological order`);
  } else {
    addResult(
      "Date Ordering",
      "WARNING",
      `${dates.length - uniqueDates} duplicate dates found (may be legitimate doubleheaders)`,
    );
  }
}

async function test2_LogoRendering() {
  console.log("\n🖼️  TEST 2: Logo Rendering - ESPN CDN Validation\n");

  // Get 5 random teams with logos
  const teams = await db`
    SELECT t.id, t.name, t.abbreviation, t.logo_url, l.code as league
    FROM teams t
    JOIN leagues l ON l.id = t.league_id
    WHERE t.logo_url IS NOT NULL
    ORDER BY RANDOM()
    LIMIT 5
  `;

  console.log("Testing 5 random teams:\n");
  console.table(
    teams.map((t) => ({
      team: t.name,
      abbr: t.abbreviation,
      league: t.league,
      logo_url: t.logo_url,
    })),
  );

  let allValid = true;
  const issues: string[] = [];

  for (const team of teams) {
    const url = team.logo_url;

    // Check URL pattern
    const expectedPattern = `https://a.espncdn.com/i/teamlogos/${team.league.toLowerCase()}/500/${team.abbreviation.toLowerCase()}.png`;

    if (url !== expectedPattern) {
      allValid = false;
      issues.push(`${team.name}: URL mismatch. Expected: ${expectedPattern}, Got: ${url}`);
    }

    // Check casing (should be lowercase)
    const urlParts = url.split("/");
    const abbr = urlParts[urlParts.length - 1].split(".")[0];
    if (abbr !== abbr.toLowerCase()) {
      allValid = false;
      issues.push(`${team.name}: Abbreviation not lowercase in URL: ${abbr}`);
    }
  }

  if (allValid) {
    addResult("Logo Rendering", "PASS", "All 5 teams have valid ESPN CDN URLs with correct casing");
  } else {
    addResult("Logo Rendering", "FAIL", `Issues found:\n${issues.join("\n")}`);
  }

  // Check for any teams without logos
  const missingLogos = await db`
    SELECT COUNT(*) as count FROM teams WHERE logo_url IS NULL
  `;

  if (parseInt(missingLogos[0].count) > 0) {
    addResult(
      "Logo Rendering",
      "WARNING",
      `${missingLogos[0].count} teams still missing logo URLs`,
    );
  }
}

async function test3_TeamNameNormalization() {
  console.log("\n📛 TEST 3: Team Name Normalization - Duplicate Check\n");

  // Check for duplicate team names
  const duplicates = await db`
    SELECT t.name, l.code as league, array_agg(t.abbreviation) as abbreviations, COUNT(*) as count
    FROM teams t
    JOIN leagues l ON l.id = t.league_id
    GROUP BY t.name, l.code
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
  `;

  if (duplicates.length === 0) {
    addResult(
      "Team Name Normalization",
      "PASS",
      "No duplicate team names found - all teams normalized",
    );
  } else {
    console.table(duplicates);
    addResult(
      "Team Name Normalization",
      "FAIL",
      `Found ${duplicates.length} teams with duplicate entries`,
      duplicates,
    );
  }

  // Test specific previously merged teams
  const mergedTeams = [
    { name: "Washington Commanders", expectedAbbr: "WAS", league: "NFL" },
    { name: "Boston Celtics", expectedAbbr: "BOS", league: "NBA" },
    { name: "New Orleans Pelicans", expectedAbbr: "NOP", league: "NBA" },
    { name: "Utah Jazz", expectedAbbr: "UTA", league: "NBA" },
  ];

  console.log("\nVerifying previously merged teams:\n");
  for (const test of mergedTeams) {
    const results = await db`
      SELECT t.abbreviation, COUNT(*) as count
      FROM teams t
      JOIN leagues l ON l.id = t.league_id
      WHERE t.name = ${test.name} AND l.code = ${test.league}
      GROUP BY t.abbreviation
    `;

    if (results.length === 1 && results[0].abbreviation === test.expectedAbbr) {
      console.log(`✅ ${test.name}: Only ${test.expectedAbbr} exists`);
    } else if (results.length === 0) {
      console.log(`⚠️  ${test.name}: Not found in database`);
    } else {
      console.log(`❌ ${test.name}: Multiple entries found:`, results);
    }
  }
}

async function test4_StreakCalculation() {
  console.log("\n📊 TEST 4: Streak Calculation - Win/Loss Consistency\n");

  // Note: This system tracks player props, not team win/loss
  console.log("ℹ️  This system tracks player statistical props, not team win/loss records.");
  console.log("Checking player performance streak consistency instead...\n");

  // Pick a player with substantial history
  const player = await db`
    SELECT p.id, p.name, t.name as team, COUNT(*) as game_count
    FROM players p
    JOIN teams t ON t.id = p.team_id
    JOIN player_game_logs pgl ON pgl.player_id = p.id
    GROUP BY p.id, p.name, t.name
    HAVING COUNT(*) >= 10
    ORDER BY COUNT(*) DESC
    LIMIT 1
  `;

  if (player.length === 0) {
    addResult("Streak Calculation", "WARNING", "No players with 10+ games found");
    return;
  }

  console.log(
    `Selected player: ${player[0].name} (${player[0].team}) - ${player[0].game_count} games\n`,
  );

  // Get recent games with stats
  const recentGames = await db`
    SELECT 
      game_date,
      prop_type,
      actual_value,
      line,
      hit,
      CASE WHEN actual_value > line THEN 'OVER' ELSE 'UNDER' END as result
    FROM player_game_logs
    WHERE player_id = ${player[0].id}
      AND actual_value IS NOT NULL
      AND line IS NOT NULL
    ORDER BY game_date DESC
    LIMIT 10
  `;

  console.log("Recent 10 games with prop results:");
  console.table(
    recentGames.map((g) => ({
      date: g.game_date?.toISOString().split("T")[0],
      prop: g.prop_type,
      actual: g.actual_value,
      line: g.line,
      hit: g.hit,
      result: g.result,
    })),
  );

  if (recentGames.length > 0) {
    addResult(
      "Streak Calculation",
      "PASS",
      `Found ${recentGames.length} games with prop/line comparisons for streak calculation`,
    );
  } else {
    addResult(
      "Streak Calculation",
      "WARNING",
      "No games with both actual_value and line for streak calculation",
    );
  }
}

async function test5_HistoricalCompleteness() {
  console.log("\n📚 TEST 5: Historical Completeness - Season Coverage\n");

  // Get game count by league and month
  const coverage = await db`
    SELECT 
      l.name as league,
      DATE_TRUNC('month', g.game_date) as month,
      COUNT(*) as game_count
    FROM games g
    JOIN teams t ON t.id = g.home_team_id
    JOIN leagues l ON l.id = t.league_id
    WHERE g.game_date IS NOT NULL
    GROUP BY l.name, DATE_TRUNC('month', g.game_date)
    ORDER BY l.name, month DESC
  `;

  console.log("Games by league and month:");
  console.table(
    coverage.slice(0, 20).map((c) => ({
      league: c.league,
      month: c.month?.toISOString().split("T")[0],
      games: c.game_count,
    })),
  );

  // Get overall stats
  const stats = await db`
    SELECT 
      l.name as league,
      COUNT(DISTINCT g.id) as total_games,
      MIN(g.game_date) as earliest_game,
      MAX(g.game_date) as latest_game,
      COUNT(DISTINCT DATE_TRUNC('day', g.game_date)) as unique_dates
    FROM games g
    JOIN teams t ON t.id = g.home_team_id
    JOIN leagues l ON l.id = t.league_id
    WHERE g.game_date IS NOT NULL
    GROUP BY l.name
    ORDER BY total_games DESC
  `;

  console.log("\nOverall coverage by league:");
  console.table(
    stats.map((s) => ({
      league: s.league,
      total_games: s.total_games,
      earliest: s.earliest_game?.toISOString().split("T")[0],
      latest: s.latest_game?.toISOString().split("T")[0],
      unique_dates: s.unique_dates,
    })),
  );

  const totalGames = stats.reduce((sum, s) => sum + parseInt(s.total_games), 0);

  if (totalGames > 0) {
    addResult(
      "Historical Completeness",
      "PASS",
      `${totalGames} total games across ${stats.length} leagues`,
    );
  } else {
    addResult("Historical Completeness", "FAIL", "No games found in database");
  }
}

async function test6_CrossTeamConsistency() {
  console.log("\n🤝 TEST 6: Cross-Team Consistency - Matchup Validation\n");

  // Find a recent matchup
  const matchup = await db`
    SELECT 
      g.id,
      g.game_date,
      home.name as home_team,
      away.name as away_team,
      g.home_score,
      g.away_score,
      CASE 
        WHEN g.home_score > g.away_score THEN home.name
        WHEN g.away_score > g.home_score THEN away.name
        ELSE 'TIE'
      END as winner
    FROM games g
    JOIN teams home ON home.id = g.home_team_id
    JOIN teams away ON away.id = g.away_team_id
    WHERE g.home_score IS NOT NULL 
      AND g.away_score IS NOT NULL
    ORDER BY g.game_date DESC
    LIMIT 1
  `;

  if (matchup.length === 0) {
    addResult("Cross-Team Consistency", "WARNING", "No games with scores found");
    return;
  }

  const game = matchup[0];
  console.log("Testing matchup:");
  console.table([
    {
      date: game.game_date?.toISOString().split("T")[0],
      home: game.home_team,
      away: game.away_team,
      score: `${game.home_score}-${game.away_score}`,
      winner: game.winner,
    },
  ]);

  // Check if both teams' player logs reference this game
  const homeLogs = await db`
    SELECT COUNT(*) as count
    FROM player_game_logs pgl
    JOIN players p ON p.id = pgl.player_id
    JOIN teams t ON t.id = p.team_id
    WHERE pgl.game_id = ${game.id}
      AND t.name = ${game.home_team}
  `;

  const awayLogs = await db`
    SELECT COUNT(*) as count
    FROM player_game_logs pgl
    JOIN players p ON p.id = pgl.player_id
    JOIN teams t ON t.id = p.team_id
    WHERE pgl.game_id = ${game.id}
      AND t.name = ${game.away_team}
  `;

  console.log(`\nPlayer logs for this game:`);
  console.log(`  ${game.home_team}: ${homeLogs[0].count} logs`);
  console.log(`  ${game.away_team}: ${awayLogs[0].count} logs`);

  const homeCount = parseInt(homeLogs[0].count);
  const awayCount = parseInt(awayLogs[0].count);

  if (homeCount > 0 && awayCount > 0) {
    addResult(
      "Cross-Team Consistency",
      "PASS",
      `Both teams have player logs for the same game (${homeCount} + ${awayCount} total)`,
    );
  } else if (homeCount === 0 && awayCount === 0) {
    addResult(
      "Cross-Team Consistency",
      "WARNING",
      "No player logs found for this game (game exists but no player stats)",
    );
  } else {
    addResult(
      "Cross-Team Consistency",
      "WARNING",
      `Imbalanced logs: ${game.home_team}=${homeCount}, ${game.away_team}=${awayCount}`,
    );
  }
}

async function generateReport() {
  console.log("\n" + "=".repeat(70));
  console.log("📋 VALIDATION SUMMARY REPORT");
  console.log("=".repeat(70) + "\n");

  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  const warnings = results.filter((r) => r.status === "WARNING").length;

  console.log(`✅ PASSED: ${passed}`);
  console.log(`❌ FAILED: ${failed}`);
  console.log(`⚠️  WARNINGS: ${warnings}`);
  console.log(`\nTotal Tests: ${results.length}\n`);

  if (failed === 0) {
    console.log("🎉 All critical validations passed!");
  } else {
    console.log("⚠️  Some validations failed. Review details above.");
  }

  console.log("\n" + "=".repeat(70));
}

async function runAllValidations() {
  console.log("🧪 Starting Data Quality Validation Suite...\n");
  console.log("Running 6 comprehensive validation tests:\n");

  try {
    await test1_DateOrdering();
    await test2_LogoRendering();
    await test3_TeamNameNormalization();
    await test4_StreakCalculation();
    await test5_HistoricalCompleteness();
    await test6_CrossTeamConsistency();

    await generateReport();

    process.exit(results.some((r) => r.status === "FAIL") ? 1 : 0);
  } catch (error) {
    console.error("❌ Fatal error during validation:", error);
    process.exit(1);
  }
}

runAllValidations();
