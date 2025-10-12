#!/usr/bin/env node

/**
 * Test the deployed worker to see what prop types it's fetching
 */

async function testWorkerProps() {
  console.log('🧪 Testing deployed worker for prop types...\n');

  try {
    // Test the worker endpoint
    const workerUrl = 'https://statpedia-player-props.statpedia.workers.dev';
    
    console.log('1. Testing worker health...');
    const healthResponse = await fetch(`${workerUrl}/`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.text();
      console.log('   ✅ Worker is healthy');
      console.log(`   Response: ${healthData.substring(0, 200)}...`);
    } else {
      console.log('   ❌ Worker health check failed');
      return;
    }

    console.log('\n2. Testing NFL props ingestion...');
    const ingestResponse = await fetch(`${workerUrl}/ingest/nfl`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (ingestResponse.ok) {
      const ingestData = await ingestResponse.json();
      console.log('   ✅ NFL ingestion successful');
      console.log(`   Response: ${JSON.stringify(ingestData, null, 2)}`);
    } else {
      console.log('   ❌ NFL ingestion failed');
      const errorText = await ingestResponse.text();
      console.log(`   Error: ${errorText}`);
    }

    console.log('\n3. Testing player props API...');
    const propsResponse = await fetch(`${workerUrl}/api/player-props/nfl`);
    
    if (propsResponse.ok) {
      const propsData = await propsResponse.json();
      console.log('   ✅ Player props API successful');
      console.log(`   Found ${propsData.length} props`);
      
      if (propsData.length > 0) {
        // Group by prop type
        const propTypes = {};
        propsData.forEach(prop => {
          if (!propTypes[prop.propType]) {
            propTypes[prop.propType] = 0;
          }
          propTypes[prop.propType]++;
        });
        
        console.log('\n   📊 Prop types found:');
        Object.entries(propTypes).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
          console.log(`     ${type}: ${count} props`);
        });
        
        // Check for receiving yards
        const receivingYards = propsData.filter(prop => 
          prop.propType && prop.propType.toLowerCase().includes('receiving')
        );
        console.log(`\n   🎯 Receiving-related props: ${receivingYards.length}`);
        if (receivingYards.length > 0) {
          receivingYards.slice(0, 3).forEach(prop => {
            console.log(`     ${prop.playerName}: ${prop.propType} ${prop.line}`);
          });
        }
        
        // Check for combo props
        const comboProps = propsData.filter(prop => 
          prop.propType && (prop.propType.includes('+') || prop.propType.includes('_'))
        );
        console.log(`\n   🎯 Combo props: ${comboProps.length}`);
        if (comboProps.length > 0) {
          comboProps.slice(0, 3).forEach(prop => {
            console.log(`     ${prop.playerName}: ${prop.propType} ${prop.line}`);
          });
        }
      }
    } else {
      console.log('   ❌ Player props API failed');
      const errorText = await propsResponse.text();
      console.log(`   Error: ${errorText}`);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testWorkerProps().catch(console.error);
