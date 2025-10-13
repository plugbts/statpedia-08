/**
 * Drizzle Schema for StatPedia
 * 
 * This schema matches our existing Neon database structure
 * with the clean leagues → teams → players → props hierarchy.
 */

import { pgTable, serial, text, numeric, varchar, uuid, timestamp, boolean } from "drizzle-orm/pg-core";

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

// Export all tables for easy importing
export const schema = {
  leagues,
  teams,
  players,
  props,
  pickemProps,
};