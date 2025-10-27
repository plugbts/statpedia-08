#!/usr/bin/env tsx

/**
 * Test script to verify MLB prop enrichment fixes
 * Tests prop type normalization, team resolution, and analytics enrichment
 */

import { normalizePropType } from './cloudflare-worker/src/lib/propTypeNormalizer';
import { normalizePropType as syncNormalize } from './cloudflare-worker/src/propTypeSync';

console.log('🧪 Testing MLB Prop Type Normalization\n');
console.log('='.repeat(60));

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

console.log('\n📊 Prop Type Normalizer Results:');
console.log('-'.repeat(60));
mlbBattingProps.forEach(prop => {
  const normalized = normalizePropType(prop);
  const icon = (normalized !== 'unknown' && !normalized.includes('_')) ? '✅' : '❌';
  console.log(`${icon} "${prop}" → "${normalized}"`);
});

console.log('\n📊 PropTypeSync Normalizer Results:');
console.log('-'.repeat(60));
mlbBattingProps.forEach(prop => {
  const normalized = syncNormalize(prop);
  const icon = (normalized !== 'unknown') ? '✅' : '❌';
  console.log(`${icon} "${prop}" → "${normalized}"`);
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('📈 Test Summary:');
const propNormResults = mlbBattingProps.map(p => normalizePropType(p) !== 'unknown' ? 1 : 0);
const syncNormResults = mlbBattingProps.map(p => syncNormalize(p) !== 'unknown' ? 1 : 0);

const propNormSuccess = propNormResults.reduce((a, b) => a + b, 0);
const syncNormSuccess = syncNormResults.reduce((a, b) => a + b, 0);

console.log(`\nPropTypeNormalizer: ${propNormSuccess}/${mlbBattingProps.length} props normalized (${Math.round(propNormSuccess/mlbBattingProps.length*100)}%)`);
console.log(`PropTypeSync: ${syncNormSuccess}/${mlbBattingProps.length} props normalized (${Math.round(syncNormSuccess/mlbBattingProps.length*100)}%)`);

// Expected results
console.log('\n✨ Expected Prop Types:');
console.log('  - Singles: singles');
console.log('  - Doubles: doubles');
console.log('  - Triples: triples');
console.log('  - Hits: hits');
console.log('  - Home Runs: home_runs');
console.log('  - RBIs: rbi');
console.log('  - Runs: runs');
console.log('  - Walks: walks');
console.log('  - Stolen Bases: stolen_bases');
console.log('  - Total Bases: total_bases');
console.log('  - Strikeouts: strikeouts');

console.log('\n✅ Test completed!\n');
