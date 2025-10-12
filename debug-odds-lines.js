#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugOddsAndLines() {
  console.log('🔍 Debugging Odds and Lines Integrity...\n');

  try {
    // Check recent NFL props for odds/line issues
    const { data: props, error } = await supabase
      .from('proplines')
      .select(`
        player_name,
        prop_type,
        line,
        over_odds,
        under_odds,
        sportsbook,
        created_at
      `)
      .eq('league', 'nfl')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('❌ Error fetching props:', error);
      return;
    }

    console.log('📊 Recent NFL Props Analysis:');
    console.log('=====================================');
    
    props?.forEach((prop, index) => {
      const issues = [];
      
      // Check for integer lines (should be .5)
      if (Number.isInteger(prop.line) && prop.line > 0) {
        issues.push(`❌ Integer line: ${prop.line} (should be ${prop.line + 0.5})`);
      }
      
      // Check for missing odds
      if (!prop.over_odds || !prop.under_odds) {
        issues.push(`❌ Missing odds: over=${prop.over_odds}, under=${prop.under_odds}`);
      }
      
      // Check for invalid odds
      if (prop.over_odds && (prop.over_odds === 0 || prop.over_odds < -1000 || prop.over_odds > 1000)) {
        issues.push(`❌ Invalid over odds: ${prop.over_odds}`);
      }
      
      if (prop.under_odds && (prop.under_odds === 0 || prop.under_odds < -1000 || prop.under_odds > 1000)) {
        issues.push(`❌ Invalid under odds: ${prop.under_odds}`);
      }
      
      // Check for suspicious lines (too high/low)
      if (prop.line && (prop.line < 0.5 || prop.line > 1000)) {
        issues.push(`❌ Suspicious line: ${prop.line}`);
      }
      
      console.log(`${index + 1}. ${prop.player_name} - ${prop.prop_type}`);
      console.log(`   Line: ${prop.line}, Over: ${prop.over_odds}, Under: ${prop.under_odds}`);
      console.log(`   Sportsbook: ${prop.sportsbook}, Created: ${prop.created_at}`);
      
      if (issues.length > 0) {
        console.log(`   🚨 ISSUES:`);
        issues.forEach(issue => console.log(`   ${issue}`));
      } else {
        console.log(`   ✅ Looks good!`);
      }
      console.log('');
    });

    // Check line distribution
    console.log('📈 Line Distribution Analysis:');
    console.log('=====================================');
    
    const { data: lineStats } = await supabase
      .from('proplines')
      .select('line, prop_type')
      .eq('league', 'nfl')
      .not('line', 'is', null)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days

    if (lineStats) {
      const integerLines = lineStats.filter(p => Number.isInteger(p.line));
      const decimalLines = lineStats.filter(p => !Number.isInteger(p.line));
      
      console.log(`Total lines analyzed: ${lineStats.length}`);
      console.log(`Integer lines: ${integerLines.length} (${((integerLines.length / lineStats.length) * 100).toFixed(1)}%)`);
      console.log(`Decimal lines: ${decimalLines.length} (${((decimalLines.length / lineStats.length) * 100).toFixed(1)}%)`);
      
      // Show some examples of integer lines
      if (integerLines.length > 0) {
        console.log('\nExamples of integer lines (should be .5):');
        integerLines.slice(0, 10).forEach(prop => {
          console.log(`  ${prop.prop_type}: ${prop.line} → should be ${prop.line + 0.5}`);
        });
      }
    }

    // Check odds distribution
    console.log('\n🎲 Odds Distribution Analysis:');
    console.log('=====================================');
    
    const { data: oddsStats } = await supabase
      .from('proplines')
      .select('over_odds, under_odds')
      .eq('league', 'nfl')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (oddsStats) {
      const validOverOdds = oddsStats.filter(p => p.over_odds && p.over_odds !== 0);
      const validUnderOdds = oddsStats.filter(p => p.under_odds && p.under_odds !== 0);
      const missingOdds = oddsStats.filter(p => !p.over_odds || !p.under_odds);
      
      console.log(`Total props analyzed: ${oddsStats.length}`);
      console.log(`Valid over odds: ${validOverOdds.length} (${((validOverOdds.length / oddsStats.length) * 100).toFixed(1)}%)`);
      console.log(`Valid under odds: ${validUnderOdds.length} (${((validUnderOdds.length / oddsStats.length) * 100).toFixed(1)}%)`);
      console.log(`Missing odds: ${missingOdds.length} (${((missingOdds.length / oddsStats.length) * 100).toFixed(1)}%)`);
      
      if (missingOdds.length > 0) {
        console.log('\nExamples of props with missing odds:');
        missingOdds.slice(0, 5).forEach(prop => {
          console.log(`  Over: ${prop.over_odds}, Under: ${prop.under_odds}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error in debug analysis:', error);
  }
}

debugOddsAndLines();
