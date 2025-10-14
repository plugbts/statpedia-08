#!/usr/bin/env tsx

/**
 * Simple script to find valid MLB game IDs
 */

import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

async function findMLBGames() {
  console.log('🔍 Searching for MLB games...');
  
  try {
    // Get games from today
    const today = new Date().toISOString().split('T')[0];
    
    const response = await fetch(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${today}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://www.mlb.com/',
        'Origin': 'https://www.mlb.com'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.dates && data.dates.length > 0 && data.dates[0].games) {
      const games = data.dates[0].games;
      console.log(`✅ Found ${games.length} MLB games for ${today}`);
      
      // Show first 5 games
      console.log('\n📊 Sample MLB games:');
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
        console.log(`   Command: npm run mlb-nhl:debug ${firstGameId} MLB`);
      }
    } else {
      console.log('❌ No games found for today');
      
      // Try yesterday
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      console.log(`\n🔍 Trying yesterday (${yesterday})...`);
      
      const yesterdayResponse = await fetch(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${yesterday}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept': 'application/json, text/plain, */*',
          'Referer': 'https://www.mlb.com/',
          'Origin': 'https://www.mlb.com'
        }
      });
      
      if (yesterdayResponse.ok) {
        const yesterdayData = await yesterdayResponse.json();
        if (yesterdayData.dates && yesterdayData.dates.length > 0 && yesterdayData.dates[0].games) {
          const yesterdayGames = yesterdayData.dates[0].games;
          console.log(`✅ Found ${yesterdayGames.length} MLB games for ${yesterday}`);
          
          if (yesterdayGames.length > 0) {
            const firstGameId = yesterdayGames[0].gamePk.toString();
            console.log(`\n🎯 Use this game ID for testing: ${firstGameId}`);
            console.log(`   Command: npm run mlb-nhl:debug ${firstGameId} MLB`);
          }
        }
      }
    }
    
  } catch (error: any) {
    console.error('❌ Error fetching MLB games:', error.message);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  findMLBGames();
}

export { findMLBGames };
