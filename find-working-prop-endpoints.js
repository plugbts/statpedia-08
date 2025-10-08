/**
 * Find the correct working player prop endpoints
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' });

const API_KEY = process.env.SPORTSGAMEODDS_API_KEY;

async function findWorkingPropEndpoints() {
  console.log('🔍 Finding Working Player Prop Endpoints');
  console.log('='.repeat(50));

  try {
    // Test various possible endpoints
    const endpoints = [
      // V1 endpoints
      'https://api.sportsgameodds.com/v1/nfl/props',
      'https://api.sportsgameodds.com/v1/props?league=nfl',
      'https://api.sportsgameodds.com/v1/player-props?league=nfl',
      
      // V2 endpoints with different formats
      'https://api.sportsgameodds.com/v2/props?leagueID=NFL',
      'https://api.sportsgameodds.com/v2/player-props?leagueID=NFL',
      'https://api.sportsgameodds.com/v2/nfl/props',
      
      // Different parameter combinations
      'https://api.sportsgameodds.com/v2/props?apiKey=' + API_KEY + '&leagueID=NFL',
      'https://api.sportsgameodds.com/v2/props?apiKey=' + API_KEY + '&leagueID=NFL&season=2024',
      'https://api.sportsgameodds.com/v2/props?apiKey=' + API_KEY + '&leagueID=NFL&season=2025',
      
      // Alternative formats
      'https://api.sportsgameodds.com/props?league=nfl',
      'https://api.sportsgameodds.com/player-props?league=nfl',
      'https://api.sportsgameodds.com/nfl/props',
    ];

    console.log('Testing various endpoints...\n');

    for (let i = 0; i < endpoints.length; i++) {
      const endpoint = endpoints[i];
      console.log(`${i + 1}. Testing: ${endpoint}`);
      
      try {
        const response = await fetch(endpoint, {
          headers: { 'x-api-key': API_KEY }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`   ✅ SUCCESS: ${response.status}`);
          
          // Analyze the response structure
          if (data.props) {
            console.log(`   📊 Found ${data.props.length} props`);
            if (data.props.length > 0) {
              console.log(`   📋 Sample prop: ${JSON.stringify(data.props[0], null, 2)}`);
            }
          } else if (data.data) {
            console.log(`   📊 Found ${data.data.length} data entries`);
            if (data.data.length > 0) {
              console.log(`   📋 Sample data: ${JSON.stringify(data.data[0], null, 2)}`);
            }
          } else if (data.events) {
            console.log(`   📊 Found ${data.events.length} events`);
            if (data.events.length > 0) {
              console.log(`   📋 Sample event: ${JSON.stringify(data.events[0], null, 2)}`);
            }
          } else {
            console.log(`   📋 Response structure: ${Object.keys(data)}`);
          }
        } else {
          console.log(`   ❌ FAILED: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}`);
      }
      
      console.log('');
    }

    // Test with different HTTP methods
    console.log('\n🔍 Testing POST requests (if needed):');
    try {
      const postResponse = await fetch('https://api.sportsgameodds.com/v1/props', {
        method: 'POST',
        headers: { 
          'x-api-key': API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          league: 'nfl',
          limit: 100
        })
      });
      
      if (postResponse.ok) {
        const postData = await postResponse.json();
        console.log(`✅ POST SUCCESS: ${postResponse.status}`);
        console.log(`📊 Response: ${JSON.stringify(postData, null, 2)}`);
      } else {
        console.log(`❌ POST FAILED: ${postResponse.status} ${postResponse.statusText}`);
      }
    } catch (error) {
      console.log(`❌ POST ERROR: ${error.message}`);
    }

    // Check API documentation endpoints
    console.log('\n🔍 Testing API documentation endpoints:');
    const docEndpoints = [
      'https://api.sportsgameodds.com/docs',
      'https://api.sportsgameodds.com/api-docs',
      'https://api.sportsgameodds.com/swagger',
      'https://api.sportsgameodds.com/openapi.json'
    ];

    for (const docEndpoint of docEndpoints) {
      try {
        const docResponse = await fetch(docEndpoint);
        if (docResponse.ok) {
          console.log(`✅ Documentation available: ${docEndpoint}`);
        } else {
          console.log(`❌ No docs: ${docEndpoint} (${docResponse.status})`);
        }
      } catch (error) {
        console.log(`❌ Docs error: ${docEndpoint}`);
      }
    }

    console.log('\n🎉 Endpoint testing complete!');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Fatal error during endpoint testing:', error);
  }
}

findWorkingPropEndpoints().catch(console.error);
