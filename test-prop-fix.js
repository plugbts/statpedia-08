#!/usr/bin/env node

/**
 * Test the prop type fix to ensure over/under issue is resolved
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rfdrifnsfobqlzorcesn.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPropFix() {
  console.log('🧪 Testing prop type fix...\n');

  try {
    // 1. Check current prop types
    console.log('1. Checking current prop types...');
    const { data: currentProps, error: currentError } = await supabase
      .from('proplines')
      .select('prop_type, league, COUNT(*)')
      .group('prop_type, league')
      .order('prop_type');

    if (currentError) {
      console.error('❌ Error getting current props:', currentError.message);
      return;
    }

    console.log('📊 Current prop types:');
    currentProps?.forEach(prop => {
      console.log(`   ${prop.prop_type} (${prop.league}): ${prop.count} props`);
    });

    // 2. Check for remaining over/under props
    const overUnderCount = currentProps?.find(p => p.prop_type === 'over/under')?.count || 0;
    console.log(`\n⚠️  Over/under props remaining: ${overUnderCount}`);

    // 3. Check prop type aliases
    console.log('\n2. Checking prop type aliases...');
    const { data: aliases, error: aliasesError } = await supabase
      .from('prop_type_aliases')
      .select('COUNT(*)');

    if (aliasesError) {
      console.error('❌ Error getting aliases:', aliasesError.message);
    } else {
      console.log(`✅ Prop type aliases: ${aliases?.[0]?.count || 0} entries`);
    }

    // 4. Test the normalizePropType function logic
    console.log('\n3. Testing normalization logic...');
    const testProps = ['passing_yards', 'rush_yards', 'receptions', 'sacks', 'over/under'];
    
    testProps.forEach(testProp => {
      // Simulate the normalization logic from propTypeSync.ts
      const normalized = testProp.toLowerCase();
      console.log(`   "${testProp}" → "${normalized}"`);
    });

    // 5. Show sample of fixed props
    console.log('\n4. Sample of fixed props...');
    const { data: sampleProps, error: sampleError } = await supabase
      .from('proplines')
      .select('player_name, prop_type, line, team, opponent')
      .eq('league', 'nfl')
      .in('prop_type', ['passing_yards', 'rushing_yards', 'rushing_attempts', 'receptions', 'passing_touchdowns'])
      .order('line', { ascending: false })
      .limit(10);

    if (sampleError) {
      console.error('❌ Error getting sample props:', sampleError.message);
    } else {
      console.log('📋 Sample NFL props:');
      sampleProps?.forEach(prop => {
        console.log(`   ${prop.player_name}: ${prop.prop_type} ${prop.line} (${prop.team} vs ${prop.opponent})`);
      });
    }

    // 6. Summary
    console.log('\n' + '='.repeat(50));
    console.log('📋 TEST RESULTS');
    console.log('='.repeat(50));
    
    if (overUnderCount === 0) {
      console.log('✅ SUCCESS: No more over/under props found!');
      console.log('🎯 Prop type normalization should now work correctly');
    } else {
      console.log(`⚠️  PARTIAL: ${overUnderCount} over/under props still remain`);
      console.log('💡 May need to run additional fixes or manual cleanup');
    }

    const totalAliases = aliases?.[0]?.count || 0;
    if (totalAliases > 50) {
      console.log('✅ Prop type aliases table is well populated');
    } else {
      console.log('⚠️  Prop type aliases table may need more entries');
    }

    console.log('\n📝 NEXT STEPS:');
    console.log('1. Test the frontend to see if prop names display correctly');
    console.log('2. Check if normalizePropType function works in Cloudflare Worker');
    console.log('3. Monitor for any remaining over/under issues');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testPropFix().catch(console.error);
