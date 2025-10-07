import { supabase } from '@/integrations/supabase/client';
import { historicalDataService } from './historical-data-service';
import { normalizeOpponent, normalizeMarketType, normalizePosition } from '@/utils/normalize';

export interface PlayerAnalyticsRecord {
  id?: number;
  player_id: string;
  player_name: string;
  prop_type: string;
  line: number;
  direction: string;
  matchup_rank_value?: number;
  matchup_rank_display?: string;
  season_hits: number;
  season_total: number;
  season_pct: number;
  h2h_hits: number;
  h2h_total: number;
  h2h_pct: number;
  l5_hits: number;
  l5_total: number;
  l5_pct: number;
  l10_hits: number;
  l10_total: number;
  l10_pct: number;
  l20_hits: number;
  l20_total: number;
  l20_pct: number;
  streak_current: number;
  streak_longest: number;
  streak_direction: string;
  chart_data?: any[];
  last_computed_at?: string;
  season: number;
  sport: string;
}

export class AnalyticsPrecomputationService {
  /**
   * Precompute analytics for a single player/prop combination
   */
  async precomputeAnalytics(
    playerId: string,
    playerName: string,
    propType: string,
    line: number,
    direction: 'over' | 'under',
    team: string,
    opponent: string,
    position: string,
    sport: string = 'nfl'
  ): Promise<PlayerAnalyticsRecord> {
    try {
      console.log(`🔄 Precomputing analytics for ${playerName} ${propType} ${line} ${direction}`);
      
      // Normalize inputs
      const normalizedTeam = normalizeOpponent(team);
      const normalizedOpponent = normalizeOpponent(opponent);
      const normalizedPropType = normalizeMarketType(propType);
      const normalizedPosition = normalizePosition(position);
      
      // Calculate all analytics in parallel
      const [
        matchupRank,
        seasonHitRate,
        h2hHitRate,
        l5HitRate,
        l10HitRate,
        l20HitRate,
        streak,
        chartData
      ] = await Promise.all([
        this.calculateMatchupRank(normalizedTeam, normalizedOpponent, normalizedPropType, normalizedPosition),
        this.calculateHitRate(playerId, normalizedPropType, line, direction),
        this.calculateH2HHitRate(playerId, normalizedPropType, line, direction, normalizedOpponent),
        this.calculateHitRate(playerId, normalizedPropType, line, direction, 5),
        this.calculateHitRate(playerId, normalizedPropType, line, direction, 10),
        this.calculateHitRate(playerId, normalizedPropType, line, direction, 20),
        this.calculateStreak(playerId, normalizedPropType, line, direction),
        this.getChartData(playerId, normalizedPropType, 20)
      ]);
      
      const analyticsRecord: PlayerAnalyticsRecord = {
        player_id: playerId,
        player_name: playerName,
        prop_type: propType,
        line,
        direction,
        matchup_rank_value: matchupRank.rank,
        matchup_rank_display: matchupRank.display,
        season_hits: seasonHitRate.hits,
        season_total: seasonHitRate.total,
        season_pct: seasonHitRate.hit_rate,
        h2h_hits: h2hHitRate.hits,
        h2h_total: h2hHitRate.total,
        h2h_pct: h2hHitRate.hit_rate,
        l5_hits: l5HitRate.hits,
        l5_total: l5HitRate.total,
        l5_pct: l5HitRate.hit_rate,
        l10_hits: l10HitRate.hits,
        l10_total: l10HitRate.total,
        l10_pct: l10HitRate.hit_rate,
        l20_hits: l20HitRate.hits,
        l20_total: l20HitRate.total,
        l20_pct: l20HitRate.hit_rate,
        streak_current: streak.current_streak,
        streak_longest: streak.longest_streak,
        streak_direction: streak.streak_direction,
        chart_data: chartData,
        season: 2025,
        sport
      };
      
      // Store in database
      await this.storeAnalytics(analyticsRecord);
      
      console.log(`✅ Precomputed analytics for ${playerName} ${propType}`);
      return analyticsRecord;
      
    } catch (error) {
      console.error(`❌ Failed to precompute analytics for ${playerName} ${propType}:`, error);
      throw error;
    }
  }
  
  /**
   * Precompute analytics for multiple players/props
   */
  async precomputeBatchAnalytics(
    props: Array<{
      playerId: string;
      playerName: string;
      propType: string;
      line: number;
      direction: 'over' | 'under';
      team: string;
      opponent: string;
      position: string;
      sport?: string;
    }>
  ): Promise<PlayerAnalyticsRecord[]> {
    console.log(`🔄 Precomputing analytics for ${props.length} props`);
    
    const results: PlayerAnalyticsRecord[] = [];
    
    // Process in chunks to avoid overwhelming the database
    const chunkSize = 10;
    for (let i = 0; i < props.length; i += chunkSize) {
      const chunk = props.slice(i, i + chunkSize);
      
      const chunkPromises = chunk.map(prop => 
        this.precomputeAnalytics(
          prop.playerId,
          prop.playerName,
          prop.propType,
          prop.line,
          prop.direction,
          prop.team,
          prop.opponent,
          prop.position,
          prop.sport
        ).catch(error => {
          console.error(`❌ Failed to precompute ${prop.playerName} ${prop.propType}:`, error);
          return null;
        })
      );
      
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults.filter(result => result !== null));
      
      // Small delay between chunks to prevent overwhelming the system
      if (i + chunkSize < props.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`✅ Precomputed analytics for ${results.length}/${props.length} props`);
    return results;
  }
  
  /**
   * Get precomputed analytics from database
   */
  async getPrecomputedAnalytics(
    playerId: string,
    propType: string,
    line: number,
    direction: string
  ): Promise<PlayerAnalyticsRecord | null> {
    try {
      const { data, error } = await supabase
        .from('analytics')
        .select('*')
        .eq('player_id', playerId)
        .eq('prop_type', propType)
        .eq('line', line)
        .eq('direction', direction)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('❌ Failed to get precomputed analytics:', error);
      return null;
    }
  }
  
  /**
   * Store analytics in database
   */
  private async storeAnalytics(analytics: PlayerAnalyticsRecord): Promise<void> {
    try {
      const { error } = await supabase
        .from('analytics')
        .upsert(analytics, {
          onConflict: 'player_id,prop_type,line,direction'
        });
      
      if (error) throw error;
    } catch (error) {
      console.error('❌ Failed to store analytics:', error);
      throw error;
    }
  }
  
  // Helper methods for individual calculations
  private async calculateMatchupRank(team: string, opponent: string, propType: string, position: string) {
    return await historicalDataService.getDefensiveRank(team, opponent, propType, position, 2025);
  }
  
  private async calculateHitRate(playerId: string, propType: string, line: number, direction: string, limit?: number) {
    return await historicalDataService.getHitRate(playerId, propType, line, direction, limit);
  }
  
  private async calculateH2HHitRate(playerId: string, propType: string, line: number, direction: string, opponent: string) {
    // For now, use general hit rate and simulate H2H
    const hitRate = await this.calculateHitRate(playerId, propType, line, direction);
    const h2hGames = Math.max(1, Math.floor(hitRate.total * 0.3));
    const h2hHits = Math.floor(hitRate.hits * 0.3);
    
    return {
      hits: h2hHits,
      total: h2hGames,
      hit_rate: h2hGames > 0 ? h2hHits / h2hGames : 0
    };
  }
  
  private async calculateStreak(playerId: string, propType: string, line: number, direction: string) {
    return await historicalDataService.getStreak(playerId, propType, line, direction);
  }
  
  private async getChartData(playerId: string, propType: string, limit: number) {
    const { data } = await supabase.rpc('get_player_chart_data', {
      p_player_id: playerId,
      p_prop_type: propType,
      p_limit: limit
    });
    return data || [];
  }
}

export const analyticsPrecomputationService = new AnalyticsPrecomputationService();
