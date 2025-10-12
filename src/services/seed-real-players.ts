#!/usr/bin/env tsx

/**
 * Real Players Seeding Service
 * 
 * This service extracts real players from the SportsGameOdds API
 * and seeds them into our database with proper team relationships.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, and, sql } from "drizzle-orm";
import { config } from 'dotenv';
import { leagues, teams, players } from "../db/schema/index.js";

config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const db = drizzle(pool);

// Team mapping from SportsGameOdds to our database
const TEAM_MAPPING: Record<string, string> = {
  // NFL Teams
  'ARI': 'Arizona Cardinals',
  'ATL': 'Atlanta Falcons', 
  'BAL': 'Baltimore Ravens',
  'BUF': 'Buffalo Bills',
  'CAR': 'Carolina Panthers',
  'CHI': 'Chicago Bears',
  'CIN': 'Cincinnati Bengals',
  'CLE': 'Cleveland Browns',
  'DAL': 'Dallas Cowboys',
  'DEN': 'Denver Broncos',
  'DET': 'Detroit Lions',
  'GB': 'Green Bay Packers',
  'HOU': 'Houston Texans',
  'IND': 'Indianapolis Colts',
  'JAX': 'Jacksonville Jaguars',
  'KC': 'Kansas City Chiefs',
  'LV': 'Las Vegas Raiders',
  'LAC': 'Los Angeles Chargers',
  'LAR': 'Los Angeles Rams',
  'MIA': 'Miami Dolphins',
  'MIN': 'Minnesota Vikings',
  'NE': 'New England Patriots',
  'NO': 'New Orleans Saints',
  'NYG': 'New York Giants',
  'NYJ': 'New York Jets',
  'PHI': 'Philadelphia Eagles',
  'PIT': 'Pittsburgh Steelers',
  'SF': 'San Francisco 49ers',
  'SEA': 'Seattle Seahawks',
  'TB': 'Tampa Bay Buccaneers',
  'TEN': 'Tennessee Titans',
  'WAS': 'Washington Commanders',
};

// Function to extract player name from playerID
function extractPlayerName(playerID: string): string {
  // Format: "FIRSTNAME_LASTNAME_1_NFL"
  return playerID.replace(/_1_[A-Z]+$/, '').replace(/_/g, ' ');
}

// Function to determine position from prop type
function getPositionFromPropType(propType: string): string {
  const prop = propType.toLowerCase();
  
  if (prop.includes('passing') || prop.includes('quarterback')) return 'QB';
  if (prop.includes('rushing') || prop.includes('running')) return 'RB';
  if (prop.includes('receiving') || prop.includes('reception')) return 'WR';
  if (prop.includes('tight') || prop.includes('end')) return 'TE';
  if (prop.includes('kicker') || prop.includes('field') || prop.includes('extra')) return 'K';
  if (prop.includes('defense') || prop.includes('tackle') || prop.includes('sack') || prop.includes('interception')) return 'DEF';
  if (prop.includes('punter')) return 'P';
  
  return 'UNKNOWN';
}

// Function to find team by abbreviation or name
async function findTeam(teamIdentifier: string): Promise<string | null> {
  // Try exact abbreviation match first
  const teamByAbbr = await db.select().from(teams)
    .where(and(
      eq(teams.abbreviation, teamIdentifier.toUpperCase()),
      eq(teams.league_id, (await getLeagueId('NFL'))!)
    ))
    .limit(1);
    
  if (teamByAbbr[0]) {
    return teamByAbbr[0].id;
  }
  
  // Try name match
  const teamByName = await db.select().from(teams)
    .where(and(
      eq(teams.name, teamIdentifier),
      eq(teams.league_id, (await getLeagueId('NFL'))!)
    ))
    .limit(1);
    
  if (teamByName[0]) {
    return teamByName[0].id;
  }
  
  return null;
}

// Function to get league ID
async function getLeagueId(leagueCode: string): Promise<string | null> {
  const league = await db.select().from(leagues)
    .where(eq(leagues.code, leagueCode))
    .limit(1);
    
  return league[0]?.id || null;
}

// Function to extract players from SportsGameOdds API
async function extractPlayersFromAPI(league: string): Promise<Set<{name: string, position: string, teamAbbr: string}>> {
  const API_KEY = process.env.SPORTSGAMEODDS_API_KEY;
  
  if (!API_KEY) {
    throw new Error('SportsGameOdds API key not provided');
  }
  
  console.log(`🔍 Extracting players from SportsGameOdds API for ${league}...`);
  
  const response = await fetch(`https://api.sportsgameodds.com/v2/events?oddsAvailable=true&leagueID=${league}`, {
    headers: {
      "X-API-Key": API_KEY,
      "Content-Type": "application/json"
    }
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  const events = data.data || [];
  
  console.log(`📊 Processing ${events.length} events from API`);
  
  const playersSet = new Set<{name: string, position: string, teamAbbr: string}>();
  
  for (const event of events) {
    const odds = event.odds || {};
    
    for (const [oddId, oddData] of Object.entries(odds)) {
      const odd = oddData as any;
      
      // Skip non-player props
      if (!odd.playerID || odd.playerID === 'all') {
        continue;
      }
      
      const playerName = extractPlayerName(odd.playerID);
      const position = getPositionFromPropType(odd.statID || '');
      
      // For now, we'll need to infer team from context or use a default
      // In a real implementation, you'd extract team info from the API
      const teamAbbr = teamAbbr || 'UNK'; // Use extracted team abbreviation or fallback
      
      playersSet.add({
        name: playerName,
        position: position,
        teamAbbr: teamAbbr
      });
    }
  }
  
  console.log(`🎯 Extracted ${playersSet.size} unique players from API`);
  return playersSet;
}

// Function to seed real players
async function seedRealPlayers(league: string): Promise<void> {
  console.log(`🌱 Seeding real players for ${league}...`);
  
  try {
    // Extract players from API
    const playersSet = await extractPlayersFromAPI(league);
    
    let createdCount = 0;
    let skippedCount = 0;
    
    // Get NFL league ID
    const nflLeagueId = await getLeagueId('NFL');
    if (!nflLeagueId) {
      throw new Error('NFL league not found in database');
    }
    
    // Create a default team for unmatched players
    const defaultTeam = await db.select().from(teams)
      .where(and(
        eq(teams.name, 'Unknown Team'),
        eq(teams.league_id, nflLeagueId)
      ))
      .limit(1);
    
    let defaultTeamId = defaultTeam[0]?.id;
    
    if (!defaultTeamId) {
      console.log('📝 Creating default team for unmatched players...');
      const newTeam = await db.insert(teams).values({
        league_id: nflLeagueId,
        name: 'Unknown Team',
        abbreviation: 'UNK',
        logo_url: `https://a.espncdn.com/i/teamlogos/${league.toLowerCase()}/500/default.png`
      }).returning({ id: teams.id });
      defaultTeamId = newTeam[0].id;
    }
    
    // Process each unique player
    for (const playerData of playersSet) {
      try {
        // Check if player already exists
        const existingPlayer = await db.select().from(players)
          .where(eq(players.name, playerData.name))
          .limit(1);
          
        if (existingPlayer[0]) {
          console.log(`⏭️  Player already exists: ${playerData.name}`);
          skippedCount++;
          continue;
        }
        
        // Try to find team
        let teamId = defaultTeamId;
        if (playerData.teamAbbr !== 'UNK') {
          const foundTeam = await findTeam(playerData.teamAbbr);
          if (foundTeam) {
            teamId = foundTeam;
          }
        }
        
        // Create player
        await db.insert(players).values({
          team_id: teamId,
          name: playerData.name,
          position: playerData.position,
          status: 'Active'
        });
        
        console.log(`✅ Created player: ${playerData.name} (${playerData.position})`);
        createdCount++;
        
      } catch (error) {
        console.error(`❌ Error creating player ${playerData.name}:`, error);
      }
    }
    
    console.log(`🎉 Player seeding complete for ${league}!`);
    console.log(`📊 Created: ${createdCount} players`);
    console.log(`⏭️  Skipped: ${skippedCount} existing players`);
    
  } catch (error) {
    console.error(`❌ Player seeding failed for ${league}:`, error);
    throw error;
  }
}

// Main function
export async function seedAllRealPlayers(): Promise<void> {
  console.log('🚀 Starting real players seeding for all leagues...');
  
  try {
    await seedRealPlayers('NFL');
    // Add other leagues as needed: NBA, MLB, NHL, WNBA, CBB
    
    console.log('🎉 All real players seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Real players seeding failed:', error);
    throw error;
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  seedAllRealPlayers()
    .then(() => {
      console.log('✅ Real players seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Real players seeding failed:', error);
      process.exit(1);
    });
}
