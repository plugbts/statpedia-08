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

// Track new schema tables
async function trackNewTables() {
  console.log('📊 Tracking new schema tables...');
  
  const newTables = ['leagues', 'teams', 'players', 'props'];

  for (const table of newTables) {
    try {
      const query = `
        mutation trackTable($table: track_table!) {
          track_table(table: $table) {
            success
          }
        }
      `;

      const variables = {
        table: { schema: 'public', name: table }
      };

      await hasuraRequest(query, variables);
      console.log(`✅ Tracked table: ${table}`);
    } catch (error) {
      console.log(`⚠️  Table ${table} might already be tracked:`, error.message);
    }
  }
}

// Track new schema relationships
async function trackNewRelationships() {
  console.log('🔗 Tracking new schema relationships...');
  
  const relationships = [
    // Object relationships
    { table: 'teams', relationship: 'league', type: 'object', from: 'league_id', to: 'id' },
    { table: 'players', relationship: 'team', type: 'object', from: 'team_id', to: 'id' },
    { table: 'props', relationship: 'player', type: 'object', from: 'player_id', to: 'id' },
    { table: 'props', relationship: 'team', type: 'object', from: 'team_id', to: 'id' },
    
    // Array relationships
    { table: 'leagues', relationship: 'teams', type: 'array', from: 'id', to: 'league_id' },
    { table: 'teams', relationship: 'players', type: 'array', from: 'id', to: 'team_id' },
    { table: 'teams', relationship: 'props', type: 'array', from: 'id', to: 'team_id' },
    { table: 'players', relationship: 'props', type: 'array', from: 'id', to: 'player_id' }
  ];

  for (const { table, relationship, type, from, to } of relationships) {
    try {
      const query = type === 'object' ? `
        mutation trackObjectRelationship($table: track_table!, $relationship: track_object_relationship!) {
          track_object_relationship(table: $table, relationship: $relationship) {
            success
          }
        }
      ` : `
        mutation trackArrayRelationship($table: track_table!, $relationship: track_array_relationship!) {
          track_array_relationship(table: $table, relationship: $relationship) {
            success
          }
        }
      `;

      const variables = {
        table: { schema: 'public', name: table },
        relationship: {
          name: relationship,
          using: {
            foreign_key_constraint_on: type === 'object' ? to : undefined,
            foreign_key_constraint_on_column: type === 'object' ? from : undefined,
            foreign_key_constraint_on_table: type === 'array' ? { schema: 'public', name: table } : undefined
          }
        }
      };

      await hasuraRequest(query, variables);
      console.log(`✅ Tracked ${type} relationship: ${table}.${relationship}`);
    } catch (error) {
      console.log(`⚠️  Relationship ${table}.${relationship} might already exist:`, error.message);
    }
  }
}

// Set up permissions for anonymous role
async function setupPermissions() {
  console.log('🔐 Setting up permissions for anonymous role...');
  
  const tables = ['leagues', 'teams', 'players', 'props'];

  for (const table of tables) {
    try {
      const query = `
        mutation createSelectPermission($table: track_table!, $role: String!, $permission: create_select_permission!) {
          create_select_permission(table: $table, role: $role, permission: $permission) {
            success
          }
        }
      `;

      const variables = {
        table: { schema: 'public', name: table },
        role: 'anonymous',
        permission: {
          columns: '*',
          filter: {}
        }
      };

      await hasuraRequest(query, variables);
      console.log(`✅ Created select permission for ${table}`);
    } catch (error) {
      console.log(`⚠️  Permission for ${table} might already exist:`, error.message);
    }
  }
}

// Main setup function
async function setupNewSchema() {
  try {
    console.log('🚀 Setting up Hasura for new StatPedia schema...');
    console.log(`📍 Hasura Endpoint: ${HASURA_ENDPOINT}`);
    
    // Check if Hasura is accessible
    const healthCheck = await fetch(`${HASURA_ENDPOINT}/healthz`);
    if (!healthCheck.ok) {
      throw new Error('Hasura endpoint is not accessible');
    }
    console.log('✅ Hasura endpoint is healthy');

    // Track new tables
    await trackNewTables();

    // Track new relationships
    await trackNewRelationships();

    // Set up permissions
    await setupPermissions();

    console.log('\n🎉 New schema setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Visit https://graphql-engine-latest-statpedia.onrender.com/console');
    console.log('2. Go to Data tab to verify tables are tracked');
    console.log('3. Go to API tab to test GraphQL queries');
    console.log('\n💡 Example GraphQL query:');
    console.log(`
query GetLeagueAwareProps {
  props {
    id
    prop_type
    line
    odds
    player {
      name
      position
      team {
        name
        abbreviation
        logo_url
        league {
          code
          name
        }
      }
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
setupNewSchema();
