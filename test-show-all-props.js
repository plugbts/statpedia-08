#!/usr/bin/env node

/**
 * Test that all props show up with the new default filter settings
 */

// Simulate the fixed frontend filtering logic with new defaults
function testShowAllProps() {
  console.log('🧪 Testing that all props show up by default...\n');

  // Sample props from database (including high-line passing yards)
  const sampleProps = [
    { playerName: 'Patrick Mahomes', propType: 'passing_yards', line: 271.5, overOdds: -110, underOdds: -110 },
    { playerName: 'Josh Allen', propType: 'rushing_yards', line: 45.5, overOdds: -115, underOdds: -105 },
    { playerName: 'Cooper Kupp', propType: 'receptions', line: 6.5, overOdds: -120, underOdds: -100 },
    { playerName: 'Aaron Rodgers', propType: 'passing_touchdowns', line: 2.5, overOdds: null, underOdds: -110 },
    { playerName: 'Saquon Barkley', propType: 'rushing_attempts', line: 18.5, overOdds: -110, underOdds: -110 }
  ];

  // NEW DEFAULT FILTER VALUES (after fix)
  const defaultFilters = {
    searchQuery: '',
    propTypeFilter: 'all',
    minConfidence: 0,
    minEV: 0,
    showOnlyPositiveEV: false,
    minLine: 0,
    maxLine: 1000, // Increased from 100
    overUnderFilter: 'both', // Changed from 'over'
    useOddsFilter: false, // Changed from true
    minOdds: -175,
    maxOdds: 500
  };

  console.log('📊 Sample Props:');
  sampleProps.forEach(prop => {
    console.log(`  ${prop.playerName}: ${prop.propType} (${prop.line}) - Over: ${prop.overOdds}, Under: ${prop.underOdds}`);
  });

  console.log('\n🎯 NEW DEFAULT FILTERS:');
  Object.entries(defaultFilters).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });

  console.log('\n🔍 Filtering Test with NEW defaults:');
  
  const filteredProps = sampleProps.filter(prop => {
    // Apply all the same filters as the frontend
    const matchesSearch = defaultFilters.searchQuery === '' || 
                         prop.playerName.toLowerCase().includes(defaultFilters.searchQuery.toLowerCase()) ||
                         prop.propType.toLowerCase().includes(defaultFilters.searchQuery.toLowerCase());
    
    const matchesPropType = defaultFilters.propTypeFilter === 'all' || 
      prop.propType.replace(/_/g, ' ').toLowerCase() === defaultFilters.propTypeFilter.toLowerCase();
    
    const matchesConfidence = (prop.confidence || 0.5) >= (defaultFilters.minConfidence / 100);
    const matchesEV = (prop.expectedValue || 0) >= (defaultFilters.minEV / 100);
    const matchesPositiveEV = !defaultFilters.showOnlyPositiveEV || (prop.expectedValue || 0) >= 0;
    const matchesLine = prop.line >= defaultFilters.minLine && prop.line <= defaultFilters.maxLine;
    
    // Odds range filter (now DISABLED by default)
    const overOdds = prop.overOdds || 0;
    const underOdds = prop.underOdds || 0;
    const matchesOddsRange = !defaultFilters.useOddsFilter || 
      ((overOdds >= defaultFilters.minOdds && overOdds <= defaultFilters.maxOdds) || 
       (underOdds >= defaultFilters.minOdds && underOdds <= defaultFilters.maxOdds));
    
    // Over/Under filter (now shows BOTH by default)
    const matchesOverUnder = defaultFilters.overUnderFilter === 'both' || 
      (defaultFilters.overUnderFilter === 'over' && overOdds !== null && overOdds !== undefined && !isNaN(Number(overOdds))) || 
      (defaultFilters.overUnderFilter === 'under' && underOdds !== null && underOdds !== undefined && !isNaN(Number(underOdds)));
    
    const passes = matchesSearch && matchesPropType && matchesConfidence && matchesEV && matchesPositiveEV && matchesLine && matchesOddsRange && matchesOverUnder;
    
    if (!passes) {
      console.log(`❌ ${prop.playerName} filtered out: search=${matchesSearch}, type=${matchesPropType}, line=${matchesLine}, overUnder=${matchesOverUnder}, odds=${matchesOddsRange}`);
    }
    
    return passes;
  });

  console.log(`\n✅ RESULTS: ${filteredProps.length}/${sampleProps.length} props passed filters`);
  filteredProps.forEach(prop => {
    console.log(`  ✅ ${prop.playerName}: ${prop.propType} (${prop.line})`);
  });

  console.log('\n🎉 SUMMARY OF CHANGES:');
  console.log('1. ✅ overUnderFilter: "over" → "both" (shows all props, not just over bets)');
  console.log('2. ✅ maxLine: 100 → 1000 (includes high-line passing yards props)');
  console.log('3. ✅ useOddsFilter: true → false (disables odds filtering by default)');
  console.log('4. ✅ propTypeFilter: fixed matching logic (underscores vs spaces)');
  console.log('\n🚀 Now ALL props should appear by default!');
}

testShowAllProps();
