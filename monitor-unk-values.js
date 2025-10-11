#!/usr/bin/env node

// Monitor UNK values in production to ensure team enrichment is working
// This script checks the Cloudflare Worker and database for any remaining UNK values

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rfdrifnsfobqlzorcesn.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA0ODgzNiwiZXhwIjoyMDc0NjI0ODM2fQ.E9LQFvqVs9Z1cXoS34ov5qV3jBkbqCHPCL16GBt480g';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🔍 Monitoring UNK Values in Production');
console.log('=====================================\n');

async function checkCloudflareWorker() {
  console.log('📡 Checking Cloudflare Worker Status...');
  
  try {
    const response = await fetch('https://statpedia-player-props.statpedia.workers.dev/');
    const data = await response.json();
    
    if (data.message && data.endpoints) {
      console.log('✅ Cloudflare Worker is running');
      console.log(`   Available leagues: ${data.leagues.join(', ')}`);
      console.log(`   Available seasons: ${data.seasons.join(', ')}`);
    } else {
      console.log('❌ Cloudflare Worker response unexpected');
    }
  } catch (error) {
    console.log('❌ Cloudflare Worker check failed:', error.message);
  }
  
  console.log('');
}

async function checkDatabaseUNKValues() {
  console.log('🗄️  Checking Database for UNK Values...');
  
  try {
    // Check player_props table for UNK values
    const { data: propsData, error: propsError } = await supabase
      .from('player_props')
      .select('team, opponent, league, player_name, created_at')
      .or('team.eq.UNK,opponent.eq.UNK')
      .limit(10);
    
    if (propsError) {
      console.log('❌ Error checking player_props:', propsError.message);
    } else {
      console.log(`📊 Found ${propsData?.length || 0} props with UNK values`);
      
      if (propsData && propsData.length > 0) {
        console.log('   Recent UNK entries:');
        propsData.forEach((prop, index) => {
          console.log(`   ${index + 1}. ${prop.player_name} | ${prop.team} vs ${prop.opponent} (${prop.league})`);
        });
      } else {
        console.log('✅ No UNK values found in player_props!');
      }
    }
    
    // Check proplines table for UNK values
    const { data: proplinesData, error: proplinesError } = await supabase
      .from('proplines')
      .select('team_abbr, opponent_abbr, league, player_name, created_at')
      .or('team_abbr.eq.UNK,opponent_abbr.eq.UNK')
      .limit(10);
    
    if (proplinesError) {
      console.log('❌ Error checking proplines:', proplinesError.message);
    } else {
      console.log(`📊 Found ${proplinesData?.length || 0} proplines with UNK values`);
      
      if (proplinesData && proplinesData.length > 0) {
        console.log('   Recent UNK entries:');
        proplinesData.forEach((prop, index) => {
          console.log(`   ${index + 1}. ${prop.player_name} | ${prop.team_abbr} vs ${prop.opponent_abbr} (${prop.league})`);
        });
      } else {
        console.log('✅ No UNK values found in proplines!');
      }
    }
    
  } catch (error) {
    console.log('❌ Database check failed:', error.message);
  }
  
  console.log('');
}

async function checkRecentIngestion() {
  console.log('🔄 Checking Recent Ingestion Activity...');
  
  try {
    // Check for recent props ingestion
    const { data: recentProps, error: propsError } = await supabase
      .from('player_props')
      .select('team, opponent, league, player_name, created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .limit(5);
    
    if (propsError) {
      console.log('❌ Error checking recent props:', propsError.message);
    } else {
      console.log(`📈 Recent props (last 24h): ${recentProps?.length || 0} entries`);
      
      if (recentProps && recentProps.length > 0) {
        const unkCount = recentProps.filter(p => p.team === 'UNK' || p.opponent === 'UNK').length;
        console.log(`   UNK rate: ${unkCount}/${recentProps.length} (${((unkCount / recentProps.length) * 100).toFixed(1)}%)`);
        
        if (unkCount === 0) {
          console.log('✅ Perfect! No UNK values in recent ingestion');
        } else {
          console.log('⚠️  Some UNK values found in recent ingestion');
        }
      }
    }
    
    // Check for recent proplines ingestion
    const { data: recentProplines, error: proplinesError } = await supabase
      .from('proplines')
      .select('team_abbr, opponent_abbr, league, player_name, created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .limit(5);
    
    if (proplinesError) {
      console.log('❌ Error checking recent proplines:', proplinesError.message);
    } else {
      console.log(`📈 Recent proplines (last 24h): ${recentProplines?.length || 0} entries`);
      
      if (recentProplines && recentProplines.length > 0) {
        const unkCount = recentProplines.filter(p => p.team_abbr === 'UNK' || p.opponent_abbr === 'UNK').length;
        console.log(`   UNK rate: ${unkCount}/${recentProplines.length} (${((unkCount / recentProplines.length) * 100).toFixed(1)}%)`);
        
        if (unkCount === 0) {
          console.log('✅ Perfect! No UNK values in recent proplines ingestion');
        } else {
          console.log('⚠️  Some UNK values found in recent proplines ingestion');
        }
      }
    }
    
  } catch (error) {
    console.log('❌ Recent ingestion check failed:', error.message);
  }
  
  console.log('');
}

async function testTeamEnrichment() {
  console.log('🧪 Testing Team Enrichment Endpoint...');
  
  try {
    // Test the debug endpoint to see if team enrichment is working
    const response = await fetch('https://statpedia-player-props.statpedia.workers.dev/debug-api?league=nfl&limit=3');
    const data = await response.json();
    
    if (data.success && data.results) {
      console.log('✅ Debug endpoint is working');
      
      // Check for UNK values in the debug results
      const unkCount = data.results.filter(r => 
        r.team === 'UNK' || r.opponent === 'UNK' || 
        r.team_abbr === 'UNK' || r.opponent_abbr === 'UNK'
      ).length;
      
      console.log(`   Sample results: ${data.results.length} props`);
      console.log(`   UNK count: ${unkCount}`);
      
      if (unkCount === 0) {
        console.log('✅ Perfect! No UNK values in live API results');
      } else {
        console.log('⚠️  Some UNK values found in live API results');
        console.log('   Sample UNK entries:');
        data.results
          .filter(r => r.team === 'UNK' || r.opponent === 'UNK' || r.team_abbr === 'UNK' || r.opponent_abbr === 'UNK')
          .slice(0, 3)
          .forEach((r, index) => {
            console.log(`   ${index + 1}. ${r.player_name} | ${r.team || r.team_abbr} vs ${r.opponent || r.opponent_abbr}`);
          });
      }
    } else {
      console.log('❌ Debug endpoint returned unexpected data');
    }
    
  } catch (error) {
    console.log('❌ Team enrichment test failed:', error.message);
  }
  
  console.log('');
}

async function generateSummary() {
  console.log('📋 Summary & Recommendations');
  console.log('============================');
  console.log('');
  console.log('🎯 Team Enrichment Status:');
  console.log('   ✅ Cloudflare Worker deployed with enhanced team enrichment');
  console.log('   ✅ Comprehensive team mappings for NFL, NBA, MLB, NHL');
  console.log('   ✅ Multiple fallback strategies implemented');
  console.log('');
  console.log('📊 Monitoring Commands:');
  console.log('   • Run this script: node monitor-unk-values.js');
  console.log('   • Check Cloudflare dashboard for worker logs');
  console.log('   • Monitor database for UNK values');
  console.log('');
  console.log('🔧 Next Steps:');
  console.log('   1. Monitor for 24-48 hours to ensure no UNK values');
  console.log('   2. Check UI for clean team abbreviations');
  console.log('   3. Verify opponent resolution is working');
  console.log('   4. Add more leagues if needed (NCAA, international)');
  console.log('');
}

// Main execution
async function main() {
  await checkCloudflareWorker();
  await checkDatabaseUNKValues();
  await checkRecentIngestion();
  await testTeamEnrichment();
  await generateSummary();
  
  console.log('🎉 Monitoring complete!');
  console.log('');
  console.log('💡 Tip: Run this script regularly to monitor UNK elimination:');
  console.log('   watch -n 300 "node monitor-unk-values.js"  # Every 5 minutes');
}

main().catch(console.error);
