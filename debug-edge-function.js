#!/usr/bin/env node

/**
 * Debug Edge Function API Call
 * 
 * This script tests the exact API call that the Edge Function should be making
 */

const SPORTSGAMEODDS_API_KEY = 'd5dc1f00bc42133550bc1605dd8f457f';

async function debugEdgeFunctionCall() {
  console.log('🔍 Debugging Edge Function API Call');
  console.log('===================================\n');

  try {
    // Test the exact endpoint the Edge Function should be calling
    const endpoint = '/v2/events?sportID=FOOTBALL&season=2025&week=6&oddsAvailable=true&markets=playerProps&limit=10';
    console.log(`📡 Testing endpoint: ${endpoint}`);
    
    const response = await fetch(`https://api.sportsgameodds.com${endpoint}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Statpedia/1.0',
        'x-api-key': SPORTSGAMEODDS_API_KEY
      }
    });

    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ API Response Success: ${data.success}`);
    console.log(`📈 Data Length: ${data.data?.length || 0}`);
    
    if (data.data && data.data.length > 0) {
      const firstEvent = data.data[0];
      console.log(`🏈 First Event: ${firstEvent.teams?.away?.names?.short || 'AWAY'} @ ${firstEvent.teams?.home?.names?.short || 'HOME'}`);
      console.log(`🎯 Odds Count: ${Object.keys(firstEvent.odds || {}).length}`);
      
      // Count player props
      let playerPropsCount = 0;
      for (const [oddId, oddData] of Object.entries(firstEvent.odds || {})) {
        if (isPlayerProp(oddData, oddId)) {
          playerPropsCount++;
        }
      }
      console.log(`⚡ Player Props Found: ${playerPropsCount}`);
    }

    // Test without week parameter
    console.log('\n🔧 Testing without week parameter...');
    const endpointNoWeek = '/v2/events?sportID=FOOTBALL&season=2025&oddsAvailable=true&markets=playerProps&limit=10';
    
    const responseNoWeek = await fetch(`https://api.sportsgameodds.com${endpointNoWeek}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Statpedia/1.0',
        'x-api-key': SPORTSGAMEODDS_API_KEY
      }
    });

    const dataNoWeek = await responseNoWeek.json();
    console.log(`✅ API Response Success (no week): ${dataNoWeek.success}`);
    console.log(`📈 Data Length (no week): ${dataNoWeek.data?.length || 0}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

function isPlayerProp(odd, oddId) {
  if (!odd || !oddId) return false;
  
  const oddIdParts = oddId.split('-');
  if (oddIdParts.length < 5) return false;
  
  const [statID, playerID, periodID, betTypeID, sideID] = oddIdParts;
  
  // Check if the second part looks like a player ID (FIRSTNAME_LASTNAME_NUMBER_LEAGUE)
  const isPlayerID = /^[A-Z_]+_[A-Z_]+_\d+_[A-Z]+$/.test(playerID);
  
  // Check if it's an over/under bet
  const isOverUnder = betTypeID === 'ou' || betTypeID === 'over_under';
  
  // Check if the statID is one we can normalize (or is a common player prop)
  const normalizedStatID = statID.toLowerCase();
  const isPlayerStat = normalizedStatID.includes('passing') ||
                      normalizedStatID.includes('rushing') ||
                      normalizedStatID.includes('receiving') ||
                      normalizedStatID.includes('touchdown') ||
                      normalizedStatID.includes('yards') ||
                      normalizedStatID.includes('receptions') ||
                      normalizedStatID.includes('field') ||
                      normalizedStatID.includes('kicking') ||
                      normalizedStatID.includes('points') ||
                      normalizedStatID.includes('extra');
  
  return isPlayerID && isOverUnder && isPlayerStat;
}

// Run the debug
debugEdgeFunctionCall().catch(console.error);
