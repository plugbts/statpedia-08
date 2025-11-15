"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getApiBaseUrl } from "@/lib/api";
import { OWNER_EMAILS } from "@/lib/auth/config";

// Types
export interface User {
  id: string;
  email: string;
  email_verified: boolean;
  display_name?: string;
  username?: string;
  created_at: string;
  updated_at: string;
  disabled: boolean;
  role?: string;
  subscription_tier?: string;
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
  userSubscription: string; // 'free' | 'pro' | 'premium' (extensible)
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
  userSubscription: "free",
  signup: async () => {},
  login: async () => {},
  logout: async () => {},
  refreshToken: async () => false,
};

// Create context
const AuthContext = createContext<AuthContextType>(defaultContext);

// Storage keys
const TOKEN_KEY = "auth_tokens";
const USER_KEY = "auth_user";

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
  const baseUrl = getApiBaseUrl();
  const fullUrl = `${baseUrl}${url}`;

  console.log(`📡 [API_REQUEST] Fetching: ${fullUrl}`);
  console.log(`📡 [API_REQUEST] Method: ${options.method || "GET"}`);

  let response: Response;
  try {
    response = await fetch(fullUrl, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    console.log(`✅ [API_REQUEST] Response status: ${response.status}`);
  } catch (e: any) {
    console.error(`❌ [API_REQUEST] Fetch failed:`, e);
    // Network or CORS error
    const hint = import.meta.env.DEV
      ? 'Auth server not reachable. Make sure it is running with "npm run api:server" or "npm run dev:full".'
      : "Auth endpoint not reachable.";
    throw new Error(hint);
  }

  let data: any = null;
  try {
    data = await response.json();
    console.log(`📦 [API_REQUEST] Response data:`, data);
  } catch {
    console.warn(`⚠️ [API_REQUEST] Response not JSON`);
    // Not JSON response
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return { success: true, data: null };
  }

  if (!response.ok) {
    console.error(`❌ [API_REQUEST] Request failed:`, data.error);
    throw new Error(data.error || "Request failed");
  }

  return data;
};

// Auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userSubscription, setUserSubscription] = useState<string>("free");

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
            // Ensure owner override from config by email
            const adjustedUser = { ...storedUser } as User;
            const emailLc = (adjustedUser.email || "").toLowerCase();
            if (OWNER_EMAILS.includes(emailLc)) {
              adjustedUser.role = "owner";
            }
            setUser(adjustedUser);
            // Attempt to hydrate subscription from stored user if present; else default
            const sub = storedUser.subscription_tier || "free";
            setUserSubscription(sub);
          } else {
            // Try to refresh token
            const refreshed = await refreshTokenSilently(storedTokens.refreshToken);
            if (!refreshed) {
              clearAuthState();
            }
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
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
    setUserSubscription("free");
    clearTokens();
  };

  // Silent token refresh
  const refreshTokenSilently = async (refreshToken: string): Promise<boolean> => {
    try {
      console.log("🔄 [AUTH_DEBUG] Attempting silent token refresh");

      // Skip refresh for mock tokens (old bypass tokens)
      if (refreshToken.startsWith("mock-refresh-")) {
        console.log("⚠️ [AUTH_DEBUG] Skipping refresh for mock token");
        return false;
      }

      const response = await apiRequest("/api/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });

      if (response.success) {
        console.log("✅ [AUTH_DEBUG] Token refreshed successfully");
        const newTokens: AuthTokens = {
          token: response.data.token,
          refreshToken,
          expiresAt: Date.now() + response.data.expiresIn * 1000,
        };

        setTokens(newTokens);
        saveTokens(newTokens);
        return true;
      }
    } catch (error) {
      console.error("Silent token refresh failed:", error);
    }

    return false;
  };

  // Signup function
  const signup = useCallback(async (email: string, password: string, displayName?: string) => {
    try {
      const response = await apiRequest("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, display_name: displayName }),
      });

      if (response.success) {
        const newTokens: AuthTokens = {
          token: response.data.token,
          refreshToken: response.data.refreshToken,
          expiresAt: Date.now() + response.data.expiresIn * 1000,
        };

        setTokens(newTokens);
        saveTokens(newTokens);

        // Fetch user data
        await fetchUserData(response.data.token);
      }
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    }
  }, []);

  // Login function
  const login = useCallback(async (email: string, password: string) => {
    console.log("🔐 [AUTH_DEBUG] Login attempt started for:", email);

    try {
      console.log("📡 [AUTH_DEBUG] Calling /api/auth/login...");

      const response = (await Promise.race([
        apiRequest("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Login timeout after 10s")), 10000),
        ),
      ])) as any;

      console.log("✅ [AUTH_DEBUG] Login response:", response);

      if (response.success) {
        console.log("🎫 [AUTH_DEBUG] Login successful, setting tokens...");
        const newTokens: AuthTokens = {
          token: response.data.token,
          refreshToken: response.data.refreshToken,
          expiresAt: Date.now() + response.data.expiresIn * 1000,
        };

        setTokens(newTokens);
        saveTokens(newTokens);

        console.log("👤 [AUTH_DEBUG] Fetching user data...");
        // Fetch user data
        await fetchUserData(response.data.token);
        console.log("✅ [AUTH_DEBUG] Login complete!");
      } else {
        console.error("❌ [AUTH_DEBUG] Login failed:", response);
        throw new Error(response.error || "Login failed");
      }
    } catch (error) {
      console.error("❌ [AUTH_DEBUG] Login error:", error);
      throw error;
    }
  }, []);

  // Fetch user data
  const fetchUserData = async (token: string) => {
    console.log("👤 [AUTH_DEBUG] fetchUserData called");

    try {
      console.log("📡 [AUTH_DEBUG] Calling /api/auth/me...");

      const response = (await Promise.race([
        apiRequest("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Fetch user timeout after 10s")), 10000),
        ),
      ])) as any;

      console.log("✅ [AUTH_DEBUG] User data response:", response);

      if (response.success) {
        const userData = response.data;

        console.log("📡 [AUTH_DEBUG] Fetching user role...");
        // Fetch user role
        try {
          const roleResponse = (await Promise.race([
            apiRequest(`/api/auth/user-role/${userData.id}`),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Role fetch timeout after 5s")), 5000),
            ),
          ])) as any;

          if (roleResponse.success) {
            userData.role = roleResponse.data.role;
            console.log("✅ [AUTH_DEBUG] User role:", userData.role);
          }
        } catch (roleError) {
          console.error("⚠️ [AUTH_DEBUG] Failed to fetch user role:", roleError);
          userData.role = "user"; // Default role
        }

        // Owner override based on config email list
        const emailLc = (userData.email || "").toLowerCase();
        if (OWNER_EMAILS.includes(emailLc)) {
          console.log("👑 [AUTH_DEBUG] User is owner:", emailLc);
          userData.role = "owner";
        }

        // Determine subscription tier (placeholder: default to 'free' until real billing integration)
        // If your backend adds subscription_tier, we'll pick it up here.
        const sub = userData.subscription_tier || "free";
        console.log("💳 [AUTH_DEBUG] User subscription:", sub);
        setUserSubscription(sub);

        setUser(userData);
        saveUser(userData);
      }
    } catch (error) {
      console.error("Fetch user data error:", error);
      throw error;
    }
  };

  // Logout function
  const logout = useCallback(async () => {
    try {
      if (tokens?.refreshToken) {
        await apiRequest("/api/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
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
        const newTokens = getTokens(); // Fetch updated user data (also updates subscription)
        if (newTokens) {
          await fetchUserData(newTokens.token);
        }
      }
      return refreshed;
    } catch (error) {
      console.error("Token refresh error:", error);
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
    userSubscription,
    signup,
    login,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

// Hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
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
