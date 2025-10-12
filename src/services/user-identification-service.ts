// User Identification Service
// Centralizes user identification across the entire website using display name, username, and user ID

import { supabase } from '@/integrations/supabase/client';
import DOMPurify from 'isomorphic-dompurify';

// Security constants - must match user-context.tsx
const OWNER_EMAILS = [
  'plug@statpedia.com',
  'plug@plugbts.com', 
  'plugbts@gmail.com',
  'lifesplugg@gmail.com'
];

export interface UserIdentity {
  user_id: string;
  username: string;
  display_name: string;
  email?: string;
  avatar_url?: string;
  subscription_tier?: string;
  role?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserProfileExtended extends UserIdentity {
  bio?: string;
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
}

class UserIdentificationService {
  private cache: Map<string, UserIdentity> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get user identity by user ID
   */
  async getUserIdentity(userId: string): Promise<UserIdentity | null> {
    // Sanitize input
    const sanitizedUserId = DOMPurify.sanitize(userId);
    if (!sanitizedUserId || sanitizedUserId !== userId) {
      throw new Error('Invalid user ID provided');
    }
    
    // Check cache first
    const cached = this.getCachedUser(sanitizedUserId);
    if (cached) return cached;

    try {
      // Try to get from user_profiles table first (social features)
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('user_id, username, display_name, avatar_url, created_at, updated_at')
        .eq('user_id', userId)
        .single();

      if (profile && !profileError) {
        const identity: UserIdentity = {
          user_id: profile.user_id,
          username: profile.username,
          display_name: profile.display_name || profile.username,
          avatar_url: profile.avatar_url,
          created_at: profile.created_at,
          updated_at: profile.updated_at
        };

        // Get additional info from profiles table
        const { data: authProfile } = await supabase
          .from('profiles')
          .select('email, subscription_tier')
          .eq('user_id', userId)
          .single();

        if (authProfile) {
          identity.email = authProfile.email;
          identity.subscription_tier = authProfile.subscription_tier;
        }

        // Get role information
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .single();

        if (roleData) {
          identity.role = roleData.role;
        }

        this.cacheUser(identity);
        return identity;
      }

      // Fallback to profiles table if user_profiles doesn't exist
      const { data: fallbackProfile, error: fallbackError } = await supabase
        .from('profiles')
        .select('user_id, display_name, email, subscription_tier, created_at, updated_at')
        .eq('user_id', userId)
        .single();

      if (fallbackProfile && !fallbackError) {
        // Determine role based on email using secure constants
        let role = 'user';
        if (fallbackProfile.email && OWNER_EMAILS.includes(fallbackProfile.email.toLowerCase())) {
          role = 'owner';
        } else if (fallbackProfile.email?.includes('admin')) {
          role = 'admin';
        } else if (fallbackProfile.email?.includes('mod')) {
          role = 'mod';
        }

        const identity: UserIdentity = {
          user_id: fallbackProfile.user_id,
          username: fallbackProfile.display_name || `user_${userId.slice(0, 8)}`,
          display_name: fallbackProfile.display_name || `User ${userId.slice(0, 8)}`,
          email: fallbackProfile.email,
          subscription_tier: fallbackProfile.subscription_tier,
          role: role,
          created_at: fallbackProfile.created_at,
          updated_at: fallbackProfile.updated_at
        };

        this.cacheUser(identity);
        return identity;
      }

      // Final fallback - create basic identity from auth user
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.id === userId) {
        // Determine role based on email using secure constants
        let role = 'user';
        if (user.email && OWNER_EMAILS.includes(user.email.toLowerCase())) {
          role = 'owner';
        } else if (user.email?.includes('admin')) {
          role = 'admin';
        } else if (user.email?.includes('mod')) {
          role = 'mod';
        }

        const identity: UserIdentity = {
          user_id: user.id,
          username: user.email?.split('@')[0] || `user_${userId.slice(0, 8)}`,
          display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || `User ${userId.slice(0, 8)}`,
          email: user.email,
          role: role,
          created_at: user.created_at,
          updated_at: user.updated_at
        };

        this.cacheUser(identity);
        return identity;
      }

      return null;
    } catch (error) {
      console.error('Error fetching user identity:', error);
      return null;
    }
  }

  /**
   * Get user identity by username
   */
  async getUserIdentityByUsername(username: string): Promise<UserIdentity | null> {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('user_id, username, display_name, avatar_url, created_at, updated_at')
        .eq('username', username)
        .single();

      if (profile && !error) {
        const identity: UserIdentity = {
          user_id: profile.user_id,
          username: profile.username,
          display_name: profile.display_name || profile.username,
          avatar_url: profile.avatar_url,
          created_at: profile.created_at,
          updated_at: profile.updated_at
        };

        // TODO: Replace with Hasura/Cloudflare Workers equivalent
        // Disable Supabase calls to avoid 400 errors
        console.warn('Supabase profile calls disabled - using default values');
        
        // Use default values for now
        identity.email = 'user@statpedia.com';
        identity.subscription_tier = 'free';

        // Use default role
        identity.role = 'user';

        this.cacheUser(identity);
        return identity;
      }

      return null;
    } catch (error) {
      console.error('Error fetching user identity by username:', error);
      return null;
    }
  }

  /**
   * Get current user identity
   */
  async getCurrentUserIdentity(): Promise<UserIdentity | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      return await this.getUserIdentity(user.id);
    } catch (error) {
      console.error('Error fetching current user identity:', error);
      return null;
    }
  }

  /**
   * Get multiple user identities by user IDs
   */
  async getUserIdentities(userIds: string[]): Promise<UserIdentity[]> {
    const identities: UserIdentity[] = [];
    
    for (const userId of userIds) {
      const identity = await this.getUserIdentity(userId);
      if (identity) identities.push(identity);
    }

    return identities;
  }

  /**
   * Search users by display name or username
   */
  async searchUsers(query: string): Promise<UserIdentity[]> {
    try {
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('user_id, username, display_name, avatar_url, created_at, updated_at')
        .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(20);

      if (error) throw error;

      const identities: UserIdentity[] = [];
      for (const profile of profiles || []) {
        const identity: UserIdentity = {
          user_id: profile.user_id,
          username: profile.username,
          display_name: profile.display_name || profile.username,
          avatar_url: profile.avatar_url,
          created_at: profile.created_at,
          updated_at: profile.updated_at
        };

        // Get additional info
        const { data: authProfile } = await supabase
          .from('profiles')
          .select('email, subscription_tier')
          .eq('user_id', profile.user_id)
          .single();

        if (authProfile) {
          identity.email = authProfile.email;
          identity.subscription_tier = authProfile.subscription_tier;
        }

        identities.push(identity);
      }

      return identities;
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  /**
   * Update user identity
   */
  async updateUserIdentity(userId: string, updates: Partial<UserIdentity>): Promise<UserIdentity | null> {
    try {
      // Update user_profiles table
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .update({
          username: updates.username,
          display_name: updates.display_name,
          avatar_url: updates.avatar_url,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (profileError) throw profileError;

      // Update profiles table
      const { error: authError } = await supabase
        .from('profiles')
        .update({
          display_name: updates.display_name,
          email: updates.email,
          subscription_tier: updates.subscription_tier,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (authError) throw authError;

      // Clear cache
      this.cache.delete(userId);

      // Return updated identity
      return await this.getUserIdentity(userId);
    } catch (error) {
      console.error('Error updating user identity:', error);
      return null;
    }
  }

  /**
   * Get user display name with fallback
   */
  getUserDisplayName(identity: UserIdentity | null): string {
    if (!identity) return 'Unknown User';
    return identity.display_name || identity.username || `User ${identity.user_id.slice(0, 8)}`;
  }

  /**
   * Get user username with fallback
   */
  getUserUsername(identity: UserIdentity | null): string {
    if (!identity) return 'unknown';
    return identity.username || `user_${identity.user_id.slice(0, 8)}`;
  }

  /**
   * Get user initials for avatar
   */
  getUserInitials(identity: UserIdentity | null): string {
    if (!identity) return 'U';
    
    const displayName = this.getUserDisplayName(identity);
    return displayName
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  /**
   * Format user identity for display
   */
  formatUserIdentity(identity: UserIdentity | null, options: {
    showUsername?: boolean;
    showEmail?: boolean;
    showRole?: boolean;
    showSubscription?: boolean;
  } = {}): string {
    if (!identity) return 'Unknown User';

    const parts = [this.getUserDisplayName(identity)];

    if (options.showUsername && identity.username) {
      parts.push(`@${identity.username}`);
    }

    if (options.showEmail && identity.email) {
      parts.push(`(${identity.email})`);
    }

    if (options.showRole && identity.role) {
      parts.push(`[${identity.role}]`);
    }

    if (options.showSubscription && identity.subscription_tier) {
      parts.push(`(${identity.subscription_tier})`);
    }

    return parts.join(' ');
  }

  /**
   * Cache management
   */
  private getCachedUser(userId: string): UserIdentity | null {
    const cached = this.cache.get(userId);
    const expiry = this.cacheExpiry.get(userId);
    
    if (cached && expiry && Date.now() < expiry) {
      return cached;
    }

    // Remove expired cache
    if (cached) {
      this.cache.delete(userId);
      this.cacheExpiry.delete(userId);
    }

    return null;
  }

  private cacheUser(identity: UserIdentity): void {
    this.cache.set(identity.user_id, identity);
    this.cacheExpiry.set(identity.user_id, Date.now() + this.CACHE_DURATION);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

export const userIdentificationService = new UserIdentificationService();
