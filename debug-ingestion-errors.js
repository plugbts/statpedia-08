#!/usr/bin/env node

// Debug the 219 ingestion errors to identify the root cause

async function debugIngestionErrors() {
  console.log('🔍 Debugging Ingestion Errors (219 errors)\n');

  try {
    // Check worker logs by triggering ingestion and monitoring
    console.log('🧪 Triggering ingestion to capture error details...');
    
    const response = await fetch('https://statpedia-player-props.statpedia.workers.dev/ingest/NFL?limit=1');
    
    if (response.ok) {
      const result = await response.json();
      console.log('📊 Ingestion Result:');
      console.log(JSON.stringify(result, null, 2));
      
      // Check if we can get more detailed error info
      if (result.errors > 0) {
        console.log(`\n⚠️ ${result.errors} errors occurred.`);
        console.log('   This suggests validation, normalization, or database issues.');
        
        // Check common error causes
        console.log('\n🔍 Common Error Causes:');
        console.log('1. Missing required fields (player_id, date, prop_type, etc.)');
        console.log('2. Invalid data types (line, odds, dates)');
        console.log('3. Database constraint violations');
        console.log('4. Normalization failures');
        console.log('5. Network/timeout issues');
      }
      
      // Check league-specific results
      if (result.leagues) {
        console.log('\n📈 League-Specific Results:');
        result.leagues.forEach(league => {
          console.log(`${league.league}: ${league.props} props, ${league.inserted} inserted, ${league.errors} errors`);
        });
      }
    } else {
      console.log('❌ Ingestion failed:', response.status, response.statusText);
    }

    // Test individual endpoints to isolate issues
    console.log('\n🧪 Testing Individual Endpoints...');
    
    // Test status endpoint
    try {
      const statusResponse = await fetch('https://statpedia-player-props.statpedia.workers.dev/status');
      if (statusResponse.ok) {
        const status = await statusResponse.json();
        console.log('✅ Status endpoint working:', status.status);
      }
    } catch (error) {
      console.log('❌ Status endpoint error:', error.message);
    }

    // Test leagues endpoint
    try {
      const leaguesResponse = await fetch('https://statpedia-player-props.statpedia.workers.dev/leagues');
      if (leaguesResponse.ok) {
        const leagues = await leaguesResponse.json();
        console.log('✅ Leagues endpoint working:', leagues.length, 'leagues');
      }
    } catch (error) {
      console.log('❌ Leagues endpoint error:', error.message);
    }

  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

debugIngestionErrors();
