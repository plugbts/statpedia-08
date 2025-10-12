/**
 * Prop Ingestion Service for StatPedia
 * 
 * This service ingests props from SportsGameOdds API and inserts them
 * into our clean Neon schema while preserving team mapping and logos.
 */

import { drizzle } from "drizzle-orm/neon-serverless";
import { neon } from "@neondatabase/serverless";
import { eq, and } from "drizzle-orm";

// Import our existing schema (using the clean schema we built)
import { db } from "@/db";
import { leagues, teams, players, props } from "@/db/schema";

// Types for the API response
interface SportsGameOddsPlayer {
  id: string;
  name: string;
  position: string;
  status?: string;
  team_id: string;
  team_name: string;
  team_abbreviation: string;
  props: Array<{
    market: string;
    line: number;
    odds: string;
    over_odds?: string;
    under_odds?: string;
  }>;
}

interface SportsGameOddsGame {
  id: string;
  sport: string;
  date: string;
  players: SportsGameOddsPlayer[];
}

interface SportsGameOddsResponse {
  games: SportsGameOddsGame[];
}

// Normalize prop types from API -> human-readable labels
function normalizePropType(market: string, sport: string): string {
  const lowerMarket = market.toLowerCase();
  
  // Sport-specific mappings
  if (sport.toLowerCase() === 'nfl') {
    switch (lowerMarket) {
      case "passing_yards": return "Passing Yards";
      case "rushing_yards": return "Rushing Yards";
      case "receiving_yards": return "Receiving Yards";
      case "receptions": return "Receptions";
      case "rush_attempts": return "Rush Attempts";
      case "passing_tds": return "Passing Touchdowns";
      case "rushing_tds": return "Rushing Touchdowns";
      case "receiving_tds": return "Receiving Touchdowns";
      case "passing_attempts": return "Passing Attempts";
      case "passing_completions": return "Passing Completions";
      case "interceptions": return "Interceptions";
      default: return market;
    }
  }
  
  if (sport.toLowerCase() === 'nba') {
    switch (lowerMarket) {
      case "points": return "Points";
      case "rebounds": return "Rebounds";
      case "assists": return "Assists";
      case "steals": return "Steals";
      case "blocks": return "Blocks";
      case "three_pointers_made": return "Three Pointers Made";
      case "field_goals_made": return "Field Goals Made";
      case "free_throws_made": return "Free Throws Made";
      default: return market;
    }
  }
  
  if (sport.toLowerCase() === 'mlb') {
    switch (lowerMarket) {
      case "hits": return "Hits";
      case "home_runs": return "Home Runs";
      case "runs": return "Runs";
      case "rbis": return "RBIs";
      case "strikeouts": return "Strikeouts";
      case "walks": return "Walks";
      default: return market;
    }
  }
  
  // Default fallback
  return market;
}

// Get or create league by code
async function getOrCreateLeague(code: string, name: string): Promise<string> {
  try {
    // Try to find existing league
    const existingLeague = await db.select().from(leagues).where(eq(leagues.code, code)).limit(1);
    
    if (existingLeague.length > 0) {
      return existingLeague[0].id;
    }
    
    // Create new league
    const newLeague = await db.insert(leagues).values({
      code,
      name
    }).returning({ id: leagues.id });
    
    console.log(`✅ Created new league: ${code} - ${name}`);
    return newLeague[0].id;
  } catch (error) {
    console.error(`❌ Error with league ${code}:`, error);
    throw error;
  }
}

// Get or create team by league and details
async function getOrCreateTeam(
  leagueId: string, 
  name: string, 
  abbreviation: string, 
  logoUrl?: string
): Promise<string> {
  try {
    // Try to find existing team
    const existingTeam = await db.select()
      .from(teams)
      .where(and(
        eq(teams.league_id, leagueId),
        eq(teams.abbreviation, abbreviation)
      ))
      .limit(1);
    
    if (existingTeam.length > 0) {
      // Update logo URL if provided and different
      if (logoUrl && existingTeam[0].logo_url !== logoUrl) {
        await db.update(teams)
          .set({ logo_url: logoUrl })
          .where(eq(teams.id, existingTeam[0].id));
      }
      return existingTeam[0].id;
    }
    
    // Create new team
    const newTeam = await db.insert(teams).values({
      league_id: leagueId,
      name,
      abbreviation,
      logo_url: logoUrl
    }).returning({ id: teams.id });
    
    console.log(`✅ Created new team: ${abbreviation} - ${name}`);
    return newTeam[0].id;
  } catch (error) {
    console.error(`❌ Error with team ${abbreviation}:`, error);
    throw error;
  }
}

// Get or create player
async function getOrCreatePlayer(
  teamId: string,
  name: string,
  position: string,
  status?: string
): Promise<string> {
  try {
    // Try to find existing player
    const existingPlayer = await db.select()
      .from(players)
      .where(and(
        eq(players.team_id, teamId),
        eq(players.name, name)
      ))
      .limit(1);
    
    if (existingPlayer.length > 0) {
      // Update status if provided
      if (status && existingPlayer[0].status !== status) {
        await db.update(players)
          .set({ status })
          .where(eq(players.id, existingPlayer[0].id));
      }
      return existingPlayer[0].id;
    }
    
    // Create new player
    const newPlayer = await db.insert(players).values({
      team_id: teamId,
      name,
      position,
      status: status || 'Active'
    }).returning({ id: players.id });
    
    console.log(`✅ Created new player: ${name} (${position})`);
    return newPlayer[0].id;
  } catch (error) {
    console.error(`❌ Error with player ${name}:`, error);
    throw error;
  }
}

// Main ingestion function
export async function ingestProps(sport: string = 'nfl', apiKey?: string): Promise<void> {
  const API_KEY = apiKey || process.env.SPORTSGAMEODDS_API_KEY;
  
  if (!API_KEY) {
    throw new Error('SportsGameOdds API key not provided');
  }
  
  console.log(`🚀 Starting prop ingestion for ${sport.toUpperCase()}...`);
  
  try {
    // Fetch from SportsGameOdds API
    const response = await fetch(`https://api.sportsgameodds.com/v1/props?sport=${sport}`, {
      headers: { 
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      }
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data: SportsGameOddsResponse = await response.json();
    console.log(`📊 Fetched ${data.games.length} games from API`);
    
    let totalProps = 0;
    let skippedPlayers = 0;
    
    // Process each game
    for (const game of data.games) {
      console.log(`🎮 Processing game ${game.id} with ${game.players.length} players`);
      
      // Get or create league
      const leagueId = await getOrCreateLeague(
        sport.toUpperCase(),
        getLeagueName(sport)
      );
      
      // Process each player
      for (const player of game.players) {
        // Skip injured/inactive players
        if (player.status && 
            !['active', 'probable', 'questionable'].includes(player.status.toLowerCase())) {
          console.log(`⏭️  Skipping ${player.name} (${player.status})`);
          skippedPlayers++;
          continue;
        }
        
        // Get or create team
        const teamId = await getOrCreateTeam(
          leagueId,
          player.team_name,
          player.team_abbreviation,
          getTeamLogoUrl(player.team_abbreviation, sport)
        );
        
        // Get or create player
        const playerId = await getOrCreatePlayer(
          teamId,
          player.name,
          player.position,
          player.status
        );
        
        // Process props
        const propInserts = [];
        
        for (const prop of player.props) {
          propInserts.push({
            player_id: playerId,
            team_id: teamId,
            game_id: game.id,
            prop_type: normalizePropType(prop.market, sport),
            line: prop.line,
            odds: prop.odds || `${prop.over_odds}/${prop.under_odds}`,
          });
        }
        
        // Insert props in batch
        if (propInserts.length > 0) {
          await db.insert(props).values(propInserts).onConflictDoNothing();
          totalProps += propInserts.length;
          console.log(`✅ Inserted ${propInserts.length} props for ${player.name}`);
        }
      }
    }
    
    console.log(`🎉 Ingestion complete!`);
    console.log(`📊 Total props inserted: ${totalProps}`);
    console.log(`⏭️  Players skipped (injured/inactive): ${skippedPlayers}`);
    
  } catch (error) {
    console.error('❌ Ingestion failed:', error);
    throw error;
  }
}

// Helper function to get league name from sport code
function getLeagueName(sport: string): string {
  const leagueNames: Record<string, string> = {
    'nfl': 'National Football League',
    'nba': 'National Basketball Association',
    'mlb': 'Major League Baseball',
    'nhl': 'National Hockey League',
    'wnba': 'Women\'s National Basketball Association',
    'cbb': 'College Basketball'
  };
  
  return leagueNames[sport.toLowerCase()] || `${sport.toUpperCase()} League`;
}

// Helper function to get team logo URL
function getTeamLogoUrl(abbreviation: string, sport: string): string {
  // Use ESPN logos for consistency
  return `https://a.espncdn.com/i/teamlogos/${sport.toLowerCase()}/500/${abbreviation.toLowerCase()}.png`;
}

// Batch ingestion for multiple sports
export async function ingestAllSports(): Promise<void> {
  const sports = ['nfl', 'nba', 'mlb', 'nhl'];
  
  for (const sport of sports) {
    try {
      await ingestProps(sport);
      console.log(`✅ Completed ingestion for ${sport.toUpperCase()}`);
    } catch (error) {
      console.error(`❌ Failed to ingest ${sport}:`, error);
      // Continue with next sport
    }
  }
}

// Utility function to clear old props before re-ingestion
export async function clearOldProps(sport?: string): Promise<void> {
  try {
    if (sport) {
      // Clear props for specific sport by joining with teams/leagues
      await db.delete(props)
        .where(
          eq(leagues.code, sport.toUpperCase())
        );
      console.log(`🗑️  Cleared old props for ${sport.toUpperCase()}`);
    } else {
      // Clear all props
      await db.delete(props);
      console.log(`🗑️  Cleared all old props`);
    }
  } catch (error) {
    console.error('❌ Error clearing old props:', error);
    throw error;
  }
}
