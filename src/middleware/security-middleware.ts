// Security middleware for API calls and requests
import { sanitizeInput, detectSuspiciousPatterns, logSecurityEvent } from '@/utils/security';
import { rateLimitingService } from '@/services/rate-limiting-service';
import { csrfService } from '@/services/csrf-service';

interface SecurityConfig {
  enableRateLimit?: boolean;
  enableCSRF?: boolean;
  enableInputSanitization?: boolean;
  enableSuspiciousPatternDetection?: boolean;
  rateLimitRoute?: string;
}

export class SecurityMiddleware {
  private config: SecurityConfig;

  constructor(config: SecurityConfig = {}) {
    this.config = {
      enableRateLimit: true,
      enableCSRF: true,
      enableInputSanitization: true,
      enableSuspiciousPatternDetection: true,
      ...config
    };
  }

  // Main security check function
  async checkSecurity(
    request: any,
    identifier?: string
  ): Promise<{ allowed: boolean; error?: string; sanitizedData?: any }> {
    try {
      // Rate limiting check
      if (this.config.enableRateLimit && this.config.rateLimitRoute) {
        const rateLimitResult = rateLimitingService.checkLimit(
          this.config.rateLimitRoute,
          identifier || 'anonymous'
        );
        
        if (!rateLimitResult.allowed) {
          logSecurityEvent('Rate limit exceeded', {
            route: this.config.rateLimitRoute,
            identifier,
            retryAfter: rateLimitResult.retryAfter
          });
          return {
            allowed: false,
            error: `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds.`
          };
        }
      }

      // CSRF protection
      if (this.config.enableCSRF) {
        const csrfToken = request.headers?.['x-csrf-token'] || request.csrfToken;
        if (!csrfToken || !csrfService.validateToken(csrfToken)) {
          logSecurityEvent('Invalid CSRF token', { identifier });
          return {
            allowed: false,
            error: 'Invalid CSRF token'
          };
        }
      }

      // Input sanitization
      let sanitizedData = request;
      if (this.config.enableInputSanitization) {
        sanitizedData = this.sanitizeRequestData(request);
      }

      // Suspicious pattern detection
      if (this.config.enableSuspiciousPatternDetection) {
        const suspiciousCheck = this.detectSuspiciousPatternsInRequest(request);
        if (suspiciousCheck.isSuspicious) {
          logSecurityEvent('Suspicious request detected', {
            identifier,
            patterns: suspiciousCheck.patterns,
            data: this.sanitizeForLogging(request)
          });
          return {
            allowed: false,
            error: 'Suspicious request detected'
          };
        }
      }

      return {
        allowed: true,
        sanitizedData
      };
    } catch (error) {
      logSecurityEvent('Security middleware error', {
        error: error.message,
        identifier
      });
      return {
        allowed: false,
        error: 'Security check failed'
      };
    }
  }

  // Sanitize request data
  private sanitizeRequestData(data: any): any {
    if (typeof data === 'string') {
      return sanitizeInput(data);
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeRequestData(item));
    }
    
    if (data && typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[sanitizeInput(key)] = this.sanitizeRequestData(value);
      }
      return sanitized;
    }
    
    return data;
  }

  // Detect suspicious patterns in request
  private detectSuspiciousPatternsInRequest(data: any): { isSuspicious: boolean; patterns: string[] } {
    const patterns: string[] = [];
    
    if (typeof data === 'string') {
      const check = detectSuspiciousPatterns(data);
      if (check.isSuspicious) {
        patterns.push(...check.patterns);
      }
    } else if (data && typeof data === 'object') {
      for (const value of Object.values(data)) {
        const check = this.detectSuspiciousPatternsInRequest(value);
        if (check.isSuspicious) {
          patterns.push(...check.patterns);
        }
      }
    }
    
    return {
      isSuspicious: patterns.length > 0,
      patterns: [...new Set(patterns)] // Remove duplicates
    };
  }

  // Sanitize data for logging (remove sensitive information)
  private sanitizeForLogging(data: any): any {
    if (typeof data === 'string') {
      return data.length > 100 ? data.substring(0, 100) + '...' : data;
    }
    
    if (Array.isArray(data)) {
      return data.slice(0, 5).map(item => this.sanitizeForLogging(item));
    }
    
    if (data && typeof data === 'object') {
      const sanitized: any = {};
      const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth'];
      
      for (const [key, value] of Object.entries(data)) {
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeForLogging(value);
        }
      }
      return sanitized;
    }
    
    return data;
  }
}

// Pre-configured middleware instances
export const authSecurityMiddleware = new SecurityMiddleware({
  enableRateLimit: true,
  enableCSRF: true,
  enableInputSanitization: true,
  enableSuspiciousPatternDetection: true,
  rateLimitRoute: 'auth:login'
});

export const apiSecurityMiddleware = new SecurityMiddleware({
  enableRateLimit: true,
  enableCSRF: true,
  enableInputSanitization: true,
  enableSuspiciousPatternDetection: true,
  rateLimitRoute: 'api:general'
});

export const fileUploadSecurityMiddleware = new SecurityMiddleware({
  enableRateLimit: true,
  enableCSRF: true,
  enableInputSanitization: true,
  enableSuspiciousPatternDetection: true,
  rateLimitRoute: 'api:file-upload'
});

// Decorator for methods that need security
export function withSecurity(config?: SecurityConfig) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const middleware = new SecurityMiddleware(config);
    
    descriptor.value = async function (...args: any[]) {
      const request = args[0];
      const identifier = request?.email || request?.userId || 'anonymous';
      
      const securityCheck = await middleware.checkSecurity(request, identifier);
      
      if (!securityCheck.allowed) {
        throw new Error(securityCheck.error);
      }
      
      // Use sanitized data if available
      if (securityCheck.sanitizedData) {
        args[0] = securityCheck.sanitizedData;
      }
      
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}
