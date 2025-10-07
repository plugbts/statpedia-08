/**
 * Nightly Ingestion Script
 * Ingests only the last 24h of events for incremental updates
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://rfdrifnsfobqlzorcesn.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI'
);

const API_KEY = process.env.SPORTSGAMEODDS_API_KEY;

// Import normalization functions from batch ingestion
import { normalizeOpponent, normalizeMarketType, normalizePlayerId } from './batch-ingestion.js';

/**
 * Get date 24 hours ago
 */
function getYesterday() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

/**
 * Ingest last 24 hours for a specific league
 */
async function ingestLast24Hours(league) {
  console.log(`🌙 Ingesting last 24 hours for ${league.toUpperCase()}...`);
  
  if (!API_KEY) {
    throw new Error('SPORTSGAMEODDS_API_KEY not found in environment variables');
  }
  
  const yesterday = getYesterday();
  const currentYear = new Date().getFullYear();
  
  try {
    // Get events from yesterday
    const url = `https://api.sportsgameodds.com/v1/${league}/events?season=${currentYear}&date=${yesterday}&limit=100`;
    
    const res = await fetch(url, { 
      headers: { 'x-api-key': API_KEY } 
    });
    
    if (!res.ok) {
      throw new Error(`API request failed: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    
    if (!data.events || data.events.length === 0) {
      console.log(`ℹ️ No events found for ${league.toUpperCase()} on ${yesterday}`);
      return 0;
    }
    
    const rows = [];
    
    for (const event of data.events) {
      if (!event.players || event.players.length === 0) {
        continue;
      }
      
      // Normalize teams
      const homeTeam = normalizeOpponent(event.home_team, league);
      const awayTeam = normalizeOpponent(event.away_team, league);
      
      for (const player of event.players) {
        if (!player.stats || Object.keys(player.stats).length === 0) {
          continue;
        }
        
        // Determine team and opponent
        const playerTeam = player.team === event.home_team ? homeTeam : awayTeam;
        const opponent = player.team === event.home_team ? awayTeam : homeTeam;
        
        // Process each stat
        for (const [statType, value] of Object.entries(player.stats)) {
          if (value === null || value === undefined) continue;
          
          const normalizedStatType = normalizeMarketType(statType);
          const normalizedPlayerId = normalizePlayerId(player.name);
          
          rows.push({
            player_id: normalizedPlayerId,
            player_name: player.name,
            team: playerTeam,
            opponent: opponent,
            season: currentYear,
            date: event.date,
            prop_type: normalizedStatType,
            value: Number(value),
            position: player.position || 'UNK',
            sport: league.toLowerCase()
          });
        }
      }
    }
    
    if (rows.length > 0) {
      const { error } = await supabase
        .from("playergamelogs")
        .upsert(rows, {
          onConflict: 'player_id,date,prop_type',
          ignoreDuplicates: false
        });
      
      if (error) {
        console.error("❌ Insert error:", error);
        return 0;
      } else {
        console.log(`✅ Inserted ${rows.length} rows for ${league.toUpperCase()}`);
        return rows.length;
      }
    }
    
    return 0;
    
  } catch (error) {
    console.error(`❌ Error ingesting ${league.toUpperCase()}:`, error);
    return 0;
  }
}

/**
 * Run nightly ingestion for all active leagues
 */
async function runNightlyIngestion() {
  console.log('🌙 Starting nightly ingestion for last 24 hours...\n');
  
  const leagues = ["nfl", "nba", "mlb", "nhl"];
  const results = {};
  let total = 0;
  
  for (const league of leagues) {
    try {
      const count = await ingestLast24Hours(league);
      results[league] = count;
      total += count;
      
      // Small delay between leagues
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`❌ Failed to process ${league}:`, error);
      results[league] = 0;
      continue;
    }
  }
  
  // Summary
  console.log('\n📊 Nightly Ingestion Summary:');
  console.log('=' .repeat(40));
  
  for (const [league, count] of Object.entries(results)) {
    console.log(`${league.toUpperCase()}: ${count} records`);
  }
  
  console.log(`\n🎉 Total: ${total} records inserted`);
  console.log('✅ Nightly ingestion complete!');
  
  return results;
}

/**
 * Main function
 */
async function main() {
  try {
    await runNightlyIngestion();
    
    console.log('\n🎯 Nightly Job Complete:');
    console.log('- Ingested last 24 hours of events');
    console.log('- Updated PlayerGameLogs with new data');
    console.log('- Analytics will reflect latest performance');
    
  } catch (error) {
    console.error('❌ Nightly ingestion failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { runNightlyIngestion, ingestLast24Hours };
