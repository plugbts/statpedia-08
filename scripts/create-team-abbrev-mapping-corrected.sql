-- Create team abbreviation mapping table (corrected for actual team names)
CREATE TABLE IF NOT EXISTS team_abbrev_map (
  league TEXT NOT NULL,
  api_abbrev TEXT NOT NULL,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  PRIMARY KEY (league, api_abbrev)
);

-- Clear any existing mappings
DELETE FROM team_abbrev_map;

-- NBA Abbreviations (matching actual team names in database)
INSERT INTO team_abbrev_map (league, api_abbrev, team_id)
VALUES
  ('NBA','ATL',(SELECT id FROM teams WHERE abbreviation='ATL' AND name='Atlanta Hawks')),
  ('NBA','BOS',(SELECT id FROM teams WHERE abbreviation='BOS' AND name='Boston Celtics')),
  ('NBA','BCE',(SELECT id FROM teams WHERE abbreviation='BCE' AND name='Boston Celtics')), -- alt
  ('NBA','BKN',(SELECT id FROM teams WHERE abbreviation='BKN' AND name='Brooklyn Nets')),
  ('NBA','CHA',(SELECT id FROM teams WHERE abbreviation='CHA' AND name='Charlotte Hornets')),
  ('NBA','CHI',(SELECT id FROM teams WHERE abbreviation='CHI' AND name='Chicago Bulls')),
  ('NBA','CLE',(SELECT id FROM teams WHERE abbreviation='CLE' AND name='Cleveland Cavaliers')),
  ('NBA','DAL',(SELECT id FROM teams WHERE abbreviation='DAL' AND name='Dallas Mavericks')),
  ('NBA','DEN',(SELECT id FROM teams WHERE abbreviation='DEN' AND name='Denver Nuggets')),
  ('NBA','DET',(SELECT id FROM teams WHERE abbreviation='DET' AND name='Detroit Pistons')),
  ('NBA','GSW',(SELECT id FROM teams WHERE abbreviation='GSW' AND name='Golden State Warriors')),
  ('NBA','GS',(SELECT id FROM teams WHERE abbreviation='GSW' AND name='Golden State Warriors')), -- alt
  ('NBA','HOU',(SELECT id FROM teams WHERE abbreviation='HOU' AND name='Houston Rockets')),
  ('NBA','IND',(SELECT id FROM teams WHERE abbreviation='IND' AND name='Indiana Pacers')),
  ('NBA','LAC',(SELECT id FROM teams WHERE abbreviation='LAC' AND name='LA Clippers')),
  ('NBA','LAL',(SELECT id FROM teams WHERE abbreviation='LAL' AND name='Los Angeles Lakers')),
  ('NBA','MEM',(SELECT id FROM teams WHERE abbreviation='MEM' AND name='Memphis Grizzlies')),
  ('NBA','MIA',(SELECT id FROM teams WHERE abbreviation='MIA' AND name='Miami Heat')),
  ('NBA','MIL',(SELECT id FROM teams WHERE abbreviation='MIL' AND name='Milwaukee Bucks')),
  ('NBA','MIN',(SELECT id FROM teams WHERE abbreviation='MIN' AND name='Minnesota Timberwolves')),
  ('NBA','NOP',(SELECT id FROM teams WHERE abbreviation='NOP' AND name='New Orleans Pelicans')),
  ('NBA','NO',(SELECT id FROM teams WHERE abbreviation='NO' AND name='New Orleans Pelicans')), -- alt
  ('NBA','NYK',(SELECT id FROM teams WHERE abbreviation='NYK' AND name='New York Knicks')),
  ('NBA','NY',(SELECT id FROM teams WHERE abbreviation='NYK' AND name='New York Knicks')), -- alt
  ('NBA','OKC',(SELECT id FROM teams WHERE abbreviation='OKC' AND name='Oklahoma City Thunder')),
  ('NBA','ORL',(SELECT id FROM teams WHERE abbreviation='ORL' AND name='Orlando Magic')),
  ('NBA','PHI',(SELECT id FROM teams WHERE abbreviation='PHI' AND name='Philadelphia 76ers')),
  ('NBA','PHX',(SELECT id FROM teams WHERE abbreviation='PHX' AND name='Phoenix Suns')),
  ('NBA','POR',(SELECT id FROM teams WHERE abbreviation='POR' AND name='Portland Trail Blazers')),
  ('NBA','SAC',(SELECT id FROM teams WHERE abbreviation='SAC' AND name='Sacramento Kings')),
  ('NBA','SAS',(SELECT id FROM teams WHERE abbreviation='SAS' AND name='San Antonio Spurs')),
  ('NBA','SA',(SELECT id FROM teams WHERE abbreviation='SAS' AND name='San Antonio Spurs')), -- alt
  ('NBA','TOR',(SELECT id FROM teams WHERE abbreviation='TOR' AND name='Toronto Raptors')),
  ('NBA','UTA',(SELECT id FROM teams WHERE abbreviation='UTA' AND name='Utah Jazz')),
  ('NBA','UJA',(SELECT id FROM teams WHERE abbreviation='UJA' AND name='Utah Jazz')), -- alt
  ('NBA','WAS',(SELECT id FROM teams WHERE abbreviation='WAS' AND name='Washington Wizards'));

-- WNBA Abbreviations (matching actual team names in database)
INSERT INTO team_abbrev_map (league, api_abbrev, team_id)
VALUES
  ('WNBA','ATL',(SELECT id FROM teams WHERE abbreviation='ATL' AND name='Atlanta Dream')),
  ('WNBA','CHI',(SELECT id FROM teams WHERE abbreviation='CHI' AND name='Chicago Sky')),
  ('WNBA','CON',(SELECT id FROM teams WHERE abbreviation='CONN' AND name='Connecticut Sun')), -- API uses CON
  ('WNBA','CONN',(SELECT id FROM teams WHERE abbreviation='CONN' AND name='Connecticut Sun')),
  ('WNBA','DAL',(SELECT id FROM teams WHERE abbreviation='DAL' AND name='Dallas Wings')),
  ('WNBA','IND',(SELECT id FROM teams WHERE abbreviation='IND' AND name='Indiana Fever')),
  ('WNBA','NYL',(SELECT id FROM teams WHERE abbreviation='NYL' AND name='New York Liberty')),
  ('WNBA','WAS',(SELECT id FROM teams WHERE abbreviation='WAS' AND name='Washington Mystics')),
  ('WNBA','LVA',(SELECT id FROM teams WHERE abbreviation='LVA' AND name='Las Vegas Aces')),
  ('WNBA','LAS',(SELECT id FROM teams WHERE abbreviation='LAS' AND name='Los Angeles Sparks')),
  ('WNBA','MIN',(SELECT id FROM teams WHERE abbreviation='MIN' AND name='Minnesota Lynx')),
  ('WNBA','PHX',(SELECT id FROM teams WHERE abbreviation='PHX' AND name='Phoenix Mercury')),
  ('WNBA','SEA',(SELECT id FROM teams WHERE abbreviation='SEA' AND name='Seattle Storm')),
  ('WNBA','GSV',(SELECT id FROM teams WHERE abbreviation='GSV' AND name='Golden State Valkyries'));

-- NFL Abbreviations (matching actual team names in database)
INSERT INTO team_abbrev_map (league, api_abbrev, team_id)
VALUES
  ('NFL','ARI',(SELECT id FROM teams WHERE abbreviation='ARI' AND name='Arizona Cardinals')),
  ('NFL','ATL',(SELECT id FROM teams WHERE abbreviation='ATL' AND name='Atlanta Falcons')),
  ('NFL','BAL',(SELECT id FROM teams WHERE abbreviation='BAL' AND name='Baltimore Ravens')),
  ('NFL','BUF',(SELECT id FROM teams WHERE abbreviation='BUF' AND name='Buffalo Bills')),
  ('NFL','CAR',(SELECT id FROM teams WHERE abbreviation='CAR' AND name='Carolina Panthers')),
  ('NFL','CHI',(SELECT id FROM teams WHERE abbreviation='CHI' AND name='Chicago Bears')),
  ('NFL','CIN',(SELECT id FROM teams WHERE abbreviation='CIN' AND name='Cincinnati Bengals')),
  ('NFL','CLE',(SELECT id FROM teams WHERE abbreviation='CLE' AND name='Cleveland Browns')),
  ('NFL','DAL',(SELECT id FROM teams WHERE abbreviation='DAL' AND name='Dallas Cowboys')),
  ('NFL','DEN',(SELECT id FROM teams WHERE abbreviation='DEN' AND name='Denver Broncos')),
  ('NFL','DET',(SELECT id FROM teams WHERE abbreviation='DET' AND name='Detroit Lions')),
  ('NFL','GB',(SELECT id FROM teams WHERE abbreviation='GB' AND name='Green Bay Packers')),
  ('NFL','HOU',(SELECT id FROM teams WHERE abbreviation='HOU' AND name='Houston Texans')),
  ('NFL','IND',(SELECT id FROM teams WHERE abbreviation='IND' AND name='Indianapolis Colts')),
  ('NFL','JAX',(SELECT id FROM teams WHERE abbreviation='JAX' AND name='Jacksonville Jaguars')),
  ('NFL','KC',(SELECT id FROM teams WHERE abbreviation='KC' AND name='Kansas City Chiefs')),
  ('NFL','LV',(SELECT id FROM teams WHERE abbreviation='LV' AND name='Las Vegas Raiders')),
  ('NFL','LAC',(SELECT id FROM teams WHERE abbreviation='LAC' AND name='Los Angeles Chargers')),
  ('NFL','LAR',(SELECT id FROM teams WHERE abbreviation='LAR' AND name='Los Angeles Rams')),
  ('NFL','LA',(SELECT id FROM teams WHERE abbreviation='LA' AND name='Los Angeles Rams')), -- alt
  ('NFL','MIA',(SELECT id FROM teams WHERE abbreviation='MIA' AND name='Miami Dolphins')),
  ('NFL','MIN',(SELECT id FROM teams WHERE abbreviation='MIN' AND name='Minnesota Vikings')),
  ('NFL','NE',(SELECT id FROM teams WHERE abbreviation='NE' AND name='New England Patriots')),
  ('NFL','NO',(SELECT id FROM teams WHERE abbreviation='NO' AND name='New Orleans Saints')),
  ('NFL','NYG',(SELECT id FROM teams WHERE abbreviation='NYG' AND name='New York Giants')),
  ('NFL','NYJ',(SELECT id FROM teams WHERE abbreviation='NYJ' AND name='New York Jets')),
  ('NFL','PHI',(SELECT id FROM teams WHERE abbreviation='PHI' AND name='Philadelphia Eagles')),
  ('NFL','PIT',(SELECT id FROM teams WHERE abbreviation='PIT' AND name='Pittsburgh Steelers')),
  ('NFL','SF',(SELECT id FROM teams WHERE abbreviation='SF' AND name='San Francisco 49ers')),
  ('NFL','SEA',(SELECT id FROM teams WHERE abbreviation='SEA' AND name='Seattle Seahawks')),
  ('NFL','TB',(SELECT id FROM teams WHERE abbreviation='TB' AND name='Tampa Bay Buccaneers')),
  ('NFL','TEN',(SELECT id FROM teams WHERE abbreviation='TEN' AND name='Tennessee Titans')),
  ('NFL','WAS',(SELECT id FROM teams WHERE abbreviation='WAS' AND name='Washington Commanders')),
  ('NFL','WSH',(SELECT id FROM teams WHERE abbreviation='WSH' AND name='Washington Commanders')); -- alt

-- MLB Abbreviations (matching actual team names in database)
INSERT INTO team_abbrev_map (league, api_abbrev, team_id)
VALUES
  ('MLB','ARI',(SELECT id FROM teams WHERE abbreviation='ARI' AND name='Arizona Diamondbacks')),
  ('MLB','ATL',(SELECT id FROM teams WHERE abbreviation='ATL' AND name='Atlanta Braves')),
  ('MLB','BAL',(SELECT id FROM teams WHERE abbreviation='BAL' AND name='Baltimore Orioles')),
  ('MLB','BOS',(SELECT id FROM teams WHERE abbreviation='BOS' AND name='Boston Red Sox')),
  ('MLB','CHC',(SELECT id FROM teams WHERE abbreviation='CHC' AND name='Chicago Cubs')),
  ('MLB','CHW',(SELECT id FROM teams WHERE abbreviation='CWS' AND name='Chicago White Sox')), -- API uses CHW
  ('MLB','CWS',(SELECT id FROM teams WHERE abbreviation='CWS' AND name='Chicago White Sox')),
  ('MLB','CIN',(SELECT id FROM teams WHERE abbreviation='CIN' AND name='Cincinnati Reds')),
  ('MLB','CLE',(SELECT id FROM teams WHERE abbreviation='CLE' AND name='Cleveland Guardians')),
  ('MLB','COL',(SELECT id FROM teams WHERE abbreviation='COL' AND name='Colorado Rockies')),
  ('MLB','DET',(SELECT id FROM teams WHERE abbreviation='DET' AND name='Detroit Tigers')),
  ('MLB','HOU',(SELECT id FROM teams WHERE abbreviation='HOU' AND name='Houston Astros')),
  ('MLB','KC',(SELECT id FROM teams WHERE abbreviation='KC' AND name='Kansas City Royals')),
  ('MLB','LAA',(SELECT id FROM teams WHERE abbreviation='LAA' AND name='Los Angeles Angels')),
  ('MLB','LAD',(SELECT id FROM teams WHERE abbreviation='LAD' AND name='Los Angeles Dodgers')),
  ('MLB','MIA',(SELECT id FROM teams WHERE abbreviation='MIA' AND name='Miami Marlins')),
  ('MLB','MIL',(SELECT id FROM teams WHERE abbreviation='MIL' AND name='Milwaukee Brewers')),
  ('MLB','MIN',(SELECT id FROM teams WHERE abbreviation='MIN' AND name='Minnesota Twins')),
  ('MLB','NYM',(SELECT id FROM teams WHERE abbreviation='NYM' AND name='New York Mets')),
  ('MLB','NYY',(SELECT id FROM teams WHERE abbreviation='NYY' AND name='New York Yankees')),
  ('MLB','OAK',(SELECT id FROM teams WHERE abbreviation='OAK' AND name='Oakland Athletics')),
  ('MLB','PHI',(SELECT id FROM teams WHERE abbreviation='PHI' AND name='Philadelphia Phillies')),
  ('MLB','PIT',(SELECT id FROM teams WHERE abbreviation='PIT' AND name='Pittsburgh Pirates')),
  ('MLB','SD',(SELECT id FROM teams WHERE abbreviation='SD' AND name='San Diego Padres')),
  ('MLB','SDP',(SELECT id FROM teams WHERE abbreviation='SD' AND name='San Diego Padres')), -- alt
  ('MLB','SF',(SELECT id FROM teams WHERE abbreviation='SF' AND name='San Francisco Giants')),
  ('MLB','SFG',(SELECT id FROM teams WHERE abbreviation='SF' AND name='San Francisco Giants')), -- alt
  ('MLB','SEA',(SELECT id FROM teams WHERE abbreviation='SEA' AND name='Seattle Mariners')),
  ('MLB','STL',(SELECT id FROM teams WHERE abbreviation='STL' AND name='St. Louis Cardinals')),
  ('MLB','TB',(SELECT id FROM teams WHERE abbreviation='TB' AND name='Tampa Bay Rays')),
  ('MLB','TEX',(SELECT id FROM teams WHERE abbreviation='TEX' AND name='Texas Rangers')),
  ('MLB','TOR',(SELECT id FROM teams WHERE abbreviation='TOR' AND name='Toronto Blue Jays')),
  ('MLB','WSH',(SELECT id FROM teams WHERE abbreviation='WSH' AND name='Washington Nationals'));

-- NHL Abbreviations (matching actual team names in database)
INSERT INTO team_abbrev_map (league, api_abbrev, team_id)
VALUES
  ('NHL','ANA',(SELECT id FROM teams WHERE abbreviation='ANA' AND name='Anaheim Ducks')),
  ('NHL','BOS',(SELECT id FROM teams WHERE abbreviation='BOS' AND name='Boston Bruins')),
  ('NHL','BBR',(SELECT id FROM teams WHERE abbreviation='BBR' AND name='Boston Bruins')), -- alt
  ('NHL','BUF',(SELECT id FROM teams WHERE abbreviation='BUF' AND name='Buffalo Sabres')),
  ('NHL','CAR',(SELECT id FROM teams WHERE abbreviation='CAR' AND name='Carolina Hurricanes')),
  ('NHL','CBJ',(SELECT id FROM teams WHERE abbreviation='CBJ' AND name='Columbus Blue Jackets')),
  ('NHL','CGY',(SELECT id FROM teams WHERE abbreviation='CGY' AND name='Calgary Flames')),
  ('NHL','CHI',(SELECT id FROM teams WHERE abbreviation='CHI' AND name='Chicago Blackhawks')),
  ('NHL','COL',(SELECT id FROM teams WHERE abbreviation='COL' AND name='Colorado Avalanche')),
  ('NHL','DAL',(SELECT id FROM teams WHERE abbreviation='DAL' AND name='Dallas Stars')),
  ('NHL','DET',(SELECT id FROM teams WHERE abbreviation='DET' AND name='Detroit Red Wings')),
  ('NHL','EDM',(SELECT id FROM teams WHERE abbreviation='EDM' AND name='Edmonton Oilers')),
  ('NHL','FLA',(SELECT id FROM teams WHERE abbreviation='FLA' AND name='Florida Panthers')),
  ('NHL','LAK',(SELECT id FROM teams WHERE abbreviation='LAK' AND name='Los Angeles Kings')),
  ('NHL','LA',(SELECT id FROM teams WHERE abbreviation='LA' AND name='Los Angeles Kings')), -- alt
  ('NHL','MIN',(SELECT id FROM teams WHERE abbreviation='MIN' AND name='Minnesota Wild')),
  ('NHL','MTL',(SELECT id FROM teams WHERE abbreviation='MTL' AND name='Montreal Canadiens')),
  ('NHL','NJD',(SELECT id FROM teams WHERE abbreviation='NJD' AND name='New Jersey Devils')),
  ('NHL','NJ',(SELECT id FROM teams WHERE abbreviation='NJ' AND name='New Jersey Devils')), -- alt
  ('NHL','NSH',(SELECT id FROM teams WHERE abbreviation='NSH' AND name='Nashville Predators')),
  ('NHL','NYI',(SELECT id FROM teams WHERE abbreviation='NYI' AND name='New York Islanders')),
  ('NHL','NYR',(SELECT id FROM teams WHERE abbreviation='NYR' AND name='New York Rangers')),
  ('NHL','OTT',(SELECT id FROM teams WHERE abbreviation='OTT' AND name='Ottawa Senators')),
  ('NHL','PHI',(SELECT id FROM teams WHERE abbreviation='PHI' AND name='Philadelphia Flyers')),
  ('NHL','PIT',(SELECT id FROM teams WHERE abbreviation='PIT' AND name='Pittsburgh Penguins')),
  ('NHL','SEA',(SELECT id FROM teams WHERE abbreviation='SEA' AND name='Seattle Kraken')),
  ('NHL','SJS',(SELECT id FROM teams WHERE abbreviation='SJ' AND name='San Jose Sharks')), -- API uses SJS
  ('NHL','SJ',(SELECT id FROM teams WHERE abbreviation='SJ' AND name='San Jose Sharks')),
  ('NHL','STL',(SELECT id FROM teams WHERE abbreviation='STL' AND name='St. Louis Blues')),
  ('NHL','TBL',(SELECT id FROM teams WHERE abbreviation='TB' AND name='Tampa Bay Lightning')), -- API uses TBL
  ('NHL','TB',(SELECT id FROM teams WHERE abbreviation='TB' AND name='Tampa Bay Lightning')),
  ('NHL','TOR',(SELECT id FROM teams WHERE abbreviation='TOR' AND name='Toronto Maple Leafs')),
  ('NHL','UTA',(SELECT id FROM teams WHERE abbreviation='UTA' AND name='Utah Mammoth')), -- 2024 relocation
  ('NHL','UMA',(SELECT id FROM teams WHERE abbreviation='UMA' AND name='Utah Mammoth')), -- alt
  ('NHL','ARI',(SELECT id FROM teams WHERE abbreviation='ARI' AND name='Arizona Coyotes')), -- legacy for historical data
  ('NHL','VAN',(SELECT id FROM teams WHERE abbreviation='VAN' AND name='Vancouver Canucks')),
  ('NHL','VGK',(SELECT id FROM teams WHERE abbreviation='VGK' AND name='Vegas Golden Knights')),
  ('NHL','WPG',(SELECT id FROM teams WHERE abbreviation='WPG' AND name='Winnipeg Jets')),
  ('NHL','WSH',(SELECT id FROM teams WHERE abbreviation='WSH' AND name='Washington Capitals'));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_team_abbrev_map_lookup ON team_abbrev_map (league, api_abbrev);

-- Validate the mappings
SELECT 
  league,
  COUNT(*) as mappings_count,
  COUNT(DISTINCT team_id) as unique_teams
FROM team_abbrev_map 
GROUP BY league 
ORDER BY league;
