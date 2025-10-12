#!/usr/bin/env node

import { config } from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
config({ path: '.env.local' });

const HASURA_ENDPOINT = 'https://graphql-engine-latest-statpedia.onrender.com';
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

if (!HASURA_ADMIN_SECRET) {
  console.error('❌ HASURA_ADMIN_SECRET not found in environment variables');
  console.log('Please add HASURA_ADMIN_SECRET to your .env.local file');
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

// Add database source
async function addDatabaseSource() {
  console.log('🔗 Adding Neon Database as source...');
  
  const query = `
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
        database_url: {
          from_env: 'NEON_DATABASE_URL'
        },
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
    const result = await hasuraRequest(query, variables);
    console.log('✅ Database source added successfully');
    return result;
  } catch (error) {
    console.log('⚠️  Database source might already exist:', error.message);
    return null;
  }
}

// Track tables
async function trackTables() {
  console.log('📊 Tracking tables...');
  
  const tables = [
    'leagues', 'teams', 'players', 'games', 'prop_types', 'player_props',
    'player_analytics', 'player_streaks', 'team_analytics', 'prop_analytics',
    'profiles', 'promo_codes', 'promo_code_usage', 'social_posts', 'comments',
    'user_predictions', 'bet_tracking', 'friendships', 'votes', 'user_roles'
  ];

  const query = `
    mutation trackTables($tables: [track_table!]!) {
      track_table(tables: $tables) {
        success
      }
    }
  `;

  const variables = {
    tables: tables.map(table => ({
      table: { schema: 'public', name: table }
    }))
  };

  try {
    const result = await hasuraRequest(query, variables);
    console.log('✅ Tables tracked successfully');
    return result;
  } catch (error) {
    console.error('❌ Error tracking tables:', error.message);
    throw error;
  }
}

// Track relationships
async function trackRelationships() {
  console.log('🔗 Tracking relationships...');
  
  const relationships = [
    { table: 'teams', relationships: ['league'] },
    { table: 'players', relationships: ['team'] },
    { table: 'games', relationships: ['league', 'homeTeam', 'awayTeam'] },
    { table: 'player_props', relationships: ['player', 'game', 'propType'] },
    { table: 'player_analytics', relationships: ['player', 'game'] },
    { table: 'player_streaks', relationships: ['player'] },
    { table: 'social_posts', relationships: ['user'] },
    { table: 'comments', relationships: ['user', 'post'] },
    { table: 'user_predictions', relationships: ['user'] },
    { table: 'bet_tracking', relationships: ['user'] },
    { table: 'friendships', relationships: ['user', 'friend'] },
    { table: 'votes', relationships: ['user', 'post', 'comment'] }
  ];

  for (const { table, relationships: rels } of relationships) {
    for (const rel of rels) {
      try {
        const query = `
          mutation trackRelationship($table: track_table!, $relationships: [track_object_relationship!]!) {
            track_object_relationship(table: $table, relationships: $relationships) {
              success
            }
          }
        `;

        const variables = {
          table: { schema: 'public', name: table },
          relationships: [{ name: rel }]
        };

        await hasuraRequest(query, variables);
        console.log(`✅ Tracked relationship: ${table}.${rel}`);
      } catch (error) {
        console.log(`⚠️  Relationship ${table}.${rel} might already exist`);
      }
    }
  }
}

// Main setup function
async function setupHasura() {
  try {
    console.log('🚀 Setting up Hasura for StatPedia...');
    console.log(`📍 Hasura Endpoint: ${HASURA_ENDPOINT}`);
    
    // Check if Hasura is accessible
    const healthCheck = await fetch(`${HASURA_ENDPOINT}/healthz`);
    if (!healthCheck.ok) {
      throw new Error('Hasura endpoint is not accessible');
    }
    console.log('✅ Hasura endpoint is healthy');

    // Add database source
    await addDatabaseSource();

    // Track tables
    await trackTables();

    // Track relationships
    await trackRelationships();

    console.log('\n🎉 Hasura setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Visit https://graphql-engine-latest-statpedia.onrender.com/console');
    console.log('2. Go to Data tab to verify tables are tracked');
    console.log('3. Go to API tab to test GraphQL queries');
    console.log('4. Set up Row Level Security policies if needed');
    console.log('\n💡 Example GraphQL query:');
    console.log(`
query GetPlayers {
  players(where: {isActive: {_eq: true}}, limit: 10) {
    id
    firstName
    lastName
    position
    team {
      name
      abbreviation
    }
  }
}
    `);

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup
setupHasura();
