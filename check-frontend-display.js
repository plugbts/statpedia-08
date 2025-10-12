#!/usr/bin/env node

// Check if the issue is in frontend display vs database storage

async function checkFrontendDisplay() {
  console.log('🔍 Checking Frontend Display vs Database Storage\n');

  // Test the frontend API endpoint to see what it's returning
  try {
    const response = await fetch('https://statpedia-player-props.statpedia.workers.dev/api/props?league=nfl&limit=10');
    
    if (response.ok) {
      const data = await response.json();
      console.log('📊 Frontend API Response:');
      console.log(JSON.stringify(data, null, 2));
      
      if (data.props && data.props.length > 0) {
        console.log('\n🎯 Prop Types in Frontend Response:');
        const propTypes = [...new Set(data.props.map(p => p.prop_type))];
        propTypes.forEach(pt => {
          const count = data.props.filter(p => p.prop_type === pt).length;
          console.log(`  ${pt}: ${count} props`);
        });
        
        // Check for problematic prop types
        const problematic = data.props.filter(p => 
          p.prop_type === 'Over/Under' || 
          p.prop_type === 'over_under' ||
          p.prop_type === 'unknown'
        );
        
        if (problematic.length > 0) {
          console.log('\n⚠️ PROBLEMATIC PROPS IN FRONTEND:');
          problematic.forEach(p => {
            console.log(`  ${p.player_name} | ${p.prop_type} | ${p.line}`);
          });
        } else {
          console.log('\n✅ No problematic prop types in frontend response!');
        }
      }
    } else {
      console.log('❌ Frontend API error:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Error checking frontend:', error.message);
  }
}

checkFrontendDisplay();
