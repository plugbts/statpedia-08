#!/usr/bin/env node

import { config } from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
config({ path: '.env.local' });

const HASURA_ENDPOINT = 'https://graphql-engine-latest-statpedia.onrender.com';
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

if (!HASURA_ADMIN_SECRET) {
  console.error('❌ HASURA_ADMIN_SECRET not found in environment variables');
  process.exit(1);
}

// Helper function to make Hasura metadata API calls
async function hasuraMetadataRequest(payload) {
  const response = await fetch(`${HASURA_ENDPOINT}/v1/metadata`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
  }

  return response.json();
}

// Check current metadata
async function checkMetadata() {
  console.log('🔍 Checking current metadata...');
  
  try {
    const result = await hasuraMetadataRequest({ type: 'export_metadata', args: {} });
    console.log('📊 Current metadata:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ Error checking metadata:', error.message);
    throw error;
  }
}

// Force track all tables using metadata API
async function forceTrackTables() {
  console.log('📊 Force tracking all tables...');
  
  const tables = [
    'leagues', 'teams', 'players', 'games', 'prop_types', 'player_props',
    'player_analytics', 'player_streaks', 'team_analytics', 'prop_analytics',
    'profiles', 'promo_codes', 'promo_code_usage', 'social_posts', 'comments',
    'user_predictions', 'bet_tracking', 'friendships', 'votes', 'user_roles'
  ];

  const trackTablePayload = {
    type: 'pg_track_table',
    args: {
      source: 'default',
      table: {
        schema: 'public',
        name: ''
      }
    }
  };

  for (const table of tables) {
    try {
      trackTablePayload.args.table.name = table;
      const result = await hasuraMetadataRequest(trackTablePayload);
      console.log(`✅ Tracked table: ${table}`);
    } catch (error) {
      console.log(`⚠️  Table ${table} error:`, error.message);
    }
  }
}

// Set table permissions
async function setTablePermissions() {
  console.log('🔐 Setting table permissions...');
  
  const tables = [
    'leagues', 'teams', 'players', 'games', 'prop_types', 'player_props',
    'player_analytics', 'player_streaks', 'team_analytics', 'prop_analytics',
    'profiles', 'promo_codes', 'promo_code_usage', 'social_posts', 'comments',
    'user_predictions', 'bet_tracking', 'friendships', 'votes', 'user_roles'
  ];

  for (const table of tables) {
    try {
      // Allow select for anonymous role
      const selectPermissionPayload = {
        type: 'pg_create_select_permission',
        args: {
          source: 'default',
          table: { schema: 'public', name: table },
          role: 'anonymous',
          permission: {
            columns: '*',
            filter: {}
          }
        }
      };

      await hasuraMetadataRequest(selectPermissionPayload);
      console.log(`✅ Set select permission for table: ${table}`);
    } catch (error) {
      console.log(`⚠️  Permission error for ${table}:`, error.message);
    }
  }
}

// Reload metadata
async function reloadMetadata() {
  console.log('🔄 Reloading metadata...');
  
  try {
    const result = await hasuraMetadataRequest({ type: 'reload_metadata', args: {} });
    console.log('✅ Metadata reloaded:', result);
    return result;
  } catch (error) {
    console.error('❌ Error reloading metadata:', error.message);
    throw error;
  }
}

// Test GraphQL query
async function testGraphQLQuery() {
  console.log('🧪 Testing GraphQL query...');
  
  const response = await fetch(`${HASURA_ENDPOINT}/v1/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
    },
    body: JSON.stringify({
      query: `
        query {
          leagues {
            id
            name
            abbreviation
            sport
          }
        }
      `
    }),
  });

  const result = await response.json();
  console.log('✅ GraphQL query result:', JSON.stringify(result, null, 2));
  return result;
}

// Main function
async function forceTrackAllTables() {
  try {
    console.log('🔧 Force tracking all tables in Hasura...');
    console.log(`📍 Hasura Endpoint: ${HASURA_ENDPOINT}`);
    
    // Check current metadata
    await checkMetadata();
    
    // Force track all tables
    await forceTrackTables();
    
    // Set permissions
    await setTablePermissions();
    
    // Reload metadata
    await reloadMetadata();
    
    // Wait for metadata to be processed
    console.log('⏳ Waiting for metadata to be processed...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test GraphQL query
    await testGraphQLQuery();
    
    console.log('\n🎉 All tables force tracked successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Visit https://graphql-engine-latest-statpedia.onrender.com/console');
    console.log('2. Go to Data tab to verify tables are tracked');
    console.log('3. Go to API tab to test GraphQL queries');

  } catch (error) {
    console.error('❌ Force tracking failed:', error.message);
    process.exit(1);
  }
}

// Run the force tracking
forceTrackAllTables();
