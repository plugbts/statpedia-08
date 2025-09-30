// Test database connection and apply migrations
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://rfdrifnsfobqlzorcesn.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA0ODgzNiwiZXhwIjoyMDc0NjI0ODM2fQ.YourServiceKeyHere";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const { data, error } = await supabase
      .from('posts')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Database connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Database connection successful');
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    return false;
  }
}

async function checkTables() {
  const tables = [
    'posts',
    'user_profiles', 
    'comments',
    'votes',
    'friends',
    'notifications',
    'conversations',
    'messages',
    'blocked_users'
  ];
  
  console.log('\nChecking required tables...');
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('count')
        .limit(1);
      
      if (error) {
        console.log(`❌ Table '${table}' not found: ${error.message}`);
      } else {
        console.log(`✅ Table '${table}' exists`);
      }
    } catch (err) {
      console.log(`❌ Error checking table '${table}': ${err.message}`);
    }
  }
}

async function main() {
  console.log('🔍 Database Health Check\n');
  
  const connected = await testConnection();
  if (connected) {
    await checkTables();
  }
  
  console.log('\n📋 Next steps:');
  console.log('1. If tables are missing, apply migrations to your Supabase project');
  console.log('2. Check your Supabase project dashboard for migration status');
  console.log('3. Ensure RLS policies are properly configured');
  console.log('4. Verify your service role key has proper permissions');
}

main().catch(console.error);
