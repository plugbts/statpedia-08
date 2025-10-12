#!/usr/bin/env node

/**
 * Simple check for prop types in database
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rfdrifnsfobqlzorcesn.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPropTypesSimple() {
  console.log('🔍 Checking prop types in database...\n');

  try {
    // Get all NFL props
    const { data: nflProps, error } = await supabase
      .from('proplines')
      .select('prop_type, player_name, line, over_odds, under_odds')
      .eq('league', 'nfl');

    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }

    if (!nflProps || nflProps.length === 0) {
      console.log('❌ No NFL props found');
      return;
    }

    console.log(`📊 Found ${nflProps.length} NFL props total\n`);

    // Group by prop type
    const propTypeGroups = {};
    nflProps.forEach(prop => {
      if (!propTypeGroups[prop.prop_type]) {
        propTypeGroups[prop.prop_type] = [];
      }
      propTypeGroups[prop.prop_type].push(prop);
    });

    console.log('📋 All prop types found:');
    Object.keys(propTypeGroups).sort().forEach(propType => {
      const count = propTypeGroups[propType].length;
      console.log(`   ${propType}: ${count} props`);
    });

    // Check for receiving-related props
    console.log('\n🎯 Receiving-related props:');
    const receivingProps = Object.keys(propTypeGroups).filter(type => 
      type.toLowerCase().includes('receiving') || 
      type.toLowerCase().includes('reception') ||
      type.toLowerCase().includes('receive')
    );

    if (receivingProps.length > 0) {
      receivingProps.forEach(propType => {
        const props = propTypeGroups[propType];
        console.log(`   ${propType}: ${props.length} props`);
        // Show sample
        props.slice(0, 3).forEach(prop => {
          console.log(`     ${prop.player_name}: ${prop.line} (Over: ${prop.over_odds}, Under: ${prop.under_odds})`);
        });
      });
    } else {
      console.log('   ❌ NO receiving-related props found!');
    }

    // Check for combo props
    console.log('\n🎯 Combo props (with +, &, and, plus):');
    const comboProps = Object.keys(propTypeGroups).filter(type => 
      type.includes('+') || 
      type.includes('&') || 
      type.toLowerCase().includes(' and ') ||
      type.toLowerCase().includes('plus')
    );

    if (comboProps.length > 0) {
      comboProps.forEach(propType => {
        const props = propTypeGroups[propType];
        console.log(`   ${propType}: ${props.length} props`);
        props.slice(0, 2).forEach(prop => {
          console.log(`     ${prop.player_name}: ${prop.line}`);
        });
      });
    } else {
      console.log('   ❌ NO combo props found!');
    }

    // Check for props with missing under odds (these would be filtered out)
    console.log('\n🎯 Props with missing under odds (would be filtered out):');
    const missingUnderOdds = nflProps.filter(prop => 
      prop.under_odds === null || prop.under_odds === undefined
    );

    if (missingUnderOdds.length > 0) {
      console.log(`   Found ${missingUnderOdds.length} props with missing under odds:`);
      missingUnderOdds.slice(0, 10).forEach(prop => {
        console.log(`     ${prop.player_name}: ${prop.prop_type} ${prop.line} (Over: ${prop.over_odds}, Under: ${prop.under_odds})`);
      });
    } else {
      console.log('   ✅ All props have under odds');
    }

    // Check for props with missing over odds
    console.log('\n🎯 Props with missing over odds:');
    const missingOverOdds = nflProps.filter(prop => 
      prop.over_odds === null || prop.over_odds === undefined
    );

    if (missingOverOdds.length > 0) {
      console.log(`   Found ${missingOverOdds.length} props with missing over odds:`);
      missingOverOdds.slice(0, 5).forEach(prop => {
        console.log(`     ${prop.player_name}: ${prop.prop_type} ${prop.line} (Over: ${prop.over_odds}, Under: ${prop.under_odds})`);
      });
    } else {
      console.log('   ✅ All props have over odds');
    }

    console.log('\n💡 ANALYSIS:');
    console.log('1. If receiving props are missing, they may not be in the database yet');
    console.log('2. If combo props are missing, they may use different naming conventions');
    console.log('3. Props with missing odds will be filtered out by the frontend');
    console.log('4. The frontend overUnderFilter="both" should show props with either over OR under odds');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

checkPropTypesSimple().catch(console.error);
