#!/usr/bin/env tsx

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, desc, sql } from 'drizzle-orm';
import dotenv from 'dotenv';

// Import schema
import { props, players, teams, games, leagues, player_game_logs, defense_ranks } from '../src/lib/db/schema';

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

// ESPN API for real historical data
const ESPN_BASE_URL = 'https://site.api.espn.com/apis/site/v2/sports';

interface ESPNGame {
  id: string;
  date: string;
  name: string;
  shortName: string;
  competitions: Array<{
    id: string;
    date: string;
    competitors: Array<{
      id: string;
      team: {
        id: string;
        abbreviation: string;
        displayName: string;
      };
      homeAway: 'home' | 'away';
      score?: string;
    }>;
    status: {
      type: {
        completed: boolean;
      };
    };
  }>;
}

interface ESPNPlayerStats {
  id: string;
  displayName: string;
  position: {
    abbreviation: string;
  };
  statistics: Array<{
    label: string;
    displayValue: string;
    value: number;
  }>;
}

interface ESPNGameStats {
  teams: Array<{
    team: {
      id: string;
      abbreviation: string;
    };
    statistics: Array<{
      label: string;
      displayValue: string;
      value: number;
      athletes: Array<{
        athlete: {
          id: string;
          displayName: string;
          position: {
            abbreviation: string;
          };
        };
        statistics: Array<{
          label: string;
          displayValue: string;
          value: number;
        }>;
      }>;
    }>;
  }>;
}

class RealHistoricalDataIngester {
  private propTypeMapping: Record<string, string[]> = {
    'Passing Yards': ['passingYards', 'Passing Yards', 'passing-yards'],
    'Rushing Yards': ['rushingYards', 'Rushing Yards', 'rushing-yards'],
    'Receiving Yards': ['receivingYards', 'Receiving Yards', 'receiving-yards'],
    'Receptions': ['receptions', 'Catches', 'catches'],
    'Passing TDs': ['passingTouchdowns', 'Passing TDs', 'passing-touchdowns'],
    'Rushing TDs': ['rushingTouchdowns', 'Rushing TDs', 'rushing-touchdowns'],
    'Receiving TDs': ['receivingTouchdowns', 'Receiving TDs', 'receiving-touchdowns'],
    'Points': ['points', 'Points'],
    'Assists': ['assists', 'Assists'],
    'Rebounds': ['rebounds', 'Rebounds'],
    '3-Pointers Made': ['threePointFieldGoals', '3-Pointers Made', 'three-pointers']
  };

  async fetchRecentGames(league: string, daysBack: number = 60): Promise<ESPNGame[]> {
    const sportMap: Record<string, string> = {
      'NFL': 'football/nfl',
      'NBA': 'basketball/nba',
      'MLB': 'baseball/mlb',
      'NHL': 'hockey/nhl'
    };

    const sport = sportMap[league];
    if (!sport) {
      console.log(`❌ Unsupported league: ${league}`);
      return [];
    }

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const url = `${ESPN_BASE_URL}/${sport}/scoreboard?dates=${startDate.toISOString().split('T')[0]},${endDate.toISOString().split('T')[0]}`;
      console.log(`📡 Fetching games from ESPN: ${url}`);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`ESPN API error: ${response.status}`);
      }

      const data = await response.json();
      return data.events || [];
    } catch (error) {
      console.error(`❌ Error fetching games for ${league}:`, error);
      return [];
    }
  }

  async fetchGameStats(gameId: string, league: string): Promise<ESPNGameStats | null> {
    const sportMap: Record<string, string> = {
      'NFL': 'football/nfl',
      'NBA': 'basketball/nba',
      'MLB': 'baseball/mlb',
      'NHL': 'hockey/nhl'
    };

    const sport = sportMap[league];
    if (!sport) {
      return null;
    }

    try {
      const url = `${ESPN_BASE_URL}/${sport}/summary?event=${gameId}`;
      console.log(`📊 Fetching game stats: ${url}`);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`ESPN API error: ${response.status}`);
      }

      const data = await response.json();
      return data.boxscore || null;
    } catch (error) {
      console.error(`❌ Error fetching game stats for ${gameId}:`, error);
      return null;
    }
  }

  async ingestHistoricalData(league: string): Promise<void> {
    console.log(`🚀 Starting historical data ingestion for ${league}`);
    
    // Fetch recent games
    const games = await this.fetchRecentGames(league, 60);
    console.log(`📅 Found ${games.length} games for ${league}`);

    let processedGames = 0;
    let totalLogs = 0;

    for (const game of games) {
      try {
        // Skip if game not completed
        if (!game.competitions?.[0]?.status?.type?.completed) {
          continue;
        }

        const gameId = game.id;
        console.log(`🎮 Processing game: ${game.competitions[0].name}`);

        // Fetch detailed game stats
        const gameStats = await this.fetchGameStats(gameId, league);
        if (!gameStats) {
          console.log(`⚠️ No stats available for game ${gameId}`);
          continue;
        }

        // Process each team's stats
        for (const teamStats of gameStats.teams) {
          const teamAbbr = teamStats.team.abbreviation;
          
          // Find our team in database
          const team = await db.select().from(teams)
            .where(and(
              eq(teams.abbreviation, teamAbbr),
              eq(teams.league_id, (await this.getLeagueId(league)))
            ))
            .limit(1);

          if (team.length === 0) {
            console.log(`⚠️ Team ${teamAbbr} not found in database`);
            continue;
          }

          const teamId = team[0].id;

          // Process each statistic category
          for (const statCategory of teamStats.statistics) {
            const categoryLabel = statCategory.label;
            console.log(`📈 Processing ${categoryLabel} for ${teamAbbr}`);

            // Process each athlete in this category
            for (const athlete of statCategory.athletes || []) {
              const playerName = athlete.athlete.displayName;
              const position = athlete.athlete.position?.abbreviation;

              // Find player in our database
              const player = await db.select().from(players)
                .where(and(
                  eq(players.name, playerName),
                  eq(players.team_id, teamId)
                ))
                .limit(1);

              if (player.length === 0) {
                console.log(`⚠️ Player ${playerName} not found in database`);
                continue;
              }

              const playerId = player[0].id;

              // Process each statistic for this player
              for (const stat of athlete.statistics) {
                const statLabel = stat.label;
                const statValue = stat.value;

                // Map ESPN stat to our prop types
                const propType = this.mapStatToPropType(statLabel, league);
                if (!propType) {
                  continue;
                }

                // Create or update game log
                await this.createGameLog({
                  playerId,
                  teamId,
                  gameId,
                  opponentId: await this.getOpponentId(gameId, teamId),
                  propType,
                  line: await this.getPropLine(playerId, propType, gameId),
                  actualValue: statValue,
                  hit: await this.didHitOver(playerId, propType, gameId, statValue),
                  gameDate: new Date(game.competitions[0].date),
                  season: await this.getSeason(game.competitions[0].date),
                  homeAway: await this.getHomeAway(gameId, teamId)
                });

                totalLogs++;
              }
            }
          }
        }

        processedGames++;
        console.log(`✅ Processed ${processedGames}/${games.length} games (${totalLogs} logs created)`);

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Error processing game ${game.id}:`, error);
      }
    }

    console.log(`🎉 Completed ${league} historical ingestion: ${totalLogs} logs from ${processedGames} games`);
  }

  private mapStatToPropType(statLabel: string, league: string): string | null {
    const label = statLabel.toLowerCase();
    
    // NFL mappings
    if (league === 'NFL') {
      if (label.includes('passing yards') || label.includes('pass yards')) return 'Passing Yards';
      if (label.includes('rushing yards') || label.includes('rush yards')) return 'Rushing Yards';
      if (label.includes('receiving yards') || label.includes('rec yards')) return 'Receiving Yards';
      if (label.includes('receptions') || label.includes('catches')) return 'Receptions';
      if (label.includes('passing touchdown')) return 'Passing TDs';
      if (label.includes('rushing touchdown')) return 'Rushing TDs';
      if (label.includes('receiving touchdown')) return 'Receiving TDs';
    }

    // NBA mappings
    if (league === 'NBA') {
      if (label.includes('points')) return 'Points';
      if (label.includes('assists')) return 'Assists';
      if (label.includes('rebounds')) return 'Rebounds';
      if (label.includes('3-point') || label.includes('three-point')) return '3-Pointers Made';
    }

    return null;
  }

  private async getLeagueId(leagueCode: string): Promise<string> {
    const result = await db.select().from(leagues)
      .where(eq(leagues.code, leagueCode))
      .limit(1);
    return result[0]?.id || '';
  }

  private async getOpponentId(gameId: string, teamId: string): Promise<string> {
    const game = await db.select().from(games)
      .where(eq(games.external_id, gameId))
      .limit(1);
    
    if (game.length === 0) return '';
    
    const g = game[0];
    return g.home_team_id === teamId ? g.away_team_id : g.home_team_id;
  }

  private async getPropLine(playerId: string, propType: string, gameId: string): Promise<number> {
    // Get the most common line for this prop type from recent props
    const result = await db.select({ line: props.line })
      .from(props)
      .where(and(
        eq(props.player_id, playerId),
        eq(props.prop_type, propType)
      ))
      .orderBy(desc(props.created_at))
      .limit(10);

    if (result.length === 0) return 0;

    // Return the most common line
    const lines = result.map(r => Number(r.line));
    const mode = lines.sort((a, b) =>
      lines.filter(v => v === a).length - lines.filter(v => v === b).length
    ).pop();

    return mode || 0;
  }

  private async didHitOver(playerId: string, propType: string, gameId: string, actualValue: number): Promise<boolean> {
    const line = await this.getPropLine(playerId, propType, gameId);
    return actualValue >= line;
  }

  private getSeason(gameDate: string): string {
    const date = new Date(gameDate);
    const year = date.getFullYear();
    return year.toString();
  }

  private async getHomeAway(gameId: string, teamId: string): Promise<'home' | 'away'> {
    const game = await db.select().from(games)
      .where(eq(games.external_id, gameId))
      .limit(1);
    
    if (game.length === 0) return 'away';
    
    return game[0].home_team_id === teamId ? 'home' : 'away';
  }

  private async createGameLog(data: {
    playerId: string;
    teamId: string;
    gameId: string;
    opponentId: string;
    propType: string;
    line: number;
    actualValue: number;
    hit: boolean;
    gameDate: Date;
    season: string;
    homeAway: 'home' | 'away';
  }): Promise<void> {
    try {
      await db.insert(player_game_logs).values({
        player_id: data.playerId,
        team_id: data.teamId,
        game_id: data.gameId,
        opponent_id: data.opponentId,
        prop_type: data.propType,
        line: data.line,
        actual_value: data.actualValue,
        hit: data.hit,
        game_date: data.gameDate,
        season: data.season,
        home_away: data.homeAway
      }).onConflictDoNothing();
    } catch (error) {
      console.error(`❌ Error creating game log:`, error);
    }
  }

  async updateAllPropsAnalytics(): Promise<void> {
    console.log(`🔄 Updating analytics for all props...`);
    
    const allProps = await db.select().from(props);
    let updated = 0;

    for (const prop of allProps) {
      try {
        await db.execute(sql`SELECT update_prop_analytics(${prop.id})`);
        updated++;
        
        if (updated % 100 === 0) {
          console.log(`📊 Updated ${updated}/${allProps.length} props`);
        }
      } catch (error) {
        console.error(`❌ Error updating prop ${prop.id}:`, error);
      }
    }

    console.log(`✅ Updated analytics for ${updated} props`);
  }
}

// Main execution
async function main() {
  const ingester = new RealHistoricalDataIngester();
  
  const leagues = ['NFL', 'NBA', 'MLB', 'NHL'];
  
  for (const league of leagues) {
    try {
      await ingester.ingestHistoricalData(league);
    } catch (error) {
      console.error(`❌ Error ingesting ${league}:`, error);
    }
  }

  // Update all props with analytics
  await ingester.updateAllPropsAnalytics();
  
  console.log(`🎉 Historical data ingestion completed!`);
  process.exit(0);
}

if (require.main === module) {
  main().catch(console.error);
}

export { RealHistoricalDataIngester };
