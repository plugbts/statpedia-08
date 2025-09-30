// Rate limiting service for API protection
import { checkRateLimit, logSecurityEvent } from '@/utils/security';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

class RateLimitingService {
  private configs: Map<string, RateLimitConfig> = new Map();
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();

  // Register rate limit configuration for a route
  registerLimit(route: string, config: RateLimitConfig): void {
    this.configs.set(route, config);
  }

  // Check if request is allowed
  checkLimit(route: string, identifier: string): RateLimitResult {
    const config = this.configs.get(route);
    if (!config) {
      return { allowed: true, remaining: Infinity, resetTime: 0 };
    }

    const key = `${route}:${identifier}`;
    const now = Date.now();
    const record = this.requestCounts.get(key);

    // Initialize or reset if window expired
    if (!record || now > record.resetTime) {
      this.requestCounts.set(key, { count: 1, resetTime: now + config.windowMs });
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs
      };
    }

    // Check if limit exceeded
    if (record.count >= config.maxRequests) {
      logSecurityEvent('Rate limit exceeded', { route, identifier, count: record.count });
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime,
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      };
    }

    // Increment counter
    record.count++;
    return {
      allowed: true,
      remaining: config.maxRequests - record.count,
      resetTime: record.resetTime
    };
  }

  // Clean up expired records
  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.requestCounts.entries()) {
      if (now > record.resetTime) {
        this.requestCounts.delete(key);
      }
    }
  }

  // Get current rate limit status
  getStatus(route: string, identifier: string): RateLimitResult {
    const config = this.configs.get(route);
    if (!config) {
      return { allowed: true, remaining: Infinity, resetTime: 0 };
    }

    const key = `${route}:${identifier}`;
    const record = this.requestCounts.get(key);
    
    if (!record) {
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetTime: Date.now() + config.windowMs
      };
    }

    return {
      allowed: record.count < config.maxRequests,
      remaining: Math.max(0, config.maxRequests - record.count),
      resetTime: record.resetTime
    };
  }

  // Reset rate limit for specific identifier
  resetLimit(route: string, identifier: string): void {
    const key = `${route}:${identifier}`;
    this.requestCounts.delete(key);
  }

  // Get all active rate limits
  getActiveLimits(): Array<{ route: string; identifier: string; count: number; resetTime: number }> {
    const active: Array<{ route: string; identifier: string; count: number; resetTime: number }> = [];
    
    for (const [key, record] of this.requestCounts.entries()) {
      const [route, identifier] = key.split(':', 2);
      active.push({
        route,
        identifier,
        count: record.count,
        resetTime: record.resetTime
      });
    }
    
    return active;
  }
}

// Create service instance
export const rateLimitingService = new RateLimitingService();

// Register default rate limits
rateLimitingService.registerLimit('auth:login', {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes
  skipSuccessfulRequests: true
});

rateLimitingService.registerLimit('auth:signup', {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3, // 3 signups per hour
  skipSuccessfulRequests: true
});

rateLimitingService.registerLimit('auth:password-reset', {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3, // 3 password resets per hour
  skipSuccessfulRequests: true
});

rateLimitingService.registerLimit('api:general', {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 1000, // 1000 requests per 15 minutes
  skipSuccessfulRequests: false
});

rateLimitingService.registerLimit('api:file-upload', {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 50, // 50 uploads per hour
  skipSuccessfulRequests: false
});

rateLimitingService.registerLimit('api:social-post', {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 posts per minute
  skipSuccessfulRequests: false
});

rateLimitingService.registerLimit('api:comment', {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // 20 comments per minute
  skipSuccessfulRequests: false
});

// Clean up expired records every 5 minutes
setInterval(() => {
  rateLimitingService.cleanup();
}, 5 * 60 * 1000);

// Rate limiting middleware for API calls
export const withRateLimit = (route: string) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      // Get user identifier (email, IP, or user ID)
      const identifier = args[0]?.email || args[0]?.userId || 'anonymous';
      
      const result = rateLimitingService.checkLimit(route, identifier);
      
      if (!result.allowed) {
        throw new Error(`Rate limit exceeded. Try again in ${result.retryAfter} seconds.`);
      }
      
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
};
