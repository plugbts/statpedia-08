/**
 * Enhanced v2 Props Ingestion with Event-Derived Team/Opponent Mapping
 * Improved version with better team identification and normalization
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { mapPlayerId } from '../utils/playerIdMap.js';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

const API_KEY = process.env.SPORTSGAMEODDS_API_KEY;
const LEAGUES = ["NFL","NBA","MLB","NHL"];

// Check if API key is available
if (!API_KEY) {
  console.error('❌ SPORTSGAMEODDS_API_KEY environment variable is required');
  process.exit(1);
}

export async function ingestPropsV2WithTeams(season) {
  console.log(`🚀 Starting enhanced v2 prop ingestion for season ${season}...`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log('=' .repeat(60));

  const results = { success: true, records: 0, leagues: {} };

  for (const league of LEAGUES) {
    console.log(`🎯 Processing ${league} props with enhanced team mapping...`);
    let leagueRecords = 0;
    let cursor = null;

    do {
      try {
        const url = `https://api.sportsgameodds.com/v2/events?apiKey=${API_KEY}&oddsAvailable=true&leagueID=${league}&season=${season}&limit=100${cursor ? `&cursor=${cursor}` : ""}`;
        
        console.log(`  📡 Fetching: ${url.replace(API_KEY, 'API_KEY_HIDDEN')}`);
        
        const res = await fetch(url);
        if (!res.ok) {
          console.error(`❌ ${league} fetch failed:`, res.status, await res.text());
          results.success = false;
          break;
        }

        const data = await res.json();
        console.log(`  📊 Found ${data.data?.length || 0} events with odds data`);

        const rows = [];
        for (const event of data.data ?? []) {
          const home = normalizeTeamName(event.teams?.home?.name || event.homeTeam?.name);
          const away = normalizeTeamName(event.teams?.away?.name || event.awayTeam?.name);
          const homeId = event.teams?.home?.id || event.homeTeam?.id || event.homeTeamId;
          const awayId = event.teams?.away?.id || event.awayTeam?.id || event.awayTeamId;

          // Extract odds data from the event
          if (!event.odds) continue;

          const gameDate = toDateOnly(event.startDate || event.info?.startDate || event.status?.startsAt) || new Date().toISOString().split('T')[0];

          // Process each odd/prop in the odds object
          for (const [oddId, oddData] of Object.entries(event.odds)) {
            // Skip non-player props (team-level props don't have playerID)
            if (!oddData.playerID) continue;

            // Only process over/under props
            if (oddData.betTypeID !== 'ou') continue;

            // Extract player name from playerID (format: PLAYER_NAME_1_NFL)
            const playerName = oddData.playerID.replace(/_1_NFL$/, '').replace(/_/g, ' ');

            // Map stat types to prop types
            const propType = normalizeMarketType(oddData.marketName || oddData.statID);
            if (!propType) continue;

            // Get the line value
            const lineValue = parseFloat(oddData.fairOverUnder || oddData.bookOverUnder);
            if (isNaN(lineValue)) continue;

            // Enhanced team detection
            let team = null;
            let opponent = null;

            // Try multiple methods to determine team
            if (oddData.playerID.includes('PHILADELPHIA_EAGLES') || oddData.playerID.includes('EAGLES')) {
              team = 'PHI';
              opponent = away;
            } else if (oddData.playerID.includes('NEW_YORK_GIANTS') || oddData.playerID.includes('GIANTS')) {
              team = 'NYG';
              opponent = home;
            } else {
              // Fallback team detection based on player ID patterns
              team = detectTeamFromPlayerId(oddData.playerID, home, away, homeId, awayId);
              opponent = team === home ? away : team === away ? home : (home || away);
            }

            // Map to canonical player ID (normalize team to ensure consistency)
            const normalizedTeam = team || 'UNK';
            const canonicalPlayerId = await mapPlayerId('props', oddData.playerID, playerName, normalizedTeam);
            if (!canonicalPlayerId) continue;

            rows.push({
              player_id: canonicalPlayerId,
              player_name: playerName,
              team: team || null,
              opponent: opponent || null,
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
          const { error } = await supabase
            .from('proplines')
            .upsert(rows);
          
          if (error) {
            console.error(`❌ Supabase upsert error for ${league}:`, error);
            results.success = false;
          } else {
            leagueRecords += rows.length;
            console.log(`  ✅ Inserted ${rows.length} props with enhanced team mapping (total: ${leagueRecords})`);
          }
        } else {
          console.log(`  ⚠️ No props found for ${league} in this batch`);
        }

        cursor = data.nextCursor ?? null;
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Error processing ${league}:`, error);
        results.success = false;
        break;
      }
    } while (cursor);

    results.leagues[league] = leagueRecords;
    results.records += leagueRecords;
    console.log(`✅ ${league}: ${leagueRecords} enhanced prop records total`);
  }

  // Final Summary
  console.log('\n🎉 ENHANCED V2 PROP INGESTION COMPLETE');
  console.log('=' .repeat(60));
  console.log(`⏱️ Total execution time: ${((Date.now() - Date.now()) / 1000).toFixed(2)}s`);
  console.log('\n🎯 RESULTS BY LEAGUE:');
  for (const [league, count] of Object.entries(results.leagues)) {
    console.log(`  ${league}: ${count} records`);
  }
  console.log(`\n📊 Total: ${results.records} enhanced prop records`);
  console.log(`✅ Success: ${results.success ? '✅' : '❌'}`);

  return results;
}

// Helper Functions

function validTeam(t) {
  return t && t !== 'UNK' && t !== 'Unknown' && t.trim().length > 0;
}

function normalizeTeamName(name) {
  if (!name) return null;
  const n = name.trim();
  
  // Enhanced team name normalization
  const teamMap = {
    'Philadelphia Eagles': 'PHI',
    'New York Giants': 'NYG',
    'Eagles': 'PHI',
    'Giants': 'NYG',
    'PHILADELPHIA_EAGLES': 'PHI',
    'NEW_YORK_GIANTS': 'NYG'
  };
  
  return teamMap[n] || n;
}

function detectTeamFromPlayerId(playerId, home, away, homeId, awayId) {
  // Enhanced team detection from player ID patterns
  if (playerId.includes('PHILADELPHIA') || playerId.includes('EAGLES')) return 'PHI';
  if (playerId.includes('NEW_YORK') || playerId.includes('GIANTS')) return 'NYG';
  
  // Try to match against team IDs or names
  if (homeId && playerId.includes(homeId)) return normalizeTeamName(home);
  if (awayId && playerId.includes(awayId)) return normalizeTeamName(away);
  
  return null;
}

function normalizeMarketType(market) {
  if (!market) return '';
  const lower = market.toLowerCase();
  
  const marketMap = {
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
  
  // Try exact match first
  if (marketMap[market]) return marketMap[market];
  
  // Fallback to pattern matching (prioritized order)
  if (lower.includes('receiving') && lower.includes('yard')) return 'Receiving Yards';
  if (lower.includes('receptions')) return 'Receptions';
  if (lower.includes('rush') && lower.includes('yard')) return 'Rushing Yards';
  if (lower.includes('pass') && lower.includes('yard')) return 'Passing Yards';
  if (lower.includes('completion')) return 'Passing Completions';
  if (lower.includes('attempt')) return 'Passing Attempts';
  if (lower.includes('touchdown')) return 'Touchdowns';
  
  return market.trim();
}

function parseOdds(oddsStr) {
  if (!oddsStr) return null;
  
  // Convert American odds to integer
  const odds = parseInt(oddsStr);
  return isNaN(odds) ? null : odds;
}

function toDateOnly(dt) {
  // Ensure DATE-only to match logs table if it stores date without time
  if (!dt) return null;
  
  try {
    // Handle ISO string dates
    if (typeof dt === 'string') {
      // If it's already in YYYY-MM-DD format, return as-is
      if (dt.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dt;
      }
      // If it has time, extract just the date part
      if (dt.includes('T')) {
        return dt.split('T')[0];
      }
    }
    
    const d = new Date(dt);
    if (isNaN(d.getTime())) {
      return null;
    }
    
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
  } catch (error) {
    console.warn(`⚠️ Date parsing error for "${dt}":`, error.message);
    return null;
  }
}

function asText(v) {
  return v == null ? null : String(v);
}

// Run if called directly
async function main() {
  try {
    const season = process.argv[2] || new Date().getFullYear();
    console.log(`🎯 Running enhanced v2 prop ingestion for season: ${season}`);
    
    const results = await ingestPropsV2WithTeams(parseInt(season));
    
    if (results.success) {
      console.log('\n✅ Enhanced v2 prop ingestion completed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ Enhanced v2 prop ingestion completed with errors');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Fatal error in enhanced v2 prop ingestion:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
