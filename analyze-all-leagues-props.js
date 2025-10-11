#!/usr/bin/env node

/**
 * Analyze prop types across all leagues to create league-aware fixes
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rfdrifnsfobqlzorcesn.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeAllLeaguesProps() {
  console.log('🔍 Analyzing prop types across all leagues...\n');

  try {
    // 1. Get all prop types grouped by league
    console.log('1. Getting all prop types by league...');
    const { data: allProps, error: allPropsError } = await supabase
      .from('proplines')
      .select('prop_type, line, league')
      .limit(500); // Increased limit to get more comprehensive data

    if (allPropsError) {
      console.error('❌ Error getting props:', allPropsError.message);
      return;
    }

    console.log('📊 Found', allProps?.length, 'props across all leagues');

    // 2. Analyze by league
    const leagueStats = {};
    const overUnderByLeague = {};

    allProps?.forEach(prop => {
      const league = prop.league;
      
      // Initialize league stats
      if (!leagueStats[league]) {
        leagueStats[league] = {
          totalProps: 0,
          propTypes: {},
          overUnderCount: 0,
          overUnderLines: []
        };
      }
      
      leagueStats[league].totalProps++;
      
      // Track prop types
      const propType = prop.prop_type;
      if (!leagueStats[league].propTypes[propType]) {
        leagueStats[league].propTypes[propType] = {
          count: 0,
          lines: []
        };
      }
      leagueStats[league].propTypes[propType].count++;
      leagueStats[league].propTypes[propType].lines.push(prop.line);
      
      // Track over/under specifically
      if (propType === 'over/under') {
        leagueStats[league].overUnderCount++;
        leagueStats[league].overUnderLines.push(prop.line);
        overUnderByLeague[league] = overUnderByLeague[league] || [];
        overUnderByLeague[league].push(prop.line);
      }
    });

    // 3. Display analysis by league
    console.log('\n📋 League-by-league analysis:');
    Object.entries(leagueStats).forEach(([league, stats]) => {
      console.log(`\n🏈 ${league.toUpperCase()}:`);
      console.log(`   Total props: ${stats.totalProps}`);
      console.log(`   Over/under props: ${stats.overUnderCount}`);
      
      if (stats.overUnderCount > 0) {
        const minLine = Math.min(...stats.overUnderLines);
        const maxLine = Math.max(...stats.overUnderLines);
        const uniqueLines = [...new Set(stats.overUnderLines)].sort((a, b) => a - b);
        console.log(`   Over/under line range: ${minLine} - ${maxLine}`);
        console.log(`   Unique lines: ${uniqueLines.slice(0, 10).join(', ')}${uniqueLines.length > 10 ? '...' : ''}`);
      }
      
      console.log(`   Other prop types:`);
      Object.entries(stats.propTypes)
        .filter(([propType]) => propType !== 'over/under')
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .forEach(([propType, data]) => {
          const minLine = Math.min(...data.lines);
          const maxLine = Math.max(...data.lines);
          console.log(`     ${propType}: ${data.count} props (${minLine}-${maxLine})`);
        });
    });

    // 4. Generate league-specific fix suggestions
    console.log('\n💡 League-specific fix suggestions:');
    
    const leagueMappings = {
      'nfl': {
        name: 'NFL',
        ranges: [
          { min: 200, max: 500, prop: 'passing_yards', desc: 'Passing Yards' },
          { min: 50, max: 200, prop: 'rushing_yards', desc: 'Rushing Yards' },
          { min: 15, max: 50, prop: 'rushing_attempts', desc: 'Rushing Attempts' },
          { min: 5, max: 15, prop: 'receptions', desc: 'Receptions' },
          { min: 1, max: 5, prop: 'passing_touchdowns', desc: 'Passing TDs' },
          { min: 0.5, max: 1, prop: 'passing_touchdowns', desc: 'Passing TDs' }
        ]
      },
      'nba': {
        name: 'NBA',
        ranges: [
          { min: 15, max: 50, prop: 'points', desc: 'Points' },
          { min: 8, max: 20, prop: 'rebounds', desc: 'Rebounds' },
          { min: 5, max: 15, prop: 'assists', desc: 'Assists' },
          { min: 1, max: 5, prop: 'steals', desc: 'Steals' },
          { min: 1, max: 5, prop: 'blocks', desc: 'Blocks' },
          { min: 1, max: 8, prop: 'three_pointers_made', desc: '3-Pointers Made' }
        ]
      },
      'nhl': {
        name: 'NHL',
        ranges: [
          { min: 0.5, max: 3, prop: 'goals', desc: 'Goals' },
          { min: 0.5, max: 3, prop: 'assists', desc: 'Assists' },
          { min: 1, max: 5, prop: 'points', desc: 'Points' },
          { min: 1, max: 8, prop: 'shots_on_goal', desc: 'Shots on Goal' },
          { min: 20, max: 50, prop: 'goalie_saves', desc: 'Goalie Saves' }
        ]
      },
      'mlb': {
        name: 'MLB',
        ranges: [
          { min: 0.5, max: 2, prop: 'hits', desc: 'Hits' },
          { min: 0.5, max: 1, prop: 'home_runs', desc: 'Home Runs' },
          { min: 0.5, max: 3, prop: 'runs_batted_in', desc: 'RBIs' },
          { min: 0.5, max: 2, prop: 'runs', desc: 'Runs' },
          { min: 0.5, max: 3, prop: 'strikeouts', desc: 'Strikeouts' }
        ]
      }
    };

    Object.entries(overUnderByLeague).forEach(([league, lines]) => {
      if (lines.length === 0) return;
      
      console.log(`\n🏈 ${league.toUpperCase()} over/under props:`);
      const mapping = leagueMappings[league];
      
      if (mapping) {
        mapping.ranges.forEach(range => {
          const matchingLines = lines.filter(line => line >= range.min && line <= range.max);
          if (matchingLines.length > 0) {
            console.log(`   Line ${range.min}-${range.max}: ${matchingLines.length} props → ${range.prop} (${range.desc})`);
          }
        });
      } else {
        console.log(`   ⚠️  No mapping defined for ${league} - needs manual analysis`);
        const uniqueLines = [...new Set(lines)].sort((a, b) => a - b);
        console.log(`   Lines: ${uniqueLines.slice(0, 15).join(', ')}${uniqueLines.length > 15 ? '...' : ''}`);
      }
    });

    // 5. Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 COMPREHENSIVE ANALYSIS SUMMARY');
    console.log('='.repeat(60));
    
    const totalOverUnder = Object.values(leagueStats).reduce((sum, stats) => sum + stats.overUnderCount, 0);
    const totalProps = Object.values(leagueStats).reduce((sum, stats) => sum + stats.totalProps, 0);
    
    console.log(`📊 Total props analyzed: ${totalProps}`);
    console.log(`⚠️  Total over/under props: ${totalOverUnder}`);
    console.log(`✅ Total proper prop types: ${totalProps - totalOverUnder}`);
    
    console.log('\n🏈 By League:');
    Object.entries(leagueStats).forEach(([league, stats]) => {
      const percentage = ((stats.overUnderCount / stats.totalProps) * 100).toFixed(1);
      console.log(`   ${league}: ${stats.overUnderCount}/${stats.totalProps} over/under (${percentage}%)`);
    });

    console.log('\n📝 NEXT STEPS:');
    console.log('1. Run fix-league-aware-prop-types.sql to apply comprehensive fixes');
    console.log('2. Test the fixes with node test-league-aware-fix.js');
    console.log('3. Verify all leagues show proper prop names');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

analyzeAllLeaguesProps().catch(console.error);
