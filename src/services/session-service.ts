// Session management service for consistent user session handling
import { supabase } from '@/integrations/supabase/client';
import { backupService } from './backup-service';

export interface SessionResult {
  user: any | null;
  session: any | null;
  isValid: boolean;
  error?: string;
}

class SessionService {
  private sessionCache: { user: any; session: any; timestamp: number } | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Get current user session with caching and validation
  async getCurrentSession(): Promise<SessionResult> {
    try {
      // Check cache first
      if (this.sessionCache && this.isCacheValid()) {
        return {
          user: this.sessionCache.user,
          session: this.sessionCache.session,
          isValid: true
        };
      }

      // Get session from Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        return {
          user: null,
          session: null,
          isValid: false,
          error: sessionError.message
        };
      }

      if (!session || !session.user) {
        // Try to restore from backup if no session
        const authBackup = await backupService.restoreAuthData();
        if (authBackup) {
          console.log('🔄 Attempting to restore session from backup');
          // Note: We can't directly restore the session, but we can provide the user info
          return {
            user: { id: authBackup.user_id, email: authBackup.email },
            session: null,
            isValid: false,
            error: 'Session expired, please log in again'
          };
        }

        return {
          user: null,
          session: null,
          isValid: false,
          error: 'No active session found'
        };
      }

      // Validate session expiry
      const now = Date.now() / 1000;
      if (session.expires_at && session.expires_at < now) {
        console.log('🔄 Session expired, attempting refresh');
        
        // Try to refresh the session
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData.session) {
          console.error('Session refresh failed:', refreshError);
          return {
            user: null,
            session: null,
            isValid: false,
            error: 'Session expired and refresh failed'
          };
        }

        // Update cache with refreshed session
        this.sessionCache = {
          user: refreshData.session.user,
          session: refreshData.session,
          timestamp: Date.now()
        };

        return {
          user: refreshData.session.user,
          session: refreshData.session,
          isValid: true
        };
      }

      // Cache valid session
      this.sessionCache = {
        user: session.user,
        session: session,
        timestamp: Date.now()
      };

      return {
        user: session.user,
        session: session,
        isValid: true
      };
    } catch (error) {
      console.error('Error getting session:', error);
      return {
        user: null,
        session: null,
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get current user (alias for getCurrentSession for backward compatibility)
  async getCurrentUser(): Promise<any | null> {
    const result = await this.getCurrentSession();
    return result.user;
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    const result = await this.getCurrentSession();
    return result.isValid;
  }

  // Force refresh session
  async refreshSession(): Promise<SessionResult> {
    try {
      this.clearCache();
      
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Session refresh error:', error);
        return {
          user: null,
          session: null,
          isValid: false,
          error: error.message
        };
      }

      if (!data.session) {
        return {
          user: null,
          session: null,
          isValid: false,
          error: 'No session returned from refresh'
        };
      }

      // Update cache
      this.sessionCache = {
        user: data.session.user,
        session: data.session,
        timestamp: Date.now()
      };

      return {
        user: data.session.user,
        session: data.session,
        isValid: true
      };
    } catch (error) {
      console.error('Error refreshing session:', error);
      return {
        user: null,
        session: null,
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Clear session cache
  clearCache(): void {
    this.sessionCache = null;
  }

  // Check if cache is valid
  private isCacheValid(): boolean {
    if (!this.sessionCache) return false;
    return Date.now() - this.sessionCache.timestamp < this.CACHE_DURATION;
  }

  // Sign out user
  async signOut(): Promise<boolean> {
    try {
      this.clearCache();
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
        return false;
      }

      // Clear backup data
      backupService.clearAllBackups();
      
      return true;
    } catch (error) {
      console.error('Error signing out:', error);
      return false;
    }
  }

  // Handle session errors with recovery
  async handleSessionError(error: any): Promise<SessionResult> {
    console.error('Session error occurred:', error);
    
    // Try to refresh session
    const refreshResult = await this.refreshSession();
    
    if (refreshResult.isValid) {
      console.log('✅ Session recovered after error');
      return refreshResult;
    }

    // If refresh fails, try to restore from backup
    const authBackup = await backupService.restoreAuthData();
    if (authBackup) {
      console.log('🔄 Session recovery attempted from backup');
      return {
        user: { id: authBackup.user_id, email: authBackup.email },
        session: null,
        isValid: false,
        error: 'Session expired, please log in again'
      };
    }

    return {
      user: null,
      session: null,
      isValid: false,
      error: 'Session error and recovery failed'
    };
  }

  // Get session status for debugging
  getSessionStatus(): {
    hasCache: boolean;
    cacheAge?: number;
    cacheValid: boolean;
  } {
    return {
      hasCache: !!this.sessionCache,
      cacheAge: this.sessionCache ? Date.now() - this.sessionCache.timestamp : undefined,
      cacheValid: this.isCacheValid()
    };
  }
}

export const sessionService = new SessionService();
