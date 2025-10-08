/**
 * Test using Events API for prop lines (since prop APIs are broken)
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' });

const API_KEY = process.env.SPORTSGAMEODDS_API_KEY;

async function testEventsOdds() {
  console.log('🎯 Testing Events API for Prop Lines');
  console.log('='.repeat(40));

  try {
    // Get events with odds data
    console.log('Fetching events with odds data...');
    const response = await fetch('https://api.sportsgameodds.com/events?league=nfl&limit=50', {
      headers: { 'x-api-key': API_KEY }
    });
    
    if (!response.ok) {
      console.error(`❌ API error: ${response.status} ${response.statusText}`);
      return;
    }

    const data = await response.json();
    console.log(`✅ Got ${data.data?.length || 0} events`);

    // Analyze events with odds
    let eventsWithOdds = 0;
    let totalProps = 0;
    let uniquePlayers = new Set();
    let sampleProps = [];

    for (const event of data.data || []) {
      if (event.odds && Object.keys(event.odds).length > 0) {
        eventsWithOdds++;
        
        // Extract props from odds
        for (const [playerId, playerOdds] of Object.entries(event.odds)) {
          if (playerOdds && typeof playerOdds === 'object') {
            for (const [propType, propData] of Object.entries(playerOdds)) {
              if (propData && typeof propData === 'object') {
                totalProps++;
                uniquePlayers.add(playerId);
                
                // Collect sample props
                if (sampleProps.length < 10) {
                  sampleProps.push({
                    playerId,
                    propType,
                    overOdds: propData.over,
                    underOdds: propData.under,
                    line: propData.line
                  });
                }
              }
            }
          }
        }
      }
    }

    console.log(`📊 Events with odds: ${eventsWithOdds}`);
    console.log(`📊 Total props found: ${totalProps}`);
    console.log(`📊 Unique players with props: ${uniquePlayers.size}`);

    console.log('\n📋 Sample props from Events API:');
    sampleProps.forEach((prop, i) => {
      console.log(`${i + 1}. ${prop.playerId} - ${prop.propType}`);
      console.log(`   Line: ${prop.line}, Over: ${prop.overOdds}, Under: ${prop.underOdds}`);
    });

    // Show sample unique players
    console.log('\n📋 Sample unique players with props:');
    Array.from(uniquePlayers).slice(0, 15).forEach((player, i) => {
      console.log(`  ${i + 1}. ${player}`);
    });

    console.log('\n🎉 Events API odds analysis complete!');
    console.log('='.repeat(40));

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

testEventsOdds().catch(console.error);
