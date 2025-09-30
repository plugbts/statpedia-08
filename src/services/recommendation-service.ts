import { supabase } from '@/integrations/supabase/client';
import { socialService, type Post, type UserProfile } from '@/services/social-service';

export interface InteractionData {
  id: string;
  user_id: string;
  interaction_type: 'view' | 'vote' | 'comment' | 'share' | 'click';
  target_type: 'post' | 'comment' | 'user_profile';
  target_id: string;
  metadata?: any;
  created_at: string;
}

export interface UserPreference {
  id: string;
  user_id: string;
  preference_type: 'sport' | 'content_type' | 'user_affinity' | 'content_engagement';
  preference_value: string;
  weight: number;
  created_at: string;
  updated_at: string;
}

export interface PersonalizedPost extends Post {
  score: number;
  reason: string;
  user_profile?: UserProfile;
}

class RecommendationService {
  // Track user interactions
  async trackInteraction(
    interactionType: 'view' | 'vote' | 'comment' | 'share' | 'click',
    targetType: 'post' | 'comment' | 'user_profile',
    targetId: string,
    metadata?: any
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.rpc('track_user_interaction', {
        p_user_id: user.id,
        p_interaction_type: interactionType,
        p_target_type: targetType,
        p_target_id: targetId,
        p_metadata: metadata || null
      });
    } catch (error) {
      console.error('Failed to track interaction:', error);
    }
  }

  // Get personalized feed
  async getPersonalizedFeed(limit: number = 20, offset: number = 0): Promise<PersonalizedPost[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase.rpc('get_personalized_feed', {
        p_user_id: user.id,
        p_limit: limit,
        p_offset: offset
      });

      if (error) throw error;

      // Get user votes for the posts
      const postIds = data.map((post: any) => post.post_id);
      const userVotes = await socialService.getUserVotes('post', postIds);

      // Add user vote info to posts
      return data.map((post: any) => {
        const userVote = userVotes.find(v => v.target_id === post.post_id);
        return {
          id: post.post_id,
          user_id: post.user_id,
          content: post.content,
          upvotes: post.upvotes,
          downvotes: post.downvotes,
          net_score: post.net_score,
          is_deleted: false,
          created_at: post.created_at,
          updated_at: post.created_at,
          score: post.score,
          reason: post.reason,
          user_vote: userVote?.vote_type,
          user_profile: {
            id: '',
            user_id: post.user_id,
            username: post.username,
            display_name: post.display_name,
            bio: '',
            avatar_url: '',
            karma: post.karma,
            roi_percentage: post.roi_percentage,
            total_posts: 0,
            total_comments: 0,
            is_muted: false,
            created_at: '',
            updated_at: ''
          }
        };
      });
    } catch (error: any) {
      console.error('Failed to get personalized feed:', error);
      if (error?.code !== 'PGRST116' && !error?.message?.includes('function does not exist')) {
        throw error;
      }
      // Fallback to regular posts if recommendation system not available
      return await socialService.getPosts(limit, offset);
    }
  }

  // Get trending posts (fallback when personalized feed is not available)
  async getTrendingPosts(limit: number = 20, offset: number = 0): Promise<Post[]> {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          user_profile:user_profiles(*)
        `)
        .eq('is_deleted', false)
        .order('net_score', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Failed to get trending posts:', error);
      return [];
    }
  }

  // Get user preferences
  async getUserPreferences(): Promise<UserPreference[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .order('weight', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Failed to get user preferences:', error);
      return [];
    }
  }

  // Update user preferences manually
  async updateUserPreference(
    preferenceType: 'sport' | 'content_type' | 'user_affinity' | 'content_engagement',
    preferenceValue: string,
    weight: number = 1.0
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          preference_type: preferenceType,
          preference_value: preferenceValue,
          weight: Math.min(1.0, Math.max(0.0, weight))
        }, {
          onConflict: 'user_id,preference_type,preference_value'
        });
    } catch (error: any) {
      console.error('Failed to update user preference:', error);
    }
  }

  // Get recommended users to follow
  async getRecommendedUsers(limit: number = 10): Promise<UserProfile[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get users with high karma and good ROI that the user doesn't follow
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .neq('user_id', user.id)
        .gt('karma', 10)
        .gt('roi_percentage', 0)
        .not('user_id', 'in', `(
          SELECT friend_id FROM friends 
          WHERE user_id = '${user.id}' AND status = 'accepted'
        )`)
        .order('karma', { ascending: false })
        .order('roi_percentage', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Failed to get recommended users:', error);
      return [];
    }
  }

  // Get similar users based on preferences
  async getSimilarUsers(limit: number = 10): Promise<UserProfile[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get users with similar preferences
      const { data, error } = await supabase
        .from('user_preferences')
        .select(`
          user_id,
          user_profiles(*)
        `)
        .in('preference_value', 
          supabase
            .from('user_preferences')
            .select('preference_value')
            .eq('user_id', user.id)
            .neq('preference_type', 'user_affinity')
        )
        .neq('user_id', user.id)
        .order('weight', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data?.map((item: any) => item.user_profiles).filter(Boolean) || [];
    } catch (error: any) {
      console.error('Failed to get similar users:', error);
      return [];
    }
  }

  // Get content recommendations based on user's betting activity
  async getBettingContentRecommendations(limit: number = 10): Promise<Post[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get user's betting preferences from bet tracking
      const { data: bettingData } = await supabase
        .from('user_bets')
        .select('sport, bet_type')
        .eq('user_id', user.id)
        .not('sport', 'is', null)
        .limit(100);

      if (!bettingData || bettingData.length === 0) {
        return await this.getTrendingPosts(limit);
      }

      // Find posts that mention similar sports or betting terms
      const sports = [...new Set(bettingData.map(bet => bet.sport))];
      const searchTerms = sports.join('|');

      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          user_profile:user_profiles(*)
        `)
        .eq('is_deleted', false)
        .or(`content.ilike.*${sports.join('*},content.ilike.*${sports.join('*')}`)
        .order('net_score', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Failed to get betting content recommendations:', error);
      return await this.getTrendingPosts(limit);
    }
  }

  // Clean up old data
  async cleanupOldData(): Promise<void> {
    try {
      await supabase.rpc('cleanup_social_data');
    } catch (error) {
      console.error('Failed to cleanup old data:', error);
    }
  }

  // Force refresh recommendations for a user
  async refreshRecommendations(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.rpc('calculate_feed_recommendations', {
        p_user_id: user.id,
        p_limit: 50
      });
    } catch (error) {
      console.error('Failed to refresh recommendations:', error);
    }
  }

  // Get algorithm insights for debugging
  async getAlgorithmInsights(): Promise<{
    totalInteractions: number;
    totalPreferences: number;
    cacheSize: number;
    lastUpdate: string | null;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return {
        totalInteractions: 0,
        totalPreferences: 0,
        cacheSize: 0,
        lastUpdate: null
      };

      const [interactionsResult, preferencesResult, cacheResult] = await Promise.all([
        supabase
          .from('user_interactions')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id),
        supabase
          .from('user_preferences')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id),
        supabase
          .from('feed_algorithm_cache')
          .select('updated_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single()
      ]);

      return {
        totalInteractions: interactionsResult.count || 0,
        totalPreferences: preferencesResult.count || 0,
        cacheSize: cacheResult.data ? 1 : 0,
        lastUpdate: cacheResult.data?.updated_at || null
      };
    } catch (error) {
      console.error('Failed to get algorithm insights:', error);
      return {
        totalInteractions: 0,
        totalPreferences: 0,
        cacheSize: 0,
        lastUpdate: null
      };
    }
  }
}

export const recommendationService = new RecommendationService();
