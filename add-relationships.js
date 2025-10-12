#!/usr/bin/env node

import { config } from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
config({ path: '.env.local' });

const HASURA_ENDPOINT = 'https://graphql-engine-latest-statpedia.onrender.com';
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

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

// Add object relationships
async function addObjectRelationships() {
  console.log('🔗 Adding object relationships...');
  
  const relationships = [
    // Teams -> Leagues
    {
      type: 'pg_create_object_relationship',
      args: {
        source: 'default',
        table: { schema: 'public', name: 'teams' },
        name: 'league',
        using: {
          foreign_key_constraint_on: 'league_id'
        }
      }
    },
    // Players -> Teams
    {
      type: 'pg_create_object_relationship',
      args: {
        source: 'default',
        table: { schema: 'public', name: 'players' },
        name: 'team',
        using: {
          foreign_key_constraint_on: 'team_id'
        }
      }
    },
    // Games -> Leagues
    {
      type: 'pg_create_object_relationship',
      args: {
        source: 'default',
        table: { schema: 'public', name: 'games' },
        name: 'league',
        using: {
          foreign_key_constraint_on: 'league_id'
        }
      }
    },
    // Games -> Teams (Home)
    {
      type: 'pg_create_object_relationship',
      args: {
        source: 'default',
        table: { schema: 'public', name: 'games' },
        name: 'homeTeam',
        using: {
          foreign_key_constraint_on: 'home_team_id'
        }
      }
    },
    // Games -> Teams (Away)
    {
      type: 'pg_create_object_relationship',
      args: {
        source: 'default',
        table: { schema: 'public', name: 'games' },
        name: 'awayTeam',
        using: {
          foreign_key_constraint_on: 'away_team_id'
        }
      }
    },
    // Player Props -> Players
    {
      type: 'pg_create_object_relationship',
      args: {
        source: 'default',
        table: { schema: 'public', name: 'player_props' },
        name: 'player',
        using: {
          foreign_key_constraint_on: 'player_id'
        }
      }
    },
    // Player Props -> Games
    {
      type: 'pg_create_object_relationship',
      args: {
        source: 'default',
        table: { schema: 'public', name: 'player_props' },
        name: 'game',
        using: {
          foreign_key_constraint_on: 'game_id'
        }
      }
    },
    // Player Props -> Prop Types
    {
      type: 'pg_create_object_relationship',
      args: {
        source: 'default',
        table: { schema: 'public', name: 'player_props' },
        name: 'propType',
        using: {
          foreign_key_constraint_on: 'prop_type_id'
        }
      }
    }
  ];

  for (const relationship of relationships) {
    try {
      const result = await hasuraMetadataRequest(relationship);
      console.log(`✅ Added relationship: ${relationship.args.table.name}.${relationship.args.name}`);
    } catch (error) {
      console.log(`⚠️  Relationship ${relationship.args.table.name}.${relationship.args.name} might already exist:`, error.message);
    }
  }
}

// Add array relationships
async function addArrayRelationships() {
  console.log('🔗 Adding array relationships...');
  
  const relationships = [
    // Leagues -> Teams
    {
      type: 'pg_create_array_relationship',
      args: {
        source: 'default',
        table: { schema: 'public', name: 'leagues' },
        name: 'teams',
        using: {
          foreign_key_constraint_on: {
            table: { schema: 'public', name: 'teams' },
            column: 'league_id'
          }
        }
      }
    },
    // Teams -> Players
    {
      type: 'pg_create_array_relationship',
      args: {
        source: 'default',
        table: { schema: 'public', name: 'teams' },
        name: 'players',
        using: {
          foreign_key_constraint_on: {
            table: { schema: 'public', name: 'players' },
            column: 'team_id'
          }
        }
      }
    },
    // Leagues -> Games
    {
      type: 'pg_create_array_relationship',
      args: {
        source: 'default',
        table: { schema: 'public', name: 'leagues' },
        name: 'games',
        using: {
          foreign_key_constraint_on: {
            table: { schema: 'public', name: 'games' },
            column: 'league_id'
          }
        }
      }
    },
    // Teams -> Games (Home)
    {
      type: 'pg_create_array_relationship',
      args: {
        source: 'default',
        table: { schema: 'public', name: 'teams' },
        name: 'homeGames',
        using: {
          foreign_key_constraint_on: {
            table: { schema: 'public', name: 'games' },
            column: 'home_team_id'
          }
        }
      }
    },
    // Teams -> Games (Away)
    {
      type: 'pg_create_array_relationship',
      args: {
        source: 'default',
        table: { schema: 'public', name: 'teams' },
        name: 'awayGames',
        using: {
          foreign_key_constraint_on: {
            table: { schema: 'public', name: 'games' },
            column: 'away_team_id'
          }
        }
      }
    },
    // Players -> Player Props
    {
      type: 'pg_create_array_relationship',
      args: {
        source: 'default',
        table: { schema: 'public', name: 'players' },
        name: 'playerProps',
        using: {
          foreign_key_constraint_on: {
            table: { schema: 'public', name: 'player_props' },
            column: 'player_id'
          }
        }
      }
    },
    // Games -> Player Props
    {
      type: 'pg_create_array_relationship',
      args: {
        source: 'default',
        table: { schema: 'public', name: 'games' },
        name: 'playerProps',
        using: {
          foreign_key_constraint_on: {
            table: { schema: 'public', name: 'player_props' },
            column: 'game_id'
          }
        }
      }
    },
    // Prop Types -> Player Props
    {
      type: 'pg_create_array_relationship',
      args: {
        source: 'default',
        table: { schema: 'public', name: 'prop_types' },
        name: 'playerProps',
        using: {
          foreign_key_constraint_on: {
            table: { schema: 'public', name: 'player_props' },
            column: 'prop_type_id'
          }
        }
      }
    }
  ];

  for (const relationship of relationships) {
    try {
      const result = await hasuraMetadataRequest(relationship);
      console.log(`✅ Added array relationship: ${relationship.args.table.name}.${relationship.args.name}`);
    } catch (error) {
      console.log(`⚠️  Array relationship ${relationship.args.table.name}.${relationship.args.name} might already exist:`, error.message);
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

// Test relationship query
async function testRelationshipQuery() {
  console.log('🧪 Testing relationship query...');
  
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
            teams {
              id
              name
              abbreviation
            }
          }
        }
      `
    }),
  });

  const result = await response.json();
  console.log('✅ Relationship query result:', JSON.stringify(result, null, 2));
  return result;
}

// Main function
async function addRelationships() {
  try {
    console.log('🔗 Adding relationships to Hasura...');
    console.log(`📍 Hasura Endpoint: ${HASURA_ENDPOINT}`);
    
    // Add object relationships
    await addObjectRelationships();
    
    // Add array relationships
    await addArrayRelationships();
    
    // Reload metadata
    await reloadMetadata();
    
    // Wait for metadata to be processed
    console.log('⏳ Waiting for metadata to be processed...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test relationship query
    await testRelationshipQuery();
    
    console.log('\n🎉 Relationships added successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Visit https://graphql-engine-latest-statpedia.onrender.com/console');
    console.log('2. Go to Data tab to verify relationships');
    console.log('3. Go to API tab to test relationship queries');

  } catch (error) {
    console.error('❌ Adding relationships failed:', error.message);
    process.exit(1);
  }
}

// Run the relationship addition
addRelationships();
