#!/usr/bin/env node

/**
 * Debug Edge Function Data Processing
 * 
 * This script compares local API data vs what the Edge Function might be seeing
 */

const SPORTSGAMEODDS_BASE_URL = 'https://api.sportsgameodds.com';
const API_KEY = process.env.SPORTSGAMEODDS_API_KEY;

async function debugEdgeFunctionData() {
  console.log('🔍 Debugging Edge Function Data Processing');
  console.log('==========================================\n');

  if (!API_KEY) {
    console.error('❌ SPORTSGAMEODDS_API_KEY not set');
    return;
  }

  try {
    // Make the same API call the Edge Function makes
    const endpoint = `/v2/events?sportID=FOOTBALL&season=2025&week=6&oddsAvailable=true&markets=playerProps&limit=10`;
    console.log(`📡 Making API call to: ${SPORTSGAMEODDS_BASE_URL}${endpoint}`);

    const response = await fetch(`${SPORTSGAMEODDS_BASE_URL}${endpoint}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Statpedia/1.0',
        'x-api-key': API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ API Response: ${data.data?.length || 0} events`);

    if (data.data && data.data.length > 0) {
      const firstEvent = data.data[0];
      console.log('\n📊 First Event Analysis:');
      console.log(`   Event ID: ${firstEvent.eventID}`);
      console.log(`   Teams: ${firstEvent.teams?.home?.names?.short} vs ${firstEvent.teams?.away?.names?.short}`);
      console.log(`   Odds count: ${Object.keys(firstEvent.odds || {}).length}`);
      
      // Analyze the odds structure
      const oddsKeys = Object.keys(firstEvent.odds || {});
      console.log('\n🎯 Odds Analysis:');
      console.log(`   Total odds: ${oddsKeys.length}`);
      
      // Look for player prop patterns
      let playerPropCount = 0;
      let samplePlayerProps = [];
      
      for (const oddId of oddsKeys.slice(0, 20)) { // Check first 20 odds
        const oddData = firstEvent.odds[oddId];
        const oddIdParts = oddId.split('-');
        
        if (oddIdParts.length >= 5) {
          const [statID, playerID, periodID, betTypeID, sideID] = oddIdParts;
          
          // Check if it looks like a player prop
          const isPlayerID = /^[A-Z_]+_[A-Z_]+_\d+_[A-Z]+$/.test(playerID);
          const isOverUnder = betTypeID === 'ou' || betTypeID === 'over_under';
          
          if (isPlayerID && isOverUnder) {
            playerPropCount++;
            if (samplePlayerProps.length < 5) {
              samplePlayerProps.push({
                oddId,
                statID,
                playerID,
                betTypeID,
                sideID,
                hasByBookmaker: !!oddData.byBookmaker,
                bookmakerCount: Object.keys(oddData.byBookmaker || {}).length
              });
            }
          }
        }
      }
      
      console.log(`   Player prop odds found: ${playerPropCount}`);
      console.log('\n📝 Sample Player Props:');
      samplePlayerProps.forEach((prop, index) => {
        console.log(`   ${index + 1}. ${prop.oddId}`);
        console.log(`      StatID: ${prop.statID}`);
        console.log(`      PlayerID: ${prop.playerID}`);
        console.log(`      BetType: ${prop.betTypeID}`);
        console.log(`      Side: ${prop.sideID}`);
        console.log(`      Bookmakers: ${prop.bookmakerCount}`);
      });
      
      // Test the isPlayerProp function logic
      console.log('\n🧪 Testing isPlayerProp Logic:');
      let validPlayerProps = 0;
      for (const oddId of oddsKeys.slice(0, 10)) {
        const oddData = firstEvent.odds[oddId];
        const oddIdParts = oddId.split('-');
        
        if (oddIdParts.length >= 5) {
          const [statID, playerID, periodID, betTypeID, sideID] = oddIdParts;
          const isPlayerID = /^[A-Z_]+_[A-Z_]+_\d+_[A-Z]+$/.test(playerID);
          const isOverUnder = betTypeID === 'ou' || betTypeID === 'over_under';
          const normalizedStatID = statID.toLowerCase();
          const isPlayerStat = normalizedStatID.includes('passing') ||
                              normalizedStatID.includes('rushing') ||
                              normalizedStatID.includes('receiving') ||
                              normalizedStatID.includes('touchdown') ||
                              normalizedStatID.includes('yards') ||
                              normalizedStatID.includes('receptions') ||
                              normalizedStatID.includes('field') ||
                              normalizedStatID.includes('kicking') ||
                              normalizedStatID.includes('points');
          
          const isPlayerProp = isPlayerID && isOverUnder && isPlayerStat;
          
          if (isPlayerProp) {
            validPlayerProps++;
            console.log(`   ✅ ${oddId} - Valid player prop`);
          } else {
            console.log(`   ❌ ${oddId} - Not a player prop (isPlayerID: ${isPlayerID}, isOverUnder: ${isOverUnder}, isPlayerStat: ${isPlayerStat})`);
          }
        }
      }
      
      console.log(`\n📊 Summary: ${validPlayerProps} valid player props found in first 10 odds`);
      
    } else {
      console.log('❌ No events found in API response');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugEdgeFunctionData().catch(console.error);
