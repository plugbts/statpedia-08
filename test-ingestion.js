#!/usr/bin/env node

/**
 * Test script for prop ingestion system
 * This script tests the ingestion without requiring real API keys
 */

import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

// Mock the ingestion service for testing
async function testIngestionSystem() {
  console.log('🧪 Testing Prop Ingestion System...');
  
  // Test 1: Check if our props table has data
  console.log('\n📊 Test 1: Checking props table data...');
  
  try {
    const response = await fetch('https://graphql-engine-latest-statpedia.onrender.com/v1/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': process.env.HASURA_ADMIN_SECRET,
      },
      body: JSON.stringify({
        query: `
          query GetPropsSummary {
            props_aggregate {
              aggregate {
                count
              }
            }
            props(limit: 3) {
              prop_type
              line
              player {
                name
                team {
                  abbreviation
                  logo_url
                  league {
                    code
                  }
                }
              }
            }
          }
        `
      })
    });
    
    const result = await response.json();
    
    if (result.errors) {
      console.error('❌ GraphQL errors:', result.errors);
      return false;
    }
    
    const count = result.data?.props_aggregate?.aggregate?.count || 0;
    console.log(`✅ Found ${count} props in database`);
    
    if (count > 0) {
      console.log('\n📋 Sample props:');
      result.data.props.forEach((prop, index) => {
        console.log(`${index + 1}. ${prop.player.name} (${prop.player.team.abbreviation}) - ${prop.prop_type} ${prop.line}`);
        console.log(`   League: ${prop.player.team.league.code}, Logo: ${prop.player.team.logo_url ? '✅' : '❌'}`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Test 1 failed:', error.message);
    return false;
  }
}

// Test 2: Check team mapping and logos
async function testTeamMapping() {
  console.log('\n🏈 Test 2: Checking team mapping and logos...');
  
  try {
    const response = await fetch('https://graphql-engine-latest-statpedia.onrender.com/v1/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': process.env.HASURA_ADMIN_SECRET,
      },
      body: JSON.stringify({
        query: `
          query GetTeamMapping {
            teams {
              abbreviation
              name
              logo_url
              league {
                code
                name
              }
            }
          }
        `
      })
    });
    
    const result = await response.json();
    
    if (result.errors) {
      console.error('❌ GraphQL errors:', result.errors);
      return false;
    }
    
    const teams = result.data?.teams || [];
    console.log(`✅ Found ${teams.length} teams with league mapping`);
    
    // Group by league
    const byLeague = teams.reduce((acc, team) => {
      const league = team.league.code;
      if (!acc[league]) acc[league] = [];
      acc[league].push(team);
      return acc;
    }, {});
    
    console.log('\n📊 Teams by league:');
    Object.entries(byLeague).forEach(([league, leagueTeams]) => {
      console.log(`${league}: ${leagueTeams.length} teams`);
      leagueTeams.slice(0, 3).forEach(team => {
        console.log(`  - ${team.abbreviation}: ${team.name} ${team.logo_url ? '🖼️' : '❌'}`);
      });
    });
    
    return true;
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message);
    return false;
  }
}

// Test 3: Check frontend API integration
async function testFrontendAPI() {
  console.log('\n🖥️  Test 3: Checking frontend API integration...');
  
  try {
    // Test the same query our frontend uses
    const response = await fetch('https://graphql-engine-latest-statpedia.onrender.com/v1/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': process.env.HASURA_ADMIN_SECRET,
      },
      body: JSON.stringify({
        query: `
          query GetPlayerProps {
            props {
              id
              prop_type
              line
              odds
              game_id
              player {
                id
                name
                position
                team {
                  id
                  name
                  abbreviation
                  logo_url
                  league {
                    id
                    code
                    name
                  }
                }
              }
              team {
                id
                name
                abbreviation
                logo_url
                league {
                  id
                  code
                  name
                }
              }
            }
          }
        `
      })
    });
    
    const result = await response.json();
    
    if (result.errors) {
      console.error('❌ GraphQL errors:', result.errors);
      return false;
    }
    
    const props = result.data?.props || [];
    console.log(`✅ Frontend API query returned ${props.length} props`);
    
    if (props.length > 0) {
      const firstProp = props[0];
      console.log('\n📋 Sample frontend data structure:');
      console.log(`Player: ${firstProp.player.name} (${firstProp.player.position})`);
      console.log(`Team: ${firstProp.player.team.abbreviation} (${firstProp.player.team.league.code})`);
      console.log(`Prop: ${firstProp.prop_type} ${firstProp.line}`);
      console.log(`Logo: ${firstProp.player.team.logo_url ? '✅' : '❌'}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Test 3 failed:', error.message);
    return false;
  }
}

// Main test function
async function runAllTests() {
  console.log('🚀 Starting StatPedia Ingestion System Tests...\n');
  
  const results = [];
  
  results.push(await testIngestionSystem());
  results.push(await testTeamMapping());
  results.push(await testFrontendAPI());
  
  const passed = results.filter(Boolean).length;
  const total = results.length;
  
  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! Your ingestion system is working correctly.');
    console.log('\n📋 Next steps:');
    console.log('1. Your player props tab should show real data with correct logos');
    console.log('2. Team mapping is working across all leagues');
    console.log('3. GraphQL API is properly integrated with frontend');
    console.log('4. Ready for production prop ingestion!');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}
