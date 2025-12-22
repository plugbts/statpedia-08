/**
 * Drizzle Schema for StatPedia
 *
 * This schema matches our existing Neon database structure
 * with the clean leagues → teams → players → props hierarchy.
 */

import {
  pgTable,
  serial,
  text,
  numeric,
  varchar,
  uuid,
  timestamp,
  boolean,
  integer,
  date,
  check,
  jsonb,
} from "drizzle-orm/pg-core";
import { user_roles } from "./user-roles";

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
  team_id: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  position: text("position"),
  status: text("status").default("Active"), // Active, Injured, Out
  external_id: text("external_id").unique(), // NBA/WNBA numeric ID
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Props table
export const props = pgTable("props", {
  id: uuid("id").primaryKey().defaultRandom(),
  player_id: uuid("player_id").references(() => players.id, { onDelete: "cascade" }),
  team_id: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }),
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
  player_id: uuid("player_id").references(() => players.id, { onDelete: "cascade" }),
  team_id: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }),
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
  home_away: text("home_away").notNull().$type<"home" | "away">(),
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

// =========================
// Icura NHL Backbone (Phase 1)
// =========================

export const goalies = pgTable("goalies", {
  id: uuid("id").primaryKey().defaultRandom(),
  league_id: uuid("league_id")
    .references(() => leagues.id, { onDelete: "cascade" })
    .notNull(),
  player_id: uuid("player_id")
    .references(() => players.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  team_id: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
  catches: text("catches"),
  shoots: text("shoots"),
  is_starter: boolean("is_starter").default(false),
  external_id: text("external_id"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const xg_models = pgTable("xg_models", {
  id: uuid("id").primaryKey().defaultRandom(),
  league_id: uuid("league_id")
    .references(() => leagues.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  version: text("version").notNull(),
  description: text("description"),
  feature_spec: jsonb("feature_spec").default({}),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const game_events = pgTable("game_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  league_id: uuid("league_id")
    .references(() => leagues.id, { onDelete: "cascade" })
    .notNull(),
  game_id: uuid("game_id")
    .references(() => games.id, { onDelete: "cascade" })
    .notNull(),
  team_id: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
  opponent_team_id: uuid("opponent_team_id").references(() => teams.id, { onDelete: "set null" }),
  player_id: uuid("player_id").references(() => players.id, { onDelete: "set null" }),
  goalie_id: uuid("goalie_id").references(() => goalies.id, { onDelete: "set null" }),
  event_type: text("event_type").notNull(),
  period: integer("period"),
  period_time_seconds: integer("period_time_seconds"),
  game_time_seconds: integer("game_time_seconds"),
  strength_state: text("strength_state"),
  shot_type: text("shot_type"),
  x_coord: numeric("x_coord"),
  y_coord: numeric("y_coord"),
  is_goal: boolean("is_goal"),
  penalty_type: text("penalty_type"),
  penalty_minutes: integer("penalty_minutes"),
  description: text("description"),
  source: text("source").default("official"),
  external_id: text("external_id"),
  attributes: jsonb("attributes").default({}),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const icura_nhl_market_closing = pgTable("icura_nhl_market_closing", {
  id: uuid("id").primaryKey().defaultRandom(),
  game_id: uuid("game_id")
    .references(() => games.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  game_external_id: text("game_external_id").unique(),
  date_iso: date("date_iso"),
  closing_total: numeric("closing_total"),
  closing_first_period_total: numeric("closing_first_period_total"),
  closing_moneyline_home: integer("closing_moneyline_home"),
  closing_moneyline_away: integer("closing_moneyline_away"),
  source: text("source").default("market"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const icura_nhl_early_game_dataset = pgTable("icura_nhl_early_game_dataset", {
  id: uuid("id").primaryKey().defaultRandom(),
  game_id: uuid("game_id")
    .references(() => games.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  game_external_id: text("game_external_id").unique(),
  date_iso: date("date_iso").notNull(),
  season: text("season"),
  home_team_id: uuid("home_team_id")
    .references(() => teams.id, { onDelete: "cascade" })
    .notNull(),
  away_team_id: uuid("away_team_id")
    .references(() => teams.id, { onDelete: "cascade" })
    .notNull(),
  goal_in_first_5: boolean("goal_in_first_5"),
  goal_in_first_10: boolean("goal_in_first_10"),

  home_team_xgf_first10_last20: numeric("home_team_xgf_first10_last20"),
  home_team_shots_first10_last20: numeric("home_team_shots_first10_last20"),
  home_team_high_danger_first10_last20: numeric("home_team_high_danger_first10_last20"),
  home_team_rush_chances_first10_last20: numeric("home_team_rush_chances_first10_last20"),
  home_team_avg_time_to_first_shot: numeric("home_team_avg_time_to_first_shot"),
  home_team_avg_time_to_first_goal: numeric("home_team_avg_time_to_first_goal"),

  away_team_xgf_first10_last20: numeric("away_team_xgf_first10_last20"),
  away_team_shots_first10_last20: numeric("away_team_shots_first10_last20"),
  away_team_high_danger_first10_last20: numeric("away_team_high_danger_first10_last20"),
  away_team_rush_chances_first10_last20: numeric("away_team_rush_chances_first10_last20"),
  away_team_avg_time_to_first_shot: numeric("away_team_avg_time_to_first_shot"),
  away_team_avg_time_to_first_goal: numeric("away_team_avg_time_to_first_goal"),

  home_team_xga_first10_last20: numeric("home_team_xga_first10_last20"),
  home_team_shots_allowed_first10_last20: numeric("home_team_shots_allowed_first10_last20"),
  home_team_high_danger_allowed_first10_last20: numeric(
    "home_team_high_danger_allowed_first10_last20",
  ),

  away_team_xga_first10_last20: numeric("away_team_xga_first10_last20"),
  away_team_shots_allowed_first10_last20: numeric("away_team_shots_allowed_first10_last20"),
  away_team_high_danger_allowed_first10_last20: numeric(
    "away_team_high_danger_allowed_first10_last20",
  ),

  home_team_shot_attempts_first10: numeric("home_team_shot_attempts_first10"),
  home_team_faceoff_win_rate_first10: numeric("home_team_faceoff_win_rate_first10"),
  home_team_zone_entry_rate_first10: numeric("home_team_zone_entry_rate_first10"),
  home_team_turnovers_first10: numeric("home_team_turnovers_first10"),

  away_team_shot_attempts_first10: numeric("away_team_shot_attempts_first10"),
  away_team_faceoff_win_rate_first10: numeric("away_team_faceoff_win_rate_first10"),
  away_team_zone_entry_rate_first10: numeric("away_team_zone_entry_rate_first10"),
  away_team_turnovers_first10: numeric("away_team_turnovers_first10"),

  home_goalie_id: uuid("home_goalie_id").references(() => goalies.id, { onDelete: "set null" }),
  away_goalie_id: uuid("away_goalie_id").references(() => goalies.id, { onDelete: "set null" }),

  home_goalie_gsax_first_period: numeric("home_goalie_gsax_first_period"),
  home_goalie_save_pct_first10: numeric("home_goalie_save_pct_first10"),
  home_goalie_rebound_rate_first10: numeric("home_goalie_rebound_rate_first10"),
  home_goalie_rush_save_pct: numeric("home_goalie_rush_save_pct"),
  home_goalie_screened_shot_save_pct: numeric("home_goalie_screened_shot_save_pct"),

  away_goalie_gsax_first_period: numeric("away_goalie_gsax_first_period"),
  away_goalie_save_pct_first10: numeric("away_goalie_save_pct_first10"),
  away_goalie_rebound_rate_first10: numeric("away_goalie_rebound_rate_first10"),
  away_goalie_rush_save_pct: numeric("away_goalie_rush_save_pct"),
  away_goalie_screened_shot_save_pct: numeric("away_goalie_screened_shot_save_pct"),

  home_rest_days: integer("home_rest_days"),
  away_rest_days: integer("away_rest_days"),
  home_back_to_back: boolean("home_back_to_back"),
  away_back_to_back: boolean("away_back_to_back"),
  travel_distance: numeric("travel_distance"),
  injury_impact_home: numeric("injury_impact_home"),
  injury_impact_away: numeric("injury_impact_away"),
  ref_penalty_rate: numeric("ref_penalty_rate"),

  closing_total: numeric("closing_total"),
  closing_first_period_total: numeric("closing_first_period_total"),
  closing_moneyline_home: integer("closing_moneyline_home"),
  closing_moneyline_away: integer("closing_moneyline_away"),

  extras: jsonb("extras").default({}),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const icura_nhl_early_predictions = pgTable("icura_nhl_early_predictions", {
  id: uuid("id").primaryKey().defaultRandom(),
  game_id: uuid("game_id")
    .references(() => games.id, { onDelete: "cascade" })
    .notNull(),
  game_external_id: text("game_external_id"),
  date_iso: date("date_iso").notNull(),
  icura_version: text("icura_version").notNull(),
  p_g1f5: numeric("p_g1f5").notNull(),
  p_g1f10: numeric("p_g1f10").notNull(),
  fair_odds_g1f5: numeric("fair_odds_g1f5"),
  fair_odds_g1f10: numeric("fair_odds_g1f10"),
  edge_g1f5: numeric("edge_g1f5"),
  edge_g1f10: numeric("edge_g1f10"),
  model_poisson_p10: numeric("model_poisson_p10"),
  model_ml_p10: numeric("model_ml_p10"),
  blend_weight_poisson: numeric("blend_weight_poisson").default("0.6"),
  blend_weight_ml: numeric("blend_weight_ml").default("0.4"),
  reasons: jsonb("reasons").default([]),
  debug: jsonb("debug").default({}),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const moneypuck_shots = pgTable("moneypuck_shots", {
  id: uuid("id").primaryKey().defaultRandom(),
  league: text("league").notNull().default("NHL"),
  season: text("season"),
  game_external_id: text("game_external_id").notNull(),
  team_abbr: text("team_abbr"),
  opponent_abbr: text("opponent_abbr"),
  period: integer("period"),
  period_time_seconds: integer("period_time_seconds"),
  game_time_seconds: integer("game_time_seconds"),
  shooter_name: text("shooter_name"),
  goalie_name: text("goalie_name"),
  shot_type: text("shot_type"),
  x_coord: numeric("x_coord"),
  y_coord: numeric("y_coord"),
  xg: numeric("xg"),
  is_goal: boolean("is_goal"),
  is_rush: boolean("is_rush"),
  is_rebound: boolean("is_rebound"),
  is_high_danger: boolean("is_high_danger"),
  shot_speed: numeric("shot_speed"),
  strength_state: text("strength_state"),
  source: text("source").default("moneypuck"),
  raw: jsonb("raw").default({}),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const icura_nhl_market_early_goal = pgTable("icura_nhl_market_early_goal", {
  id: uuid("id").primaryKey().defaultRandom(),
  game_id: uuid("game_id")
    .references(() => games.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  game_external_id: text("game_external_id").unique(),
  date_iso: date("date_iso"),
  market_g1f5_yes_odds: integer("market_g1f5_yes_odds"),
  market_g1f5_no_odds: integer("market_g1f5_no_odds"),
  market_g1f10_yes_odds: integer("market_g1f10_yes_odds"),
  market_g1f10_no_odds: integer("market_g1f10_no_odds"),
  source: text("source").default("sportsgameodds"),
  raw: jsonb("raw").default({}),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const xg_event_values = pgTable("xg_event_values", {
  id: uuid("id").primaryKey().defaultRandom(),
  event_id: uuid("event_id")
    .references(() => game_events.id, { onDelete: "cascade" })
    .notNull(),
  model_id: uuid("model_id")
    .references(() => xg_models.id, { onDelete: "cascade" })
    .notNull(),
  xg: numeric("xg").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const goalie_game_metrics = pgTable("goalie_game_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  league_id: uuid("league_id")
    .references(() => leagues.id, { onDelete: "cascade" })
    .notNull(),
  goalie_id: uuid("goalie_id")
    .references(() => goalies.id, { onDelete: "cascade" })
    .notNull(),
  game_id: uuid("game_id")
    .references(() => games.id, { onDelete: "cascade" })
    .notNull(),
  team_id: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
  opponent_team_id: uuid("opponent_team_id").references(() => teams.id, { onDelete: "set null" }),
  shots: integer("shots"),
  saves: integer("saves"),
  goals_against: integer("goals_against"),
  save_pct: numeric("save_pct"),
  xg_against: numeric("xg_against"),
  gsax: numeric("gsax"),
  shot_profile: jsonb("shot_profile").default({}),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const nhl_line_combos = pgTable("nhl_line_combos", {
  id: uuid("id").primaryKey().defaultRandom(),
  league_id: uuid("league_id")
    .references(() => leagues.id, { onDelete: "cascade" })
    .notNull(),
  game_id: uuid("game_id")
    .references(() => games.id, { onDelete: "cascade" })
    .notNull(),
  team_id: uuid("team_id")
    .references(() => teams.id, { onDelete: "cascade" })
    .notNull(),
  unit_type: text("unit_type").notNull(),
  unit_slot: text("unit_slot").notNull(),
  players: jsonb("players").notNull().default([]),
  toi_seconds: integer("toi_seconds"),
  xg_for: numeric("xg_for"),
  xg_against: numeric("xg_against"),
  goals_for: integer("goals_for"),
  goals_against: integer("goals_against"),
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
  // Icura NHL Backbone
  goalies,
  xg_models,
  game_events,
  xg_event_values,
  goalie_game_metrics,
  nhl_line_combos,
  icura_nhl_market_closing,
  icura_nhl_early_game_dataset,
  icura_nhl_early_predictions,
  moneypuck_shots,
  icura_nhl_market_early_goal,
  user_roles,
};
