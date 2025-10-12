#!/usr/bin/env node

import { config } from 'dotenv';

config({ path: '.env.local' });

async function testWorkerOdds() {
  console.log('🎯 Testing Worker Odds and Line Formatting...\n');

  try {
    // Test the worker endpoint
    const workerUrl = 'https://statpedia-player-props.statpedia.workers.dev';
    
    console.log('📡 Testing worker health...');
    const healthResponse = await fetch(`${workerUrl}/`);
    
    if (!healthResponse.ok) {
      throw new Error(`Worker health check failed: ${healthResponse.status}`);
    }
    
    console.log('✅ Worker is healthy');
    
    // Test NFL ingestion to see new odds formatting
    console.log('\n🏈 Testing NFL ingestion with new odds formatting...');
    const ingestResponse = await fetch(`${workerUrl}/ingest/nfl`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        test: true,
        debug: true
      })
    });
    
    if (!ingestResponse.ok) {
      throw new Error(`Ingestion failed: ${ingestResponse.status} ${ingestResponse.statusText}`);
    }
    
    const result = await ingestResponse.json();
    console.log('✅ NFL ingestion completed');
    console.log('📊 Result:', JSON.stringify(result, null, 2));
    
    // Check if we can see any props with the new formatting
    console.log('\n🔍 Checking for props with new formatting...');
    const propsResponse = await fetch(`${workerUrl}/props/nfl?limit=5`);
    
    if (propsResponse.ok) {
      const propsData = await propsResponse.json();
      console.log('📈 Recent NFL Props:');
      
      if (propsData && propsData.length > 0) {
        propsData.forEach((prop, index) => {
          console.log(`${index + 1}. ${prop.player_name} - ${prop.prop_type}`);
          console.log(`   Line: ${prop.line} (type: ${typeof prop.line})`);
          console.log(`   Over: ${prop.over_odds} (type: ${typeof prop.over_odds})`);
          console.log(`   Under: ${prop.under_odds} (type: ${typeof prop.under_odds})`);
          
          // Check for proper formatting
          const issues = [];
          if (Number.isInteger(prop.line) && prop.line > 0) {
            issues.push(`Integer line: ${prop.line} (should be ${prop.line + 0.5})`);
          }
          if (!prop.over_odds || !prop.under_odds) {
            issues.push(`Missing odds: over=${prop.over_odds}, under=${prop.under_odds}`);
          }
          
          if (issues.length > 0) {
            console.log(`   🚨 ISSUES: ${issues.join(', ')}`);
          } else {
            console.log(`   ✅ Properly formatted!`);
          }
          console.log('');
        });
      } else {
        console.log('No props found');
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing worker:', error.message);
  }
}

testWorkerOdds();
