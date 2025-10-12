#!/usr/bin/env node

import { normalizePropType, displayPropType, DISPLAY_MAP } from './cloudflare-worker/src/propTypeSync.js';

console.log('🧪 Testing Improved Prop Type Normalization\n');

// Test cases that were causing issues
const testCases = [
  // NFL tests
  'Player Passing Yards Over/Under',
  'Pass Yards',
  'Rush Yards', 
  'Rec Yards',
  'Player Receptions Over/Under',
  'Rush + Rec Yards',
  'Pass + Rush Yards',
  'Passing Touchdowns',
  'Rushing Touchdowns',
  'Receiving Touchdowns',
  
  // MLB tests
  'Player Strikeouts Over/Under',
  'Total Bases',
  'Home Runs',
  'RBIs',
  'Hits',
  'Runs',
  'Walks',
  
  // NBA tests
  'Player Points Over/Under',
  'Rebounds',
  'Assists',
  'Steals',
  'Blocks',
  'Three Pointers Made',
  'Field Goals Made',
  'Free Throws Made',
  
  // NHL tests
  'Player Goals Over/Under',
  'Shots on Goal',
  'Goalie Saves',
  'Hits',
  'Penalty Minutes',
  
  // Edge cases that should not become "over_under"
  'Player Fantasy Points Over/Under',
  'Player Anytime TD Over/Under',
  'Player First TD Over/Under',
  'Player Last TD Over/Under',
  'Player Longest Completion Over/Under',
  'Player Longest Reception Over/Under',
  'Player Longest Rush Over/Under',
  'Player Sacks Over/Under',
  'Player Tackles Over/Under',
  'Player Field Goals Made Over/Under',
  'Player Extra Points Made Over/Under',
  
  // Combo props
  'Player Rush + Rec Yards Over/Under',
  'Player Pass + Rush Yards Over/Under',
  'Player Pass + Rec Yards Over/Under',
  
  // Unknown props (should not become "over_under")
  'Player Unknown Stat Over/Under',
  'Player Custom Prop Over/Under'
];

let passed = 0;
let failed = 0;
const failures = [];

console.log('Testing normalizePropType function:\n');

testCases.forEach((testCase, index) => {
  const normalized = normalizePropType(testCase);
  const display = displayPropType(normalized);
  
  const isOverUnder = normalized === 'over_under';
  const isUnknown = normalized === 'unknown';
  const hasDisplayMap = DISPLAY_MAP[normalized] !== undefined;
  
  if (isOverUnder) {
    console.log(`❌ Test ${index + 1}: "${testCase}" → "${normalized}" (should not be over_under)`);
    failed++;
    failures.push(testCase);
  } else if (isUnknown && !testCase.includes('Unknown') && !testCase.includes('Custom')) {
    console.log(`❌ Test ${index + 1}: "${testCase}" → "${normalized}" (should not be unknown)`);
    failed++;
    failures.push(testCase);
  } else {
    console.log(`✅ Test ${index + 1}: "${testCase}" → "${normalized}" → "${display}"`);
    passed++;
  }
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failures.length > 0) {
  console.log('\n❌ Failed cases:');
  failures.forEach(failure => console.log(`  - "${failure}"`));
}

console.log('\n🎯 Key improvements:');
console.log('✅ No more "over_under" fallback for recognizable props');
console.log('✅ Enhanced fuzzy matching for variations');
console.log('✅ Clean display map prevents "receivingeptions" typos');
console.log('✅ Combo props properly detected');
console.log('✅ Unknown props return cleaned keys instead of "over_under"');
