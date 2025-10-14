#!/usr/bin/env tsx

/**
 * Simple script to find valid WNBA game IDs
 */

import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

async function findWNBAGames() {
  console.log('🔍 Searching for WNBA games...');
  
  try {
    const response = await fetch('https://stats.wnba.com/stats/leaguegamefinder?Season=2024&SeasonType=Regular%20Season', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://www.wnba.com/',
        'Origin': 'https://www.wnba.com'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.resultSets && data.resultSets[0] && data.resultSets[0].rowSet) {
      const games = data.resultSets[0].rowSet;
      console.log(`✅ Found ${games.length} WNBA games`);
      
      // Show first 5 games
      console.log('\n📊 Sample WNBA games:');
      for (let i = 0; i < Math.min(5, games.length); i++) {
        const game = games[i];
        const gameId = game[4]; // GAME_ID
        const gameDate = game[5]; // GAME_DATE
        const teamAbbr = game[2]; // TEAM_ABBREVIATION
        const matchup = game[6]; // MATCHUP
        
        console.log(`  ${i + 1}. Game ID: ${gameId}, Date: ${gameDate}, Team: ${teamAbbr}, Matchup: ${matchup}`);
      }
      
      if (games.length > 0) {
        const firstGameId = games[0][4];
        console.log(`\n🎯 Use this game ID for testing: ${firstGameId}`);
        console.log(`   Command: npm run player-logs:debug ${firstGameId} WNBA`);
      }
    } else {
      console.log('❌ No games found in API response');
    }
    
  } catch (error: any) {
    console.error('❌ Error fetching WNBA games:', error.message);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  findWNBAGames();
}

export { findWNBAGames };
