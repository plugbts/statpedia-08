import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, and, sql } from "drizzle-orm";
import { config } from 'dotenv';
import { leagues, teams, players, props } from "../db/schema/index.js";

config({ path: '.env.local' }); // Ensure env vars are loaded

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const db = drizzle(pool);

// Function to normalize prop types to human-readable format
function normalizePropType(market: string, sport: string): string {
  const key = market.toLowerCase().replace(/\s+/g, "_");
  switch (key) {
    case "passing_yards": return "Passing Yards";
    case "rushing_yards": return "Rushing Yards";
    case "receiving_yards": return "Receiving Yards";
    case "receptions": return "Receptions";
    case "rush_attempts": return "Rush Attempts";
    case "passing_tds":
    case "passing_touchdowns": return "Passing TDs";
    case "rushing_tds":
    case "rushing_touchdowns": return "Rushing TDs";
    case "receiving_tds":
    case "receiving_touchdowns": return "Receiving TDs";
    case "firsttouchdown": return "First Touchdown";
    case "lasttouchdown": return "Last Touchdown";
    case "touchdowns": return "Any Touchdown";
    case "points": return "Points";
    case "assists": return "Assists";
    case "rebounds": return "Rebounds";
    case "shots_on_goal": return "Shots on Goal";
    case "saves": return "Saves";
    case "defense_combinedtackles": return "Combined Tackles";
    case "defense_sacks": return "Sacks";
    case "defense_interceptions": return "Interceptions";
    // Add sport-specific mappings if needed
    case "home_runs": return "Home Runs"; // MLB
    case "strikeouts": return "Strikeouts"; // MLB
    case "stolen_bases": return "Stolen Bases"; // MLB
    default: return market;
  }
}

// Function to build conflict key for upserts
function buildConflictKey(league: string, gameId: string, playerId: string, market: string, line: string, odds: string): string {
  return `${league}:${gameId}:${playerId}:${normalizePropType(market, league)}:${line}:${odds}`;
}

// Function to extract player name from playerID
function extractPlayerName(playerId: string): string {
  return playerId.replace(/_1_[A-Z]+$/, '').replace(/_/g, ' ');
}

// Function to get or create team (simplified for now)
async function getOrCreateTeam(leagueCode: string, teamName: string): Promise<string> {
  // For now, we'll need to map team names to our database teams
  // This is a simplified version - in production you'd want more sophisticated matching
  const team = await db.select().from(teams)
    .innerJoin(leagues, eq(teams.leagueId, leagues.id))
    .where(and(
      eq(leagues.code, leagueCode.toUpperCase()),
      eq(teams.name, teamName)
    ))
    .limit(1);
  
  if (team.length > 0) {
    return team[0].teams.id;
  }
  
  // If team not found, skip this prop (no placeholder data)
  console.warn(`⚠️  Team not found: ${teamName} in ${leagueCode}. Skipping props for this team.`);
  throw new Error(`Team not found: ${teamName}`);
}

// Function to get or create player
async function getOrCreatePlayer(teamId: string, playerName: string): Promise<string> {
  const player = await db.select().from(players)
    .where(and(
      eq(players.teamId, teamId),
      eq(players.name, playerName)
    ))
    .limit(1);
  
  if (player.length > 0) {
    return player[0].id;
  }
  
  // If player not found, create a new player entry
  console.log(`📝 Creating new player: ${playerName}`);
  const newPlayer = await db.insert(players).values({
    teamId,
    name: playerName,
    status: "Active" // Assume active for upcoming games
  }).returning({ id: players.id });
  
  return newPlayer[0].id;
}

export async function ingestUpcomingProps(league: string): Promise<void> {
  const API_KEY = process.env.SPORTSGAMEODDS_API_KEY;
  
  if (!API_KEY) {
    throw new Error('SportsGameOdds API key not provided');
  }
  
  console.log(`🚀 Starting upcoming props ingestion for ${league.toUpperCase()}...`);
  
  try {
    // Fetch events with oddsAvailable=true and filter by league
    const response = await fetch(`https://api.sportsgameodds.com/v2/events?oddsAvailable=true&leagueID=${league.toUpperCase()}`, {
      headers: { 
        "X-API-Key": `${API_KEY}`,
        "Content-Type": "application/json"
      }
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const events = data.data || [];
    
    console.log(`📊 Fetched ${events.length} events from API`);
    
    let totalProps = 0;
    let skippedPlayers = 0;
    let processedPlayers = 0;
    let processedGames = 0;
    
    // Process each event
    for (const event of events) {
      // Filter games where status = "scheduled" or "Upcoming"
      const gameStatus = event.status?.displayLong?.toLowerCase() || '';
      if (!gameStatus.includes('upcoming') && !gameStatus.includes('scheduled')) {
        continue;
      }
      
      processedGames++;
      const gameId = event.id || `game_${Date.now()}_${Math.random()}`;
      const odds = event.odds || {};
      
      console.log(`🎮 Processing game ${gameId} (${gameStatus}) with ${Object.keys(odds).length} odds entries`);
      
      // Process all odds entries for player props
      for (const [oddId, oddData] of Object.entries(odds)) {
        const odd = oddData as any;
        
        // Skip non-player props (game-level props)
        if (!odd.playerID || odd.playerID === 'all') {
          continue;
        }
        
        // Extract player name from playerID
        const playerName = extractPlayerName(odd.playerID);
        
        // Skip inactive/injured players
        if (odd.cancelled || odd.ended || odd.started) {
          console.log(`⏭️  Skipping inactive prop: ${playerName} - ${odd.statID}`);
          continue;
        }
        
        // Check if odds are available
        if (!odd.bookOddsAvailable && !odd.fairOddsAvailable) {
          continue;
        }
        
        try {
          // Extract prop information
          const propType = odd.statID || 'Unknown';
          const line = odd.bookOverUnder || odd.fairOverUnder;
          const oddsValue = odd.bookOdds || odd.fairOdds;
          
          if (!line || !oddsValue) {
            continue;
          }
          
          // Normalize prop type to human-readable format
          const normalizedPropType = normalizePropType(propType, league);
          
          // Try to find the player in our database
          let playerId = null;
          let teamId = null;
          
          // Try multiple name variations to find the player
          const nameVariations = [
            playerName, // Original format
            playerName.replace(/\s+/g, ' ').trim(), // Normalized spaces
            playerName.toLowerCase(), // Lowercase
            playerName.split(' ').map(n => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase()).join(' '), // Title case
          ];

          for (const nameVar of nameVariations) {
            const dbPlayer = await db.select().from(players).where(eq(players.name, nameVar)).limit(1);
            if (dbPlayer[0]) {
              playerId = dbPlayer[0].id;
              teamId = dbPlayer[0].teamId;
              console.log(`✅ Found player: ${playerName} -> ${nameVar} (${dbPlayer[0].name})`);
              break;
            }
          }
          
          if (!playerId) {
            console.warn(`⚠️  Player not found in DB: ${playerName} (tried variations: ${nameVariations.join(', ')}). Skipping props.`);
            skippedPlayers++;
            continue;
          }
          
          const simpleGameId = `upcoming_${league}_${gameId}`;
          
          // Insert prop with proper player/team relationships
          await db.insert(props).values({
            playerId: playerId,
            teamId: teamId,
            gameId: simpleGameId,
            propType: normalizedPropType,
            line: String(line),
            odds: String(oddsValue)
          });
          
          console.log(`✅ Inserted prop: ${playerName} ${normalizedPropType} ${line} ${oddsValue}`);
          
          totalProps++;
          processedPlayers++;
          
        } catch (error) {
          console.error(`❌ Error processing prop for ${playerName}:`, error);
          skippedPlayers++;
        }
      }
    }
    
    console.log(`🎉 Upcoming props ingestion complete for ${league.toUpperCase()}!`);
    console.log(`📊 Total props found: ${totalProps}`);
    console.log(`🎮 Games processed: ${processedGames}`);
    console.log(`👥 Players processed: ${processedPlayers}`);
    console.log(`⏭️  Players skipped: ${skippedPlayers}`);
    
  } catch (error) {
    console.error(`❌ Upcoming props ingestion failed for ${league.toUpperCase()}:`, error);
    throw error;
  }
}

// Function to run ingestion for all leagues
export async function ingestAllUpcomingProps(): Promise<void> {
  const leagues = ["NFL", "NBA", "MLB", "WNBA", "NHL", "CBB"];
  
  console.log(`🚀 Starting upcoming props ingestion for all leagues: ${leagues.join(', ')}`);
  
  for (const league of leagues) {
    try {
      console.log(`\n📊 Processing ${league}...`);
      await ingestUpcomingProps(league);
      console.log(`✅ Completed ${league} ingestion`);
    } catch (error) {
      console.error(`❌ Failed to ingest ${league}:`, error);
      // Continue with other leagues
    }
  }
  
  console.log(`\n🎉 All leagues ingestion completed!`);
}
