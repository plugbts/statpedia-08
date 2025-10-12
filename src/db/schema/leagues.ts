import { pgTable, text, timestamp, uuid, boolean, integer } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const leagues = pgTable('leagues', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  abbreviation: text('abbreviation').notNull().unique(),
  sport: text('sport').notNull(), // 'nba', 'nfl', 'mlb', 'nhl', etc.
  season: text('season').notNull(), // '2024-25', '2024', etc.
  isActive: boolean('is_active').default(true),
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  totalTeams: integer('total_teams'),
  playoffTeams: integer('playoff_teams'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export type League = typeof leagues.$inferSelect;
export type NewLeague = typeof leagues.$inferInsert;

export const insertLeagueSchema = createInsertSchema(leagues);
export const selectLeagueSchema = createSelectSchema(leagues);
