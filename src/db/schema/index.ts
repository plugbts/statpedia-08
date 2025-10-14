/**
 * Drizzle Schema for StatPedia
 * 
 * This schema matches our existing Neon database structure
 * with the clean leagues → teams → players → props hierarchy.
 */

import { pgTable, serial, text, numeric, varchar, uuid, timestamp, boolean, integer, date, check } from "drizzle-orm/pg-core";

// Leagues table
export const leagues = pgTable("leagues", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(), // NFL, NBA, MLB, etc.
  name: text("name").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Teams table
export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  league_id: uuid("league_id")
    .references(() => leagues.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  abbreviation: text("abbreviation").notNull(),
  logo_url: text("logo_url"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Players table
export const players = pgTable("players", {
  id: uuid("id").primaryKey().defaultRandom(),
  team_id: uuid("team_id")
    .references(() => teams.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  position: text("position"),
  status: text("status").default("Active"), // Active, Injured, Out
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Props table
export const props = pgTable("props", {
  id: uuid("id").primaryKey().defaultRandom(),
  player_id: uuid("player_id")
    .references(() => players.id, { onDelete: "cascade" }),
  team_id: uuid("team_id")
    .references(() => teams.id, { onDelete: "cascade" }),
  game_id: text("game_id"),
  prop_type: text("prop_type"), // e.g. "Passing Yards", "Receptions"
  line: numeric("line"), // betting line
  odds: text("odds"), // e.g. "-115", "+120"
  priority: boolean("priority").default(false), // true for priority props (90% of users care about)
  side: text("side"), // 'over' or 'under'
  source: text("source"), // 'sportsbook' or 'pickem'
  best_odds_over: text("best_odds_over"), // best over odds across all books
  best_odds_under: text("best_odds_under"), // best under odds across all books
  books_over: text("books_over"), // JSONB tracking all over books
  books_under: text("books_under"), // JSONB tracking all under books
  conflict_key: text("conflict_key"), // unique deduplication key
  
  // Analytics columns
  ev_percent: numeric("ev_percent"), // Expected value percentage
  hit_rate: numeric("hit_rate"), // Overall hit rate
  matchup_grade: numeric("matchup_grade"), // Matchup grade
  streak_factor: numeric("streak_factor"), // Streak factor
  line_sensitivity: numeric("line_sensitivity"), // Line sensitivity
  ai_prediction: numeric("ai_prediction"), // AI prediction
  statpedia_rating: numeric("statpedia_rating"), // Combined Statpedia rating
  
  // Historical analytics
  hit_rate_l5: numeric("hit_rate_l5"), // Hit rate last 5 games
  hit_rate_l10: numeric("hit_rate_l10"), // Hit rate last 10 games
  hit_rate_l20: numeric("hit_rate_l20"), // Hit rate last 20 games
  streak_current: integer("streak_current"), // Current streak (positive = overs, negative = unders)
  h2h_hit_rate: numeric("h2h_hit_rate"), // Head-to-head hit rate vs opponent
  matchup_rank: integer("matchup_rank"), // Opponent defensive rank
  historical_average: numeric("historical_average"), // Player's historical average
  games_tracked: integer("games_tracked").default(0), // Number of games tracked
  
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Games table (must be defined before references)
export const games = pgTable("games", {
  id: uuid("id").primaryKey().defaultRandom(),
  league_id: uuid("league_id")
    .references(() => leagues.id, { onDelete: "cascade" })
    .notNull(),
  home_team_id: uuid("home_team_id")
    .references(() => teams.id, { onDelete: "cascade" })
    .notNull(),
  away_team_id: uuid("away_team_id")
    .references(() => teams.id, { onDelete: "cascade" })
    .notNull(),
  season: text("season").notNull(),
  season_type: text("season_type").default("regular"),
  week: integer("week"),
  game_date: date("game_date").notNull(),
  game_time: text("game_time"),
  game_date_time: timestamp("game_date_time"),
  status: text("status").default("scheduled"),
  venue: text("venue"),
  attendance: integer("attendance"),
  weather: text("weather"),
  home_score: integer("home_score"),
  away_score: integer("away_score"),
  home_score_q1: integer("home_score_q1"),
  home_score_q2: integer("home_score_q2"),
  home_score_q3: integer("home_score_q3"),
  home_score_q4: integer("home_score_q4"),
  home_score_ot: integer("home_score_ot"),
  away_score_q1: integer("away_score_q1"),
  away_score_q2: integer("away_score_q2"),
  away_score_q3: integer("away_score_q3"),
  away_score_q4: integer("away_score_q4"),
  away_score_ot: integer("away_score_ot"),
  total_points: integer("total_points"),
  home_team_spread: numeric("home_team_spread"),
  total_over_under: numeric("total_over_under"),
  external_id: text("external_id").unique(),
  api_game_id: text("api_game_id").unique(),
  espn_id: text("espn_id"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Pick'em props table (parallel to sportsbook props)
export const pickemProps = pgTable("pickem_props", {
  id: serial("id").primaryKey(),
  player_id: uuid("player_id")
    .references(() => players.id, { onDelete: "cascade" }),
  team_id: uuid("team_id")
    .references(() => teams.id, { onDelete: "cascade" }),
  game_id: text("game_id"),
  prop_type: text("prop_type"), // e.g. "Passing Yards", "Receptions"
  line: numeric("line"), // betting line
  pickem_site: text("pickem_site"), // e.g. "PrizePicks", "Underdog"
  over_projection: numeric("over_projection"), // over projection value
  under_projection: numeric("under_projection"), // under projection value
  updated_at: timestamp("updated_at").defaultNow(),
  conflict_key: text("conflict_key").unique(), // unique deduplication key
});

// Player game logs table for historical performance data
export const player_game_logs = pgTable("player_game_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  player_id: uuid("player_id")
    .references(() => players.id, { onDelete: "cascade" })
    .notNull(),
  team_id: uuid("team_id")
    .references(() => teams.id, { onDelete: "cascade" })
    .notNull(),
  game_id: uuid("game_id")
    .references(() => games.id, { onDelete: "cascade" })
    .notNull(),
  opponent_id: uuid("opponent_id")
    .references(() => teams.id, { onDelete: "cascade" })
    .notNull(),
  prop_type: text("prop_type").notNull(),
  line: numeric("line").notNull(),
  actual_value: numeric("actual_value").notNull(), // What the player actually achieved
  hit: boolean("hit").notNull(), // Did they hit the over?
  game_date: date("game_date").notNull(),
  season: text("season").notNull(),
  home_away: text("home_away").notNull().$type<'home' | 'away'>(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Defense ranks table for opponent defensive rankings
export const defense_ranks = pgTable("defense_ranks", {
  id: uuid("id").primaryKey().defaultRandom(),
  team_id: uuid("team_id")
    .references(() => teams.id, { onDelete: "cascade" })
    .notNull(),
  league_id: uuid("league_id")
    .references(() => leagues.id, { onDelete: "cascade" })
    .notNull(),
  prop_type: text("prop_type").notNull(),
  rank: integer("rank").notNull(), // 1 = best defense, 32 = worst
  rank_percentile: numeric("rank_percentile").notNull(), // 0-100 percentile
  season: text("season").notNull(),
  games_tracked: integer("games_tracked").default(0),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Export all tables for easy importing
export const schema = {
  leagues,
  teams,
  players,
  props,
  pickemProps,
  games,
  player_game_logs,
  defense_ranks,
};