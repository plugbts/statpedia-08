-- SQL schema for leagues table
CREATE TABLE IF NOT EXISTS leagues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE, -- NFL, NBA, MLB, etc.
  name text NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- SQL schema for props table
CREATE TABLE IF NOT EXISTS props (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES players(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  game_id text,
  prop_type text,
  line numeric,
  odds text,
  priority boolean DEFAULT false,
  side text,
  source text,
  best_odds_over text,
  best_odds_under text,
  sportsbook text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
