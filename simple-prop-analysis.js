#!/usr/bin/env node

/**
 * Simple prop type analysis to fix over/under issue
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rfdrifnsfobqlzorcesn.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function simplePropAnalysis() {
  console.log('🔍 Simple prop type analysis...\n');

  try {
    // 1. Get all prop types
    console.log('1. Getting all prop types...');
    const { data: allProps, error: allPropsError } = await supabase
      .from('proplines')
      .select('prop_type, line, league')
      .limit(100);

    if (allPropsError) {
      console.error('❌ Error getting props:', allPropsError.message);
      return;
    }

    console.log('📊 Found', allProps?.length, 'props');

    // 2. Analyze prop types
    const propTypeStats = {};
    const overUnderProps = [];

    allProps?.forEach(prop => {
      const key = prop.prop_type;
      if (!propTypeStats[key]) {
        propTypeStats[key] = {
          prop_type: prop.prop_type,
          lines: [],
          leagues: new Set()
        };
      }
      propTypeStats[key].lines.push(prop.line);
      propTypeStats[key].leagues.add(prop.league);

      if (prop.prop_type === 'over/under') {
        overUnderProps.push(prop);
      }
    });

    // 3. Display analysis
    console.log('\n📋 Prop type statistics:');
    Object.values(propTypeStats).forEach(stat => {
      const minLine = Math.min(...stat.lines);
      const maxLine = Math.max(...stat.lines);
      const leagues = Array.from(stat.leagues).join(', ');
      console.log(`   ${stat.prop_type}: ${stat.lines.length} props, line range ${minLine}-${maxLine}, leagues: ${leagues}`);
    });

    // 4. Analyze over/under props specifically
    if (overUnderProps.length > 0) {
      console.log('\n⚠️  Over/under props found:');
      
      const overUnderByLeague = {};
      overUnderProps.forEach(prop => {
        if (!overUnderByLeague[prop.league]) {
          overUnderByLeague[prop.league] = [];
        }
        overUnderByLeague[prop.league].push(prop.line);
      });

      Object.entries(overUnderByLeague).forEach(([league, lines]) => {
        const minLine = Math.min(...lines);
        const maxLine = Math.max(...lines);
        const uniqueLines = [...new Set(lines)].sort((a, b) => a - b);
        console.log(`   ${league}: ${lines.length} props, line range ${minLine}-${maxLine}`);
        console.log(`     Unique lines: ${uniqueLines.slice(0, 10).join(', ')}${uniqueLines.length > 10 ? '...' : ''}`);
      });
    }

    // 5. Generate fix suggestions
    console.log('\n💡 Fix suggestions based on line ranges:');
    
    const fixSuggestions = [];
    
    overUnderProps.forEach(prop => {
      let suggestedProp = 'unknown';
      
      // NFL suggestions
      if (prop.league === 'nfl') {
        if (prop.line >= 200 && prop.line <= 500) suggestedProp = 'passing_yards';
        else if (prop.line >= 50 && prop.line <= 200) suggestedProp = 'rushing_yards';
        else if (prop.line >= 50 && prop.line <= 150) suggestedProp = 'receiving_yards';
        else if (prop.line >= 1 && prop.line <= 5) suggestedProp = 'touchdowns';
        else if (prop.line >= 1 && prop.line <= 10) suggestedProp = 'receptions';
        else if (prop.line >= 15 && prop.line <= 35) suggestedProp = 'rushing_attempts';
      }
      // NBA suggestions
      else if (prop.league === 'nba') {
        if (prop.line >= 10 && prop.line <= 40) suggestedProp = 'points';
        else if (prop.line >= 5 && prop.line <= 15) suggestedProp = 'rebounds';
        else if (prop.line >= 5 && prop.line <= 15) suggestedProp = 'assists';
        else if (prop.line >= 1 && prop.line <= 5) suggestedProp = 'steals';
      }
      // NHL suggestions
      else if (prop.league === 'nhl') {
        if (prop.line >= 0.5 && prop.line <= 3) suggestedProp = 'goals';
        else if (prop.line >= 1 && prop.line <= 5) suggestedProp = 'points';
        else if (prop.line >= 1 && prop.line <= 8) suggestedProp = 'shots_on_goal';
      }

      fixSuggestions.push({
        line: prop.line,
        league: prop.league,
        suggested: suggestedProp
      });
    });

    // Group suggestions
    const suggestionGroups = {};
    fixSuggestions.forEach(suggestion => {
      const key = `${suggestion.suggested}_${suggestion.league}`;
      if (!suggestionGroups[key]) {
        suggestionGroups[key] = {
          prop: suggestion.suggested,
          league: suggestion.league,
          lines: []
        };
      }
      suggestionGroups[key].lines.push(suggestion.line);
    });

    Object.values(suggestionGroups).forEach(group => {
      const minLine = Math.min(...group.lines);
      const maxLine = Math.max(...group.lines);
      console.log(`   ${group.prop} (${group.league}): lines ${minLine}-${maxLine} (${group.lines.length} props)`);
    });

    console.log('\n' + '='.repeat(50));
    console.log('📋 SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Found ${allProps?.length} total props`);
    console.log(`⚠️  Found ${overUnderProps.length} over/under props that need fixing`);
    console.log('📝 NEXT STEPS:');
    console.log('   1. Run fix-prop-type-aliases.sql to populate aliases table');
    console.log('   2. Apply intelligent fixes based on line ranges');
    console.log('   3. Test the normalization');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

simplePropAnalysis().catch(console.error);
