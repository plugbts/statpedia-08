#!/usr/bin/env node

// Debug database to frontend mismatch
// Check if data exists in DB and what the frontend query structure should be

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rfdrifnsfobqlzorcesn.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA0ODgzNiwiZXhwIjoyMDc0NjI0ODM2fQ.E9LQFvqVs9Z1cXoS34ov5qV3jBkbqCHPCL16GBt480g';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🔍 Debugging Database → Frontend Mismatch');
console.log('==========================================\n');

async function checkDatabaseTables() {
  console.log('📊 Step 1: Check Available Tables...');
  
  try {
    // Try to query different table names that might exist
    const tableNames = [
      'proplines',
      'player_props', 
      'player_props_fixed',
      'player_game_logs',
      'player_props_with_analytics'
    ];
    
    for (const tableName of tableNames) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(3);
        
        if (!error && data) {
          console.log(`✅ Table '${tableName}' exists with ${data.length} sample rows`);
          if (data.length > 0) {
            console.log(`   Sample row keys: ${Object.keys(data[0]).join(', ')}`);
            console.log(`   Sample data:`, JSON.stringify(data[0], null, 2));
          }
        } else {
          console.log(`❌ Table '${tableName}' error: ${error?.message || 'No data'}`);
        }
      } catch (err) {
        console.log(`❌ Table '${tableName}' not accessible: ${err.message}`);
      }
    }
    
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
  }
  
  console.log('');
}

async function checkProplinesData() {
  console.log('📊 Step 2: Check Proplines Data (Most Likely Table)...');
  
  try {
    // Check if proplines table has data
    const { data, error } = await supabase
      .from('proplines')
      .select('*')
      .limit(5);
    
    if (error) {
      console.log('❌ Proplines query error:', error.message);
      return;
    }
    
    console.log(`📈 Proplines table: ${data?.length || 0} sample rows`);
    
    if (data && data.length > 0) {
      console.log('✅ Proplines has data! Sample row:');
      console.log(JSON.stringify(data[0], null, 2));
      
      // Check for UNK values
      const unkCount = data.filter(row => 
        row.team_abbr === 'UNK' || row.opponent_abbr === 'UNK' ||
        row.team === 'UNK' || row.opponent === 'UNK'
      ).length;
      
      console.log(`\n📊 UNK Analysis: ${unkCount}/${data.length} rows have UNK values`);
      
      if (unkCount === 0) {
        console.log('✅ Perfect! No UNK values in proplines data');
      } else {
        console.log('⚠️  Some UNK values found - team enrichment may need adjustment');
      }
      
    } else {
      console.log('❌ Proplines table is empty - worker may not be persisting data');
    }
    
  } catch (error) {
    console.log('❌ Proplines check failed:', error.message);
  }
  
  console.log('');
}

async function testFrontendQueryFilters() {
  console.log('📊 Step 3: Test Frontend Query Filters...');
  
  try {
    // Test common frontend filter patterns
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    console.log(`🔍 Testing filters for today: ${today}`);
    
    // Test 1: Basic query (no filters)
    console.log('\n1. Basic query (no filters):');
    const { data: basicData, error: basicError } = await supabase
      .from('proplines')
      .select('*')
      .limit(3);
    
    if (basicError) {
      console.log('   ❌ Basic query failed:', basicError.message);
    } else {
      console.log(`   ✅ Basic query: ${basicData?.length || 0} rows`);
    }
    
    // Test 2: NFL league filter (uppercase)
    console.log('\n2. NFL league filter (uppercase):');
    const { data: nflUpperData, error: nflUpperError } = await supabase
      .from('proplines')
      .select('*')
      .eq('league', 'NFL')
      .limit(3);
    
    if (nflUpperError) {
      console.log('   ❌ NFL uppercase query failed:', nflUpperError.message);
    } else {
      console.log(`   ✅ NFL uppercase: ${nflUpperData?.length || 0} rows`);
    }
    
    // Test 3: NFL league filter (lowercase)
    console.log('\n3. NFL league filter (lowercase):');
    const { data: nflLowerData, error: nflLowerError } = await supabase
      .from('proplines')
      .select('*')
      .eq('league', 'nfl')
      .limit(3);
    
    if (nflLowerError) {
      console.log('   ❌ NFL lowercase query failed:', nflLowerError.message);
    } else {
      console.log(`   ✅ NFL lowercase: ${nflLowerData?.length || 0} rows`);
    }
    
    // Test 4: Season filter (string)
    console.log('\n4. Season filter (string "2025"):');
    const { data: seasonStrData, error: seasonStrError } = await supabase
      .from('proplines')
      .select('*')
      .eq('season', '2025')
      .limit(3);
    
    if (seasonStrError) {
      console.log('   ❌ Season string query failed:', seasonStrError.message);
    } else {
      console.log(`   ✅ Season string: ${seasonStrData?.length || 0} rows`);
    }
    
    // Test 5: Season filter (number)
    console.log('\n5. Season filter (number 2025):');
    const { data: seasonNumData, error: seasonNumError } = await supabase
      .from('proplines')
      .select('*')
      .eq('season', 2025)
      .limit(3);
    
    if (seasonNumError) {
      console.log('   ❌ Season number query failed:', seasonNumError.message);
    } else {
      console.log(`   ✅ Season number: ${seasonNumData?.length || 0} rows`);
    }
    
    // Test 6: Date filter
    console.log('\n6. Date filter (today):');
    const { data: dateData, error: dateError } = await supabase
      .from('proplines')
      .select('*')
      .eq('date', today)
      .limit(3);
    
    if (dateError) {
      console.log('   ❌ Date query failed:', dateError.message);
    } else {
      console.log(`   ✅ Date filter: ${dateData?.length || 0} rows`);
    }
    
    // Test 7: Combined filters (most likely frontend query)
    console.log('\n7. Combined filters (league=nfl, season=2025):');
    const { data: combinedData, error: combinedError } = await supabase
      .from('proplines')
      .select('*')
      .eq('league', 'nfl')
      .eq('season', '2025')
      .limit(3);
    
    if (combinedError) {
      console.log('   ❌ Combined query failed:', combinedError.message);
    } else {
      console.log(`   ✅ Combined filters: ${combinedData?.length || 0} rows`);
    }
    
  } catch (error) {
    console.log('❌ Filter testing failed:', error.message);
  }
  
  console.log('');
}

async function checkDataTypesAndFormats() {
  console.log('📊 Step 4: Check Data Types and Formats...');
  
  try {
    const { data, error } = await supabase
      .from('proplines')
      .select('league, season, date, player_name, team_abbr, opponent_abbr')
      .limit(5);
    
    if (error || !data || data.length === 0) {
      console.log('❌ No data to analyze types');
      return;
    }
    
    console.log('📋 Data Type Analysis:');
    data.forEach((row, index) => {
      console.log(`\nRow ${index + 1}:`);
      console.log(`  league: "${row.league}" (type: ${typeof row.league})`);
      console.log(`  season: "${row.season}" (type: ${typeof row.season})`);
      console.log(`  date: "${row.date}" (type: ${typeof row.date})`);
      console.log(`  player_name: "${row.player_name}" (type: ${typeof row.player_name})`);
      console.log(`  team_abbr: "${row.team_abbr}" (type: ${typeof row.team_abbr})`);
      console.log(`  opponent_abbr: "${row.opponent_abbr}" (type: ${typeof row.opponent_abbr})`);
    });
    
    // Check for potential mismatches
    const leagues = [...new Set(data.map(row => row.league))];
    const seasons = [...new Set(data.map(row => row.season))];
    const dates = [...new Set(data.map(row => row.date))];
    
    console.log('\n📊 Unique Values:');
    console.log(`  leagues: ${leagues.join(', ')}`);
    console.log(`  seasons: ${seasons.join(', ')}`);
    console.log(`  dates: ${dates.slice(0, 3).join(', ')}${dates.length > 3 ? '...' : ''}`);
    
  } catch (error) {
    console.log('❌ Data type analysis failed:', error.message);
  }
  
  console.log('');
}

async function generateFrontendQueryRecommendations() {
  console.log('📋 Frontend Query Recommendations');
  console.log('==================================');
  console.log('');
  console.log('🎯 Based on the analysis above, here are the likely frontend query fixes:');
  console.log('');
  console.log('1. **League Filter**:');
  console.log('   - Check if frontend uses "NFL" vs "nfl"');
  console.log('   - Try both uppercase and lowercase in your query');
  console.log('');
  console.log('2. **Season Filter**:');
  console.log('   - Check if frontend uses string "2025" vs number 2025');
  console.log('   - Verify season data type in database');
  console.log('');
  console.log('3. **Date Filter**:');
  console.log('   - Check date format (YYYY-MM-DD vs MM/DD/YYYY)');
  console.log('   - Verify timezone handling');
  console.log('');
  console.log('🔧 Test These Queries in Your Frontend Console:');
  console.log('');
  console.log('```javascript');
  console.log('// Test 1: Basic query');
  console.log('const { data, error } = await supabase');
  console.log('  .from("proplines")');
  console.log('  .select("*")');
  console.log('  .limit(5);');
  console.log('console.log("Basic query:", data, error);');
  console.log('');
  console.log('// Test 2: With league filter');
  console.log('const { data, error } = await supabase');
  console.log('  .from("proplines")');
  console.log('  .select("*")');
  console.log('  .eq("league", "nfl")  // try both "nfl" and "NFL"');
  console.log('  .limit(5);');
  console.log('console.log("League filter:", data, error);');
  console.log('');
  console.log('// Test 3: With season filter');
  console.log('const { data, error } = await supabase');
  console.log('  .from("proplines")');
  console.log('  .select("*")');
  console.log('  .eq("season", "2025")  // try both "2025" and 2025');
  console.log('  .limit(5);');
  console.log('console.log("Season filter:", data, error);');
  console.log('```');
  console.log('');
}

// Main execution
async function main() {
  await checkDatabaseTables();
  await checkProplinesData();
  await testFrontendQueryFilters();
  await checkDataTypesAndFormats();
  await generateFrontendQueryRecommendations();
  
  console.log('🎉 Database → Frontend Mismatch Analysis Complete!');
  console.log('');
  console.log('💡 Next Steps:');
  console.log('   1. Check the query results above');
  console.log('   2. Identify which filter combination returns data');
  console.log('   3. Update your frontend query to match the working pattern');
  console.log('   4. Test the Player Props tab again');
}

main().catch(console.error);
