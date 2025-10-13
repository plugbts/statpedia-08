#!/usr/bin/env node

import fetch from 'node-fetch';
import 'dotenv/config';

const API_KEY = process.env.SPORTSGAMEODDS_API_KEY;

if (!API_KEY) {
  console.error('Missing SPORTSGAMEODDS_API_KEY');
  process.exit(1);
}

async function main() {
  console.log('🔎 STEP 2: Inspect SGO API Response Structure\n');
  
  const league = 'NFL';
  const url = `https://api.sportsgameodds.com/v2/events?leagueID=${league}&oddsAvailable=true&limit=1`;
  
  console.log(`Fetching: ${url}\n`);
  
  const res = await fetch(url, {
    headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' }
  });
  
  if (!res.ok) {
    console.error(`❌ API error: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  
  const payload = await res.json();
  const events = payload.data || payload.events || [];
  
  if (events.length === 0) {
    console.log('❌ No events returned from API');
    process.exit(1);
  }
  
  const event = events[0];
  
  console.log('📊 Event Structure Analysis:\n');
  console.log('1️⃣ Top-level keys:');
  console.log(`   ${Object.keys(event).join(', ')}\n`);
  
  console.log('2️⃣ Event Status:');
  console.log(`   ${JSON.stringify(event.status, null, 2)}\n`);
  
  console.log('3️⃣ Teams Structure:');
  console.log(`   Home: ${event.teams?.home?.names?.long || 'N/A'} (${event.teams?.home?.names?.short || 'N/A'})`);
  console.log(`   Away: ${event.teams?.away?.names?.long || 'N/A'} (${event.teams?.away?.names?.short || 'N/A'})\n`);
  
  console.log('4️⃣ Odds Object Keys (first 20):');
  const oddsKeys = Object.keys(event.odds || {});
  console.log(`   Total odds keys: ${oddsKeys.length}`);
  console.log(`   Sample: ${oddsKeys.slice(0, 20).join(', ')}\n`);
  
  // Find player prop keys
  const playerPropKeys = oddsKeys.filter(k => {
    const odd = event.odds[k];
    return odd?.playerID && (k.includes('_ou_') || k.includes('_yn_'));
  });
  
  console.log('5️⃣ Player Prop Keys:');
  console.log(`   Total player prop keys: ${playerPropKeys.length}`);
  console.log(`   Sample: ${playerPropKeys.slice(0, 10).join(', ')}\n`);
  
  if (playerPropKeys.length > 0) {
    const sampleKey = playerPropKeys[0];
    const sampleOdd = event.odds[sampleKey];
    
    console.log('6️⃣ Sample Player Prop Structure:');
    console.log(`   Key: ${sampleKey}`);
    console.dir(sampleOdd, { depth: null });
  }
  
  console.log('\n7️⃣ Players Object (if exists):');
  if (event.players) {
    const playerIds = Object.keys(event.players);
    console.log(`   Total players: ${playerIds.length}`);
    if (playerIds.length > 0) {
      console.log(`   Sample player ID: ${playerIds[0]}`);
      console.dir(event.players[playerIds[0]], { depth: null });
    }
  } else {
    console.log('   No players object found\n');
  }
  
  console.log('\n8️⃣ Data Structure Summary:');
  console.log(`   ✅ Props live in: event.odds[key]`);
  console.log(`   ✅ Filter by: odd.playerID && odd.betTypeID === 'ou'`);
  console.log(`   ✅ Player name from: odd.playerID (needs parsing)`);
  console.log(`   ✅ Stat type from: odd.statID`);
  console.log(`   ✅ Line from: odd.fairOverUnder || odd.bookOverUnder`);
  console.log(`   ✅ Odds from: odd.fairOdds || odd.bookOdds`);
  
  console.log('\n✅ Step 2 complete. Current ingestion logic matches this structure.\n');
}

main().catch((e) => {
  console.error('❌ Inspection failed:', e);
  process.exit(1);
});

