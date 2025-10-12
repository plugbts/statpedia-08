#!/usr/bin/env node

console.log('🔍 Monitoring Prop Ingestion for Issues\n');

async function monitorIngestion() {
  try {
    console.log('📊 Testing worker ingestion...');
    
    // Test small ingestion to see current prop types
    const response = await fetch('https://statpedia-player-props.statpedia.workers.dev/ingest/NFL?limit=10', {
      method: 'POST'
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Ingestion successful:', {
        success: data.success,
        totalProps: data.totalProps,
        inserted: data.inserted,
        errors: data.errors
      });
      
      if (data.leagues) {
        const nflData = data.leagues.find(l => l.league === 'NFL');
        if (nflData) {
          console.log(`📈 NFL: ${nflData.props} props, ${nflData.inserted} inserted, ${nflData.errors} errors`);
        }
      }
    } else {
      console.log('❌ Ingestion failed:', response.status);
    }
    
    console.log('\n🎯 Monitoring Checklist:');
    console.log('✅ No "over_under" props should appear');
    console.log('✅ No "receivingeptions" typos should appear');
    console.log('✅ Props should have clean names like "passing_yards", "receiving_yards"');
    console.log('✅ Combo props should work: "rush_rec_yards", "pass_rush_yards"');
    console.log('✅ Only truly exotic props should be "unknown"');
    
    console.log('\n📝 If issues persist:');
    console.log('1. Check worker logs for normalization errors');
    console.log('2. Verify database cleanup was successful');
    console.log('3. Check for any remaining direct prop.propType usage');
    
  } catch (error) {
    console.error('❌ Monitoring error:', error.message);
  }
}

monitorIngestion();
