#!/usr/bin/env node

/**
 * Improved Prop Extraction Test
 * 
 * This script tests the improved prop extraction logic to see
 * how many player props we should actually be getting from the API
 */

const SPORTSGAMEODDS_API_KEY = 'f05c244cbea5222d806f91c412350940';

async function testImprovedExtraction() {
  console.log('🔧 Testing Improved Prop Extraction');
  console.log('===================================\n');

  try {
    // Get events from the API
    const response = await fetch('https://api.sportsgameodds.com/v2/events?sportID=FOOTBALL&season=2025&week=6&oddsAvailable=true&markets=playerProps&limit=10', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Statpedia/1.0',
        'x-api-key': SPORTSGAMEODDS_API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success || !data.data || data.data.length === 0) {
      console.log('❌ No events found');
      return;
    }

    console.log(`✅ Found ${data.data.length} events\n`);

    let totalPlayerProps = 0;
    let totalEventsWithProps = 0;

    // Analyze each event
    for (let i = 0; i < data.data.length; i++) {
      const event = data.data[i];
      const homeTeam = event.teams?.home?.names?.short || 'HOME';
      const awayTeam = event.teams?.away?.names?.short || 'AWAY';
      
      console.log(`🏈 Event ${i + 1}: ${awayTeam} @ ${homeTeam}`);
      
      let eventPlayerProps = 0;
      const propTypes = new Set();
      const players = new Set();
      
      // Check all odds in this event
      for (const [oddId, oddData] of Object.entries(event.odds || {})) {
        if (isPlayerProp(oddData, oddId)) {
          eventPlayerProps++;
          propTypes.add(oddId.split('-')[0]);
          players.add(oddId.split('-')[1]);
        }
      }
      
      console.log(`   📊 Player Props: ${eventPlayerProps}`);
      console.log(`   🎯 Prop Types: ${Array.from(propTypes).join(', ')}`);
      console.log(`   👥 Players: ${players.size}`);
      console.log('');
      
      totalPlayerProps += eventPlayerProps;
      if (eventPlayerProps > 0) totalEventsWithProps++;
    }

    console.log('📈 Summary:');
    console.log(`   Total Events: ${data.data.length}`);
    console.log(`   Events with Props: ${totalEventsWithProps}`);
    console.log(`   Total Player Props: ${totalPlayerProps}`);
    console.log(`   Average Props per Event: ${(totalPlayerProps / data.data.length).toFixed(1)}`);
    console.log(`   Average Props per Event (with props): ${totalEventsWithProps > 0 ? (totalPlayerProps / totalEventsWithProps).toFixed(1) : 0}`);

    // Test the extraction logic on a single event
    console.log('\n🔍 Detailed Analysis of First Event:');
    const firstEvent = data.data[0];
    const firstEventProps = extractPlayerPropsFromEvent(firstEvent);
    
    console.log(`   Extracted Props: ${firstEventProps.length}`);
    console.log('   Sample Props:');
    firstEventProps.slice(0, 10).forEach((prop, index) => {
      console.log(`     ${index + 1}. ${prop.playerName} - ${prop.propType} ${prop.line}`);
    });
    
    if (firstEventProps.length > 10) {
      console.log(`     ... and ${firstEventProps.length - 10} more`);
    }

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

function extractPlayerPropsFromEvent(event) {
  const props = [];
  const homeTeam = event.teams?.home?.names?.short || 'HOME';
  const awayTeam = event.teams?.away?.names?.short || 'AWAY';
  
  for (const [oddId, oddData] of Object.entries(event.odds || {})) {
    if (!isPlayerProp(oddData, oddId)) continue;
    
    // Only process 'over' side - we'll find the corresponding 'under' side
    if (!oddId.includes('-over')) continue;
    
    const underOddId = oddId.replace('-over', '-under');
    const underOdd = event.odds[underOddId];
    
    if (!underOdd) continue;
    
    // Process each bookmaker's odds
    if (oddData.byBookmaker) {
      for (const [bookmakerId, bookmakerData] of Object.entries(oddData.byBookmaker)) {
        const overData = bookmakerData;
        
        if (!overData.available) continue;
        
        const underData = underOdd.byBookmaker?.[bookmakerId];
        if (!underData || !underData.available) continue;
        
        // Extract prop information
        const oddIdParts = oddId.split('-');
        const statID = oddIdParts[0];
        const playerID = oddIdParts[1];
        
        const playerName = extractPlayerName(playerID);
        const propType = normalizePropType(statID);
        const line = overData.overUnder || overData.line || 0;
        const overOdds = parseOdds(overData.odds);
        const underOdds = parseOdds(underData.odds);
        
        if (overOdds && underOdds && line) {
          props.push({
            playerID,
            playerName,
            propType,
            line,
            overOdds,
            underOdds,
            sportsbook: mapBookmakerIdToName(bookmakerId),
            statID
          });
        }
      }
    }
  }
  
  return props;
}

function extractPlayerName(playerID) {
  try {
    const parts = playerID.split('_');
    if (parts.length < 4) return 'Unknown Player';
    
    const firstName = parts[0].charAt(0) + parts[0].slice(1).toLowerCase();
    const lastName = parts[1].charAt(0) + parts[1].slice(1).toLowerCase();
    
    return `${firstName} ${lastName}`;
  } catch (error) {
    return 'Unknown Player';
  }
}

function normalizePropType(statID) {
  const canonicalMappings = {
    'passing_yards': 'Passing Yards',
    'passing_touchdowns': 'Passing TDs',
    'rushing_yards': 'Rushing Yards',
    'rushing_touchdowns': 'Rushing TDs',
    'receiving_yards': 'Receiving Yards',
    'receiving_touchdowns': 'Receiving TDs',
    'extraPoints_kicksMade': 'Extra Points Made',
    'fieldGoals_made': 'Field Goals Made',
    'kicking_totalPoints': 'Kicking Total Points',
    'firstTouchdown': 'First Touchdown'
  };
  
  return canonicalMappings[statID] || statID.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function parseOdds(odds) {
  if (odds === null || odds === undefined) return null;
  
  if (typeof odds === 'number') return odds;
  
  if (typeof odds === 'string') {
    const cleanOdds = odds.replace(/[^-+0-9]/g, '');
    const parsed = parseInt(cleanOdds);
    return isNaN(parsed) ? null : parsed;
  }
  
  return null;
}

function mapBookmakerIdToName(bookmakerId) {
  const bookmakerMap = {
    'fanduel': 'FanDuel',
    'draftkings': 'Draft Kings',
    'betmgm': 'BetMGM',
    'caesars': 'Caesars',
    'pointsbet': 'PointsBet',
    'betrivers': 'BetRivers',
    'foxbet': 'FOX Bet',
    'bet365': 'bet365',
    'williamhill': 'William Hill',
    'pinnacle': 'Pinnacle',
    'bovada': 'Bovada',
    'betonline': 'BetOnline',
    'betway': 'Betway',
    'unibet': 'Unibet',
    'ladbrokes': 'Ladbrokes',
    'coral': 'Coral',
    'paddypower': 'Paddy Power',
    'skybet': 'Sky Bet',
    'boylesports': 'BoyleSports',
    'betfair': 'Betfair',
    'betvictor': 'Bet Victor',
    'betfred': 'Betfred',
    'prizepicks': 'PrizePicks',
    'fliff': 'Fliff',
    'prophetexchange': 'Prophet Exchange',
    'unknown': 'Unknown Sportsbook'
  };

  return bookmakerMap[bookmakerId.toLowerCase()] || bookmakerId;
}

// Run the test
testImprovedExtraction().catch(console.error);
