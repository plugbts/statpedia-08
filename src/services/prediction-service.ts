import { supabase } from '@/integrations/supabase/client';
import { sportsDataIOAPI } from './sportsdataio-api';

export interface PlayerPropPrediction {
  id: string;
  prop_id: string;
  prop_title: string;
  prop_value: number;
  prop_type: string;
  player_name: string;
  team: string;
  opponent: string;
  game_date: string;
  game_status: 'scheduled' | 'live' | 'final';
  actual_result?: number;
  over_votes: number;
  under_votes: number;
  total_votes: number;
  created_at: string;
  updated_at: string;
}

export interface UserPrediction {
  id: string;
  user_id: string;
  prediction_id: string;
  prediction_type: 'over' | 'under';
  confidence_level: number;
  created_at: string;
}

export interface PredictionResult {
  id: string;
  prediction_id: string;
  user_id: string;
  prediction_type: 'over' | 'under';
  actual_result: number;
  prop_value: number;
  is_correct: boolean;
  karma_change: number;
  created_at: string;
}

export interface UserPredictionStats {
  id: string;
  user_id: string;
  total_predictions: number;
  correct_predictions: number;
  win_percentage: number;
  roi_percentage: number;
  last_updated: string;
}

export interface UserPrivacySettings {
  id: string;
  user_id: string;
  hide_roi: boolean;
  hide_prediction_stats: boolean;
  created_at: string;
  updated_at: string;
}

export interface PredictionPollData {
  prediction: PlayerPropPrediction;
  userPrediction?: UserPrediction;
  overPercentage: number;
  underPercentage: number;
}

class PredictionService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 2 * 60 * 1000; // 2 minutes for more frequent updates

  // Format numbers to be concise
  private formatNumber(value: number, type: 'odds' | 'payout' | 'value' | 'percentage'): string {
    if (type === 'odds') {
      if (value > 0) return `+${Math.round(value)}`;
      return Math.round(value).toString();
    }
    
    if (type === 'payout') {
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
      return Math.round(value).toString();
    }
    
    if (type === 'value') {
      return value.toFixed(2);
    }
    
    if (type === 'percentage') {
      return `${Math.round(value)}%`;
    }
    
    return value.toString();
  }

  // Format odds for display
  formatOdds(odds: number): string {
    return this.formatNumber(odds, 'odds');
  }

  // Format payout for display
  formatPayout(payout: number): string {
    return this.formatNumber(payout, 'payout');
  }

  // Format value for display
  formatValue(value: number): string {
    return this.formatNumber(value, 'value');
  }

  // Format percentage for display
  formatPercentage(percentage: number): string {
    return this.formatNumber(percentage * 100, 'percentage');
  }

  // Create a new player prop prediction
  async createPrediction(predictionData: Omit<PlayerPropPrediction, 'id' | 'over_votes' | 'under_votes' | 'total_votes' | 'created_at' | 'updated_at'>): Promise<PlayerPropPrediction> {
    try {
      const { data, error } = await supabase
        .from('player_prop_predictions')
        .insert([predictionData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to create prediction:', error);
      throw error;
    }
  }

  // Get prediction by ID
  async getPrediction(predictionId: string): Promise<PlayerPropPrediction | null> {
    try {
      const { data, error } = await supabase
        .from('player_prop_predictions')
        .select('*')
        .eq('id', predictionId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to get prediction:', error);
      return null;
    }
  }

  // Get prediction by prop ID
  async getPredictionByPropId(propId: string): Promise<PlayerPropPrediction | null> {
    try {
      const { data, error } = await supabase
        .from('player_prop_predictions')
        .select('*')
        .eq('prop_id', propId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to get prediction by prop ID:', error);
      return null;
    }
  }

  // Get predictions for a specific game
  async getGamePredictions(gameDate: string, team?: string): Promise<PlayerPropPrediction[]> {
    try {
      let query = supabase
        .from('player_prop_predictions')
        .select('*')
        .eq('game_date', gameDate)
        .order('created_at', { ascending: false });

      if (team) {
        query = query.or(`team.eq.${team},opponent.eq.${team}`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get game predictions:', error);
      return [];
    }
  }

  // Create user prediction (vote)
  async createUserPrediction(predictionId: string, predictionType: 'over' | 'under', confidenceLevel: number = 1): Promise<UserPrediction> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_predictions')
        .insert([{
          user_id: user.id,
          prediction_id: predictionId,
          prediction_type: predictionType,
          confidence_level: confidenceLevel
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to create user prediction:', error);
      throw error;
    }
  }

  // Update user prediction
  async updateUserPrediction(predictionId: string, predictionType: 'over' | 'under', confidenceLevel?: number): Promise<UserPrediction> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const updateData: any = { prediction_type: predictionType };
      if (confidenceLevel !== undefined) {
        updateData.confidence_level = confidenceLevel;
      }

      const { data, error } = await supabase
        .from('user_predictions')
        .update(updateData)
        .eq('user_id', user.id)
        .eq('prediction_id', predictionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to update user prediction:', error);
      throw error;
    }
  }

  // Delete user prediction
  async deleteUserPrediction(predictionId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('user_predictions')
        .delete()
        .eq('user_id', user.id)
        .eq('prediction_id', predictionId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to delete user prediction:', error);
      throw error;
    }
  }

  // Get user's prediction for a specific prop
  async getUserPrediction(predictionId: string): Promise<UserPrediction | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_predictions')
        .select('*')
        .eq('user_id', user.id)
        .eq('prediction_id', predictionId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to get user prediction:', error);
      return null;
    }
  }

  // Get prediction poll data (prediction + user's vote + percentages)
  async getPredictionPollData(propId: string): Promise<PredictionPollData | null> {
    try {
      // Get the prediction
      const prediction = await this.getPredictionByPropId(propId);
      if (!prediction) return null;

      // Get user's prediction if authenticated
      const userPrediction = await this.getUserPrediction(prediction.id);

      // Calculate percentages
      const totalVotes = prediction.total_votes;
      const overPercentage = totalVotes > 0 ? (prediction.over_votes / totalVotes) * 100 : 0;
      const underPercentage = totalVotes > 0 ? (prediction.under_votes / totalVotes) * 100 : 0;

      return {
        prediction,
        userPrediction,
        overPercentage,
        underPercentage
      };
    } catch (error) {
      console.error('Failed to get prediction poll data:', error);
      return null;
    }
  }

  // Get user's prediction statistics
  async getUserPredictionStats(userId?: string): Promise<UserPredictionStats | null> {
    try {
      const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
      if (!targetUserId) return null;

      const { data, error } = await supabase
        .from('user_prediction_stats')
        .select('*')
        .eq('user_id', targetUserId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to get user prediction stats:', error);
      return null;
    }
  }

  // Get user's prediction results
  async getUserPredictionResults(userId?: string, limit: number = 50): Promise<PredictionResult[]> {
    try {
      const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
      if (!targetUserId) return [];

      const { data, error } = await supabase
        .from('prediction_results')
        .select(`
          *,
          player_prop_predictions!inner(
            prop_title,
            player_name,
            team,
            opponent,
            game_date
          )
        `)
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get user prediction results:', error);
      return [];
    }
  }

  // Update game results (admin function)
  async updateGameResults(predictionId: string, actualResult: number): Promise<void> {
    try {
      const { data, error } = await supabase.rpc('process_game_results', {
        prediction_uuid: predictionId,
        actual_stat: actualResult
      });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to update game results:', error);
      throw error;
    }
  }

  // Get user privacy settings
  async getUserPrivacySettings(): Promise<UserPrivacySettings | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_privacy_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to get user privacy settings:', error);
      return null;
    }
  }

  // Update user privacy settings
  async updateUserPrivacySettings(settings: Partial<Pick<UserPrivacySettings, 'hide_roi' | 'hide_prediction_stats'>>): Promise<UserPrivacySettings> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_privacy_settings')
        .upsert([{
          user_id: user.id,
          ...settings,
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to update user privacy settings:', error);
      throw error;
    }
  }

  // Get recent predictions for feed
  async getRecentPredictions(limit: number = 20): Promise<PlayerPropPrediction[]> {
    try {
      const { data, error } = await supabase
        .from('player_prop_predictions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get recent predictions:', error);
      return [];
    }
  }

  // Get trending predictions (most voted)
  async getTrendingPredictions(limit: number = 20): Promise<PlayerPropPrediction[]> {
    try {
      const { data, error } = await supabase
        .from('player_prop_predictions')
        .select('*')
        .order('total_votes', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get trending predictions:', error);
      return [];
    }
  }

  // Get user's karma changes from predictions
  async getUserPredictionKarma(userId?: string, limit: number = 50): Promise<PredictionResult[]> {
    try {
      const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
      if (!targetUserId) return [];

      const { data, error } = await supabase
        .from('prediction_results')
        .select(`
          *,
          player_prop_predictions!inner(
            prop_title,
            player_name,
            team,
            opponent,
            game_date
          )
        `)
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get user prediction karma:', error);
      return [];
    }
  }

  // Get karma summary for predictions
  async getPredictionKarmaSummary(userId?: string): Promise<{
    total_karma_gained: number;
    total_karma_lost: number;
    net_karma_change: number;
    correct_predictions_karma: number;
    incorrect_predictions_karma: number;
  }> {
    try {
      const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
      if (!targetUserId) {
        return {
          total_karma_gained: 0,
          total_karma_lost: 0,
          net_karma_change: 0,
          correct_predictions_karma: 0,
          incorrect_predictions_karma: 0
        };
      }

      const { data, error } = await supabase
        .from('prediction_results')
        .select('karma_change, is_correct')
        .eq('user_id', targetUserId);

      if (error) throw error;

      const results = data || [];
      const totalKarmaGained = results
        .filter(r => r.karma_change > 0)
        .reduce((sum, r) => sum + r.karma_change, 0);
      
      const totalKarmaLost = Math.abs(results
        .filter(r => r.karma_change < 0)
        .reduce((sum, r) => sum + r.karma_change, 0));

      const correctPredictionsKarma = results
        .filter(r => r.is_correct)
        .reduce((sum, r) => sum + r.karma_change, 0);

      const incorrectPredictionsKarma = results
        .filter(r => !r.is_correct)
        .reduce((sum, r) => sum + r.karma_change, 0);

      return {
        total_karma_gained: totalKarmaGained,
        total_karma_lost: totalKarmaLost,
        net_karma_change: totalKarmaGained - totalKarmaLost,
        correct_predictions_karma: correctPredictionsKarma,
        incorrect_predictions_karma: incorrectPredictionsKarma
      };
    } catch (error) {
      console.error('Failed to get prediction karma summary:', error);
      return {
        total_karma_gained: 0,
        total_karma_lost: 0,
        net_karma_change: 0,
        correct_predictions_karma: 0,
        incorrect_predictions_karma: 0
      };
    }
  }
}

export const predictionService = new PredictionService();
