// Security utilities for input validation, sanitization, and protection
import DOMPurify from 'dompurify';

// Rate limiting storage
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Input sanitization
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

// HTML sanitization using DOMPurify
export const sanitizeHTML = (html: string): string => {
  if (typeof html !== 'string') return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: []
  });
};

// Email validation with strict rules
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 254;
};

// Password strength validation
export const validatePasswordStrength = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Check for common passwords
  const commonPasswords = ['password', '123456', 'qwerty', 'abc123', 'password123'];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Username validation
export const validateUsername = (username: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (username.length < 3) {
    errors.push('Username must be at least 3 characters long');
  }
  
  if (username.length > 30) {
    errors.push('Username must be less than 30 characters');
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, and underscores');
  }
  
  if (username.startsWith('_') || username.endsWith('_')) {
    errors.push('Username cannot start or end with underscore');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// File validation
export const validateFile = (file: File, options: {
  maxSize: number; // in bytes
  allowedTypes: string[];
  allowedExtensions: string[];
}): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Check file size
  if (file.size > options.maxSize) {
    errors.push(`File size must be less than ${Math.round(options.maxSize / 1024 / 1024)}MB`);
  }
  
  // Check MIME type
  if (!options.allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed`);
  }
  
  // Check file extension
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !options.allowedExtensions.includes(extension)) {
    errors.push(`File extension .${extension} is not allowed`);
  }
  
  // Check for suspicious file names
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    errors.push('File name contains invalid characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Rate limiting
export const checkRateLimit = (key: string, maxRequests: number, windowMs: number): boolean => {
  const now = Date.now();
  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
};

// Generate CSRF token
export const generateCSRFToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Validate CSRF token
export const validateCSRFToken = (token: string, sessionToken: string): boolean => {
  if (!token || !sessionToken) return false;
  return token === sessionToken;
};

// SQL injection prevention (basic)
export const sanitizeSQLInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/['"\\]/g, '') // Remove quotes and backslashes
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove block comments start
    .replace(/\*\//g, '') // Remove block comments end
    .replace(/;/g, '') // Remove semicolons
    .trim();
};

// XSS prevention
export const preventXSS = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Generate secure random string
export const generateSecureRandom = (length: number = 32): string => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Validate URL
export const validateURL = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
};

// Sanitize URL
export const sanitizeURL = (url: string): string => {
  try {
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return '';
    }
    return urlObj.toString();
  } catch {
    return '';
  }
};

// Check for suspicious patterns
export const detectSuspiciousPatterns = (input: string): { isSuspicious: boolean; patterns: string[] } => {
  const patterns: string[] = [];
  
  // SQL injection patterns
  const sqlPatterns = [
    /union\s+select/i,
    /drop\s+table/i,
    /delete\s+from/i,
    /insert\s+into/i,
    /update\s+set/i,
    /or\s+1\s*=\s*1/i,
    /and\s+1\s*=\s*1/i
  ];
  
  // XSS patterns
  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i
  ];
  
  // Command injection patterns
  const cmdPatterns = [
    /;\s*rm\s+/i,
    /;\s*cat\s+/i,
    /;\s*ls\s+/i,
    /;\s*whoami/i,
    /;\s*id/i,
    /\|\s*rm\s+/i,
    /\|\s*cat\s+/i
  ];
  
  [...sqlPatterns, ...xssPatterns, ...cmdPatterns].forEach((pattern, index) => {
    if (pattern.test(input)) {
      if (index < sqlPatterns.length) {
        patterns.push('SQL injection attempt');
      } else if (index < sqlPatterns.length + xssPatterns.length) {
        patterns.push('XSS attempt');
      } else {
        patterns.push('Command injection attempt');
      }
    }
  });
  
  return {
    isSuspicious: patterns.length > 0,
    patterns
  };
};

// Log security events
export const logSecurityEvent = (event: string, details: any) => {
  console.warn(`[SECURITY] ${event}:`, details);
  // In production, send to security monitoring service
};

// Clean up rate limit store periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute
