#!/usr/bin/env node

/**
 * Test the frontend prop type filtering fix
 */

// Simulate the fixed frontend filtering logic
function testFixedFiltering() {
  console.log('🧪 Testing fixed frontend prop type filtering...\n');

  // Sample props from database
  const sampleProps = [
    { playerName: 'Patrick Mahomes', propType: 'passing_yards', line: 271.5 },
    { playerName: 'Josh Allen', propType: 'rushing_yards', line: 45.5 },
    { playerName: 'Cooper Kupp', propType: 'receptions', line: 6.5 },
    { playerName: 'Aaron Rodgers', propType: 'passing_touchdowns', line: 2.5 },
    { playerName: 'Saquon Barkley', propType: 'rushing_attempts', line: 18.5 }
  ];

  // Test different filter selections
  const filterTests = [
    'all',
    'passing yards',
    'rushing yards', 
    'receptions',
    'passing touchdowns',
    'rushing attempts'
  ];

  console.log('📊 Sample Props:');
  sampleProps.forEach(prop => {
    console.log(`  ${prop.playerName}: ${prop.propType} (${prop.line})`);
  });

  console.log('\n🔍 Filter Tests:');
  
  filterTests.forEach(propTypeFilter => {
    console.log(`\nFilter: "${propTypeFilter}"`);
    
    const filteredProps = sampleProps.filter(prop => {
      // This is the FIXED logic
      const matchesPropType = propTypeFilter === 'all' || 
        prop.propType.replace(/_/g, ' ').toLowerCase() === propTypeFilter.toLowerCase();
      
      return matchesPropType;
    });

    console.log(`  Matches: ${filteredProps.length}`);
    filteredProps.forEach(prop => {
      console.log(`    ✅ ${prop.playerName}: ${prop.propType} (${prop.line})`);
    });
  });

  console.log('\n✅ Fix Summary:');
  console.log('1. Changed exact match: prop.propType === propTypeFilter');
  console.log('2. To normalized match: prop.propType.replace(/_/g, " ").toLowerCase() === propTypeFilter.toLowerCase()');
  console.log('3. Updated dropdown generation to use normalized names');
  console.log('4. Now all prop types should show up correctly in the frontend!');
}

testFixedFiltering();
