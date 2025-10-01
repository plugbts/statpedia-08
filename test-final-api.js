// Final comprehensive test of the SportsDataIO API service
import { SportsDataIOAPI } from './src/services/sportsdataio-api.ts';

async function testFinalAPI() {
  try {
    console.log('🧪 Final comprehensive test of SportsDataIO API service...');
    
    const api = new SportsDataIOAPI();
    
    // Test NFL player props
    console.log('\n🏈 Testing NFL Player Props...');
    const nflProps = await api.getPlayerProps('nfl');
    
    console.log(`📊 NFL Props returned: ${nflProps.length} items`);
    
    if (nflProps.length > 0) {
      console.log('\n📋 Sample NFL Props:');
      nflProps.slice(0, 5).forEach((prop, index) => {
        console.log(`  ${index + 1}. ${prop.playerName} - ${prop.propType}`);
        console.log(`     Line: ${prop.line}, Over: ${prop.overOdds}, Under: ${prop.underOdds}`);
        console.log(`     Team: ${prop.team} vs ${prop.opponent}`);
        console.log(`     Game: ${prop.gameDate} ${prop.gameTime}`);
        console.log('');
      });
      
      // Validate data quality
      const hasRealisticLines = nflProps.some(prop => prop.line > 0 && prop.line < 1000);
      const hasRealisticOdds = nflProps.some(prop => Math.abs(prop.overOdds) >= 100 && Math.abs(prop.underOdds) >= 100);
      const hasValidNames = nflProps.some(prop => prop.playerName && prop.playerName !== 'Unknown Player');
      
      console.log('✅ Data Quality Checks:');
      console.log(`  Realistic Lines: ${hasRealisticLines ? '✅' : '❌'}`);
      console.log(`  Realistic Odds: ${hasRealisticOdds ? '✅' : '❌'}`);
      console.log(`  Valid Player Names: ${hasValidNames ? '✅' : '❌'}`);
      
      // Check for specific prop types
      const propTypes = [...new Set(nflProps.map(prop => prop.propType))];
      console.log(`\n📈 Prop Types Available: ${propTypes.length}`);
      propTypes.slice(0, 10).forEach(type => console.log(`  - ${type}`));
      
    } else {
      console.log('❌ No NFL props returned');
    }
    
  } catch (error) {
    console.error('❌ Error in final test:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Since we can't import ES modules in Node.js directly, let's test the API endpoint directly
async function testAPIDirectly() {
  try {
    console.log('🧪 Testing API endpoint directly...');
    
    const API_KEY = '883b10f6c52a48b38b3b5cafa94d2189';
    const BASE_URL = 'https://api.sportsdata.io/v3';
    const season = '2024';
    const week = '18';
    const endpoint = `${BASE_URL}/nfl/odds/json/PlayerPropsByWeek/${season}/${week}?key=${API_KEY}`;
    
    const response = await fetch(endpoint);
    const data = await response.json();
    
    console.log(`📊 Direct API returned: ${data.length} items`);
    
    if (data.length > 0) {
      // Test our parsing logic
      const sample = data[0];
      console.log('\n📋 Sample API Response:');
      console.log(`  Player: ${sample.Name}`);
      console.log(`  Description: ${sample.Description}`);
      console.log(`  Line: ${sample.OverUnder}`);
      console.log(`  Over Odds: ${sample.OverPayout}`);
      console.log(`  Under Odds: ${sample.UnderPayout}`);
      console.log(`  Team: ${sample.Team} vs ${sample.Opponent}`);
      
      // Test field validation
      const hasValidFields = sample.Name && sample.Description && sample.OverUnder && sample.OverPayout && sample.UnderPayout;
      console.log(`\n✅ Field Validation: ${hasValidFields ? '✅ All fields present' : '❌ Missing fields'}`);
      
      // Test realistic values
      const hasRealisticLine = sample.OverUnder > 0 && sample.OverUnder < 1000;
      const hasRealisticOdds = Math.abs(sample.OverPayout) >= 100 && Math.abs(sample.UnderPayout) >= 100;
      console.log(`✅ Realistic Line: ${hasRealisticLine ? '✅' : '❌'} (${sample.OverUnder})`);
      console.log(`✅ Realistic Odds: ${hasRealisticOdds ? '✅' : '❌'} (${sample.OverPayout}/${sample.UnderPayout})`);
    }
    
  } catch (error) {
    console.error('❌ Error in direct API test:', error.message);
  }
}

testAPIDirectly();
