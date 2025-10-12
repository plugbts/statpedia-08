#!/usr/bin/env node

/**
 * Hasura Configuration Script for Upcoming Props
 * 
 * This script sets up Hasura to track the props table and configure
 * relationships for the upcoming props ingestion system.
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT || 'https://graphql-engine-latest-statpedia.onrender.com/v1/graphql';
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

if (!HASURA_ADMIN_SECRET) {
  console.error('❌ HASURA_ADMIN_SECRET not found in .env.local');
  process.exit(1);
}

async function makeRequest(query, variables = {}) {
  try {
    const response = await fetch(HASURA_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hasura-Admin-Secret': HASURA_ADMIN_SECRET,
      },
      body: JSON.stringify({ query, variables }),
    });

    const result = await response.json();
    
    if (result.errors) {
      console.error('❌ GraphQL Error:', JSON.stringify(result.errors, null, 2));
      return null;
    }
    
    return result.data;
  } catch (error) {
    console.error('❌ Request Error:', error.message);
    return null;
  }
}

async function setupPropsTable() {
  console.log('🎯 Setting up props table in Hasura...');
  
  // Track the props table
  const trackPropsQuery = `
    mutation {
      track_table(
        args: {
          source: "default"
          table: { schema: "public", name: "props" }
        }
      ) {
        table {
          name
          schema
        }
      }
    }
  `;
  
  const result = await makeRequest(trackPropsQuery);
  if (result) {
    console.log('✅ Props table tracked successfully');
  }
}

async function setupPropsRelationships() {
  console.log('🔗 Setting up props table relationships...');
  
  // Object relationship: props -> players
  const playerRelQuery = `
    mutation {
      create_object_relationship(
        table_name: "props"
        name: "player"
        source: "default"
        using: {
          foreign_key_constraint_on: "player_id"
        }
      ) {
        message
      }
    }
  `;
  
  await makeRequest(playerRelQuery);
  console.log('✅ Props -> Player relationship created');
  
  // Object relationship: props -> teams
  const teamRelQuery = `
    mutation {
      create_object_relationship(
        table_name: "props"
        name: "team"
        source: "default"
        using: {
          foreign_key_constraint_on: "team_id"
        }
      ) {
        message
      }
    }
  `;
  
  await makeRequest(teamRelQuery);
  console.log('✅ Props -> Team relationship created');
  
  // Array relationship: players -> props
  const playerPropsQuery = `
    mutation {
      create_array_relationship(
        table_name: "players"
        name: "props"
        source: "default"
        using: {
          foreign_key_constraint_on: {
            table: { schema: "public", name: "props" }
            column: "player_id"
          }
        }
      ) {
        message
      }
    }
  `;
  
  await makeRequest(playerPropsQuery);
  console.log('✅ Player -> Props array relationship created');
  
  // Array relationship: teams -> props
  const teamPropsQuery = `
    mutation {
      create_array_relationship(
        table_name: "teams"
        name: "props"
        source: "default"
        using: {
          foreign_key_constraint_on: {
            table: { schema: "public", name: "props" }
            column: "team_id"
          }
        }
      ) {
        message
      }
    }
  `;
  
  await makeRequest(teamPropsQuery);
  console.log('✅ Team -> Props array relationship created');
}

async function setupPropsPermissions() {
  console.log('🔐 Setting up props table permissions...');
  
  // Allow all operations on props table
  const permissionsQuery = `
    mutation {
      create_select_permission(
        table_name: "props"
        role: "user"
        source: "default"
        permission: {
          columns: "*"
          filter: {}
        }
      ) {
        message
      }
    }
  `;
  
  await makeRequest(permissionsQuery);
  console.log('✅ Props table permissions created');
}

async function main() {
  console.log('🚀 Setting up Hasura for upcoming props...');
  console.log(`📍 Hasura endpoint: ${HASURA_ENDPOINT}`);
  
  try {
    await setupPropsTable();
    await setupPropsRelationships();
    await setupPropsPermissions();
    
    console.log('\n🎉 Hasura setup complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Verify relationships in Hasura Console');
    console.log('2. Test GraphQL queries for upcoming props');
    console.log('3. Update frontend to use new data structure');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { setupPropsTable, setupPropsRelationships, setupPropsPermissions };
