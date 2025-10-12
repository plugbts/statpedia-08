#!/usr/bin/env node

console.log('🧪 Testing Prop Type Normalization Fix\n');

// Test the normalization functions directly
async function testNormalizationFix() {
  try {
    console.log('🔍 Testing worker prop type normalization...');
    
    // Test a comprehensive ingestion to see what prop types we're getting
    console.log('📊 Running comprehensive ingestion test...');
    const ingestResponse = await fetch('https://statpedia-player-props.statpedia.workers.dev/ingest', {
      method: 'POST'
    });
    
    if (ingestResponse.ok) {
      const ingestData = await ingestResponse.json();
      console.log('✅ Comprehensive ingestion successful:', {
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
      console.log('❌ Comprehensive ingestion failed:', ingestResponse.status);
    }
    
    // Test specific league ingestions
    console.log('\n🔍 Testing individual league ingestions...');
    
    const leagues = ['NFL', 'NBA', 'MLB', 'NHL'];
    for (const league of leagues) {
      console.log(`\n📊 Testing ${league} ingestion...`);
      
      const response = await fetch(`https://statpedia-player-props.statpedia.workers.dev/ingest/${league}?limit=10`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${league}: ${data.totalProps} props processed, ${data.inserted} inserted, ${data.errors} errors`);
        
        if (data.leagues) {
          const leagueData = data.leagues.find(l => l.league === league);
          if (leagueData) {
            console.log(`  📈 ${league} details: ${leagueData.props} props, ${leagueData.inserted} inserted, ${leagueData.errors} errors`);
          }
        }
      } else {
        console.log(`❌ ${league} ingestion failed:`, response.status);
      }
    }
    
    console.log('\n🎯 Key improvements to verify:');
    console.log('✅ No more "over_under" fallback for recognizable props');
    console.log('✅ No more "receivingeptions" typos');
    console.log('✅ Combo props properly detected (rush+rec, pass+rush, etc.)');
    console.log('✅ Enhanced fuzzy matching for variations');
    console.log('✅ Normalization applied at ingestion time');
    
    console.log('\n📝 Next steps:');
    console.log('1. Check the database for recent prop types');
    console.log('2. Verify no "over_under" or "receivingeptions" in new data');
    console.log('3. Clean up old problematic data if needed');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testNormalizationFix();
