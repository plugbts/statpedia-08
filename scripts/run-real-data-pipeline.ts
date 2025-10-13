#!/usr/bin/env tsx

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function runNFLIngestion() {
  console.log('🏈 Starting NFL data ingestion...');
  
  try {
    const { ingestNFLData } = await import('./ingest-nfl-real-data');
    await ingestNFLData(2023);
    console.log('✅ NFL data ingestion completed');
  } catch (error) {
    console.error('❌ NFL data ingestion failed:', error);
    throw error;
  }
}

async function runNBAIngestion() {
  console.log('🏀 Starting NBA data ingestion...');
  
  try {
    const { ingestNBAData } = await import('./ingest-nba-real-data');
    await ingestNBAData(2023);
    console.log('✅ NBA data ingestion completed');
  } catch (error) {
    console.error('❌ NBA data ingestion failed:', error);
    throw error;
  }
}

async function runAnalyticsEnrichment() {
  console.log('📊 Starting analytics enrichment...');
  
  try {
    const { enrichAllProps } = await import('./enrich-props-real-analytics');
    await enrichAllProps();
    console.log('✅ Analytics enrichment completed');
  } catch (error) {
    console.error('❌ Analytics enrichment failed:', error);
    throw error;
  }
}

async function validateData() {
  console.log('🔍 Validating ingested data...');
  
  try {
    // Check player game logs
    const gameLogsCount = await db.execute('SELECT COUNT(*) FROM player_game_logs');
    console.log(`📈 Player game logs: ${gameLogsCount[0].count}`);
    
    // Check defense ranks
    const defenseRanksCount = await db.execute('SELECT COUNT(*) FROM defense_ranks');
    console.log(`🛡️ Defense ranks: ${defenseRanksCount[0].count}`);
    
    // Check enriched props
    const enrichedProps = await db.execute(`
      SELECT COUNT(*) FROM props 
      WHERE hit_rate_l5 IS NOT NULL 
      AND streak_current IS NOT NULL 
      AND source = 'sportsbook'
    `);
    console.log(`⚡ Enriched props: ${enrichedProps[0].count}`);
    
    // Sample analytics data
    const sampleProps = await db.execute(`
      SELECT 
        p.prop_type,
        p.hit_rate_l5,
        p.streak_current,
        p.matchup_rank,
        pl.name as player_name
      FROM props p
      JOIN players pl ON p.player_id = pl.id
      WHERE p.hit_rate_l5 IS NOT NULL
      LIMIT 5
    `);
    
    console.log('\n📋 Sample enriched props:');
    sampleProps.forEach((prop: any) => {
      console.log(`  ${prop.player_name} - ${prop.prop_type}: L5=${prop.hit_rate_l5?.toFixed(1)}%, Streak=${prop.streak_current}, MatchupRank=${prop.matchup_rank}`);
    });
    
  } catch (error) {
    console.error('❌ Data validation failed:', error);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const leagues = args.length > 0 ? args : ['NFL', 'NBA'];
  
  console.log(`🚀 Starting real data pipeline for leagues: ${leagues.join(', ')}`);
  console.log('=' .repeat(60));
  
  try {
    // Run league-specific ingestion
    for (const league of leagues) {
      switch (league.toUpperCase()) {
        case 'NFL':
          await runNFLIngestion();
          break;
        case 'NBA':
          await runNBAIngestion();
          break;
        default:
          console.log(`⚠️ Unknown league: ${league}, skipping...`);
      }
    }
    
    // Run analytics enrichment
    await runAnalyticsEnrichment();
    
    // Validate the data
    await validateData();
    
    console.log('\n🎉 Real data pipeline completed successfully!');
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('\n💥 Real data pipeline failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Handle command line usage
if (require.main === module) {
  main().catch(console.error);
}

export { main };
