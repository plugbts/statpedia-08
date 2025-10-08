#!/usr/bin/env node

/**
 * Test Fixed Query Format
 * Test the exact query format that the fixed handler uses
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://rfdrifnsfobqlzorcesn.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA0ODgzNiwiZXhwIjoyMDc0NjI0ODM2fQ.E9LQFvqVs9Z1cXoS34ov5qV3jBkbqCHPCL16GBt480g";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testFixedQuery() {
  console.log('🔍 Testing fixed query format...\n');

  try {
    // Test the exact query that the fixed handler constructs
    const league = "nfl";
    let query = "player_game_logs";
    const params = [];
    
    if (league !== "all") {
      params.push(`league=eq.${league}`);
    }
    params.push(`order=date.desc`);
    
    if (params.length > 0) {
      query += `?${params.join("&")}`;
    }
    
    console.log(`📊 Query: ${query}`);
    
    // Test using the REST API directly (like supabaseFetch does)
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
    
    const text = await response.text();
    console.log(`📊 Response text length: ${text.length}`);
    
    if (text.trim() === '') {
      console.log('❌ Empty response - this is the problem!');
    } else {
      try {
        const data = JSON.parse(text);
        console.log(`✅ Parsed data: ${Array.isArray(data) ? data.length : 'not array'} records`);
        if (Array.isArray(data) && data.length > 0) {
          console.log('📋 Sample record:', JSON.stringify(data[0], null, 2));
          
          // Test the prop lines query with the new format
          const playerIds = [...new Set(data.map(g => g.player_id))];
          const propTypes = [...new Set(data.map(g => g.prop_type))];
          const dates = [...new Set(data.map(g => g.date.split("T")[0]))];
          
          console.log(`📊 Unique players: ${playerIds.length}`);
          console.log(`📊 Unique prop types: ${propTypes.join(', ')}`);
          console.log(`📊 Unique dates: ${dates.join(', ')}`);
          
          // Test the new inFilter format
          const inFilter = (values) => `in.(${values.map(v => `"${v}"`).join(",")})`;
          const propsQuery = `proplines?player_id=${inFilter(playerIds)}&prop_type=${inFilter(propTypes)}&date=${inFilter(dates)}`;
          
          console.log(`📊 Props query: ${propsQuery}`);
          
          const propsUrl = `${supabaseUrl}/rest/v1/${propsQuery}`;
          const propsResponse = await fetch(propsUrl, {
            method: 'GET',
            headers: {
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
          });
          
          console.log(`📊 Props response status: ${propsResponse.status}`);
          const propsText = await propsResponse.text();
          console.log(`📊 Props response length: ${propsText.length}`);
          
          if (propsText.trim() === '') {
            console.log('❌ Empty props response!');
          } else {
            try {
              const propsData = JSON.parse(propsText);
              console.log(`✅ Props data: ${Array.isArray(propsData) ? propsData.length : 'not array'} records`);
              if (Array.isArray(propsData) && propsData.length > 0) {
                console.log('📋 Sample prop record:', JSON.stringify(propsData[0], null, 2));
              }
            } catch (e) {
              console.log('❌ Failed to parse props JSON:', e.message);
              console.log('📋 Raw props response:', propsText.substring(0, 200));
            }
          }
        }
      } catch (e) {
        console.log('❌ Failed to parse JSON:', e.message);
        console.log('📋 Raw response:', text.substring(0, 200));
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFixedQuery().then(() => {
  console.log('\n✅ Fixed query test completed');
}).catch(error => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});
