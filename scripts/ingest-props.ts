#!/usr/bin/env node

/**
 * Prop Ingestion CLI Script
 * 
 * Usage:
 * npm run ingest:props [sport] [--clear]
 * 
 * Examples:
 * npm run ingest:props nfl
 * npm run ingest:props nba --clear
 * npm run ingest:props all
 */

import { config } from 'dotenv';
import { ingestProps, ingestAllSports, clearOldProps } from '../src/services/prop-ingestion-service';

// Load environment variables
config({ path: '.env.local' });

async function main() {
  const args = process.argv.slice(2);
  const sport = args[0] || 'nfl';
  const shouldClear = args.includes('--clear') || args.includes('-c');
  
  console.log('🚀 StatPedia Prop Ingestion CLI');
  console.log(`📊 Sport: ${sport.toUpperCase()}`);
  console.log(`🗑️  Clear old props: ${shouldClear}`);
  
  try {
    // Clear old props if requested
    if (shouldClear) {
      console.log('\n🗑️  Clearing old props...');
      await clearOldProps(sport === 'all' ? undefined : sport);
    }
    
    // Run ingestion
    console.log('\n📥 Starting ingestion...');
    
    if (sport === 'all') {
      await ingestAllSports();
    } else {
      await ingestProps(sport);
    }
    
    console.log('\n🎉 Ingestion completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Check your Neon database for the new props');
    console.log('2. Update Hasura to track the props table');
    console.log('3. Test your GraphQL queries');
    console.log('4. Verify team logos are still working');
    
  } catch (error) {
    console.error('\n❌ Ingestion failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
