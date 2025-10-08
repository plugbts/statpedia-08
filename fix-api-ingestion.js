/**
 * Fix API ingestion issues to get hundreds of players
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

const API_KEY = process.env.SPORTSGAMEODDS_API_KEY;

async function fixApiIngestion() {
  console.log('🔧 Fixing API Ingestion Issues');
  console.log('='.repeat(40));

  try {
    // Test different prop lines API endpoints
    console.log('\n🎯 Testing Prop Lines API Endpoints:');
    
    // Test v1 API
    console.log('Testing v1 API: https://api.sportsgameodds.com/v1/nfl/props?limit=100');
    const v1Response = await fetch('https://api.sportsgameodds.com/v1/nfl/props?limit=100', {
      headers: { 'x-api-key': API_KEY }
    });
    
    if (v1Response.ok) {
      const v1Data = await v1Response.json();
      console.log(`✅ v1 API: ${v1Data.props?.length || 0} props`);
    } else {
      console.log(`❌ v1 API failed: ${v1Response.status}`);
    }

    // Test v2 API with different parameters
    console.log('\nTesting v2 API with different parameters:');
    
    // Test without season parameter
    const v2NoSeasonResponse = await fetch(`https://api.sportsgameodds.com/v2/events?apiKey=${API_KEY}&oddsAvailable=true&leagueID=NFL&limit=100`);
    if (v2NoSeasonResponse.ok) {
      const v2NoSeasonData = await v2NoSeasonResponse.json();
      console.log(`✅ v2 API (no season): ${v2NoSeasonData.events?.length || 0} events`);
    } else {
      console.log(`❌ v2 API (no season) failed: ${v2NoSeasonResponse.status}`);
    }

    // Test with different season
    const v2Season2024Response = await fetch(`https://api.sportsgameodds.com/v2/events?apiKey=${API_KEY}&oddsAvailable=true&leagueID=NFL&season=2024&limit=100`);
    if (v2Season2024Response.ok) {
      const v2Season2024Data = await v2Season2024Response.json();
      console.log(`✅ v2 API (2024): ${v2Season2024Data.events?.length || 0} events`);
    } else {
      console.log(`❌ v2 API (2024) failed: ${v2Season2024Response.status}`);
    }

    // Test the original v1 events API for props
    console.log('\nTesting original events API for props:');
    const eventsResponse = await fetch('https://api.sportsgameodds.com/events?league=nfl&limit=10', {
      headers: { 'x-api-key': API_KEY }
    });
    
    if (eventsResponse.ok) {
      const eventsData = await eventsResponse.json();
      console.log(`✅ Events API: ${eventsData.data?.length || 0} events`);
      
      // Check if events have odds data
      let eventsWithOdds = 0;
      for (const event of eventsData.data || []) {
        if (event.odds && Object.keys(event.odds).length > 0) {
          eventsWithOdds++;
        }
      }
      console.log(`📊 Events with odds: ${eventsWithOdds}`);
    } else {
      console.log(`❌ Events API failed: ${eventsResponse.status}`);
    }

    // Test game logs ingestion with more data
    console.log('\n📊 Testing Game Logs Ingestion:');
    
    // Get more events to see why we're only getting 3 players
    const moreEventsResponse = await fetch('https://api.sportsgameodds.com/events?league=nfl&limit=200', {
      headers: { 'x-api-key': API_KEY }
    });
    
    if (moreEventsResponse.ok) {
      const moreEventsData = await moreEventsResponse.json();
      console.log(`✅ More events API: ${moreEventsData.data?.length || 0} events`);
      
      // Count completed events with player data
      let completedEventsWithPlayers = 0;
      let totalPlayers = 0;
      let uniquePlayers = new Set();
      
      for (const event of moreEventsData.data || []) {
        if (event.status?.completed && event.results?.game) {
          completedEventsWithPlayers++;
          const players = Object.keys(event.results.game).filter(key => key !== 'away' && key !== 'home');
          totalPlayers += players.length;
          players.forEach(player => uniquePlayers.add(player));
        }
      }
      
      console.log(`📊 Completed events with players: ${completedEventsWithPlayers}`);
      console.log(`📊 Total players in completed events: ${totalPlayers}`);
      console.log(`📊 Unique players in completed events: ${uniquePlayers.size}`);
    } else {
      console.log(`❌ More events API failed: ${moreEventsResponse.status}`);
    }

    // Check what's in our current database
    console.log('\n🗄️ Current Database Status:');
    
    const { data: currentGameLogs, error: currentGameLogsError } = await supabase
      .from('playergamelogs')
      .select('player_id, player_name, date, season')
      .order('date', { ascending: false });

    if (currentGameLogsError) {
      console.error('❌ Database error:', currentGameLogsError);
    } else {
      console.log(`📊 Current game logs: ${currentGameLogs?.length || 0} records`);
      
      // Check unique players by season
      const playersBySeason = {};
      currentGameLogs?.forEach(log => {
        if (!playersBySeason[log.season]) {
          playersBySeason[log.season] = new Set();
        }
        playersBySeason[log.season].add(log.player_id);
      });
      
      console.log('📊 Unique players by season:');
      Object.entries(playersBySeason).forEach(([season, players]) => {
        console.log(`  ${season}: ${players.size} unique players`);
      });
    }

    console.log('\n🎉 API ingestion analysis complete!');
    console.log('='.repeat(40));

  } catch (error) {
    console.error('❌ Fatal error during API ingestion analysis:', error);
  }
}

fixApiIngestion().catch(console.error);
