#!/usr/bin/env tsx

/**
 * Simple script to find valid NHL game IDs
 */

import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

async function findNHLGames() {
  console.log('🔍 Searching for NHL games...');
  
  try {
    // Try multiple dates including recent preseason dates
    const dates = [
      new Date().toISOString().split('T')[0], // today
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // yesterday
      new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days ago
      new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days ago
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // last week
      '2024-10-01', // October 2024 preseason
      '2024-10-15', // Mid October 2024
      '2024-10-20', // Late October 2024
    ];
    
    for (const date of dates) {
      console.log(`🔍 Checking date: ${date}...`);
      
      try {
        const response = await fetch(`https://api-web.nhle.com/v1/schedule/${date}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Accept': 'application/json, text/plain, */*',
            'Referer': 'https://www.nhl.com/',
            'Origin': 'https://www.nhl.com'
          }
        });

        if (!response.ok) {
          console.log(`❌ No response for ${date}: ${response.status}`);
          continue;
        }

        const data = await response.json();
        
        if (data.dates && data.dates.length > 0 && data.dates[0].games) {
          const games = data.dates[0].games;
          console.log(`✅ Found ${games.length} NHL games for ${date}`);
          
          // Show first 5 games
          console.log('\n📊 Sample NHL games:');
          for (let i = 0; i < Math.min(5, games.length); i++) {
            const game = games[i];
            const gameId = game.gamePk;
            const gameDate = game.gameDate.split('T')[0];
            const homeTeam = game.teams.home.team.abbreviation;
            const awayTeam = game.teams.away.team.abbreviation;
            
            console.log(`  ${i + 1}. Game ID: ${gameId}, Date: ${gameDate}, ${awayTeam} @ ${homeTeam}`);
          }
          
          if (games.length > 0) {
            const firstGameId = games[0].gamePk.toString();
            console.log(`\n🎯 Use this game ID for testing: ${firstGameId}`);
            console.log(`   Command: npm run mlb-nhl:debug ${firstGameId} NHL`);
            return; // Exit after finding games
          }
        } else {
          console.log(`❌ No games found for ${date}`);
        }
      } catch (error: any) {
        console.log(`❌ Error checking ${date}: ${error.message}`);
        continue;
      }
    }
    
    console.log('\n❌ No NHL games found in any of the checked dates');
    
  } catch (error: any) {
    console.error('❌ Error fetching NHL games:', error.message);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  findNHLGames();
}

export { findNHLGames };
