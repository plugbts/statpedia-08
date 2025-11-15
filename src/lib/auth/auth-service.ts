import { randomBytes, createHash } from "crypto";
import argon2 from "argon2";
import jwt, { type SignOptions } from "jsonwebtoken";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import {
  auth_audit,
  auth_credential,
  auth_session,
  auth_user,
  auth_verification_token,
} from "../../db/schema/auth";
import { generateUsername } from "../../utils/username-generator";

// Types
export interface AuthUser {
  id: string;
  email: string;
  email_verified: boolean;
  display_name?: string;
  username?: string;
  subscription_tier?: string;
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

// Env/config
const JWT_EXPIRES_IN: SignOptions["expiresIn"] = (process.env.JWT_EXPIRES_IN as any) || "15m";
const REFRESH_TOKEN_EXPIRES_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || "30", 10);

function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET is not set. Create a .env.local file and add JWT_SECRET=your-secret (and NEON_DATABASE_URL or DATABASE_URL).",
    );
  }
  return secret;
}

// Database connection - lazy singleton
let client: postgres.Sql | null = null;
let db: ReturnType<typeof drizzle> | null = null;

function getDatabase() {
  if (!client || !db) {
    const DATABASE_URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
    if (!DATABASE_URL) {
      throw new Error(
        "Database connection string not set. Add NEON_DATABASE_URL (preferred) or DATABASE_URL to .env.local.",
      );
    }
    // Add connection timeout and query timeout to prevent hanging
    client = postgres(DATABASE_URL, {
      prepare: false,
      connect_timeout: 10, // 10 seconds to connect
      idle_timeout: 20, // 20 seconds idle before closing connection
      max_lifetime: 60 * 30, // 30 minutes max connection lifetime
      statement_timeout: 5000, // 5 seconds per query
      max: 10, // max 10 connections in pool
    });
    db = drizzle(client);
  }
  return { client: client!, db: db! };
}

// JWT Claims for Hasura
interface HasuraClaims {
  "x-hasura-default-role": string;
  "x-hasura-allowed-roles": string[];
  "x-hasura-user-id": string;
  "x-hasura-display-name"?: string;
  "x-hasura-username"?: string;
}

interface JWTPayload {
  sub: string;
  "https://hasura.io/jwt/claims": HasuraClaims;
}

export class AuthService {
  // Compute SHA-256 hex hash (to match Cloudflare worker implementation)
  private hashPasswordSha256(password: string): string {
    return createHash("sha256").update(password).digest("hex");
  }

  // Generate JWT token with Hasura claims
  private generateJWT(
    user: AuthUser | { id: string; display_name?: string; username?: string },
    role: string = "user",
  ): string {
    const userId = typeof (user as any) === "string" ? (user as any as string) : (user as any).id;
    const displayName = (user as any).display_name as string | undefined;
    const username = (user as any).username as string | undefined;

    const payload: JWTPayload = {
      sub: userId,
      "https://hasura.io/jwt/claims": {
        "x-hasura-default-role": role,
        "x-hasura-allowed-roles": [role, "admin"],
        "x-hasura-user-id": userId,
        ...(displayName ? { "x-hasura-display-name": displayName } : {}),
        ...(username ? { "x-hasura-username": username } : {}),
      },
    };

    const options: SignOptions = { algorithm: "HS256", expiresIn: JWT_EXPIRES_IN };
    return jwt.sign(payload as any, getJWTSecret(), options);
  }

  // Generate refresh token
  private generateRefreshToken(): string {
    return randomBytes(32).toString("hex");
  }

  // Audit log helper
  private async logAuditEvent(event: AuditEvent): Promise<void> {
    try {
      const { db } = getDatabase();
      await db.insert(auth_audit).values({
        user_id: event.user_id,
        event: event.event,
        ip_address: event.ip_address,
        user_agent: event.user_agent,
        metadata: event.metadata,
      });
    } catch (error) {
      console.error("Failed to log audit event:", error);
    }
  }

  // Cleanup expired sessions and tokens
  private async cleanupExpiredTokens(): Promise<void> {
    try {
      const { db } = getDatabase();
      const now = new Date();
      // Defensive: ensure expires_at is always a Date for comparison
      await db.delete(auth_session).where(
        lt(
          // @ts-ignore drizzle may pass string, so coerce
          typeof auth_session.expires_at === "string"
            ? new Date(auth_session.expires_at as any)
            : auth_session.expires_at,
          now,
        ),
      );
      await db.delete(auth_verification_token).where(
        lt(
          // @ts-ignore drizzle may pass string, so coerce
          typeof auth_verification_token.expires_at === "string"
            ? new Date(auth_verification_token.expires_at as any)
            : auth_verification_token.expires_at,
          now,
        ),
      );
    } catch (error) {
      console.error("Failed to cleanup expired tokens:", error);
    }
  }

  // Signup
  async signup(
    data: SignupData,
    auditContext?: { ip_address?: string; user_agent?: string },
  ): Promise<AuthTokens> {
    try {
      const { db } = getDatabase();

      // Check if user already exists
      const existingUser = await db
        .select()
        .from(auth_user)
        .where(eq(auth_user.email, data.email))
        .limit(1);

      if (existingUser.length > 0) {
        await this.logAuditEvent({
          event: "signup_failed_email_exists",
          ip_address: auditContext?.ip_address,
          user_agent: auditContext?.user_agent,
          metadata: { email: data.email },
        });
        throw new Error("Email already in use");
      }

      // Hash password using SHA-256 (compat with worker)
      const passwordHash = this.hashPasswordSha256(data.password);

      // Generate unique username if not provided
      let username = data.username;
      if (!username) {
        let attempts = 0;
        do {
          username = generateUsername();
          const existingUsername = await db
            .select()
            .from(auth_user)
            .where(eq(auth_user.username, username))
            .limit(1);
          if (existingUsername.length === 0) break;
          attempts++;
        } while (attempts < 10);
        if (attempts >= 10) {
          throw new Error("Unable to generate unique username. Please try again.");
        }
      }

      // Create user
      const [user] = await db
        .insert(auth_user)
        .values({
          email: data.email,
          display_name: data.display_name,
          username,
          subscription_tier: "free",
          email_verified: false,
        })
        .returning();

      // Store credentials
      await db.insert(auth_credential).values({
        user_id: user.id,
        password_hash: passwordHash,
        password_algo: "sha256",
      });

      // Generate tokens
      const token = this.generateJWT(user);
      const refreshToken = this.generateRefreshToken();

      // Store session
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);

      await db.insert(auth_session).values({
        user_id: user.id,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        ip_address: auditContext?.ip_address,
        user_agent: auditContext?.user_agent,
      });

      // Log successful signup
      await this.logAuditEvent({
        user_id: user.id,
        event: "signup_success",
        ip_address: auditContext?.ip_address,
        user_agent: auditContext?.user_agent,
        metadata: { email: data.email },
      });

      await this.cleanupExpiredTokens();

      return { token, refreshToken };
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    }
  }

  // Login
  async login(
    data: LoginData,
    auditContext?: { ip_address?: string; user_agent?: string },
  ): Promise<AuthTokens> {
    try {
      const { db } = getDatabase();

      const result = await db
        .select({ user: auth_user, credential: auth_credential })
        .from(auth_user)
        .innerJoin(auth_credential, eq(auth_user.id, auth_credential.user_id))
        .where(eq(auth_user.email, data.email))
        .limit(1);

      const row = result[0];

      if (!row || row.user.disabled) {
        await this.logAuditEvent({
          event: "login_failed_invalid_credentials",
          ip_address: auditContext?.ip_address,
          user_agent: auditContext?.user_agent,
          metadata: { email: data.email },
        });
        throw new Error("Invalid credentials");
      }

      // Verify password depending on stored algorithm
      let passwordValid = false;
      const algo = row.credential.password_algo || "argon2id";
      if (algo.toLowerCase().startsWith("argon2")) {
        try {
          passwordValid = await argon2.verify(row.credential.password_hash, data.password);
        } catch {
          passwordValid = false;
        }
      } else {
        const hashed = this.hashPasswordSha256(data.password);
        passwordValid = hashed === row.credential.password_hash;
      }

      if (!passwordValid) {
        await this.logAuditEvent({
          user_id: row.user.id,
          event: "login_failed_invalid_password",
          ip_address: auditContext?.ip_address,
          user_agent: auditContext?.user_agent,
          metadata: { email: data.email },
        });
        throw new Error("Invalid credentials");
      }

      const token = this.generateJWT(row.user);
      const refreshToken = this.generateRefreshToken();

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);

      await db.insert(auth_session).values({
        user_id: row.user.id,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        ip_address: auditContext?.ip_address,
        user_agent: auditContext?.user_agent,
      });

      await this.logAuditEvent({
        user_id: row.user.id,
        event: "login_success",
        ip_address: auditContext?.ip_address,
        user_agent: auditContext?.user_agent,
        metadata: { email: data.email },
      });

      await this.cleanupExpiredTokens();

      return { token, refreshToken };
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  // Refresh access token
  async refreshToken(
    data: RefreshData,
    auditContext?: { ip_address?: string; user_agent?: string },
  ): Promise<{ token: string }> {
    try {
      const { db } = getDatabase();

      const result = await db
        .select({ session: auth_session, user: auth_user })
        .from(auth_session)
        .innerJoin(auth_user, eq(auth_session.user_id, auth_user.id))
        .where(
          and(
            eq(auth_session.refresh_token, data.refreshToken),
            eq(auth_session.revoked, false),
            gt(auth_session.expires_at, new Date()),
          ),
        )
        .limit(1);

      const row = result[0];

      if (!row || row.user.disabled) {
        await this.logAuditEvent({
          event: "refresh_failed_invalid_token",
          ip_address: auditContext?.ip_address,
          user_agent: auditContext?.user_agent,
          metadata: { refresh_token: data.refreshToken.substring(0, 8) + "..." },
        });
        throw new Error("Invalid refresh token");
      }

      const token = this.generateJWT(row.user);

      await this.logAuditEvent({
        user_id: row.user.id,
        event: "token_refresh_success",
        ip_address: auditContext?.ip_address,
        user_agent: auditContext?.user_agent,
      });

      return { token };
    } catch (error) {
      console.error("Refresh token error:", error);
      throw error;
    }
  }

  // Send email verification code
  async sendEmailVerificationCode(
    email: string,
    purpose: "email_change" | "password_change",
    auditContext?: { ip_address?: string; user_agent?: string },
  ): Promise<void> {
    try {
      const { db } = getDatabase();

      const user = await db.select().from(auth_user).where(eq(auth_user.email, email)).limit(1);
      if (user.length === 0) {
        throw new Error("User not found");
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await db.insert(auth_verification_token).values({
        id: randomBytes(16).toString("hex"),
        user_id: user[0].id,
        token: code,
        type: purpose,
        expires_at: expiresAt,
        created_at: new Date(),
        used: false,
      });

      await this.logAuditEvent({
        user_id: user[0].id,
        event: "email_verification_sent",
        ip_address: auditContext?.ip_address,
        user_agent: auditContext?.user_agent,
      });

      console.log(`Email verification code for ${email}: ${code}`);
    } catch (error) {
      console.error("Send email verification error:", error);
      throw error;
    }
  }

  // Verify email code
  async verifyEmailCode(
    email: string,
    code: string,
    purpose: "email_change" | "password_change",
  ): Promise<boolean> {
    try {
      const { db } = getDatabase();

      const user = await db.select().from(auth_user).where(eq(auth_user.email, email)).limit(1);
      if (user.length === 0) {
        throw new Error("User not found");
      }

      const token = await db
        .select()
        .from(auth_verification_token)
        .where(
          and(
            eq(auth_verification_token.user_id, user[0].id),
            eq(auth_verification_token.token, code),
            eq(auth_verification_token.type, purpose),
            eq(auth_verification_token.used, false),
            gt(auth_verification_token.expires_at, new Date()),
          ),
        )
        .limit(1);

      if (token.length === 0) {
        throw new Error("Invalid or expired verification code");
      }

      await db
        .update(auth_verification_token)
        .set({ used: true })
        .where(eq(auth_verification_token.id, token[0].id));

      return true;
    } catch (error) {
      console.error("Verify email code error:", error);
      throw error;
    }
  }

  // Update user password
  async updatePassword(
    userId: string,
    newPassword: string,
    auditContext?: { ip_address?: string; user_agent?: string },
  ): Promise<void> {
    try {
      const { db } = getDatabase();

      const hashedPassword = this.hashPasswordSha256(newPassword);

      await db
        .update(auth_credential)
        .set({ password_hash: hashedPassword, password_algo: "sha256" })
        .where(eq(auth_credential.user_id, userId));

      await this.logAuditEvent({
        user_id: userId,
        event: "password_updated",
        ip_address: auditContext?.ip_address,
        user_agent: auditContext?.user_agent,
      });
    } catch (error) {
      console.error("Update password error:", error);
      throw error;
    }
  }

  // Update user email
  async updateEmail(
    userId: string,
    newEmail: string,
    auditContext?: { ip_address?: string; user_agent?: string },
  ): Promise<void> {
    try {
      const { db } = getDatabase();

      const existingUser = await db
        .select()
        .from(auth_user)
        .where(eq(auth_user.email, newEmail))
        .limit(1);
      if (existingUser.length > 0) {
        throw new Error("Email already in use");
      }

      await db
        .update(auth_user)
        .set({ email: newEmail, updated_at: new Date() })
        .where(eq(auth_user.id, userId));

      await this.logAuditEvent({
        user_id: userId,
        event: "email_updated",
        ip_address: auditContext?.ip_address,
        user_agent: auditContext?.user_agent,
      });
    } catch (error) {
      console.error("Update email error:", error);
      throw error;
    }
  }

  // Update user profile
  async updateUserProfile(
    userId: string,
    updates: { display_name?: string; username?: string },
    auditContext?: { ip_address?: string; user_agent?: string },
  ): Promise<void> {
    try {
      const { db } = getDatabase();

      if (updates.username) {
        const existingUser = await db
          .select()
          .from(auth_user)
          .where(eq(auth_user.username, updates.username))
          .limit(1);
        if (existingUser.length > 0 && existingUser[0].id !== userId) {
          throw new Error("Username already in use");
        }
      }

      await db
        .update(auth_user)
        .set({ ...updates, updated_at: new Date() })
        .where(eq(auth_user.id, userId));

      await this.logAuditEvent({
        user_id: userId,
        event: "profile_updated",
        ip_address: auditContext?.ip_address,
        user_agent: auditContext?.user_agent,
      });
    } catch (error) {
      console.error("Update user profile error:", error);
      throw error;
    }
  }

  // Get user role
  async getUserRole(userId: string): Promise<string> {
    try {
      const { db } = getDatabase();

      const result = await db.execute(
        sql`SELECT role FROM user_roles WHERE user_id = ${userId} LIMIT 1`,
      );
      // drizzle execute returns any; coerce safely
      const rows = result as unknown as Array<{ role: string }>;
      return rows && rows.length > 0 ? rows[0].role : "user";
    } catch (error) {
      console.error("Get user role error:", error);
      return "user";
    }
  }

  // Logout (revoke session)
  async logout(
    refreshToken: string,
    auditContext?: { ip_address?: string; user_agent?: string },
  ): Promise<void> {
    try {
      const { db } = getDatabase();

      const result = await db
        .update(auth_session)
        .set({ revoked: true })
        .where(eq(auth_session.refresh_token, refreshToken))
        .returning({ user_id: auth_session.user_id });

      if (result.length > 0) {
        await this.logAuditEvent({
          user_id: result[0].user_id,
          event: "logout_success",
          ip_address: auditContext?.ip_address,
          user_agent: auditContext?.user_agent,
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  }

  // Get user by ID
  async getUserById(userId: string): Promise<AuthUser | null> {
    try {
      const { db } = getDatabase();
      const result = await db.select().from(auth_user).where(eq(auth_user.id, userId)).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error("Get user error:", error);
      throw error;
    }
  }

  // Update subscription tier
  async updateSubscriptionTier(userId: string, tier: "free" | "pro" | "premium" | "free_trial") {
    try {
      const { db } = getDatabase();
      await db
        .update(auth_user)
        .set({ subscription_tier: tier as any, updated_at: new Date() })
        .where(eq(auth_user.id, userId));
    } catch (error) {
      console.error("Update subscription tier error:", error);
      throw error;
    }
  }

  // Verify JWT token
  verifyToken(token: string): { userId: string; valid: boolean } {
    try {
      const decoded = jwt.verify(token, getJWTSecret()) as JWTPayload;
      return { userId: decoded.sub, valid: true };
    } catch (error) {
      return { userId: "", valid: false };
    }
  }

  // Change password (legacy argon2-compatible)
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    auditContext?: { ip_address?: string; user_agent?: string },
  ): Promise<void> {
    try {
      const { db } = getDatabase();

      const result = await db
        .select({ credential: auth_credential })
        .from(auth_credential)
        .where(eq(auth_credential.user_id, userId))
        .limit(1);

      if (result.length === 0) {
        throw new Error("User not found");
      }

      const cred = result[0].credential;

      let valid = false;
      const algo = cred.password_algo || "argon2id";
      if (algo.toLowerCase().startsWith("argon2")) {
        try {
          valid = await argon2.verify(cred.password_hash, currentPassword);
        } catch {
          valid = false;
        }
      } else {
        valid = this.hashPasswordSha256(currentPassword) === cred.password_hash;
      }

      if (!valid) {
        await this.logAuditEvent({
          user_id: userId,
          event: "password_change_failed_invalid_current",
          ip_address: auditContext?.ip_address,
          user_agent: auditContext?.user_agent,
        });
        throw new Error("Current password is incorrect");
      }

      const newHash = this.hashPasswordSha256(newPassword);

      await db
        .update(auth_credential)
        .set({ password_hash: newHash, password_algo: "sha256" })
        .where(eq(auth_credential.user_id, userId));

      await this.logAuditEvent({
        user_id: userId,
        event: "password_change_success",
        ip_address: auditContext?.ip_address,
        user_agent: auditContext?.user_agent,
      });

      await db.update(auth_session).set({ revoked: true }).where(eq(auth_session.user_id, userId));
    } catch (error) {
      console.error("Change password error:", error);
      throw error;
    }
  }

  // Close database connection
  async close(): Promise<void> {
    if (client) {
      await client.end();
    }
  }
}

export const authService = new AuthService();
