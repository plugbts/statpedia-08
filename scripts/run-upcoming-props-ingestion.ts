#!/usr/bin/env tsx

import { ingestUpcomingProps, ingestAllUpcomingProps } from '../src/services/upcoming-props-ingestion.js';

async function main() {
  const args = process.argv.slice(2);
  const league = args[0]?.toUpperCase();
  const validateResults = args.includes('--validate');

  if (!league || league === 'ALL') {
    console.log('🚀 Upcoming Props Ingestion CLI - All Leagues');
    console.log('📊 Leagues: NFL, NBA, MLB, WNBA, NHL, CBB');
    console.log(`🧪 Validate results: ${validateResults}`);

    console.log('\n📥 Starting upcoming props ingestion for all leagues...');
    try {
      await ingestAllUpcomingProps();
      console.log('🎉 All leagues upcoming props ingestion completed successfully!');

      if (validateResults) {
        console.log('\n🔍 Validation Results:');
        console.log('📊 Check your Neon database for upcoming props');
        console.log('🎯 Verify Hasura is exposing all the data');
        console.log('🚀 Test your frontend with the upcoming props data');
      }

    } catch (error: any) {
      console.error('❌ Upcoming props ingestion failed:', error.message);
      process.exit(1);
    }
  } else {
    console.log('🚀 Upcoming Props Ingestion CLI');
    console.log(`📊 League: ${league}`);
    console.log(`🧪 Validate results: ${validateResults}`);

    console.log('\n📥 Starting upcoming props ingestion...');
    try {
      await ingestUpcomingProps(league);
      console.log(`🎉 ${league} upcoming props ingestion completed successfully!`);

      if (validateResults) {
        console.log('\n🔍 Validation Results:');
        console.log('📊 Check your Neon database for upcoming props');
        console.log('🎯 Verify Hasura is exposing all the data');
        console.log('🚀 Test your frontend with the upcoming props data');
      }

    } catch (error: any) {
      console.error('❌ Upcoming props ingestion failed:', error.message);
      process.exit(1);
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
