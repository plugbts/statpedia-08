#!/usr/bin/env node

import fetch from 'node-fetch';
import 'dotenv/config';

const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT || 'https://graphql-engine-latest-statpedia.onrender.com';
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET || process.env.HASURA_GRAPHQL_ADMIN_SECRET;

if (!HASURA_ADMIN_SECRET) {
  console.error('❌ Missing HASURA_ADMIN_SECRET or HASURA_GRAPHQL_ADMIN_SECRET');
  console.log('Set it in your .env file');
  process.exit(1);
}

async function hasuraMetadataRequest(payload) {
  const response = await fetch(`${HASURA_ENDPOINT}/v1/metadata`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
    },
    body: JSON.stringify(payload),
  });
  
  const result = await response.json();
  if (!response.ok || result.error) {
    throw new Error(result.error || result.message || `HTTP ${response.status}`);
  }
  return result;
}

async function trackTable(tableName) {
  console.log(`📋 Tracking table: ${tableName}`);
  try {
    await hasuraMetadataRequest({
      type: 'pg_track_table',
      args: {
        source: 'default',
        table: {
          schema: 'public',
          name: tableName
        }
      }
    });
    console.log(`✅ ${tableName} tracked`);
  } catch (e) {
    if (e.message.includes('already tracked')) {
      console.log(`ℹ️  ${tableName} already tracked`);
    } else {
      console.error(`❌ Failed to track ${tableName}:`, e.message);
    }
  }
}

async function trackRelationship(tableName, relationshipName, config) {
  console.log(`🔗 Creating relationship: ${tableName}.${relationshipName}`);
  try {
    await hasuraMetadataRequest({
      type: 'pg_create_object_relationship',
      args: {
        source: 'default',
        table: {
          schema: 'public',
          name: tableName
        },
        name: relationshipName,
        using: config
      }
    });
    console.log(`✅ ${tableName}.${relationshipName} created`);
  } catch (e) {
    if (e.message.includes('already exists')) {
      console.log(`ℹ️  ${tableName}.${relationshipName} already exists`);
    } else {
      console.error(`❌ Failed to create ${tableName}.${relationshipName}:`, e.message);
    }
  }
}

async function trackArrayRelationship(tableName, relationshipName, config) {
  console.log(`🔗 Creating array relationship: ${tableName}.${relationshipName}`);
  try {
    await hasuraMetadataRequest({
      type: 'pg_create_array_relationship',
      args: {
        source: 'default',
        table: {
          schema: 'public',
          name: tableName
        },
        name: relationshipName,
        using: config
      }
    });
    console.log(`✅ ${tableName}.${relationshipName} created`);
  } catch (e) {
    if (e.message.includes('already exists')) {
      console.log(`ℹ️  ${tableName}.${relationshipName} already exists`);
    } else {
      console.error(`❌ Failed to create ${tableName}.${relationshipName}:`, e.message);
    }
  }
}

async function setTablePermissions(tableName) {
  console.log(`🔐 Setting permissions for: ${tableName}`);
  try {
    // Public select permission
    await hasuraMetadataRequest({
      type: 'pg_create_select_permission',
      args: {
        source: 'default',
        table: {
          schema: 'public',
          name: tableName
        },
        role: 'public',
        permission: {
          columns: '*',
          filter: {},
          allow_aggregations: true
        }
      }
    });
    console.log(`✅ ${tableName} permissions set`);
  } catch (e) {
    if (e.message.includes('already exists')) {
      console.log(`ℹ️  ${tableName} permissions already exist`);
    } else {
      console.error(`❌ Failed to set permissions for ${tableName}:`, e.message);
    }
  }
}

async function main() {
  console.log('🚀 Tracking Props Tables in Hasura\n');
  console.log(`📍 Endpoint: ${HASURA_ENDPOINT}\n`);
  
  // Step 1: Track all tables
  console.log('='.repeat(60));
  console.log('STEP 1: Track Tables');
  console.log('='.repeat(60));
  await trackTable('leagues');
  await trackTable('teams');
  await trackTable('players');
  await trackTable('props');
  await trackTable('games');
  
  // Step 2: Create object relationships (many-to-one)
  console.log('\n' + '='.repeat(60));
  console.log('STEP 2: Create Object Relationships');
  console.log('='.repeat(60));
  
  // teams.league
  await trackRelationship('teams', 'league', {
    foreign_key_constraint_on: 'league_id'
  });
  
  // players.team
  await trackRelationship('players', 'team', {
    foreign_key_constraint_on: 'team_id'
  });
  
  // props.player
  await trackRelationship('props', 'player', {
    foreign_key_constraint_on: 'player_id'
  });
  
  // props.team
  await trackRelationship('props', 'team', {
    foreign_key_constraint_on: 'team_id'
  });
  
  // Step 3: Create array relationships (one-to-many)
  console.log('\n' + '='.repeat(60));
  console.log('STEP 3: Create Array Relationships');
  console.log('='.repeat(60));
  
  // leagues.teams
  await trackArrayRelationship('leagues', 'teams', {
    foreign_key_constraint_on: {
      table: { schema: 'public', name: 'teams' },
      column: 'league_id'
    }
  });
  
  // teams.players
  await trackArrayRelationship('teams', 'players', {
    foreign_key_constraint_on: {
      table: { schema: 'public', name: 'players' },
      column: 'team_id'
    }
  });
  
  // teams.props
  await trackArrayRelationship('teams', 'props', {
    foreign_key_constraint_on: {
      table: { schema: 'public', name: 'props' },
      column: 'team_id'
    }
  });
  
  // players.props
  await trackArrayRelationship('players', 'props', {
    foreign_key_constraint_on: {
      table: { schema: 'public', name: 'props' },
      column: 'player_id'
    }
  });
  
  // Step 4: Set permissions
  console.log('\n' + '='.repeat(60));
  console.log('STEP 4: Set Permissions');
  console.log('='.repeat(60));
  await setTablePermissions('leagues');
  await setTablePermissions('teams');
  await setTablePermissions('players');
  await setTablePermissions('props');
  await setTablePermissions('games');
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Hasura Setup Complete!');
  console.log('='.repeat(60));
  console.log('\n📊 Next: Run validation query');
  console.log('   node scripts/test-hasura-query.mjs\n');
}

main().catch((e) => {
  console.error('❌ Setup failed:', e);
  process.exit(1);
});

