import { supabase } from '@/integrations/supabase/client';

export interface SportsGameOddsEvent {
  eventID: string;
  sportID: string;
  leagueID: string;
  type: string;
  teams: {
    home: {
      statEntityID: string;
      names: {
        short: string;
        medium: string;
        long: string;
      };
      teamID: string;
      colors: {
        primaryContrast: string;
        primary: string;
      };
    };
    away: {
      statEntityID: string;
      names: {
        short: string;
        medium: string;
        long: string;
      };
      teamID: string;
      colors: {
        primaryContrast: string;
        primary: string;
      };
    };
  };
  status: {
    hardStart: boolean;
    delayed: boolean;
    cancelled: boolean;
    startsAt: string;
    started: boolean;
    displayShort: string;
    completed: boolean;
    displayLong: string;
    ended: boolean;
    periods: {
      ended: string[];
      started: string[];
    };
    live: boolean;
    finalized: boolean;
    currentPeriodID: string;
    previousPeriodID: string;
    oddsPresent: boolean;
    oddsAvailable: boolean;
  };
  odds?: any;
  results?: any;
}

export interface SportsGameOddsResponse {
  success: boolean;
  data: {
    nextCursor?: string;
    success: boolean;
    data: SportsGameOddsEvent[];
  };
  endpoint: string;
  sport: string;
  timestamp: string;
}

class SportsGameOddsEdgeAPI {
  async getEvents(sport: string): Promise<SportsGameOddsEvent[]> {
    try {
      console.log(`🎯 [SportsGameOddsEdgeAPI] Fetching events for ${sport}...`);
      
      const { data, error } = await supabase.functions.invoke('sportsgameodds-api-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ endpoint: 'games', sport: sport })
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      const events = data.data.data || [];
      
      // Map sport names to SportsGameOdds sport IDs for filtering
      const sportMapping: Record<string, string> = {
        'nfl': 'FOOTBALL',
        'nba': 'BASKETBALL',
        'nhl': 'HOCKEY',
        'mlb': 'BASEBALL',
        'college-football': 'FOOTBALL',
        'college-basketball': 'BASKETBALL',
        'wnba': 'BASKETBALL'
      };
      
      const expectedSportId = sportMapping[sport.toLowerCase()] || sport.toUpperCase();
      
      // Filter events by sport
      const filteredEvents = events.filter((event: SportsGameOddsEvent) => {
        // For NFL, also filter by league to exclude college football
        if (sport.toLowerCase() === 'nfl') {
          return event.sportID === 'FOOTBALL' && 
                 (event.leagueID === 'NFL' || event.leagueID === 'NFL_PLAYOFFS');
        }
        // For MLB, include regular season and playoff games
        if (sport.toLowerCase() === 'mlb') {
          return event.sportID === 'BASEBALL' && 
                 (event.leagueID === 'MLB' || event.leagueID === 'MLB_PLAYOFFS' || event.leagueID === 'MLB_POSTSEASON');
        }
        // For NBA, include regular season and playoff games
        if (sport.toLowerCase() === 'nba') {
          return event.sportID === 'BASKETBALL' && 
                 (event.leagueID === 'NBA' || event.leagueID === 'NBA_PLAYOFFS' || event.leagueID === 'NBA_POSTSEASON');
        }
        // For NHL, include regular season and playoff games
        if (sport.toLowerCase() === 'nhl') {
          return event.sportID === 'HOCKEY' && 
                 (event.leagueID === 'NHL' || event.leagueID === 'NHL_PLAYOFFS' || event.leagueID === 'NHL_POSTSEASON');
        }
        // For other sports, just match the sport ID
        return event.sportID === expectedSportId;
      });
      
      console.log(`✅ [SportsGameOddsEdgeAPI] Retrieved ${filteredEvents.length} events for ${sport} from ${events.length} total events`);
      return filteredEvents;
    } catch (error) {
      console.error(`❌ [SportsGameOddsEdgeAPI] Failed to fetch events for ${sport}:`, error);
      return [];
    }
  }

  async getPlayerProps(sport: string): Promise<any[]> {
    try {
      console.log(`🎯 [SportsGameOddsEdgeAPI] Fetching player props for ${sport}...`);
      
      const { data, error } = await supabase.functions.invoke('sportsgameodds-api-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ endpoint: 'player-props', sport: sport })
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      // Extract player props from the events data
      const events = data.data.data || [];
      const playerProps: any[] = [];
      
      // Map sport names to SportsGameOdds sport IDs for filtering
      const sportMapping: Record<string, string> = {
        'nfl': 'FOOTBALL',
        'nba': 'BASKETBALL',
        'nhl': 'HOCKEY',
        'mlb': 'BASEBALL',
        'college-football': 'FOOTBALL',
        'college-basketball': 'BASKETBALL',
        'wnba': 'BASKETBALL'
      };
      
      const expectedSportId = sportMapping[sport.toLowerCase()] || sport.toUpperCase();
      
      // Filter events by sport first
      const filteredEvents = events.filter((event: SportsGameOddsEvent) => {
        // For NFL, also filter by league to exclude college football
        if (sport.toLowerCase() === 'nfl') {
          return event.sportID === 'FOOTBALL' && 
                 (event.leagueID === 'NFL' || event.leagueID === 'NFL_PLAYOFFS');
        }
        // For MLB, include regular season and playoff games
        if (sport.toLowerCase() === 'mlb') {
          return event.sportID === 'BASEBALL' && 
                 (event.leagueID === 'MLB' || event.leagueID === 'MLB_PLAYOFFS' || event.leagueID === 'MLB_POSTSEASON');
        }
        // For NBA, include regular season and playoff games
        if (sport.toLowerCase() === 'nba') {
          return event.sportID === 'BASKETBALL' && 
                 (event.leagueID === 'NBA' || event.leagueID === 'NBA_PLAYOFFS' || event.leagueID === 'NBA_POSTSEASON');
        }
        // For NHL, include regular season and playoff games
        if (sport.toLowerCase() === 'nhl') {
          return event.sportID === 'HOCKEY' && 
                 (event.leagueID === 'NHL' || event.leagueID === 'NHL_PLAYOFFS' || event.leagueID === 'NHL_POSTSEASON');
        }
        // For other sports, just match the sport ID
        return event.sportID === expectedSportId;
      });
      
      console.log(`🔍 [SportsGameOddsEdgeAPI] Filtered ${filteredEvents.length} events for ${sport} from ${events.length} total events`);
      
      filteredEvents.forEach((event: SportsGameOddsEvent) => {
        if (event.odds) {
          Object.values(event.odds).forEach((odd: any) => {
            if (odd.playerID && odd.statID) {
              playerProps.push({
                playerId: odd.playerID,
                playerName: odd.playerID.replace(/_/g, ' '),
                team: event.teams.home.names.short, // Default to home team
                sport: sport,
                propType: odd.statID,
                line: odd.fairOverUnder || odd.bookOverUnder || 0,
                overOdds: odd.sideID === 'over' ? (odd.fairOdds || odd.bookOdds || '+100') : '+100',
                underOdds: odd.sideID === 'under' ? (odd.fairOdds || odd.bookOdds || '+100') : '+100',
                sportsbook: 'SportsGameOdds',
                sportsbookKey: 'sportsgameodds',
                lastUpdate: new Date().toISOString(),
                gameId: event.eventID,
                gameTime: event.status.startsAt,
                homeTeam: event.teams.home.names.short,
                awayTeam: event.teams.away.names.short,
                confidence: 0.8,
                market: odd.marketName || `${odd.statID} ${odd.periodID}`,
                outcome: odd.sideID,
                betType: odd.betTypeID,
                side: odd.sideID,
                period: odd.periodID,
                statEntity: odd.statEntityID
              });
            }
          });
        }
      });

      console.log(`✅ [SportsGameOddsEdgeAPI] Extracted ${playerProps.length} player props for ${sport}`);
      return playerProps;
    } catch (error) {
      console.error(`❌ [SportsGameOddsEdgeAPI] Failed to fetch player props for ${sport}:`, error);
      return [];
    }
  }
}

export const sportsGameOddsEdgeAPI = new SportsGameOddsEdgeAPI();
