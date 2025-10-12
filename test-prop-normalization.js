#!/usr/bin/env node

// Test the prop type normalization function directly
function normalizePropType(propType) {
  if (!propType) return "unknown";
  
  let key = propType.trim().toLowerCase();
  key = key.replace(/^(player|total)\s+/i, '');
  
  // Fuzzy contains matching (catch variations) - order matters for specificity
  // NFL
  if (key.includes("passing yards")) return "passing_yards";
  if (key.includes("rushing yards")) return "rushing_yards";
  if (key.includes("receiving yards")) return "receiving_yards";
  if (key.includes("receptions")) return "receptions";
  if (key.includes("strikeouts")) return "strikeouts";
  if (key.includes("total bases")) return "total_bases";
  if (key.includes("home runs")) return "home_runs";
  if (key.includes("rbis")) return "rbis";
  
  // Combo props - check these before individual terms
  if (key.includes("rush") && key.includes("rec")) return "rush_rec_yards";
  if (key.includes("pass") && key.includes("rush")) return "pass_rush_yards";
  if (key.includes("pass") && key.includes("rec")) return "pass_rec_yards";
  
  // Touchdowns
  if (key.includes("passing touchdown")) return "passing_touchdowns";
  if (key.includes("rushing touchdown")) return "rushing_touchdowns";
  if (key.includes("receiving touchdown")) return "receiving_touchdowns";
  if (key.includes("anytime touchdown")) return "anytime_td";
  if (key.includes("first touchdown")) return "first_td";
  if (key.includes("last touchdown")) return "last_td";
  
  // Other NFL
  if (key.includes("completions")) return "completions";
  if (key.includes("attempts")) return "pass_attempts";
  if (key.includes("interceptions")) return "passing_interceptions";
  
  // MLB
  if (key.includes("hits")) return "hits";
  if (key.includes("runs")) return "runs";
  if (key.includes("walks")) return "walks";
  if (key.includes("stolen bases")) return "stolen_bases";
  if (key.includes("outs recorded")) return "outs_recorded";
  if (key.includes("earned runs")) return "earned_runs";
  
  // NBA
  if (key.includes("points")) return "points";
  if (key.includes("rebounds")) return "rebounds";
  if (key.includes("assists")) return "assists";
  if (key.includes("steals")) return "steals";
  if (key.includes("blocks")) return "blocks";
  if (key.includes("turnovers")) return "turnovers";
  
  // NHL
  if (key.includes("goals")) return "goals";
  if (key.includes("shots")) return "shots";
  if (key.includes("saves")) return "saves";
  if (key.includes("hits")) return "hits";
  if (key.includes("blocks")) return "blocks";
  if (key.includes("penalty minutes")) return "penalty_minutes";

  return "over_under";
}

console.log('🧪 Testing Prop Type Normalization...\n');

const testCases = [
  // NFL tests
  { input: 'Bo Nix Passing Yards Over/Under', expected: 'passing_yards' },
  { input: 'Player Passing Yards', expected: 'passing_yards' },
  { input: 'Pass Yards', expected: 'passing_yards' },
  { input: 'QB Passing Yards', expected: 'passing_yards' },
  { input: 'Sam Darnold Passing Touchdowns Over/Under', expected: 'passing_touchdowns' },
  { input: 'Chase Brown Receiving Yards Over/Under', expected: 'receiving_yards' },
  { input: 'Michael Penix Rushing Yards Over/Under', expected: 'rushing_yards' },
  { input: 'Rush + Rec Yards', expected: 'rush_rec_yards' },
  { input: 'Pass + Rush Yards', expected: 'pass_rush_yards' },
  { input: 'Anytime Touchdown', expected: 'anytime_td' },
  { input: 'First Touchdown', expected: 'first_td' },
  { input: 'Receptions', expected: 'receptions' },
  
  // MLB tests
  { input: 'Strikeouts', expected: 'strikeouts' },
  { input: 'Total Bases', expected: 'total_bases' },
  { input: 'Home Runs', expected: 'home_runs' },
  { input: 'RBIs', expected: 'rbis' },
  { input: 'Hits', expected: 'hits' },
  { input: 'Stolen Bases', expected: 'stolen_bases' },
  
  // NBA tests
  { input: 'Points', expected: 'points' },
  { input: 'Rebounds', expected: 'rebounds' },
  { input: 'Assists', expected: 'assists' },
  
  // NHL tests
  { input: 'Goals', expected: 'goals' },
  { input: 'Shots', expected: 'shots' },
  { input: 'Saves', expected: 'saves' },
  
  // Edge cases
  { input: 'Unknown Prop Type', expected: 'over_under' },
  { input: '', expected: 'unknown' },
  { input: null, expected: 'unknown' },
];

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const result = normalizePropType(testCase.input);
  const success = result === testCase.expected;
  
  if (success) {
    passed++;
    console.log(`✅ Test ${index + 1}: "${testCase.input}" → "${result}"`);
  } else {
    failed++;
    console.log(`❌ Test ${index + 1}: "${testCase.input}" → "${result}" (expected "${testCase.expected}")`);
  }
});

console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('🎉 All prop type normalization tests passed!');
} else {
  console.log('⚠️  Some tests failed - check the normalization logic');
}