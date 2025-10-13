-- Create team abbreviation mapping table
CREATE TABLE IF NOT EXISTS team_abbrev_map (
  league TEXT NOT NULL,
  api_abbrev TEXT NOT NULL,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  PRIMARY KEY (league, api_abbrev)
);

-- NBA Abbreviations
INSERT INTO team_abbrev_map (league, api_abbrev, team_id)
VALUES
  ('NBA','ATL',(SELECT id FROM teams WHERE name='Atlanta Hawks')),
  ('NBA','BOS',(SELECT id FROM teams WHERE name='Boston Celtics')),
  ('NBA','BKN',(SELECT id FROM teams WHERE name='Brooklyn Nets')),
  ('NBA','CHA',(SELECT id FROM teams WHERE name='Charlotte Hornets')),
  ('NBA','CHI',(SELECT id FROM teams WHERE name='Chicago Bulls')),
  ('NBA','CLE',(SELECT id FROM teams WHERE name='Cleveland Cavaliers')),
  ('NBA','DAL',(SELECT id FROM teams WHERE name='Dallas Mavericks')),
  ('NBA','DEN',(SELECT id FROM teams WHERE name='Denver Nuggets')),
  ('NBA','DET',(SELECT id FROM teams WHERE name='Detroit Pistons')),
  ('NBA','GSW',(SELECT id FROM teams WHERE name='Golden State Warriors')),
  ('NBA','GS',(SELECT id FROM teams WHERE name='Golden State Warriors')), -- alt
  ('NBA','HOU',(SELECT id FROM teams WHERE name='Houston Rockets')),
  ('NBA','IND',(SELECT id FROM teams WHERE name='Indiana Pacers')),
  ('NBA','LAC',(SELECT id FROM teams WHERE name='Los Angeles Clippers')),
  ('NBA','LAL',(SELECT id FROM teams WHERE name='Los Angeles Lakers')),
  ('NBA','MEM',(SELECT id FROM teams WHERE name='Memphis Grizzlies')),
  ('NBA','MIA',(SELECT id FROM teams WHERE name='Miami Heat')),
  ('NBA','MIL',(SELECT id FROM teams WHERE name='Milwaukee Bucks')),
  ('NBA','MIN',(SELECT id FROM teams WHERE name='Minnesota Timberwolves')),
  ('NBA','NOP',(SELECT id FROM teams WHERE name='New Orleans Pelicans')),
  ('NBA','NO',(SELECT id FROM teams WHERE name='New Orleans Pelicans')), -- alt
  ('NBA','NYK',(SELECT id FROM teams WHERE name='New York Knicks')),
  ('NBA','NY',(SELECT id FROM teams WHERE name='New York Knicks')), -- alt
  ('NBA','OKC',(SELECT id FROM teams WHERE name='Oklahoma City Thunder')),
  ('NBA','ORL',(SELECT id FROM teams WHERE name='Orlando Magic')),
  ('NBA','PHI',(SELECT id FROM teams WHERE name='Philadelphia 76ers')),
  ('NBA','PHX',(SELECT id FROM teams WHERE name='Phoenix Suns')),
  ('NBA','POR',(SELECT id FROM teams WHERE name='Portland Trail Blazers')),
  ('NBA','SAC',(SELECT id FROM teams WHERE name='Sacramento Kings')),
  ('NBA','SAS',(SELECT id FROM teams WHERE name='San Antonio Spurs')),
  ('NBA','SA',(SELECT id FROM teams WHERE name='San Antonio Spurs')), -- alt
  ('NBA','TOR',(SELECT id FROM teams WHERE name='Toronto Raptors')),
  ('NBA','UTA',(SELECT id FROM teams WHERE name='Utah Jazz')),
  ('NBA','WAS',(SELECT id FROM teams WHERE name='Washington Wizards'));

-- WNBA Abbreviations
INSERT INTO team_abbrev_map (league, api_abbrev, team_id)
VALUES
  ('WNBA','ATL',(SELECT id FROM teams WHERE name='Atlanta Dream')),
  ('WNBA','CHI',(SELECT id FROM teams WHERE name='Chicago Sky')),
  ('WNBA','CON',(SELECT id FROM teams WHERE name='Connecticut Sun')),
  ('WNBA','DAL',(SELECT id FROM teams WHERE name='Dallas Wings')),
  ('WNBA','IND',(SELECT id FROM teams WHERE name='Indiana Fever')),
  ('WNBA','NYL',(SELECT id FROM teams WHERE name='New York Liberty')),
  ('WNBA','WAS',(SELECT id FROM teams WHERE name='Washington Mystics')),
  ('WNBA','LVA',(SELECT id FROM teams WHERE name='Las Vegas Aces')),
  ('WNBA','LAS',(SELECT id FROM teams WHERE name='Los Angeles Sparks')),
  ('WNBA','MIN',(SELECT id FROM teams WHERE name='Minnesota Lynx')),
  ('WNBA','PHX',(SELECT id FROM teams WHERE name='Phoenix Mercury')),
  ('WNBA','SEA',(SELECT id FROM teams WHERE name='Seattle Storm')),
  ('WNBA','GSV',(SELECT id FROM teams WHERE name='Golden State Valkyries'));

-- NFL Abbreviations
INSERT INTO team_abbrev_map (league, api_abbrev, team_id)
VALUES
  ('NFL','ARI',(SELECT id FROM teams WHERE name='Arizona Cardinals')),
  ('NFL','ATL',(SELECT id FROM teams WHERE name='Atlanta Falcons')),
  ('NFL','BAL',(SELECT id FROM teams WHERE name='Baltimore Ravens')),
  ('NFL','BUF',(SELECT id FROM teams WHERE name='Buffalo Bills')),
  ('NFL','CAR',(SELECT id FROM teams WHERE name='Carolina Panthers')),
  ('NFL','CHI',(SELECT id FROM teams WHERE name='Chicago Bears')),
  ('NFL','CIN',(SELECT id FROM teams WHERE name='Cincinnati Bengals')),
  ('NFL','CLE',(SELECT id FROM teams WHERE name='Cleveland Browns')),
  ('NFL','DAL',(SELECT id FROM teams WHERE name='Dallas Cowboys')),
  ('NFL','DEN',(SELECT id FROM teams WHERE name='Denver Broncos')),
  ('NFL','DET',(SELECT id FROM teams WHERE name='Detroit Lions')),
  ('NFL','GB',(SELECT id FROM teams WHERE name='Green Bay Packers')),
  ('NFL','HOU',(SELECT id FROM teams WHERE name='Houston Texans')),
  ('NFL','IND',(SELECT id FROM teams WHERE name='Indianapolis Colts')),
  ('NFL','JAX',(SELECT id FROM teams WHERE name='Jacksonville Jaguars')),
  ('NFL','KC',(SELECT id FROM teams WHERE name='Kansas City Chiefs')),
  ('NFL','LV',(SELECT id FROM teams WHERE name='Las Vegas Raiders')),
  ('NFL','LAC',(SELECT id FROM teams WHERE name='Los Angeles Chargers')),
  ('NFL','LAR',(SELECT id FROM teams WHERE name='Los Angeles Rams')),
  ('NFL','MIA',(SELECT id FROM teams WHERE name='Miami Dolphins')),
  ('NFL','MIN',(SELECT id FROM teams WHERE name='Minnesota Vikings')),
  ('NFL','NE',(SELECT id FROM teams WHERE name='New England Patriots')),
  ('NFL','NO',(SELECT id FROM teams WHERE name='New Orleans Saints')),
  ('NFL','NYG',(SELECT id FROM teams WHERE name='New York Giants')),
  ('NFL','NYJ',(SELECT id FROM teams WHERE name='New York Jets')),
  ('NFL','PHI',(SELECT id FROM teams WHERE name='Philadelphia Eagles')),
  ('NFL','PIT',(SELECT id FROM teams WHERE name='Pittsburgh Steelers')),
  ('NFL','SF',(SELECT id FROM teams WHERE name='San Francisco 49ers')),
  ('NFL','SEA',(SELECT id FROM teams WHERE name='Seattle Seahawks')),
  ('NFL','TB',(SELECT id FROM teams WHERE name='Tampa Bay Buccaneers')),
  ('NFL','TEN',(SELECT id FROM teams WHERE name='Tennessee Titans')),
  ('NFL','WAS',(SELECT id FROM teams WHERE name='Washington Commanders')),
  ('NFL','WSH',(SELECT id FROM teams WHERE name='Washington Commanders')); -- alt

-- MLB Abbreviations
INSERT INTO team_abbrev_map (league, api_abbrev, team_id)
VALUES
  ('MLB','ARI',(SELECT id FROM teams WHERE name='Arizona Diamondbacks')),
  ('MLB','ATL',(SELECT id FROM teams WHERE name='Atlanta Braves')),
  ('MLB','BAL',(SELECT id FROM teams WHERE name='Baltimore Orioles')),
  ('MLB','BOS',(SELECT id FROM teams WHERE name='Boston Red Sox')),
  ('MLB','CHC',(SELECT id FROM teams WHERE name='Chicago Cubs')),
  ('MLB','CHW',(SELECT id FROM teams WHERE name='Chicago White Sox')),
  ('MLB','CIN',(SELECT id FROM teams WHERE name='Cincinnati Reds')),
  ('MLB','CLE',(SELECT id FROM teams WHERE name='Cleveland Guardians')),
  ('MLB','COL',(SELECT id FROM teams WHERE name='Colorado Rockies')),
  ('MLB','DET',(SELECT id FROM teams WHERE name='Detroit Tigers')),
  ('MLB','HOU',(SELECT id FROM teams WHERE name='Houston Astros')),
  ('MLB','KC',(SELECT id FROM teams WHERE name='Kansas City Royals')),
  ('MLB','LAA',(SELECT id FROM teams WHERE name='Los Angeles Angels')),
  ('MLB','LAD',(SELECT id FROM teams WHERE name='Los Angeles Dodgers')),
  ('MLB','MIA',(SELECT id FROM teams WHERE name='Miami Marlins')),
  ('MLB','MIL',(SELECT id FROM teams WHERE name='Milwaukee Brewers')),
  ('MLB','MIN',(SELECT id FROM teams WHERE name='Minnesota Twins')),
  ('MLB','NYM',(SELECT id FROM teams WHERE name='New York Mets')),
  ('MLB','NYY',(SELECT id FROM teams WHERE name='New York Yankees')),
  ('MLB','OAK',(SELECT id FROM teams WHERE name='Oakland Athletics')),
  ('MLB','PHI',(SELECT id FROM teams WHERE name='Philadelphia Phillies')),
  ('MLB','PIT',(SELECT id FROM teams WHERE name='Pittsburgh Pirates')),
  ('MLB','SD',(SELECT id FROM teams WHERE name='San Diego Padres')),
  ('MLB','SDP',(SELECT id FROM teams WHERE name='San Diego Padres')), -- alt
  ('MLB','SF',(SELECT id FROM teams WHERE name='San Francisco Giants')),
  ('MLB','SFG',(SELECT id FROM teams WHERE name='San Francisco Giants')), -- alt
  ('MLB','SEA',(SELECT id FROM teams WHERE name='Seattle Mariners')),
  ('MLB','STL',(SELECT id FROM teams WHERE name='St. Louis Cardinals')),
  ('MLB','TB',(SELECT id FROM teams WHERE name='Tampa Bay Rays')),
  ('MLB','TEX',(SELECT id FROM teams WHERE name='Texas Rangers')),
  ('MLB','TOR',(SELECT id FROM teams WHERE name='Toronto Blue Jays')),
  ('MLB','WSH',(SELECT id FROM teams WHERE name='Washington Nationals'));

-- NHL Abbreviations
INSERT INTO team_abbrev_map (league, api_abbrev, team_id)
VALUES
  ('NHL','ANA',(SELECT id FROM teams WHERE name='Anaheim Ducks')),
  ('NHL','BOS',(SELECT id FROM teams WHERE name='Boston Bruins')),
  ('NHL','BUF',(SELECT id FROM teams WHERE name='Buffalo Sabres')),
  ('NHL','CAR',(SELECT id FROM teams WHERE name='Carolina Hurricanes')),
  ('NHL','CBJ',(SELECT id FROM teams WHERE name='Columbus Blue Jackets')),
  ('NHL','CGY',(SELECT id FROM teams WHERE name='Calgary Flames')),
  ('NHL','CHI',(SELECT id FROM teams WHERE name='Chicago Blackhawks')),
  ('NHL','COL',(SELECT id FROM teams WHERE name='Colorado Avalanche')),
  ('NHL','DAL',(SELECT id FROM teams WHERE name='Dallas Stars')),
  ('NHL','DET',(SELECT id FROM teams WHERE name='Detroit Red Wings')),
  ('NHL','EDM',(SELECT id FROM teams WHERE name='Edmonton Oilers')),
  ('NHL','FLA',(SELECT id FROM teams WHERE name='Florida Panthers')),
  ('NHL','LAK',(SELECT id FROM teams WHERE name='Los Angeles Kings')),
  ('NHL','LA',(SELECT id FROM teams WHERE name='Los Angeles Kings')), -- alt
  ('NHL','MIN',(SELECT id FROM teams WHERE name='Minnesota Wild')),
  ('NHL','MTL',(SELECT id FROM teams WHERE name='Montreal Canadiens')),
  ('NHL','NJD',(SELECT id FROM teams WHERE name='New Jersey Devils')),
  ('NHL','NJ',(SELECT id FROM teams WHERE name='New Jersey Devils')), -- alt
  ('NHL','NSH',(SELECT id FROM teams WHERE name='Nashville Predators')),
  ('NHL','NYI',(SELECT id FROM teams WHERE name='New York Islanders')),
  ('NHL','NYR',(SELECT id FROM teams WHERE name='New York Rangers')),
  ('NHL','OTT',(SELECT id FROM teams WHERE name='Ottawa Senators')),
  ('NHL','PHI',(SELECT id FROM teams WHERE name='Philadelphia Flyers')),
  ('NHL','PIT',(SELECT id FROM teams WHERE name='Pittsburgh Penguins')),
  ('NHL','SEA',(SELECT id FROM teams WHERE name='Seattle Kraken')),
  ('NHL','SJS',(SELECT id FROM teams WHERE name='San Jose Sharks')),
  ('NHL','STL',(SELECT id FROM teams WHERE name='St. Louis Blues')),
  ('NHL','TBL',(SELECT id FROM teams WHERE name='Tampa Bay Lightning')),
  ('NHL','TOR',(SELECT id FROM teams WHERE name='Toronto Maple Leafs')),
  ('NHL','UTA',(SELECT id FROM teams WHERE name='Utah Mammoth')), -- 2024 relocation
  ('NHL','ARI',(SELECT id FROM teams WHERE name='Arizona Coyotes')), -- legacy for historical data
  ('NHL','VAN',(SELECT id FROM teams WHERE name='Vancouver Canucks')),
  ('NHL','VGK',(SELECT id FROM teams WHERE name='Vegas Golden Knights')),
  ('NHL','WPG',(SELECT id FROM teams WHERE name='Winnipeg Jets')),
  ('NHL','WSH',(SELECT id FROM teams WHERE name='Washington Capitals'));

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
