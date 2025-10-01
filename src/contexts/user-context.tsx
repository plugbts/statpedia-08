// User Context Provider
// Provides user identity (display name, username, user ID) throughout the entire application

import React, { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { userIdentificationService, UserIdentity } from '@/services/user-identification-service';
import DOMPurify from 'isomorphic-dompurify';

// Security constants
const OWNER_EMAILS = [
  'plug@statpedia.com',
  'plug@plugbts.com', 
  'plugbts@gmail.com',
  'lifesplugg@gmail.com'
];

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

// Security interfaces
interface SecurityState {
  loginAttempts: number;
  lastAttempt: number;
  isLocked: boolean;
  requestCount: number;
  lastRequest: number;
}

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
  hasCompletedUsernameSetup: boolean;
  
  // User actions
  refreshUserIdentity: () => Promise<void>;
  updateUserIdentity: (updates: Partial<UserIdentity>) => Promise<boolean>;
  markUsernameSetupComplete: () => void;
  
  // Security methods
  validateUserAccess: (requiredRole: string) => boolean;
  getMaskedEmail: (email?: string) => string;
  isOwnerEmail: (email: string) => boolean;
  logSecurityEvent: (event: string, details?: any) => void;
  
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
  const [hasCompletedUsernameSetup, setHasCompletedUsernameSetup] = useState(false);
  
  // Security state
  const securityStateRef = useRef<SecurityState>({
    loginAttempts: 0,
    lastAttempt: 0,
    isLocked: false,
    requestCount: 0,
    lastRequest: 0
  });
  
  // Security methods
  const validateUserAccess = useCallback((requiredRole: string): boolean => {
    const roleHierarchy = { user: 0, mod: 1, admin: 2, owner: 3 };
    const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;
    
    return userLevel >= requiredLevel;
  }, [userRole]);
  
  const getMaskedEmail = useCallback((email?: string): string => {
    if (!email) return '';
    
    // Don't mask owner emails for owners themselves
    if (isOwnerEmail(email) && validateUserAccess('owner')) {
      return email;
    }
    
    // Mask email for non-owners
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 2) return email;
    
    const maskedLocal = localPart[0] + '*'.repeat(localPart.length - 2) + localPart[localPart.length - 1];
    return `${maskedLocal}@${domain}`;
  }, [validateUserAccess]);
  
  const isOwnerEmail = useCallback((email: string): boolean => {
    return OWNER_EMAILS.includes(email.toLowerCase());
  }, []);
  
  const logSecurityEvent = useCallback((event: string, details?: any) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      event,
      userId: user?.id || 'anonymous',
      userRole,
      details: details ? DOMPurify.sanitize(JSON.stringify(details)) : undefined
    };
    
    // Log to console in development, would send to security service in production
    console.warn('Security Event:', logEntry);
    
    // In production, send to security monitoring service
    // securityService.logEvent(logEntry);
  }, [user?.id, userRole]);
  
  // Rate limiting
  const checkRateLimit = useCallback((): boolean => {
    const now = Date.now();
    const state = securityStateRef.current;
    
    // Reset counter if window has passed
    if (now - state.lastRequest > RATE_LIMIT_WINDOW) {
      state.requestCount = 0;
      state.lastRequest = now;
    }
    
    state.requestCount++;
    state.lastRequest = now;
    
    if (state.requestCount > MAX_REQUESTS_PER_WINDOW) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { requestCount: state.requestCount });
      return false;
    }
    
    return true;
  }, [logSecurityEvent]);
  
  // Input validation and sanitization
  const sanitizeInput = useCallback((input: any): any => {
    if (typeof input === 'string') {
      return DOMPurify.sanitize(input);
    }
    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[DOMPurify.sanitize(key)] = sanitizeInput(value);
      }
      return sanitized;
    }
    return input;
  }, []);

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

      // Check rate limiting
      if (!checkRateLimit()) {
        logSecurityEvent('RATE_LIMIT_BLOCKED', { userId: user.id });
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Sanitize user data
        const sanitizedUser = sanitizeInput(user);
        
        const identity = await userIdentificationService.getUserIdentity(sanitizedUser.id);
        
        // Sanitize identity data
        const sanitizedIdentity = identity ? sanitizeInput(identity) : null;
        setUserIdentity(sanitizedIdentity);

        // Set subscription and role
        if (identity) {
          setUserSubscription(identity.subscription_tier || 'free');
          setUserRole(identity.role || 'user');
        } else {
          // If no identity found, create a basic one
          // Determine role based on email using secure constants
          let role = 'user';
          if (user.email && isOwnerEmail(user.email)) {
            role = 'owner';
            logSecurityEvent('OWNER_ACCESS_GRANTED', { email: getMaskedEmail(user.email) });
          } else if (user.email?.includes('admin')) {
            role = 'admin';
          } else if (user.email?.includes('mod')) {
            role = 'mod';
          }

          const basicIdentity = {
            user_id: user.id,
            username: user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`,
            display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || `User ${user.id.slice(0, 8)}`,
            email: user.email,
            subscription_tier: 'free',
            role: role,
            created_at: user.created_at,
            updated_at: user.updated_at
          };
          setUserIdentity(basicIdentity);
          setUserSubscription('free');
          setUserRole(role);
        }
      } catch (error) {
        console.error('Error loading user identity:', error);
        logSecurityEvent('USER_IDENTITY_LOAD_ERROR', { error: error instanceof Error ? error.message : 'Unknown error' });
        
        // Create a fallback identity to prevent loading loop
        // Determine role based on email using secure constants
        let role = 'user';
        if (user.email && isOwnerEmail(user.email)) {
          role = 'owner';
          logSecurityEvent('OWNER_FALLBACK_ACCESS', { email: getMaskedEmail(user.email) });
        } else if (user.email?.includes('admin')) {
          role = 'admin';
        } else if (user.email?.includes('mod')) {
          role = 'mod';
        }

        const fallbackIdentity = {
          user_id: user.id,
          username: user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`,
          display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || `User ${user.id.slice(0, 8)}`,
          email: user.email,
          subscription_tier: 'free',
          role: role,
          created_at: user.created_at,
          updated_at: user.updated_at
        };
        setUserIdentity(fallbackIdentity);
        setUserSubscription('free');
        setUserRole(role);
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

  // Check username setup completion status
  const checkUsernameSetupCompletion = useCallback((userId: string): boolean => {
    try {
      const completionKey = `username_setup_complete_${userId}`;
      const isComplete = localStorage.getItem(completionKey) === 'true';
      return isComplete;
    } catch (error) {
      console.error('Error checking username setup completion:', error);
      return false;
    }
  }, []);

  // Mark username setup as complete
  const markUsernameSetupComplete = useCallback(() => {
    if (!user) return;
    
    try {
      const completionKey = `username_setup_complete_${user.id}`;
      localStorage.setItem(completionKey, 'true');
      setHasCompletedUsernameSetup(true);
      
      logSecurityEvent('USERNAME_SETUP_COMPLETED', {
        userId: user.id,
        username: userIdentity?.username || 'unknown'
      });
    } catch (error) {
      console.error('Error marking username setup as complete:', error);
    }
  }, [user, userIdentity?.username, logSecurityEvent]);

  // User actions - Define before useEffect that uses them
  const refreshUserIdentity = async (): Promise<void> => {
    if (!user) return;

    try {
      const identity = await userIdentificationService.getUserIdentity(user.id);
      setUserIdentity(identity);
      
      if (identity) {
        setUserSubscription(identity.subscription_tier || 'free');
        setUserRole(identity.role || 'user');
        
        // Check if user has completed username setup
        const hasUsername = !!(identity.username && identity.username.trim() !== '');
        const isSetupComplete = hasUsername || checkUsernameSetupCompletion(user.id);
        setHasCompletedUsernameSetup(isSetupComplete);
      }
      
      logSecurityEvent('USER_IDENTITY_REFRESHED', {
        userId: user.id,
        hasUsername: !!identity?.username,
        username: identity?.username || 'none',
        hasCompletedSetup: hasCompletedUsernameSetup
      });
    } catch (error) {
      console.error('Error refreshing user identity:', error);
      logSecurityEvent('USER_IDENTITY_REFRESH_ERROR', {
        userId: user.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const updateUserIdentity = async (updates: Partial<UserIdentity>): Promise<boolean> => {
    if (!user) return false;

    // Check rate limiting
    if (!checkRateLimit()) {
      logSecurityEvent('UPDATE_RATE_LIMIT_EXCEEDED', { userId: user.id });
      return false;
    }

    // Validate user access for sensitive updates
    if (updates.role && !validateUserAccess('admin')) {
      logSecurityEvent('UNAUTHORIZED_ROLE_UPDATE_ATTEMPT', { 
        userId: user.id, 
        attemptedRole: updates.role,
        currentRole: userRole 
      });
      return false;
    }

    try {
      // Sanitize updates
      const sanitizedUpdates = sanitizeInput(updates);
      
      const updatedIdentity = await userIdentificationService.updateUserIdentity(user.id, sanitizedUpdates);
      if (updatedIdentity) {
        // Sanitize the returned identity
        const sanitizedIdentity = sanitizeInput(updatedIdentity);
        setUserIdentity(sanitizedIdentity);
        
        logSecurityEvent('USER_IDENTITY_UPDATED', { 
          userId: user.id,
          updatedFields: Object.keys(updates)
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating user identity:', error);
      logSecurityEvent('USER_IDENTITY_UPDATE_ERROR', { 
        userId: user.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  };

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
    if (!userIdentity) return 'Guest User';
    
    const parts: string[] = [];
    
    if (options?.showUsername !== false) {
      parts.push(`@${userIdentity.username}`);
    }
    
    if (options?.showEmail && userIdentity.email) {
      parts.push(getMaskedEmail(userIdentity.email));
    }
    
    if (options?.showRole) {
      parts.push(`(${userIdentity.role || 'user'})`);
    }
    
    if (options?.showSubscription) {
      parts.push(`[${userIdentity.subscription_tier || 'free'}]`);
    }
    
    return parts.length > 0 ? parts.join(' ') : userIdentity.display_name || 'User';
  };

  // Listen for user context refresh events
  useEffect(() => {
    const handleUserContextRefresh = () => {
      if (user) {
        refreshUserIdentity();
      }
    };

    window.addEventListener('userContextRefresh', handleUserContextRefresh);
    
    return () => {
      window.removeEventListener('userContextRefresh', handleUserContextRefresh);
    };
  }, [user, refreshUserIdentity]);

  const value: UserContextType = {
    user,
    userIdentity,
    getUserDisplayName,
    getUserUsername,
    getUserInitials,
    formatUserIdentity,
    isLoading,
    isAuthenticated: !!user,
    hasCompletedUsernameSetup,
    refreshUserIdentity,
    updateUserIdentity,
    markUsernameSetupComplete,
    validateUserAccess,
    getMaskedEmail,
    isOwnerEmail,
    logSecurityEvent,
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
