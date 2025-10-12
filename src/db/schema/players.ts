import { pgTable, text, timestamp, uuid, boolean, integer, varchar, decimal, date } from 'drizzle-orm/pg-core';
import { teams } from './teams';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

export const players = pgTable('players', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').references(() => teams.id),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  fullName: text('full_name').notNull(),
  position: text('position').notNull(), // 'PG', 'SG', 'SF', 'PF', 'C', 'QB', 'RB', etc.
  positionCategory: text('position_category').notNull(), // 'Guard', 'Forward', 'Center', 'Offense', 'Defense', etc.
  jerseyNumber: integer('jersey_number'),
  height: decimal('height', { precision: 4, scale: 1 }), // in inches
  weight: integer('weight'), // in pounds
  age: integer('age'),
  birthDate: date('birth_date'),
  college: text('college'),
  experience: integer('experience').default(0), // years in league
  salary: decimal('salary', { precision: 12, scale: 2 }),
  isActive: boolean('is_active').default(true),
  isRookie: boolean('is_rookie').default(false),
  isInjured: boolean('is_injured').default(false),
  injuryStatus: text('injury_status'), // 'Healthy', 'Questionable', 'Doubtful', 'Out'
  // Player performance metrics
  averageMinutes: decimal('average_minutes', { precision: 4, scale: 1 }),
  averagePoints: decimal('average_points', { precision: 5, scale: 1 }),
  averageRebounds: decimal('average_rebounds', { precision: 4, scale: 1 }),
  averageAssists: decimal('average_assists', { precision: 4, scale: 1 }),
  // External API identifiers
  externalId: text('external_id').unique(),
  espnId: text('espn_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const playersRelations = relations(players, ({ one, many }) => ({
  team: one(teams, {
    fields: [players.teamId],
    references: [teams.id],
  }),
}));

export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;

export const insertPlayerSchema = createInsertSchema(players);
export const selectPlayerSchema = createSelectSchema(players);
