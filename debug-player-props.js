// Debug script to test player props API integration
const API_KEY = '883b10f6c52a48b38b3b5cafa94d2189';
const BASE_URL = 'https://api.sportsdata.io/v3';

async function debugPlayerProps() {
  try {
    console.log('🔍 DEBUGGING PLAYER PROPS ISSUE...');
    
    // Test 1: Direct API call
    console.log('\n📡 Test 1: Direct API Call');
    const season = '2024';
    const week = '18';
    const endpoint = `${BASE_URL}/nfl/odds/json/PlayerPropsByWeek/${season}/${week}?key=${API_KEY}`;
    
    const response = await fetch(endpoint);
    console.log(`Response status: ${response.status}`);
    
    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    console.log(`✅ API returned ${data.length} items`);
    
    // Test 2: Check first few items
    console.log('\n📋 Test 2: Sample Data Analysis');
    const samples = data.slice(0, 5);
    
    samples.forEach((item, index) => {
      console.log(`\nItem ${index + 1}:`);
      console.log(`  Player: ${item.Name}`);
      console.log(`  Description: ${item.Description}`);
      console.log(`  Line: ${item.OverUnder}`);
      console.log(`  Over Odds: ${item.OverPayout}`);
      console.log(`  Under Odds: ${item.UnderPayout}`);
      console.log(`  Team: ${item.Team} vs ${item.Opponent}`);
      
      // Check if data is realistic
      const isRealisticLine = item.OverUnder > 0 && item.OverUnder < 1000;
      const isRealisticOdds = Math.abs(item.OverPayout) >= 100 && Math.abs(item.UnderPayout) >= 100;
      const hasValidName = item.Name && item.Name !== 'Unknown Player';
      
      console.log(`  ✅ Realistic Line: ${isRealisticLine}`);
      console.log(`  ✅ Realistic Odds: ${isRealisticOdds}`);
      console.log(`  ✅ Valid Name: ${hasValidName}`);
    });
    
    // Test 3: Check prop types
    console.log('\n📈 Test 3: Prop Types Analysis');
    const propTypes = [...new Set(data.map(item => item.Description))];
    console.log(`Total prop types: ${propTypes.length}`);
    
    const commonProps = propTypes.slice(0, 10);
    console.log('Common prop types:');
    commonProps.forEach(type => console.log(`  - ${type}`));
    
    // Test 4: Check for the specific issue (6.5 total touchdowns)
    console.log('\n🎯 Test 4: Looking for problematic data');
    const problematicProps = data.filter(item => 
      item.OverUnder === 6.5 && item.Description.toLowerCase().includes('touchdown')
    );
    
    if (problematicProps.length > 0) {
      console.log(`❌ Found ${problematicProps.length} problematic props:`);
      problematicProps.forEach(prop => {
        console.log(`  - ${prop.Name}: ${prop.Description} ${prop.OverUnder}`);
      });
    } else {
      console.log('✅ No problematic props found');
    }
    
    // Test 5: Check for realistic passing yards props
    console.log('\n🏈 Test 5: Passing Yards Analysis');
    const passingYardsProps = data.filter(item => 
      item.Description.toLowerCase().includes('passing yards')
    );
    
    if (passingYardsProps.length > 0) {
      console.log(`Found ${passingYardsProps.length} passing yards props:`);
      passingYardsProps.slice(0, 5).forEach(prop => {
        console.log(`  - ${prop.Name}: ${prop.OverUnder} yards (${prop.OverPayout}/${prop.UnderPayout})`);
      });
    } else {
      console.log('❌ No passing yards props found');
    }
    
  } catch (error) {
    console.error('❌ Debug Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugPlayerProps();
