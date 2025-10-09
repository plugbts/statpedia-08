#!/usr/bin/env node

/**
 * Direct Database Test Script
 * Bypasses the Worker and directly queries Supabase to verify data
 */

import { createClient } from '@supabase/supabase-js';

// Use environment variables from wrangler.toml
const supabaseUrl = "https://rfdrifnsfobqlzorcesn.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA0ODgzNiwiZXhwIjoyMDc0NjI0ODM2fQ.E9LQFvqVs9Z1cXoS34ov5qV3jBkbqCHPCL16GBt480g";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDatabaseDirect() {
  console.log('🔍 Testing database directly...\n');

  try {
    // Test proplines table
    console.log('📊 Checking proplines table...');
    const { data: proplinesData, error: proplinesError, count: proplinesCount } = await supabase
      .from('proplines')
      .select('*', { count: 'exact' })
      .limit(5);

    if (proplinesError) {
      console.error('❌ Proplines query failed:', proplinesError.message);
    } else {
      console.log(`✅ Proplines: Found ${proplinesCount} total records`);
      if (proplinesData && proplinesData.length > 0) {
        console.log('📋 Sample proplines record:');
        console.log(JSON.stringify(proplinesData[0], null, 2));
      } else {
        console.log('⚠️ No proplines records found');
      }
    }

    console.log('\n📊 Checking player_game_logs table...');
    const { data: gameLogsData, error: gameLogsError, count: gameLogsCount } = await supabase
      .from('player_game_logs')
      .select('*', { count: 'exact' })
      .limit(5);

    if (gameLogsError) {
      console.error('❌ Player_game_logs query failed:', gameLogsError.message);
    } else {
      console.log(`✅ Player_game_logs: Found ${gameLogsCount} total records`);
      if (gameLogsData && gameLogsData.length > 0) {
        console.log('📋 Sample game logs record:');
        console.log(JSON.stringify(gameLogsData[0], null, 2));
      } else {
        console.log('⚠️ No player_game_logs records found');
      }
    }

    // Test a specific query that should find data
    console.log('\n🔍 Testing specific queries...');
    
    // Look for any NFL data
    const { data: nflData, error: nflError } = await supabase
      .from('player_game_logs')
      .select('*')
      .eq('league', 'nfl')
      .limit(3);

    if (nflError) {
      console.error('❌ NFL query failed:', nflError.message);
    } else {
      console.log(`✅ NFL data query: Found ${nflData?.length || 0} records`);
      if (nflData && nflData.length > 0) {
        console.log('📋 Sample NFL record:');
        console.log(JSON.stringify(nflData[0], null, 2));
      }
    }

    // Look for any data with SportsGameOdds
    const { data: sgoData, error: sgoError } = await supabase
      .from('proplines')
      .select('*')
      .eq('sportsbook', 'SportsGameOdds')
      .limit(3);

    if (sgoError) {
      console.error('❌ SportsGameOdds query failed:', sgoError.message);
    } else {
      console.log(`✅ SportsGameOdds query: Found ${sgoData?.length || 0} records`);
      if (sgoData && sgoData.length > 0) {
        console.log('📋 Sample SportsGameOdds record:');
        console.log(JSON.stringify(sgoData[0], null, 2));
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDatabaseDirect().then(() => {
  console.log('\n✅ Direct database test completed');
}).catch(error => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});
