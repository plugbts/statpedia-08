/**
 * Player Props Enricher Service
 * Enriches real player props with gameLogs and analytics data
 */

import { supabase } from '@/integrations/supabase/client';
import { normalizePlayerId } from '@/utils/player-id-normalizer';
import { normalizeOpponent, normalizeMarketType, normalizePosition } from '@/utils/normalize';

// Use a flexible interface that matches the existing PlayerProp
interface PlayerProp {
  id?: string;
  playerId?: string;
  player_id?: string | number;
  playerName: string;
  player_name?: string;
  team: string;
  opponent: string;
  propType: string;
  marketType?: string;
  line: number;
  overOdds: number;
  underOdds: number;
  gameDate?: string;
  teamAbbr?: string;
  opponentAbbr?: string;
  gameLogs?: Array<{
    date: string;
    season: number;
    opponent: string;
    value: number;
  }>;
  defenseStats?: Array<{
    team: string;
    propType: string;
    position: string;
    rank: number;
  }>;
  [key: string]: any;
}

export class PlayerPropsEnricher {
  /**
   * Enrich player props with gameLogs and defenseStats
   */
  async enrichPlayerProps(props: any[]): Promise<any[]> {
    console.log(`🔧 Enriching ${props.length} player props with gameLogs and defenseStats...`);
    
    const enrichedProps = await Promise.all(
      props.map(async (prop) => {
        try {
          // Normalize player ID for database lookup
          const normalizedPlayerId = normalizePlayerId(prop.playerName || prop.playerId);
          const normalizedPropType = normalizeMarketType(prop.propType || prop.marketType || '');
          
          // Fetch game logs for this player/prop
          const gameLogs = await this.fetchGameLogs(normalizedPlayerId, normalizedPropType);
          
          // Fetch defense stats for this matchup
          const defenseStats = await this.fetchDefenseStats(prop.team, prop.opponent, normalizedPropType);
          
          return {
            ...prop,
            gameLogs,
            defenseStats
          };
        } catch (error) {
          console.error(`❌ Failed to enrich prop ${prop.playerName} ${prop.propType}:`, error);
          return prop; // Return original prop if enrichment fails
        }
      })
    );
    
    console.log(`✅ Enriched ${enrichedProps.length} player props`);
    return enrichedProps;
  }

  /**
   * Fetch game logs for a specific player and prop type
   */
  private async fetchGameLogs(playerId: string, propType: string): Promise<Array<{
    date: string;
    season: number;
    opponent: string;
    value: number;
  }>> {
    try {
      const { data, error } = await supabase
        .from('playergamelogs')
        .select('date, season, opponent, value')
        .eq('player_id', playerId)
        .eq('prop_type', propType)
        .order('date', { ascending: false })
        .limit(20); // Last 20 games

      if (error) {
        console.error(`❌ Error fetching game logs for ${playerId} ${propType}:`, error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error(`❌ Exception fetching game logs for ${playerId} ${propType}:`, error);
      return [];
    }
  }

  /**
   * Fetch defense stats for a specific matchup
   */
  private async fetchDefenseStats(team: string, opponent: string, propType: string): Promise<Array<{
    team: string;
    propType: string;
    position: string;
    rank: number;
  }>> {
    try {
      // For now, return a simple defense stat structure
      // In a real implementation, this would query a defense stats table
      const position = this.getPositionFromPropType(propType);
      
      return [{
        team: normalizeOpponent(team),
        propType: normalizeMarketType(propType),
        position: normalizePosition(position),
        rank: Math.floor(Math.random() * 32) + 1 // Mock rank for now
      }];
    } catch (error) {
      console.error(`❌ Error fetching defense stats for ${team} vs ${opponent} ${propType}:`, error);
      return [];
    }
  }

  /**
   * Get position from prop type
   */
  private getPositionFromPropType(propType: string): string {
    const lowerPropType = propType.toLowerCase();
    
    if (lowerPropType.includes('passing')) return 'QB';
    if (lowerPropType.includes('rushing')) return 'RB';
    if (lowerPropType.includes('receiving')) return 'WR';
    if (lowerPropType.includes('field goal') || lowerPropType.includes('extra point')) return 'K';
    
    return 'UNK';
  }

  /**
   * Check if a prop has sufficient data for analytics
   */
  hasAnalyticsData(prop: PlayerProp): boolean {
    return !!(prop.gameLogs && prop.gameLogs.length > 0 && prop.defenseStats && prop.defenseStats.length > 0);
  }

  /**
   * Get analytics summary for a prop
   */
  getAnalyticsSummary(prop: PlayerProp): {
    hasGameLogs: boolean;
    gameLogsCount: number;
    hasDefenseStats: boolean;
    defenseStatsCount: number;
  } {
    return {
      hasGameLogs: !!(prop.gameLogs && prop.gameLogs.length > 0),
      gameLogsCount: prop.gameLogs?.length || 0,
      hasDefenseStats: !!(prop.defenseStats && prop.defenseStats.length > 0),
      defenseStatsCount: prop.defenseStats?.length || 0
    };
  }
}

export const playerPropsEnricher = new PlayerPropsEnricher();
