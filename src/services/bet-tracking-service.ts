// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import { notificationService } from './notification-service';

export interface UserBankroll {
  id: string;
  user_id: string;
  bankroll_name: string;
  initial_amount: number;
  current_amount: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SportsbookConnection {
  id: string;
  user_id: string;
  sportsbook_name: string;
  account_username?: string;
  connection_status: 'pending' | 'connected' | 'failed' | 'disconnected';
  last_sync_at?: string;
  sync_frequency: 'daily' | 'weekly' | 'monthly';
  api_credentials?: any;
  created_at: string;
  updated_at: string;
}

export interface UserBet {
  id: string;
  user_id: string;
  bankroll_id: string;
  sportsbook_id?: string;
  bet_type: 'single' | 'parlay' | 'teaser' | 'round_robin' | 'system';
  bet_category: 'moneyline' | 'spread' | 'total' | 'prop' | 'futures';
  sport: string;
  bet_amount: number;
  odds: number;
  potential_payout: number;
  game_date: string;
  home_team: string;
  away_team: string;
  bet_selection: string;
  bet_status: 'pending' | 'won' | 'lost' | 'push' | 'cancelled';
  actual_payout: number;
  settled_at?: string;
  used_statpedia: boolean;
  statpedia_prediction_id?: string;
  confidence_level?: number;
  notes?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface ParlayLeg {
  id: string;
  bet_id: string;
  leg_number: number;
  sport: string;
  game_date: string;
  home_team: string;
  away_team: string;
  bet_selection: string;
  odds: number;
  leg_status: 'pending' | 'won' | 'lost' | 'push';
  created_at: string;
}

export interface MonthlyAnalytics {
  id: string;
  user_id: string;
  bankroll_id: string;
  year: number;
  month: number;
  total_bets: number;
  won_bets: number;
  lost_bets: number;
  push_bets: number;
  total_wagered: number;
  total_won: number;
  net_profit: number;
  win_percentage: number;
  roi_percentage: number;
  average_odds: number;
  statpedia_bets: number;
  statpedia_wins: number;
  statpedia_win_percentage: number;
  statpedia_roi: number;
  improvement_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface BettingGoal {
  id: string;
  user_id: string;
  bankroll_id: string;
  goal_type: 'win_percentage' | 'roi' | 'profit' | 'bankroll_growth';
  target_value: number;
  current_value: number;
  time_period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  start_date: string;
  end_date: string;
  is_achieved: boolean;
  achieved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BettingStats {
  total_bets: number;
  won_bets: number;
  lost_bets: number;
  push_bets: number;
  total_wagered: number;
  total_won: number;
  net_profit: number;
  win_percentage: number;
  roi_percentage: number;
  statpedia_bets: number;
  statpedia_wins: number;
  statpedia_win_percentage: number;
}

class BetTrackingService {
  // Bankroll Management
  async createBankroll(bankroll: Omit<UserBankroll, 'id' | 'created_at' | 'updated_at'>): Promise<UserBankroll> {
    const { data, error } = await supabase
      .from('user_bankrolls')
      .insert(bankroll)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getUserBankrolls(userId: string): Promise<UserBankroll[]> {
    const { data, error } = await supabase
      .from('user_bankrolls')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      // Handle table not existing gracefully
      if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        console.log('User bankrolls table not yet created');
        return [];
      }
      throw error;
    }
    return data || [];
  }

  async updateBankroll(bankrollId: string, updates: Partial<UserBankroll>): Promise<UserBankroll> {
    const { data, error } = await supabase
      .from('user_bankrolls')
      .update(updates)
      .eq('id', bankrollId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Sportsbook Connections
  async createSportsbookConnection(connection: Omit<SportsbookConnection, 'id' | 'created_at' | 'updated_at'>): Promise<SportsbookConnection> {
    const { data, error } = await supabase
      .from('sportsbook_connections')
      .insert(connection)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getUserSportsbookConnections(userId: string): Promise<SportsbookConnection[]> {
    const { data, error } = await supabase
      .from('sportsbook_connections')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      // Handle table not existing gracefully
      if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        console.log('Sportsbook connections table not yet created');
        return [];
      }
      throw error;
    }
    return data || [];
  }

  async updateSportsbookConnection(connectionId: string, updates: Partial<SportsbookConnection>): Promise<SportsbookConnection> {
    const { data, error } = await supabase
      .from('sportsbook_connections')
      .update(updates)
      .eq('id', connectionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Bet Management
  async createBet(bet: Omit<UserBet, 'id' | 'created_at' | 'updated_at'>): Promise<UserBet> {
    const { data, error } = await supabase
      .from('user_bets')
      .insert(bet)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getUserBets(userId: string, bankrollId?: string, limit: number = 50): Promise<UserBet[]> {
    let query = supabase
      .from('user_bets')
      .select('*')
      .eq('user_id', userId)
      .order('game_date', { ascending: false })
      .limit(limit);

    if (bankrollId) {
      query = query.eq('bankroll_id', bankrollId);
    }

    const { data, error } = await query;

    if (error) {
      // Handle table not existing gracefully
      if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        console.log('User bets table not yet created');
        return [];
      }
      throw error;
    }
    return data || [];
  }

  async updateBet(betId: string, updates: Partial<UserBet>): Promise<UserBet> {
    const { data, error } = await supabase
      .from('user_bets')
      .update(updates)
      .eq('id', betId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async settleBet(betId: string, status: 'won' | 'lost' | 'push', payout: number = 0): Promise<UserBet> {
    const { data: bet, error: betError } = await supabase
      .from('user_bets')
      .select('bankroll_id, bet_amount')
      .eq('id', betId)
      .single();

    if (betError) throw betError;

    const { data, error } = await supabase
      .from('user_bets')
      .update({
        bet_status: status,
        actual_payout: payout,
        settled_at: new Date().toISOString()
      })
      .eq('id', betId)
      .select()
      .single();

    if (error) throw error;

    // Update bankroll
    await supabase.rpc('update_bankroll_after_bet', {
      p_bankroll_id: bet.bankroll_id,
      p_bet_amount: bet.bet_amount,
      p_payout: payout
    });

    return data;
  }

  // Parlay Legs
  async createParlayLegs(legs: Omit<ParlayLeg, 'id' | 'created_at'>[]): Promise<ParlayLeg[]> {
    const { data, error } = await supabase
      .from('parlay_legs')
      .insert(legs)
      .select();

    if (error) throw error;
    return data || [];
  }

  async getParlayLegs(betId: string): Promise<ParlayLeg[]> {
    const { data, error } = await supabase
      .from('parlay_legs')
      .select('*')
      .eq('bet_id', betId)
      .order('leg_number', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // Analytics
  async getBettingStats(userId: string, bankrollId?: string, days: number = 30): Promise<BettingStats> {
    const { data, error } = await supabase
      .rpc('get_user_betting_stats', {
        p_user_id: userId,
        p_bankroll_id: bankrollId,
        p_days: days
      });

    if (error) {
      // Handle function or table not existing gracefully
      if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist') || error.message?.includes('function')) {
        console.log('Betting stats function or tables not yet created');
        return {
          total_bets: 0,
          won_bets: 0,
          lost_bets: 0,
          push_bets: 0,
          total_wagered: 0,
          total_won: 0,
          net_profit: 0,
          win_percentage: 0,
          roi_percentage: 0,
          statpedia_bets: 0,
          statpedia_wins: 0,
          statpedia_win_percentage: 0
        };
      }
      throw error;
    }
    return data?.[0] || {
      total_bets: 0,
      won_bets: 0,
      lost_bets: 0,
      push_bets: 0,
      total_wagered: 0,
      total_won: 0,
      net_profit: 0,
      win_percentage: 0,
      roi_percentage: 0,
      statpedia_bets: 0,
      statpedia_wins: 0,
      statpedia_win_percentage: 0
    };
  }

  async getMonthlyAnalytics(userId: string, bankrollId?: string, year?: number, month?: number): Promise<MonthlyAnalytics[]> {
    let query = supabase
      .from('monthly_analytics')
      .select('*')
      .eq('user_id', userId)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (bankrollId) {
      query = query.eq('bankroll_id', bankrollId);
    }

    if (year) {
      query = query.eq('year', year);
    }

    if (month) {
      query = query.eq('month', month);
    }

    const { data, error } = await query;

    if (error) {
      // Handle table not existing gracefully
      if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        console.log('Monthly analytics table not yet created');
        return [];
      }
      throw error;
    }
    return data || [];
  }

  async calculateMonthlyAnalytics(userId: string, bankrollId: string, year: number, month: number): Promise<void> {
    const { error } = await supabase
      .rpc('calculate_monthly_analytics', {
        p_user_id: userId,
        p_bankroll_id: bankrollId,
        p_year: year,
        p_month: month
      });

    if (error) throw error;
  }

  // Betting Goals
  async createBettingGoal(goal: Omit<BettingGoal, 'id' | 'created_at' | 'updated_at'>): Promise<BettingGoal> {
    const { data, error } = await supabase
      .from('betting_goals')
      .insert(goal)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getUserBettingGoals(userId: string, bankrollId?: string): Promise<BettingGoal[]> {
    let query = supabase
      .from('betting_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (bankrollId) {
      query = query.eq('bankroll_id', bankrollId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  async updateBettingGoal(goalId: string, updates: Partial<BettingGoal>): Promise<BettingGoal> {
    const { data, error } = await supabase
      .from('betting_goals')
      .update(updates)
      .eq('id', goalId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Utility functions
  calculatePayout(betAmount: number, odds: number): number {
    // American odds format
    if (odds > 0) {
      return betAmount + (betAmount * odds / 100);
    } else {
      return betAmount + (betAmount * 100 / Math.abs(odds));
    }
  }

  formatOdds(odds: number): string {
    if (odds > 0) {
      return `+${odds}`;
    } else {
      return odds.toString();
    }
  }

  getSportsbookOptions(): Array<{ value: string; label: string; logo?: string }> {
    return [
      { value: 'draftkings', label: 'DraftKings' },
      { value: 'fanduel', label: 'FanDuel' },
      { value: 'betmgm', label: 'BetMGM' },
      { value: 'caesars', label: 'Caesars Sportsbook' },
      { value: 'bet365', label: 'Bet365' },
      { value: 'pointsbet', label: 'PointsBet' },
      { value: 'betrivers', label: 'BetRivers' },
      { value: 'unibet', label: 'Unibet' },
      { value: 'fox_bet', label: 'FOX Bet' },
      { value: 'other', label: 'Other' }
    ];
  }

  getSportOptions(): Array<{ value: string; label: string }> {
    return [
      { value: 'nfl', label: 'NFL' },
      { value: 'nba', label: 'NBA' },
      { value: 'mlb', label: 'MLB' },
      { value: 'nhl', label: 'NHL' },
      { value: 'ncaaf', label: 'NCAA Football' },
      { value: 'ncaab', label: 'NCAA Basketball' },
      { value: 'soccer', label: 'Soccer' },
      { value: 'tennis', label: 'Tennis' },
      { value: 'golf', label: 'Golf' },
      { value: 'mma', label: 'MMA' },
      { value: 'boxing', label: 'Boxing' },
      { value: 'other', label: 'Other' }
    ];
  }

  getBetTypeOptions(): Array<{ value: string; label: string }> {
    return [
      { value: 'single', label: 'Single Bet' },
      { value: 'parlay', label: 'Parlay' },
      { value: 'teaser', label: 'Teaser' },
      { value: 'round_robin', label: 'Round Robin' },
      { value: 'system', label: 'System Bet' }
    ];
  }

  getBetCategoryOptions(): Array<{ value: string; label: string }> {
    return [
      { value: 'moneyline', label: 'Moneyline' },
      { value: 'spread', label: 'Point Spread' },
      { value: 'total', label: 'Over/Under' },
      { value: 'prop', label: 'Prop Bet' },
      { value: 'futures', label: 'Futures' }
    ];
  }

  // Check for bet results and send notifications
  async checkBetResults(userId: string): Promise<void> {
    try {
      // Get all pending bets for the user
      const { data: pendingBets, error } = await supabase
        .from('user_bets')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .lt('game_date', new Date().toISOString()); // Games that should have finished

      if (error) throw error;

      for (const bet of pendingBets || []) {
        // Simulate checking bet results (in real implementation, this would check actual game results)
        const result = this.simulateBetResult(bet);
        
        if (result !== 'pending') {
          // Update bet status
          await supabase
            .from('user_bets')
            .update({ 
              status: result,
              result: result === 'won' ? 'win' : 'loss',
              updated_at: new Date().toISOString()
            })
            .eq('id', bet.id);

          // Send notification
          await notificationService.notifyBetResult(
            userId,
            bet.id,
            result,
            {
              playerName: bet.player_name,
              propType: bet.prop_type,
              line: bet.line,
              odds: bet.odds,
              stake: bet.stake
            }
          );
        }
      }
    } catch (error) {
      console.error('Failed to check bet results:', error);
    }
  }

  // Simulate bet result (replace with actual game result checking)
  private simulateBetResult(bet: any): 'won' | 'lost' | 'pending' {
    // This is a simulation - in real implementation, you would check actual game results
    const random = Math.random();
    
    // 60% chance of winning (simulating good picks)
    if (random < 0.6) {
      return 'won';
    } else if (random < 0.9) {
      return 'lost';
    } else {
      return 'pending'; // Game still in progress
    }
  }
}

export const betTrackingService = new BetTrackingService();
