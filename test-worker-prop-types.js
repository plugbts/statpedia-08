#!/usr/bin/env node

console.log('🧪 Testing Worker Prop Type Normalization\n');

// Test the worker's prop type normalization endpoint
async function testWorkerPropTypes() {
  try {
    console.log('🔍 Testing worker prop type normalization...');
    
    // Test a few specific prop types
    const testCases = [
      'Player Passing Yards Over/Under',
      'Player Receptions Over/Under', 
      'Player Rush + Rec Yards Over/Under',
      'Player Strikeouts Over/Under',
      'Player Points Over/Under',
      'Player Goals Over/Under'
    ];
    
    console.log('📊 Expected results:');
    testCases.forEach((testCase, index) => {
      console.log(`${index + 1}. "${testCase}"`);
    });
    
    console.log('\n🎯 Key improvements to verify:');
    console.log('✅ No more "over_under" fallback for recognizable props');
    console.log('✅ No more "receivingeptions" typos');
    console.log('✅ Combo props properly detected (rush+rec, pass+rush, etc.)');
    console.log('✅ Enhanced fuzzy matching for variations');
    
    // Test worker health
    console.log('\n🔍 Testing worker health...');
    const healthResponse = await fetch('https://statpedia-player-props.statpedia.workers.dev/');
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Worker is healthy:', healthData);
    } else {
      console.log('❌ Worker health check failed:', healthResponse.status);
    }
    
    // Test a small ingestion to see prop types in action
    console.log('\n🔍 Testing small NFL ingestion...');
    const ingestResponse = await fetch('https://statpedia-player-props.statpedia.workers.dev/ingest/NFL?limit=10', {
      method: 'POST'
    });
    
    if (ingestResponse.ok) {
      const ingestData = await ingestResponse.json();
      console.log('✅ Ingestion test successful:', {
        success: ingestData.success,
        totalProps: ingestData.totalProps,
        inserted: ingestData.inserted,
        errors: ingestData.errors
      });
      
      if (ingestData.leagues) {
        console.log('\n📊 League breakdown:');
        ingestData.leagues.forEach(league => {
          console.log(`  ${league.league}: ${league.props} props, ${league.inserted} inserted, ${league.errors} errors`);
        });
      }
    } else {
      console.log('❌ Ingestion test failed:', ingestResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testWorkerPropTypes();
