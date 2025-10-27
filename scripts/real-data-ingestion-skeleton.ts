import fetch from "node-fetch";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  players,
  teams,
  games,
  player_game_logs,
  defense_ranks,
  leagues,
} from "../src/db/schema/index";
import { eq, and, desc, sql } from "drizzle-orm";
import * as dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

type League = "NFL" | "NBA" | "MLB" | "NHL" | "WNBA";

interface Game {
  id: string;
  externalId?: string;
  season: number;
  date: string;
  homeTeam: string;
  awayTeam: string;
}

interface PlayerLog {
  playerId: string;
  playerName: string;
  team: string;
  opponent: string;
  gameId: string;
  date: string;
  stats: Record<string, number>;
}

// Team ID mapping for each league (will be populated from database)
const teamIdMap: Record<League, Record<string, string>> = {
  NFL: {},
  NBA: {},
  MLB: {},
  NHL: {},
  WNBA: {},
};

const playerIdMap: Record<League, Record<string, string>> = {
  NFL: {},
  NBA: {},
  MLB: {},
  NHL: {},
  WNBA: {},
};

// --- Normalization helpers ---
function normalizePropType(propType: string): string {
  switch (propType.toLowerCase().replace(/\s+/g, "_")) {
    // NFL
    case "passing_yards":
    case "pass_yards":
      return "Passing Yards";
    case "passing_tds":
    case "pass_tds":
      return "Passing TDs";
    case "passing_completions":
    case "completions":
      return "Passing Completions";
    case "pass_attempts":
      return "Pass Attempts";
    case "rushing_yards":
    case "rush_yards":
      return "Rushing Yards";
    case "rushing_tds":
    case "rush_tds":
      return "Rushing TDs";
    case "rush_attempts":
      return "Rush Attempts";
    case "receiving_yards":
    case "rec_yards":
      return "Receiving Yards";
    case "receiving_tds":
    case "rec_tds":
      return "Receiving TDs";
    case "receptions":
    case "catches":
      return "Receptions";

    // NBA
    case "points":
      return "Points";
    case "assists":
      return "Assists";
    case "rebounds":
      return "Rebounds";
    case "3_pointers_made":
    case "three_pointers":
      return "3-Pointers Made";
    case "steals":
      return "Steals";
    case "blocks":
      return "Blocks";

    // MLB
    case "hits":
      return "Hits";
    case "strikeouts":
    case "strike_outs":
      return "Strikeouts";
    case "total_bases":
    case "tb":
      return "Total Bases";
    case "runs":
      return "Runs";
    case "rbis":
    case "rbi":
      return "RBIs";
    case "walks":
    case "bb":
      return "Walks";

    // NHL
    case "shots_on_goal":
    case "shots":
      return "Shots on Goal";
    case "goals":
      return "Goals";
    // "assists" and "points" already handled above in NBA section
    case "saves":
      return "Saves";

    default:
      return propType;
  }
}

// --- Initialize team and player mappings ---
async function initializeMappings(league: League) {
  console.log(`Initializing mappings for ${league}...`);

  // Get league ID first
  const leagueRecord = await db.select().from(leagues).where(eq(leagues.code, league)).limit(1);
  if (leagueRecord.length === 0) {
    console.warn(`League ${league} not found in database`);
    return;
  }

  const leagueId = leagueRecord[0].id;

  // Load team abbreviation mappings using raw SQL
  console.log(`Querying team_abbrev_map for league: ${league}`);
  const teamMappingsResult = await db.execute(sql`
    SELECT api_abbrev, team_id FROM team_abbrev_map 
    WHERE league = ${league}
  `);

  console.log(`Team mappings result:`, teamMappingsResult);
  const teamMappings = teamMappingsResult || [];
  console.log(`Team mappings rows:`, teamMappings);
  teamMappings.forEach((row: any) => {
    teamIdMap[league][row.api_abbrev] = row.team_id;
  });

  // Load players using raw SQL
  const leaguePlayersResult = await db.execute(sql`
    SELECT p.* FROM players p
    JOIN teams t ON p.team_id = t.id
    WHERE t.league_id = ${leagueId}
  `);

  const leaguePlayers = leaguePlayersResult || [];
  leaguePlayers.forEach((row: any) => {
    playerIdMap[league][row.name] = row.id;
  });

  console.log(
    `Loaded ${teamMappings.length} team mappings and ${leaguePlayers.length} players for ${league}`,
  );
}

// --- DB upserts ---
async function upsertGame(league: League, g: Game) {
  const homeTeamId = teamIdMap[league][g.homeTeam];
  const awayTeamId = teamIdMap[league][g.awayTeam];

  if (!homeTeamId || !awayTeamId) {
    console.warn(`Missing team IDs for game ${g.id}: home=${g.homeTeam}, away=${g.awayTeam}`);
    return;
  }

  // Get league ID
  const leagueRecord = await db.select().from(leagues).where(eq(leagues.code, league)).limit(1);
  if (leagueRecord.length === 0) {
    console.warn(`League ${league} not found`);
    return;
  }

  await db
    .insert(games)
    .values({
      id: g.id,
      league_id: leagueRecord[0].id,
      season: g.season.toString(),
      game_date: g.date,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      external_id: g.externalId,
    })
    .onConflictDoNothing();
}

async function upsertPlayerLog(league: League, log: PlayerLog) {
  const playerId = playerIdMap[league][log.playerName] || playerIdMap[league][log.playerId];
  const teamId = teamIdMap[league][log.team];
  const opponentTeamId = teamIdMap[league][log.opponent];

  if (!playerId || !teamId || !opponentTeamId) {
    console.warn(
      `Missing IDs for player log: player=${log.playerName}, team=${log.team}, opponent=${log.opponent}`,
    );
    return;
  }

  // Create game log entries for each stat type
  const logEntries = [];

  // NFL stats
  if (league === "NFL") {
    if (log.stats.passing_yards !== undefined) {
      logEntries.push({
        player_id: playerId,
        team_id: teamId,
        game_id: log.gameId,
        opponent_id: opponentTeamId,
        prop_type: "Passing Yards",
        line: log.stats.passing_yards,
        actual_value: log.stats.passing_yards,
        hit: true,
        game_date: log.date,
        season: new Date(log.date).getFullYear().toString(),
        home_away: "away" as const,
      });
    }

    if (log.stats.rush_yards !== undefined) {
      logEntries.push({
        player_id: playerId,
        team_id: teamId,
        game_id: log.gameId,
        opponent_id: opponentTeamId,
        prop_type: "Rushing Yards",
        line: log.stats.rush_yards,
        actual_value: log.stats.rush_yards,
        hit: true,
        game_date: log.date,
        season: new Date(log.date).getFullYear().toString(),
        home_away: "away" as const,
      });
    }

    if (log.stats.rec_yards !== undefined) {
      logEntries.push({
        player_id: playerId,
        team_id: teamId,
        game_id: log.gameId,
        opponent_id: opponentTeamId,
        prop_type: "Receiving Yards",
        line: log.stats.rec_yards,
        actual_value: log.stats.rec_yards,
        hit: true,
        game_date: log.date,
        season: new Date(log.date).getFullYear().toString(),
        home_away: "away" as const,
      });
    }
  }

  // NBA stats
  if (league === "NBA") {
    if (log.stats.points !== undefined) {
      logEntries.push({
        player_id: playerId,
        team_id: teamId,
        game_id: log.gameId,
        opponent_id: opponentTeamId,
        prop_type: "Points",
        line: log.stats.points,
        actual_value: log.stats.points,
        hit: true,
        game_date: log.date,
        season: new Date(log.date).getFullYear().toString(),
        home_away: "away" as const,
      });
    }

    if (log.stats.assists !== undefined) {
      logEntries.push({
        player_id: playerId,
        team_id: teamId,
        game_id: log.gameId,
        opponent_id: opponentTeamId,
        prop_type: "Assists",
        line: log.stats.assists,
        actual_value: log.stats.assists,
        hit: true,
        game_date: log.date,
        season: new Date(log.date).getFullYear().toString(),
        home_away: "away" as const,
      });
    }

    if (log.stats.rebounds !== undefined) {
      logEntries.push({
        player_id: playerId,
        team_id: teamId,
        game_id: log.gameId,
        opponent_id: opponentTeamId,
        prop_type: "Rebounds",
        line: log.stats.rebounds,
        actual_value: log.stats.rebounds,
        hit: true,
        game_date: log.date,
        season: new Date(log.date).getFullYear().toString(),
        home_away: "away" as const,
      });
    }
  }

  // Insert all log entries
  if (logEntries.length > 0) {
    await db.insert(player_game_logs).values(logEntries);
  }
}

// --- League-Specific Fetchers ---

// NFL (using nflfastR CSVs)
async function fetchNFLGamesAndLogs(season: number = 2023) {
  console.log(`Fetching NFL data for ${season} season...`);

  try {
    // Fetch games
    const gamesUrl = `https://raw.githubusercontent.com/nflverse/nflfastR-data/master/schedules/sched_${season}.csv`;
    const gamesResp = await fetch(gamesUrl);
    const gamesData = await gamesResp.text();

    // Fetch player stats
    const statsUrl = `https://raw.githubusercontent.com/nflverse/nflfastR-data/master/data/player_stats/player_stats_${season}.csv`;
    const statsResp = await fetch(statsUrl);
    const statsData = await statsResp.text();

    // Parse and process data
    const games = parseNFLGames(gamesData);
    const logs = parseNFLStats(statsData);

    // Upsert games
    for (const game of games) {
      await upsertGame("NFL", game);
    }

    // Upsert player logs
    for (const log of logs) {
      await upsertPlayerLog("NFL", log);
    }

    console.log(`Processed ${games.length} NFL games and ${logs.length} player logs`);
  } catch (error) {
    console.error("Error fetching NFL data:", error);
    throw error;
  }
}

function parseNFLGames(csvData: string): Game[] {
  const lines = csvData.split("\n");
  const headers = lines[0].split(",");
  const games: Game[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = lines[i].split(",");
      const game: any = {};

      headers.forEach((header, index) => {
        game[header.trim()] = values[index]?.trim() || "";
      });

      if (game.game_id && game.away_team && game.home_team && game.gameday) {
        games.push({
          id: game.game_id,
          season: parseInt(game.season) || 2023,
          date: game.gameday,
          homeTeam: game.home_team,
          awayTeam: game.away_team,
        });
      }
    }
  }

  return games;
}

function parseNFLStats(csvData: string): PlayerLog[] {
  const lines = csvData.split("\n");
  const headers = lines[0].split(",");
  const logs: PlayerLog[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = lines[i].split(",");
      const stat: any = {};

      headers.forEach((header, index) => {
        stat[header.trim()] = values[index]?.trim() || "";
      });

      if (stat.player_name && stat.team_abbr && stat.game_id) {
        logs.push({
          playerId: stat.player_id || stat.player_name,
          playerName: stat.player_name,
          team: stat.team_abbr,
          opponent: "", // Will be filled from game data
          gameId: stat.game_id,
          date: stat.game_date || "",
          stats: {
            passing_yards: parseFloat(stat.passing_yards) || undefined,
            rush_yards: parseFloat(stat.rushing_yards) || undefined,
            rec_yards: parseFloat(stat.receiving_yards) || undefined,
            passing_tds: parseFloat(stat.passing_tds) || undefined,
            rush_tds: parseFloat(stat.rushing_tds) || undefined,
            rec_tds: parseFloat(stat.receiving_tds) || undefined,
            receptions: parseFloat(stat.receptions) || undefined,
          },
        });
      }
    }
  }

  return logs;
}

// NBA & WNBA (NBA Stats API)
async function fetchNBAGamesAndLogs(season: number = 2023, league: "NBA" | "WNBA" = "NBA") {
  console.log(`Fetching ${league} data for ${season} season...`);

  try {
    // NBA Stats API endpoints
    const baseUrl =
      league === "NBA" ? "https://stats.nba.com/stats" : "https://stats.wnba.com/stats";

    // Get season schedule
    const scheduleUrl = `${baseUrl}/leaguegamefinder?Season=${season}&SeasonType=Regular%20Season`;
    const scheduleResp = await fetch(scheduleUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: "https://stats.nba.com/",
      },
    });

    if (!scheduleResp.ok) {
      throw new Error(`Failed to fetch schedule: ${scheduleResp.status}`);
    }

    const scheduleData = await scheduleResp.json();
    const games = scheduleData.resultSets[0]?.rowSet || [];

    console.log(`Found ${games.length} ${league} games for ${season}`);

    // Process games and collect unique game IDs
    const gameIds = new Set<string>();
    const processedGames: Game[] = [];

    // Log first few games to understand structure
    console.log("Sample game data:", games.slice(0, 3));

    for (const game of games) {
      const gameId = game[1]; // Game_ID is typically at index 1
      const teamAbbr = game[6] || ""; // Team abbreviation

      // For NBA, exclude WNBA-specific teams
      if (league === "NBA") {
        const wnbaTeams = ["CON", "LVA", "LAS", "NYL", "GSV", "PHO", "SEA"];
        if (wnbaTeams.includes(teamAbbr)) continue;
      }

      // For WNBA, only include WNBA teams
      if (league === "WNBA") {
        const wnbaTeams = [
          "CON",
          "LVA",
          "LAS",
          "NYL",
          "GSV",
          "PHO",
          "SEA",
          "CHI",
          "WAS",
          "MIN",
          "ATL",
          "IND",
          "DAL",
        ];
        if (!wnbaTeams.includes(teamAbbr)) continue;
      }

      if (gameId && !gameIds.has(gameId)) {
        gameIds.add(gameId);

        // Extract game info (structure may vary)
        processedGames.push({
          id: gameId.toString(),
          season: season,
          date: game[2] || "", // Game_Date
          homeTeam: game[6] || "", // Team abbreviation
          awayTeam: game[7] || "", // Opponent abbreviation
        });
      }
    }

    // Process player stats from the same response
    const processedLogs: PlayerLog[] = [];

    for (const stat of games) {
      if (stat.length > 20) {
        // Ensure we have enough data
        const teamAbbr = stat[6] || ""; // Team abbreviation

        // For NBA, exclude WNBA-specific teams
        if (league === "NBA") {
          const wnbaTeams = ["CON", "LVA", "LAS", "NYL", "GSV", "PHO", "SEA"];
          if (wnbaTeams.includes(teamAbbr)) continue;
        }

        // For WNBA, only include WNBA teams
        if (league === "WNBA") {
          const wnbaTeams = [
            "CON",
            "LVA",
            "LAS",
            "NYL",
            "GSV",
            "PHO",
            "SEA",
            "CHI",
            "WAS",
            "MIN",
            "ATL",
            "IND",
            "DAL",
          ];
          if (!wnbaTeams.includes(teamAbbr)) continue;
        }

        processedLogs.push({
          playerId: stat[4]?.toString() || "", // Player_ID
          playerName: stat[5] || "", // Player name
          team: stat[6] || "", // Team abbreviation
          opponent: stat[7] || "", // Opponent abbreviation
          gameId: stat[1]?.toString() || "", // Game_ID
          date: stat[2] || "", // Game_Date
          stats: {
            points: stat[26] || undefined, // PTS
            assists: stat[21] || undefined, // AST
            rebounds: stat[20] || undefined, // REB
            three_pointers: stat[12] || undefined, // FG3M
            steals: stat[22] || undefined, // STL
            blocks: stat[23] || undefined, // BLK
          },
        });
      }
    }

    // Upsert games
    for (const game of processedGames) {
      await upsertGame(league, game);
    }

    // Upsert player logs
    for (const log of processedLogs) {
      await upsertPlayerLog(league, log);
    }

    console.log(
      `Processed ${processedGames.length} ${league} games and ${processedLogs.length} player logs`,
    );
  } catch (error) {
    console.error(`Error fetching ${league} data:`, error);
    throw error;
  }
}

// MLB (MLB Stats API)
async function fetchMLBGamesAndLogs(date: string) {
  console.log(`Fetching MLB data for ${date}...`);

  try {
    // Fetch schedule
    const scheduleResp = await fetch(
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${date}`,
    );
    const scheduleData = await scheduleResp.json();

    if (!scheduleData.dates || scheduleData.dates.length === 0) {
      console.log(`No MLB games found for ${date}`);
      return;
    }

    const games = scheduleData.dates[0].games;
    console.log(`Found ${games.length} MLB games for ${date}`);

    const processedGames: Game[] = [];
    const processedLogs: PlayerLog[] = [];

    for (const game of games) {
      // Extract game info - map team names to abbreviations
      const homeTeamName = game.teams?.home?.team?.name || "";
      const awayTeamName = game.teams?.away?.team?.name || "";

      // Map MLB team names to abbreviations
      const teamNameToAbbr: Record<string, string> = {
        "Arizona Diamondbacks": "ARI",
        "Atlanta Braves": "ATL",
        "Baltimore Orioles": "BAL",
        "Boston Red Sox": "BOS",
        "Chicago Cubs": "CHC",
        "Chicago White Sox": "CWS",
        "Cincinnati Reds": "CIN",
        "Cleveland Guardians": "CLE",
        "Colorado Rockies": "COL",
        "Detroit Tigers": "DET",
        "Houston Astros": "HOU",
        "Kansas City Royals": "KC",
        "Los Angeles Angels": "LAA",
        "Los Angeles Dodgers": "LAD",
        "Miami Marlins": "MIA",
        "Milwaukee Brewers": "MIL",
        "Minnesota Twins": "MIN",
        "New York Mets": "NYM",
        "New York Yankees": "NYY",
        "Oakland Athletics": "OAK",
        "Philadelphia Phillies": "PHI",
        "Pittsburgh Pirates": "PIT",
        "San Diego Padres": "SD",
        "San Francisco Giants": "SF",
        "Seattle Mariners": "SEA",
        "St. Louis Cardinals": "STL",
        "Tampa Bay Rays": "TB",
        "Texas Rangers": "TEX",
        "Toronto Blue Jays": "TOR",
        "Washington Nationals": "WSH",
      };

      processedGames.push({
        id: uuidv4(),
        externalId: game.gamePk?.toString() || "",
        season: new Date(date).getFullYear(),
        date: date,
        homeTeam: teamNameToAbbr[homeTeamName] || "",
        awayTeam: teamNameToAbbr[awayTeamName] || "",
      });

      // Fetch boxscore for each game
      const boxscoreResp = await fetch(
        `https://statsapi.mlb.com/api/v1/game/${game.gamePk}/boxscore`,
      );
      const boxscoreData = await boxscoreResp.json();

      // Process player stats from both teams
      const homeTeamStats = boxscoreData.teams?.home?.players || {};
      const awayTeamStats = boxscoreData.teams?.away?.players || {};

      // Process home team stats
      for (const [playerId, playerData] of Object.entries(homeTeamStats)) {
        const player = playerData as any;
        if (player.person && player.stats?.batting) {
          const batting = player.stats.batting;
          processedLogs.push({
            playerId: player.person.id?.toString() || "",
            playerName: player.person.fullName || "",
            team: teamNameToAbbr[homeTeamName] || "",
            opponent: teamNameToAbbr[awayTeamName] || "",
            gameId: game.gamePk?.toString() || "",
            date: date,
            stats: {
              hits: batting.hits || undefined,
              runs: batting.runs || undefined,
              rbis: batting.rbi || undefined,
              walks: batting.baseOnBalls || undefined,
              strikeouts: batting.strikeOuts || undefined,
              homeRuns: batting.homeRuns || undefined,
              doubles: batting.doubles || undefined,
              triples: batting.triples || undefined,
              stolenBases: batting.stolenBases || undefined,
              totalBases: batting.totalBases || undefined,
            },
          });
        }
      }

      // Process away team stats
      for (const [playerId, playerData] of Object.entries(awayTeamStats)) {
        const player = playerData as any;
        if (player.person && player.stats?.batting) {
          const batting = player.stats.batting;
          processedLogs.push({
            playerId: player.person.id?.toString() || "",
            playerName: player.person.fullName || "",
            team: teamNameToAbbr[awayTeamName] || "",
            opponent: teamNameToAbbr[homeTeamName] || "",
            gameId: game.gamePk?.toString() || "",
            date: date,
            stats: {
              hits: batting.hits || undefined,
              runs: batting.runs || undefined,
              rbis: batting.rbi || undefined,
              walks: batting.baseOnBalls || undefined,
              strikeouts: batting.strikeOuts || undefined,
              homeRuns: batting.homeRuns || undefined,
              doubles: batting.doubles || undefined,
              triples: batting.triples || undefined,
              stolenBases: batting.stolenBases || undefined,
              totalBases: batting.totalBases || undefined,
            },
          });
        }
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // Upsert games and logs
    for (const game of processedGames) {
      await upsertGame("MLB", game);
    }

    // Update player logs to use the generated game UUIDs
    for (const log of processedLogs) {
      const game = processedGames.find((g) => g.externalId === log.gameId);
      if (game) {
        log.gameId = game.id;
      }
      await upsertPlayerLog("MLB", log);
    }

    console.log(
      `Processed ${processedGames.length} MLB games and ${processedLogs.length} player logs`,
    );
  } catch (error) {
    console.error("Error fetching MLB data:", error);
    throw error;
  }
}

// NHL (NHL Stats API - new base URL)
async function fetchNHLGamesAndLogs(date: string) {
  console.log(`Fetching NHL data for ${date}...`);

  try {
    // Fetch schedule using new NHL API base URL
    const scheduleResp = await fetch(`https://api-web.nhle.com/v1/schedule/${date}`);
    const scheduleData = await scheduleResp.json();

    if (!scheduleData.gameWeek || !scheduleData.gameWeek.length) {
      console.log(`No NHL games found for ${date}`);
      return;
    }

    const games = scheduleData.gameWeek[0]?.games || [];
    console.log(`Found ${games.length} NHL games for ${date}`);

    const processedGames: Game[] = [];
    const processedLogs: PlayerLog[] = [];

    for (const game of games) {
      // Extract game info
      processedGames.push({
        id: game.id?.toString() || "",
        season: new Date(date).getFullYear(),
        date: date,
        homeTeam: game.homeTeam?.abbrev || "",
        awayTeam: game.awayTeam?.abbrev || "",
      });

      // Fetch detailed game data including player stats
      const gameDetailResp = await fetch(
        `https://api-web.nhle.com/v1/gamecenter/${game.id}/boxscore`,
      );
      const gameDetailData = await gameDetailResp.json();

      // Process player stats from both teams
      const homeTeamStats = gameDetailData.homeTeam?.playerStats || [];
      const awayTeamStats = gameDetailData.awayTeam?.playerStats || [];

      // Process home team stats
      for (const player of homeTeamStats) {
        if (player.stats) {
          processedLogs.push({
            playerId: player.playerId?.toString() || "",
            playerName: player.name || "",
            team: game.homeTeam?.abbrev || "",
            opponent: game.awayTeam?.abbrev || "",
            gameId: game.id?.toString() || "",
            date: date,
            stats: {
              goals: player.stats.goals || undefined,
              assists: player.stats.assists || undefined,
              points: player.stats.points || undefined,
              shots: player.stats.shots || undefined,
              saves: player.stats.saves || undefined,
            },
          });
        }
      }

      // Process away team stats
      for (const player of awayTeamStats) {
        if (player.stats) {
          processedLogs.push({
            playerId: player.playerId?.toString() || "",
            playerName: player.name || "",
            team: game.awayTeam?.abbrev || "",
            opponent: game.homeTeam?.abbrev || "",
            gameId: game.id?.toString() || "",
            date: date,
            stats: {
              goals: player.stats.goals || undefined,
              assists: player.stats.assists || undefined,
              points: player.stats.points || undefined,
              shots: player.stats.shots || undefined,
              saves: player.stats.saves || undefined,
            },
          });
        }
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // Upsert games and logs
    for (const game of processedGames) {
      await upsertGame("NHL", game);
    }

    for (const log of processedLogs) {
      await upsertPlayerLog("NHL", log);
    }

    console.log(
      `Processed ${processedGames.length} NHL games and ${processedLogs.length} player logs`,
    );
  } catch (error) {
    console.error("Error fetching NHL data:", error);
    throw error;
  }
}

// --- Backfill Runner ---
async function backfillAllLeagues() {
  console.log("Starting comprehensive backfill for all leagues...");

  try {
    // Initialize mappings for all leagues
    await initializeMappings("NFL");
    await initializeMappings("NBA");
    await initializeMappings("MLB");
    await initializeMappings("NHL");
    await initializeMappings("WNBA");

    // Backfill recent seasons
    await fetchNFLGamesAndLogs(2023);
    await fetchNBAGamesAndLogs(2023, "NBA");
    await fetchNBAGamesAndLogs(2023, "WNBA");

    // Backfill recent dates for MLB and NHL
    const recentDate = "2024-06-01";
    await fetchMLBGamesAndLogs(recentDate);
    await fetchNHLGamesAndLogs(recentDate);

    console.log("Backfill completed successfully!");
  } catch (error) {
    console.error("Backfill failed:", error);
    throw error;
  }
}

// --- Main execution ---
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case "nfl":
        await initializeMappings("NFL");
        await fetchNFLGamesAndLogs(parseInt(args[1]) || 2023);
        break;

      case "nba":
        await initializeMappings("NBA");
        await fetchNBAGamesAndLogs(parseInt(args[1]) || 2023, "NBA");
        break;

      case "wnba":
        await initializeMappings("WNBA");
        await fetchNBAGamesAndLogs(parseInt(args[1]) || 2023, "WNBA");
        break;

      case "mlb":
        await initializeMappings("MLB");
        await fetchMLBGamesAndLogs(args[1] || "2024-06-01");
        break;

      case "nhl":
        await initializeMappings("NHL");
        await fetchNHLGamesAndLogs(args[1] || "2024-06-01");
        break;

      case "all":
        await backfillAllLeagues();
        break;

      default:
        console.log(
          "Usage: tsx real-data-ingestion-skeleton.ts [nfl|nba|wnba|mlb|nhl|all] [season|date]",
        );
        console.log("Examples:");
        console.log("  tsx real-data-ingestion-skeleton.ts nba 2023");
        console.log("  tsx real-data-ingestion-skeleton.ts mlb 2024-06-01");
        console.log("  tsx real-data-ingestion-skeleton.ts all");
        break;
    }
  } catch (error) {
    console.error("Execution failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch(console.error);

export {
  fetchNFLGamesAndLogs,
  fetchNBAGamesAndLogs,
  fetchMLBGamesAndLogs,
  fetchNHLGamesAndLogs,
  backfillAllLeagues,
  normalizePropType,
  upsertGame,
  upsertPlayerLog,
};
