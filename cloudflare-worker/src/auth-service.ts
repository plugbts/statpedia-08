/**
 * Cloudflare Worker Auth Service
 * Implements the same authentication logic as the local auth service
 * but adapted for Cloudflare Workers environment
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { auth_user, auth_credential, auth_session, auth_audit } from '../drizzle/schema/auth';
import { eq, and, lt } from 'drizzle-orm';

// Types
export interface AuthUser {
  id: string;
  email: string;
  email_verified: boolean;
  display_name?: string;
  username?: string;
  created_at: Date;
  updated_at: Date;
  disabled: boolean;
}

export interface SignupData {
  email: string;
  password: string;
  display_name?: string;
  username?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthTokens {
  token: string;
  refreshToken: string;
}

export interface RefreshData {
  refreshToken: string;
}

export interface AuditEvent {
  user_id?: string;
  event: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
}

// Configuration
function getJWTSecret(env: any): string {
  const secret = env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

const JWT_EXPIRES_IN = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRES_DAYS = 30;

// Database connection
function getDatabase(env: any) {
  const connectionString = env.NEON_DATABASE_URL;
  if (!connectionString) {
    throw new Error('NEON_DATABASE_URL environment variable is required');
  }
  
  const client = postgres(connectionString);
  const db = drizzle(client);
  
  return { db, client };
}

// Username generation
function generateUsername(): string {
  const randomChars = Math.random().toString(36).slice(2, 8);
  return `user_${randomChars}`;
}

// Password hashing (using Web Crypto API for Cloudflare Workers)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// JWT handling
interface JWTPayload {
  sub: string;
  'https://hasura.io/jwt/claims': {
    'x-hasura-default-role': string;
    'x-hasura-allowed-roles': string[];
    'x-hasura-user-id': string;
    'x-hasura-display-name'?: string;
    'x-hasura-username'?: string;
  };
  iat?: number;
  exp?: number;
}

function generateJWT(user: AuthUser, secret: string): string {
  const payload: JWTPayload = {
    sub: user.id,
    'https://hasura.io/jwt/claims': {
      'x-hasura-default-role': 'user',
      'x-hasura-allowed-roles': ['user', 'admin'],
      'x-hasura-user-id': user.id,
      ...(user.display_name && { 'x-hasura-display-name': user.display_name }),
      ...(user.username && { 'x-hasura-username': user.username })
    }
  };

  // Simple JWT implementation for Cloudflare Workers
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  const signature = btoa(encodedHeader + '.' + encodedPayload + '.' + secret);
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function generateRefreshToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Auth Service Class
export class WorkerAuthService {
  constructor(private env: any) {}

  async signup(data: SignupData, auditContext?: { ip_address?: string; user_agent?: string }): Promise<AuthTokens> {
    try {
      const { db } = getDatabase(this.env);
      
      // Check if user already exists
      const existingUser = await db.select().from(auth_user).where(eq(auth_user.email, data.email)).limit(1);
      
      if (existingUser.length > 0) {
        await this.logAuditEvent({
          event: 'signup_failed_email_exists',
          ip_address: auditContext?.ip_address,
          user_agent: auditContext?.user_agent,
          metadata: { email: data.email }
        });
        throw new Error('Email already in use');
      }

      // Hash password
      const passwordHash = await hashPassword(data.password);

      // Generate unique username if not provided
      let username = data.username;
      if (!username) {
        let attempts = 0;
        do {
          username = generateUsername();
          const existingUsername = await db.select().from(auth_user).where(eq(auth_user.username, username)).limit(1);
          if (existingUsername.length === 0) break;
          attempts++;
        } while (attempts < 10);
        
        if (attempts >= 10) {
          throw new Error('Unable to generate unique username. Please try again.');
        }
      }

      // Create user
      const [user] = await db.insert(auth_user).values({
        email: data.email,
        display_name: data.display_name,
        username: username,
        email_verified: false
      }).returning();

      // Store credentials
      await db.insert(auth_credential).values({
        user_id: user.id,
        password_hash: passwordHash,
        password_algo: 'sha256'
      });

      // Generate tokens
      const token = generateJWT(user, getJWTSecret(this.env));
      const refreshToken = generateRefreshToken();

      // Store session
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);

      await db.insert(auth_session).values({
        user_id: user.id,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        ip_address: auditContext?.ip_address,
        user_agent: auditContext?.user_agent
      });

      // Log successful signup
      await this.logAuditEvent({
        user_id: user.id,
        event: 'signup_success',
        ip_address: auditContext?.ip_address,
        user_agent: auditContext?.user_agent,
        metadata: { email: data.email }
      });

      return { token, refreshToken };
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }

  async login(data: LoginData, auditContext?: { ip_address?: string; user_agent?: string }): Promise<AuthTokens> {
    try {
      const { db } = getDatabase(this.env);
      
      // Find user with credentials
      const result = await db.select({
        user: auth_user,
        credential: auth_credential
      }).from(auth_user)
        .innerJoin(auth_credential, eq(auth_user.id, auth_credential.user_id))
        .where(and(
          eq(auth_user.email, data.email),
          eq(auth_user.disabled, false)
        ))
        .limit(1);

      if (result.length === 0) {
        await this.logAuditEvent({
          event: 'login_failed_invalid_credentials',
          ip_address: auditContext?.ip_address,
          user_agent: auditContext?.user_agent,
          metadata: { email: data.email }
        });
        throw new Error('Invalid credentials');
      }

      const row = result[0];

      // Verify password
      const passwordValid = await verifyPassword(data.password, row.credential.password_hash);
      if (!passwordValid) {
        await this.logAuditEvent({
          event: 'login_failed_invalid_credentials',
          ip_address: auditContext?.ip_address,
          user_agent: auditContext?.user_agent,
          metadata: { email: data.email }
        });
        throw new Error('Invalid credentials');
      }

      // Generate tokens
      const token = generateJWT(row.user, getJWTSecret(this.env));
      const refreshToken = generateRefreshToken();

      // Store new session
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);

      await db.insert(auth_session).values({
        user_id: row.user.id,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        ip_address: auditContext?.ip_address,
        user_agent: auditContext?.user_agent
      });

      // Log successful login
      await this.logAuditEvent({
        user_id: row.user.id,
        event: 'login_success',
        ip_address: auditContext?.ip_address,
        user_agent: auditContext?.user_agent,
        metadata: { email: data.email }
      });

      return { token, refreshToken };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async getUserById(userId: string): Promise<AuthUser | null> {
    try {
      const { db } = getDatabase(this.env);
      
      const result = await db.select().from(auth_user).where(eq(auth_user.id, userId)).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error('Get user error:', error);
      throw error;
    }
  }

  async logAuditEvent(event: AuditEvent): Promise<void> {
    try {
      const { db } = getDatabase(this.env);
      
      await db.insert(auth_audit).values({
        user_id: event.user_id,
        event: event.event,
        ip_address: event.ip_address,
        user_agent: event.user_agent,
        metadata: event.metadata
      });
    } catch (error) {
      console.error('Audit log error:', error);
      // Don't throw - audit logging shouldn't break the main flow
    }
  }
}

// Create singleton instance
let authService: WorkerAuthService | null = null;

export function getAuthService(env: any): WorkerAuthService {
  if (!authService) {
    authService = new WorkerAuthService(env);
  }
  return authService;
}