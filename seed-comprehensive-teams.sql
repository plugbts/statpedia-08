-- Comprehensive Team Seeding for StatPedia
-- This file seeds ALL major teams for each league with proper ESPN logo URLs

-- Clear existing teams first (optional - comment out if you want to keep existing data)
-- DELETE FROM teams;

-- NFL Teams (32 teams)
INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Arizona Cardinals', 'ARI', 'https://a.espncdn.com/i/teamlogos/nfl/500/ari.png'
FROM leagues WHERE code = 'NFL'
UNION ALL
SELECT id, 'Atlanta Falcons', 'ATL', 'https://a.espncdn.com/i/teamlogos/nfl/500/atl.png'
FROM leagues WHERE code = 'NFL'
UNION ALL
SELECT id, 'Baltimore Ravens', 'BAL', 'https://a.espncdn.com/i/teamlogos/nfl/500/bal.png'
FROM leagues WHERE code = 'NFL'
UNION ALL
SELECT id, 'Buffalo Bills', 'BUF', 'https://a.espncdn.com/i/teamlogos/nfl/500/buf.png'
FROM leagues WHERE code = 'NFL'
UNION ALL
SELECT id, 'Carolina Panthers', 'CAR', 'https://a.espncdn.com/i/teamlogos/nfl/500/car.png'
FROM leagues WHERE code = 'NFL'
UNION ALL
SELECT id, 'Chicago Bears', 'CHI', 'https://a.espncdn.com/i/teamlogos/nfl/500/chi.png'
FROM leagues WHERE code = 'NFL'
UNION ALL
SELECT id, 'Cincinnati Bengals', 'CIN', 'https://a.espncdn.com/i/teamlogos/nfl/500/cin.png'
FROM leagues WHERE code = 'NFL'
UNION ALL
SELECT id, 'Cleveland Browns', 'CLE', 'https://a.espncdn.com/i/teamlogos/nfl/500/cle.png'
FROM leagues WHERE code = 'NFL'
UNION ALL
SELECT id, 'Dallas Cowboys', 'DAL', 'https://a.espncdn.com/i/teamlogos/nfl/500/dal.png'
FROM leagues WHERE code = 'NFL'
UNION ALL
SELECT id, 'Denver Broncos', 'DEN', 'https://a.espncdn.com/i/teamlogos/nfl/500/den.png'
FROM leagues WHERE code = 'NFL'
UNION ALL
SELECT id, 'Detroit Lions', 'DET', 'https://a.espncdn.com/i/teamlogos/nfl/500/det.png'
FROM leagues WHERE code = 'NFL'
UNION ALL
SELECT id, 'Green Bay Packers', 'GB', 'https://a.espncdn.com/i/teamlogos/nfl/500/gb.png'
FROM leagues WHERE code = 'NFL'
UNION ALL
SELECT id, 'Houston Texans', 'HOU', 'https://a.espncdn.com/i/teamlogos/nfl/500/hou.png'
FROM leagues WHERE code = 'NFL'
UNION ALL
SELECT id, 'Indianapolis Colts', 'IND', 'https://a.espncdn.com/i/teamlogos/nfl/500/ind.png'
FROM leagues WHERE code = 'NFL'
UNION ALL
SELECT id, 'Jacksonville Jaguars', 'JAX', 'https://a.espncdn.com/i/teamlogos/nfl/500/jax.png'
FROM leagues WHERE code = 'NFL'
UNION ALL
SELECT id, 'Kansas City Chiefs', 'KC', 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png'
FROM leagues WHERE code = 'NFL'
UNION ALL
SELECT id, 'Las Vegas Raiders', 'LV', 'https://a.espncdn.com/i/teamlogos/nfl/500/lv.png'
FROM leagues WHERE code = 'NFL'
UNION ALL
SELECT id, 'Los Angeles Chargers', 'LAC', 'https://a.espncdn.com/i/teamlogos/nfl/500/lac.png'
FROM leagues WHERE code = 'NFL'
UNION ALL
SELECT id, 'Los Angeles Rams', 'LAR', 'https://a.espncdn.com/i/teamlogos/nfl/500/lar.png'
FROM leagues WHERE code = 'NFL'
UNION ALL
SELECT id, 'Miami Dolphins', 'MIA', 'https://a.espncdn.com/i/teamlogos/nfl/500/mia.png'
FROM leagues WHERE code = 'NFL'
UNION ALL
SELECT id, 'Minnesota Vikings', 'MIN', 'https://a.espncdn.com/i/teamlogos/nfl/500/min.png'
FROM leagues WHERE code = 'NFL'
UNION ALL
SELECT id, 'New England Patriots', 'NE', 'https://a.espncdn.com/i/teamlogos/nfl/500/ne.png'
FROM leagues WHERE code = 'NFL'
UNION ALL
SELECT id, 'New Orleans Saints', 'NO', 'https://a.espncdn.com/i/teamlogos/nfl/500/no.png'
FROM leagues WHERE code = 'NFL'
UNION ALL
SELECT id, 'New York Giants', 'NYG', 'https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png'
FROM leagues WHERE code = 'NFL'
UNION ALL
SELECT id, 'New York Jets', 'NYJ', 'https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png'
FROM leagues WHERE code = 'NFL'
UNION ALL
SELECT id, 'Philadelphia Eagles', 'PHI', 'https://a.espncdn.com/i/teamlogos/nfl/500/phi.png'
FROM leagues WHERE code = 'NFL'
UNION ALL
SELECT id, 'Pittsburgh Steelers', 'PIT', 'https://a.espncdn.com/i/teamlogos/nfl/500/pit.png'
FROM leagues WHERE code = 'NFL'
UNION ALL
SELECT id, 'San Francisco 49ers', 'SF', 'https://a.espncdn.com/i/teamlogos/nfl/500/sf.png'
FROM leagues WHERE code = 'NFL'
UNION ALL
SELECT id, 'Seattle Seahawks', 'SEA', 'https://a.espncdn.com/i/teamlogos/nfl/500/sea.png'
FROM leagues WHERE code = 'NFL'
UNION ALL
SELECT id, 'Tampa Bay Buccaneers', 'TB', 'https://a.espncdn.com/i/teamlogos/nfl/500/tb.png'
FROM leagues WHERE code = 'NFL'
UNION ALL
SELECT id, 'Tennessee Titans', 'TEN', 'https://a.espncdn.com/i/teamlogos/nfl/500/ten.png'
FROM leagues WHERE code = 'NFL'
UNION ALL
SELECT id, 'Washington Commanders', 'WSH', 'https://a.espncdn.com/i/teamlogos/nfl/500/wsh.png'
FROM leagues WHERE code = 'NFL'
ON CONFLICT (league_id, abbreviation) DO UPDATE SET
  name = EXCLUDED.name,
  logo_url = EXCLUDED.logo_url;

-- NBA Teams (30 teams)
INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Atlanta Hawks', 'ATL', 'https://a.espncdn.com/i/teamlogos/nba/500/atl.png'
FROM leagues WHERE code = 'NBA'
UNION ALL
SELECT id, 'Boston Celtics', 'BOS', 'https://a.espncdn.com/i/teamlogos/nba/500/bos.png'
FROM leagues WHERE code = 'NBA'
UNION ALL
SELECT id, 'Brooklyn Nets', 'BKN', 'https://a.espncdn.com/i/teamlogos/nba/500/bkn.png'
FROM leagues WHERE code = 'NBA'
UNION ALL
SELECT id, 'Charlotte Hornets', 'CHA', 'https://a.espncdn.com/i/teamlogos/nba/500/cha.png'
FROM leagues WHERE code = 'NBA'
UNION ALL
SELECT id, 'Chicago Bulls', 'CHI', 'https://a.espncdn.com/i/teamlogos/nba/500/chi.png'
FROM leagues WHERE code = 'NBA'
UNION ALL
SELECT id, 'Cleveland Cavaliers', 'CLE', 'https://a.espncdn.com/i/teamlogos/nba/500/cle.png'
FROM leagues WHERE code = 'NBA'
UNION ALL
SELECT id, 'Dallas Mavericks', 'DAL', 'https://a.espncdn.com/i/teamlogos/nba/500/dal.png'
FROM leagues WHERE code = 'NBA'
UNION ALL
SELECT id, 'Denver Nuggets', 'DEN', 'https://a.espncdn.com/i/teamlogos/nba/500/den.png'
FROM leagues WHERE code = 'NBA'
UNION ALL
SELECT id, 'Detroit Pistons', 'DET', 'https://a.espncdn.com/i/teamlogos/nba/500/det.png'
FROM leagues WHERE code = 'NBA'
UNION ALL
SELECT id, 'Golden State Warriors', 'GSW', 'https://a.espncdn.com/i/teamlogos/nba/500/gsw.png'
FROM leagues WHERE code = 'NBA'
UNION ALL
SELECT id, 'Houston Rockets', 'HOU', 'https://a.espncdn.com/i/teamlogos/nba/500/hou.png'
FROM leagues WHERE code = 'NBA'
UNION ALL
SELECT id, 'Indiana Pacers', 'IND', 'https://a.espncdn.com/i/teamlogos/nba/500/ind.png'
FROM leagues WHERE code = 'NBA'
UNION ALL
SELECT id, 'LA Clippers', 'LAC', 'https://a.espncdn.com/i/teamlogos/nba/500/lac.png'
FROM leagues WHERE code = 'NBA'
UNION ALL
SELECT id, 'Los Angeles Lakers', 'LAL', 'https://a.espncdn.com/i/teamlogos/nba/500/lal.png'
FROM leagues WHERE code = 'NBA'
UNION ALL
SELECT id, 'Memphis Grizzlies', 'MEM', 'https://a.espncdn.com/i/teamlogos/nba/500/mem.png'
FROM leagues WHERE code = 'NBA'
UNION ALL
SELECT id, 'Miami Heat', 'MIA', 'https://a.espncdn.com/i/teamlogos/nba/500/mia.png'
FROM leagues WHERE code = 'NBA'
UNION ALL
SELECT id, 'Milwaukee Bucks', 'MIL', 'https://a.espncdn.com/i/teamlogos/nba/500/mil.png'
FROM leagues WHERE code = 'NBA'
UNION ALL
SELECT id, 'Minnesota Timberwolves', 'MIN', 'https://a.espncdn.com/i/teamlogos/nba/500/min.png'
FROM leagues WHERE code = 'NBA'
UNION ALL
SELECT id, 'New Orleans Pelicans', 'NO', 'https://a.espncdn.com/i/teamlogos/nba/500/no.png'
FROM leagues WHERE code = 'NBA'
UNION ALL
SELECT id, 'New York Knicks', 'NYK', 'https://a.espncdn.com/i/teamlogos/nba/500/nyk.png'
FROM leagues WHERE code = 'NBA'
UNION ALL
SELECT id, 'Oklahoma City Thunder', 'OKC', 'https://a.espncdn.com/i/teamlogos/nba/500/okc.png'
FROM leagues WHERE code = 'NBA'
UNION ALL
SELECT id, 'Orlando Magic', 'ORL', 'https://a.espncdn.com/i/teamlogos/nba/500/orl.png'
FROM leagues WHERE code = 'NBA'
UNION ALL
SELECT id, 'Philadelphia 76ers', 'PHI', 'https://a.espncdn.com/i/teamlogos/nba/500/phi.png'
FROM leagues WHERE code = 'NBA'
UNION ALL
SELECT id, 'Phoenix Suns', 'PHX', 'https://a.espncdn.com/i/teamlogos/nba/500/phx.png'
FROM leagues WHERE code = 'NBA'
UNION ALL
SELECT id, 'Portland Trail Blazers', 'POR', 'https://a.espncdn.com/i/teamlogos/nba/500/por.png'
FROM leagues WHERE code = 'NBA'
UNION ALL
SELECT id, 'Sacramento Kings', 'SAC', 'https://a.espncdn.com/i/teamlogos/nba/500/sac.png'
FROM leagues WHERE code = 'NBA'
UNION ALL
SELECT id, 'San Antonio Spurs', 'SAS', 'https://a.espncdn.com/i/teamlogos/nba/500/sas.png'
FROM leagues WHERE code = 'NBA'
UNION ALL
SELECT id, 'Toronto Raptors', 'TOR', 'https://a.espncdn.com/i/teamlogos/nba/500/tor.png'
FROM leagues WHERE code = 'NBA'
UNION ALL
SELECT id, 'Utah Jazz', 'UTA', 'https://a.espncdn.com/i/teamlogos/nba/500/uta.png'
FROM leagues WHERE code = 'NBA'
UNION ALL
SELECT id, 'Washington Wizards', 'WAS', 'https://a.espncdn.com/i/teamlogos/nba/500/was.png'
FROM leagues WHERE code = 'NBA'
ON CONFLICT (league_id, abbreviation) DO UPDATE SET
  name = EXCLUDED.name,
  logo_url = EXCLUDED.logo_url;

-- MLB Teams (30 teams)
INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Arizona Diamondbacks', 'ARI', 'https://a.espncdn.com/i/teamlogos/mlb/500/ari.png'
FROM leagues WHERE code = 'MLB'
UNION ALL
SELECT id, 'Atlanta Braves', 'ATL', 'https://a.espncdn.com/i/teamlogos/mlb/500/atl.png'
FROM leagues WHERE code = 'MLB'
UNION ALL
SELECT id, 'Baltimore Orioles', 'BAL', 'https://a.espncdn.com/i/teamlogos/mlb/500/bal.png'
FROM leagues WHERE code = 'MLB'
UNION ALL
SELECT id, 'Boston Red Sox', 'BOS', 'https://a.espncdn.com/i/teamlogos/mlb/500/bos.png'
FROM leagues WHERE code = 'MLB'
UNION ALL
SELECT id, 'Chicago Cubs', 'CHC', 'https://a.espncdn.com/i/teamlogos/mlb/500/chc.png'
FROM leagues WHERE code = 'MLB'
UNION ALL
SELECT id, 'Chicago White Sox', 'CWS', 'https://a.espncdn.com/i/teamlogos/mlb/500/cws.png'
FROM leagues WHERE code = 'MLB'
UNION ALL
SELECT id, 'Cincinnati Reds', 'CIN', 'https://a.espncdn.com/i/teamlogos/mlb/500/cin.png'
FROM leagues WHERE code = 'MLB'
UNION ALL
SELECT id, 'Cleveland Guardians', 'CLE', 'https://a.espncdn.com/i/teamlogos/mlb/500/cle.png'
FROM leagues WHERE code = 'MLB'
UNION ALL
SELECT id, 'Colorado Rockies', 'COL', 'https://a.espncdn.com/i/teamlogos/mlb/500/col.png'
FROM leagues WHERE code = 'MLB'
UNION ALL
SELECT id, 'Detroit Tigers', 'DET', 'https://a.espncdn.com/i/teamlogos/mlb/500/det.png'
FROM leagues WHERE code = 'MLB'
UNION ALL
SELECT id, 'Houston Astros', 'HOU', 'https://a.espncdn.com/i/teamlogos/mlb/500/hou.png'
FROM leagues WHERE code = 'MLB'
UNION ALL
SELECT id, 'Kansas City Royals', 'KC', 'https://a.espncdn.com/i/teamlogos/mlb/500/kc.png'
FROM leagues WHERE code = 'MLB'
UNION ALL
SELECT id, 'Los Angeles Angels', 'LAA', 'https://a.espncdn.com/i/teamlogos/mlb/500/laa.png'
FROM leagues WHERE code = 'MLB'
UNION ALL
SELECT id, 'Los Angeles Dodgers', 'LAD', 'https://a.espncdn.com/i/teamlogos/mlb/500/lad.png'
FROM leagues WHERE code = 'MLB'
UNION ALL
SELECT id, 'Miami Marlins', 'MIA', 'https://a.espncdn.com/i/teamlogos/mlb/500/mia.png'
FROM leagues WHERE code = 'MLB'
UNION ALL
SELECT id, 'Milwaukee Brewers', 'MIL', 'https://a.espncdn.com/i/teamlogos/mlb/500/mil.png'
FROM leagues WHERE code = 'MLB'
UNION ALL
SELECT id, 'Minnesota Twins', 'MIN', 'https://a.espncdn.com/i/teamlogos/mlb/500/min.png'
FROM leagues WHERE code = 'MLB'
UNION ALL
SELECT id, 'New York Mets', 'NYM', 'https://a.espncdn.com/i/teamlogos/mlb/500/nym.png'
FROM leagues WHERE code = 'MLB'
UNION ALL
SELECT id, 'New York Yankees', 'NYY', 'https://a.espncdn.com/i/teamlogos/mlb/500/nyy.png'
FROM leagues WHERE code = 'MLB'
UNION ALL
SELECT id, 'Oakland Athletics', 'OAK', 'https://a.espncdn.com/i/teamlogos/mlb/500/oak.png'
FROM leagues WHERE code = 'MLB'
UNION ALL
SELECT id, 'Philadelphia Phillies', 'PHI', 'https://a.espncdn.com/i/teamlogos/mlb/500/phi.png'
FROM leagues WHERE code = 'MLB'
UNION ALL
SELECT id, 'Pittsburgh Pirates', 'PIT', 'https://a.espncdn.com/i/teamlogos/mlb/500/pit.png'
FROM leagues WHERE code = 'MLB'
UNION ALL
SELECT id, 'San Diego Padres', 'SD', 'https://a.espncdn.com/i/teamlogos/mlb/500/sd.png'
FROM leagues WHERE code = 'MLB'
UNION ALL
SELECT id, 'San Francisco Giants', 'SF', 'https://a.espncdn.com/i/teamlogos/mlb/500/sf.png'
FROM leagues WHERE code = 'MLB'
UNION ALL
SELECT id, 'Seattle Mariners', 'SEA', 'https://a.espncdn.com/i/teamlogos/mlb/500/sea.png'
FROM leagues WHERE code = 'MLB'
UNION ALL
SELECT id, 'St. Louis Cardinals', 'STL', 'https://a.espncdn.com/i/teamlogos/mlb/500/stl.png'
FROM leagues WHERE code = 'MLB'
UNION ALL
SELECT id, 'Tampa Bay Rays', 'TB', 'https://a.espncdn.com/i/teamlogos/mlb/500/tb.png'
FROM leagues WHERE code = 'MLB'
UNION ALL
SELECT id, 'Texas Rangers', 'TEX', 'https://a.espncdn.com/i/teamlogos/mlb/500/tex.png'
FROM leagues WHERE code = 'MLB'
UNION ALL
SELECT id, 'Toronto Blue Jays', 'TOR', 'https://a.espncdn.com/i/teamlogos/mlb/500/tor.png'
FROM leagues WHERE code = 'MLB'
UNION ALL
SELECT id, 'Washington Nationals', 'WSH', 'https://a.espncdn.com/i/teamlogos/mlb/500/wsh.png'
FROM leagues WHERE code = 'MLB'
ON CONFLICT (league_id, abbreviation) DO UPDATE SET
  name = EXCLUDED.name,
  logo_url = EXCLUDED.logo_url;

-- NHL Teams (32 teams)
INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Anaheim Ducks', 'ANA', 'https://a.espncdn.com/i/teamlogos/nhl/500/ana.png'
FROM leagues WHERE code = 'NHL'
UNION ALL
SELECT id, 'Arizona Coyotes', 'ARI', 'https://a.espncdn.com/i/teamlogos/nhl/500/ari.png'
FROM leagues WHERE code = 'NHL'
UNION ALL
SELECT id, 'Boston Bruins', 'BOS', 'https://a.espncdn.com/i/teamlogos/nhl/500/bos.png'
FROM leagues WHERE code = 'NHL'
UNION ALL
SELECT id, 'Buffalo Sabres', 'BUF', 'https://a.espncdn.com/i/teamlogos/nhl/500/buf.png'
FROM leagues WHERE code = 'NHL'
UNION ALL
SELECT id, 'Calgary Flames', 'CGY', 'https://a.espncdn.com/i/teamlogos/nhl/500/cgy.png'
FROM leagues WHERE code = 'NHL'
UNION ALL
SELECT id, 'Carolina Hurricanes', 'CAR', 'https://a.espncdn.com/i/teamlogos/nhl/500/car.png'
FROM leagues WHERE code = 'NHL'
UNION ALL
SELECT id, 'Chicago Blackhawks', 'CHI', 'https://a.espncdn.com/i/teamlogos/nhl/500/chi.png'
FROM leagues WHERE code = 'NHL'
UNION ALL
SELECT id, 'Colorado Avalanche', 'COL', 'https://a.espncdn.com/i/teamlogos/nhl/500/col.png'
FROM leagues WHERE code = 'NHL'
UNION ALL
SELECT id, 'Columbus Blue Jackets', 'CBJ', 'https://a.espncdn.com/i/teamlogos/nhl/500/cbj.png'
FROM leagues WHERE code = 'NHL'
UNION ALL
SELECT id, 'Dallas Stars', 'DAL', 'https://a.espncdn.com/i/teamlogos/nhl/500/dal.png'
FROM leagues WHERE code = 'NHL'
UNION ALL
SELECT id, 'Detroit Red Wings', 'DET', 'https://a.espncdn.com/i/teamlogos/nhl/500/det.png'
FROM leagues WHERE code = 'NHL'
UNION ALL
SELECT id, 'Edmonton Oilers', 'EDM', 'https://a.espncdn.com/i/teamlogos/nhl/500/edm.png'
FROM leagues WHERE code = 'NHL'
UNION ALL
SELECT id, 'Florida Panthers', 'FLA', 'https://a.espncdn.com/i/teamlogos/nhl/500/fla.png'
FROM leagues WHERE code = 'NHL'
UNION ALL
SELECT id, 'Los Angeles Kings', 'LAK', 'https://a.espncdn.com/i/teamlogos/nhl/500/lak.png'
FROM leagues WHERE code = 'NHL'
UNION ALL
SELECT id, 'Minnesota Wild', 'MIN', 'https://a.espncdn.com/i/teamlogos/nhl/500/min.png'
FROM leagues WHERE code = 'NHL'
UNION ALL
SELECT id, 'Montreal Canadiens', 'MTL', 'https://a.espncdn.com/i/teamlogos/nhl/500/mtl.png'
FROM leagues WHERE code = 'NHL'
UNION ALL
SELECT id, 'Nashville Predators', 'NSH', 'https://a.espncdn.com/i/teamlogos/nhl/500/nsh.png'
FROM leagues WHERE code = 'NHL'
UNION ALL
SELECT id, 'New Jersey Devils', 'NJD', 'https://a.espncdn.com/i/teamlogos/nhl/500/njd.png'
FROM leagues WHERE code = 'NHL'
UNION ALL
SELECT id, 'New York Islanders', 'NYI', 'https://a.espncdn.com/i/teamlogos/nhl/500/nyi.png'
FROM leagues WHERE code = 'NHL'
UNION ALL
SELECT id, 'New York Rangers', 'NYR', 'https://a.espncdn.com/i/teamlogos/nhl/500/nyr.png'
FROM leagues WHERE code = 'NHL'
UNION ALL
SELECT id, 'Ottawa Senators', 'OTT', 'https://a.espncdn.com/i/teamlogos/nhl/500/ott.png'
FROM leagues WHERE code = 'NHL'
UNION ALL
SELECT id, 'Philadelphia Flyers', 'PHI', 'https://a.espncdn.com/i/teamlogos/nhl/500/phi.png'
FROM leagues WHERE code = 'NHL'
UNION ALL
SELECT id, 'Pittsburgh Penguins', 'PIT', 'https://a.espncdn.com/i/teamlogos/nhl/500/pit.png'
FROM leagues WHERE code = 'NHL'
UNION ALL
SELECT id, 'San Jose Sharks', 'SJ', 'https://a.espncdn.com/i/teamlogos/nhl/500/sj.png'
FROM leagues WHERE code = 'NHL'
UNION ALL
SELECT id, 'Seattle Kraken', 'SEA', 'https://a.espncdn.com/i/teamlogos/nhl/500/sea.png'
FROM leagues WHERE code = 'NHL'
UNION ALL
SELECT id, 'St. Louis Blues', 'STL', 'https://a.espncdn.com/i/teamlogos/nhl/500/stl.png'
FROM leagues WHERE code = 'NHL'
UNION ALL
SELECT id, 'Tampa Bay Lightning', 'TB', 'https://a.espncdn.com/i/teamlogos/nhl/500/tb.png'
FROM leagues WHERE code = 'NHL'
UNION ALL
SELECT id, 'Toronto Maple Leafs', 'TOR', 'https://a.espncdn.com/i/teamlogos/nhl/500/tor.png'
FROM leagues WHERE code = 'NHL'
UNION ALL
SELECT id, 'Vancouver Canucks', 'VAN', 'https://a.espncdn.com/i/teamlogos/nhl/500/van.png'
FROM leagues WHERE code = 'NHL'
UNION ALL
SELECT id, 'Vegas Golden Knights', 'VGK', 'https://a.espncdn.com/i/teamlogos/nhl/500/vgk.png'
FROM leagues WHERE code = 'NHL'
UNION ALL
SELECT id, 'Washington Capitals', 'WSH', 'https://a.espncdn.com/i/teamlogos/nhl/500/wsh.png'
FROM leagues WHERE code = 'NHL'
UNION ALL
SELECT id, 'Winnipeg Jets', 'WPG', 'https://a.espncdn.com/i/teamlogos/nhl/500/wpg.png'
FROM leagues WHERE code = 'NHL'
ON CONFLICT (league_id, abbreviation) DO UPDATE SET
  name = EXCLUDED.name,
  logo_url = EXCLUDED.logo_url;

-- WNBA Teams (12 teams)
INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Atlanta Dream', 'ATL', 'https://a.espncdn.com/i/teamlogos/wnba/500/atl.png'
FROM leagues WHERE code = 'WNBA'
UNION ALL
SELECT id, 'Chicago Sky', 'CHI', 'https://a.espncdn.com/i/teamlogos/wnba/500/chi.png'
FROM leagues WHERE code = 'WNBA'
UNION ALL
SELECT id, 'Connecticut Sun', 'CONN', 'https://a.espncdn.com/i/teamlogos/wnba/500/conn.png'
FROM leagues WHERE code = 'WNBA'
UNION ALL
SELECT id, 'Dallas Wings', 'DAL', 'https://a.espncdn.com/i/teamlogos/wnba/500/dal.png'
FROM leagues WHERE code = 'WNBA'
UNION ALL
SELECT id, 'Indiana Fever', 'IND', 'https://a.espncdn.com/i/teamlogos/wnba/500/ind.png'
FROM leagues WHERE code = 'WNBA'
UNION ALL
SELECT id, 'Las Vegas Aces', 'LVA', 'https://a.espncdn.com/i/teamlogos/wnba/500/lva.png'
FROM leagues WHERE code = 'WNBA'
UNION ALL
SELECT id, 'Los Angeles Sparks', 'LAS', 'https://a.espncdn.com/i/teamlogos/wnba/500/las.png'
FROM leagues WHERE code = 'WNBA'
UNION ALL
SELECT id, 'Minnesota Lynx', 'MIN', 'https://a.espncdn.com/i/teamlogos/wnba/500/min.png'
FROM leagues WHERE code = 'WNBA'
UNION ALL
SELECT id, 'New York Liberty', 'NYL', 'https://a.espncdn.com/i/teamlogos/wnba/500/nyl.png'
FROM leagues WHERE code = 'WNBA'
UNION ALL
SELECT id, 'Phoenix Mercury', 'PHX', 'https://a.espncdn.com/i/teamlogos/wnba/500/phx.png'
FROM leagues WHERE code = 'WNBA'
UNION ALL
SELECT id, 'Seattle Storm', 'SEA', 'https://a.espncdn.com/i/teamlogos/wnba/500/sea.png'
FROM leagues WHERE code = 'WNBA'
UNION ALL
SELECT id, 'Washington Mystics', 'WAS', 'https://a.espncdn.com/i/teamlogos/wnba/500/was.png'
FROM leagues WHERE code = 'WNBA'
ON CONFLICT (league_id, abbreviation) DO UPDATE SET
  name = EXCLUDED.name,
  logo_url = EXCLUDED.logo_url;

-- College Basketball Teams (Major Programs - 25 teams)
INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Alabama Crimson Tide', 'ALA', 'https://a.espncdn.com/i/teamlogos/ncaa/500/333.png'
FROM leagues WHERE code = 'CBB'
UNION ALL
SELECT id, 'Arizona Wildcats', 'ARI', 'https://a.espncdn.com/i/teamlogos/ncaa/500/12.png'
FROM leagues WHERE code = 'CBB'
UNION ALL
SELECT id, 'Auburn Tigers', 'AUB', 'https://a.espncdn.com/i/teamlogos/ncaa/500/2.png'
FROM leagues WHERE code = 'CBB'
UNION ALL
SELECT id, 'Baylor Bears', 'BAY', 'https://a.espncdn.com/i/teamlogos/ncaa/500/239.png'
FROM leagues WHERE code = 'CBB'
UNION ALL
SELECT id, 'Connecticut Huskies', 'UConn', 'https://a.espncdn.com/i/teamlogos/ncaa/500/41.png'
FROM leagues WHERE code = 'CBB'
UNION ALL
SELECT id, 'Creighton Bluejays', 'CREI', 'https://a.espncdn.com/i/teamlogos/ncaa/500/154.png'
FROM leagues WHERE code = 'CBB'
UNION ALL
SELECT id, 'Duke Blue Devils', 'DUKE', 'https://a.espncdn.com/i/teamlogos/ncaa/500/150.png'
FROM leagues WHERE code = 'CBB'
UNION ALL
SELECT id, 'Florida Gators', 'FLA', 'https://a.espncdn.com/i/teamlogos/ncaa/500/57.png'
FROM leagues WHERE code = 'CBB'
UNION ALL
SELECT id, 'Gonzaga Bulldogs', 'GONZ', 'https://a.espncdn.com/i/teamlogos/ncaa/500/2250.png'
FROM leagues WHERE code = 'CBB'
UNION ALL
SELECT id, 'Houston Cougars', 'HOU', 'https://a.espncdn.com/i/teamlogos/ncaa/500/248.png'
FROM leagues WHERE code = 'CBB'
UNION ALL
SELECT id, 'Illinois Fighting Illini', 'ILL', 'https://a.espncdn.com/i/teamlogos/ncaa/500/356.png'
FROM leagues WHERE code = 'CBB'
UNION ALL
SELECT id, 'Iowa Hawkeyes', 'IOWA', 'https://a.espncdn.com/i/teamlogos/ncaa/500/2294.png'
FROM leagues WHERE code = 'CBB'
UNION ALL
SELECT id, 'Kansas Jayhawks', 'KU', 'https://a.espncdn.com/i/teamlogos/ncaa/500/2305.png'
FROM leagues WHERE code = 'CBB'
UNION ALL
SELECT id, 'Kentucky Wildcats', 'UK', 'https://a.espncdn.com/i/teamlogos/ncaa/500/96.png'
FROM leagues WHERE code = 'CBB'
UNION ALL
SELECT id, 'Louisville Cardinals', 'LOU', 'https://a.espncdn.com/i/teamlogos/ncaa/500/97.png'
FROM leagues WHERE code = 'CBB'
UNION ALL
SELECT id, 'Marquette Golden Eagles', 'MARQ', 'https://a.espncdn.com/i/teamlogos/ncaa/500/269.png'
FROM leagues WHERE code = 'CBB'
UNION ALL
SELECT id, 'Michigan State Spartans', 'MSU', 'https://a.espncdn.com/i/teamlogos/ncaa/500/127.png'
FROM leagues WHERE code = 'CBB'
UNION ALL
SELECT id, 'North Carolina Tar Heels', 'UNC', 'https://a.espncdn.com/i/teamlogos/ncaa/500/153.png'
FROM leagues WHERE code = 'CBB'
UNION ALL
SELECT id, 'Ohio State Buckeyes', 'OSU', 'https://a.espncdn.com/i/teamlogos/ncaa/500/194.png'
FROM leagues WHERE code = 'CBB'
UNION ALL
SELECT id, 'Purdue Boilermakers', 'PUR', 'https://a.espncdn.com/i/teamlogos/ncaa/500/2509.png'
FROM leagues WHERE code = 'CBB'
UNION ALL
SELECT id, 'Tennessee Volunteers', 'TENN', 'https://a.espncdn.com/i/teamlogos/ncaa/500/2633.png'
FROM leagues WHERE code = 'CBB'
UNION ALL
SELECT id, 'Texas Longhorns', 'TEX', 'https://a.espncdn.com/i/teamlogos/ncaa/500/251.png'
FROM leagues WHERE code = 'CBB'
UNION ALL
SELECT id, 'UCLA Bruins', 'UCLA', 'https://a.espncdn.com/i/teamlogos/ncaa/500/26.png'
FROM leagues WHERE code = 'CBB'
UNION ALL
SELECT id, 'Villanova Wildcats', 'NOVA', 'https://a.espncdn.com/i/teamlogos/ncaa/500/222.png'
FROM leagues WHERE code = 'CBB'
UNION ALL
SELECT id, 'Wisconsin Badgers', 'WIS', 'https://a.espncdn.com/i/teamlogos/ncaa/500/275.png'
FROM leagues WHERE code = 'CBB'
ON CONFLICT (league_id, abbreviation) DO UPDATE SET
  name = EXCLUDED.name,
  logo_url = EXCLUDED.logo_url;

-- Summary query to verify counts
SELECT 
  l.code as league,
  l.name as league_name,
  COUNT(t.id) as team_count
FROM leagues l 
LEFT JOIN teams t ON l.id = t.league_id 
GROUP BY l.code, l.name 
ORDER BY team_count DESC;
