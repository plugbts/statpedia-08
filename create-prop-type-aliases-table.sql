-- Create prop_type_aliases table for dynamic prop type normalization
CREATE TABLE IF NOT EXISTS prop_type_aliases (
    id SERIAL PRIMARY KEY,
    alias VARCHAR(100) NOT NULL,
    canonical VARCHAR(100) NOT NULL,
    league VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(alias, league)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_prop_type_aliases_alias ON prop_type_aliases(alias);
CREATE INDEX IF NOT EXISTS idx_prop_type_aliases_canonical ON prop_type_aliases(canonical);

-- Insert initial prop type aliases based on the hardcoded mappings
INSERT INTO prop_type_aliases (alias, canonical, league) VALUES
-- NFL aliases
('sacks', 'defense_sacks', 'nfl'),
('td', 'fantasyscore', 'nfl'),
('touchdowns', 'fantasyscore', 'nfl'),
('pass_yards', 'passing_yards', 'nfl'),
('rush_yards', 'rushing_yards', 'nfl'),
('rec_yards', 'receiving_yards', 'nfl'),

-- NBA aliases
('pts', 'points', 'nba'),
('reb', 'rebounds', 'nba'),
('ast', 'assists', 'nba'),
('stl', 'steals', 'nba'),
('blk', 'blocks', 'nba'),

-- MLB aliases
('hr', 'home_runs', 'mlb'),
('rbi', 'runs_batted_in', 'mlb'),
('sb', 'stolen_bases', 'mlb'),
('hits', 'hits', 'mlb'),

-- NHL aliases
('sog', 'shots_on_goal', 'nhl'),
('saves', 'goalie_saves', 'nhl'),
('goals', 'goals', 'nhl'),
('assists', 'assists', 'nhl')

ON CONFLICT (alias, league) DO UPDATE SET
    canonical = EXCLUDED.canonical,
    updated_at = NOW();

-- Grant permissions for the worker
GRANT SELECT ON prop_type_aliases TO authenticated;
GRANT SELECT ON prop_type_aliases TO anon;
