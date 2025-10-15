#!/usr/bin/env tsx

/**
 * Automated Test Suite for Golden Dataset
 * 
 * Runs comprehensive tests against the golden dataset fixtures
 * to ensure all ingestion and enrichment features work correctly.
 */

import { testOneGameHarness } from './test-one-game-harness';

interface TestResult {
  league: string;
  passed: boolean;
  error?: string;
  duration: number;
}

async function runFixtureTests(): Promise<void> {
  console.log('🧪 Running fixture tests...\n');
  
  const leagues = ['NFL', 'NBA', 'MLB', 'NHL', 'WNBA'];
  const results: TestResult[] = [];
  
  for (const league of leagues) {
    const startTime = Date.now();
    console.log(`\n🏈 Testing ${league}...`);
    
    try {
      await testOneGameHarness(league);
      const duration = Date.now() - startTime;
      results.push({ league, passed: true, duration });
      console.log(`✅ ${league} test passed (${duration}ms)`);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      results.push({ 
        league, 
        passed: false, 
        error: error.message, 
        duration 
      });
      console.log(`❌ ${league} test failed (${duration}ms): ${error.message}`);
    }
  }
  
  // Print summary
  console.log('\n📊 Test Summary:');
  console.log('================');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.passed).forEach(result => {
      console.log(`  - ${result.league}: ${result.error}`);
    });
    process.exit(1);
  } else {
    console.log('\n🎉 All fixture tests passed!');
    process.exit(0);
  }
}

// Run tests
runFixtureTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
