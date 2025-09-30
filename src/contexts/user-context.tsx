// User Context Provider
// Provides user identity (display name, username, user ID) throughout the entire application

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { userIdentificationService, UserIdentity } from '@/services/user-identification-service';

interface UserContextType {
  // Core user data
  user: User | null;
  userIdentity: UserIdentity | null;
  
  // User identification methods
  getUserDisplayName: () => string;
  getUserUsername: () => string;
  getUserInitials: () => string;
  formatUserIdentity: (options?: {
    showUsername?: boolean;
    showEmail?: boolean;
    showRole?: boolean;
    showSubscription?: boolean;
  }) => string;
  
  // User state
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // User actions
  refreshUserIdentity: () => Promise<void>;
  updateUserIdentity: (updates: Partial<UserIdentity>) => Promise<boolean>;
  
  // Subscription and role info
  userSubscription: string;
  userRole: string;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userIdentity, setUserIdentity] = useState<UserIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userSubscription, setUserSubscription] = useState('free');
  const [userRole, setUserRole] = useState('user');

  // Load user identity when user changes
  useEffect(() => {
    const loadUserIdentity = async () => {
      if (!user) {
        setUserIdentity(null);
        setUserSubscription('free');
        setUserRole('user');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const identity = await userIdentificationService.getUserIdentity(user.id);
        setUserIdentity(identity);

        // Set subscription and role
        if (identity) {
          setUserSubscription(identity.subscription_tier || 'free');
          setUserRole(identity.role || 'user');
        } else {
          // If no identity found, create a basic one
          const basicIdentity = {
            user_id: user.id,
            username: user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`,
            display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || `User ${user.id.slice(0, 8)}`,
            email: user.email,
            subscription_tier: 'free',
            role: 'user',
            created_at: user.created_at,
            updated_at: user.updated_at
          };
          setUserIdentity(basicIdentity);
          setUserSubscription('free');
          setUserRole('user');
        }
      } catch (error) {
        console.error('Error loading user identity:', error);
        // Create a fallback identity to prevent loading loop
        const fallbackIdentity = {
          user_id: user.id,
          username: user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`,
          display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || `User ${user.id.slice(0, 8)}`,
          email: user.email,
          subscription_tier: 'free',
          role: 'user',
          created_at: user.created_at,
          updated_at: user.updated_at
        };
        setUserIdentity(fallbackIdentity);
        setUserSubscription('free');
        setUserRole('user');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserIdentity();
  }, [user]);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setUserIdentity(null);
          setUserSubscription('free');
          setUserRole('user');
        }
      }
    );

    // Check for existing session with timeout
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise((resolve) => 
      setTimeout(() => resolve({ data: { session: null } }), 5000)
    );

    Promise.race([sessionPromise, timeoutPromise]).then(({ data: { session } }: any) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // User identification methods
  const getUserDisplayName = (): string => {
    return userIdentificationService.getUserDisplayName(userIdentity);
  };

  const getUserUsername = (): string => {
    return userIdentificationService.getUserUsername(userIdentity);
  };

  const getUserInitials = (): string => {
    return userIdentificationService.getUserInitials(userIdentity);
  };

  const formatUserIdentity = (options?: {
    showUsername?: boolean;
    showEmail?: boolean;
    showRole?: boolean;
    showSubscription?: boolean;
  }): string => {
    return userIdentificationService.formatUserIdentity(userIdentity, options);
  };

  // User actions
  const refreshUserIdentity = async (): Promise<void> => {
    if (!user) return;

    try {
      const identity = await userIdentificationService.getUserIdentity(user.id);
      setUserIdentity(identity);
      
      if (identity) {
        setUserSubscription(identity.subscription_tier || 'free');
        setUserRole(identity.role || 'user');
      }
    } catch (error) {
      console.error('Error refreshing user identity:', error);
    }
  };

  const updateUserIdentity = async (updates: Partial<UserIdentity>): Promise<boolean> => {
    if (!user) return false;

    try {
      const updatedIdentity = await userIdentificationService.updateUserIdentity(user.id, updates);
      if (updatedIdentity) {
        setUserIdentity(updatedIdentity);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating user identity:', error);
      return false;
    }
  };

  const value: UserContextType = {
    user,
    userIdentity,
    getUserDisplayName,
    getUserUsername,
    getUserInitials,
    formatUserIdentity,
    isLoading,
    isAuthenticated: !!user,
    refreshUserIdentity,
    updateUserIdentity,
    userSubscription,
    userRole,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

// Hook to use user context
export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

// Hook for user identity only
export const useUserIdentity = (): UserIdentity | null => {
  const { userIdentity } = useUser();
  return userIdentity;
};

// Hook for user display name
export const useUserDisplayName = (): string => {
  const { getUserDisplayName } = useUser();
  return getUserDisplayName();
};

// Hook for user username
export const useUserUsername = (): string => {
  const { getUserUsername } = useUser();
  return getUserUsername();
};

// Hook for user initials
export const useUserInitials = (): string => {
  const { getUserInitials } = useUser();
  return getUserInitials();
};
