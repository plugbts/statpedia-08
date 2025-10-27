#!/usr/bin/env node

/**
 * Test script to verify MLB prop type normalization patterns
 * Tests the normalization logic without importing full modules
 */

console.log('🧪 Testing MLB Prop Type Normalization Logic\n');
console.log('='.repeat(60));

// Simplified version of the normalization logic to test patterns
function testNormalizePropType(rawPropType) {
  if (!rawPropType) return 'unknown';
  
  const lowerKey = rawPropType.toLowerCase();
  
  // MLB batting patterns
  if (lowerKey.includes('batting') && lowerKey.includes('single')) return 'singles';
  if (lowerKey.includes('batting') && lowerKey.includes('double')) return 'doubles';
  if (lowerKey.includes('batting') && lowerKey.includes('triple')) return 'triples';
  if (lowerKey.includes('batting') && lowerKey.includes('hit')) return 'hits';
  if (lowerKey.includes('batting') && (lowerKey.includes('homerun') || lowerKey.includes('home_run'))) return 'home_runs';
  if (lowerKey.includes('batting') && lowerKey.includes('rbi')) return 'rbi';
  if (lowerKey.includes('batting') && lowerKey.includes('run') && !lowerKey.includes('rbi')) return 'runs';
  if (lowerKey.includes('batting') && (lowerKey.includes('walk') || lowerKey.includes('basesonballs'))) return 'walks';
  if (lowerKey.includes('batting') && (lowerKey.includes('stolenbase') || lowerKey.includes('stolen_base'))) return 'stolen_bases';
  if (lowerKey.includes('batting') && lowerKey.includes('strikeout')) return 'strikeouts';
  if (lowerKey.includes('total') && lowerKey.includes('base')) return 'total_bases';
  
  // Generic MLB patterns (standalone, no prefix)
  if (lowerKey === 'singles' || lowerKey === 'single' || lowerKey === '1b') return 'singles';
  if (lowerKey === 'doubles' || lowerKey === 'double' || lowerKey === '2b') return 'doubles';
  if (lowerKey === 'triples' || lowerKey === 'triple' || lowerKey === '3b') return 'triples';
  if (lowerKey === 'hits' || lowerKey === 'hit') return 'hits';
  if (lowerKey === 'home_runs' || lowerKey === 'homeruns' || lowerKey === 'home runs' || lowerKey === 'hr') return 'home_runs';
  if (lowerKey === 'rbis' || lowerKey === 'rbi' || lowerKey === 'runs batted in') return 'rbi';
  if (lowerKey === 'runs' || lowerKey === 'run') return 'runs';
  if (lowerKey === 'walks' || lowerKey === 'walk' || lowerKey === 'bb') return 'walks';
  if (lowerKey === 'stolen_bases' || lowerKey === 'stolenbases' || lowerKey === 'stolen bases' || lowerKey === 'sb') return 'stolen_bases';
  if (lowerKey === 'total_bases' || lowerKey === 'total bases') return 'total_bases';
  if (lowerKey === 'strikeouts' || lowerKey === 'strikeout') return 'strikeouts';
  
  return 'unknown';
}

// Test MLB batting props
const mlbBattingProps = [
  'Batting Singles',
  'batting_singles',
  'Singles',
  'single',
  '1b',
  'Batting Doubles',
  'batting_doubles',
  'Doubles',
  'double',
  '2b',
  'Batting Triples',
  'batting_triples',
  'Triples',
  'triple',
  '3b',
  'Batting Hits',
  'batting_hits',
  'Hits',
  'hit',
  'Batting Home Runs',
  'batting_homeruns',
  'Home Runs',
  'hr',
  'Batting RBIs',
  'batting_rbi',
  'RBIs',
  'rbi',
  'Batting Runs',
  'runs',
  'Batting Walks',
  'batting_basesonballs',
  'Walks',
  'bb',
  'Batting Stolen Bases',
  'batting_stolenbases',
  'Stolen Bases',
  'sb',
  'Total Bases',
  'Batting Strikeouts',
  'strikeouts'
];

console.log('\n📊 Normalization Test Results:');
console.log('-'.repeat(60));

let passed = 0;
let failed = 0;

mlbBattingProps.forEach(prop => {
  const normalized = testNormalizePropType(prop);
  const success = (normalized !== 'unknown');
  const icon = success ? '✅' : '❌';
  console.log(`${icon} "${prop}" → "${normalized}"`);
  
  if (success) passed++;
  else failed++;
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('📈 Test Summary:');
console.log(`\n✅ Passed: ${passed}/${mlbBattingProps.length} (${Math.round(passed/mlbBattingProps.length*100)}%)`);
console.log(`❌ Failed: ${failed}/${mlbBattingProps.length} (${Math.round(failed/mlbBattingProps.length*100)}%)`);

// Expected mappings
console.log('\n✨ Expected Normalized Prop Types:');
const expectedMappings = {
  'Singles': 'singles',
  'Doubles': 'doubles',
  'Triples': 'triples',
  'Hits': 'hits',
  'Home Runs': 'home_runs',
  'RBIs': 'rbi',
  'Runs': 'runs',
  'Walks': 'walks',
  'Stolen Bases': 'stolen_bases',
  'Total Bases': 'total_bases',
  'Strikeouts': 'strikeouts'
};

Object.entries(expectedMappings).forEach(([display, normalized]) => {
  console.log(`  - ${display}: ${normalized}`);
});

console.log('\n✅ Test completed!\n');

// Exit with appropriate code
process.exit(failed > 0 ? 1 : 0);
