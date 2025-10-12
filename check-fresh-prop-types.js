#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkFreshPropTypes() {
  console.log('🔍 Checking fresh prop types after re-ingestion...\n');
  
  try {
    // Get recent props (last 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { data: recentProps, error } = await supabase
      .from('proplines')
      .select('prop_type, league, player_name, line, over_odds, under_odds, created_at')
      .gte('created_at', thirtyMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) {
      console.error('❌ Error fetching recent props:', error);
      return;
    }
    
    if (!recentProps || recentProps.length === 0) {
      console.log('⚠️ No recent props found in the last 30 minutes');
      
      // Fallback: get the most recent props
      const { data: latestProps, error: latestError } = await supabase
        .from('proplines')
        .select('prop_type, league, player_name, line, over_odds, under_odds, created_at')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (latestError) {
        console.error('❌ Error fetching latest props:', latestError);
        return;
      }
      
      console.log(`📊 Showing latest ${latestProps?.length || 0} props instead:\n`);
      
      if (latestProps && latestProps.length > 0) {
        latestProps.forEach((prop, index) => {
          console.log(`${index + 1}. ${prop.player_name} - ${prop.prop_type} (${prop.league.toUpperCase()})`);
          console.log(`   Line: ${prop.line}, Over: ${prop.over_odds}, Under: ${prop.under_odds}`);
          console.log(`   Created: ${new Date(prop.created_at).toLocaleString()}\n`);
        });
      }
    } else {
      console.log(`📊 Found ${recentProps.length} recent props:\n`);
      
      // Group by prop type
      const propTypeGroups = {};
      recentProps.forEach(prop => {
        if (!propTypeGroups[prop.prop_type]) {
          propTypeGroups[prop.prop_type] = [];
        }
        propTypeGroups[prop.prop_type].push(prop);
      });
      
      console.log('📈 Prop types found:');
      Object.keys(propTypeGroups).sort().forEach(propType => {
        const count = propTypeGroups[propType].length;
        const leagues = [...new Set(propTypeGroups[propType].map(p => p.league))].join(', ');
        console.log(`  ✅ ${propType}: ${count} props (${leagues})`);
      });
      
      console.log('\n🎯 Sample recent props:');
      recentProps.slice(0, 10).forEach((prop, index) => {
        console.log(`${index + 1}. ${prop.player_name} - ${prop.prop_type} (${prop.league.toUpperCase()})`);
        console.log(`   Line: ${prop.line}, Over: ${prop.over_odds}, Under: ${prop.under_odds}`);
      });
    }
    
    // Check for any remaining "over_under" or problematic prop types
    const { data: problematicProps, error: problemError } = await supabase
      .from('proplines')
      .select('prop_type, league, count(*)')
      .in('prop_type', ['over_under', 'Over/Under', 'unknown'])
      .gte('created_at', thirtyMinutesAgo);
    
    if (!problemError && problematicProps && problematicProps.length > 0) {
      console.log('\n⚠️ Problematic prop types still found:');
      problematicProps.forEach(prop => {
        console.log(`  ❌ ${prop.prop_type} (${prop.league}): ${prop.count} props`);
      });
    } else {
      console.log('\n✅ No problematic prop types found in recent data!');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkFreshPropTypes();
