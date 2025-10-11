// Player Props Extraction with Schema Normalization
// Normalizes upstream event schema into ingest shape

import { fetchGameDetails } from "./api";
import { getPlayerTeam, getOpponentTeam } from "./playerTeamMap";
import { enrichTeams } from "../enhancedTeamEnrichment";

export interface ExtractedPlayerProp {
  playerName: string;
  playerId?: string | null;
  marketName: string;
  line: number | null;
  odds: number | null;
  sportsbook: string;
  eventStartUtc: string;
  league: string;
  eventId: string;
  marketId: string;
  oddId: string;
  overUnder: string; // 'over' or 'under'
  team?: string | null; // Player's team
  opponent?: string | null; // Opposing team
  rawData?: any; // Store raw data for debugging
}

export async function extractPlayerProps(events: any[], env?: any): Promise<ExtractedPlayerProp[]> {
  const out: ExtractedPlayerProp[] = [];
  
  console.log(`🔍 Extracting player props from ${events?.length || 0} events`);
  
  for (const ev of events || []) {
    if (!ev) continue;
    
    const eventId = ev.id || ev.eventID || ev.event_id || 'unknown';
    // Normalize league with proper fallbacks
    const league = ev.leagueID || ev.league || ev.league_id || 'unknown';
    const eventStartUtc = ev.startTime || ev.commence_time || ev.startUtc || ev.date || new Date().toISOString();
    
    // Extract team information from the event
    let homeTeam = ev.homeTeam || ev.teams?.home?.names?.short || ev.teams?.home?.names?.long || ev.teams?.[0];
    let awayTeam = ev.awayTeam || ev.teams?.away?.names?.short || ev.teams?.away?.names?.long || ev.teams?.[1];
    
    // 🔍 If we don't have team info and we have a game ID, try to fetch game details
    if ((!homeTeam || !awayTeam) && eventId !== 'unknown' && env) {
      console.log(`🔍 No team info in event, fetching game details for ${eventId}...`);
      try {
        const gameDetails = await fetchGameDetails(env, eventId);
        if (gameDetails) {
          homeTeam = homeTeam || gameDetails.homeTeam || gameDetails.homeTeamName;
          awayTeam = awayTeam || gameDetails.awayTeam || gameDetails.awayTeamName;
          console.log(`✅ Fetched team info: ${homeTeam} vs ${awayTeam}`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to fetch game details for ${eventId}:`, error);
      }
    }
    
    console.log(`🏈 Event ${eventId}: ${homeTeam} vs ${awayTeam}`);
    
    // Handle the actual API structure: ev.odds contains all the player props
    const oddsData = ev?.odds || {};
    
    // Iterate through all odds entries
    for (const [oddId, oddData] of Object.entries(oddsData)) {
      if (!oddData || typeof oddData !== 'object') continue;
      
      const odd = oddData as any;
      
      // 🔍 DEBUG: Log the structure of the first few odds to understand the format
      if (out.length < 3 && Object.keys(oddsData).indexOf(oddId) < 5) {
        console.log(`🔍 [EXTRACT:ODDS] Odd ${oddId}:`, {
          hasPlayerID: !!odd.playerID,
          hasStatID: !!odd.statID,
          hasPlayerId: !!odd.playerId,
          hasStatId: !!odd.statId,
          oddKeys: Object.keys(odd),
          sampleOdd: odd
        });
      }
      
      // Check if this is a player prop (has playerID and statID)
      if (!odd.playerID || !odd.statID) continue;
      
      // Extract player information from the players object
      const playerInfo = ev?.players?.[odd.playerID];
      const playerName = playerInfo?.name || odd.playerID || 'Unknown Player';
      const playerId = odd.playerID;
      
      // 🔍 DEBUG: Log team data available for this prop
      if (out.length < 3) { // Only log first 3 props to avoid spam
        console.log(`🔍 [EXTRACT:DEBUG] Prop ${out.length}:`, {
          playerId,
          playerName,
          playerInfo: playerInfo ? {
            teamID: playerInfo.teamID,
            teamId: playerInfo.teamId,
            team: playerInfo.team,
            teamName: playerInfo.teamName
          } : null,
          oddData: {
            teamID: odd.teamID,
            teamId: odd.teamId,
            playerTeamID: odd.playerTeamID,
            playerTeamId: odd.playerTeamId
          },
          eventTeams: {
            homeTeam,
            awayTeam,
            homeTeamId: ev.homeTeamId ?? ev.homeTeamID,
            awayTeamId: ev.awayTeamId ?? ev.awayTeamID,
            teams: ev.teams
          }
        });
      }
      
      // Enhanced team enrichment using comprehensive fallback logic
      const eventContext = {
        homeTeam,
        awayTeam,
        homeTeamName: homeTeam,
        awayTeamName: awayTeam,
        teams: ev.teams,
        league,
        id: eventId
      };
      
      const propContext = {
        playerId,
        playerName,
        playerTeamID: playerInfo?.teamID || odd.playerTeamID || odd.teamID,
        playerTeam: playerInfo?.team || odd.playerTeam,
        playerTeamName: playerInfo?.teamName || odd.playerTeamName,
        teamID: odd.teamID,
        team: odd.team,
        teamName: odd.teamName
      };
      
      // Use enhanced team enrichment
      const { team: playerTeam, opponent: opponentTeam } = enrichTeams(eventContext, propContext);
      
      console.log(`🔍 Enhanced team enrichment: ${playerId} -> ${playerTeam} vs ${opponentTeam}`);
      
      // Extract market information
      const marketName = odd.marketName || `${odd.statID} ${odd.betTypeID}`;
      
      // Extract line/threshold (for over/under bets)
      let line = null;
      if (odd.fairOverUnder) {
        line = parseFloat(odd.fairOverUnder);
      } else if (odd.bookOverUnder) {
        line = parseFloat(odd.bookOverUnder);
      }
      
      // Extract odds
      const odds = odd.bookOdds || odd.fairOdds || null;
      const oddsValue = odds ? parseInt(odds.replace('+', '').replace('-', '')) : null;
      
      // Extract sportsbook with proper normalization
      const sportsbook = odd.sportsbook?.name 
                      || odd.bookmaker?.name 
                      || odd.sportsbook 
                      || (odd.byBookmaker && typeof odd.byBookmaker === 'object' ? Object.keys(odd.byBookmaker)[0] : null)
                      || 'SportsGameOdds'; // Default fallback
      
      // Determine over/under
      let overUnder = 'over';
      if (odd.sideID === 'under') {
        overUnder = 'under';
      } else if (odd.sideID === 'yes') {
        overUnder = 'yes';
      } else if (odd.sideID === 'no') {
        overUnder = 'no';
      }
      
      const extractedProp: ExtractedPlayerProp = {
        playerName: playerName.trim(),
        playerId,
        marketName: marketName.trim(),
        line,
        odds: oddsValue,
        sportsbook: sportsbook.trim(),
        eventStartUtc,
        league: league.toUpperCase(),
        eventId,
        marketId: odd.statID,
        oddId,
        overUnder,
        team: playerTeam,
        opponent: opponentTeam,
        rawData: odd // Store raw data for debugging
      };
      
      // Validate required fields
      if (extractedProp.playerName && extractedProp.playerName !== 'Unknown Player' && 
          extractedProp.marketName && extractedProp.marketName !== 'unknown') {
        out.push(extractedProp);
      } else {
        console.warn(`⚠️ Skipping invalid prop:`, {
          playerName: extractedProp.playerName,
          marketName: extractedProp.marketName,
          eventId: extractedProp.eventId
        });
      }
    }
  }
  
  console.log(`✅ Extracted ${out.length} player props`);
  return out;
}

// Enhanced extraction with better error handling and logging
export function extractPlayerPropsWithLogging(events: any[]): {
  props: ExtractedPlayerProp[];
  stats: {
    totalEvents: number;
    eventsWithMarkets: number;
    totalMarkets: number;
    playerPropMarkets: number;
    extractedProps: number;
    skippedProps: number;
  };
} {
  const stats = {
    totalEvents: events?.length || 0,
    eventsWithMarkets: 0,
    totalMarkets: 0,
    playerPropMarkets: 0,
    extractedProps: 0,
    skippedProps: 0
  };
  
  const props = extractPlayerProps(events);
  stats.extractedProps = props.length;
  
  // Calculate additional stats
  for (const ev of events || []) {
    if (!ev) continue;
    
    const markets = ev?.odds?.markets || ev?.markets || ev?.player_props || [];
    if (markets.length > 0) {
      stats.eventsWithMarkets++;
      stats.totalMarkets += markets.length;
      
      for (const m of markets) {
        if (!m) continue;
        
        const isPlayerProp = m.type === "player_prop" || 
                            m.isPlayerProp === true || 
                            m.market_type === "player_prop" ||
                            (m.name && m.name.toLowerCase().includes('player')) ||
                            (m.marketName && m.marketName.toLowerCase().includes('player'));
        
        if (isPlayerProp) {
          stats.playerPropMarkets++;
        }
      }
    }
  }
  
  stats.skippedProps = stats.totalMarkets - stats.extractedProps;
  
  console.log(`📊 Extraction stats:`, stats);
  
  return { props, stats };
}

// Filter props by specific criteria
export function filterProps(props: ExtractedPlayerProp[], filters: {
  league?: string;
  playerName?: string;
  marketName?: string;
  sportsbook?: string;
  minLine?: number;
  maxLine?: number;
  minOdds?: number;
  maxOdds?: number;
}): ExtractedPlayerProp[] {
  return props.filter(prop => {
    if (filters.league && prop.league !== filters.league) return false;
    if (filters.playerName && !prop.playerName.toLowerCase().includes(filters.playerName.toLowerCase())) return false;
    if (filters.marketName && !prop.marketName.toLowerCase().includes(filters.marketName.toLowerCase())) return false;
    if (filters.sportsbook && prop.sportsbook !== filters.sportsbook) return false;
    if (filters.minLine !== undefined && (prop.line === null || prop.line < filters.minLine)) return false;
    if (filters.maxLine !== undefined && (prop.line === null || prop.line > filters.maxLine)) return false;
    if (filters.minOdds !== undefined && (prop.odds === null || prop.odds < filters.minOdds)) return false;
    if (filters.maxOdds !== undefined && (prop.odds === null || prop.odds > filters.maxOdds)) return false;
    return true;
  });
}

// Group props by player
export function groupPropsByPlayer(props: ExtractedPlayerProp[]): Record<string, ExtractedPlayerProp[]> {
  const grouped: Record<string, ExtractedPlayerProp[]> = {};
  
  for (const prop of props) {
    const key = prop.playerName.toLowerCase().trim();
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(prop);
  }
  
  return grouped;
}

// Get unique values for analysis
export function getUniqueValues(props: ExtractedPlayerProp[]): {
  leagues: string[];
  players: string[];
  markets: string[];
  sportsbooks: string[];
} {
  const leagues = new Set<string>();
  const players = new Set<string>();
  const markets = new Set<string>();
  const sportsbooks = new Set<string>();
  
  for (const prop of props) {
    leagues.add(prop.league);
    players.add(prop.playerName);
    markets.add(prop.marketName);
    sportsbooks.add(prop.sportsbook);
  }
  
  return {
    leagues: Array.from(leagues).sort(),
    players: Array.from(players).sort(),
    markets: Array.from(markets).sort(),
    sportsbooks: Array.from(sportsbooks).sort()
  };
}
