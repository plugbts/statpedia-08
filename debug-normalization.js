#!/usr/bin/env node

/**
 * Debug the normalization process
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rfdrifnsfobqlzorcesn.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugNormalization() {
  console.log('🔍 Debugging normalization process...\n');

  try {
    // Check the most recent props to see what's happening
    const { data: recentProps, error } = await supabase
      .from('proplines')
      .select('*')
      .eq('league', 'nfl')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Database error:', error.message);
      return;
    }

    console.log('📊 Most recent NFL props:');
    recentProps.forEach((prop, index) => {
      console.log(`${index + 1}. ${prop.player_name}`);
      console.log(`   Prop Type: "${prop.prop_type}"`);
      console.log(`   Line: ${prop.line}`);
      console.log(`   Over Odds: ${prop.over_odds}`);
      console.log(`   Under Odds: ${prop.under_odds}`);
      console.log(`   Created: ${prop.created_at}`);
      console.log(`   Updated: ${prop.updated_at}`);
      console.log('');
    });

    // Check if there are any props that were updated recently vs created
    const { data: updatedProps, error: updateError } = await supabase
      .from('proplines')
      .select('*')
      .eq('league', 'nfl')
      .not('updated_at', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(5);

    if (updateError) {
      console.error('❌ Update query error:', updateError.message);
    } else if (updatedProps && updatedProps.length > 0) {
      console.log('📊 Recently updated props:');
      updatedProps.forEach((prop, index) => {
        console.log(`${index + 1}. ${prop.player_name}: ${prop.prop_type} (updated: ${prop.updated_at})`);
      });
    } else {
      console.log('❌ No recently updated props found');
    }

    // Check the prop_type_aliases table to see if it has data
    const { data: aliases, error: aliasError } = await supabase
      .from('prop_type_aliases')
      .select('*')
      .limit(10);

    if (aliasError) {
      console.error('❌ Aliases query error:', aliasError.message);
    } else if (aliases && aliases.length > 0) {
      console.log('\n📊 Prop type aliases:');
      aliases.forEach(alias => {
        console.log(`   "${alias.alias}" → "${alias.canonical_name}"`);
      });
    } else {
      console.log('\n❌ No prop type aliases found');
    }

    // Check if there are any props with proper names (not over/under)
    const { data: properProps, error: properError } = await supabase
      .from('proplines')
      .select('prop_type, COUNT(*) as count')
      .eq('league', 'nfl')
      .neq('prop_type', 'over/under')
      .order('count', { ascending: false });

    if (properError) {
      console.error('❌ Proper props query error:', properError.message);
    } else if (properProps && properProps.length > 0) {
      console.log('\n📊 Props with proper names (not over/under):');
      properProps.forEach(prop => {
        console.log(`   ${prop.prop_type}: ${prop.count} props`);
      });
    } else {
      console.log('\n❌ No props with proper names found');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

debugNormalization().catch(console.error);
