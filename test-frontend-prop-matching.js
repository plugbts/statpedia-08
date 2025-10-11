#!/usr/bin/env node

/**
 * Test frontend prop type matching logic
 */

// Simulate the frontend filtering logic
function testPropMatching() {
  console.log('🧪 Testing frontend prop type matching...\n');

  // Sample prop types from database (with underscores)
  const databasePropTypes = [
    'passing_yards',
    'rushing_yards', 
    'rushing_attempts',
    'receptions',
    'passing_touchdowns',
    'passing_attempts',
    'passing_completions',
    'passing_interceptions'
  ];

  // Sample frontend filter options (might have spaces)
  const frontendFilterOptions = [
    'passing yards',
    'rushing yards',
    'rushing attempts', 
    'receptions',
    'passing touchdowns',
    'passing attempts',
    'passing completions',
    'passing interceptions'
  ];

  console.log('📊 Database Prop Types:');
  databasePropTypes.forEach(type => console.log(`  - ${type}`));

  console.log('\n🎯 Frontend Filter Options:');
  frontendFilterOptions.forEach(type => console.log(`  - ${type}`));

  console.log('\n🔍 Matching Test:');
  frontendFilterOptions.forEach(filterOption => {
    const exactMatches = databasePropTypes.filter(dbType => dbType === filterOption);
    const partialMatches = databasePropTypes.filter(dbType => 
      dbType.replace(/_/g, ' ').toLowerCase() === filterOption.toLowerCase()
    );
    
    console.log(`\nFilter: "${filterOption}"`);
    console.log(`  Exact matches: ${exactMatches.length} (${exactMatches.join(', ')})`);
    console.log(`  Normalized matches: ${partialMatches.length} (${partialMatches.join(', ')})`);
  });

  console.log('\n💡 Solution:');
  console.log('The frontend should use normalized matching instead of exact matching.');
  console.log('Replace: prop.propType === propTypeFilter');
  console.log('With: prop.propType.replace(/_/g, " ").toLowerCase() === propTypeFilter.toLowerCase()');
}

testPropMatching();
