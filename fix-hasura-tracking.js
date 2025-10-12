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

// Helper function to make Hasura API calls
async function hasuraRequest(query, variables = {}) {
  const response = await fetch(`${HASURA_ENDPOINT}/v1/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Check current database sources
async function checkSources() {
  console.log('🔍 Checking current database sources...');
  
  const query = `
    query {
      sources {
        name
        kind
        configuration
        tables {
          table {
            schema
            name
          }
          is_tracked
        }
      }
    }
  `;

  try {
    const result = await hasuraRequest(query);
    console.log('📊 Current sources:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ Error checking sources:', error.message);
    throw error;
  }
}

// Remove and re-add database source
async function recreateDatabaseSource() {
  console.log('🔄 Recreating database source...');
  
  // First, try to remove existing source
  try {
    const removeQuery = `
      mutation removeSource($name: String!) {
        removeSource(name: $name) {
          success
        }
      }
    `;
    
    await hasuraRequest(removeQuery, { name: 'default' });
    console.log('✅ Removed existing source');
  } catch (error) {
    console.log('⚠️  Source might not exist yet:', error.message);
  }

  // Add database source with correct configuration
  const addQuery = `
    mutation addSource($name: String!, $configuration: PgSourceConfiguration!) {
      addSource(name: $name, configuration: $configuration) {
        name
      }
    }
  `;

  const variables = {
    name: 'default',
    configuration: {
      connection_info: {
        database_url: process.env.NEON_DATABASE_URL,
        isolation_level: 'read-committed',
        pool_settings: {
          connection_lifetime: 600,
          idle_timeout: 180,
          max_connections: 50,
          retries: 1
        }
      }
    }
  };

  try {
    const result = await hasuraRequest(addQuery, variables);
    console.log('✅ Database source added successfully');
    return result;
  } catch (error) {
    console.error('❌ Error adding database source:', error.message);
    throw error;
  }
}

// Track all tables manually
async function trackAllTables() {
  console.log('📊 Tracking all tables manually...');
  
  const tables = [
    'leagues', 'teams', 'players', 'games', 'prop_types', 'player_props',
    'player_analytics', 'player_streaks', 'team_analytics', 'prop_analytics',
    'profiles', 'promo_codes', 'promo_code_usage', 'social_posts', 'comments',
    'user_predictions', 'bet_tracking', 'friendships', 'votes', 'user_roles'
  ];

  for (const table of tables) {
    try {
      const query = `
        mutation trackTable($table: track_table!) {
          track_table(tables: [$table]) {
            success
          }
        }
      `;

      const variables = {
        table: {
          table: { schema: 'public', name: table }
        }
      };

      const result = await hasuraRequest(query, variables);
      console.log(`✅ Tracked table: ${table}`);
    } catch (error) {
      console.log(`⚠️  Table ${table} might already be tracked or error:`, error.message);
    }
  }
}

// Test GraphQL query
async function testGraphQLQuery() {
  console.log('🧪 Testing GraphQL query...');
  
  const query = `
    query {
      leagues {
        id
        name
        abbreviation
        sport
      }
    }
  `;

  try {
    const result = await hasuraRequest(query);
    console.log('✅ GraphQL query successful:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ GraphQL query failed:', error.message);
    throw error;
  }
}

// Main fix function
async function fixHasuraTracking() {
  try {
    console.log('🔧 Fixing Hasura table tracking...');
    console.log(`📍 Hasura Endpoint: ${HASURA_ENDPOINT}`);
    
    // Check current sources
    await checkSources();
    
    // Recreate database source
    await recreateDatabaseSource();
    
    // Wait a moment for the source to be ready
    console.log('⏳ Waiting for database source to be ready...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Track all tables
    await trackAllTables();
    
    // Test the GraphQL query
    await testGraphQLQuery();
    
    console.log('\n🎉 Hasura tracking fixed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Visit https://graphql-engine-latest-statpedia.onrender.com/console');
    console.log('2. Go to Data tab to verify tables are tracked');
    console.log('3. Go to API tab to test GraphQL queries');

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    process.exit(1);
  }
}

// Run fix
fixHasuraTracking();
