/**
 * Feature Extractors for G1F10 Model
 *
 * Extracts advanced features from MoneyPuck shots data and other sources
 * to populate the new G1F10 features.
 */

import postgres from "postgres";
import { fetchMoneyPuckShotsForGameFromDb } from "../unified/providers/moneypuck-db";

export interface GoalieEarlyTendencies {
  first_shot_save_pct: number | null;
  first_3_shots_save_pct: number | null;
  rebound_rate_first10: number | null;
  rush_save_pct_first10: number | null;
  screened_save_pct_first10: number | null;
}

export interface RefereePenaltyRates {
  penalties_first_period_avg: number | null;
  penalties_first10_avg: number | null;
  minors_vs_majors_ratio: number | null;
  home_away_penalty_bias: number | null;
}

export interface TravelFatigueFeatures {
  b2b_travel: boolean;
  three_in_four_travel: boolean;
  west_to_east_travel: boolean;
  early_start_time: boolean;
}

/**
 * Extract starting goalie name from MoneyPuck shots data for a game
 * Returns the goalie who faced the most shots in the first 10 minutes
 */
export async function extractStartingGoalie(
  gameExternalId: string,
  teamAbbr: string,
  isHome: boolean,
): Promise<string | null> {
  const conn =
    process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;
  if (!conn) return null;

  const sql = postgres(conn, { prepare: false });
  try {
    // Get the goalie who faced the most shots in first 10 minutes for the opposing team
    // (shots against this team = goalie for this team)
    const result = await sql`
      SELECT 
        goalie_name,
        COUNT(*) as shot_count
      FROM public.moneypuck_shots
      WHERE game_external_id = ${gameExternalId}
        AND game_time_seconds IS NOT NULL
        AND game_time_seconds <= 600
        AND goalie_name IS NOT NULL
        AND team_abbr = ${
          isHome
            ? (
                await sql`SELECT away_team_abbr FROM public.games WHERE external_id = ${gameExternalId} LIMIT 1`
              )[0]?.away_team_abbr || teamAbbr
            : teamAbbr
        }
      GROUP BY goalie_name
      ORDER BY shot_count DESC
      LIMIT 1
    `;

    await sql.end({ timeout: 2 });
    return result[0]?.goalie_name || null;
  } catch (e) {
    await sql.end({ timeout: 2 });
    return null;
  }
}

/**
 * Extract goalie early-game tendencies from MoneyPuck shots data
 */
export async function extractGoalieEarlyTendencies(
  gameExternalId: string,
  goalieName: string | null,
  teamAbbr: string,
  isHome: boolean,
): Promise<GoalieEarlyTendencies> {
  if (!goalieName) {
    // Try to extract starting goalie from shots data
    goalieName = await extractStartingGoalie(gameExternalId, teamAbbr, isHome);
    if (!goalieName) {
      return {
        first_shot_save_pct: null,
        first_3_shots_save_pct: null,
        rebound_rate_first10: null,
        rush_save_pct_first10: null,
        screened_save_pct_first10: null,
      };
    }
  }

  const conn =
    process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;
  if (!conn) {
    return {
      first_shot_save_pct: null,
      first_3_shots_save_pct: null,
      rebound_rate_first10: null,
      rush_save_pct_first10: null,
      screened_save_pct_first10: null,
    };
  }

  const sql = postgres(conn, { prepare: false });
  try {
    // Get shots faced by this goalie in first 10 minutes
    // Shots against the opposing team = shots faced by this team's goalie
    // We need to find shots where the opposing team is shooting (team_abbr != teamAbbr)
    const goalieShotsData = await sql`
      SELECT 
        game_time_seconds,
        is_goal,
        is_rush,
        is_rebound,
        is_high_danger,
        xg,
        shot_speed
      FROM public.moneypuck_shots
      WHERE game_external_id = ${gameExternalId}
        AND game_time_seconds IS NOT NULL
        AND game_time_seconds <= 600
        AND goalie_name IS NOT NULL
        AND goalie_name ILIKE ${`%${goalieName}%`}
        AND team_abbr != ${teamAbbr}
      ORDER BY game_time_seconds ASC
    `;

    const goalieShots = goalieShotsData as Array<{
      game_time_seconds: number;
      is_goal: boolean | null;
      is_rush: boolean | null;
      is_rebound: boolean | null;
      is_high_danger: boolean | null;
      xg: number | null;
      shot_speed: number | null;
    }>;

    if (goalieShots.length === 0) {
      return {
        first_shot_save_pct: null,
        first_3_shots_save_pct: null,
        rebound_rate_first10: null,
        rush_save_pct_first10: null,
        screened_save_pct_first10: null,
      };
    }

    if (goalieShots.length === 0) {
      return {
        first_shot_save_pct: null,
        first_3_shots_save_pct: null,
        rebound_rate_first10: null,
        rush_save_pct_first10: null,
        screened_save_pct_first10: null,
      };
    }

    // First shot save percentage (assume all shots are on goal if they have xG)
    const firstShot = goalieShots[0];
    const firstShotSavePct =
      firstShot && firstShot.is_goal === false
        ? 1.0
        : firstShot && firstShot.is_goal === true
          ? 0.0
          : null;

    // First 3 shots save percentage
    const first3Shots = goalieShots.slice(0, 3);
    const first3ShotsSavePct =
      first3Shots.length > 0
        ? first3Shots.filter((s) => s.is_goal === false).length / first3Shots.length
        : null;

    // Rebound rate (rebounds / total shots)
    const totalShots = goalieShots.length;
    const rebounds = goalieShots.filter((s) => s.is_rebound === true).length;
    const reboundRate = totalShots > 0 ? rebounds / totalShots : null;

    // Rush save percentage
    const rushShots = goalieShots.filter((s) => s.is_rush === true);
    const rushSaves = rushShots.filter((s) => s.is_goal === false).length;
    const rushSavePct = rushShots.length > 0 ? rushSaves / rushShots.length : null;

    // Screened save percentage (infer from high xG and close shots - xG > 0.15 suggests screen)
    const screenedShots = goalieShots.filter((s) => {
      const xg = s.xg ?? 0;
      return xg > 0.15; // High xG often indicates screened shots
    });
    const screenedSaves = screenedShots.filter((s) => s.is_goal === false).length;
    const screenedSavePct = screenedShots.length > 0 ? screenedSaves / screenedShots.length : null;

    return {
      first_shot_save_pct: firstShotSavePct,
      first_3_shots_save_pct: first3ShotsSavePct,
      rebound_rate_first10: reboundRate,
      rush_save_pct_first10: rushSavePct,
      screened_save_pct_first10: screenedSavePct,
    };
  } finally {
    await sql.end({ timeout: 2 });
  }
}

/**
 * Extract referee penalty rates from game events or historical data
 * This is a placeholder - in production, you'd query a referee database
 */
export async function extractRefereePenaltyRates(
  gameExternalId: string,
  refereeId: string | null,
  season: string,
): Promise<RefereePenaltyRates> {
  // TODO: Query referee database for historical penalty rates
  // For now, return defaults since penalty events may not be available
  const conn =
    process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;
  if (!conn) {
    return {
      penalties_first_period_avg: null,
      penalties_first10_avg: null,
      minors_vs_majors_ratio: null,
      home_away_penalty_bias: null,
    };
  }

  const sql = postgres(conn, { prepare: false });
  try {
    // Try to get penalty data from game_events table if available
    // This is a placeholder - in production, use a referee database
    let penaltyData;
    try {
      penaltyData = await sql`
        SELECT 
          COUNT(*) FILTER (WHERE period = 1) as penalties_first_period,
          COUNT(*) FILTER (WHERE game_time_seconds <= 600) as penalties_first10,
          COUNT(*) FILTER (WHERE period = 1) as total_penalties_first_period
        FROM public.game_events
        WHERE game_id = (SELECT id FROM games WHERE external_id = ${gameExternalId} LIMIT 1)
          AND event_type = 'penalty'
          AND (period = 1 OR (game_time_seconds IS NOT NULL AND game_time_seconds <= 600))
        LIMIT 1
      `;
    } catch (e: any) {
      // Table doesn't exist or query failed - return defaults
      return {
        penalties_first_period_avg: null,
        penalties_first10_avg: null,
        minors_vs_majors_ratio: null,
        home_away_penalty_bias: null,
      };
    }

    const row = penaltyData?.[0];
    if (!row || !row.penalties_first_period) {
      return {
        penalties_first_period_avg: null,
        penalties_first10_avg: null,
        minors_vs_majors_ratio: null,
        home_away_penalty_bias: null,
      };
    }

    // Calculate averages (normalize to per-game rate)
    const penaltiesFirstPeriod = Number(row.penalties_first_period) || 0;
    const penaltiesFirst10 = Number(row.penalties_first10) || 0;

    return {
      penalties_first_period_avg: penaltiesFirstPeriod > 0 ? penaltiesFirstPeriod / 20 : null, // Average per game (20 min period)
      penalties_first10_avg: penaltiesFirst10 > 0 ? penaltiesFirst10 / 10 : null, // Average per 10 minutes
      minors_vs_majors_ratio: null, // Would need penalty type data
      home_away_penalty_bias: null, // Would need team_id data from events
    };
  } finally {
    await sql.end({ timeout: 2 });
  }
}

/**
 * Calculate travel and fatigue interaction features from schedule data
 */
export async function extractTravelFatigueFeatures(
  homeTeamId: string,
  awayTeamId: string,
  gameDateISO: string,
  gameTimeLocal?: string,
): Promise<{ home: TravelFatigueFeatures; away: TravelFatigueFeatures }> {
  const conn =
    process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;
  if (!conn) {
    return {
      home: {
        b2b_travel: false,
        three_in_four_travel: false,
        west_to_east_travel: false,
        early_start_time: false,
      },
      away: {
        b2b_travel: false,
        three_in_four_travel: false,
        west_to_east_travel: false,
        early_start_time: false,
      },
    };
  }

  const sql = postgres(conn, { prepare: false });
  try {
    // Get previous games for both teams
    const scheduleData = await sql`
      WITH team_games AS (
        SELECT 
          g.id,
          g.game_date,
          g.game_time,
          CASE WHEN g.home_team_id = ${homeTeamId} THEN g.away_team_id ELSE g.home_team_id END as opponent_id,
          CASE WHEN g.home_team_id = ${homeTeamId} THEN false ELSE true END as was_away
        FROM games g
        WHERE (g.home_team_id = ${homeTeamId} OR g.away_team_id = ${homeTeamId})
          AND g.game_date < ${gameDateISO}::date
          AND g.season LIKE '%NHL%'
        ORDER BY g.game_date DESC
        LIMIT 4
      ),
      away_games AS (
        SELECT 
          g.id,
          g.game_date,
          g.game_time,
          CASE WHEN g.home_team_id = ${awayTeamId} THEN g.away_team_id ELSE g.home_team_id END as opponent_id,
          CASE WHEN g.home_team_id = ${awayTeamId} THEN false ELSE true END as was_away
        FROM games g
        WHERE (g.home_team_id = ${awayTeamId} OR g.away_team_id = ${awayTeamId})
          AND g.game_date < ${gameDateISO}::date
          AND g.season LIKE '%NHL%'
        ORDER BY g.game_date DESC
        LIMIT 4
      )
      SELECT 
        'home' as team_type,
        game_date,
        was_away
      FROM team_games
      UNION ALL
      SELECT 
        'away' as team_type,
        game_date,
        was_away
      FROM away_games
      ORDER BY team_type, game_date DESC
    `;

    // Process schedule data
    const homeGames = scheduleData.filter((r: any) => r.team_type === "home");
    const awayGames = scheduleData.filter((r: any) => r.team_type === "away");

    const gameDate = new Date(gameDateISO);

    // Check for B2B + travel
    const homeB2B =
      homeGames.length > 0 &&
      (gameDate.getTime() - new Date(homeGames[0].game_date).getTime()) / (1000 * 60 * 60) < 24;
    const homeLastGameAway = homeGames.length > 0 && homeGames[0].was_away;
    const homeB2BTravel = homeB2B && homeLastGameAway;

    const awayB2B =
      awayGames.length > 0 &&
      (gameDate.getTime() - new Date(awayGames[0].game_date).getTime()) / (1000 * 60 * 60) < 24;
    const awayLastGameAway = awayGames.length > 0 && awayGames[0].was_away;
    const awayB2BTravel = awayB2B && awayLastGameAway;

    // Check for 3-in-4 (games in last 4 days)
    const home3in4 =
      homeGames.filter((g: any) => {
        const daysDiff =
          (gameDate.getTime() - new Date(g.game_date).getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 4;
      }).length >= 3;
    const home3in4Travel = home3in4 && homeLastGameAway;

    const away3in4 =
      awayGames.filter((g: any) => {
        const daysDiff =
          (gameDate.getTime() - new Date(g.game_date).getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 4;
      }).length >= 3;
    const away3in4Travel = away3in4 && awayLastGameAway;

    // West-to-east travel (simplified - would need team location data)
    // For now, assume away team traveling
    const westToEastTravel = false; // TODO: Calculate from team time zones

    // Early start time (before 7pm local)
    const earlyStartTime = gameTimeLocal ? parseInt(gameTimeLocal.split(":")[0]) < 19 : false;

    return {
      home: {
        b2b_travel: homeB2BTravel,
        three_in_four_travel: home3in4Travel,
        west_to_east_travel: false, // Home team doesn't travel
        early_start_time: earlyStartTime,
      },
      away: {
        b2b_travel: awayB2BTravel,
        three_in_four_travel: away3in4Travel,
        west_to_east_travel: westToEastTravel,
        early_start_time: earlyStartTime,
      },
    };
  } finally {
    await sql.end({ timeout: 2 });
  }
}

/**
 * Extract top-line and top-pair features from shift/lineup data
 * This is a placeholder - would need shift tracking data
 */
export async function extractShiftLevelFeatures(
  gameExternalId: string,
  homeTeamAbbr: string,
  awayTeamAbbr: string,
): Promise<{
  home_top_line_xgf: number | null;
  home_top_line_xga: number | null;
  home_top_line_rush_rate: number | null;
  home_top_line_hd_rate: number | null;
  home_top_pair_xga_suppression: number | null;
  away_top_line_xgf: number | null;
  away_top_line_xga: number | null;
  away_top_line_rush_rate: number | null;
  away_top_line_hd_rate: number | null;
  away_top_pair_xga_suppression: number | null;
}> {
  // TODO: Extract from shift data or lineup information
  // For now, estimate from team averages (top line ~40% of team production)
  const shots = await fetchMoneyPuckShotsForGameFromDb(gameExternalId);

  const homeShots10 = shots.filter(
    (s) =>
      s.team_abbr === homeTeamAbbr && s.game_time_seconds !== null && s.game_time_seconds <= 600,
  );
  const awayShots10 = shots.filter(
    (s) =>
      s.team_abbr === awayTeamAbbr && s.game_time_seconds !== null && s.game_time_seconds <= 600,
  );

  const homeXGF = homeShots10.reduce((sum, s) => sum + (s.xg ?? 0), 0);
  const awayXGF = awayShots10.reduce((sum, s) => sum + (s.xg ?? 0), 0);
  const homeRush = homeShots10.filter((s) => s.is_rush === true).length;
  const awayRush = awayShots10.filter((s) => s.is_rush === true).length;
  const homeHD = homeShots10.filter((s) => s.is_high_danger === true).length;
  const awayHD = awayShots10.filter((s) => s.is_high_danger === true).length;

  // Estimate top line production (40% of team total)
  return {
    home_top_line_xgf: homeXGF * 0.4,
    home_top_line_xga: awayXGF * 0.4, // Opponent's xGF = home's xGA
    home_top_line_rush_rate: homeRush * 0.4,
    home_top_line_hd_rate: homeHD * 0.4,
    home_top_pair_xga_suppression: null, // Would need defensive pair data
    away_top_line_xgf: awayXGF * 0.4,
    away_top_line_xga: homeXGF * 0.4,
    away_top_line_rush_rate: awayRush * 0.4,
    away_top_line_hd_rate: awayHD * 0.4,
    away_top_pair_xga_suppression: null,
  };
}
