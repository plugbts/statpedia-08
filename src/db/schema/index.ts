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
  conflict_key: text("conflict_key"), // unique deduplication key
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Export all tables for easy importing
export const schema = {
  leagues,
  teams,
  players,
  props,
};