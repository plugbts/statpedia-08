#!/usr/bin/env node

// Test the expanded normalizePropType function with comprehensive coverage

const testCases = [
  // NFL - Passing variations
  { input: "Player Passing Yards", expected: "passing_yards" },
  { input: "QB Pass Yds", expected: "passing_yards" },
  { input: "Passing Yards", expected: "passing_yards" },
  { input: "Pass Yds", expected: "passing_yards" },
  { input: "QB Passing Yards", expected: "passing_yards" },
  
  // NFL - Rushing variations
  { input: "Rushing Yards", expected: "rushing_yards" },
  { input: "Rush Yds", expected: "rushing_yards" },
  { input: "Player Rushing Yards", expected: "rushing_yards" },
  
  // NFL - Receiving variations
  { input: "Receiving Yards", expected: "receiving_yards" },
  { input: "Rec Yds", expected: "receiving_yards" },
  { input: "Player Receiving Yards", expected: "receiving_yards" },
  
  // NFL - Receptions variations
  { input: "Receptions", expected: "receptions" },
  { input: "Catches", expected: "receptions" },
  { input: "Rec", expected: "receptions" },
  
  // NFL - Combo props
  { input: "Rush + Rec Yards", expected: "rush_rec_yards" },
  { input: "Rush+Rec Yards", expected: "rush_rec_yards" },
  { input: "Pass + Rush Yards", expected: "pass_rush_yards" },
  { input: "Pass+Rush Yards", expected: "pass_rush_yards" },
  { input: "QB Rush Yards", expected: "pass_rush_yards" },
  
  // NFL - Touchdowns
  { input: "Passing TDs", expected: "passing_tds" },
  { input: "Pass TDs", expected: "passing_tds" },
  { input: "QB TDs", expected: "passing_tds" },
  { input: "Rushing TDs", expected: "rushing_tds" },
  { input: "Rush TDs", expected: "rushing_tds" },
  { input: "Receiving TDs", expected: "receiving_tds" },
  { input: "Rec TDs", expected: "receiving_tds" },
  { input: "Anytime TD", expected: "anytime_td" },
  
  // MLB - Strikeouts
  { input: "Strikeouts", expected: "strikeouts" },
  { input: "Ks", expected: "strikeouts" },
  { input: "K", expected: "strikeouts" },
  { input: "Strike Out", expected: "strikeouts" },
  
  // MLB - Hits
  { input: "Hits", expected: "hits" },
  { input: "Total Hits", expected: "hits" },
  
  // MLB - Home Runs
  { input: "Home Runs", expected: "home_runs" },
  { input: "HR", expected: "home_runs" },
  { input: "Homer", expected: "home_runs" },
  
  // MLB - Other
  { input: "Total Bases", expected: "total_bases" },
  { input: "RBIs", expected: "rbis" },
  { input: "RBI", expected: "rbis" },
  { input: "Hits Allowed", expected: "hits_allowed" },
  { input: "Earned Runs", expected: "earned_runs" },
  { input: "ER", expected: "earned_runs" },
  
  // Edge cases that should NOT match
  { input: "Random Stat", expected: "unknown" },
  { input: "", expected: "unknown" },
  { input: null, expected: "unknown" },
];

// Mock the normalizePropType function based on the FIXED expanded logic
function normalizePropType(raw) {
  if (!raw) return "unknown";
  const key = raw.trim().toLowerCase();

  // --- NFL - Expanded Coverage (order matters: most specific first) ---
  
  // Combo props FIRST (before individual stat patterns)
  if ((key.includes("rush") && key.includes("rec")) || key.includes("rush+rec") || key.includes("rush + rec")) return "rush_rec_yards";
  if ((key.includes("pass") && key.includes("rush")) || key.includes("pass+rush") || key.includes("pass + rush")) return "pass_rush_yards";
  if ((key.includes("pass") && key.includes("rec")) || key.includes("pass+rec") || key.includes("pass + rec")) return "pass_rec_yards";

  // Touchdowns (before individual stat patterns)
  if (key.includes("anytime") && (key.includes("td") || key.includes("touchdown"))) return "anytime_td";
  if (key.includes("first") && (key.includes("td") || key.includes("touchdown"))) return "first_td";
  if (key.includes("last") && (key.includes("td") || key.includes("touchdown"))) return "last_td";
  if ((key.includes("pass") || key.includes("qb")) && (key.includes("td") || key.includes("touchdown"))) return "passing_tds";
  if (key.includes("rush") && (key.includes("td") || key.includes("touchdown"))) return "rushing_tds";
  if ((key.includes("receiv") || key.includes("rec")) && (key.includes("td") || key.includes("touchdown"))) return "receiving_tds";
  
  // Individual stat patterns (after combos and TDs)
  if ((key.includes("pass") || key.includes("qb")) && (key.includes("yard") || key.includes("yd"))) return "passing_yards";
  if (key.includes("rush") && (key.includes("yard") || key.includes("yd"))) return "rushing_yards";
  if ((key.includes("receiv") || key.includes("rec")) && (key.includes("yard") || key.includes("yd"))) return "receiving_yards";
  
  // Receptions (must be after receiving yards check)
  if (key.includes("receptions") || key.includes("catches")) return "receptions";
  if (key.includes("rec") && !key.includes("yard") && !key.includes("yd") && !key.includes("td")) return "receptions";

  // Other NFL stats - catch all variations
  if (key.includes("completions") || key.includes("completion")) return "completions";
  if (key.includes("attempts") || key.includes("attempt")) return "pass_attempts";
  if (key.includes("interceptions") || key.includes("interception") || key.includes("int")) return "interceptions";

  if (key.includes("longest") && key.includes("completion")) return "longest_completion";
  if (key.includes("longest") && key.includes("reception")) return "longest_reception";
  if (key.includes("longest") && key.includes("rush")) return "longest_rush";

  // --- MLB - Expanded Coverage ---
  if (key.includes("strikeout") || key.includes("strike out") || key === "ks" || key === "k") return "strikeouts";
  if (key.includes("total bases") || key.includes("total base")) return "total_bases";
  if (key.includes("home run") || key.includes("homer") || key.includes("hr")) return "home_runs";
  if (key.includes("rbis") || key.includes("rbi") || key.includes("runs batted in")) return "rbis";
  if (key.includes("hits allowed") || key.includes("hits allow")) return "hits_allowed";
  if (key.includes("earned runs") || key.includes("earned run") || key.includes("er")) return "earned_runs";
  if (key.includes("outs recorded") || key.includes("out recorded")) return "outs_recorded";
  if (key.includes("hits") && !key.includes("allowed")) return "hits";

  return "unknown"; // only fallback if truly exotic
}

console.log("🧪 Testing Expanded normalizePropType Function\n");

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  const result = normalizePropType(test.input);
  const success = result === test.expected;
  
  if (success) {
    console.log(`✅ Test ${index + 1}: "${test.input}" → "${result}"`);
    passed++;
  } else {
    console.log(`❌ Test ${index + 1}: "${test.input}" → "${result}" (expected "${test.expected}")`);
    failed++;
  }
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log("🎉 All tests passed! The expanded normalizer should catch many more prop variations.");
} else {
  console.log("⚠️  Some tests failed. The normalizer may need further refinement.");
}
