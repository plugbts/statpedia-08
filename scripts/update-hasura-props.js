#!/usr/bin/env node

/**
 * Update Hasura to track props table with relationships
 * 
 * This script ensures our props table is properly tracked
 * and has the right relationships for GraphQL queries.
 */

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

// Track props table
async function trackPropsTable() {
  console.log('📊 Tracking props table...');
  
  try {
    const query = `
      mutation trackPropsTable {
        track_table(table: { schema: "public", name: "props" }) {
          success
        }
      }
    `;

    await hasuraRequest(query);
    console.log('✅ Props table tracked successfully');
  } catch (error) {
    console.log('⚠️  Props table might already be tracked:', error.message);
  }
}

// Add relationships for props table
async function addPropsRelationships() {
  console.log('🔗 Adding props relationships...');
  
  const relationships = [
    {
      name: 'player',
      type: 'object',
      using: {
        foreign_key_constraint_on_column: 'player_id'
      }
    },
    {
      name: 'team',
      type: 'object', 
      using: {
        foreign_key_constraint_on_column: 'team_id'
      }
    }
  ];

  for (const rel of relationships) {
    try {
      const query = `
        mutation addPropsRelationship($relationship: track_object_relationship!) {
          track_object_relationship(
            table: { schema: "public", name: "props" },
            relationship: $relationship
          ) {
            success
          }
        }
      `;

      await hasuraRequest(query, {
        relationship: rel
      });
      
      console.log(`✅ Added ${rel.type} relationship: props.${rel.name}`);
    } catch (error) {
      console.log(`⚠️  Relationship props.${rel.name} might already exist:`, error.message);
    }
  }
}

// Add array relationships to players and teams tables
async function addArrayRelationships() {
  console.log('🔗 Adding array relationships...');
  
  const arrayRelationships = [
    {
      table: 'players',
      relationship: {
        name: 'props',
        using: {
          foreign_key_constraint_on_table: { schema: 'public', name: 'props' }
        }
      }
    },
    {
      table: 'teams', 
      relationship: {
        name: 'props',
        using: {
          foreign_key_constraint_on_table: { schema: 'public', name: 'props' }
        }
      }
    }
  ];

  for (const { table, relationship } of arrayRelationships) {
    try {
      const query = `
        mutation addArrayRelationship($relationship: track_array_relationship!) {
          track_array_relationship(
            table: { schema: "public", name: "${table}" },
            relationship: $relationship
          ) {
            success
          }
        }
      `;

      await hasuraRequest(query, {
        relationship
      });
      
      console.log(`✅ Added array relationship: ${table}.${relationship.name}`);
    } catch (error) {
      console.log(`⚠️  Array relationship ${table}.${relationship.name} might already exist:`, error.message);
    }
  }
}

// Set up permissions for props table
async function setupPropsPermissions() {
  console.log('🔐 Setting up props permissions...');
  
  try {
    const query = `
      mutation createPropsSelectPermission {
        create_select_permission(
          table: { schema: "public", name: "props" },
          role: "anonymous",
          permission: {
            columns: "*",
            filter: {}
          }
        ) {
          success
        }
      }
    `;

    await hasuraRequest(query);
    console.log('✅ Created select permission for props table');
  } catch (error) {
    console.log('⚠️  Props permission might already exist:', error.message);
  }
}

// Test the GraphQL API
async function testGraphQLAPI() {
  console.log('🧪 Testing GraphQL API...');
  
  try {
    const query = `
      query TestPropsAPI {
        props(limit: 5) {
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
    `;

    const result = await hasuraRequest(query);
    
    if (result.errors) {
      console.error('❌ GraphQL test failed:', result.errors);
      return false;
    }
    
    const propsCount = result.data?.props?.length || 0;
    console.log(`✅ GraphQL test passed! Found ${propsCount} props`);
    
    if (propsCount > 0) {
      const firstProp = result.data.props[0];
      console.log(`📊 Sample prop: ${firstProp.player.name} - ${firstProp.prop_type} ${firstProp.line}`);
      console.log(`🏠 Team: ${firstProp.player.team.abbreviation} (${firstProp.player.team.league.code})`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ GraphQL test failed:', error.message);
    return false;
  }
}

// Main function
async function main() {
  try {
    console.log('🚀 Updating Hasura for props table...');
    
    // Check if Hasura is accessible
    const healthCheck = await fetch(`${HASURA_ENDPOINT}/healthz`);
    if (!healthCheck.ok) {
      throw new Error('Hasura endpoint is not accessible');
    }
    console.log('✅ Hasura endpoint is healthy');

    // Track props table
    await trackPropsTable();

    // Add relationships
    await addPropsRelationships();
    await addArrayRelationships();

    // Set up permissions
    await setupPropsPermissions();

    // Test the API
    const testPassed = await testGraphQLAPI();

    console.log('\n🎉 Hasura update completed!');
    
    if (testPassed) {
      console.log('\n✅ Your props table is now ready for GraphQL queries!');
      console.log('\n📋 Next steps:');
      console.log('1. Run prop ingestion: npm run ingest:props nfl');
      console.log('2. Test in Hasura Console: https://graphql-engine-latest-statpedia.onrender.com/console');
      console.log('3. Update your frontend to use the new props data');
    } else {
      console.log('\n⚠️  GraphQL test failed - check the console for errors');
    }

  } catch (error) {
    console.error('❌ Update failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
