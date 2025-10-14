import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { auth_user, auth_credential, auth_session, auth_audit, auth_verification_token } from '../../db/schema/auth';
import { eq, and, lt } from 'drizzle-orm';

// Types
export interface AuthUser {
  id: string;
  email: string;
  email_verified: boolean;
  display_name?: string;
  created_at: Date;
  updated_at: Date;
  disabled: boolean;
}

export interface SignupData {
  email: string;
  password: string;
  display_name?: string;
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
function getJWTSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '30');

// Database connection - lazy initialization
let client: postgres.Sql | null = null;
let db: ReturnType<typeof drizzle> | null = null;

function getDatabase() {
  if (!client || !db) {
    const DATABASE_URL = process.env.NEON_DATABASE_URL!;
    if (!DATABASE_URL) {
      throw new Error('NEON_DATABASE_URL environment variable is not set');
    }
    client = postgres(DATABASE_URL);
    db = drizzle(client);
  }
  return { client, db };
}

// JWT Claims for Hasura
interface HasuraClaims {
  'x-hasura-default-role': string;
  'x-hasura-allowed-roles': string[];
  'x-hasura-user-id': string;
}

interface JWTPayload {
  sub: string;
  'https://hasura.io/jwt/claims': HasuraClaims;
}

export class AuthService {
  /**
   * Generate JWT token with Hasura claims
   */
  private generateJWT(userId: string, role: string = 'user'): string {
    const payload: JWTPayload = {
      sub: userId,
      'https://hasura.io/jwt/claims': {
        'x-hasura-default-role': role,
        'x-hasura-allowed-roles': [role, 'admin'],
        'x-hasura-user-id': userId
      }
    };

    return jwt.sign(payload, getJWTSecret(), { 
      algorithm: 'HS256', 
      expiresIn: JWT_EXPIRES_IN 
    });
  }

  /**
   * Generate refresh token
   */
  private generateRefreshToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Log audit event
   */
  private async logAuditEvent(event: AuditEvent): Promise<void> {
    try {
      const { db } = getDatabase();
      
      await db.insert(auth_audit).values({
        user_id: event.user_id,
        event: event.event,
        ip_address: event.ip_address,
        user_agent: event.user_agent,
        metadata: event.metadata
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw - audit logging shouldn't break auth flow
    }
  }

  /**
   * Clean up expired sessions and tokens
   */
  private async cleanupExpiredTokens(): Promise<void> {
    try {
      // Remove expired sessions
      const { db } = getDatabase();
      
      await db.delete(auth_session).where(
        lt(auth_session.expires_at, new Date().toISOString())
      );

      // Remove expired verification tokens
      await db.delete(auth_verification_token).where(
        lt(auth_verification_token.expires_at, new Date().toISOString())
      );
    } catch (error) {
      console.error('Failed to cleanup expired tokens:', error);
    }
  }

  /**
   * User signup
   */
  async signup(data: SignupData, auditContext?: { ip_address?: string; user_agent?: string }): Promise<AuthTokens> {
    try {
      const { db } = getDatabase();
      
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
      const passwordHash = await argon2.hash(data.password, { 
        type: argon2.argon2id,
        memoryCost: 2 ** 16, // 64 MB
        timeCost: 3,
        parallelism: 1
      });

      // Create user
      const [user] = await db.insert(auth_user).values({
        email: data.email,
        display_name: data.display_name,
        email_verified: false // Require email verification
      }).returning();

      // Store credentials
      await db.insert(auth_credential).values({
        user_id: user.id,
        password_hash: passwordHash,
        password_algo: 'argon2id'
      });

      // Generate tokens
      const token = this.generateJWT(user.id);
      const refreshToken = this.generateRefreshToken();

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

      // Cleanup expired tokens
      await this.cleanupExpiredTokens();

      return { token, refreshToken };
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }

  /**
   * User login
   */
  async login(data: LoginData, auditContext?: { ip_address?: string; user_agent?: string }): Promise<AuthTokens> {
    try {
      const { db } = getDatabase();
      
      // Find user with credentials
      const result = await db
        .select({
          user: auth_user,
          credential: auth_credential
        })
        .from(auth_user)
        .innerJoin(auth_credential, eq(auth_user.id, auth_credential.user_id))
        .where(eq(auth_user.email, data.email))
        .limit(1);

      const row = result[0];
      
      if (!row || row.user.disabled) {
        await this.logAuditEvent({
          event: 'login_failed_invalid_credentials',
          ip_address: auditContext?.ip_address,
          user_agent: auditContext?.user_agent,
          metadata: { email: data.email }
        });
        throw new Error('Invalid credentials');
      }

      // Verify password
      const passwordValid = await argon2.verify(row.credential.password_hash, data.password);
      
      if (!passwordValid) {
        await this.logAuditEvent({
          user_id: row.user.id,
          event: 'login_failed_invalid_password',
          ip_address: auditContext?.ip_address,
          user_agent: auditContext?.user_agent,
          metadata: { email: data.email }
        });
        throw new Error('Invalid credentials');
      }

      // Generate tokens
      const token = this.generateJWT(row.user.id);
      const refreshToken = this.generateRefreshToken();

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

      // Cleanup expired tokens
      await this.cleanupExpiredTokens();

      return { token, refreshToken };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(data: RefreshData, auditContext?: { ip_address?: string; user_agent?: string }): Promise<{ token: string }> {
    try {
      const { db } = getDatabase();
      
      // Find valid session
      const result = await db
        .select({
          session: auth_session,
          user: auth_user
        })
        .from(auth_session)
        .innerJoin(auth_user, eq(auth_session.user_id, auth_user.id))
        .where(
          and(
            eq(auth_session.refresh_token, data.refreshToken),
            eq(auth_session.revoked, false),
            lt(new Date().toISOString(), auth_session.expires_at)
          )
        )
        .limit(1);

      const row = result[0];

      if (!row || row.user.disabled) {
        await this.logAuditEvent({
          event: 'refresh_failed_invalid_token',
          ip_address: auditContext?.ip_address,
          user_agent: auditContext?.user_agent,
          metadata: { refresh_token: data.refreshToken.substring(0, 8) + '...' }
        });
        throw new Error('Invalid refresh token');
      }

      // Generate new access token
      const token = this.generateJWT(row.user.id);

      // Log successful refresh
      await this.logAuditEvent({
        user_id: row.user.id,
        event: 'token_refresh_success',
        ip_address: auditContext?.ip_address,
        user_agent: auditContext?.user_agent
      });

      return { token };
    } catch (error) {
      console.error('Refresh token error:', error);
      throw error;
    }
  }

  /**
   * Logout (revoke session)
   */
  async logout(refreshToken: string, auditContext?: { ip_address?: string; user_agent?: string }): Promise<void> {
    try {
      const { db } = getDatabase();
      
      // Find and revoke session
      const result = await db
        .update(auth_session)
        .set({ revoked: true })
        .where(eq(auth_session.refresh_token, refreshToken))
        .returning({ user_id: auth_session.user_id });

      if (result.length > 0) {
        await this.logAuditEvent({
          user_id: result[0].user_id,
          event: 'logout_success',
          ip_address: auditContext?.ip_address,
          user_agent: auditContext?.user_agent
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<AuthUser | null> {
    try {
      const { db } = getDatabase();
      
      const result = await db.select().from(auth_user).where(eq(auth_user.id, userId)).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error('Get user error:', error);
      throw error;
    }
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): { userId: string; valid: boolean } {
    try {
      const decoded = jwt.verify(token, getJWTSecret()) as JWTPayload;
      return { userId: decoded.sub, valid: true };
    } catch (error) {
      return { userId: '', valid: false };
    }
  }

  /**
   * Change password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string, auditContext?: { ip_address?: string; user_agent?: string }): Promise<void> {
    try {
      const { db } = getDatabase();
      
      // Verify current password
      const result = await db
        .select({ credential: auth_credential })
        .from(auth_credential)
        .where(eq(auth_credential.user_id, userId))
        .limit(1);

      if (result.length === 0) {
        throw new Error('User not found');
      }

      const passwordValid = await argon2.verify(result[0].credential.password_hash, currentPassword);
      if (!passwordValid) {
        await this.logAuditEvent({
          user_id: userId,
          event: 'password_change_failed_invalid_current',
          ip_address: auditContext?.ip_address,
          user_agent: auditContext?.user_agent
        });
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await argon2.hash(newPassword, { 
        type: argon2.argon2id,
        memoryCost: 2 ** 16,
        timeCost: 3,
        parallelism: 1
      });

      // Update password
      await db
        .update(auth_credential)
        .set({ 
          password_hash: newPasswordHash,
          password_algo: 'argon2id'
        })
        .where(eq(auth_credential.user_id, userId));

      // Log successful password change
      await this.logAuditEvent({
        user_id: userId,
        event: 'password_change_success',
        ip_address: auditContext?.ip_address,
        user_agent: auditContext?.user_agent
      });

      // Revoke all sessions except current one (force re-login)
      await db
        .update(auth_session)
        .set({ revoked: true })
        .where(eq(auth_session.user_id, userId));

    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (client) {
      await client.end();
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
