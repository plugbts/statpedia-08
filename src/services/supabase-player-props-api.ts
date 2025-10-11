/**
 * Supabase-based Player Props API Service
 * 
 * This service directly queries Supabase for player props data,
 * ensuring we always have historical + enriched data with team abbreviations.
 */

import { supabase } from '@/integrations/supabase/client';
import { playerPropsEnricher } from './player-props-enricher';

interface PlayerProp {
  id?: string;
  playerId?: string;
  playerName: string;
  player_id?: string | number;
  team?: string;
  opponent?: string;
  propType: string;
  line: number | null;
  overOdds: number | null;
  underOdds: number | null;
  sportsbooks?: string[];
  position?: string;
  gameDate: string;
  gameTime?: string;
  sport?: string;
  teamAbbr: string;
  opponentAbbr: string;
  confidence?: number;
  expectedValue?: number;
  recentForm?: string;
  aiPrediction?: {
    recommended: 'over' | 'under';
    confidence: number;
    reasoning: string;
  };
  // Enhanced fields
  bestOver?: {
    bookmaker: string;
    side: string;
    price: string;
    line: number | null;
  };
  bestUnder?: {
    bookmaker: string;
    side: string;
    price: string;
    line: number | null;
  };
  allBooks?: Array<{
    bookmaker: string;
    side: string;
    price: string;
    line: number | null;
    deeplink?: string;
  }>;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  // Additional fields for compatibility
  availableSportsbooks?: string[];
  gameId?: string;
  allSportsbookOdds?: Array<{
    sportsbook: string;
    odds: number;
    lastUpdate: string;
  }>;
  available?: boolean;
  awayTeam?: string;
  homeTeam?: string;
  betType?: string;
  isExactAPIData?: boolean;
  lastUpdate?: string;
  marketName?: string;
  market?: string;
  marketId?: string;
  period?: string;
  statEntity?: string;
}

interface APIResponse {
  success: boolean;
  data: PlayerProp[];
  cached: boolean;
  cacheKey: string;
  responseTime: number;
  totalEvents: number;
  totalProps: number;
  error?: string;
}

class SupabasePlayerPropsAPI {
  /**
   * Get player props directly from Supabase
   */
  async getPlayerProps(
    sport: string = 'nfl', 
    forceRefresh: boolean = false, 
    date?: string, 
    view?: string
  ): Promise<PlayerProp[]> {
    try {
      console.log(`📊 SUPABASE: Fetching player props for ${sport} from player_props_fixed table...`);
      
      const startTime = Date.now();
      
      // Build query for player_props_fixed table
      let query = supabase
        .from('player_props_fixed')
        .select('*')
        .eq('league', sport.toLowerCase());
      
      // Add date filter if specified
      if (date) {
        query = query.eq('prop_date', date);
      }
      
      // Add limit to prevent huge responses
      query = query.limit(150);
      
      // Order by most recent first
      query = query.order('prop_date', { ascending: false });
      
      const { data: dbProps, error: dbError } = await query;
      
      if (dbError) {
        console.error(`❌ SUPABASE: Database query failed:`, dbError);
        throw new Error(`Database query failed: ${dbError.message}`);
      }
      
      console.log(`📊 SUPABASE: Retrieved ${dbProps?.length || 0} props from database`);
      
      if (!dbProps || dbProps.length === 0) {
        console.log(`⚠️ SUPABASE: No props found for ${sport}`);
        return [];
      }
      
      // Transform database data to frontend format with name formatting and team enrichment
      const frontendProps: PlayerProp[] = dbProps.map((prop: any) => {
        // Format player name (remove underscores, numbers, and convert to proper case)
        const formattedPlayerName = this.formatPlayerName(prop.player_name);
        
        // Enrich team data (handle null/UNK values)
        const { team, opponent } = this.enrichTeamData(prop.team_abbr, prop.opponent_abbr, prop.player_name);
        
        return {
          id: prop.prop_id?.toString() || `${prop.player_id}-${prop.prop_date}-${prop.prop_type}`,
          playerId: prop.player_id,
          playerName: formattedPlayerName,
          team: team,
          teamAbbr: team,
          opponent: opponent,
          opponentAbbr: opponent,
        gameId: prop.game_id,
        sport: prop.league,
        propType: prop.prop_type,
        line: prop.line,
        overOdds: prop.over_odds,
        underOdds: prop.under_odds,
        gameDate: prop.prop_date,
        gameTime: prop.prop_date,
        availableSportsbooks: ['SportsGameOdds'],
        allSportsbookOdds: [{
          sportsbook: 'SportsGameOdds',
          odds: prop.over_odds,
          lastUpdate: new Date().toISOString()
        }],
        available: true,
        isExactAPIData: true,
        lastUpdate: new Date().toISOString(),
        market: prop.prop_type,
        marketName: prop.prop_type,
        // Analytics data
        expectedValue: prop.ev_percent,
        homeTeamLogo: prop.team_logo,
        awayTeamLogo: prop.opponent_logo,
        recentForm: prop.last5_streak,
        // Additional analytics
        confidence: prop.ev_percent ? Math.abs(prop.ev_percent) / 100 : 0
        };
      });
      
      // Filter out defensive props for NFL and NBA
      const filteredProps = frontendProps.filter((prop) => {
        const propType = prop.propType?.toLowerCase() || '';
        const currentSport = sport.toLowerCase();
        
        // Remove defensive props for NFL and NBA
        if (currentSport === 'nfl' || currentSport === 'nba') {
          const isDefensiveProp = propType.includes('defense') || 
                                propType.includes('tackle') || 
                                propType.includes('sack') || 
                                propType.includes('interception');
          return !isDefensiveProp;
        }
        
        return true;
      });
      
      console.log(`📊 SUPABASE: Filtered to ${filteredProps.length} props (removed defensive props)`);
      
      // Enrich with additional analytics
      console.log(`🔧 SUPABASE: Enriching ${filteredProps.length} props with analytics...`);
      const enrichedProps = await playerPropsEnricher.enrichPlayerProps(filteredProps);
      
      const responseTime = Date.now() - startTime;
      console.log(`✅ SUPABASE: Successfully retrieved ${enrichedProps.length} enriched props (${responseTime}ms)`);
      
      return enrichedProps;
      
    } catch (error) {
      console.error('❌ SUPABASE: Failed to fetch player props:', error);
      throw error;
    }
  }

  /**
   * Get cached player props (faster response) - backward compatibility
   */
  async getCachedPlayerProps(sport: string = 'nfl'): Promise<PlayerProp[]> {
    return await this.getPlayerProps(sport, false);
  }

  /**
   * Force refresh player props (bypass cache) - backward compatibility
   */
  async refreshPlayerProps(sport: string = 'nfl'): Promise<PlayerProp[]> {
    return await this.getPlayerProps(sport, true);
  }

  /**
   * Get player props with pagination (new method)
   */
  async getPlayerPropsPaginated(
    sport: string = 'nfl',
    page: number = 1,
    pageSize: number = 50,
    forceRefresh: boolean = false,
    date?: string,
    view?: string
  ): Promise<{ props: PlayerProp[]; total: number; hasMore: boolean; page: number; pageSize: number }> {
    const allProps = await this.getPlayerProps(sport, forceRefresh, date, view);
    return this.paginateProps(allProps, page, pageSize);
  }

  /**
   * Paginate props array
   */
  private paginateProps(props: PlayerProp[], page: number, pageSize: number): { props: PlayerProp[]; total: number; hasMore: boolean; page: number; pageSize: number } {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedProps = props.slice(startIndex, endIndex);
    
    return {
      props: paginatedProps,
      total: props.length,
      hasMore: endIndex < props.length,
      page,
      pageSize
    };
  }

  /**
   * Get multiple sports at once
   */
  async getAllSportsPlayerProps(): Promise<Record<string, PlayerProp[]>> {
    const sports = ['nfl', 'nba', 'mlb', 'nhl'];
    const results: Record<string, PlayerProp[]> = {};
    
    // Fetch all sports in parallel
    const promises = sports.map(async (sport) => {
      try {
        const result = await this.getPlayerProps(sport);
        results[sport] = result;
      } catch (error) {
        console.warn(`Failed to fetch ${sport} props:`, error);
        results[sport] = [];
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Format player name (remove underscores, numbers, convert to proper case)
   */
  private formatPlayerName(rawName: string): string {
    if (!rawName) return 'Unknown Player';
    
    // Remove underscores, numbers, and extra suffixes
    let formatted = rawName
      .replace(/_[0-9]+_NFL?/g, '') // Remove _1_NFL, _2_NFL, etc.
      .replace(/_[0-9]+/g, '') // Remove any remaining numbers
      .replace(/_/g, ' ') // Replace underscores with spaces
      .trim();
    
    // Convert to proper case (first letter of each word capitalized)
    formatted = formatted
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return formatted;
  }

  /**
   * Enrich team data (handle null/UNK values with fallback logic)
   */
  private enrichTeamData(teamAbbr: string, opponentAbbr: string, playerName: string): { team: string; opponent: string } {
    // Team abbreviation mapping
    const teamMappings: Record<string, string> = {
      // NFL Teams
      'ARI': 'ARI', 'ATL': 'ATL', 'BAL': 'BAL', 'BUF': 'BUF', 'CAR': 'CAR',
      'CHI': 'CHI', 'CIN': 'CIN', 'CLE': 'CLE', 'DAL': 'DAL', 'DEN': 'DEN',
      'DET': 'DET', 'GB': 'GB', 'HOU': 'HOU', 'IND': 'IND', 'JAX': 'JAX',
      'KC': 'KC', 'LV': 'LV', 'LAC': 'LAC', 'LAR': 'LAR', 'MIA': 'MIA',
      'MIN': 'MIN', 'NE': 'NE', 'NO': 'NO', 'NYG': 'NYG', 'NYJ': 'NYJ',
      'PHI': 'PHI', 'PIT': 'PIT', 'SF': 'SF', 'SEA': 'SEA', 'TB': 'TB',
      'TEN': 'TEN', 'WAS': 'WAS',
      // NBA Teams
      'ATL': 'ATL', 'BOS': 'BOS', 'BKN': 'BKN', 'CHA': 'CHA', 'CHI': 'CHI',
      'CLE': 'CLE', 'DAL': 'DAL', 'DEN': 'DEN', 'DET': 'DET', 'GSW': 'GSW',
      'HOU': 'HOU', 'IND': 'IND', 'LAC': 'LAC', 'LAL': 'LAL', 'MEM': 'MEM',
      'MIA': 'MIA', 'MIL': 'MIL', 'MIN': 'MIN', 'NO': 'NO', 'NYK': 'NYK',
      'OKC': 'OKC', 'ORL': 'ORL', 'PHI': 'PHI', 'PHX': 'PHX', 'POR': 'POR',
      'SAC': 'SAC', 'SA': 'SA', 'TOR': 'TOR', 'UTA': 'UTA', 'WAS': 'WAS'
    };

    // Player to team mapping (for cases where team data is missing)
    const playerTeamMappings: Record<string, string> = {
      'AARON_RODGERS_1_NFL': 'NYJ',
      'AARON_RODGERS': 'NYJ',
      'AARON RODGERS': 'NYJ',
      'BO_NIX': 'NYJ',
      'BO NIX': 'NYJ',
      'DJ_MOORE': 'WAS',
      'DJ MOORE': 'WAS',
      'ADDISON_BARGER': 'TOR',
      'ADDISON BARGER': 'TOR'
    };

    let team = teamAbbr;
    let opponent = opponentAbbr;

    // Handle null/UNK team data
    if (!team || team === 'null' || team === 'UNK') {
      // Try to get team from player name mapping
      const playerKey = playerName.toUpperCase();
      team = playerTeamMappings[playerKey] || 'UNK';
    }

    // Handle null/UNK opponent data
    if (!opponent || opponent === 'null' || opponent === 'UNK') {
      // For now, set a default opponent (this could be enhanced with game data)
      opponent = 'OPP';
    }

    // Validate team abbreviations
    team = teamMappings[team] || team;
    opponent = teamMappings[opponent] || opponent;

    return { team, opponent };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('player_props_fixed')
        .select('prop_id')
        .limit(1);
      return !error;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const supabasePlayerPropsAPI = new SupabasePlayerPropsAPI();

// Export types for use in components
export type { PlayerProp, APIResponse };
