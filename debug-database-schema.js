#!/usr/bin/env node

/**
 * Debug Database Schema
 * 
 * This script directly queries the Supabase database to see what the actual
 * schema looks like and what constraints exist.
 */

const SUPABASE_URL = 'https://rfdrifnsfobqlzorcesn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA0ODgzNiwiZXhwIjoyMDc0NjI0ODM2fQ.E9LQFvqVs9Z1cXoS34ov5qV3jBkbqCHPCL16GBt480g';

async function checkTableSchema() {
  console.log('🔍 Checking proplines table schema...');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/proplines?limit=1&select=*`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Schema check failed:', response.status, errorText);
      return;
    }
    
    const data = await response.json();
    console.log('✅ Schema check successful');
    console.log('📊 Sample data:', JSON.stringify(data, null, 2));
    
    if (data && data.length > 0) {
      console.log('📋 Available columns:', Object.keys(data[0]));
    } else {
      console.log('📋 Table is empty, checking with information_schema...');
      await checkInformationSchema();
    }
    
  } catch (error) {
    console.error('❌ Schema check failed with exception:', error.message);
  }
}

async function checkInformationSchema() {
  console.log('\n🔍 Checking information_schema...');
  
  try {
    // Query to check table structure
    const query = `
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'proplines' 
        AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql: query })
    });
    
    if (!response.ok) {
      console.log('❌ RPC not available, trying direct query...');
      await checkConstraints();
      return;
    }
    
    const data = await response.json();
    console.log('✅ Information schema check successful');
    console.log('📊 Table structure:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('❌ Information schema check failed:', error.message);
    await checkConstraints();
  }
}

async function checkConstraints() {
  console.log('\n🔍 Checking table constraints...');
  
  try {
    // Try to insert a test row to see what happens
    const testRow = {
      player_id: "TEST_PLAYER_123",
      player_name: "Test Player",
      team: "TEST",
      opponent: "TEST2",
      season: 2025,
      date: "2025-10-08",
      prop_type: "Test Prop",
      line: 100.5,
      over_odds: -110,
      under_odds: -110,
      sportsbook: "TestBook",
      league: "nfl",
      game_id: "TEST-GAME-123",
      conflict_key: "TEST_CONFLICT_KEY_123"
    };
    
    console.log('🧪 Testing insert with:', JSON.stringify(testRow, null, 2));
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/proplines`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify([testRow])
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Test insert successful!');
      console.log('📊 Insert result:', JSON.stringify(result, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Test insert failed:', response.status);
      console.log('🔧 Error details:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Test insert failed with exception:', error.message);
  }
}

async function main() {
  console.log('🚀 Debugging Database Schema\n');
  
  await checkTableSchema();
  await checkInformationSchema();
  
  console.log('\n📋 Next Steps:');
  console.log('1. Check if the migration was applied correctly');
  console.log('2. Verify the conflict_key constraint exists');
  console.log('3. Fix the Worker\'s upsert syntax if needed');
}

main().catch(console.error);
