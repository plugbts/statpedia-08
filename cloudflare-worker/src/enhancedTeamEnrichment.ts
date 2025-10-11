// Enhanced team enrichment with comprehensive fallback logic
// Eliminates UNK values by using event context and comprehensive team mappings

import { normalizeTeam, getTeamMappings } from "./teamMappings";

export interface EventContext {
  homeTeam?: string | null;
  awayTeam?: string | null;
  homeTeamName?: string | null;
  awayTeamName?: string | null;
  teams?: {
    home?: {
      names?: {
        short?: string;
        long?: string;
      };
      teamID?: string;
    };
    away?: {
      names?: {
        short?: string;
        long?: string;
      };
      teamID?: string;
    };
  };
  league?: string;
  id?: string;
}

export interface PropContext {
  playerId?: string;
  playerName?: string;
  playerTeamID?: string;
  playerTeam?: string;
  playerTeamName?: string;
  teamID?: string;
  team?: string;
  teamName?: string;
}

export interface EnrichmentResult {
  team: string;
  opponent: string;
  teamName?: string;
  opponentName?: string;
  strategy: {
    team: "event_context" | "player_mapping" | "team_mapping" | "fallback";
    opponent: "event_context" | "player_mapping" | "team_mapping" | "fallback";
  };
  debug?: {
    rawTeam?: string;
    rawOpponent?: string;
    eventHomeTeam?: string;
    eventAwayTeam?: string;
    playerTeamID?: string;
    teamMappings?: Record<string, string>;
  };
}

/**
 * Enhanced team enrichment function with comprehensive fallback logic
 * Resolves player team and opponent from event context and team mappings
 */
export function enrichTeams(
  event: EventContext, 
  prop: PropContext, 
  playersById: Record<string, any> = {}
): EnrichmentResult {
  const league = event.league || 'unknown';
  
  // Extract team information from event context
  const homeTeam = event.homeTeam || 
                   event.homeTeamName || 
                   event.teams?.home?.names?.short || 
                   event.teams?.home?.names?.long || 
                   event.teams?.home?.teamID;
                   
  const awayTeam = event.awayTeam || 
                   event.awayTeamName || 
                   event.teams?.away?.names?.short || 
                   event.teams?.away?.names?.long || 
                   event.teams?.away?.teamID;

  console.log(`🔍 [enrichTeams] Event ${event.id}: ${homeTeam} vs ${awayTeam} (league: ${league})`);

  // Strategy 1: Try to resolve player's team from registry or event roster
  let playerTeam = null;
  let teamStrategy: EnrichmentResult['strategy']['team'] = 'fallback';
  
  // Check players registry first
  if (prop.playerId && playersById[prop.playerId]?.teamAbbr) {
    playerTeam = playersById[prop.playerId].teamAbbr;
    teamStrategy = 'player_mapping';
    console.log(`🔍 [enrichTeams] Found team from players registry: ${playerTeam}`);
  }
  // Check player team fields
  else if (prop.playerTeam || prop.playerTeamName || prop.playerTeamID) {
    const rawTeam = prop.playerTeam || prop.playerTeamName || prop.playerTeamID;
    playerTeam = normalizeTeam(league, rawTeam);
    teamStrategy = playerTeam !== 'UNK' ? 'team_mapping' : 'fallback';
    console.log(`🔍 [enrichTeams] Found team from prop fields: ${rawTeam} -> ${playerTeam}`);
  }
  // Try to match player's team ID to home/away teams
  else if (prop.playerTeamID && homeTeam && awayTeam) {
    // This is a simplified approach - could be enhanced with better team matching
    // For now, we'll use a heuristic based on team ID matching
    const homeTeamNorm = normalizeTeam(league, homeTeam);
    const awayTeamNorm = normalizeTeam(league, awayTeam);
    
    // If playerTeamID contains home team abbreviation, player is on home team
    if (homeTeamNorm !== 'UNK' && prop.playerTeamID.toLowerCase().includes(homeTeamNorm.toLowerCase())) {
      playerTeam = homeTeamNorm;
      teamStrategy = 'event_context';
    }
    // If playerTeamID contains away team abbreviation, player is on away team
    else if (awayTeamNorm !== 'UNK' && prop.playerTeamID.toLowerCase().includes(awayTeamNorm.toLowerCase())) {
      playerTeam = awayTeamNorm;
      teamStrategy = 'event_context';
    }
    // Default to home team if we can't determine
    else if (homeTeamNorm !== 'UNK') {
      playerTeam = homeTeamNorm;
      teamStrategy = 'event_context';
    }
    
    console.log(`🔍 [enrichTeams] Resolved team from event context: ${playerTeam} (strategy: ${teamStrategy})`);
  }

  // Strategy 2: Determine opponent team
  let opponentTeam = null;
  let opponentStrategy: EnrichmentResult['strategy']['opponent'] = 'fallback';
  
  if (playerTeam && playerTeam !== 'UNK' && homeTeam && awayTeam) {
    const homeTeamNorm = normalizeTeam(league, homeTeam);
    const awayTeamNorm = normalizeTeam(league, awayTeam);
    
    // Opponent is the other team in the event
    if (playerTeam === homeTeamNorm && awayTeamNorm !== 'UNK') {
      opponentTeam = awayTeamNorm;
      opponentStrategy = 'event_context';
    } else if (playerTeam === awayTeamNorm && homeTeamNorm !== 'UNK') {
      opponentTeam = homeTeamNorm;
      opponentStrategy = 'event_context';
    }
    
    console.log(`🔍 [enrichTeams] Resolved opponent: ${opponentTeam} (strategy: ${opponentStrategy})`);
  }

  // Fallback: if we still don't have teams, try to normalize the raw event teams
  if (!playerTeam || playerTeam === 'UNK') {
    if (homeTeam) {
      playerTeam = normalizeTeam(league, homeTeam);
      teamStrategy = playerTeam !== 'UNK' ? 'team_mapping' : 'fallback';
    }
    if (!opponentTeam || opponentTeam === 'UNK') {
      if (awayTeam) {
        opponentTeam = normalizeTeam(league, awayTeam);
        opponentStrategy = opponentTeam !== 'UNK' ? 'team_mapping' : 'fallback';
      }
    }
  }

  // Final fallback: UNK
  const finalTeam = playerTeam || "UNK";
  const finalOpponent = opponentTeam || "UNK";

  console.log(`✅ [enrichTeams] Final result: ${finalTeam} vs ${finalOpponent}`);

  return {
    team: finalTeam,
    opponent: finalOpponent,
    strategy: {
      team: teamStrategy,
      opponent: opponentStrategy
    },
    debug: {
      rawTeam: prop.playerTeam || prop.playerTeamName || prop.playerTeamID,
      rawOpponent: prop.team || prop.teamName || prop.teamID,
      eventHomeTeam: homeTeam,
      eventAwayTeam: awayTeam,
      playerTeamID: prop.playerTeamID,
      teamMappings: getTeamMappings(league)
    }
  };
}

/**
 * Batch enrich teams for multiple props from the same event
 */
export function enrichTeamsBatch(
  event: EventContext,
  props: PropContext[],
  playersById: Record<string, any> = {}
): Array<PropContext & EnrichmentResult> {
  return props.map(prop => ({
    ...prop,
    ...enrichTeams(event, prop, playersById)
  }));
}

/**
 * Enhanced prop extraction with team enrichment
 */
export function extractPropWithTeams(
  event: EventContext,
  prop: PropContext,
  playersById: Record<string, any> = {}
) {
  const { team, opponent, strategy, debug } = enrichTeams(event, prop, playersById);
  
  return {
    player_id: prop.playerId,
    player_name: prop.playerName,
    prop_type: prop.playerTeam || 'unknown', // This should be statType in real implementation
    line: 0, // This should come from the prop data
    over_odds: null,
    under_odds: null,
    team,
    opponent,
    game_id: event.id,
    league: event.league,
    date: new Date().toISOString(),
    strategy,
    debug
  };
}

/**
 * Validate team enrichment results
 */
export function validateTeamEnrichment(results: Array<PropContext & EnrichmentResult>): {
  total: number;
  resolved: number;
  unresolved: number;
  teamStats: Record<string, number>;
  opponentStats: Record<string, number>;
} {
  const stats = {
    total: results.length,
    resolved: 0,
    unresolved: 0,
    teamStats: {} as Record<string, number>,
    opponentStats: {} as Record<string, number>
  };

  for (const result of results) {
    if (result.team !== 'UNK' && result.opponent !== 'UNK') {
      stats.resolved++;
    } else {
      stats.unresolved++;
    }
    
    stats.teamStats[result.team] = (stats.teamStats[result.team] || 0) + 1;
    stats.opponentStats[result.opponent] = (stats.opponentStats[result.opponent] || 0) + 1;
  }

  return stats;
}
