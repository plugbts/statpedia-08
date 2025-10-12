-- Hasura Metadata Setup for StatPedia
-- This script sets up the initial metadata for your Hasura instance

-- 1. Track all tables from your Drizzle schema
INSERT INTO hdb_catalog.hdb_table (table_schema, table_name, configuration, is_system_defined)
VALUES 
  ('public', 'leagues', '{}', false),
  ('public', 'teams', '{}', false),
  ('public', 'players', '{}', false),
  ('public', 'games', '{}', false),
  ('public', 'prop_types', '{}', false),
  ('public', 'player_props', '{}', false),
  ('public', 'player_analytics', '{}', false),
  ('public', 'player_streaks', '{}', false),
  ('public', 'team_analytics', '{}', false),
  ('public', 'prop_analytics', '{}', false),
  ('public', 'profiles', '{}', false),
  ('public', 'promo_codes', '{}', false),
  ('public', 'promo_code_usage', '{}', false),
  ('public', 'social_posts', '{}', false),
  ('public', 'comments', '{}', false),
  ('public', 'user_predictions', '{}', false),
  ('public', 'bet_tracking', '{}', false),
  ('public', 'friendships', '{}', false),
  ('public', 'votes', '{}', false),
  ('public', 'user_roles', '{}', false);

-- 2. Track relationships between tables
-- Teams -> Leagues
INSERT INTO hdb_catalog.hdb_relationship (table_schema, table_name, rel_name, rel_type, rel_def)
VALUES ('public', 'teams', 'league', 'object', '{"using": {"foreign_key_constraint_on": "league_id"}}');

-- Players -> Teams
INSERT INTO hdb_catalog.hdb_relationship (table_schema, table_name, rel_name, rel_type, rel_def)
VALUES ('public', 'players', 'team', 'object', '{"using": {"foreign_key_constraint_on": "team_id"}}');

-- Games -> Leagues
INSERT INTO hdb_catalog.hdb_relationship (table_schema, table_name, rel_name, rel_type, rel_def)
VALUES ('public', 'games', 'league', 'object', '{"using": {"foreign_key_constraint_on": "league_id"}}');

-- Games -> Teams (Home/Away)
INSERT INTO hdb_catalog.hdb_relationship (table_schema, table_name, rel_name, rel_type, rel_def)
VALUES 
  ('public', 'games', 'homeTeam', 'object', '{"using": {"foreign_key_constraint_on": "home_team_id"}}'),
  ('public', 'games', 'awayTeam', 'object', '{"using": {"foreign_key_constraint_on": "away_team_id"}}');

-- Player Props -> Players
INSERT INTO hdb_catalog.hdb_relationship (table_schema, table_name, rel_name, rel_type, rel_def)
VALUES ('public', 'player_props', 'player', 'object', '{"using": {"foreign_key_constraint_on": "player_id"}}');

-- Player Props -> Games
INSERT INTO hdb_catalog.hdb_relationship (table_schema, table_name, rel_name, rel_type, rel_def)
VALUES ('public', 'player_props', 'game', 'object', '{"using": {"foreign_key_constraint_on": "game_id"}}');

-- Player Props -> Prop Types
INSERT INTO hdb_catalog.hdb_relationship (table_schema, table_name, rel_name, rel_type, rel_def)
VALUES ('public', 'player_props', 'propType', 'object', '{"using": {"foreign_key_constraint_on": "prop_type_id"}}');

-- 3. Set up Row Level Security policies
-- Enable RLS on all tables
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prop_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_props ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prop_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bet_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- 4. Create policies for public read access to core data
CREATE POLICY "Public read access to leagues" ON public.leagues FOR SELECT USING (true);
CREATE POLICY "Public read access to teams" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Public read access to players" ON public.players FOR SELECT USING (true);
CREATE POLICY "Public read access to games" ON public.games FOR SELECT USING (true);
CREATE POLICY "Public read access to prop_types" ON public.prop_types FOR SELECT USING (true);
CREATE POLICY "Public read access to player_props" ON public.player_props FOR SELECT USING (true);

-- 5. Create policies for user-specific data
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own predictions" ON public.user_predictions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own predictions" ON public.user_predictions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own bets" ON public.bet_tracking FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bets" ON public.bet_tracking FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. Social features policies
CREATE POLICY "Users can view social posts" ON public.social_posts FOR SELECT USING (true);
CREATE POLICY "Users can insert social posts" ON public.social_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own social posts" ON public.social_posts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Users can insert comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON public.comments FOR UPDATE USING (auth.uid() = user_id);
