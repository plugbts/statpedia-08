#!/usr/bin/env tsx

/**
 * CLI script to seed real players from SportsGameOdds API
 */

import { seedAllRealPlayers } from '../src/services/seed-real-players.js';

async function main() {
  const args = process.argv.slice(2);
  const league = args[0]?.toUpperCase();

  console.log('🚀 Real Players Seeding CLI');
  console.log(`📊 League: ${league || 'ALL'}`);

  try {
    if (league && league !== 'ALL') {
      console.log(`\n🌱 Seeding players for ${league}...`);
      // For now, we'll seed all leagues
      await seedAllRealPlayers();
    } else {
      console.log('\n🌱 Seeding players for all leagues...');
      await seedAllRealPlayers();
    }

    console.log('\n🎉 Real players seeding completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Run upcoming props ingestion to populate props for real players');
    console.log('2. Test frontend with rich upcoming props data');
    console.log('3. Verify player/team relationships in Hasura');

  } catch (error) {
    console.error('❌ Real players seeding failed:', error);
    process.exit(1);
  }
}

main();
