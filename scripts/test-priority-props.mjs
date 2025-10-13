#!/usr/bin/env node

import pg from 'pg';
import fetch from 'node-fetch';
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT || 'https://graphql-engine-latest-statpedia.onrender.com/v1/graphql';

async function testDatabase() {
  console.log('🔎 STEP 1: Testing Priority Props in Database\n');
  
  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  
  try {
    // Total props with priority breakdown
    const totalRes = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE priority = true) as priority_count,
        COUNT(*) FILTER (WHERE priority = false OR priority IS NULL) as extended_count
      FROM props
    `);
    
    console.log('📊 Total Props:');
    console.log(`   Total: ${totalRes.rows[0].total}`);
    console.log(`   Priority: ${totalRes.rows[0].priority_count}`);
    console.log(`   Extended: ${totalRes.rows[0].extended_count}`);
    
    // Priority props by league
    const byLeagueRes = await client.query(`
      SELECT 
        l.code,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE p.priority = true) as priority_count
      FROM props p
      JOIN teams t ON p.team_id = t.id
      JOIN leagues l ON t.league_id = l.id
      GROUP BY l.code
      ORDER BY total DESC
    `);
    
    console.log('\n📊 By League:');
    byLeagueRes.rows.forEach(row => {
      const percent = ((row.priority_count / row.total) * 100).toFixed(1);
      console.log(`   ${row.code}: ${row.total} total (${row.priority_count} priority, ${percent}%)`);
    });
    
    // Sample priority props
    const prioritySample = await client.query(`
      SELECT p.prop_type, p.line, p.odds, p.priority, pl.name, t.abbreviation
      FROM props p
      JOIN players pl ON p.player_id = pl.id
      JOIN teams t ON p.team_id = t.id
      WHERE p.priority = true
      ORDER BY p.created_at DESC
      LIMIT 10
    `);
    
    console.log('\n📊 Sample Priority Props:');
    prioritySample.rows.forEach((row, i) => {
      console.log(`   ${i + 1}. ${row.name} (${row.abbreviation}) - ${row.prop_type}: ${row.line} @ ${row.odds}`);
    });
    
    // Sample extended props
    const extendedSample = await client.query(`
      SELECT p.prop_type, p.line, p.odds, p.priority, pl.name, t.abbreviation
      FROM props p
      JOIN players pl ON p.player_id = pl.id
      JOIN teams t ON p.team_id = t.id
      WHERE p.priority = false OR p.priority IS NULL
      ORDER BY p.created_at DESC
      LIMIT 10
    `);
    
    console.log('\n📊 Sample Extended Props:');
    extendedSample.rows.forEach((row, i) => {
      console.log(`   ${i + 1}. ${row.name} (${row.abbreviation}) - ${row.prop_type}: ${row.line} @ ${row.odds}`);
    });
    
    // Check prop type diversity
    const propTypeBreakdown = await client.query(`
      SELECT 
        prop_type,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE priority = true) as priority_count
      FROM props
      GROUP BY prop_type
      ORDER BY count DESC
      LIMIT 20
    `);
    
    console.log('\n📊 Top 20 Prop Types:');
    propTypeBreakdown.rows.forEach((row, i) => {
      const priorityPercent = row.priority_count > 0 ? ` (${((row.priority_count / row.count) * 100).toFixed(0)}% priority)` : '';
      console.log(`   ${i + 1}. ${row.prop_type}: ${row.count}${priorityPercent}`);
    });
    
  } finally {
    await client.end();
  }
}

async function testGraphQL() {
  console.log('\n\n🔎 STEP 2: Testing Priority Props via GraphQL\n');
  
  // Test priority filter
  const priorityQuery = `
    query GetPriorityProps {
      props(
        where: { priority: { _eq: true } },
        limit: 5,
        order_by: { created_at: desc }
      ) {
        id
        prop_type
        line
        odds
        priority
        player {
          name
          team {
            abbreviation
            league {
              code
            }
          }
        }
      }
    }
  `;
  
  const response = await fetch(HASURA_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: priorityQuery })
  });
  
  const result = await response.json();
  
  if (result.errors) {
    console.log('❌ GraphQL query failed:');
    console.dir(result.errors, { depth: null });
  } else {
    console.log(`✅ GraphQL query succeeded: ${result.data?.props?.length || 0} priority props returned`);
    if (result.data?.props?.length > 0) {
      console.log('\nSample priority prop via GraphQL:');
      const prop = result.data.props[0];
      console.log(`   ${prop.player.name} (${prop.player.team.abbreviation})`);
      console.log(`   ${prop.prop_type}: ${prop.line} @ ${prop.odds}`);
      console.log(`   Priority: ${prop.priority}`);
      console.log(`   League: ${prop.player.team.league.code}`);
    }
  }
  
  // Test aggregation
  const aggQuery = `
    query GetPriorityCount {
      priority_props: props_aggregate(where: { priority: { _eq: true } }) {
        aggregate {
          count
        }
      }
      extended_props: props_aggregate(where: { priority: { _eq: false } }) {
        aggregate {
          count
        }
      }
    }
  `;
  
  const aggResponse = await fetch(HASURA_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: aggQuery })
  });
  
  const aggResult = await aggResponse.json();
  
  if (aggResult.errors) {
    console.log('\n❌ Aggregation query failed:');
    console.dir(aggResult.errors, { depth: null });
  } else {
    console.log('\n✅ Aggregation query succeeded:');
    console.log(`   Priority props: ${aggResult.data?.priority_props?.aggregate?.count || 0}`);
    console.log(`   Extended props: ${aggResult.data?.extended_props?.aggregate?.count || 0}`);
  }
}

async function main() {
  if (!DATABASE_URL) {
    console.error('❌ Missing DATABASE_URL');
    process.exit(1);
  }
  
  console.log('🚀 Testing Priority Props System\n');
  console.log('='.repeat(60));
  
  await testDatabase();
  await testGraphQL();
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Priority Props System Test Complete\n');
}

main().catch((e) => {
  console.error('❌ Test failed:', e);
  process.exit(1);
});

