-- Step 3: Seed Teams Data (League-Aware)
-- Each team row references its league with logo URLs

-- NFL Teams
INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Baltimore Ravens', 'BAL', 'https://cdn.yoursite.com/logos/nfl/bal.png'
FROM leagues WHERE code = 'NFL'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Buffalo Bills', 'BUF', 'https://cdn.yoursite.com/logos/nfl/buf.png'
FROM leagues WHERE code = 'NFL'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Miami Dolphins', 'MIA', 'https://cdn.yoursite.com/logos/nfl/mia.png'
FROM leagues WHERE code = 'NFL'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'New England Patriots', 'NE', 'https://cdn.yoursite.com/logos/nfl/ne.png'
FROM leagues WHERE code = 'NFL'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'New York Jets', 'NYJ', 'https://cdn.yoursite.com/logos/nfl/nyj.png'
FROM leagues WHERE code = 'NFL'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Cincinnati Bengals', 'CIN', 'https://cdn.yoursite.com/logos/nfl/cin.png'
FROM leagues WHERE code = 'NFL'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Cleveland Browns', 'CLE', 'https://cdn.yoursite.com/logos/nfl/cle.png'
FROM leagues WHERE code = 'NFL'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Pittsburgh Steelers', 'PIT', 'https://cdn.yoursite.com/logos/nfl/pit.png'
FROM leagues WHERE code = 'NFL'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Houston Texans', 'HOU', 'https://cdn.yoursite.com/logos/nfl/hou.png'
FROM leagues WHERE code = 'NFL'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Indianapolis Colts', 'IND', 'https://cdn.yoursite.com/logos/nfl/ind.png'
FROM leagues WHERE code = 'NFL'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Jacksonville Jaguars', 'JAX', 'https://cdn.yoursite.com/logos/nfl/jax.png'
FROM leagues WHERE code = 'NFL'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Tennessee Titans', 'TEN', 'https://cdn.yoursite.com/logos/nfl/ten.png'
FROM leagues WHERE code = 'NFL'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Denver Broncos', 'DEN', 'https://cdn.yoursite.com/logos/nfl/den.png'
FROM leagues WHERE code = 'NFL'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Kansas City Chiefs', 'KC', 'https://cdn.yoursite.com/logos/nfl/kc.png'
FROM leagues WHERE code = 'NFL'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Las Vegas Raiders', 'LV', 'https://cdn.yoursite.com/logos/nfl/lv.png'
FROM leagues WHERE code = 'NFL'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Los Angeles Chargers', 'LAC', 'https://cdn.yoursite.com/logos/nfl/lac.png'
FROM leagues WHERE code = 'NFL'
ON CONFLICT DO NOTHING;

-- NBA Teams
INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Los Angeles Lakers', 'LAL', 'https://cdn.yoursite.com/logos/nba/lal.png'
FROM leagues WHERE code = 'NBA'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Boston Celtics', 'BOS', 'https://cdn.yoursite.com/logos/nba/bos.png'
FROM leagues WHERE code = 'NBA'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Golden State Warriors', 'GSW', 'https://cdn.yoursite.com/logos/nba/gsw.png'
FROM leagues WHERE code = 'NBA'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Miami Heat', 'MIA', 'https://cdn.yoursite.com/logos/nba/mia.png'
FROM leagues WHERE code = 'NBA'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Chicago Bulls', 'CHI', 'https://cdn.yoursite.com/logos/nba/chi.png'
FROM leagues WHERE code = 'NBA'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'New York Knicks', 'NYK', 'https://cdn.yoursite.com/logos/nba/nyk.png'
FROM leagues WHERE code = 'NBA'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Phoenix Suns', 'PHX', 'https://cdn.yoursite.com/logos/nba/phx.png'
FROM leagues WHERE code = 'NBA'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Dallas Mavericks', 'DAL', 'https://cdn.yoursite.com/logos/nba/dal.png'
FROM leagues WHERE code = 'NBA'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Denver Nuggets', 'DEN', 'https://cdn.yoursite.com/logos/nba/den.png'
FROM leagues WHERE code = 'NBA'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Milwaukee Bucks', 'MIL', 'https://cdn.yoursite.com/logos/nba/mil.png'
FROM leagues WHERE code = 'NBA'
ON CONFLICT DO NOTHING;

-- MLB Teams
INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'New York Yankees', 'NYY', 'https://cdn.yoursite.com/logos/mlb/nyy.png'
FROM leagues WHERE code = 'MLB'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Boston Red Sox', 'BOS', 'https://cdn.yoursite.com/logos/mlb/bos.png'
FROM leagues WHERE code = 'MLB'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Los Angeles Dodgers', 'LAD', 'https://cdn.yoursite.com/logos/mlb/lad.png'
FROM leagues WHERE code = 'MLB'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Houston Astros', 'HOU', 'https://cdn.yoursite.com/logos/mlb/hou.png'
FROM leagues WHERE code = 'MLB'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Atlanta Braves', 'ATL', 'https://cdn.yoursite.com/logos/mlb/atl.png'
FROM leagues WHERE code = 'MLB'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'San Francisco Giants', 'SF', 'https://cdn.yoursite.com/logos/mlb/sf.png'
FROM leagues WHERE code = 'MLB'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Chicago Cubs', 'CHC', 'https://cdn.yoursite.com/logos/mlb/chc.png'
FROM leagues WHERE code = 'MLB'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'St. Louis Cardinals', 'STL', 'https://cdn.yoursite.com/logos/mlb/stl.png'
FROM leagues WHERE code = 'MLB'
ON CONFLICT DO NOTHING;

-- WNBA Teams
INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Las Vegas Aces', 'LVA', 'https://cdn.yoursite.com/logos/wnba/lva.png'
FROM leagues WHERE code = 'WNBA'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'New York Liberty', 'NYL', 'https://cdn.yoursite.com/logos/wnba/nyl.png'
FROM leagues WHERE code = 'WNBA'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Connecticut Sun', 'CONN', 'https://cdn.yoursite.com/logos/wnba/conn.png'
FROM leagues WHERE code = 'WNBA'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Minnesota Lynx', 'MIN', 'https://cdn.yoursite.com/logos/wnba/min.png'
FROM leagues WHERE code = 'WNBA'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Seattle Storm', 'SEA', 'https://cdn.yoursite.com/logos/wnba/sea.png'
FROM leagues WHERE code = 'WNBA'
ON CONFLICT DO NOTHING;

-- NHL Teams
INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Chicago Blackhawks', 'CHI', 'https://cdn.yoursite.com/logos/nhl/chi.png'
FROM leagues WHERE code = 'NHL'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Boston Bruins', 'BOS', 'https://cdn.yoursite.com/logos/nhl/bos.png'
FROM leagues WHERE code = 'NHL'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'New York Rangers', 'NYR', 'https://cdn.yoursite.com/logos/nhl/nyr.png'
FROM leagues WHERE code = 'NHL'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Montreal Canadiens', 'MTL', 'https://cdn.yoursite.com/logos/nhl/mtl.png'
FROM leagues WHERE code = 'NHL'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Toronto Maple Leafs', 'TOR', 'https://cdn.yoursite.com/logos/nhl/tor.png'
FROM leagues WHERE code = 'NHL'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Detroit Red Wings', 'DET', 'https://cdn.yoursite.com/logos/nhl/det.png'
FROM leagues WHERE code = 'NHL'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Pittsburgh Penguins', 'PIT', 'https://cdn.yoursite.com/logos/nhl/pit.png'
FROM leagues WHERE code = 'NHL'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Edmonton Oilers', 'EDM', 'https://cdn.yoursite.com/logos/nhl/edm.png'
FROM leagues WHERE code = 'NHL'
ON CONFLICT DO NOTHING;

-- CBB (College Basketball) Teams
INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Duke Blue Devils', 'DUKE', 'https://cdn.yoursite.com/logos/cbb/duke.png'
FROM leagues WHERE code = 'CBB'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'North Carolina Tar Heels', 'UNC', 'https://cdn.yoursite.com/logos/cbb/unc.png'
FROM leagues WHERE code = 'CBB'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Kentucky Wildcats', 'UK', 'https://cdn.yoursite.com/logos/cbb/uk.png'
FROM leagues WHERE code = 'CBB'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Kansas Jayhawks', 'KU', 'https://cdn.yoursite.com/logos/cbb/ku.png'
FROM leagues WHERE code = 'CBB'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'UCLA Bruins', 'UCLA', 'https://cdn.yoursite.com/logos/cbb/ucla.png'
FROM leagues WHERE code = 'CBB'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Gonzaga Bulldogs', 'GONZ', 'https://cdn.yoursite.com/logos/cbb/gonz.png'
FROM leagues WHERE code = 'CBB'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Villanova Wildcats', 'NOVA', 'https://cdn.yoursite.com/logos/cbb/nova.png'
FROM leagues WHERE code = 'CBB'
ON CONFLICT DO NOTHING;

INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Michigan State Spartans', 'MSU', 'https://cdn.yoursite.com/logos/cbb/msu.png'
FROM leagues WHERE code = 'CBB'
ON CONFLICT DO NOTHING;
