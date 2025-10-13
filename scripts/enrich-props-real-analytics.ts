import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { props, players, teams, player_game_logs, defense_ranks } from '../src/db/schema/index';
import { eq, and, desc, sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

interface GameLog {
  id: string;
  player_id: string;
  team_id: string;
  game_id: string;
  opponent_id: string;
  prop_type: string;
  line: number;
  actual_value: number;
  hit: boolean;
  game_date: string;
  season: string;
  home_away: string;
}

interface DefenseRank {
  id: string;
  team_id: string;
  league: string;
  prop_type: string;
  rank: number;
  rank_percentile: number;
  season: string;
  games_tracked: number;
}

async function getPlayerGameLogs(playerId: string, propType: string, limit: number = 20): Promise<GameLog[]> {
  try {
    const logs = await db.select().from(player_game_logs)
      .where(
        and(
          eq(player_game_logs.player_id, playerId),
          eq(player_game_logs.prop_type, propType)
        )
      )
      .orderBy(desc(player_game_logs.game_date))
      .limit(limit);
    
    return logs;
  } catch (error) {
    console.error(`Error fetching game logs for player ${playerId}, prop ${propType}:`, error);
    return [];
  }
}

async function getDefenseRank(teamId: string, propType: string, season: string): Promise<DefenseRank | null> {
  try {
    const ranks = await db.select().from(defense_ranks)
      .where(
        and(
          eq(defense_ranks.team_id, teamId),
          eq(defense_ranks.prop_type, propType),
          eq(defense_ranks.season, season)
        )
      )
      .limit(1);
    
    return ranks.length > 0 ? ranks[0] : null;
  } catch (error) {
    console.error(`Error fetching defense rank for team ${teamId}, prop ${propType}:`, error);
    return null;
  }
}

function calculateHitRates(logs: GameLog[]): { l5: number; l10: number; l20: number } {
  const hits = logs.map(log => log.hit ? 1 : 0);
  
  const l5 = hits.slice(0, 5);
  const l10 = hits.slice(0, 10);
  const l20 = hits.slice(0, 20);
  
  const hitRateL5 = l5.length > 0 ? (l5.reduce((sum, hit) => sum + hit, 0) / l5.length) * 100 : 0;
  const hitRateL10 = l10.length > 0 ? (l10.reduce((sum, hit) => sum + hit, 0) / l10.length) * 100 : 0;
  const hitRateL20 = l20.length > 0 ? (l20.reduce((sum, hit) => sum + hit, 0) / l20.length) * 100 : 0;
  
  return { l5: hitRateL5, l10: hitRateL10, l20: hitRateL20 };
}

function calculateStreak(logs: GameLog[]): number {
  if (logs.length === 0) return 0;
  
  let streak = 0;
  let currentStreak = 0;
  let lastHit = logs[0].hit;
  
  for (const log of logs) {
    if (log.hit === lastHit) {
      currentStreak++;
    } else {
      streak = currentStreak;
      currentStreak = 1;
      lastHit = log.hit;
    }
  }
  
  streak = currentStreak;
  
  // Return negative for under streaks, positive for over streaks
  return lastHit ? streak : -streak;
}

function calculateH2HHitRate(logs: GameLog[], opponentId: string): number | null {
  const h2hLogs = logs.filter(log => log.opponent_id === opponentId);
  
  if (h2hLogs.length === 0) return null;
  
  const hits = h2hLogs.filter(log => log.hit).length;
  return (hits / h2hLogs.length) * 100;
}

function calculateHistoricalAverage(logs: GameLog[]): number | null {
  if (logs.length === 0) return null;
  
  const total = logs.reduce((sum, log) => sum + log.actual_value, 0);
  return total / logs.length;
}

async function enrichPropAnalytics(propId: string, playerId: string, teamId: string, opponentId: string, propType: string, line: number, season: string) {
  try {
    // Get historical game logs
    const logs = await getPlayerGameLogs(playerId, propType, 20);
    
    if (logs.length === 0) {
      console.log(`No game logs found for prop ${propId}`);
      return;
    }
    
    // Calculate analytics
    const hitRates = calculateHitRates(logs);
    const streak = calculateStreak(logs);
    const h2hHitRate = calculateH2HHitRate(logs, opponentId);
    const historicalAverage = calculateHistoricalAverage(logs);
    
    // Get defense rank
    const defenseRank = await getDefenseRank(opponentId, propType, season);
    const matchupRank = defenseRank?.rank || null;
    const matchupGrade = defenseRank?.rank_percentile || null;
    
    // Update the prop with analytics
    await db.update(props)
      .set({
        hit_rate_l5: hitRates.l5,
        hit_rate_l10: hitRates.l10,
        hit_rate_l20: hitRates.l20,
        streak_current: streak,
        h2h_hit_rate: h2hHitRate,
        matchup_rank: matchupRank,
        matchup_grade: matchupGrade,
        historical_average: historicalAverage,
        games_tracked: logs.length
      })
      .where(eq(props.id, propId));
    
    console.log(`Enriched prop ${propId}: L5=${hitRates.l5.toFixed(1)}%, L10=${hitRates.l10.toFixed(1)}%, L20=${hitRates.l20.toFixed(1)}%, Streak=${streak}, H2H=${h2hHitRate?.toFixed(1) || 'N/A'}%, MatchupRank=${matchupRank || 'N/A'}`);
    
  } catch (error) {
    console.error(`Error enriching prop ${propId}:`, error);
  }
}

async function enrichAllProps() {
  console.log('Starting props analytics enrichment...');
  
  try {
    // Get all props that need enrichment
    const allProps = await db.select().from(props)
      .where(eq(props.source, 'sportsbook'));
    
    console.log(`Found ${allProps.length} props to enrich`);
    
    let enriched = 0;
    let errors = 0;
    
    for (const prop of allProps) {
      try {
        // Get player and team info
        const player = await db.select().from(players).where(eq(players.id, prop.player_id)).limit(1);
        if (player.length === 0) {
          console.log(`Player not found for prop ${prop.id}`);
          errors++;
          continue;
        }
        
        // Get opponent team from game
        const game = await db.execute(`
          SELECT 
            CASE 
              WHEN p.team_id = g.home_team_id THEN g.away_team_id 
              ELSE g.home_team_id 
            END as opponent_id
          FROM props p
          JOIN games g ON p.game_id = g.id
          WHERE p.id = '${prop.id}'
        `);
        
        if (game.length === 0) {
          console.log(`Game not found for prop ${prop.id}`);
          errors++;
          continue;
        }
        
        const opponentId = game[0].opponent_id;
        
        // Determine season (current year for now)
        const season = new Date().getFullYear().toString();
        
        await enrichPropAnalytics(
          prop.id,
          prop.player_id,
          prop.team_id,
          opponentId,
          prop.prop_type,
          prop.line,
          season
        );
        
        enriched++;
        
        // Rate limiting
        if (enriched % 100 === 0) {
          console.log(`Enriched ${enriched}/${allProps.length} props...`);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error) {
        console.error(`Error processing prop ${prop.id}:`, error);
        errors++;
      }
    }
    
    console.log(`Enrichment completed: ${enriched} enriched, ${errors} errors`);
    
  } catch (error) {
    console.error('Error in props enrichment:', error);
    throw error;
  }
}

async function main() {
  try {
    await enrichAllProps();
    console.log('Props analytics enrichment completed successfully!');
  } catch (error) {
    console.error('Props analytics enrichment failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
