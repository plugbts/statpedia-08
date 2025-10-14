'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

// Types
export interface User {
  id: string;
  email: string;
  email_verified: boolean;
  display_name?: string;
  created_at: string;
  updated_at: string;
  disabled: boolean;
}

export interface AuthTokens {
  token: string;
  refreshToken: string;
  expiresAt: number;
}

export interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signup: (email: string, password: string, displayName?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

// Default context value
const defaultContext: AuthContextType = {
  user: null,
  tokens: null,
  isLoading: true,
  isAuthenticated: false,
  signup: async () => {},
  login: async () => {},
  logout: async () => {},
  refreshToken: async () => false,
};

// Create context
const AuthContext = createContext<AuthContextType>(defaultContext);

// Storage keys
const TOKEN_KEY = 'auth_tokens';
const USER_KEY = 'auth_user';

// Helper functions
const saveTokens = (tokens: AuthTokens) => {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
};

const getTokens = (): AuthTokens | null => {
  try {
    const stored = localStorage.getItem(TOKEN_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const clearTokens = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

const saveUser = (user: User) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

const getUser = (): User | null => {
  try {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

// API helper
const apiRequest = async (url: string, options: RequestInit = {}) => {
  // Use local API server for development
  const baseUrl = import.meta.env.DEV ? 'http://localhost:3001' : '';
  const fullUrl = `${baseUrl}${url}`;

  const response = await fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
};

// Auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!tokens;

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedTokens = getTokens();
        const storedUser = getUser();

        if (storedTokens && storedUser) {
          // Check if tokens are expired
          if (Date.now() < storedTokens.expiresAt) {
            setTokens(storedTokens);
            setUser(storedUser);
          } else {
            // Try to refresh token
            const refreshed = await refreshTokenSilently(storedTokens.refreshToken);
            if (!refreshed) {
              clearAuthState();
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        clearAuthState();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Clear auth state
  const clearAuthState = () => {
    setUser(null);
    setTokens(null);
    clearTokens();
  };

  // Silent token refresh
  const refreshTokenSilently = async (refreshToken: string): Promise<boolean> => {
    try {
      const response = await apiRequest('/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });

      if (response.success) {
        const newTokens: AuthTokens = {
          token: response.data.token,
          refreshToken,
          expiresAt: Date.now() + (response.data.expiresIn * 1000),
        };
        
        setTokens(newTokens);
        saveTokens(newTokens);
        return true;
      }
    } catch (error) {
      console.error('Silent token refresh failed:', error);
    }
    
    return false;
  };

  // Signup function
  const signup = useCallback(async (email: string, password: string, displayName?: string) => {
    try {
      const response = await apiRequest('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, display_name: displayName }),
      });

      if (response.success) {
        const newTokens: AuthTokens = {
          token: response.data.token,
          refreshToken: response.data.refreshToken,
          expiresAt: Date.now() + (response.data.expiresIn * 1000),
        };

        setTokens(newTokens);
        saveTokens(newTokens);

        // Fetch user data
        await fetchUserData(response.data.token);
      }
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }, []);

  // Login function
  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (response.success) {
        const newTokens: AuthTokens = {
          token: response.data.token,
          refreshToken: response.data.refreshToken,
          expiresAt: Date.now() + (response.data.expiresIn * 1000),
        };

        setTokens(newTokens);
        saveTokens(newTokens);

        // Fetch user data
        await fetchUserData(response.data.token);
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }, []);

  // Fetch user data
  const fetchUserData = async (token: string) => {
    try {
      const response = await apiRequest('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.success) {
        setUser(response.data);
        saveUser(response.data);
      }
    } catch (error) {
      console.error('Fetch user data error:', error);
      throw error;
    }
  };

  // Logout function
  const logout = useCallback(async () => {
    try {
      if (tokens?.refreshToken) {
        await apiRequest('/api/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuthState();
    }
  }, [tokens]);

  // Refresh token function
  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (!tokens?.refreshToken) {
      return false;
    }

    try {
      const refreshed = await refreshTokenSilently(tokens.refreshToken);
      if (refreshed) {
        // Fetch updated user data
        const newTokens = getTokens();
        if (newTokens) {
          await fetchUserData(newTokens.token);
        }
      }
      return refreshed;
    } catch (error) {
      console.error('Token refresh error:', error);
      clearAuthState();
      return false;
    }
  }, [tokens]);

  // Auto-refresh token before expiration
  useEffect(() => {
    if (!tokens) return;

    const timeUntilExpiry = tokens.expiresAt - Date.now();
    const refreshThreshold = 5 * 60 * 1000; // 5 minutes before expiry

    if (timeUntilExpiry < refreshThreshold) {
      refreshToken();
    }

    const timeout = setTimeout(() => {
      refreshToken();
    }, timeUntilExpiry - refreshThreshold);

    return () => clearTimeout(timeout);
  }, [tokens, refreshToken]);

  const contextValue: AuthContextType = {
    user,
    tokens,
    isLoading,
    isAuthenticated,
    signup,
    login,
    logout,
    refreshToken,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Hook to get auth headers for API requests
export const useAuthHeaders = () => {
  const { tokens } = useAuth();
  
  return {
    Authorization: tokens ? `Bearer ${tokens.token}` : undefined,
  };
};
