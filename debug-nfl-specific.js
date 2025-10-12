#!/usr/bin/env node

// Debug NFL-specific ingestion issues

async function debugNFLSpecific() {
  console.log('🔍 Debugging NFL-Specific Ingestion Issues\n');

  try {
    // Test NFL ingestion with detailed logging
    console.log('🧪 Testing NFL ingestion with limit=1...');
    
    const response = await fetch('https://statpedia-player-props.statpedia.workers.dev/ingest/NFL?limit=1');
    
    if (response.ok) {
      const result = await response.json();
      console.log('📊 NFL Ingestion Result:');
      console.log(JSON.stringify(result, null, 2));
      
      // Analyze the NFL-specific results
      const nflLeague = result.leagues?.find(l => l.league === 'NFL');
      if (nflLeague) {
        console.log('\n🎯 NFL Analysis:');
        console.log(`  Props processed: ${nflLeague.props}`);
        console.log(`  Props inserted: ${nflLeague.inserted}`);
        console.log(`  Errors: ${nflLeague.errors}`);
        console.log(`  Success rate: ${((nflLeague.props - nflLeague.errors) / nflLeague.props * 100).toFixed(1)}%`);
        
        if (nflLeague.errors > 0) {
          console.log('\n⚠️ NFL has high error rate!');
          console.log('   This suggests NFL-specific data processing issues.');
        }
      }
      
      // Compare with other leagues
      console.log('\n📈 League Comparison:');
      result.leagues?.forEach(league => {
        const successRate = ((league.props - league.errors) / league.props * 100).toFixed(1);
        console.log(`  ${league.league}: ${league.inserted}/${league.props} inserted, ${league.errors} errors (${successRate}% success)`);
      });
      
    } else {
      console.log('❌ NFL ingestion failed:', response.status, response.statusText);
    }

    // Test the debug endpoints to get more info
    console.log('\n🧪 Testing debug endpoints...');
    
    // Test SGO API debug
    try {
      const debugResponse = await fetch('https://statpedia-player-props.statpedia.workers.dev/debug/sgo-api?league=nfl');
      if (debugResponse.ok) {
        const debugResult = await debugResponse.json();
        console.log('✅ SGO API debug successful');
        console.log('Sample data:', JSON.stringify(debugResult, null, 2));
      }
    } catch (error) {
      console.log('❌ SGO API debug failed:', error.message);
    }

    // Test team resolution
    try {
      const teamResponse = await fetch('https://statpedia-player-props.statpedia.workers.dev/debug/team-resolution?league=nfl');
      if (teamResponse.ok) {
        const teamResult = await teamResponse.json();
        console.log('✅ Team resolution debug successful');
        console.log('Team resolution:', JSON.stringify(teamResult, null, 2));
      }
    } catch (error) {
      console.log('❌ Team resolution debug failed:', error.message);
    }

  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

debugNFLSpecific();
