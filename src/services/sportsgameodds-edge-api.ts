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
        body: { endpoint: 'games', sport: sport }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      console.log(`✅ [SportsGameOddsEdgeAPI] Retrieved ${data.data.data.length} events for ${sport}`);
      return data.data.data || [];
    } catch (error) {
      console.error(`❌ [SportsGameOddsEdgeAPI] Failed to fetch events for ${sport}:`, error);
      return [];
    }
  }

  async getPlayerProps(sport: string): Promise<any[]> {
    try {
      console.log(`🎯 [SportsGameOddsEdgeAPI] Fetching player props for ${sport}...`);
      
      const { data, error } = await supabase.functions.invoke('sportsgameodds-api-simple', {
        body: { endpoint: 'player-props', sport: sport }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      // Extract player props from the events data
      const events = data.data.data || [];
      const playerProps: any[] = [];
      
      events.forEach((event: SportsGameOddsEvent) => {
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
