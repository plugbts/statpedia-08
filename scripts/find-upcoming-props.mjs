#!/usr/bin/env node

import fetch from 'node-fetch';
import 'dotenv/config';

const API_KEY = process.env.SPORTSGAMEODDS_API_KEY;

if (!API_KEY) {
  console.error('Missing SPORTSGAMEODDS_API_KEY');
  process.exit(1);
}

async function main() {
  console.log('🔎 Finding Upcoming Games with Player Props\n');
  
  const leagues = ['NFL', 'NBA', 'MLB', 'NHL'];
  
  for (const league of leagues) {
    console.log(`\n📊 ${league}:`);
    console.log('='.repeat(60));
    
    const url = `https://api.sportsgameodds.com/v2/events?leagueID=${league}&oddsAvailable=true&limit=50`;
    
    const res = await fetch(url, {
      headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' }
    });
    
    if (!res.ok) {
      console.error(`❌ API error: ${res.status}`);
      continue;
    }
    
    const payload = await res.json();
    const events = payload.data || payload.events || [];
    
    console.log(`Total events: ${events.length}`);
    
    let upcomingCount = 0;
    let liveCount = 0;
    let completedCount = 0;
    let propsAvailableCount = 0;
    
    for (const event of events) {
      const status = event.status?.displayLong?.toLowerCase() || '';
      const isUpcoming = ['scheduled', 'pre', 'upcoming', 'open'].some(s => status.includes(s));
      const isLive = event.status?.live || event.status?.started;
      const isCompleted = event.status?.completed || event.status?.ended;
      
      if (isUpcoming) upcomingCount++;
      if (isLive) liveCount++;
      if (isCompleted) completedCount++;
      
      // Check for player props
      const oddsKeys = Object.keys(event.odds || {});
      const playerPropKeys = oddsKeys.filter(k => {
        const odd = event.odds[k];
        return odd?.playerID && odd?.betTypeID === 'ou';
      });
      
      if (playerPropKeys.length > 0) {
        propsAvailableCount++;
        
        if (propsAvailableCount === 1) {
          // Show details for first event with props
          console.log(`\n✅ Found props in: ${event.teams?.home?.names?.short || 'TBD'} vs ${event.teams?.away?.names?.short || 'TBD'}`);
          console.log(`   Status: ${event.status?.displayLong || 'Unknown'}`);
          console.log(`   Starts at: ${event.status?.startsAt || 'Unknown'}`);
          console.log(`   Player props available: ${playerPropKeys.length}`);
          console.log(`   Sample keys: ${playerPropKeys.slice(0, 3).join(', ')}`);
          
          // Show sample prop
          const sampleKey = playerPropKeys[0];
          const sampleOdd = event.odds[sampleKey];
          console.log(`\n   Sample prop structure:`);
          console.dir(sampleOdd, { depth: null });
        }
      }
    }
    
    console.log(`\nStatus Breakdown:`);
    console.log(`  Upcoming: ${upcomingCount}`);
    console.log(`  Live: ${liveCount}`);
    console.log(`  Completed: ${completedCount}`);
    console.log(`  Events with player props: ${propsAvailableCount}`);
  }
  
  console.log('\n✅ Search complete.\n');
}

main().catch((e) => {
  console.error('❌ Search failed:', e);
  process.exit(1);
});

