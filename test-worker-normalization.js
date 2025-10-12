#!/usr/bin/env node

// Test the worker's normalization directly
async function testWorkerNormalization() {
  console.log('🧪 Testing Worker Normalization Directly\n');

  // Test cases that should NOT return "Over/Under" or "over_under"
  const testCases = [
    { marketName: "Player Passing Yards", expected: "passing_yards" },
    { marketName: "QB Pass Yds", expected: "passing_yards" },
    { marketName: "Rushing Yards", expected: "rushing_yards" },
    { marketName: "Receiving Yards", expected: "receiving_yards" },
    { marketName: "Receptions", expected: "receptions" },
    { marketName: "Rush + Rec Yards", expected: "rush_rec_yards" },
    { marketName: "Pass + Rush Yards", expected: "pass_rush_yards" },
    { marketName: "Passing TDs", expected: "passing_tds" },
    { marketName: "Strikeouts", expected: "strikeouts" },
    { marketName: "Hits", expected: "hits" },
    { marketName: "Home Runs", expected: "home_runs" },
    { marketName: "Total Bases", expected: "total_bases" }
  ];

  console.log('Testing worker normalization endpoint...');
  
  for (const testCase of testCases) {
    try {
      // Test the worker's diagnostic endpoint with a mock odd
      const testOdd = {
        playerName: "Test Player",
        marketName: testCase.marketName,
        line: 100.5,
        odds: -110,
        overUnder: "over",
        sportsbook: "test",
        league: "nfl"
      };

      const response = await fetch('https://statpedia-player-props.statpedia.workers.dev/debug-mapping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ odds: [testOdd] })
      });

      if (response.ok) {
        const result = await response.json();
        const mappedProp = result.mapped?.[0];
        
        if (mappedProp) {
          const actual = mappedProp.prop_type;
          const success = actual === testCase.expected && actual !== 'Over/Under' && actual !== 'over_under';
          
          if (success) {
            console.log(`✅ "${testCase.marketName}" → "${actual}"`);
          } else {
            console.log(`❌ "${testCase.marketName}" → "${actual}" (expected "${testCase.expected}")`);
          }
        } else {
          console.log(`⚠️ "${testCase.marketName}" → No mapping returned`);
        }
      } else {
        console.log(`❌ "${testCase.marketName}" → Worker error: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ "${testCase.marketName}" → Error: ${error.message}`);
    }
  }

  // Test a small ingestion to see what happens
  console.log('\n🧪 Testing Small Ingestion...');
  try {
    const response = await fetch('https://statpedia-player-props.statpedia.workers.dev/ingest/NFL?limit=5');
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Ingestion successful');
      console.log('Result:', JSON.stringify(result, null, 2));
    } else {
      console.log('❌ Ingestion failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Ingestion error:', error.message);
  }
}

testWorkerNormalization();
