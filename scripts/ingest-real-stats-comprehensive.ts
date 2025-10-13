#!/usr/bin/env tsx

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import dotenv from 'dotenv';
import * as cheerio from 'cheerio';

// Import schema
import { props, players, teams, games, leagues, player_game_logs, defense_ranks } from '../src/lib/db/schema';

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

interface PlayerGameLog {
  player_id: string;
  team_id: string;
  game_id: string;
  opponent_id: string;
  prop_type: string;
  line: number;
  actual_value: number;
  hit: boolean;
  game_date: Date;
  season: string;
  home_away: 'home' | 'away';
}

interface TeamDefenseStats {
  team_id: string;
  league_id: string;
  prop_type: string;
  rank: number;
  rank_percentile: number;
  season: string;
  games_tracked: number;
}

class ComprehensiveStatsIngester {
  private propTypeMapping: Record<string, string[]> = {
    'Passing Yards': ['passing_yards', 'pass_yds', 'passing yards'],
    'Rushing Yards': ['rushing_yards', 'rush_yds', 'rushing yards'],
    'Receiving Yards': ['receiving_yards', 'rec_yds', 'receiving yards'],
    'Receptions': ['receptions', 'catches'],
    'Passing TDs': ['passing_touchdowns', 'pass_tds', 'passing touchdowns'],
    'Rushing TDs': ['rushing_touchdowns', 'rush_tds', 'rushing touchdowns'],
    'Receiving TDs': ['receiving_touchdowns', 'rec_tds', 'receiving touchdowns'],
    'Points': ['points'],
    'Assists': ['assists'],
    'Rebounds': ['rebounds'],
    '3-Pointers Made': ['three_point_field_goals', '3pt_made', 'three pointers made']
  };

  async ingestNFLHistoricalData(): Promise<void> {
    console.log('🏈 Starting NFL historical data ingestion...');
    
    try {
      // Get all NFL players with props
      const nflPlayers = await db.select({
        id: players.id,
        name: players.name,
        team_id: players.team_id
      })
      .from(players)
      .innerJoin(teams, eq(players.team_id, teams.id))
      .innerJoin(leagues, eq(teams.league_id, leagues.id))
      .where(eq(leagues.code, 'NFL'));

      console.log(`📊 Found ${nflPlayers.length} NFL players with props`);

      // Fetch real game logs from Pro Football Reference
      await this.fetchProFootballReferenceData(nflPlayers);
      
      // Calculate defensive rankings
      await this.calculateNFLDefenseRankings();
      
    } catch (error) {
      console.error('❌ Error ingesting NFL data:', error);
    }
  }

  async fetchProFootballReferenceData(players: Array<{id: string, name: string, team_id: string}>): Promise<void> {
    console.log('📡 Fetching data from Pro Football Reference...');
    
    const baseUrl = 'https://www.pro-football-reference.com';
    let processedPlayers = 0;

    for (const player of players.slice(0, 50)) { // Limit to first 50 players for now
      try {
        // Get player's Pro Football Reference URL
        const playerUrl = await this.getPlayerPFRUrl(player.name);
        if (!playerUrl) {
          console.log(`⚠️ No PFR URL found for ${player.name}`);
          continue;
        }

        console.log(`📈 Processing ${player.name}: ${playerUrl}`);

        // Fetch player's game logs
        const gameLogs = await this.scrapePlayerGameLogs(baseUrl + playerUrl);
        
        // Insert game logs into database
        for (const log of gameLogs) {
          await this.insertGameLog({
            ...log,
            player_id: player.id,
            team_id: player.team_id
          });
        }

        processedPlayers++;
        console.log(`✅ Processed ${processedPlayers}/${Math.min(players.length, 50)} players`);

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`❌ Error processing ${player.name}:`, error);
      }
    }
  }

  private async getPlayerPFRUrl(playerName: string): Promise<string | null> {
    try {
      // This would typically involve searching PFR's player search
      // For now, we'll use a simplified approach
      const searchUrl = `https://www.pro-football-reference.com/search/search.fcgi?search=${encodeURIComponent(playerName)}`;
      
      const response = await fetch(searchUrl);
      const html = await response.text();
      const $ = cheerio.load(html);

      // Find the first player link
      const playerLink = $('.search-item a[href*="/players/"]').first().attr('href');
      return playerLink || null;
    } catch (error) {
      console.error(`❌ Error getting PFR URL for ${playerName}:`, error);
      return null;
    }
  }

  private async scrapePlayerGameLogs(playerUrl: string): Promise<PlayerGameLog[]> {
    try {
      const response = await fetch(playerUrl);
      const html = await response.text();
      const $ = cheerio.load(html);

      const gameLogs: PlayerGameLog[] = [];
      
      // Parse game log table
      $('#pgl_basic tbody tr').each((index, element) => {
        const row = $(element);
        
        // Skip header rows
        if (row.find('th').length > 0) return;

        const gameDate = row.find('td[data-stat="date_game"]').text();
        const opponent = row.find('td[data-stat="opp"]').text();
        const homeAway = row.find('td[data-stat="game_location"]').text() === '@' ? 'away' : 'home';
        
        // Extract stats based on position
        const stats = this.extractPlayerStats(row, 'QB'); // Default to QB for now
        
        for (const [propType, value] of Object.entries(stats)) {
          if (value > 0) {
            gameLogs.push({
              player_id: '', // Will be set by caller
              team_id: '', // Will be set by caller
              game_id: '', // Will be generated
              opponent_id: '', // Will be looked up
              prop_type: propType,
              line: await this.getHistoricalPropLine(propType),
              actual_value: value,
              hit: false, // Will be calculated
              game_date: new Date(gameDate),
              season: new Date(gameDate).getFullYear().toString(),
              home_away: homeAway as 'home' | 'away'
            });
          }
        }
      });

      return gameLogs;
    } catch (error) {
      console.error(`❌ Error scraping game logs:`, error);
      return [];
    }
  }

  private extractPlayerStats(row: cheerio.Cheerio, position: string): Record<string, number> {
    const stats: Record<string, number> = {};

    if (position === 'QB') {
      stats['Passing Yards'] = this.parseStat(row.find('td[data-stat="pass_yds"]').text());
      stats['Passing TDs'] = this.parseStat(row.find('td[data-stat="pass_td"]').text());
      stats['Rushing Yards'] = this.parseStat(row.find('td[data-stat="rush_yds"]').text());
      stats['Rushing TDs'] = this.parseStat(row.find('td[data-stat="rush_td"]').text());
    } else if (position === 'RB') {
      stats['Rushing Yards'] = this.parseStat(row.find('td[data-stat="rush_yds"]').text());
      stats['Rushing TDs'] = this.parseStat(row.find('td[data-stat="rush_td"]').text());
      stats['Receiving Yards'] = this.parseStat(row.find('td[data-stat="rec_yds"]').text());
      stats['Receptions'] = this.parseStat(row.find('td[data-stat="rec"]').text());
    } else if (position === 'WR' || position === 'TE') {
      stats['Receiving Yards'] = this.parseStat(row.find('td[data-stat="rec_yds"]').text());
      stats['Receptions'] = this.parseStat(row.find('td[data-stat="rec"]').text());
      stats['Receiving TDs'] = this.parseStat(row.find('td[data-stat="rec_td"]').text());
    }

    return stats;
  }

  private parseStat(statText: string): number {
    const cleaned = statText.replace(/[^\d.]/g, '');
    return cleaned ? parseFloat(cleaned) : 0;
  }

  private async getHistoricalPropLine(propType: string): Promise<number> {
    // Get average line for this prop type from existing props
    const result = await db.select({ line: props.line })
      .from(props)
      .where(eq(props.prop_type, propType))
      .limit(100);

    if (result.length === 0) return 0;

    const lines = result.map(r => Number(r.line));
    const average = lines.reduce((sum, line) => sum + line, 0) / lines.length;
    return Math.round(average * 10) / 10; // Round to 1 decimal
  }

  private async insertGameLog(log: PlayerGameLog): Promise<void> {
    try {
      // Look up opponent team
      const opponentTeam = await this.findOpponentTeam(log.opponent_id, log.game_date);
      if (!opponentTeam) return;

      // Calculate if hit
      log.hit = log.actual_value >= log.line;

      await db.insert(player_game_logs).values({
        player_id: log.player_id,
        team_id: log.team_id,
        game_id: crypto.randomUUID(), // Generate UUID for historical games
        opponent_id: opponentTeam.id,
        prop_type: log.prop_type,
        line: log.line,
        actual_value: log.actual_value,
        hit: log.hit,
        game_date: log.game_date,
        season: log.season,
        home_away: log.home_away
      }).onConflictDoNothing();
    } catch (error) {
      console.error(`❌ Error inserting game log:`, error);
    }
  }

  private async findOpponentTeam(opponentAbbr: string, gameDate: Date): Promise<{id: string} | null> {
    try {
      const result = await db.select({ id: teams.id })
        .from(teams)
        .where(eq(teams.abbreviation, opponentAbbr))
        .limit(1);
      
      return result[0] || null;
    } catch (error) {
      return null;
    }
  }

  async calculateNFLDefenseRankings(): Promise<void> {
    console.log('🛡️ Calculating NFL defensive rankings...');
    
    try {
      // Get all NFL teams
      const nflTeams = await db.select({
        id: teams.id,
        league_id: teams.league_id,
        abbreviation: teams.abbreviation
      })
      .from(teams)
      .innerJoin(leagues, eq(teams.league_id, leagues.id))
      .where(eq(leagues.code, 'NFL'));

      // Calculate rankings for each prop type
      const propTypes = ['Passing Yards', 'Rushing Yards', 'Receiving Yards', 'Receptions'];

      for (const propType of propTypes) {
        console.log(`📊 Calculating ${propType} defensive rankings...`);
        
        const teamStats: Array<{
          team_id: string;
          league_id: string;
          prop_type: string;
          avg_allowed: number;
          games_tracked: number;
        }> = [];

        for (const team of nflTeams) {
          // Calculate average allowed for this prop type
          const result = await db.select({
            avg_allowed: sql<number>`AVG(pgl.actual_value)`,
            games_tracked: sql<number>`COUNT(*)`
          })
          .from(player_game_logs.as('pgl'))
          .innerJoin(players, eq(player_game_logs.player_id, players.id))
          .innerJoin(teams.as('opponent_teams'), eq(player_game_logs.opponent_id, teams.id))
          .where(and(
            eq(player_game_logs.prop_type, propType),
            eq(player_game_logs.opponent_id, team.id)
          ));

          if (result[0] && result[0].games_tracked > 0) {
            teamStats.push({
              team_id: team.id,
              league_id: team.league_id,
              prop_type: propType,
              avg_allowed: Number(result[0].avg_allowed),
              games_tracked: Number(result[0].games_tracked)
            });
          }
        }

        // Sort by average allowed (lower = better defense)
        teamStats.sort((a, b) => a.avg_allowed - b.avg_allowed);

        // Insert rankings
        for (let i = 0; i < teamStats.length; i++) {
          const stat = teamStats[i];
          const rank = i + 1;
          const rankPercentile = ((teamStats.length - rank) / teamStats.length) * 100;

          await db.insert(defense_ranks).values({
            team_id: stat.team_id,
            league_id: stat.league_id,
            prop_type: stat.prop_type,
            rank: rank,
            rank_percentile: rankPercentile,
            season: '2024',
            games_tracked: stat.games_tracked
          }).onConflictDoUpdate({
            target: [defense_ranks.team_id, defense_ranks.prop_type, defense_ranks.season],
            set: {
              rank: rank,
              rank_percentile: rankPercentile,
              games_tracked: stat.games_tracked,
              updated_at: sql`NOW()`
            }
          });
        }

        console.log(`✅ Calculated ${propType} rankings for ${teamStats.length} teams`);
      }
    } catch (error) {
      console.error('❌ Error calculating defensive rankings:', error);
    }
  }

  async updateAllPropsWithRealAnalytics(): Promise<void> {
    console.log('🔄 Updating all props with real analytics...');
    
    const allProps = await db.select().from(props);
    let updated = 0;

    for (const prop of allProps) {
      try {
        // Call the database function to update analytics
        await db.execute(sql`SELECT update_prop_analytics(${prop.id})`);
        updated++;
        
        if (updated % 50 === 0) {
          console.log(`📊 Updated ${updated}/${allProps.length} props`);
        }
      } catch (error) {
        console.error(`❌ Error updating prop ${prop.id}:`, error);
      }
    }

    console.log(`✅ Updated analytics for ${updated} props`);
  }

  async generateValidationReport(): Promise<void> {
    console.log('📋 Generating validation report...');
    
    const queries = [
      {
        name: 'Total Game Logs',
        query: sql`SELECT COUNT(*) as count FROM player_game_logs`
      },
      {
        name: 'Game Logs by Prop Type',
        query: sql`SELECT prop_type, COUNT(*) as count FROM player_game_logs GROUP BY prop_type ORDER BY count DESC`
      },
      {
        name: 'Defense Rankings',
        query: sql`SELECT prop_type, COUNT(*) as count FROM defense_ranks GROUP BY prop_type ORDER BY count DESC`
      },
      {
        name: 'Props with Analytics',
        query: sql`SELECT COUNT(*) as count FROM props WHERE hit_rate_l5 IS NOT NULL OR hit_rate_l10 IS NOT NULL OR streak_current IS NOT NULL`
      },
      {
        name: 'Sample Analytics Data',
        query: sql`SELECT p.prop_type, p.line, p.hit_rate_l5, p.hit_rate_l10, p.streak_current, p.h2h_hit_rate, p.matchup_grade, pl.name as player_name FROM props p JOIN players pl ON p.player_id = pl.id WHERE p.hit_rate_l5 IS NOT NULL LIMIT 10`
      }
    ];

    for (const { name, query } of queries) {
      console.log(`\n📊 ${name}:`);
      const result = await db.execute(query);
      console.table(result.rows);
    }
  }
}

// Main execution
async function main() {
  const ingester = new ComprehensiveStatsIngester();
  
  try {
    // Ingest NFL historical data
    await ingester.ingestNFLHistoricalData();
    
    // Update all props with analytics
    await ingester.updateAllPropsWithRealAnalytics();
    
    // Generate validation report
    await ingester.generateValidationReport();
    
    console.log('🎉 Real historical data ingestion completed!');
  } catch (error) {
    console.error('❌ Error in main execution:', error);
  }
  
  process.exit(0);
}

if (require.main === module) {
  main().catch(console.error);
}

export { ComprehensiveStatsIngester };
