// CSRF protection service
import { generateCSRFToken, validateCSRFToken } from '@/utils/security';

interface CSRFSession {
  token: string;
  expiresAt: number;
  userId?: string;
}

class CSRFService {
  private sessions: Map<string, CSRFSession> = new Map();
  private readonly TOKEN_LIFETIME = 30 * 60 * 1000; // 30 minutes

  // Generate CSRF token for user session
  generateToken(userId?: string): string {
    const token = generateCSRFToken();
    const sessionId = this.getSessionId();
    
    this.sessions.set(sessionId, {
      token,
      expiresAt: Date.now() + this.TOKEN_LIFETIME,
      userId
    });
    
    // Clean up expired sessions
    this.cleanupExpiredSessions();
    
    return token;
  }

  // Validate CSRF token
  validateToken(token: string, sessionId?: string): boolean {
    if (!token) return false;
    
    const currentSessionId = sessionId || this.getSessionId();
    const session = this.sessions.get(currentSessionId);
    
    if (!session) return false;
    
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(currentSessionId);
      return false;
    }
    
    return validateCSRFToken(token, session.token);
  }

  // Get current session ID (browser fingerprint)
  private getSessionId(): string {
    // In a real application, this would be a more sophisticated session ID
    // For now, we'll use a combination of user agent and timestamp
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'server';
    const timestamp = Math.floor(Date.now() / (1000 * 60 * 5)); // 5-minute buckets
    return btoa(`${userAgent}:${timestamp}`).replace(/[^a-zA-Z0-9]/g, '');
  }

  // Clean up expired sessions
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
      }
    }
  }

  // Get token for current session
  getCurrentToken(): string | null {
    const sessionId = this.getSessionId();
    const session = this.sessions.get(sessionId);
    
    if (!session || Date.now() > session.expiresAt) {
      return null;
    }
    
    return session.token;
  }

  // Refresh token
  refreshToken(userId?: string): string {
    const sessionId = this.getSessionId();
    this.sessions.delete(sessionId);
    return this.generateToken(userId);
  }

  // Invalidate all tokens for user
  invalidateUserTokens(userId: string): void {
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(sessionId);
      }
    }
  }

  // Get session info
  getSessionInfo(sessionId?: string): CSRFSession | null {
    const currentSessionId = sessionId || this.getSessionId();
    const session = this.sessions.get(currentSessionId);
    
    if (!session || Date.now() > session.expiresAt) {
      return null;
    }
    
    return session;
  }

  // Check if token is valid for user
  isTokenValidForUser(token: string, userId: string): boolean {
    if (!this.validateToken(token)) return false;
    
    const sessionId = this.getSessionId();
    const session = this.sessions.get(sessionId);
    
    return session?.userId === userId;
  }
}

// Create service instance
export const csrfService = new CSRFService();

// CSRF middleware for API calls
export const withCSRFProtection = (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
  const originalMethod = descriptor.value;
  
  descriptor.value = async function (...args: any[]) {
    const request = args[0];
    const csrfToken = request?.headers?.['x-csrf-token'] || request?.csrfToken;
    
    if (!csrfToken || !csrfService.validateToken(csrfToken)) {
      throw new Error('Invalid CSRF token');
    }
    
    return originalMethod.apply(this, args);
  };
  
  return descriptor;
};

// CSRF token hook for React components
export const useCSRFToken = (userId?: string) => {
  const [token, setToken] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    const currentToken = csrfService.getCurrentToken();
    if (!currentToken) {
      const newToken = csrfService.generateToken(userId);
      setToken(newToken);
    } else {
      setToken(currentToken);
    }
  }, [userId]);
  
  const refreshToken = React.useCallback(() => {
    const newToken = csrfService.refreshToken(userId);
    setToken(newToken);
  }, [userId]);
  
  return { token, refreshToken };
};

// Auto-cleanup expired sessions every 5 minutes
setInterval(() => {
  csrfService['cleanupExpiredSessions']();
}, 5 * 60 * 1000);
