import { pgTable, uuid, text, boolean, timestamp, jsonb, bigserial, integer, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Auth Users table
export const auth_user = pgTable('auth_user', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  email_verified: boolean('email_verified').notNull().default(false),
  display_name: text('display_name'),
  username: text('username').unique(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  disabled: boolean('disabled').notNull().default(false)
});

// Auth Credentials table (password-based auth)
export const auth_credential = pgTable('auth_credential', {
  user_id: uuid('user_id').primaryKey().references(() => auth_user.id, { onDelete: 'cascade' }),
  password_hash: text('password_hash').notNull(),
  password_algo: text('password_algo').notNull().default('argon2id'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// Auth Identity table (OAuth providers)
export const auth_identity = pgTable('auth_identity', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => auth_user.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(), // 'google', 'github', 'discord', etc.
  provider_user_id: text('provider_user_id').notNull(),
  provider_data: jsonb('provider_data'), // Store provider-specific data
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  // Unique constraint on provider + provider_user_id
  providerUnique: unique().on(table.provider, table.provider_user_id)
}));

// Auth Sessions table (refresh tokens)
export const auth_session = pgTable('auth_session', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => auth_user.id, { onDelete: 'cascade' }),
  refresh_token: text('refresh_token').notNull().unique(),
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  revoked: boolean('revoked').notNull().default(false),
  ip_address: text('ip_address'),
  user_agent: text('user_agent')
});

// Auth Audit table (security logging)
export const auth_audit = pgTable('auth_audit', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  user_id: uuid('user_id').references(() => auth_user.id, { onDelete: 'set null' }),
  event: text('event').notNull(), // 'signup', 'login_success', 'login_failed', etc.
  ip_address: text('ip_address'),
  user_agent: text('user_agent'),
  metadata: jsonb('metadata'), // Additional event data
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// Auth Verification Token table (email verification, password reset)
export const auth_verification_token = pgTable('auth_verification_token', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => auth_user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  type: text('type').notNull(), // 'email_verification', 'password_reset'
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  used: boolean('used').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// Relations
export const authUserRelations = relations(auth_user, ({ one, many }) => ({
  credential: one(auth_credential),
  identities: many(auth_identity),
  sessions: many(auth_session),
  auditLogs: many(auth_audit),
  verificationTokens: many(auth_verification_token)
}));

export const authCredentialRelations = relations(auth_credential, ({ one }) => ({
  user: one(auth_user, {
    fields: [auth_credential.user_id],
    references: [auth_user.id]
  })
}));

export const authIdentityRelations = relations(auth_identity, ({ one }) => ({
  user: one(auth_user, {
    fields: [auth_identity.user_id],
    references: [auth_user.id]
  })
}));

export const authSessionRelations = relations(auth_session, ({ one }) => ({
  user: one(auth_user, {
    fields: [auth_session.user_id],
    references: [auth_user.id]
  })
}));

export const authAuditRelations = relations(auth_audit, ({ one }) => ({
  user: one(auth_user, {
    fields: [auth_audit.user_id],
    references: [auth_user.id]
  })
}));

export const authVerificationTokenRelations = relations(auth_verification_token, ({ one }) => ({
  user: one(auth_user, {
    fields: [auth_verification_token.user_id],
    references: [auth_user.id]
  })
}));
