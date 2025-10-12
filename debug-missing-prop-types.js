#!/usr/bin/env node

/**
 * Debug why receiving yards, receptions, and combo props aren't appearing
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rfdrifnsfobqlzorcesn.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugMissingPropTypes() {
  console.log('🔍 Debugging missing prop types...\n');

  try {
    // 1. Check all NFL prop types in database
    console.log('1. All NFL prop types in database:');
    const { data: allNFLProps, error: nflError } = await supabase
      .from('proplines')
      .select('prop_type, COUNT(*) as count')
      .eq('league', 'nfl')
      .order('count', { ascending: false });

    if (nflError) {
      console.error('❌ Error getting NFL props:', nflError.message);
    } else if (allNFLProps && allNFLProps.length > 0) {
      console.log('   Prop types with counts:');
      allNFLProps.forEach(prop => {
        console.log(`   ${prop.prop_type}: ${prop.count} props`);
      });
    }

    // 2. Specifically look for receiving-related props
    console.log('\n2. Receiving-related props:');
    const receivingTypes = ['receiving', 'reception', 'yards'];
    for (const type of receivingTypes) {
      const { data: receivingProps, error: receivingError } = await supabase
        .from('proplines')
        .select('prop_type, COUNT(*) as count')
        .eq('league', 'nfl')
        .ilike('prop_type', `%${type}%`)
        .order('count', { ascending: false });

      if (receivingError) {
        console.error(`❌ Error getting ${type} props:`, receivingError.message);
      } else if (receivingProps && receivingProps.length > 0) {
        console.log(`   ${type} props:`);
        receivingProps.forEach(prop => {
          console.log(`     ${prop.prop_type}: ${prop.count} props`);
        });
      } else {
        console.log(`   No ${type} props found`);
      }
    }

    // 3. Look for combo props (pass + rush, etc.)
    console.log('\n3. Combo props (pass + rush, receiving + rush, etc.):');
    const comboTerms = ['+', 'plus', 'and', '&', 'combined'];
    for (const term of comboTerms) {
      const { data: comboProps, error: comboError } = await supabase
        .from('proplines')
        .select('prop_type, COUNT(*) as count')
        .eq('league', 'nfl')
        .ilike('prop_type', `%${term}%`)
        .order('count', { ascending: false });

      if (comboError) {
        console.error(`❌ Error getting combo props with ${term}:`, comboError.message);
      } else if (comboProps && comboProps.length > 0) {
        console.log(`   Combo props with "${term}":`);
        comboProps.forEach(prop => {
          console.log(`     ${prop.prop_type}: ${prop.count} props`);
        });
      } else {
        console.log(`   No combo props with "${term}" found`);
      }
    }

    // 4. Check for props that might be getting filtered out by frontend logic
    console.log('\n4. Props that might be filtered by frontend:');
    const { data: allProps, error: allError } = await supabase
      .from('proplines')
      .select('player_name, prop_type, line, over_odds, under_odds')
      .eq('league', 'nfl')
      .limit(20);

    if (allError) {
      console.error('❌ Error getting sample props:', allError.message);
    } else if (allProps && allProps.length > 0) {
      console.log('   Sample props with odds data:');
      allProps.forEach(prop => {
        console.log(`   ${prop.player_name}: ${prop.prop_type} ${prop.line} - Over: ${prop.over_odds}, Under: ${prop.under_odds}`);
      });
    }

    // 5. Check if there are any props with missing odds (which would be filtered out)
    console.log('\n5. Props with missing odds (would be filtered out):');
    const { data: missingOdds, error: missingError } = await supabase
      .from('proplines')
      .select('player_name, prop_type, line, over_odds, under_odds')
      .eq('league', 'nfl')
      .or('over_odds.is.null,under_odds.is.null')
      .limit(10);

    if (missingError) {
      console.error('❌ Error getting props with missing odds:', missingError.message);
    } else if (missingOdds && missingOdds.length > 0) {
      console.log(`   Found ${missingOdds.length} props with missing odds:`);
      missingOdds.forEach(prop => {
        console.log(`   ${prop.player_name}: ${prop.prop_type} ${prop.line} - Over: ${prop.over_odds}, Under: ${prop.under_odds}`);
      });
    } else {
      console.log('   No props with missing odds found');
    }

    // 6. Check for any props that might be in different leagues
    console.log('\n6. Receiving props in other leagues:');
    const { data: otherLeagues, error: otherError } = await supabase
      .from('proplines')
      .select('league, prop_type, COUNT(*) as count')
      .ilike('prop_type', '%receiving%')
      .order('league');

    if (otherError) {
      console.error('❌ Error getting receiving props in other leagues:', otherError.message);
    } else if (otherLeagues && otherLeagues.length > 0) {
      console.log('   Receiving props by league:');
      otherLeagues.forEach(prop => {
        console.log(`   ${prop.league}: ${prop.prop_type} (${prop.count} props)`);
      });
    } else {
      console.log('   No receiving props found in any league');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

debugMissingPropTypes().catch(console.error);
