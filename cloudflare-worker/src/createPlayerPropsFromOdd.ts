import { toYmd } from "./helpers";
import { storeMissingPlayer } from "./missingPlayers";
import { getCachedPlayerIdMap, updateMissingPlayersSuccess } from "./playersLoader";
import { normalizeName } from "./normalizeName";

// Market mapping for prop types
const MARKET_MAP: Record<string, string> = {
  // NFL Passing
  'passing yards': 'Passing Yards',
  'pass yards': 'Passing Yards',
  'passing yds': 'Passing Yards',
  'pass yds': 'Passing Yards',
  'passing yards passing': 'Passing Yards',
  'passing touchdowns': 'Passing Touchdowns',
  'pass tds': 'Passing Touchdowns',
  'passing td': 'Passing Touchdowns',
  'pass td': 'Passing Touchdowns',
  'passing attempts': 'Passing Attempts',
  'pass attempts': 'Passing Attempts',
  'pass att': 'Passing Attempts',
  'passing completions': 'Passing Completions',
  'pass completions': 'Passing Completions',
  'pass comp': 'Passing Completions',
  'passing interceptions': 'Passing Interceptions',
  'pass interceptions': 'Passing Interceptions',
  'pass int': 'Passing Interceptions',
  
  // NFL Rushing
  'rushing yards': 'Rushing Yards',
  'rush yards': 'Rushing Yards',
  'rushing yds': 'Rushing Yards',
  'rush yds': 'Rushing Yards',
  'rushing touchdowns': 'Rushing Touchdowns',
  'rush tds': 'Rushing Touchdowns',
  'rushing td': 'Rushing Touchdowns',
  'rush td': 'Rushing Touchdowns',
  'rushing attempts': 'Rushing Attempts',
  'rush attempts': 'Rushing Attempts',
  'rush att': 'Rushing Attempts',
  
  // NFL Receiving
  'receiving yards': 'Receiving Yards',
  'rec yards': 'Receiving Yards',
  'receiving yds': 'Receiving Yards',
  'rec yds': 'Receiving Yards',
  'receiving touchdowns': 'Receiving Touchdowns',
  'rec tds': 'Receiving Touchdowns',
  'receiving td': 'Receiving Touchdowns',
  'rec td': 'Receiving Touchdowns',
  'receptions': 'Receptions',
  'rec': 'Receptions',
  
  // NFL Defense
  'defense sacks': 'Defense Sacks',
  'defense interceptions': 'Defense Interceptions',
  'defense combined tackles': 'Defense Combined Tackles',
  'defense total tackles': 'Defense Combined Tackles',
  
  // NFL Kicking
  'field goals made': 'Field Goals Made',
  'kicking total points': 'Kicking Total Points',
  'extra points kicks made': 'Extra Points Made',
  
  // NBA
  'points': 'Points',
  'rebounds': 'Rebounds',
  'assists': 'Assists',
  'steals': 'Steals',
  'blocks': 'Blocks',
  'threes made': 'Three Pointers Made',
  '3-pointers made': 'Three Pointers Made',
  
  // MLB
  'hits': 'Hits',
  'runs': 'Runs',
  'rbis': 'RBIs',
  'strikeouts': 'Strikeouts',
  'walks': 'Walks',
  'home runs': 'Home Runs',
  
  // NHL
  'goals': 'Goals',
  'shots': 'Shots',
  'saves': 'Saves',
};

// Get canonical player ID with dynamic loading from Supabase
async function getPlayerID(playerName: string, team: string, league: string, env?: any): Promise<string | null> {
  if (!env) {
    // Fallback if env not available
    const canonicalName = playerName.toUpperCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/\s(jr|sr|iii|iv|v)$/i, '')
      .trim();
    return `${canonicalName}-UNK-${team}`;
  }

  try {
    // Load dynamic player map from Supabase
    const playerMap = await getCachedPlayerIdMap(env);
    const normalizedName = normalizeName(playerName);
    
    // Try exact match first
    if (playerMap[normalizedName]) {
      const canonicalId = playerMap[normalizedName];
      console.log(`✅ Found player mapping: ${playerName} → ${canonicalId}`);
      
      // Update missing players table to remove this player
      await updateMissingPlayersSuccess(env, playerName, canonicalId);
      
      return canonicalId;
    }
    
    // Try partial matches for common name variations
    for (const [key, value] of Object.entries(playerMap)) {
      if (key.includes(normalizedName) || normalizedName.includes(key)) {
        const canonicalId = value;
        console.log(`✅ Found fuzzy player mapping: ${playerName} → ${canonicalId}`);
        
        // Update missing players table to remove this player
        await updateMissingPlayersSuccess(env, playerName, canonicalId);
        
        return canonicalId;
      }
    }
    
    // Fallback: generate canonical ID
    const canonicalName = playerName.toUpperCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/\s(jr|sr|iii|iv|v)$/i, '')
      .trim();
    
    return `${canonicalName}-UNK-${team}`;
    
  } catch (error) {
    console.error(`❌ Error loading player map for ${playerName}:`, error);
    
    // Fallback on error
    const canonicalName = playerName.toUpperCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/\s(jr|sr|iii|iv|v)$/i, '')
      .trim();
    
    return `${canonicalName}-UNK-${team}`;
  }
}

export async function createPlayerPropsFromOdd(odd: any, oddId: string, event: any, league: string, season: string, week?: string, env?: any): Promise<any[]> {
  const props: any[] = [];
  
  // Extract player information
  const playerName = odd.player?.name;
  const team = odd.player?.team;
  
  if (!playerName || !team) {
    console.log(`Skipping odd ${oddId}: missing player name or team`);
    return props;
  }

  // Get canonical player ID with dynamic loading
  const playerID = await getPlayerID(playerName, team, league, env);
  
  if (!playerID) {
    console.error("Failed to generate player_id mapping", { 
      playerName, 
      team, 
      league, 
      normalizedName: normalizeName(playerName)
    });
    return props;
  }
  
  // Store missing player mappings for manual review
  if (playerID.includes('-UNK-') && env) {
    console.error("Missing player_id mapping", { 
      playerName, 
      team, 
      league, 
      generatedId: playerID,
      normalizedName: normalizeName(playerName)
    });
    
    // Store in missing_players table for later reconciliation
    await storeMissingPlayer(env, playerName, team, league, playerID, oddId);
  }
  
  // Extract game date - use event date, not ingestion date
  const gameDate = event.date ? event.date.split('T')[0] : new Date().toISOString().split('T')[0];
  
  // Extract prop information
  const rawPropType = odd.prop?.name;
  const line = odd.line;
  const overOdds = odd.overOdds;
  const underOdds = odd.underOdds;
  const sportsbook = mapBookmakerIdToName(odd.bookmaker?.id || 'unknown') || 'Consensus';
  
  if (!rawPropType) {
    console.log(`Skipping odd ${oddId}: missing prop type`);
    return props;
  }
  
  // Handle props without lines (Yes/No bets, etc.)
  const finalLine = line != null ? parseFloat(line) : 0;

  // Normalize prop type using market mapping
  const normalizedPropType = MARKET_MAP[rawPropType.toLowerCase()] || rawPropType;
  
  // Log unmapped markets for manual review
  if (!MARKET_MAP[rawPropType.toLowerCase()]) {
    console.warn("Unmapped market:", {
      rawMarket: rawPropType,
      oddId: oddId,
      player: playerName,
      league: league
    });
  }

  // Extract additional event information
  const gameId = event.eventID || `${team}-${event.teams?.find((t: any) => t !== team)}-${gameDate}`;
  const homeTeam = event.homeTeam || event.teams?.[0];
  const awayTeam = event.awayTeam || event.teams?.[1];
  const gameTime = event.date ? new Date(event.date) : new Date();

  // Create the prop record matching proplines schema
  const prop = {
    player_id: playerID,
    player_name: playerName,
    team: team,
    opponent: event.teams?.find((t: any) => t !== team) || null,
    season: parseInt(season),
    date: gameDate, // ✅ REQUIRED field that was missing!
    prop_type: normalizedPropType,
    line: finalLine,
    over_odds: overOdds ? parseInt(overOdds) : null,
    under_odds: underOdds ? parseInt(underOdds) : null,
    sportsbook: sportsbook,
    league: league.toLowerCase(),
    game_id: gameId,
    conflict_key: `${playerID}|${gameDate}|${normalizedPropType}|${sportsbook}|${league.toLowerCase()}|${season}`
    // Removed extra fields that don't exist in schema:
    // - sportsbook_key, game_time, home_team, away_team, week, last_updated, is_available
  };

  props.push(prop);
  return props;
}

function mapBookmakerIdToName(bookmakerId: string): string {
  const bookmakerMap: Record<string, string> = {
    'draftkings': 'DraftKings',
    'fanduel': 'FanDuel',
    'betmgm': 'BetMGM',
    'caesars': 'Caesars',
    'pointsbet': 'PointsBet',
    'betrivers': 'BetRivers',
    'unibet': 'Unibet',
    'sugarhouse': 'SugarHouse',
    'foxbet': 'FOX Bet',
    'bet365': 'Bet365',
    'williamhill': 'William Hill',
    'pinnacle': 'Pinnacle',
    'betfair': 'Betfair',
    'bovada': 'Bovada',
    'mybookie': 'MyBookie',
    'consensus': 'Consensus',
    'unknown': 'Consensus'
  };
  
  return bookmakerMap[bookmakerId.toLowerCase()] || 'Consensus';
}
