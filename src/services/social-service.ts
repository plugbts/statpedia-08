import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
  banner_position?: 'top' | 'center' | 'bottom';
  banner_blur?: number;
  banner_brightness?: number;
  banner_contrast?: number;
  banner_saturation?: number;
  karma: number;
  roi_percentage: number;
  total_posts: number;
  total_comments: number;
  is_muted: boolean;
  muted_until?: string;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  upvotes: number;
  downvotes: number;
  net_score: number;
  is_deleted: boolean;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  user_profile?: UserProfile;
  user_vote?: 'upvote' | 'downvote';
}

export interface Comment {
  id: string;
  user_id: string;
  parent_type: 'player_prop' | 'prediction' | 'post';
  parent_id: string;
  content: string;
  upvotes: number;
  downvotes: number;
  net_score: number;
  is_deleted: boolean;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  user_profile?: UserProfile;
  user_vote?: 'upvote' | 'downvote';
}

export interface Vote {
  id: string;
  user_id: string;
  target_type: 'post' | 'comment';
  target_id: string;
  vote_type: 'upvote' | 'downvote';
  created_at: string;
}

export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  updated_at: string;
  friend_profile?: UserProfile;
}

export interface TypingIndicator {
  id: string;
  user_id: string;
  target_type: 'post' | 'comment';
  target_id: string;
  is_typing: boolean;
  last_activity: string;
  created_at: string;
  user_profile?: UserProfile;
}

export interface KarmaHistory {
  id: string;
  user_id: string;
  change_amount: number;
  reason: string;
  source_type?: string;
  source_id?: string;
  admin_id?: string;
  created_at: string;
}

class SocialService {
  // User Profile Management
  async createUserProfile(userId: string, username: string, displayName?: string): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        username: username,
        display_name: displayName || username,
        bio: '',
        karma: 0,
        roi_percentage: 0,
        total_posts: 0,
        total_comments: 0,
        is_muted: false
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateUsername(userId: string, newUsername: string): Promise<UserProfile> {
    // Check if username is already taken
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('username', newUsername)
      .neq('user_id', userId)
      .single();

    if (existingUser) {
      throw new Error('Username is already taken');
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(newUsername)) {
      throw new Error('Username must be 3-20 characters long and contain only letters, numbers, and underscores');
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .update({ username: newUsername })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateDisplayName(userId: string, newDisplayName: string): Promise<UserProfile> {
    if (newDisplayName.length > 50) {
      throw new Error('Display name must be 50 characters or less');
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .update({ display_name: newDisplayName })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateBio(userId: string, newBio: string): Promise<UserProfile> {
    if (newBio.length > 200) {
      throw new Error('Bio must be 200 characters or less');
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .update({ bio: newBio })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async getUserProfileByUsername(username: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async searchUsers(query: string, limit: number = 20): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  // Posts Management
  async createPost(userId: string, content: string): Promise<Post> {
    if (content.length > 150) {
      throw new Error('Post content must be 150 characters or less');
    }

    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: userId,
        content: content,
        upvotes: 0,
        downvotes: 0,
        net_score: 0,
        is_deleted: false
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getPosts(limit: number = 20, offset: number = 0): Promise<Post[]> {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          user_profile:user_profiles(*)
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        // If table doesn't exist, return empty array instead of throwing
        if (error.message.includes('relation "public.posts" does not exist') || 
            error.message.includes('could not find table')) {
          console.log('Posts table not found, returning empty array');
          return [];
        }
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('Failed to get posts:', error);
      return [];
    }
  }

  async getUserPosts(userId: string, limit: number = 20, offset: number = 0): Promise<Post[]> {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        user_profile:user_profiles(*)
      `)
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  }

  async deletePost(postId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('posts')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', postId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  // Comments Management
  async createComment(
    userId: string, 
    parentType: 'player_prop' | 'prediction' | 'post', 
    parentId: string, 
    content: string
  ): Promise<Comment> {
    if (content.length > 500) {
      throw new Error('Comment content must be 500 characters or less');
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({
        user_id: userId,
        parent_type: parentType,
        parent_id: parentId,
        content: content,
        upvotes: 0,
        downvotes: 0,
        net_score: 0,
        is_deleted: false
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getComments(
    parentType: 'player_prop' | 'prediction' | 'post', 
    parentId: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<Comment[]> {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        user_profile:user_profiles(*)
      `)
      .eq('parent_type', parentType)
      .eq('parent_id', parentId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  }

  async deleteComment(commentId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('comments')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  // Voting System
  async vote(targetType: 'post' | 'comment', targetId: string, voteType: 'upvote' | 'downvote'): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if user already voted
    const { data: existingVote } = await supabase
      .from('votes')
      .select('*')
      .eq('user_id', user.id)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .single();

    if (existingVote) {
      if (existingVote.vote_type === voteType) {
        // Same vote, remove it
        await supabase
          .from('votes')
          .delete()
          .eq('id', existingVote.id);
      } else {
        // Different vote, update it
        await supabase
          .from('votes')
          .update({ vote_type: voteType })
          .eq('id', existingVote.id);
      }
    } else {
      // New vote
      await supabase
        .from('votes')
        .insert({
          user_id: user.id,
          target_type: targetType,
          target_id: targetId,
          vote_type: voteType
        });
    }
  }

  async getUserVotes(targetType: 'post' | 'comment', targetIds: string[]): Promise<Vote[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('user_id', user.id)
      .eq('target_type', targetType)
      .in('target_id', targetIds);

    if (error) throw error;
    return data || [];
  }

  // Friends System
  async sendFriendRequest(friendId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('friends')
      .insert({
        user_id: user.id,
        friend_id: friendId,
        status: 'pending'
      });

    if (error) throw error;
  }

  async acceptFriendRequest(friendId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('friends')
      .update({ status: 'accepted' })
      .eq('user_id', friendId)
      .eq('friend_id', user.id)
      .eq('status', 'pending');

    if (error) throw error;
  }

  async declineFriendRequest(friendId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('friends')
      .update({ status: 'declined' })
      .eq('user_id', friendId)
      .eq('friend_id', user.id)
      .eq('status', 'pending');

    if (error) throw error;
  }

  async getFriends(userId: string): Promise<Friend[]> {
    const { data, error } = await supabase
      .from('friends')
      .select(`
        *,
        friend_profile:user_profiles!friends_friend_id_fkey(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'accepted');

    if (error) throw error;
    return data || [];
  }

  async getFriendRequests(userId: string): Promise<Friend[]> {
    const { data, error } = await supabase
      .from('friends')
      .select(`
        *,
        friend_profile:user_profiles!friends_friend_id_fkey(*)
      `)
      .eq('friend_id', userId)
      .eq('status', 'pending');

    if (error) throw error;
    return data || [];
  }

  // Typing Indicators
  async setTypingIndicator(targetType: 'post' | 'comment', targetId: string, isTyping: boolean): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (isTyping) {
      await supabase
        .from('typing_indicators')
        .upsert({
          user_id: user.id,
          target_type: targetType,
          target_id: targetId,
          is_typing: true,
          last_activity: new Date().toISOString()
        }, {
          onConflict: 'user_id,target_type,target_id'
        });
    } else {
      await supabase
        .from('typing_indicators')
        .delete()
        .eq('user_id', user.id)
        .eq('target_type', targetType)
        .eq('target_id', targetId);
    }
  }

  async getTypingIndicators(targetType: 'post' | 'comment', targetId: string): Promise<TypingIndicator[]> {
    const { data, error } = await supabase
      .from('typing_indicators')
      .select(`
        *,
        user_profile:user_profiles(*)
      `)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .eq('is_typing', true)
      .gt('last_activity', new Date(Date.now() - 30000).toISOString()); // Last 30 seconds

    if (error) throw error;
    return data || [];
  }

  // Karma Management
  async getUserKarmaHistory(userId: string, limit: number = 50): Promise<KarmaHistory[]> {
    const { data, error } = await supabase
      .from('karma_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async updateUserKarma(userId: string, changeAmount: number, reason: string, adminId?: string): Promise<void> {
    const { error } = await supabase
      .from('karma_history')
      .insert({
        user_id: userId,
        change_amount: changeAmount,
        reason: reason,
        admin_id: adminId
      });

    if (error) throw error;

    // Update user profile karma
    await supabase
      .from('user_profiles')
      .update({ karma: supabase.sql`karma + ${changeAmount}` })
      .eq('user_id', userId);
  }

  // Admin Functions
  async muteUser(userId: string, mutedUntil?: string): Promise<void> {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        is_muted: true,
        muted_until: mutedUntil
      })
      .eq('user_id', userId);

    if (error) throw error;
  }

  async unmuteUser(userId: string): Promise<void> {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        is_muted: false,
        muted_until: null
      })
      .eq('user_id', userId);

    if (error) throw error;
  }

  async deleteCommentAsAdmin(commentId: string): Promise<void> {
    const { error } = await supabase
      .from('comments')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', commentId);

    if (error) throw error;
  }

  async getAllUsers(limit: number = 50, offset: number = 0): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  }

  // Utility Functions
  async updateUserROI(userId: string): Promise<void> {
    const { error } = await supabase.rpc('update_user_roi', {
      p_user_id: userId
    });

    if (error) throw error;
  }

  async cleanupTypingIndicators(): Promise<void> {
    const { error } = await supabase.rpc('cleanup_typing_indicators');
    if (error) throw error;
  }
}

export const socialService = new SocialService();
