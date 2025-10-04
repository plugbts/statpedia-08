// normalizers.ts

import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';

// Timezone conversion utility
export function toUserTimeSGO(timestamp: string | undefined, timezone: string = "America/New_York"): string {
  if (!timestamp) return new Date().toISOString();
  
  try {
    const date = new Date(timestamp);
    // For now, return the original timestamp
    // In a full implementation, you'd convert to the user's timezone
    return date.toISOString();
  } catch (error) {
    logWarning('Normalizers', `Failed to convert timestamp ${timestamp}:`, error);
    return new Date().toISOString();
  }
}

// Normalize SportsGameOdds event to unified format
export function normalizeEventSGO(ev: any, request: any) {
  try {
    return {
      eventID: ev.eventID,
      leagueID: ev.leagueID,
      start_time: toUserTimeSGO(ev.status?.startsAt, request.cf?.timezone || "America/New_York"),
      home_team: ev.teams?.home?.names?.long || "UNK",
      away_team: ev.teams?.away?.names?.long || "UNK",
      players: ev.players || {},
      player_props: Object.values(ev.odds || {}), // flatten odds object
    };
  } catch (error) {
    logError('Normalizers', 'Failed to normalize event:', error);
    return null;
  }
}

// Group and normalize player props
export function groupPlayerProps(event: any, league: string) {
  try {
    const grouped: Record<string, any[]> = {};
    
    for (const m of event.player_props) {
      const key = [m.playerID || "", m.statID || "", m.periodID || "", m.betTypeID || ""].join("|");
      (grouped[key] ||= []).push(m);
    }
    
    event.player_props = Object.values(grouped)
      .map(group => normalizePlayerGroup(group, event.players, league))
      .filter(Boolean);
      
    logAPI('Normalizers', `Grouped ${Object.keys(grouped).length} player prop groups for ${event.eventID}`);
  } catch (error) {
    logError('Normalizers', 'Failed to group player props:', error);
    event.player_props = [];
  }
}

// Normalize a group of player props
export function normalizePlayerGroup(group: any[], players: any, league: string) {
  try {
    if (!group || group.length === 0) return null;
    
    const first = group[0];
    const playerID = first.playerID || first.statEntityID;
    const player = players[playerID] || {};
    
    return {
      playerID: playerID,
      playerName: player.name || player.firstName + ' ' + player.lastName || 'Unknown Player',
      team: player.teamID || 'Unknown',
      propType: first.statID || 'Unknown',
      line: first.line || first.overUnder || 0,
      overOdds: first.overOdds || -110,
      underOdds: first.underOdds || -110,
      books: group.map(g => ({
        side: g.sideID || 'over',
        odds: g.odds || -110,
        sportsbook: g.sportsbook || 'Unknown'
      }))
    };
  } catch (error) {
    logError('Normalizers', 'Failed to normalize player group:', error);
    return null;
  }
}
