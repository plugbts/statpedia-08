#!/usr/bin/env node

/**
 * Verify Schema Migration Success
 * 
 * This script verifies that the schema alignment migration was applied successfully
 * by testing the Worker insert endpoint.
 */

const BASE_URL = 'https://statpedia-player-props.statpedia.workers.dev';

async function verifySchemaMigration() {
  console.log('🔍 Verifying Schema Migration...\n');
  
  // Test 1: Worker Insert
  console.log('1️⃣ Testing Worker Insert Endpoint...');
  try {
    const response = await fetch(`${BASE_URL}/debug-insert`);
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Worker insert test PASSED - Schema is aligned!');
      console.log('📊 Inserted data:', result.data);
      return true;
    } else {
      console.log('❌ Worker insert test FAILED');
      console.log('🔧 Error:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Insert test failed with exception:', error.message);
    return false;
  }
}

async function testBasicEndpoints() {
  console.log('\n2️⃣ Testing Basic Endpoints...');
  
  const endpoints = [
    { name: 'API', url: '/debug-api' },
    { name: 'Extraction', url: '/debug-extraction' },
    { name: 'Schema', url: '/debug-schema' }
  ];
  
  let allPassed = true;
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint.url}`);
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ ${endpoint.name} endpoint working`);
      } else {
        console.log(`❌ ${endpoint.name} endpoint failed`);
        allPassed = false;
      }
    } catch (error) {
      console.log(`❌ ${endpoint.name} endpoint error:`, error.message);
      allPassed = false;
    }
  }
  
  return allPassed;
}

async function main() {
  console.log('🚀 Schema Migration Verification\n');
  
  const insertWorking = await verifySchemaMigration();
  const endpointsWorking = await testBasicEndpoints();
  
  console.log('\n📊 VERIFICATION SUMMARY:');
  console.log(`✅ Worker Insert: ${insertWorking ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Basic Endpoints: ${endpointsWorking ? 'PASS' : 'FAIL'}`);
  
  if (insertWorking && endpointsWorking) {
    console.log('\n🎉 SCHEMA MIGRATION SUCCESSFUL!');
    console.log('🚀 The database schema is now aligned with the Worker.');
    console.log('\n📋 Next Steps:');
    console.log('1. Run the full backfill test script: node test-worker-insert-and-backfill.js');
    console.log('2. Execute backfill operations to populate analytics data');
    console.log('3. Monitor the cron job execution every 10 minutes');
  } else {
    console.log('\n⚠️  SCHEMA MIGRATION INCOMPLETE');
    console.log('Please check the errors above and ensure the migration was applied correctly.');
    console.log('\n📋 Troubleshooting:');
    console.log('1. Verify the migration SQL was executed completely');
    console.log('2. Check for any error messages in the Supabase SQL Editor');
    console.log('3. Ensure all unique constraints were created successfully');
  }
}

// Run the verification
main().catch(console.error);
