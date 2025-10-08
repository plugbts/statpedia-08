#!/usr/bin/env node

/**
 * Test Worker Insert and Full Backfill
 * 
 * This script tests the Worker's debug-insert endpoint and then runs
 * a comprehensive backfill to populate analytics with historical data.
 */

const BASE_URL = 'https://statpedia-player-props.statpedia.workers.dev';

async function testWorkerInsert() {
  console.log('🔍 Testing Worker Insert Endpoint...');
  
  try {
    const response = await fetch(`${BASE_URL}/debug-insert`);
    const result = await response.json();
    
    console.log('📊 Insert Test Result:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ Worker insert test PASSED - Schema is aligned!');
      return true;
    } else {
      console.log('❌ Worker insert test FAILED - Schema needs alignment');
      console.log('🔧 Error:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Insert test failed with exception:', error.message);
    return false;
  }
}

async function testSchemaEndpoint() {
  console.log('\n🔍 Testing Schema Endpoint...');
  
  try {
    const response = await fetch(`${BASE_URL}/debug-schema`);
    const result = await response.json();
    
    console.log('📊 Schema Test Result:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ Schema endpoint working');
      return true;
    } else {
      console.log('❌ Schema endpoint failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Schema test failed with exception:', error.message);
    return false;
  }
}

async function runRecentBackfill() {
  console.log('\n🔄 Running Recent Seasons Backfill (90 days)...');
  
  try {
    const response = await fetch(`${BASE_URL}/backfill-recent?days=90`);
    const result = await response.json();
    
    console.log('📊 Recent Backfill Result:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log(`✅ Recent backfill completed successfully!`);
      console.log(`📈 Total Props: ${result.totalProps}`);
      console.log(`📈 Total Game Logs: ${result.totalGameLogs}`);
      console.log(`📈 Total Errors: ${result.totalErrors}`);
      return true;
    } else {
      console.log('❌ Recent backfill failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Recent backfill failed with exception:', error.message);
    return false;
  }
}

async function runLeagueSpecificBackfill() {
  console.log('\n🔄 Running League-Specific Backfill (NFL, 30 days)...');
  
  try {
    const response = await fetch(`${BASE_URL}/backfill-league/NFL?days=30`);
    const result = await response.json();
    
    console.log('📊 League-Specific Backfill Result:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log(`✅ NFL backfill completed successfully!`);
      console.log(`📈 Total Props: ${result.totalProps}`);
      console.log(`📈 Total Game Logs: ${result.totalGameLogs}`);
      console.log(`📈 Total Errors: ${result.totalErrors}`);
      return true;
    } else {
      console.log('❌ NFL backfill failed');
      return false;
    }
  } catch (error) {
    console.error('❌ NFL backfill failed with exception:', error.message);
    return false;
  }
}

async function testAPIEndpoint() {
  console.log('\n🔍 Testing API Endpoint...');
  
  try {
    const response = await fetch(`${BASE_URL}/debug-api`);
    const result = await response.json();
    
    console.log('📊 API Test Result:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success && result.eventsCount > 0) {
      console.log(`✅ API endpoint working - Found ${result.eventsCount} events`);
      return true;
    } else {
      console.log('❌ API endpoint not returning events');
      return false;
    }
  } catch (error) {
    console.error('❌ API test failed with exception:', error.message);
    return false;
  }
}

async function testExtractionEndpoint() {
  console.log('\n🔍 Testing Extraction Endpoint...');
  
  try {
    const response = await fetch(`${BASE_URL}/debug-extraction`);
    const result = await response.json();
    
    console.log('📊 Extraction Test Result:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success && result.extractedPropsCount > 0) {
      console.log(`✅ Extraction working - Found ${result.extractedPropsCount} props`);
      return true;
    } else {
      console.log('❌ Extraction not working');
      return false;
    }
  } catch (error) {
    console.error('❌ Extraction test failed with exception:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Worker Insert and Backfill Tests...\n');
  
  // Test 1: API Integration
  const apiWorking = await testAPIEndpoint();
  
  // Test 2: Data Extraction
  const extractionWorking = await testExtractionEndpoint();
  
  // Test 3: Schema Endpoint
  const schemaWorking = await testSchemaEndpoint();
  
  // Test 4: Worker Insert
  const insertWorking = await testWorkerInsert();
  
  if (!insertWorking) {
    console.log('\n⚠️  SCHEMA ALIGNMENT REQUIRED');
    console.log('The Worker insert failed because the database schema is not aligned.');
    console.log('Please apply the schema-alignment-migration.sql in Supabase first.');
    console.log('\n📋 Next Steps:');
    console.log('1. Open Supabase SQL Editor');
    console.log('2. Copy and paste the contents of schema-alignment-migration.sql');
    console.log('3. Run the migration');
    console.log('4. Re-run this test script');
    return;
  }
  
  // Test 5: Recent Backfill
  console.log('\n🔄 Running Recent Backfill Tests...');
  const recentBackfillWorking = await runRecentBackfill();
  
  // Test 6: League-Specific Backfill
  console.log('\n🔄 Running League-Specific Backfill Tests...');
  const leagueBackfillWorking = await runLeagueSpecificBackfill();
  
  // Summary
  console.log('\n📊 TEST SUMMARY:');
  console.log(`✅ API Integration: ${apiWorking ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Data Extraction: ${extractionWorking ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Schema Endpoint: ${schemaWorking ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Worker Insert: ${insertWorking ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Recent Backfill: ${recentBackfillWorking ? 'PASS' : 'FAIL'}`);
  console.log(`✅ League Backfill: ${leagueBackfillWorking ? 'PASS' : 'FAIL'}`);
  
  const allTestsPassed = apiWorking && extractionWorking && schemaWorking && insertWorking && recentBackfillWorking && leagueBackfillWorking;
  
  if (allTestsPassed) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('🚀 The multi-league, multi-season backfill system is fully operational!');
    console.log('\n📈 Next Steps:');
    console.log('1. Run full historical backfill for all leagues and seasons');
    console.log('2. Verify analytics calculations with populated data');
    console.log('3. Monitor cron job execution every 10 minutes');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED');
    console.log('Please check the errors above and fix them before proceeding.');
  }
}

// Run the tests
main().catch(console.error);
