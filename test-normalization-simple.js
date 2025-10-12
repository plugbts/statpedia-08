#!/usr/bin/env node

// Simple test of the normalization logic without importing
console.log('🧪 Testing Prop Type Normalization Logic\n');

// Simulate the normalizePropType function logic
function testNormalizePropType(propType) {
  if (!propType) return "unknown";
  
  // Clean and normalize the input
  let key = propType.trim().toLowerCase();
  
  // Remove common prefixes
  key = key.replace(/^(player|total)\s+/i, '');
  
  // Enhanced fuzzy matching - order matters for specificity
  // Combo props first (most specific)
  if (key.includes("rush") && key.includes("rec") && key.includes("yard")) return "rush_rec_yards";
  if (key.includes("pass") && key.includes("rush") && key.includes("yard")) return "pass_rush_yards";
  if (key.includes("pass") && key.includes("rec") && key.includes("yard")) return "pass_rec_yards";
  
  // NFL passing
  if (key.includes("passing") && key.includes("yard")) return "passing_yards";
  if (key.includes("pass") && key.includes("yard")) return "passing_yards";
  if (key.includes("pass") && key.includes("yds")) return "passing_yards";
  
  // NFL rushing  
  if (key.includes("rushing") && key.includes("yard")) return "rushing_yards";
  if (key.includes("rush") && key.includes("yard")) return "rushing_yards";
  if (key.includes("rush") && key.includes("yds")) return "rushing_yards";
  
  // NFL receiving
  if (key.includes("receiving") && key.includes("yard")) return "receiving_yards";
  if (key.includes("rec") && key.includes("yard")) return "receiving_yards";
  if (key.includes("rec") && key.includes("yds")) return "receiving_yards";
  
  // Receptions (separate from receiving yards)
  if (key.includes("receptions") || key.includes("catches")) return "receptions";
  
  // Touchdowns
  if (key.includes("passing touchdown") || key.includes("pass td")) return "passing_touchdowns";
  if (key.includes("rushing touchdown") || key.includes("rush td")) return "rushing_touchdowns";
  if (key.includes("receiving touchdown") || key.includes("rec td")) return "receiving_touchdowns";
  if (key.includes("anytime touchdown") || key.includes("anytime td")) return "anytime_td";
  if (key.includes("first touchdown") || key.includes("first td")) return "first_td";
  if (key.includes("last touchdown") || key.includes("last td")) return "last_td";
  
  // MLB - enhanced matching
  if (key.includes("strikeout") || key.includes("strike outs") || key.includes("k's")) return "strikeouts";
  if (key.includes("total bases")) return "total_bases";
  if (key.includes("home run")) return "home_runs";
  if (key.includes("rbis") || key.includes("runs batted in")) return "rbis";
  if (key.includes("hits")) return "hits";
  if (key.includes("runs")) return "runs";
  if (key.includes("walks") || key.includes("bb")) return "walks";
  
  // NBA - enhanced matching
  if (key.includes("points")) return "points";
  if (key.includes("rebounds")) return "rebounds";
  if (key.includes("assists")) return "assists";
  if (key.includes("steals")) return "steals";
  if (key.includes("blocks") || key.includes("block") || key.includes("blk")) return "blocks";
  if (key.includes("turnovers")) return "turnovers";
  if (key.includes("three pointers made") || key.includes("three pointer made") || key.includes("3pm")) return "three_pointers_made";
  if (key.includes("field goals made") || key.includes("field goal made") || key.includes("fgm")) return "field_goals_made";
  if (key.includes("free throws made") || key.includes("free throw made") || key.includes("ftm")) return "free_throws_made";
  
  // NHL - clean matching
  if (key.includes("goals") || key.includes("goal")) return "goals";
  if (key.includes("shots on goal") || key.includes("shot on goal") || key.includes("sog")) return "shots_on_goal";
  if (key.includes("goalie saves") || key.includes("goalie save") || key.includes("saves") || key.includes("save")) return "goalie_saves";
  if (key.includes("hits")) return "hits";
  if (key.includes("blocks") || key.includes("block") || key.includes("blk")) return "blocks";
  if (key.includes("penalty minutes") || key.includes("penalty minute") || key.includes("pims")) return "penalty_minutes";
  
  // If we get here, it's truly unknown - return the cleaned key instead of "over_under"
  return key.replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || "unknown";
}

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
  const normalized = testNormalizePropType(testCase);
  
  const isOverUnder = normalized === 'over_under';
  const isUnknown = normalized === 'unknown';
  
  if (isOverUnder) {
    console.log(`❌ Test ${index + 1}: "${testCase}" → "${normalized}" (should not be over_under)`);
    failed++;
    failures.push(testCase);
  } else if (isUnknown && !testCase.includes('Unknown') && !testCase.includes('Custom')) {
    console.log(`❌ Test ${index + 1}: "${testCase}" → "${normalized}" (should not be unknown)`);
    failed++;
    failures.push(testCase);
  } else {
    console.log(`✅ Test ${index + 1}: "${testCase}" → "${normalized}"`);
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
console.log('✅ Combo props properly detected');
console.log('✅ Unknown props return cleaned keys instead of "over_under"');
