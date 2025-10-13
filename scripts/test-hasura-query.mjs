#!/usr/bin/env node

import fetch from 'node-fetch';
import 'dotenv/config';

const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT || 'https://graphql-engine-latest-statpedia.onrender.com/v1/graphql';
const HASURA_ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET;

async function testQuery(query, variables = {}) {
  const response = await fetch(HASURA_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(HASURA_ADMIN_SECRET && { 'x-hasura-admin-secret': HASURA_ADMIN_SECRET })
    },
    body: JSON.stringify({ query, variables })
  });
  
  return response.json();
}

async function main() {
  console.log('🔎 STEP 5: Test GraphQL Query in Hasura\n');
  console.log(`📍 Endpoint: ${HASURA_ENDPOINT}\n`);
  
  // Test 1: Check if props table is accessible
  console.log('1️⃣ Testing basic props query (no relationships):\n');
  const basicQuery = `
    query GetBasicProps {
      props(limit: 5, order_by: {created_at: desc}) {
        id
        prop_type
        line
        odds
        created_at
      }
    }
  `;
  
  const basicResult = await testQuery(basicQuery);
  if (basicResult.errors) {
    console.log('❌ Basic query failed:');
    console.dir(basicResult.errors, { depth: null });
  } else {
    console.log(`✅ Basic query succeeded: ${basicResult.data?.props?.length || 0} props returned`);
    if (basicResult.data?.props?.length > 0) {
      console.log('Sample prop:', JSON.stringify(basicResult.data.props[0], null, 2));
    }
  }
  
  // Test 2: Check if relationships work
  console.log('\n\n2️⃣ Testing props query WITH relationships:\n');
  const relationQuery = `
    query GetPropsWithRelations {
      props(limit: 5, order_by: {created_at: desc}) {
        id
        prop_type
        line
        odds
        player {
          id
          name
          position
          team {
            id
            abbreviation
            name
            league {
              code
              name
            }
          }
        }
      }
    }
  `;
  
  const relationResult = await testQuery(relationQuery);
  if (relationResult.errors) {
    console.log('❌ Relationship query failed:');
    console.dir(relationResult.errors, { depth: null });
    console.log('\n⚠️  This means relationships are NOT tracked in Hasura.');
    console.log('   Run: node setup-hasura.js to track tables and relationships.\n');
  } else {
    console.log(`✅ Relationship query succeeded: ${relationResult.data?.props?.length || 0} props with nested data`);
    if (relationResult.data?.props?.length > 0) {
      console.log('\nSample prop with relationships:');
      console.dir(relationResult.data.props[0], { depth: null });
    }
  }
  
  // Test 3: Count by league
  console.log('\n\n3️⃣ Testing aggregation query (props count by league):\n');
  const aggQuery = `
    query GetPropsByLeague {
      props_aggregate {
        aggregate {
          count
        }
      }
    }
  `;
  
  const aggResult = await testQuery(aggQuery);
  if (aggResult.errors) {
    console.log('❌ Aggregation query failed:');
    console.dir(aggResult.errors, { depth: null });
  } else {
    console.log(`✅ Aggregation query succeeded`);
    console.log(`   Total props: ${aggResult.data?.props_aggregate?.aggregate?.count || 0}`);
  }
  
  // Test 4: Test sport filtering
  console.log('\n\n4️⃣ Testing sport filtering (NFL props):\n');
  const filterQuery = `
    query GetNFLProps {
      props(
        limit: 10,
        order_by: {created_at: desc},
        where: {
          player: {
            team: {
              league: {
                code: { _eq: "NFL" }
              }
            }
          }
        }
      ) {
        id
        prop_type
        line
        odds
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
  
  const filterResult = await testQuery(filterQuery);
  if (filterResult.errors) {
    console.log('❌ Filter query failed:');
    console.dir(filterResult.errors, { depth: null });
  } else {
    console.log(`✅ Filter query succeeded: ${filterResult.data?.props?.length || 0} NFL props returned`);
    if (filterResult.data?.props?.length > 0) {
      console.log('\nSample NFL prop:');
      console.log(`   Player: ${filterResult.data.props[0].player.name}`);
      console.log(`   Team: ${filterResult.data.props[0].player.team.abbreviation}`);
      console.log(`   Prop: ${filterResult.data.props[0].prop_type} ${filterResult.data.props[0].line} @ ${filterResult.data.props[0].odds}`);
    }
  }
  
  console.log('\n\n📊 Summary:');
  console.log('=' .repeat(60));
  const allPassed = !basicResult.errors && !relationResult.errors && !aggResult.errors && !filterResult.errors;
  if (allPassed) {
    console.log('✅ All Hasura queries passed!');
    console.log('✅ Tables are tracked');
    console.log('✅ Relationships are working');
    console.log('✅ Data is accessible via GraphQL');
  } else {
    console.log('❌ Some queries failed. Action items:');
    if (basicResult.errors) console.log('   - Run migrations: npm run db:push');
    if (relationResult.errors) console.log('   - Track relationships: node setup-hasura.js');
    if (aggResult.errors || filterResult.errors) console.log('   - Check Hasura permissions');
  }
  console.log('=' .repeat(60));
  
  console.log('\n✅ Step 5 complete.\n');
}

main().catch((e) => {
  console.error('❌ Query test failed:', e);
  process.exit(1);
});

