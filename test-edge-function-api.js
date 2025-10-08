#!/usr/bin/env node

/**
 * Test Edge Function API Key Issue
 * 
 * This script tests if the Edge Function has access to the API key
 */

const SUPABASE_URL = 'https://rfdrifnsfobqlzorcesn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI';

async function testEdgeFunctionAPI() {
  console.log('🔑 Testing Edge Function API Access');
  console.log('===================================\n');

  try {
    // Test 1: Check if the function can access environment variables
    console.log('🧪 Test 1: Environment variable access test');
    const envTestResponse = await fetch(`${SUPABASE_URL}/functions/v1/prop-ingestion?action=health`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      }
    });

    const envTestData = await envTestResponse.json();
    console.log('   Environment test result:', envTestData);

    // Test 2: Try a simple API call through the Edge Function
    console.log('\n🧪 Test 2: API connectivity test');
    const apiTestResponse = await fetch(`${SUPABASE_URL}/functions/v1/prop-ingestion?action=status`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      }
    });

    const apiTestData = await apiTestResponse.json();
    console.log('   API connectivity result:', apiTestData);

    // Test 3: Try a minimal ingestion with debug
    console.log('\n🧪 Test 3: Minimal ingestion test');
    const ingestResponse = await fetch(`${SUPABASE_URL}/functions/v1/prop-ingestion?action=ingest&league=NFL&season=2025&week=6`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      }
    });

    const ingestData = await ingestResponse.json();
    console.log('   Ingestion test result:', ingestData);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testEdgeFunctionAPI().catch(console.error);
