import { pgTable, text, timestamp, uuid, boolean, integer, varchar, decimal } from 'drizzle-orm/pg-core';
import { leagues } from './leagues';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  leagueId: uuid('league_id').references(() => leagues.id).notNull(),
  name: text('name').notNull(),
  abbreviation: varchar('abbreviation', { length: 10 }).notNull(),
  city: text('city').notNull(),
  fullName: text('full_name').notNull(),
  conference: text('conference'), // 'Eastern', 'Western', 'AFC', 'NFC', etc.
  division: text('division'), // 'Atlantic', 'Pacific', 'North', 'South', etc.
  logoUrl: text('logo_url'),
  primaryColor: text('primary_color'),
  secondaryColor: text('secondary_color'),
  homeVenue: text('home_venue'),
  isActive: boolean('is_active').default(true),
  // Team performance metrics
  wins: integer('wins').default(0),
  losses: integer('losses').default(0),
  ties: integer('ties').default(0),
  winPercentage: decimal('win_percentage', { precision: 5, scale: 3 }),
  // External API identifiers
  externalId: text('external_id').unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const teamsRelations = relations(teams, ({ one, many }) => ({
  league: one(leagues, {
    fields: [teams.leagueId],
    references: [leagues.id],
  }),
}));

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;

export const insertTeamSchema = createInsertSchema(teams);
export const selectTeamSchema = createSelectSchema(teams);
