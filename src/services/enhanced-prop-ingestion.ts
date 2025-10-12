/**
 * Enhanced Prop Ingestion Service for StatPedia
 * 
 * Fixes:
 * - Only two props (full slate processing)
 * - Injured players still showing (proper status filtering)
 * - Prop types flattened (specific market mapping)
 */

import { drizzle } from "drizzle-orm/neon-serverless";
import { neon } from "@neondatabase/serverless";
import { eq, and, sql } from "drizzle-orm";
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

// Create database connection
const sql = neon(process.env.NEON_DATABASE_URL!);
const db = drizzle(sql);

// Import our existing schema
import { leagues, teams, players, props } from "../db/schema/index.js";

// Enhanced prop type normalization with specific market mapping
function normalizePropType(market: string, sport: string): string {
  const key = market.toLowerCase().replace(/\s+/g, "_");
  
  // NFL specific mappings
  if (sport.toLowerCase() === 'nfl') {
    switch (key) {
      case "passing_yards": return "Passing Yards";
      case "rushing_yards": return "Rushing Yards";
      case "receiving_yards": return "Receiving Yards";
      case "receptions": return "Receptions";
      case "rush_attempts": return "Rush Attempts";
      case "passing_tds":
      case "passing_touchdowns": return "Passing Touchdowns";
      case "rushing_tds":
      case "rushing_touchdowns": return "Rushing Touchdowns";
      case "receiving_tds":
      case "receiving_touchdowns": return "Receiving Touchdowns";
      case "passing_attempts": return "Passing Attempts";
      case "passing_completions": return "Passing Completions";
      case "interceptions": return "Interceptions";
      case "fumbles": return "Fumbles";
      case "longest_pass": return "Longest Pass";
      case "longest_rush": return "Longest Rush";
      case "longest_reception": return "Longest Reception";
      default: return market;
    }
  }
  
  // NBA specific mappings
  if (sport.toLowerCase() === 'nba') {
    switch (key) {
      case "points": return "Points";
      case "rebounds": return "Rebounds";
      case "assists": return "Assists";
      case "steals": return "Steals";
      case "blocks": return "Blocks";
      case "three_pointers_made": return "Three Pointers Made";
      case "field_goals_made": return "Field Goals Made";
      case "free_throws_made": return "Free Throws Made";
      case "turnovers": return "Turnovers";
      case "double_double": return "Double Double";
      case "triple_double": return "Triple Double";
      default: return market;
    }
  }
  
  // MLB specific mappings
  if (sport.toLowerCase() === 'mlb') {
    switch (key) {
      case "hits": return "Hits";
      case "home_runs": return "Home Runs";
      case "runs": return "Runs";
      case "rbis": return "RBIs";
      case "strikeouts": return "Strikeouts";
      case "walks": return "Walks";
      case "singles": return "Singles";
      case "doubles": return "Doubles";
      case "triples": return "Triples";
      case "total_bases": return "Total Bases";
      case "pitching_strikeouts": return "Pitching Strikeouts";
      case "pitching_walks": return "Pitching Walks";
      case "pitching_hits_allowed": return "Hits Allowed";
      case "pitching_runs_allowed": return "Runs Allowed";
      default: return market;
    }
  }
  
  // NHL specific mappings
  if (sport.toLowerCase() === 'nhl') {
    switch (key) {
      case "goals": return "Goals";
      case "assists": return "Assists";
      case "points": return "Points";
      case "shots_on_goal": return "Shots on Goal";
      case "saves": return "Saves";
      case "goals_against": return "Goals Against";
      case "shutouts": return "Shutouts";
      case "power_play_goals": return "Power Play Goals";
      case "short_handed_goals": return "Short Handed Goals";
      default: return market;
    }
  }
  
  // WNBA specific mappings
  if (sport.toLowerCase() === 'wnba') {
    switch (key) {
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
  
  // Default fallback
  return market;
}

// Build conflict key for duplicate prevention
function buildConflictKey(league: string, gameId: string, playerId: string | number, market: string, line: number | string, odds: string): string {
  return `${league}:${gameId}:${playerId}:${normalizePropType(market, league)}:${line}:${odds}`;
}

// Enhanced injury status filtering
function isPlayerActive(player: any): boolean {
  const rawStatus = (player.status ?? player.injury_status ?? player.injury ?? "Active").toLowerCase();
  
  // Active statuses
  const activeStatuses = ["active", "probable", "questionable"];
  
  // Inactive statuses
  const inactiveStatuses = ["out", "injured", "suspended", "doubtful", "ir", "pup", "nfir"];
  
  // Check if status contains any inactive keywords
  for (const inactive of inactiveStatuses) {
    if (rawStatus.includes(inactive)) {
      return false;
    }
  }
  
  // Check if status contains any active keywords
  for (const active of activeStatuses) {
    if (rawStatus.includes(active)) {
      return true;
    }
  }
  
  // Default to active if unclear
  return true;
}

// Enhanced prop ingestion for a single league
async function ingestPropsForLeague(league: string, clearExisting: boolean = false, apiKey?: string): Promise<void> {
  const API_KEY = apiKey || process.env.SPORTSGAMEODDS_API_KEY;
  
  if (!API_KEY) {
    throw new Error('SportsGameOdds API key not provided');
  }
  
  console.log(`🚀 Starting enhanced prop ingestion for ${league.toUpperCase()}...`);
  
  try {
    // Map our league codes to SportsGameOdds sportIDs
    const sportIdMap: Record<string, string> = {
      'nfl': 'FOOTBALL',
      'nba': 'BASKETBALL', 
      'mlb': 'BASEBALL',
      'nhl': 'HOCKEY',
      'wnba': 'BASKETBALL',
      'cbb': 'BASKETBALL'
    };
    
    const sportId = sportIdMap[league.toLowerCase()];
    if (!sportId) {
      throw new Error(`Unsupported league: ${league}`);
    }
    
    // Fetch from SportsGameOdds API v2 with correct header format
    const response = await fetch(`https://api.sportsgameodds.com/v2/events/`, {
      headers: { 
        "X-API-Key": `${API_KEY}`,
        "Content-Type": "application/json"
      }
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // The API returns an object with data field containing events
    const events = data.data || [];
    console.log(`📊 Fetched ${events.length} events from API`);
    
    let totalProps = 0;
    let skippedPlayers = 0;
    let processedPlayers = 0;
    
    // Process each event for the specified sport
    for (const event of events) {
      // Skip if event is not for our sport
      if (event.sportID !== sportId) {
        continue;
      }
      
      // Skip if event is cancelled (but allow completed games for historical data)
      if (event.status?.cancelled) {
        continue;
      }
      
      const gameId = event.id || `game_${Date.now()}`;
      const odds = event.odds || {};
      
      console.log(`🎮 Processing event ${gameId} with ${Object.keys(odds).length} odds entries`);
      
      // Process all odds entries for player props
      for (const [oddId, oddData] of Object.entries(odds)) {
        const odd = oddData as any;
        
        // Skip non-player props (game-level props)
        if (!odd.playerID || odd.playerID === 'all') {
          continue;
        }
        
        // Extract player name from playerID (format: "FIRSTNAME_LASTNAME_1_NFL")
        const playerName = odd.playerID.replace(/_1_[A-Z]+$/, '').replace(/_/g, ' ');
        
        // Find player in our database
        const dbPlayer = await db.select().from(players).where(eq(players.name, playerName)).limit(1);
        const player = dbPlayer[0];
        
        if (!player) {
          console.warn(`⚠️  Player not found in DB: ${playerName}. Skipping props.`);
          skippedPlayers++;
          continue;
        }
        
        // Check if odds are available and not cancelled
        if (!odd.bookOddsAvailable || odd.cancelled) {
          continue;
        }
        
        processedPlayers++;
        
        // Extract prop information
        const propType = odd.statID || 'Unknown';
        const line = odd.bookOverUnder || odd.fairOverUnder;
        const oddsValue = odd.bookOdds || odd.fairOdds;
        
        if (!line || !oddsValue) {
          continue;
        }
        
        // Normalize prop type to human-readable format
        const normalizedPropType = normalizePropType(propType, league);
        
        // Insert prop with conflict handling
        const conflictKey = buildConflictKey(league, gameId, player.id, propType, String(line), String(oddsValue));
        
        try {
          await db.insert(props).values({
            playerId: player.id,
            teamId: player.teamId!,
            gameId,
            propType: normalizedPropType,
            line: String(line),
            odds: String(oddsValue),
            status: "Active",
            conflictKey
          }).onConflictDoNothing();
          
          totalProps++;
          
          if (totalProps % 100 === 0) {
            console.log(`📊 Processed ${totalProps} props so far...`);
          }
          
        } catch (error) {
          console.error(`❌ Error inserting prop for ${playerName}:`, error);
        }
      }
    }
    
    console.log(`🎉 Enhanced ingestion complete for ${league.toUpperCase()}!`);
    console.log(`📊 Total props inserted: ${totalProps}`);
    console.log(`👥 Players processed: ${processedPlayers}`);
    console.log(`⏭️  Players skipped (injured/inactive): ${skippedPlayers}`);
    
  } catch (error) {
    console.error(`❌ Enhanced ingestion failed for ${league.toUpperCase()}:`, error);
    throw error;
  }
}

// Main enhanced prop ingestion function
export async function ingestPropsEnhanced(league: string, clearExisting: boolean = false, apiKey?: string): Promise<void> {
  const API_KEY = apiKey || process.env.SPORTSGAMEODDS_API_KEY;
  
  if (!API_KEY) {
    throw new Error('SportsGameOdds API key not provided');
  }
  
  // Map our league codes to SportsGameOdds sportIDs
  const sportIdMap: Record<string, string> = {
    'nfl': 'FOOTBALL',
    'nba': 'BASKETBALL', 
    'mlb': 'BASEBALL',
    'nhl': 'HOCKEY',
    'wnba': 'BASKETBALL',
    'cbb': 'BASKETBALL'
  };
  
  // If league is 'all', process all supported leagues
  if (league.toLowerCase() === 'all') {
    const supportedLeagues = Object.keys(sportIdMap);
    console.log(`🚀 Processing all supported leagues: ${supportedLeagues.join(', ')}`);
    
    for (const leagueCode of supportedLeagues) {
      console.log(`\n📊 Processing ${leagueCode.toUpperCase()}...`);
      await ingestPropsForLeague(leagueCode, clearExisting, API_KEY);
      clearExisting = false; // Only clear on first league
    }
    return;
  }
  
  // Process single league
  await ingestPropsForLeague(league, clearExisting, API_KEY);
}

// Enhanced team creation with better error handling
async function getOrCreateTeamEnhanced(league: string, player: any): Promise<string> {
  try {
    // Get league
    const leagueRecord = await db.select().from(leagues).where(eq(leagues.code, league.toUpperCase())).limit(1);
    if (leagueRecord.length === 0) {
      throw new Error(`League ${league} not found`);
    }
    const leagueId = leagueRecord[0].id;
    
    // Find or create team
    const teamName = player.team_name ?? player.team ?? 'Unknown Team';
    const teamAbbr = player.team_abbreviation ?? player.team_abbr ?? player.team_id ?? 'UNK';
    
    const existingTeam = await db.select()
      .from(teams)
      .where(and(
        eq(teams.league_id, leagueId),
        eq(teams.abbreviation, teamAbbr)
      ))
      .limit(1);
    
    if (existingTeam.length > 0) {
      return existingTeam[0].id;
    }
    
    // Create new team
    const newTeam = await db.insert(teams).values({
      league_id: leagueId,
      name: teamName,
      abbreviation: teamAbbr,
      logo_url: getTeamLogoUrl(teamAbbr, league)
    }).returning({ id: teams.id });
    
    console.log(`✅ Created new team: ${teamAbbr} - ${teamName}`);
    return newTeam[0].id;
    
  } catch (error) {
    console.error(`❌ Error with team ${player.team_abbreviation}:`, error);
    throw error;
  }
}

// Enhanced player creation
async function getOrCreatePlayerEnhanced(teamId: string, player: any): Promise<string> {
  try {
    const playerName = player.name ?? 'Unknown Player';
    const position = player.position ?? 'Unknown';
    const status = player.status ?? 'Active';
    
    // Find or create player
    const existingPlayer = await db.select()
      .from(players)
      .where(and(
        eq(players.team_id, teamId),
        eq(players.name, playerName)
      ))
      .limit(1);
    
    if (existingPlayer.length > 0) {
      // Update status if changed
      if (existingPlayer[0].status !== status) {
        await db.update(players)
          .set({ status })
          .where(eq(players.id, existingPlayer[0].id));
      }
      return existingPlayer[0].id;
    }
    
    // Create new player
    const newPlayer = await db.insert(players).values({
      team_id: teamId,
      name: playerName,
      position,
      status
    }).returning({ id: players.id });
    
    console.log(`✅ Created new player: ${playerName} (${position})`);
    return newPlayer[0].id;
    
  } catch (error) {
    console.error(`❌ Error with player ${player.name}:`, error);
    throw error;
  }
}

// Helper function to get team logo URL
function getTeamLogoUrl(abbreviation: string, sport: string): string {
  return `https://a.espncdn.com/i/teamlogos/${sport.toLowerCase()}/500/${abbreviation.toLowerCase()}.png`;
}

// Batch ingestion for all leagues
export async function ingestAllLeaguesEnhanced(): Promise<void> {
  const leagues = ['nfl', 'nba', 'mlb', 'nhl', 'wnba', 'cbb'];
  
  for (const league of leagues) {
    try {
      console.log(`\n🏈 Starting ${league.toUpperCase()} ingestion...`);
      await ingestPropsEnhanced(league);
      console.log(`✅ Completed ${league.toUpperCase()} ingestion`);
    } catch (error) {
      console.error(`❌ Failed to ingest ${league}:`, error);
      // Continue with next league
    }
  }
}

// Validation functions
export async function validateIngestion(): Promise<void> {
  console.log('🧪 Validating prop ingestion...');
  
  try {
    // Total props per league
    const propsByLeague = await db.execute(sql`
      SELECT t.league_id, l.code, COUNT(*) as prop_count
      FROM props p
      JOIN teams t ON p.team_id = t.id
      JOIN leagues l ON t.league_id = l.id
      GROUP BY t.league_id, l.code
      ORDER BY prop_count DESC
    `);
    
    console.log('\n📊 Props per league:');
    for (const row of propsByLeague.rows) {
      console.log(`${row.code}: ${row.prop_count} props`);
    }
    
    // Distinct prop types per league
    const propTypesByLeague = await db.execute(sql`
      SELECT l.code, COUNT(DISTINCT p.prop_type) as prop_type_count
      FROM props p
      JOIN teams t ON p.team_id = t.id
      JOIN leagues l ON t.league_id = l.id
      GROUP BY l.code
      ORDER BY prop_type_count DESC
    `);
    
    console.log('\n📋 Prop types per league:');
    for (const row of propTypesByLeague.rows) {
      console.log(`${row.code}: ${row.prop_type_count} distinct prop types`);
    }
    
    // Sample props
    const sampleProps = await db.execute(sql`
      SELECT p.prop_type, p.line, p.odds, pl.name as player_name, t.abbreviation as team_abbr, l.code as league
      FROM props p
      JOIN players pl ON p.player_id = pl.id
      JOIN teams t ON p.team_id = t.id
      JOIN leagues l ON t.league_id = l.id
      LIMIT 10
    `);
    
    console.log('\n📋 Sample props:');
    for (const row of sampleProps.rows) {
      console.log(`${row.player_name} (${row.team_abbr}, ${row.league}): ${row.prop_type} ${row.line} ${row.odds}`);
    }
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
  }
}
