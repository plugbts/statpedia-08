// Custom hook for consistent session management
import { useState, useEffect } from 'react';
import { sessionService, SessionResult } from '@/services/session-service';

export interface UseSessionReturn {
  user: any | null;
  session: any | null;
  isLoading: boolean;
  isValid: boolean;
  error: string | null;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useSession = (): UseSessionReturn => {
  const [sessionResult, setSessionResult] = useState<SessionResult>({
    user: null,
    session: null,
    isValid: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSession = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await sessionService.getCurrentSession();
      setSessionResult(result);
      
      if (!result.isValid && result.error) {
        setError(result.error);
      }
    } catch (err) {
      console.error('Error loading session:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setSessionResult({
        user: null,
        session: null,
        isValid: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSession = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await sessionService.refreshSession();
      setSessionResult(result);
      
      if (!result.isValid && result.error) {
        setError(result.error);
      }
    } catch (err) {
      console.error('Error refreshing session:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      const success = await sessionService.signOut();
      
      if (success) {
        setSessionResult({
          user: null,
          session: null,
          isValid: false
        });
        setError(null);
      } else {
        setError('Failed to sign out');
      }
    } catch (err) {
      console.error('Error signing out:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  return {
    user: sessionResult.user,
    session: sessionResult.session,
    isLoading,
    isValid: sessionResult.isValid,
    error,
    refreshSession,
    signOut
  };
};
