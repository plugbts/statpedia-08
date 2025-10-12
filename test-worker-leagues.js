#!/usr/bin/env node

/**
 * Test the worker leagues endpoint
 */

async function testWorkerLeagues() {
  console.log('🧪 Testing worker leagues...\n');

  try {
    const workerUrl = 'https://statpedia-player-props.statpedia.workers.dev';
    
    console.log('1. Testing leagues endpoint...');
    const leaguesResponse = await fetch(`${workerUrl}/leagues`);
    
    if (leaguesResponse.ok) {
      const leaguesData = await leaguesResponse.json();
      console.log('   ✅ Leagues endpoint successful');
      console.log('   📊 Available leagues:');
      console.log(`   Raw response: ${JSON.stringify(leaguesData, null, 2)}`);
      
      if (Array.isArray(leaguesData)) {
        leaguesData.forEach(league => {
          console.log(`     ${league.id}: ${league.displayName} (active: ${league.isActive})`);
        });
      } else {
        console.log('   Response is not an array');
      }
    } else {
      console.log('   ❌ Leagues endpoint failed');
      const errorText = await leaguesResponse.text();
      console.log(`   Error: ${errorText}`);
    }

    console.log('\n2. Testing status endpoint...');
    const statusResponse = await fetch(`${workerUrl}/status`);
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('   ✅ Status endpoint successful');
      console.log(`   Response: ${JSON.stringify(statusData, null, 2)}`);
    } else {
      console.log('   ❌ Status endpoint failed');
      const errorText = await statusResponse.text();
      console.log(`   Error: ${errorText}`);
    }

    console.log('\n3. Testing ingest endpoint without league...');
    const ingestResponse = await fetch(`${workerUrl}/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (ingestResponse.ok) {
      const ingestData = await ingestResponse.json();
      console.log('   ✅ Ingest endpoint successful');
      console.log(`   Response: ${JSON.stringify(ingestData, null, 2)}`);
    } else {
      console.log('   ❌ Ingest endpoint failed');
      const errorText = await ingestResponse.text();
      console.log(`   Error: ${errorText}`);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testWorkerLeagues().catch(console.error);
