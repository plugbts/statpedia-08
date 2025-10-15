#!/usr/bin/env tsx

/**
 * One-Game Harness for Testing Ingestion
 * 
 * This script tests the complete ingestion and enrichment pipeline
 * using a single golden dataset game. Use this before running full ingestion.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// Import schema
import { 
  leagues,
  games, 
  teams, 
  players, 
  props, 
  player_game_logs
} from '../src/db/schema/index';
import { playerAnalytics } from '../src/db/schema/analytics';

config({ path: resolve(process.cwd(), '.env.local') });

const connectionString = process.env.NEON_DATABASE_URL;

if (!connectionString) {
  throw new Error('NEON_DATABASE_URL is not set');
}

const client = postgres(connectionString);
const db = drizzle(client);

interface GoldenDataset {
  game: {
    id: string;
    api_game_id: string;
    game_date: string;
    home_team: TeamData;
    away_team: TeamData;
    league: string;
    season: string;
  };
  players: PlayerData[];
  props: PropData[];
  game_logs: GameLogData[];
}

interface TeamData {
  id: string;
  name: string;
  abbreviation: string;
  logo_url: string;
}

interface PlayerData {
  id: string;
  name: string;
  position: string;
  team_id: string;
  external_id: string;
}

interface PropData {
  id: string;
  player_id: string;
  game_id: string;
  prop_type: string;
  line: string;
  odds: string;
  source: string;
  created_at: string;
}

interface GameLogData {
  id: string;
  player_id: string;
  game_id: string;
  team_id: string;
  opponent_id: string;
  prop_type: string;
  line: string;
  actual_value: string;
  hit: boolean;
  game_date: string;
  season: string;
  home_away: 'home' | 'away';
}

async function loadGoldenDataset(league: string): Promise<GoldenDataset> {
  const fixturePath = resolve(process.cwd(), `fixtures/${league.toLowerCase()}_game.json`);
  
  try {
    const fs = await import('fs/promises');
    const data = await fs.readFile(fixturePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    throw new Error(`Failed to load golden dataset for ${league}: ${error}`);
  }
}

async function seedLeague(db: any, dataset: GoldenDataset): Promise<string> {
  console.log('🏆 Seeding league...');
  
  // First, try to find existing league
  const existingLeague = await db.execute(sql`
    SELECT id FROM leagues WHERE code = ${dataset.game.league}
  `);
  
  if (existingLeague.length > 0) {
    console.log('✅ League already exists');
    return existingLeague[0].id;
  }
  
  // Create new league if it doesn't exist
  const leagueId = randomUUID();
  await db.insert(leagues).values({
    id: leagueId,
    code: dataset.game.league,
    name: dataset.game.league,
    created_at: new Date(),
    updated_at: new Date()
  });
  
  console.log('✅ Seeded league');
  return leagueId;
}

async function seedTeams(db: any, dataset: GoldenDataset, leagueId: string): Promise<void> {
  console.log('🏈 Seeding teams...');
  
  const teamsToInsert = [dataset.game.home_team, dataset.game.away_team].map(team => ({
    id: team.id,
    league_id: leagueId,
    name: team.name,
    abbreviation: team.abbreviation,
    logo_url: team.logo_url,
    created_at: new Date(),
    updated_at: new Date()
  }));

  await db.insert(teams).values(teamsToInsert).onConflictDoNothing();
  console.log(`✅ Seeded ${teamsToInsert.length} teams`);
}

async function seedGame(db: any, dataset: GoldenDataset, leagueId: string): Promise<void> {
  console.log('🎮 Seeding game...');
  
  const gameToInsert = {
    id: dataset.game.id,
    league_id: leagueId,
    api_game_id: dataset.game.api_game_id,
    game_date: new Date(dataset.game.game_date).toISOString(),
    home_team_id: dataset.game.home_team.id,
    away_team_id: dataset.game.away_team.id,
    season: dataset.game.season,
    created_at: new Date(),
    updated_at: new Date()
  };

  await db.insert(games).values(gameToInsert).onConflictDoNothing();
  console.log('✅ Seeded game');
}

async function seedPlayers(db: any, dataset: GoldenDataset): Promise<void> {
  console.log('👥 Seeding players...');
  
  const playersToInsert = dataset.players.map(player => ({
    id: player.id,
    name: player.name,
    position: player.position,
    team_id: player.team_id,
    external_id: player.external_id,
    status: 'Active',
    created_at: new Date(),
    updated_at: new Date()
  }));

  await db.insert(players).values(playersToInsert).onConflictDoNothing();
  console.log(`✅ Seeded ${playersToInsert.length} players`);
}

async function seedProps(db: any, dataset: GoldenDataset): Promise<void> {
  console.log('🎯 Seeding props...');
  
  const propsToInsert = dataset.props.map(prop => ({
    id: prop.id,
    player_id: prop.player_id,
    team_id: dataset.players.find(p => p.id === prop.player_id)?.team_id,
    game_id: prop.game_id,
    prop_type: prop.prop_type,
    line: prop.line,
    odds: prop.odds,
    source: prop.source,
    priority: true,
    created_at: new Date(prop.created_at),
    updated_at: new Date()
  }));

  await db.insert(props).values(propsToInsert).onConflictDoNothing();
  console.log(`✅ Seeded ${propsToInsert.length} props`);
}

async function seedGameLogs(db: any, dataset: GoldenDataset): Promise<void> {
  console.log('📊 Seeding game logs...');
  
  const logsToInsert = dataset.game_logs.map(log => ({
    id: log.id,
    player_id: log.player_id,
    game_id: log.game_id,
    team_id: log.team_id,
    opponent_id: log.opponent_id,
    prop_type: log.prop_type,
    line: log.line,
    actual_value: log.actual_value,
    hit: log.hit,
    game_date: log.game_date,
    season: log.season,
    home_away: log.home_away,
    created_at: new Date(),
    updated_at: new Date()
  }));

  await db.insert(player_game_logs).values(logsToInsert).onConflictDoNothing();
  console.log(`✅ Seeded ${logsToInsert.length} game logs`);
}

async function refreshEnrichment(db: any, gameId: string): Promise<void> {
  console.log('🔄 Running enrichment...');
  
  try {
    // Call the refresh_enrichment function
    await db.execute(sql`SELECT refresh_enrichment()`);
    console.log('✅ Enrichment completed');
  } catch (error) {
    console.error('❌ Enrichment failed:', error);
    throw error;
  }
}

async function validateResults(db: any, gameId: string): Promise<void> {
  console.log('🔍 Validating results...');
  
  const checks = [
    {
      name: 'No Unknown Players',
      query: sql`SELECT COUNT(*) as count FROM props WHERE player_id IN (SELECT id FROM players WHERE name = 'Unknown Player')`,
      expected: 0
    },
    {
      name: 'No NULL opponent_id',
      query: sql`SELECT COUNT(*) as count FROM player_game_logs WHERE opponent_id IS NULL`,
      expected: 0
    },
    {
      name: 'Enriched stats exist',
      query: sql`SELECT COUNT(*) as count FROM player_analytics WHERE game_id = ${gameId}`,
      expected: '> 0'
    },
    {
      name: 'Props join correctly',
      query: sql`SELECT COUNT(*) as count FROM props p JOIN players pl ON p.player_id = pl.id WHERE p.game_id = ${gameId}`,
      expected: '> 0'
    }
  ];

  for (const check of checks) {
    try {
      const result = await db.execute(check.query);
      const count = parseInt(result[0].count);
      
      if (check.expected === '> 0') {
        if (count > 0) {
          console.log(`✅ ${check.name}: ${count} records`);
        } else {
          console.log(`❌ ${check.name}: Expected > 0, got ${count}`);
        }
      } else {
        if (count === check.expected) {
          console.log(`✅ ${check.name}: ${count} records`);
        } else {
          console.log(`❌ ${check.name}: Expected ${check.expected}, got ${count}`);
        }
      }
    } catch (error) {
      console.log(`❌ ${check.name}: Query failed - ${error}`);
    }
  }
}

async function testOneGameHarness(league: string): Promise<void> {
  console.log(`🚀 Starting one-game harness test for ${league}...`);
  
  try {
    // Load golden dataset
    const dataset = await loadGoldenDataset(league);
    console.log(`📁 Loaded golden dataset: ${dataset.game.home_team.abbreviation} vs ${dataset.game.away_team.abbreviation}`);
    
    // Seed data
    const leagueId = await seedLeague(db, dataset);
    await seedTeams(db, dataset, leagueId);
    await seedGame(db, dataset, leagueId);
    await seedPlayers(db, dataset);
    await seedProps(db, dataset);
    await seedGameLogs(db, dataset);
    
    // Run enrichment
    await refreshEnrichment(db, dataset.game.id);
    
    // Validate results
    await validateResults(db, dataset.game.id);
    
    // Show sample enriched data
    const sampleEnriched = await db.execute(sql`
      SELECT pa.*, p.name as player_name, p.position
      FROM player_analytics pa
      JOIN players p ON pa.player_id = p.id
      WHERE pa.game_id = ${dataset.game.id}
      LIMIT 3
    `);
    
    console.log('\n📈 Sample enriched stats:');
    console.log(JSON.stringify(sampleEnriched, null, 2));
    
    console.log('\n🎉 One-game harness test completed successfully!');
    
  } catch (error) {
    console.error('❌ One-game harness test failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run the test
const league = process.argv[2] || 'nfl';
testOneGameHarness(league.toUpperCase())
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });

export { testOneGameHarness };
