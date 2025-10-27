-- Create prop_type_aliases table to handle name variations
CREATE TABLE IF NOT EXISTS public.prop_type_aliases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canonical_name TEXT NOT NULL,
  alias TEXT NOT NULL,
  sport TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(alias)
);

CREATE INDEX IF NOT EXISTS idx_prop_type_aliases_alias ON public.prop_type_aliases(LOWER(alias));
CREATE INDEX IF NOT EXISTS idx_prop_type_aliases_canonical ON public.prop_type_aliases(LOWER(canonical_name));

-- Seed comprehensive aliases
INSERT INTO public.prop_type_aliases (canonical_name, alias, sport) VALUES
  -- Hits variations
  ('Hits', 'hits', 'MLB'),
  ('Hits', 'batting hits', 'MLB'),
  ('Hits', 'h', 'MLB'),
  
  -- Home Runs
  ('Home Runs', 'home runs', 'MLB'),
  ('Home Runs', 'batting homeruns', 'MLB'),
  ('Home Runs', 'homeruns', 'MLB'),
  ('Home Runs', 'hr', 'MLB'),
  
  -- RBIs
  ('RBIs', 'rbis', 'MLB'),
  ('RBIs', 'rbi', 'MLB'),
  ('RBIs', 'batting rbi', 'MLB'),
  ('RBIs', 'runs batted in', 'MLB'),
  
  -- Runs
  ('Runs', 'runs', 'MLB'),
  ('Runs', 'batting runs', 'MLB'),
  ('Runs', 'r', 'MLB'),
  
  -- Stolen Bases
  ('Stolen Bases', 'stolen bases', 'MLB'),
  ('Stolen Bases', 'batting stolenbases', 'MLB'),
  ('Stolen Bases', 'stolenbases', 'MLB'),
  ('Stolen Bases', 'sb', 'MLB'),
  ('Stolen Bases', 'steals', 'MLB'),
  
  -- Strikeouts (batting)
  ('Strikeouts', 'strikeouts', 'MLB'),
  ('Strikeouts', 'batting strikeouts', 'MLB'),
  ('Strikeouts', 'k', 'MLB'),
  ('Strikeouts', 'so', 'MLB'),
  
  -- Pitcher Strikeouts
  ('Pitcher Strikeouts', 'pitcher strikeouts', 'MLB'),
  ('Pitcher Strikeouts', 'pitching strikeouts', 'MLB'),
  ('Pitcher Strikeouts', 'strikeouts pitched', 'MLB'),
  ('Pitcher Strikeouts', 'k', 'MLB'),
  
  -- Walks
  ('Walks', 'walks', 'MLB'),
  ('Walks', 'batting basesonballs', 'MLB'),
  ('Walks', 'pitching basesonballs', 'MLB'),
  ('Walks', 'basesonballs', 'MLB'),
  ('Walks', 'bb', 'MLB'),
  ('Walks', 'base on balls', 'MLB'),
  
  -- Doubles
  ('Doubles', 'doubles', 'MLB'),
  ('Doubles', 'batting doubles', 'MLB'),
  ('Doubles', '2b', 'MLB'),
  
  -- Triples
  ('Triples', 'triples', 'MLB'),
  ('Triples', 'batting triples', 'MLB'),
  ('Triples', '3b', 'MLB'),
  
  -- Total Bases
  ('Total Bases', 'total bases', 'MLB'),
  ('Total Bases', 'batting totalbases', 'MLB'),
  ('Total Bases', 'totalbases', 'MLB'),
  ('Total Bases', 'tb', 'MLB'),
  
  -- Hits Allowed
  ('Hits Allowed', 'hits allowed', 'MLB'),
  ('Hits Allowed', 'pitching hits', 'MLB'),
  ('Hits Allowed', 'ha', 'MLB'),
  
  -- Earned Runs
  ('Earned Runs', 'earned runs', 'MLB'),
  ('Earned Runs', 'pitching earnedruns', 'MLB'),
  ('Earned Runs', 'earnedruns', 'MLB'),
  ('Earned Runs', 'er', 'MLB'),
  
  -- Innings Pitched
  ('Innings Pitched', 'innings pitched', 'MLB'),
  ('Innings Pitched', 'pitching outs', 'MLB'),
  ('Innings Pitched', 'ip', 'MLB'),
  
  -- Points (NBA/NHL)
  ('Points', 'points', NULL),
  ('Points', 'pts', NULL),
  ('Points', 'fantasyscore', NULL),
  
  -- Assists
  ('Assists', 'assists', NULL),
  ('Assists', 'ast', NULL),
  ('Assists', 'a', NULL),
  
  -- Rebounds
  ('Rebounds', 'rebounds', 'NBA'),
  ('Rebounds', 'reb', 'NBA'),
  ('Rebounds', 'trb', 'NBA'),
  
  -- Goals
  ('Goals', 'goals', 'NHL'),
  ('Goals', 'g', 'NHL'),
  
  -- Passing Yards
  ('Passing Yards', 'passing yards', 'NFL'),
  ('Passing Yards', 'pass yds', 'NFL'),
  ('Passing Yards', 'py', 'NFL'),
  
  -- Passing TDs
  ('Passing TDs', 'passing tds', 'NFL'),
  ('Passing TDs', 'passing touchdowns', 'NFL'),
  ('Passing TDs', 'pass td', 'NFL'),
  ('Passing TDs', 'ptd', 'NFL'),
  
  -- Rushing Yards
  ('Rushing Yards', 'rushing yards', 'NFL'),
  ('Rushing Yards', 'rush yds', 'NFL'),
  ('Rushing Yards', 'ry', 'NFL'),
  
  -- Rushing TDs
  ('Rushing TDs', 'rushing tds', 'NFL'),
  ('Rushing TDs', 'rushing touchdowns', 'NFL'),
  ('Rushing TDs', 'rush td', 'NFL'),
  ('Rushing TDs', 'rtd', 'NFL'),
  
  -- Receiving Yards
  ('Receiving Yards', 'receiving yards', 'NFL'),
  ('Receiving Yards', 'rec yds', 'NFL'),
  ('Receiving Yards', 'recy', 'NFL'),
  
  -- Receiving TDs
  ('Receiving TDs', 'receiving tds', 'NFL'),
  ('Receiving TDs', 'receiving touchdowns', 'NFL'),
  ('Receiving TDs', 'rec td', 'NFL'),
  ('Receiving TDs', 'rectd', 'NFL'),
  
  -- Receptions
  ('Receptions', 'receptions', 'NFL'),
  ('Receptions', 'receiving receptions', 'NFL'),
  ('Receptions', 'rec', 'NFL'),
  
  -- Longest Reception
  ('Longest Reception', 'longest reception', 'NFL'),
  ('Longest Reception', 'receiving longestreception', 'NFL'),
  ('Longest Reception', 'longestreception', 'NFL'),
  ('Longest Reception', 'long rec', 'NFL'),
  
  -- Longest Completion
  ('Longest Completion', 'longest completion', 'NFL'),
  ('Longest Completion', 'passing longestcompletion', 'NFL'),
  ('Longest Completion', 'longestcompletion', 'NFL'),
  ('Longest Completion', 'long pass', 'NFL'),
  
  -- Longest Rush
  ('Longest Rush', 'longest rush', 'NFL'),
  ('Longest Rush', 'rushing longestrush', 'NFL'),
  ('Longest Rush', 'longestrush', 'NFL'),
  ('Longest Rush', 'long rush', 'NFL')
ON CONFLICT (alias) DO NOTHING;

COMMENT ON TABLE public.prop_type_aliases IS 'Maps prop type name variations to canonical names for enrichment matching';
