import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and, desc, sql } from "drizzle-orm";
import { props, players, teams, player_game_logs, defense_ranks } from "../src/db/schema/index";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

interface AnalyticsData {
  hitRateL5: number | null;
  hitRateL10: number | null;
  hitRateL20: number | null;
  streakCurrent: number | null;
  h2hHitRate: number | null;
  matchupRank: number | null;
  matchupGrade: number | null;
  historicalAverage: number | null;
  gamesTracked: number;
}

/**
 * Calculate hit rates for L5, L10, L20 games
 */
async function calculateHitRates(
  playerId: string,
  propType: string,
  line: number,
): Promise<{
  hitRateL5: number | null;
  hitRateL10: number | null;
  hitRateL20: number | null;
  gamesTracked: number;
}> {
  const logs = await db
    .select()
    .from(player_game_logs)
    .where(and(eq(player_game_logs.playerId, playerId), eq(player_game_logs.propType, propType)))
    .orderBy(desc(player_game_logs.gameDate))
    .limit(20);

  if (logs.length === 0) {
    return { hitRateL5: null, hitRateL10: null, hitRateL20: null, gamesTracked: 0 };
  }

  // Calculate hit rates for different periods
  const l5Logs = logs.slice(0, 5);
  const l10Logs = logs.slice(0, 10);
  const l20Logs = logs.slice(0, 20);

  const calculateHitRate = (logs: any[]) => {
    if (logs.length === 0) return null;
    const hits = logs.filter((log) => log.hit).length;
    return (hits / logs.length) * 100;
  };

  return {
    hitRateL5: calculateHitRate(l5Logs),
    hitRateL10: calculateHitRate(l10Logs),
    hitRateL20: calculateHitRate(l20Logs),
    gamesTracked: logs.length,
  };
}

/**
 * Calculate current streak
 */
async function calculateStreak(playerId: string, propType: string): Promise<number | null> {
  const logs = await db
    .select()
    .from(player_game_logs)
    .where(and(eq(player_game_logs.playerId, playerId), eq(player_game_logs.propType, propType)))
    .orderBy(desc(player_game_logs.gameDate))
    .limit(20);

  if (logs.length === 0) return null;

  let streak = 0;
  const isPositive = logs[0].hit;

  for (const log of logs) {
    if (log.hit === isPositive) {
      streak += isPositive ? 1 : -1;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Calculate H2H hit rate vs specific opponent
 */
async function calculateH2HHitRate(
  playerId: string,
  propType: string,
  opponentId: string,
): Promise<number | null> {
  const logs = await db
    .select()
    .from(player_game_logs)
    .where(
      and(
        eq(player_game_logs.playerId, playerId),
        eq(player_game_logs.propType, propType),
        eq(player_game_logs.opponentId, opponentId),
      ),
    )
    .orderBy(desc(player_game_logs.gameDate));

  if (logs.length === 0) return null;

  const hits = logs.filter((log) => log.hit).length;
  return (hits / logs.length) * 100;
}

/**
 * Get matchup rank and grade for opponent vs prop type
 */
async function getMatchupData(
  opponentId: string,
  propType: string,
): Promise<{
  matchupRank: number | null;
  matchupGrade: number | null;
}> {
  const defenseRank = await db
    .select()
    .from(defense_ranks)
    .where(and(eq(defense_ranks.teamId, opponentId), eq(defense_ranks.propType, propType)))
    .limit(1);

  if (defenseRank.length === 0) {
    return { matchupRank: null, matchupGrade: null };
  }

  const rank = defenseRank[0].rank;
  const grade = defenseRank[0].rankPercentile;

  return { matchupRank: rank, matchupGrade: grade };
}

/**
 * Calculate historical average for the prop type
 */
async function calculateHistoricalAverage(
  playerId: string,
  propType: string,
): Promise<number | null> {
  const result = await db.execute(sql`
    SELECT AVG(actual_value) as avg_value
    FROM player_game_logs
    WHERE player_id = ${playerId} AND prop_type = ${propType}
  `);

  const avgValue = result[0]?.avg_value;
  return avgValue ? parseFloat(avgValue.toString()) : null;
}

/**
 * Enrich a single prop with analytics data
 */
async function enrichPropAnalytics(
  playerId: string,
  teamId: string,
  propType: string,
  line: number,
  opponentId?: string,
): Promise<AnalyticsData> {
  console.log(`📊 Enriching analytics for player ${playerId} - ${propType}`);

  // Calculate hit rates
  const hitRates = await calculateHitRates(playerId, propType, line);

  // Calculate streak
  const streakCurrent = await calculateStreak(playerId, propType);

  // Calculate H2H if opponent is provided
  const h2hHitRate = opponentId ? await calculateH2HHitRate(playerId, propType, opponentId) : null;

  // Get matchup data
  const matchupData = opponentId
    ? await getMatchupData(opponentId, propType)
    : { matchupRank: null, matchupGrade: null };

  // Calculate historical average
  const historicalAverage = await calculateHistoricalAverage(playerId, propType);

  return {
    hitRateL5: hitRates.hitRateL5,
    hitRateL10: hitRates.hitRateL10,
    hitRateL20: hitRates.hitRateL20,
    streakCurrent,
    h2hHitRate,
    matchupRank: matchupData.matchupRank,
    matchupGrade: matchupData.matchupGrade,
    historicalAverage,
    gamesTracked: hitRates.gamesTracked,
  };
}

/**
 * Main function to enrich all props with analytics
 */
async function enrichAllPropsAnalytics() {
  try {
    console.log("🔍 Starting props analytics enrichment...");

    // Get all props that need enrichment
    const propsToEnrich = await db
      .select()
      .from(props)
      .where(eq(props.source, "sportsbook"))
      .limit(100); // Process in batches

    console.log(`📊 Found ${propsToEnrich.length} props to enrich`);

    let enrichedCount = 0;

    for (const prop of propsToEnrich) {
      try {
        // Get opponent team ID from the game
        const gameData = await db.execute(sql`
          SELECT 
            CASE 
              WHEN g.home_team_id = ${prop.teamId} THEN g.away_team_id
              ELSE g.home_team_id
            END as opponent_id
          FROM games g
          WHERE g.id = ${prop.gameId}
        `);

        const opponentId = gameData[0]?.opponent_id || null;

        // Enrich analytics
        const analytics = await enrichPropAnalytics(
          prop.playerId,
          prop.teamId,
          prop.propType,
          prop.line,
          opponentId,
        );

        // Update the prop with analytics data
        await db
          .update(props)
          .set({
            hitRateL5: analytics.hitRateL5,
            hitRateL10: analytics.hitRateL10,
            hitRateL20: analytics.hitRateL20,
            streakCurrent: analytics.streakCurrent,
            h2hHitRate: analytics.h2hHitRate,
            matchupRank: analytics.matchupRank,
            matchupGrade: analytics.matchupGrade,
            historicalAverage: analytics.historicalAverage,
            gamesTracked: analytics.gamesTracked,
            updatedAt: new Date(),
          })
          .where(eq(props.id, prop.id));

        enrichedCount++;
        console.log(`✅ Enriched prop ${prop.id} (${enrichedCount}/${propsToEnrich.length})`);
      } catch (error) {
        console.error(`❌ Error enriching prop ${prop.id}:`, error);
      }
    }

    console.log(`🎉 Successfully enriched ${enrichedCount} props with analytics data`);
  } catch (error) {
    console.error("❌ Error enriching props analytics:", error);
  } finally {
    await client.end();
  }
}

// Run if called directly
enrichAllPropsAnalytics().catch(console.error);

export { enrichAllPropsAnalytics, enrichPropAnalytics };
