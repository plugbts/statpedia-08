import { pgTable, text, timestamp, uuid, decimal, integer, boolean, varchar } from 'drizzle-orm/pg-core';
import { players, games } from './index';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

export const propTypes = pgTable('prop_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  category: text('category').notNull(), // 'scoring', 'assists', 'rebounds', 'defense', etc.
  sport: text('sport').notNull(), // 'nba', 'nfl', 'mlb', 'nhl'
  unit: text('unit'), // 'points', 'rebounds', 'yards', 'seconds'
  isOverUnder: boolean('is_over_under').default(true),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const playerProps = pgTable('player_props', {
  id: uuid('id').primaryKey().defaultRandom(),
  playerId: uuid('player_id').references(() => players.id).notNull(),
  gameId: uuid('game_id').references(() => games.id).notNull(),
  propTypeId: uuid('prop_type_id').references(() => propTypes.id).notNull(),
  // Prop details
  line: decimal('line', { precision: 8, scale: 2 }).notNull(),
  odds: varchar('odds', { length: 10 }), // '+110', '-120', etc.
  overOdds: varchar('over_odds', { length: 10 }),
  underOdds: varchar('under_odds', { length: 10 }),
  // Analytics
  hitRate: decimal('hit_rate', { precision: 5, scale: 2 }), // percentage
  gamesTracked: integer('games_tracked').default(0),
  avgActualValue: decimal('avg_actual_value', { precision: 8, scale: 2 }),
  last10Avg: decimal('last_10_avg', { precision: 8, scale: 2 }),
  seasonAvg: decimal('season_avg', { precision: 8, scale: 2 }),
  vsOpponentAvg: decimal('vs_opponent_avg', { precision: 8, scale: 2 }),
  homeAwayAvg: decimal('home_away_avg', { precision: 8, scale: 2 }),
  // Advanced metrics
  usageRate: decimal('usage_rate', { precision: 5, scale: 2 }),
  paceFactor: decimal('pace_factor', { precision: 5, scale: 2 }),
  defensiveRating: decimal('defensive_rating', { precision: 8, scale: 2 }),
  offensiveRating: decimal('offensive_rating', { precision: 8, scale: 2 }),
  // Context
  injuryStatus: text('injury_status'),
  restDays: integer('rest_days'),
  weatherConditions: text('weather_conditions'),
  isHome: boolean('is_home'),
  // Status
  isActive: boolean('is_active').default(true),
  isLocked: boolean('is_locked').default(false),
  lockedAt: timestamp('locked_at', { withTimezone: true }),
  // External API identifiers
  externalId: text('external_id'),
  sportsbook: text('sportsbook'), // 'draftkings', 'fanduel', 'betmgm', etc.
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const playerPropsRelations = relations(playerProps, ({ one }) => ({
  player: one(players, {
    fields: [playerProps.playerId],
    references: [players.id],
  }),
  game: one(games, {
    fields: [playerProps.gameId],
    references: [games.id],
  }),
  propType: one(propTypes, {
    fields: [playerProps.propTypeId],
    references: [propTypes.id],
  }),
}));

export const propTypesRelations = relations(propTypes, ({ many }) => ({
  playerProps: many(playerProps),
}));

export type PropType = typeof propTypes.$inferSelect;
export type NewPropType = typeof propTypes.$inferInsert;
export type PlayerProp = typeof playerProps.$inferSelect;
export type NewPlayerProp = typeof playerProps.$inferInsert;

export const insertPropTypeSchema = createInsertSchema(propTypes);
export const selectPropTypeSchema = createSelectSchema(propTypes);
export const insertPlayerPropSchema = createInsertSchema(playerProps);
export const selectPlayerPropSchema = createSelectSchema(playerProps);
