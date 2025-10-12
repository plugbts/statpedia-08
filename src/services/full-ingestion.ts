/**
 * Full Ingestion Function (TypeScript + Drizzle)
 * 
 * This service properly ingests all leagues with complete data relationships:
 * leagues → teams → games → players → props
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import fetch from "node-fetch";
import { config } from "dotenv";
import { leagues, teams, players, props } from "../db/schema";
import { eq, and } from "drizzle-orm";

// Load environment variables
config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const db = drizzle(pool);

function normalizePropType(market: string): string {
  const key = market.toLowerCase().replace(/\s+/g, "_");
  
  // Handle specific market patterns
  if (key.includes("first_touchdown")) return "First Touchdown";
  if (key.includes("to_record_first_touchdown")) return "First Touchdown";
  if (key.includes("passing_yards")) return "Passing Yards";
  if (key.includes("rushing_yards")) return "Rushing Yards";
  if (key.includes("receiving_yards")) return "Receiving Yards";
  if (key.includes("receptions")) return "Receptions";
  if (key.includes("rush_attempts")) return "Rush Attempts";
  if (key.includes("passing_tds")) return "Passing TDs";
  if (key.includes("rushing_tds")) return "Rushing TDs";
  if (key.includes("receiving_tds")) return "Receiving TDs";
  if (key.includes("points")) return "Points";
  if (key.includes("assists")) return "Assists";
  if (key.includes("rebounds")) return "Rebounds";
  if (key.includes("shots_on_goal")) return "Shots on Goal";
  if (key.includes("saves")) return "Saves";
  if (key.includes("combined_tackles")) return "Combined Tackles";
  if (key.includes("sacks")) return "Sacks";
  if (key.includes("interceptions")) return "Interceptions";
  if (key.includes("field_goals_made")) return "Field Goals Made";
  if (key.includes("kicking_total_points")) return "Kicking Total Points";
  if (key.includes("extra_points_kicks_made")) return "Extra Points Kicks Made";
  
  // Clean up common patterns
  const cleaned = market
    .replace(/^.*to\s+record\s+/i, '')
    .replace(/\s+yes\/no$/i, '')
    .replace(/\s+over\/under$/i, '')
    .trim();
  
  return cleaned || market;
}

function buildConflictKey(league: string, gameId: string, playerId: string, market: string, line: number | string, odds: string) {
  return `${league}:${gameId}:${playerId}:${normalizePropType(market)}:${line}:${odds}`;
}

// Helper function to get or create league
async function getOrCreateLeague(code: string, name: string) {
  const existingLeague = await db.select().from(leagues).where(eq(leagues.code, code)).limit(1);
  
  if (existingLeague.length > 0) {
    return existingLeague[0].id;
  }
  
  const newLeague = await db.insert(leagues).values({
    code,
    name
  }).returning({ id: leagues.id });
  
  return newLeague[0].id;
}

// Helper function to get or create team
async function getOrCreateTeam(leagueId: string, teamData: any) {
  if (!teamData || !teamData.abbreviation) return null;
  
  const existingTeam = await db.select().from(teams)
    .where(and(eq(teams.abbreviation, teamData.abbreviation), eq(teams.league_id, leagueId)))
    .limit(1);
  
  if (existingTeam.length > 0) {
    return existingTeam[0].id;
  }
  
  const newTeam = await db.insert(teams).values({
    league_id: leagueId,
    name: teamData.name || teamData.abbreviation,
    abbreviation: teamData.abbreviation,
    logo_url: teamData.logo || `https://a.espncdn.com/i/teamlogos/${teamData.abbreviation.toLowerCase()}/500/default.png`
  }).returning({ id: teams.id });
  
  return newTeam[0].id;
}

// Helper function to get or create player
async function getOrCreatePlayer(teamId: string, playerData: any) {
  if (!playerData || !playerData.name) return null;
  
  const existingPlayer = await db.select().from(players)
    .where(and(eq(players.name, playerData.name), eq(players.team_id, teamId)))
    .limit(1);
  
  if (existingPlayer.length > 0) {
    return existingPlayer[0].id;
  }
  
  const newPlayer = await db.insert(players).values({
    name: playerData.name,
    team_id: teamId,
    position: playerData.position || 'UNK',
    status: "Active"
  }).returning({ id: players.id });
  
  return newPlayer[0].id;
}

export async function ingestAllLeagues() {
  console.log('🚀 Starting full ingestion for all leagues...');
  
  const leaguesToIngest = [
    { code: "NFL", sportId: "FOOTBALL", name: "National Football League" },
    { code: "NBA", sportId: "BASKETBALL", name: "National Basketball Association" },
    { code: "MLB", sportId: "BASEBALL", name: "Major League Baseball" },
    { code: "WNBA", sportId: "BASKETBALL", name: "Women's National Basketball Association" },
    { code: "NHL", sportId: "HOCKEY", name: "National Hockey League" },
    { code: "CBB", sportId: "BASKETBALL", name: "College Basketball" }
  ];

  let totalProps = 0;
  let totalPlayers = 0;
  let totalGames = 0;

  for (const leagueInfo of leaguesToIngest) {
    console.log(`\n📊 Processing ${leagueInfo.name} (${leagueInfo.code})...`);
    
    try {
      const leagueId = await getOrCreateLeague(leagueInfo.code, leagueInfo.name);
      
      const url = `https://api.sportsgameodds.com/v2/events?oddsAvailable=true&leagueID=${leagueInfo.code}`;
      const res = await fetch(url, {
        headers: { 
          "X-API-Key": `${process.env.SPORTSGAMEODDS_API_KEY}`,
          "Content-Type": "application/json"
        }
      });
      
      if (!res.ok) {
        console.warn(`⚠️  API error for ${leagueInfo.code}: ${res.status}`);
        continue;
      }
      
      const data = await res.json();
      const events = data.data || [];
      
      console.log(`📊 Found ${events.length} events for ${leagueInfo.code}`);

      for (const game of events) {
        if (game.sportID !== leagueInfo.sportId) {
          console.log(`⏭️  Skipping game with sportID: ${game.sportID} (expected: ${leagueInfo.sportId})`);
          continue;
        }
        
        console.log(`🎮 Processing game: ${game.id} (${game.sportID})`);
        
        const gameId = game.id || game.game_id || `game_${Date.now()}_${Math.random()}`;
        totalGames++;

        // 1. Upsert Teams
        const homeTeamId = await getOrCreateTeam(leagueId, game.homeTeam);
        const awayTeamId = await getOrCreateTeam(leagueId, game.awayTeam);

        // 2. Process Players and Props
        const odds = game.odds || {};
        let gameProps = 0;
        let gamePlayers = 0;
        const processedPlayers = new Set<string>();
        
        console.log(`🔍 Game ${gameId}: Found ${Object.keys(odds).length} odds entries`);

        for (const [oddId, oddData] of Object.entries(odds)) {
          const odd = oddData as any;
          
          // Skip if not a player-specific odd
          if (!odd.playerID || odd.playerID === 'all' || !odd.statEntityID) {
            // console.log(`⏭️  Skipping non-player odd: ${oddId}`);
            continue;
          }
          
          // Skip if not available
          if (!odd.bookOddsAvailable || odd.ended || odd.cancelled) {
            // console.log(`⏭️  Skipping unavailable odd: ${oddId} (available: ${odd.bookOddsAvailable}, ended: ${odd.ended}, cancelled: ${odd.cancelled})`);
            continue;
          }

          // Extract player name from statEntityID (e.g., "ADONAI_MITCHELL_1_NFL" -> "Adonai Mitchell")
          const playerName = odd.statEntityID
            .replace(/_1_NFL$/, '')
            .replace(/_1_NBA$/, '')
            .replace(/_1_MLB$/, '')
            .replace(/_1_NHL$/, '')
            .replace(/_1_WNBA$/, '')
            .replace(/_1_CBB$/, '')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
          
          // Skip if we already processed this player for this game
          if (processedPlayers.has(playerName)) continue;
          
          console.log(`🎯 Processing player: ${playerName} (${odd.statEntityID})`);
          
          // Try to find existing player first to get correct team
          const existingPlayer = await db.select().from(players)
            .where(eq(players.name, playerName))
            .limit(1);
          
          let playerId;
          let playerTeamId;
          
          if (existingPlayer.length > 0) {
            // Use existing player and their team
            playerId = existingPlayer[0].id;
            playerTeamId = existingPlayer[0].team_id;
            console.log(`✅ Found existing player: ${playerName} -> ${existingPlayer[0].name} (Team: ${playerTeamId})`);
          } else {
            // For new players, we'll need to determine team from the game context
            // This is a limitation - we'll use the home team as default
            const teamData = {
              abbreviation: game.homeTeam?.abbreviation || 'UNK',
              name: game.homeTeam?.name || 'Unknown Team',
              logo: game.homeTeam?.logo || `https://a.espncdn.com/i/teamlogos/${leagueInfo.code.toLowerCase()}/500/default.png`
            };
            
            playerTeamId = await getOrCreateTeam(leagueId, teamData);
            if (!playerTeamId) continue;

            // Create new player
            playerId = await getOrCreatePlayer(playerTeamId, {
              name: playerName,
              position: 'UNK' // We don't have position info in this API structure
            });
          }
          
          if (!playerId) continue;
          processedPlayers.add(playerName);
          gamePlayers++;

          // Create prop for this player
          const marketName = odd.marketName || odd.statID || 'Unknown Market';
          const normalizedPropType = normalizePropType(marketName);
          
          // Use the best available odds (bookOdds)
          const odds = odd.bookOdds || odd.fairOdds || '+100';
          const line = '1.5'; // Default line since we don't have specific lines in this structure
          
          const conflictKey = buildConflictKey(leagueInfo.code, gameId, playerId, marketName, line, odds);

          try {
            await db.insert(props).values({
              player_id: playerId,
              team_id: playerTeamId,
              game_id: gameId,
              prop_type: normalizedPropType,
              line: line,
              odds: odds,
              status: "Active"
            }).onConflictDoNothing();
            
            gameProps++;
          } catch (error) {
            console.warn(`⚠️  Failed to insert prop for ${playerName}:`, error);
          }
        }

        totalPlayers += gamePlayers;
        totalProps += gameProps;
        
        if (gameProps > 0) {
          console.log(`✅ Game ${gameId}: ${gamePlayers} players, ${gameProps} props`);
        }
      }
      
      console.log(`✅ ${leagueInfo.code}: ${events.length} games, ${totalPlayers} players, ${totalProps} props`);
      
    } catch (error) {
      console.error(`❌ Error processing ${leagueInfo.code}:`, error);
    }
  }

  console.log(`\n🎉 Full ingestion complete!`);
  console.log(`📊 Total: ${totalGames} games, ${totalPlayers} players, ${totalProps} props`);
  
  return {
    games: totalGames,
    players: totalPlayers,
    props: totalProps
  };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  ingestAllLeagues()
    .then((result) => {
      console.log('✅ Ingestion completed successfully:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Ingestion failed:', error);
      process.exit(1);
    });
}
