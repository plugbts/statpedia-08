import { pgTable, text, timestamp, uuid, boolean, integer, decimal, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

// User profiles table
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique(), // References auth.users(id)
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  email: text('email'),
  // Subscription management
  subscriptionTier: text('subscription_tier').default('free'), // 'free', 'premium', 'pro'
  subscriptionStartDate: timestamp('subscription_start_date', { withTimezone: true }),
  subscriptionEndDate: timestamp('subscription_end_date', { withTimezone: true }),
  hasUsedTrial: boolean('has_used_trial').default(false),
  trialStartDate: timestamp('trial_start_date', { withTimezone: true }),
  trialEndDate: timestamp('trial_end_date', { withTimezone: true }),
  // Payment info
  stripeCustomerId: text('stripe_customer_id'),
  paypalCustomerId: text('paypal_customer_id'),
  // User stats
  bankroll: decimal('bankroll', { precision: 10, scale: 2 }).default('0'),
  totalBets: integer('total_bets').default(0),
  wonBets: integer('won_bets').default(0),
  totalPredictions: integer('total_predictions').default(0),
  wonPredictions: integer('won_predictions').default(0),
  karma: integer('karma').default(0),
  // Preferences
  roiVisible: boolean('roi_visible').default(true),
  isMuted: boolean('is_muted').default(false),
  pushNotificationsEnabled: boolean('push_notifications_enabled').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Promo codes table
export const promoCodes = pgTable('promo_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  description: text('description'),
  discountType: text('discount_type').notNull(), // 'percentage', 'free_trial'
  discountValue: decimal('discount_value', { precision: 5, scale: 2 }),
  trialDays: integer('trial_days'),
  usageLimit: integer('usage_limit'),
  usedCount: integer('used_count').default(0),
  isActive: boolean('is_active').default(true),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdBy: uuid('created_by'), // References auth.users(id)
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Promo code usage history
export const promoCodeUsage = pgTable('promo_code_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  promoCodeId: uuid('promo_code_id').references(() => promoCodes.id).notNull(),
  userId: uuid('user_id').notNull(), // References auth.users(id)
  usedAt: timestamp('used_at', { withTimezone: true }).defaultNow(),
});

// Social posts table
export const socialPosts = pgTable('social_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(), // References auth.users(id)
  content: text('content').notNull(),
  upvotes: integer('upvotes').default(0),
  downvotes: integer('downvotes').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Comments table
export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(), // References auth.users(id)
  propId: text('prop_id'),
  predictionId: text('prediction_id'),
  postId: uuid('post_id').references(() => socialPosts.id),
  content: text('content').notNull(),
  upvotes: integer('upvotes').default(0),
  downvotes: integer('downvotes').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// User predictions table
export const userPredictions = pgTable('user_predictions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(), // References auth.users(id)
  propId: text('prop_id').notNull(),
  prediction: text('prediction').notNull(), // 'over', 'under'
  isCorrect: boolean('is_correct'),
  gameDate: timestamp('game_date', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Bet tracking table
export const betTracking = pgTable('bet_tracking', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(), // References auth.users(id)
  betType: text('bet_type').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  odds: text('odds'),
  legsTotal: integer('legs_total'),
  legsHit: integer('legs_hit').default(0),
  status: text('status').default('pending'), // 'pending', 'won', 'lost', 'active'
  payout: decimal('payout', { precision: 10, scale: 2 }),
  sportsbook: text('sportsbook'),
  placedAt: timestamp('placed_at', { withTimezone: true }).defaultNow(),
  settledAt: timestamp('settled_at', { withTimezone: true }),
});

// Friendships table
export const friendships = pgTable('friendships', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(), // References auth.users(id)
  friendId: uuid('friend_id').notNull(), // References auth.users(id)
  status: text('status').default('pending'), // 'pending', 'accepted', 'blocked'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Votes table for posts and comments
export const votes = pgTable('votes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(), // References auth.users(id)
  postId: uuid('post_id').references(() => socialPosts.id),
  commentId: uuid('comment_id').references(() => comments.id),
  voteType: text('vote_type').notNull(), // 'upvote', 'downvote'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// User roles table
export const userRoles = pgTable('user_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(), // References auth.users(id)
  role: text('role').notNull().default('user'), // 'admin', 'moderator', 'user'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Relations
export const profilesRelations = relations(profiles, ({ many }) => ({
  socialPosts: many(socialPosts),
  comments: many(comments),
  predictions: many(userPredictions),
  bets: many(betTracking),
}));

export const socialPostsRelations = relations(socialPosts, ({ one, many }) => ({
  user: one(profiles, {
    fields: [socialPosts.userId],
    references: [profiles.userId],
  }),
  comments: many(comments),
  votes: many(votes),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  user: one(profiles, {
    fields: [comments.userId],
    references: [profiles.userId],
  }),
  post: one(socialPosts, {
    fields: [comments.postId],
    references: [socialPosts.id],
  }),
  votes: many(votes),
}));

export const userPredictionsRelations = relations(userPredictions, ({ one }) => ({
  user: one(profiles, {
    fields: [userPredictions.userId],
    references: [profiles.userId],
  }),
}));

export const betTrackingRelations = relations(betTracking, ({ one }) => ({
  user: one(profiles, {
    fields: [betTracking.userId],
    references: [profiles.userId],
  }),
}));

export const friendshipsRelations = relations(friendships, ({ one }) => ({
  user: one(profiles, {
    fields: [friendships.userId],
    references: [profiles.userId],
  }),
  friend: one(profiles, {
    fields: [friendships.friendId],
    references: [profiles.userId],
  }),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  user: one(profiles, {
    fields: [votes.userId],
    references: [profiles.userId],
  }),
  post: one(socialPosts, {
    fields: [votes.postId],
    references: [socialPosts.id],
  }),
  comment: one(comments, {
    fields: [votes.commentId],
    references: [comments.id],
  }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(profiles, {
    fields: [userRoles.userId],
    references: [profiles.userId],
  }),
}));

// Types
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type PromoCode = typeof promoCodes.$inferSelect;
export type NewPromoCode = typeof promoCodes.$inferInsert;
export type PromoCodeUsage = typeof promoCodeUsage.$inferSelect;
export type NewPromoCodeUsage = typeof promoCodeUsage.$inferInsert;
export type SocialPost = typeof socialPosts.$inferSelect;
export type NewSocialPost = typeof socialPosts.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type UserPrediction = typeof userPredictions.$inferSelect;
export type NewUserPrediction = typeof userPredictions.$inferInsert;
export type BetTracking = typeof betTracking.$inferSelect;
export type NewBetTracking = typeof betTracking.$inferInsert;
export type Friendship = typeof friendships.$inferSelect;
export type NewFriendship = typeof friendships.$inferInsert;
export type Vote = typeof votes.$inferSelect;
export type NewVote = typeof votes.$inferInsert;
export type UserRole = typeof userRoles.$inferSelect;
export type NewUserRole = typeof userRoles.$inferInsert;

// Zod schemas
export const insertProfileSchema = createInsertSchema(profiles);
export const selectProfileSchema = createSelectSchema(profiles);
export const insertPromoCodeSchema = createInsertSchema(promoCodes);
export const selectPromoCodeSchema = createSelectSchema(promoCodes);
export const insertSocialPostSchema = createInsertSchema(socialPosts);
export const selectSocialPostSchema = createSelectSchema(socialPosts);
export const insertCommentSchema = createInsertSchema(comments);
export const selectCommentSchema = createSelectSchema(comments);
export const insertUserPredictionSchema = createInsertSchema(userPredictions);
export const selectUserPredictionSchema = createSelectSchema(userPredictions);
export const insertBetTrackingSchema = createInsertSchema(betTracking);
export const selectBetTrackingSchema = createSelectSchema(betTracking);
export const insertFriendshipSchema = createInsertSchema(friendships);
export const selectFriendshipSchema = createSelectSchema(friendships);
export const insertVoteSchema = createInsertSchema(votes);
export const selectVoteSchema = createSelectSchema(votes);
export const insertUserRoleSchema = createInsertSchema(userRoles);
export const selectUserRoleSchema = createSelectSchema(userRoles);
