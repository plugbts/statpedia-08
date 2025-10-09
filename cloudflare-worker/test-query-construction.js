#!/usr/bin/env node

/**
 * Test Query Construction
 * Test the exact query construction logic from the Worker
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://rfdrifnsfobqlzorcesn.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA0ODgzNiwiZXhwIjoyMDc0NjI0ODM2fQ.E9LQFvqVs9Z1cXoS34ov5qV3jBkbqCHPCL16GBt480g";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testQueryConstruction() {
  console.log('🔍 Testing query construction logic...\n');

  try {
    // Test with "all" league
    const league = "all";
    const limit = 5;
    
    console.log(`📊 Testing league: ${league}`);

    // --- Helpers (copied from Worker) ---
    const normalizeDate = (d) => d.split("T")[0];
    const inFilter = (values) => {
      if (!values || values.length === 0) return null;
      return `in.(${values.map(v => `"${v}"`).join(",")})`;
    };

    // --- Fetch raw game logs ---
    let query = "player_game_logs";
    const params = [];
    if (league !== "all") {
      params.push(`league=eq.${league}`);
    }
    params.push(`order=date.desc`);

    if (params.length > 0) {
      query += `?${params.join("&")}`;
    }

    console.log(`📊 Game logs query: ${query}`);

    // Test the query directly
    const url = `${supabaseUrl}/rest/v1/${query}`;
    console.log(`📊 Full URL: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`📊 Response status: ${response.status}`);
    
    if (!response.ok) {
      const text = await response.text();
      console.log(`❌ Error response: ${text}`);
      return;
    }

    const gameLogs = await response.json();
    console.log(`✅ Game logs: ${gameLogs?.length || 0} records`);

    if (!gameLogs || gameLogs.length === 0) {
      console.log('❌ No game logs found');
      return;
    }

    // --- Fetch corresponding prop lines ---
    const playerIds = [...new Set(gameLogs.map(g => g.player_id))];
    const propTypes = [...new Set(gameLogs.map(g => g.prop_type))];
    const dates = [...new Set(gameLogs.map(g => normalizeDate(g.date)))];

    console.log(`📊 Unique players: ${playerIds.length}`);
    console.log(`📊 Unique prop types: ${propTypes.length}`);
    console.log(`📊 Unique dates: ${dates.length}`);

    // Build props query with proper filter handling
    const filters = [];
    const playerFilter = inFilter(playerIds);
    if (playerFilter) filters.push(`player_id=${playerFilter}`);

    const propFilter = inFilter(propTypes);
    if (propFilter) filters.push(`prop_type=${propFilter}`);

    const dateFilter = inFilter(dates);
    if (dateFilter) filters.push(`date=${dateFilter}`);

    const propsQuery = `proplines${filters.length ? "?" + filters.join("&") : ""}`;

    console.log(`📊 Props query: ${propsQuery}`);

    // Test the props query
    const propsUrl = `${supabaseUrl}/rest/v1/${propsQuery}`;
    console.log(`📊 Props URL: ${propsUrl}`);

    const propsResponse = await fetch(propsUrl, {
      method: 'GET',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`📊 Props response status: ${propsResponse.status}`);
    
    if (!propsResponse.ok) {
      const text = await propsResponse.text();
      console.log(`❌ Props error response: ${text}`);
      return;
    }

    const propLines = await propsResponse.json();
    console.log(`✅ Prop lines: ${propLines?.length || 0} records`);

    // Test join logic
    const gameResults = gameLogs
      .map(gameLog => {
        const propLine = propLines?.find(
          prop =>
            prop.player_id === gameLog.player_id &&
            prop.prop_type === gameLog.prop_type &&
            normalizeDate(prop.date) === normalizeDate(gameLog.date) &&
            prop.league === gameLog.league
        );

        if (!propLine) return null;

        return {
          player_id: gameLog.player_id,
          player_name: gameLog.player_name,
          team: gameLog.team,
          prop_type: gameLog.prop_type,
          league: gameLog.league,
          date: normalizeDate(gameLog.date),
          hit_result: gameLog.value >= propLine.line ? 1 : 0,
        };
      })
      .filter(Boolean);

    console.log(`✅ Game results: ${gameResults.length} matches found`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testQueryConstruction().then(() => {
  console.log('\n✅ Query construction test completed');
}).catch(error => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});
