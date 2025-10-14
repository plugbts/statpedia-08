import { pgTable, text, timestamp, uuid, boolean, integer, varchar, decimal, date, time } from 'drizzle-orm/pg-core';
import { teams, leagues } from './index';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

export const games = pgTable('games', {
  id: uuid('id').primaryKey().defaultRandom(),
  leagueId: uuid('league_id').references(() => leagues.id).notNull(),
  homeTeamId: uuid('home_team_id').references(() => teams.id).notNull(),
  awayTeamId: uuid('away_team_id').references(() => teams.id).notNull(),
  season: text('season').notNull(),
  seasonType: text('season_type').notNull().default('regular'), // 'regular', 'playoff', 'preseason'
  week: integer('week'), // for NFL
  gameDate: date('game_date').notNull(),
  gameTime: time('game_time'),
  gameDateTime: timestamp('game_date_time', { withTimezone: true }),
  status: text('status').notNull().default('scheduled'), // 'scheduled', 'in_progress', 'completed', 'postponed', 'cancelled'
  venue: text('venue'),
  attendance: integer('attendance'),
  weather: text('weather'),
  // Game scores
  homeScore: integer('home_score'),
  awayScore: integer('away_score'),
  homeScoreQ1: integer('home_score_q1'),
  homeScoreQ2: integer('home_score_q2'),
  homeScoreQ3: integer('home_score_q3'),
  homeScoreQ4: integer('home_score_q4'),
  homeScoreOT: integer('home_score_ot'),
  awayScoreQ1: integer('away_score_q1'),
  awayScoreQ2: integer('away_score_q2'),
  awayScoreQ3: integer('away_score_q3'),
  awayScoreQ4: integer('away_score_q4'),
  awayScoreOT: integer('away_score_ot'),
  // Game statistics
  totalPoints: integer('total_points'),
  homeTeamSpread: decimal('home_team_spread', { precision: 6, scale: 1 }),
  totalOverUnder: decimal('total_over_under', { precision: 6, scale: 1 }),
  // External API identifiers
  externalId: text('external_id').unique(),
  apiGameId: text('api_game_id').unique(),
  espnId: text('espn_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const gamesRelations = relations(games, ({ one, many }) => ({
  league: one(leagues, {
    fields: [games.leagueId],
    references: [leagues.id],
  }),
  homeTeam: one(teams, {
    fields: [games.homeTeamId],
    references: [teams.id],
  }),
  awayTeam: one(teams, {
    fields: [games.awayTeamId],
    references: [teams.id],
  }),
}));

export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;

export const insertGameSchema = createInsertSchema(games);
export const selectGameSchema = createSelectSchema(games);
