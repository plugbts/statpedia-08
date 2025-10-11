#!/usr/bin/env node

/**
 * Check the actual structure of the proplines table
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rfdrifnsfobqlzorcesn.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableStructure() {
  console.log('🔍 Checking proplines table structure...\n');

  try {
    // Try to get table info by querying information_schema
    const { data: columns, error: columnsError } = await supabase.rpc('get_table_columns', {
      table_name: 'proplines'
    });

    if (columnsError) {
      console.log('⚠️  Could not use get_table_columns function, trying direct query...');
      
      // Try a simple query to see what columns exist
      const { data: sampleData, error: sampleError } = await supabase
        .from('proplines')
        .select('*')
        .limit(1);

      if (sampleError) {
        console.error('❌ Cannot query proplines table:', sampleError.message);
      } else {
        console.log('✅ Table exists and is accessible');
        if (sampleData && sampleData.length > 0) {
          console.log('📋 Sample row columns:', Object.keys(sampleData[0]));
        } else {
          console.log('📋 Table is empty, but accessible');
        }
      }
    } else {
      console.log('✅ Table columns:', columns);
    }

    // Try to insert a simple test record to see what happens
    console.log('\n🧪 Testing simple insert...');
    const { data: insertData, error: insertError } = await supabase
      .from('proplines')
      .insert({
        player_id: 'TEST_STRUCTURE_1',
        player_name: 'Test Structure',
        team: 'TEST',
        opponent: 'OPP',
        league: 'nfl',
        season: 2025,
        date: '2025-01-10',
        prop_type: 'test_structure_prop',
        line: 100.5,
        over_odds: -110,
        under_odds: -110,
        sportsbook: 'SportsGameOdds'
      })
      .select();

    if (insertError) {
      console.error('❌ Insert error:', insertError.message);
    } else {
      console.log('✅ Simple insert works:', insertData);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

checkTableStructure().catch(console.error);