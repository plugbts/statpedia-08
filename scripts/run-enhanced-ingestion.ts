#!/usr/bin/env node

/**
 * Enhanced Prop Ingestion CLI Script
 * 
 * Fixes:
 * - Only two props (full slate processing)
 * - Injured players still showing (proper status filtering)  
 * - Prop types flattened (specific market mapping)
 */

import { config } from 'dotenv';
import { ingestPropsEnhanced, ingestAllLeaguesEnhanced, validateIngestion } from '../src/services/enhanced-prop-ingestion';

// Load environment variables
config({ path: '.env.local' });

async function main() {
  const args = process.argv.slice(2);
  const league = args[0] || 'nfl';
  const shouldValidate = args.includes('--validate') || args.includes('-v');
  const shouldClear = args.includes('--clear') || args.includes('-c');
  
  console.log('🚀 Enhanced Prop Ingestion CLI');
  console.log(`📊 League: ${league.toUpperCase()}`);
  console.log(`🗑️  Clear old props: ${shouldClear}`);
  console.log(`🧪 Validate results: ${shouldValidate}`);
  
  try {
    // Clear old props if requested
    if (shouldClear) {
      console.log('\n🗑️  Clearing old props...');
      // Note: You might want to add a clear function to the enhanced service
      console.log('⚠️  Clear function not implemented yet');
    }
    
    // Run enhanced ingestion
    console.log('\n📥 Starting enhanced ingestion...');
    
    if (league === 'all') {
      await ingestAllLeaguesEnhanced();
    } else {
      await ingestPropsEnhanced(league);
    }
    
    console.log('\n🎉 Enhanced ingestion completed successfully!');
    
    // Validate results if requested
    if (shouldValidate) {
      console.log('\n🧪 Running validation...');
      await validateIngestion();
    }
    
    console.log('\n📋 Next steps:');
    console.log('1. Check your Neon database for the new props');
    console.log('2. Verify Hasura is exposing all the data');
    console.log('3. Test your frontend with the enhanced data');
    console.log('4. Verify injury filtering is working');
    console.log('5. Check that prop types are properly normalized');
    
  } catch (error) {
    console.error('\n❌ Enhanced ingestion failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
