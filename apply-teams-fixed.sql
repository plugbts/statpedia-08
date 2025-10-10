-- Apply teams table with fixed data (no duplicates)
-- 1) Canonical teams table
create table if not exists teams (
  id serial primary key,
  league text not null check (league in ('nfl','nba','mlb','nhl')),
  team_name text not null,         -- canonical full name, e.g., "Green Bay Packers"
  abbreviation text not null,      -- e.g., "GB"
  logo_url text,                   -- e.g., "/logos/nfl/gb.svg" or https URL
  aliases jsonb default '[]'::jsonb, -- array of alternate names, e.g., ["packers","green bay"]
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Clear any existing teams data first
DELETE FROM teams WHERE league = 'nfl';

-- Insert NFL teams with unique abbreviations (without aliases column)
insert into teams (league, team_name, abbreviation, logo_url)
values
('nfl','Arizona Cardinals','ARI','https://a.espncdn.com/i/teamlogos/nfl/500/ari.png'),
('nfl','Atlanta Falcons','ATL','https://a.espncdn.com/i/teamlogos/nfl/500/atl.png'),
('nfl','Baltimore Ravens','BAL','https://a.espncdn.com/i/teamlogos/nfl/500/bal.png'),
('nfl','Buffalo Bills','BUF','https://a.espncdn.com/i/teamlogos/nfl/500/buf.png'),
('nfl','Carolina Panthers','CAR','https://a.espncdn.com/i/teamlogos/nfl/500/car.png'),
('nfl','Chicago Bears','CHI','https://a.espncdn.com/i/teamlogos/nfl/500/chi.png'),
('nfl','Cincinnati Bengals','CIN','https://a.espncdn.com/i/teamlogos/nfl/500/cin.png'),
('nfl','Cleveland Browns','CLE','https://a.espncdn.com/i/teamlogos/nfl/500/cle.png'),
('nfl','Dallas Cowboys','DAL','https://a.espncdn.com/i/teamlogos/nfl/500/dal.png'),
('nfl','Denver Broncos','DEN','https://a.espncdn.com/i/teamlogos/nfl/500/den.png'),
('nfl','Detroit Lions','DET','https://a.espncdn.com/i/teamlogos/nfl/500/det.png'),
('nfl','Green Bay Packers','GB','https://a.espncdn.com/i/teamlogos/nfl/500/gb.png'),
('nfl','Houston Texans','HOU','https://a.espncdn.com/i/teamlogos/nfl/500/hou.png'),
('nfl','Indianapolis Colts','IND','https://a.espncdn.com/i/teamlogos/nfl/500/ind.png'),
('nfl','Jacksonville Jaguars','JAX','https://a.espncdn.com/i/teamlogos/nfl/500/jax.png'),
('nfl','Kansas City Chiefs','KC','https://a.espncdn.com/i/teamlogos/nfl/500/kc.png'),
('nfl','Las Vegas Raiders','LV','https://a.espncdn.com/i/teamlogos/nfl/500/lv.png'),
('nfl','Los Angeles Chargers','LAC','https://a.espncdn.com/i/teamlogos/nfl/500/lac.png'),
('nfl','Los Angeles Rams','LAR','https://a.espncdn.com/i/teamlogos/nfl/500/lar.png'),
('nfl','Miami Dolphins','MIA','https://a.espncdn.com/i/teamlogos/nfl/500/mia.png'),
('nfl','Minnesota Vikings','MIN','https://a.espncdn.com/i/teamlogos/nfl/500/min.png'),
('nfl','New England Patriots','NE','https://a.espncdn.com/i/teamlogos/nfl/500/ne.png'),
('nfl','New Orleans Saints','NO','https://a.espncdn.com/i/teamlogos/nfl/500/no.png'),
('nfl','New York Giants','NYG','https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png'),
('nfl','New York Jets','NYJ','https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png'),
('nfl','Philadelphia Eagles','PHI','https://a.espncdn.com/i/teamlogos/nfl/500/phi.png'),
('nfl','Pittsburgh Steelers','PIT','https://a.espncdn.com/i/teamlogos/nfl/500/pit.png'),
('nfl','San Francisco 49ers','SF','https://a.espncdn.com/i/teamlogos/nfl/500/sf.png'),
('nfl','Seattle Seahawks','SEA','https://a.espncdn.com/i/teamlogos/nfl/500/sea.png'),
('nfl','Tampa Bay Buccaneers','TB','https://a.espncdn.com/i/teamlogos/nfl/500/tb.png'),
('nfl','Tennessee Titans','TEN','https://a.espncdn.com/i/teamlogos/nfl/500/ten.png'),
('nfl','Washington Commanders','WAS','https://a.espncdn.com/i/teamlogos/nfl/500/wsh.png');

-- Now create the unique indexes after data is inserted
create unique index if not exists ux_teams_league_name
  on teams (league, lower(team_name));

create unique index if not exists ux_teams_league_abbr
  on teams (league, upper(abbreviation));

-- Verification
select league, count(*) as teams from teams group by league order by league;
select abbreviation, count(*) as count from teams where league = 'nfl' group by abbreviation having count(*) > 1;
