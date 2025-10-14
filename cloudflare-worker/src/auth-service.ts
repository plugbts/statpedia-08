// Cloudflare Worker Auth Service
// Handles authentication endpoints for the StatPedia application

import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Auth schemas
const signupSchema = {
  email: 'string',
  password: 'string', 
  displayName: 'string'
};

const loginSchema = {
  email: 'string',
  password: 'string'
};

const refreshSchema = {
  refreshToken: 'string'
};

// Helper function to validate request body
function validateBody(body: any, schema: any): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];
  
  for (const [key, type] of Object.entries(schema)) {
    if (!(key in body)) {
      errors.push(`Missing required field: ${key}`);
    } else if (typeof body[key] !== type) {
      errors.push(`Invalid type for ${key}: expected ${type}, got ${typeof body[key]}`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

// Helper function to generate JWT
function generateJWT(userId: string, secret: string): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  const payload = {
    sub: userId,
    'https://hasura.io/jwt/claims': {
      'x-hasura-default-role': 'user',
      'x-hasura-allowed-roles': ['user', 'admin'],
      'x-hasura-user-id': userId
    },
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (15 * 60) // 15 minutes
  };
  
  // Simple JWT encoding (in production, use a proper JWT library)
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  
  // Create signature (simplified - in production use proper HMAC)
  const signature = btoa(`${encodedHeader}.${encodedPayload}.${secret}`);
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// Helper function to generate refresh token
function generateRefreshToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Password hashing using Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Password verification
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

export class AuthService {
  private supabase: any;
  
  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }
  
  async signup(body: any, jwtSecret: string) {
    // Validate request body
    const validation = validateBody(body, signupSchema);
    if (!validation.valid) {
      return {
        success: false,
        error: 'Validation failed',
        details: validation.errors
      };
    }
    
    try {
      // Hash password
      const passwordHash = await hashPassword(body.password);
      
      // Insert user
      const { data: user, error: userError } = await this.supabase
        .from('auth_user')
        .insert({
          email: body.email,
          display_name: body.displayName
        })
        .select()
        .single();
        
      if (userError) {
        return {
          success: false,
          error: 'Failed to create user',
          details: userError.message
        };
      }
      
      // Insert credential
      const { error: credError } = await this.supabase
        .from('auth_credential')
        .insert({
          user_id: user.id,
          password_hash: passwordHash
        });
        
      if (credError) {
        // Clean up user if credential insert fails
        await this.supabase.from('auth_user').delete().eq('id', user.id);
        return {
          success: false,
          error: 'Failed to create credential',
          details: credError.message
        };
      }
      
      // Generate tokens
      const accessToken = generateJWT(user.id, jwtSecret);
      const refreshToken = generateRefreshToken();
      
      // Store refresh token
      const { error: sessionError } = await this.supabase
        .from('auth_session')
        .insert({
          user_id: user.id,
          refresh_token: refreshToken,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        });
        
      if (sessionError) {
        console.warn('Failed to store refresh token:', sessionError);
      }
      
      // Log audit event
      await this.supabase
        .from('auth_audit')
        .insert({
          user_id: user.id,
          event_type: 'signup',
          ip_address: '0.0.0.0', // Cloudflare will provide real IP
          user_agent: 'Cloudflare Worker'
        });
      
      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            displayName: user.display_name
          },
          accessToken,
          refreshToken
        }
      };
      
    } catch (error: any) {
      return {
        success: false,
        error: 'Signup failed',
        details: error.message
      };
    }
  }
  
  async login(body: any, jwtSecret: string) {
    // Validate request body
    const validation = validateBody(body, loginSchema);
    if (!validation.valid) {
      return {
        success: false,
        error: 'Validation failed',
        details: validation.errors
      };
    }
    
    try {
      // Get user with credential
      const { data: user, error: userError } = await this.supabase
        .from('auth_user')
        .select(`
          id, email, display_name,
          auth_credential(password_hash)
        `)
        .eq('email', body.email)
        .single();
        
      if (userError || !user) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }
      
      // Verify password
      const passwordValid = await verifyPassword(body.password, user.auth_credential.password_hash);
      if (!passwordValid) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }
      
      // Generate tokens
      const accessToken = generateJWT(user.id, jwtSecret);
      const refreshToken = generateRefreshToken();
      
      // Store refresh token
      await this.supabase
        .from('auth_session')
        .insert({
          user_id: user.id,
          refresh_token: refreshToken,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        });
      
      // Log audit event
      await this.supabase
        .from('auth_audit')
        .insert({
          user_id: user.id,
          event_type: 'login',
          ip_address: '0.0.0.0',
          user_agent: 'Cloudflare Worker'
        });
      
      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            displayName: user.display_name
          },
          accessToken,
          refreshToken
        }
      };
      
    } catch (error: any) {
      return {
        success: false,
        error: 'Login failed',
        details: error.message
      };
    }
  }
  
  async refresh(body: any, jwtSecret: string) {
    // Validate request body
    const validation = validateBody(body, refreshSchema);
    if (!validation.valid) {
      return {
        success: false,
        error: 'Validation failed',
        details: validation.errors
      };
    }
    
    try {
      // Get session
      const { data: session, error: sessionError } = await this.supabase
        .from('auth_session')
        .select(`
          user_id, expires_at,
          auth_user(id, email, display_name)
        `)
        .eq('refresh_token', body.refreshToken)
        .single();
        
      if (sessionError || !session) {
        return {
          success: false,
          error: 'Invalid refresh token'
        };
      }
      
      // Check if session is expired
      if (new Date(session.expires_at) < new Date()) {
        // Clean up expired session
        await this.supabase
          .from('auth_session')
          .delete()
          .eq('refresh_token', body.refreshToken);
          
        return {
          success: false,
          error: 'Refresh token expired'
        };
      }
      
      // Generate new access token
      const accessToken = generateJWT(session.user_id, jwtSecret);
      
      return {
        success: true,
        data: {
          accessToken
        }
      };
      
    } catch (error: any) {
      return {
        success: false,
        error: 'Token refresh failed',
        details: error.message
      };
    }
  }
  
  async logout(refreshToken: string) {
    try {
      // Remove session
      await this.supabase
        .from('auth_session')
        .delete()
        .eq('refresh_token', refreshToken);
        
      return {
        success: true,
        message: 'Logged out successfully'
      };
      
    } catch (error: any) {
      return {
        success: false,
        error: 'Logout failed',
        details: error.message
      };
    }
  }
  
  async getMe(userId: string) {
    try {
      const { data: user, error } = await this.supabase
        .from('auth_user')
        .select('id, email, display_name, created_at')
        .eq('id', userId)
        .single();
        
      if (error || !user) {
        return {
          success: false,
          error: 'User not found'
        };
      }
      
      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            displayName: user.display_name,
            createdAt: user.created_at
          }
        }
      };
      
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to get user',
        details: error.message
      };
    }
  }
}
