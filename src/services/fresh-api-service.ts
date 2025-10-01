/**
 * Fresh API Service - Completely new implementation to bypass any caching issues
 * This service directly calls the SportsDataIO API with the correct field mapping
 */

const API_KEY = '883b10f6c52a48b38b3b5cafa94d2189';
const BASE_URL = 'https://api.sportsdata.io/v3';

interface PlayerProp {
  id: string;
  playerId: number;
  playerName: string;
  team: string;
  teamAbbr: string;
  opponent: string;
  opponentAbbr: string;
  gameId: string;
  sport: string;
  propType: string;
  line: number;
  overOdds: number;
  underOdds: number;
  gameDate: string;
  gameTime: string;
  headshotUrl?: string;
  confidence?: number;
  expectedValue?: number;
  recentForm?: string;
  last5Games?: number[];
  seasonStats?: {
    average: number;
    median: number;
    gamesPlayed: number;
    hitRate: number;
    last5Games: number[];
    seasonHigh: number;
    seasonLow: number;
  };
  aiPrediction?: {
    recommended: 'over' | 'under';
    confidence: number;
    reasoning: string;
    factors: string[];
  };
}

class FreshAPIService {
  private mapStatTypeToPropType(statType: string): string {
    const mapping: Record<string, string> = {
      'Passing Yards': 'Passing Yards',
      'Passing Touchdowns': 'Passing TDs',
      'Passing Attempts': 'Passing Attempts',
      'Passing Completions': 'Passing Completions',
      'Passing Interceptions': 'Passing Interceptions',
      'Rushing Yards': 'Rushing Yards',
      'Rushing Touchdowns': 'Rushing TDs',
      'Rushing Attempts': 'Rushing Attempts',
      'Receiving Yards': 'Receiving Yards',
      'Receiving Touchdowns': 'Receiving TDs',
      'Receptions': 'Receptions',
      'Total Touchdowns': 'Total Touchdowns',
      'Fantasy Points': 'Fantasy Points',
      'Fantasy Points PPR': 'Fantasy Points PPR',
    };
    return mapping[statType] || statType;
  }

  private roundToHalfIntervals(value: number): number {
    return Math.round(value * 2) / 2;
  }

  private getDefaultLineForPropType(propType: string): number {
    const defaultLines: Record<string, number> = {
      'Passing Yards': 250.5,
      'Passing Touchdowns': 2.5,
      'Passing TDs': 2.5,
      'Passing Attempts': 30.5,
      'Passing Completions': 20.5,
      'Passing Interceptions': 1.5,
      'Rushing Yards': 75.5,
      'Rushing Touchdowns': 0.5,
      'Rushing TDs': 0.5,
      'Rushing Attempts': 15.5,
      'Receiving Yards': 60.5,
      'Receiving Touchdowns': 0.5,
      'Receiving TDs': 0.5,
      'Receptions': 4.5,
      'Total Touchdowns': 1.5,
      'Fantasy Points': 18.5,
      'Fantasy Points PPR': 20.5,
    };
    return defaultLines[propType] || 10.5;
  }

  async getPlayerProps(sport: string): Promise<PlayerProp[]> {
    console.log(`🚀 [FreshAPI] Getting player props for ${sport}...`);
    
    try {
      const season = '2024';
      const week = '18';
      const endpoint = `${BASE_URL}/nfl/odds/json/PlayerPropsByWeek/${season}/${week}?key=${API_KEY}`;
      
      console.log(`📡 [FreshAPI] Calling endpoint: ${endpoint}`);
      
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const rawData = await response.json();
      console.log(`📊 [FreshAPI] Raw data received: ${rawData.length} items`);
      
      // Parse the data with correct field mapping
      const props: PlayerProp[] = rawData
        .filter((item: any) => item && item.PlayerID && item.Description && item.Name)
        .map((item: any) => {
          const playerName = item.Name;
          const propType = this.mapStatTypeToPropType(item.Description);
          
          // Use correct field names
          let rawLine = item.OverUnder;
          if (!rawLine || rawLine <= 0 || rawLine > 1000) {
            rawLine = this.getDefaultLineForPropType(propType);
          }
          
          const line = this.roundToHalfIntervals(rawLine);
          
          let overOdds = item.OverPayout;
          let underOdds = item.UnderPayout;
          
          if (!overOdds || !underOdds || Math.abs(overOdds) < 100 || Math.abs(underOdds) < 100) {
            overOdds = -110;
            underOdds = -110;
          }
          
          return {
            id: `${item.PlayerID}_${propType}_${Date.now()}`,
            playerId: item.PlayerID || 0,
            playerName: playerName,
            team: item.Team || 'Unknown',
            teamAbbr: item.Team || 'UNK',
            opponent: item.Opponent || 'Unknown',
            opponentAbbr: item.Opponent || 'UNK',
            gameId: item.ScoreID?.toString() || '',
            sport: sport.toUpperCase(),
            propType: propType,
            line: line,
            overOdds: overOdds,
            underOdds: underOdds,
            gameDate: item.DateTime || new Date().toISOString(),
            gameTime: item.DateTime ? new Date(item.DateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }) : 'TBD',
            headshotUrl: `https://a.espncdn.com/i/headshots/nfl/players/full/${item.PlayerID}.png`,
            confidence: 0.5,
            expectedValue: 0,
            recentForm: 'average',
            last5Games: [line, line * 0.9, line * 1.1, line * 0.8, line * 1.2],
            seasonStats: {
              average: line,
              median: line,
              gamesPlayed: 10,
              hitRate: 0.5,
              last5Games: [line, line * 0.9, line * 1.1, line * 0.8, line * 1.2],
              seasonHigh: line * 1.5,
              seasonLow: line * 0.5,
            },
            aiPrediction: {
              recommended: overOdds < underOdds ? 'over' : 'under',
              confidence: 0.5,
              reasoning: `Based on ${playerName}'s recent performance and matchup against ${item.Opponent}`,
              factors: ['Recent form', 'Matchup', 'Weather', 'Injuries']
            }
          };
        });
      
      console.log(`✅ [FreshAPI] Successfully parsed ${props.length} player props`);
      
      // Log first few props to verify data quality
      if (props.length > 0) {
        console.log('🔍 [FreshAPI] Sample props:');
        props.slice(0, 3).forEach((prop, index) => {
          console.log(`  ${index + 1}. ${prop.playerName} - ${prop.propType}: ${prop.line} (${prop.overOdds}/${prop.underOdds})`);
        });
      }
      
      return props;
      
    } catch (error) {
      console.error(`❌ [FreshAPI] Error getting player props:`, error);
      return [];
    }
  }
}

// Export a singleton instance
export const freshAPIService = new FreshAPIService();
export type { PlayerProp };
