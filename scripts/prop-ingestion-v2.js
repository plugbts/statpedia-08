/**
 * Prop Ingestion V2 - Using SportsGameOdds API v2
 * Improved prop ingestion with better data structure and v2 endpoints
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

const API_KEY = process.env.SPORTSGAMEODDS_API_KEY;
const LEAGUES = ["NFL","NBA","MLB","NHL"]; // v2 expects uppercase league IDs

// Check if API key is available
if (!API_KEY) {
  console.error('❌ SPORTSGAMEODDS_API_KEY environment variable is required');
  process.exit(1);
}

async function ingestPropsV2(season) {
  console.log(`🚀 Starting prop ingestion v2 for season ${season}...`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log('=' .repeat(60));

  const results = { success: true, records: 0, leagues: {} };

  for (const league of LEAGUES) {
    console.log(`🎯 Processing ${league} props (v2 API)...`);
    let leagueRecords = 0;
    let nextCursor = null;

    do {
      try {
        const url = `https://api.sportsgameodds.com/v2/events?apiKey=${API_KEY}&oddsAvailable=true&leagueID=${league}&season=${season}&limit=100${nextCursor ? `&cursor=${nextCursor}` : ""}`;
        
        console.log(`  📡 Fetching: ${url.replace(API_KEY, 'API_KEY_HIDDEN')}`);
        
        const res = await fetch(url);
        if (!res.ok) {
          console.error(`❌ Failed to fetch props for ${league}:`, res.status, await res.text());
          results.success = false;
          break;
        }

        const data = await res.json();

        console.log(`  📊 Found ${data.data?.length || 0} events with odds data`);

        const rows = [];
        for (const event of data.data || []) {
          // Extract odds data from the event
          if (!event.odds) continue;

          const gameDate = event.startDate ? new Date(event.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
          const homeTeam = event.homeTeam?.name || 'UNK';
          const awayTeam = event.awayTeam?.name || 'UNK';

          // Process each odd/prop in the odds object
          for (const [oddId, oddData] of Object.entries(event.odds)) {
            // Skip non-player props (team-level props don't have playerID)
            if (!oddData.playerID) continue;

            // Only process over/under props
            if (oddData.betTypeID !== 'ou') continue;

            // Extract player name from playerID (format: PLAYER_NAME_1_NFL)
            const playerName = oddData.playerID.replace(/_1_NFL$/, '').replace(/_/g, ' ');

            // Map stat types to prop types
            const propType = mapStatTypeToPropType(oddData.statID);
            if (!propType) continue;

            // Get the line value
            const lineValue = parseFloat(oddData.fairOverUnder || oddData.bookOverUnder);
            if (isNaN(lineValue)) continue;

            // Determine which team the player is on
            const playerTeam = oddData.playerID.includes('PHILADELPHIA_EAGLES') ? 'PHI' : 
                              oddData.playerID.includes('NEW_YORK_GIANTS') ? 'NYG' : 'UNK';

            rows.push({
              player_id: oddData.playerID,
              player_name: playerName,
              team: playerTeam,
              opponent: playerTeam === 'PHI' ? 'NYG' : 'PHI', // Based on the game
              season: season,
              date: gameDate,
              prop_type: propType,
              line: lineValue,
              over_odds: parseOdds(oddData.sideID === 'over' ? oddData.fairOdds : null),
              under_odds: parseOdds(oddData.sideID === 'under' ? oddData.fairOdds : null),
              sportsbook: "Consensus" // Using fair odds as consensus
            });
          }
        }

        if (rows.length > 0) {
          const { error } = await supabase.from("proplines")
            .upsert(rows);
          
          if (error) {
            console.error(`❌ Supabase insert error for ${league}:`, error);
            results.success = false;
          } else {
            leagueRecords += rows.length;
            console.log(`  ✅ Inserted ${rows.length} props for ${league} (total: ${leagueRecords})`);
          }
        } else {
          console.log(`  ⚠️ No props found for ${league} in this batch`);
        }

        nextCursor = data.nextCursor;
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Error processing ${league}:`, error);
        results.success = false;
        break;
      }
    } while (nextCursor);

    results.leagues[league] = leagueRecords;
    results.records += leagueRecords;
    console.log(`✅ ${league}: ${leagueRecords} prop records total`);
  }

  // Final Summary
  console.log('\n🎉 PROP INGESTION V2 COMPLETE');
  console.log('=' .repeat(60));
  console.log(`⏱️ Total execution time: ${((Date.now() - Date.now()) / 1000).toFixed(2)}s`);
  console.log('\n🎯 RESULTS BY LEAGUE:');
  for (const [league, count] of Object.entries(results.leagues)) {
    console.log(`  ${league}: ${count} records`);
  }
  console.log(`\n📊 Total: ${results.records} prop records`);
  console.log(`✅ Success: ${results.success ? '✅' : '❌'}`);

  return results;
}

function mapStatTypeToPropType(statID) {
  if (!statID) return null;
  
  const statMap = {
    'passing_yards': 'Passing Yards',
    'rushing_yards': 'Rushing Yards', 
    'receiving_yards': 'Receiving Yards',
    'passing_completions': 'Passing Completions',
    'passing_attempts': 'Passing Attempts',
    'receiving_receptions': 'Receptions',
    'rushing_attempts': 'Rushing Attempts',
    'passing_touchdowns': 'Passing Touchdowns',
    'rushing_touchdowns': 'Rushing Touchdowns',
    'receiving_touchdowns': 'Receiving Touchdowns',
    'interceptions': 'Interceptions',
    'fantasyScore': 'Fantasy Points'
  };
  
  return statMap[statID] || null;
}

function parseOdds(oddsStr) {
  if (!oddsStr) return null;
  
  // Convert American odds to integer
  const odds = parseInt(oddsStr);
  return isNaN(odds) ? null : odds;
}

function normalizeMarketType(market) {
  if (!market) return "";
  const lower = market.toLowerCase();
  if (lower.includes("pass yard")) return "Passing Yards";
  if (lower.includes("rush yard")) return "Rushing Yards";
  if (lower.includes("rec yard")) return "Receiving Yards";
  if (lower.includes("comp")) return "Passing Completions";
  if (lower.includes("att")) return "Passing Attempts";
  if (lower.includes("td")) return "Touchdowns";
  if (lower.includes("shot")) return "Shots";
  if (lower.includes("save")) return "Saves";
  if (lower.includes("reception")) return "Receptions";
  if (lower.includes("point")) return "Points";
  if (lower.includes("rebound")) return "Rebounds";
  if (lower.includes("assist")) return "Assists";
  return market;
}

// Run if called directly
async function main() {
  try {
    const season = process.argv[2] || new Date().getFullYear();
    console.log(`🎯 Running prop ingestion v2 for season: ${season}`);
    
    const results = await ingestPropsV2(parseInt(season));
    
    if (results.success) {
      console.log('\n✅ Prop ingestion v2 completed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ Prop ingestion v2 completed with errors');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Fatal error in prop ingestion v2:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { ingestPropsV2 };
