import { pgTable, text, timestamp, uuid, decimal, integer, boolean, jsonb } from 'drizzle-orm/pg-core';
import { players, games, playerProps } from './index';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

export const playerAnalytics = pgTable('player_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  playerId: uuid('player_id').references(() => players.id).notNull(),
  gameId: uuid('game_id').references(() => games.id).notNull(),
  propId: uuid('prop_id').references(() => playerProps.id),
  // Performance metrics
  actualValue: decimal('actual_value', { precision: 8, scale: 2 }),
  propLine: decimal('prop_line', { precision: 8, scale: 2 }),
  result: text('result'), // 'over', 'under', 'push'
  margin: decimal('margin', { precision: 8, scale: 2 }), // actual - line
  // Contextual data
  minutesPlayed: decimal('minutes_played', { precision: 4, scale: 1 }),
  usageRate: decimal('usage_rate', { precision: 5, scale: 2 }),
  pace: decimal('pace', { precision: 5, scale: 2 }),
  teamScore: integer('team_score'),
  opponentScore: integer('opponent_score'),
  // Advanced analytics
  efficiency: decimal('efficiency', { precision: 5, scale: 2 }),
  trueShooting: decimal('true_shooting', { precision: 5, scale: 2 }),
  plusMinus: integer('plus_minus'),
  // Metadata
  isHome: boolean('is_home'),
  restDays: integer('rest_days'),
  injuryStatus: text('injury_status'),
  weatherConditions: text('weather_conditions'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const playerStreaks = pgTable('player_streaks', {
  id: uuid('id').primaryKey().defaultRandom(),
  playerId: uuid('player_id').references(() => players.id).notNull(),
  propTypeId: text('prop_type_id').notNull(), // references prop_types.name
  // Streak data
  currentStreak: integer('current_streak').default(0),
  longestStreak: integer('longest_streak').default(0),
  streakType: text('streak_type').notNull(), // 'over', 'under'
  gamesInStreak: integer('games_in_streak').default(0),
  streakStartDate: timestamp('streak_start_date', { withTimezone: true }),
  streakEndDate: timestamp('streak_end_date', { withTimezone: true }),
  // Performance during streak
  avgMargin: decimal('avg_margin', { precision: 8, scale: 2 }),
  totalMargin: decimal('total_margin', { precision: 8, scale: 2 }),
  // Context
  season: text('season').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const teamAnalytics = pgTable('team_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').notNull(),
  gameId: uuid('game_id').references(() => games.id).notNull(),
  season: text('season').notNull(),
  // Team performance
  pace: decimal('pace', { precision: 5, scale: 2 }),
  offensiveRating: decimal('offensive_rating', { precision: 8, scale: 2 }),
  defensiveRating: decimal('defensive_rating', { precision: 8, scale: 2 }),
  netRating: decimal('net_rating', { precision: 8, scale: 2 }),
  // Game context
  isHome: boolean('is_home'),
  restDays: integer('rest_days'),
  backToBack: boolean('back_to_back').default(false),
  // Advanced metrics
  turnoverRate: decimal('turnover_rate', { precision: 5, scale: 2 }),
  reboundRate: decimal('rebound_rate', { precision: 5, scale: 2 }),
  assistRate: decimal('assist_rate', { precision: 5, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const propAnalytics = pgTable('prop_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  propTypeId: text('prop_type_id').notNull(),
  playerId: uuid('player_id').references(() => players.id).notNull(),
  season: text('season').notNull(),
  // Historical performance
  totalGames: integer('total_games').default(0),
  overHits: integer('over_hits').default(0),
  underHits: integer('under_hits').default(0),
  pushes: integer('pushes').default(0),
  hitRate: decimal('hit_rate', { precision: 5, scale: 2 }),
  overRate: decimal('over_rate', { precision: 5, scale: 2 }),
  underRate: decimal('under_rate', { precision: 5, scale: 2 }),
  // Value metrics
  avgMargin: decimal('avg_margin', { precision: 8, scale: 2 }),
  totalMargin: decimal('total_margin', { precision: 8, scale: 2 }),
  avgActualValue: decimal('avg_actual_value', { precision: 8, scale: 2 }),
  // Streak data
  currentOverStreak: integer('current_over_streak').default(0),
  currentUnderStreak: integer('current_under_streak').default(0),
  longestOverStreak: integer('longest_over_streak').default(0),
  longestUnderStreak: integer('longest_under_streak').default(0),
  // Context splits
  homeHitRate: decimal('home_hit_rate', { precision: 5, scale: 2 }),
  awayHitRate: decimal('away_hit_rate', { precision: 5, scale: 2 }),
  vsConferenceHitRate: decimal('vs_conference_hit_rate', { precision: 5, scale: 2 }),
  vsDivisionHitRate: decimal('vs_division_hit_rate', { precision: 5, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const playerAnalyticsRelations = relations(playerAnalytics, ({ one }) => ({
  player: one(players, {
    fields: [playerAnalytics.playerId],
    references: [players.id],
  }),
  game: one(games, {
    fields: [playerAnalytics.gameId],
    references: [games.id],
  }),
  prop: one(playerProps, {
    fields: [playerAnalytics.propId],
    references: [playerProps.id],
  }),
}));

export const playerStreaksRelations = relations(playerStreaks, ({ one }) => ({
  player: one(players, {
    fields: [playerStreaks.playerId],
    references: [players.id],
  }),
}));

export type PlayerAnalytic = typeof playerAnalytics.$inferSelect;
export type NewPlayerAnalytic = typeof playerAnalytics.$inferInsert;
export type PlayerStreak = typeof playerStreaks.$inferSelect;
export type NewPlayerStreak = typeof playerStreaks.$inferInsert;
export type TeamAnalytic = typeof teamAnalytics.$inferSelect;
export type NewTeamAnalytic = typeof teamAnalytics.$inferInsert;
export type PropAnalytic = typeof propAnalytics.$inferSelect;
export type NewPropAnalytic = typeof propAnalytics.$inferInsert;

export const insertPlayerAnalyticSchema = createInsertSchema(playerAnalytics);
export const selectPlayerAnalyticSchema = createSelectSchema(playerAnalytics);
export const insertPlayerStreakSchema = createInsertSchema(playerStreaks);
export const selectPlayerStreakSchema = createSelectSchema(playerStreaks);
export const insertTeamAnalyticSchema = createInsertSchema(teamAnalytics);
export const selectTeamAnalyticSchema = createSelectSchema(teamAnalytics);
export const insertPropAnalyticSchema = createInsertSchema(propAnalytics);
export const selectPropAnalyticSchema = createSelectSchema(propAnalytics);
