#!/usr/bin/env tsx

/**
 * CLI script to run full ingestion for all leagues
 */

import { ingestAllLeagues } from '../src/services/full-ingestion';

async function main() {
  console.log('🚀 Starting full ingestion...');
  
  try {
    const result = await ingestAllLeagues();
    console.log('✅ Full ingestion completed successfully!');
    console.log(`📊 Results: ${result.games} games, ${result.players} players, ${result.props} props`);
  } catch (error) {
    console.error('❌ Full ingestion failed:', error);
    process.exit(1);
  }
}

main();
