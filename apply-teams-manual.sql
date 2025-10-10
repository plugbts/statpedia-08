-- Apply teams table manually
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

-- 2) Uniqueness per league (no duplicates)
create unique index if not exists ux_teams_league_name
  on teams (league, lower(team_name));

create unique index if not exists ux_teams_league_abbr
  on teams (league, upper(abbreviation));

-- 3) Trigger for updated_at
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_teams_updated_at on teams;
create trigger trg_teams_updated_at
before update on teams
for each row execute procedure set_updated_at();

-- Normalize input name for matching
create or replace function norm_team_name(s text)
returns text language sql immutable as $$
  select regexp_replace(lower(trim(s)), '\s+', ' ', 'g')
$$;

-- Clear any existing teams data first
DELETE FROM teams WHERE league = 'nfl';

-- Seed NFL data with corrected abbreviations
insert into teams (league, team_name, abbreviation, logo_url, aliases)
values
('nfl','Arizona Cardinals','ARI','https://a.espncdn.com/i/teamlogos/nfl/500/ari.png','["cardinals","ari","az"]'),
('nfl','Atlanta Falcons','ATL','https://a.espncdn.com/i/teamlogos/nfl/500/atl.png','["falcons","atl"]'),
('nfl','Baltimore Ravens','BAL','https://a.espncdn.com/i/teamlogos/nfl/500/bal.png','["ravens","bal"]'),
('nfl','Buffalo Bills','BUF','https://a.espncdn.com/i/teamlogos/nfl/500/buf.png','["bills","buf"]'),
('nfl','Carolina Panthers','CAR','https://a.espncdn.com/i/teamlogos/nfl/500/car.png','["panthers","car"]'),
('nfl','Chicago Bears','CHI','https://a.espncdn.com/i/teamlogos/nfl/500/chi.png','["bears","chi"]'),
('nfl','Cincinnati Bengals','CIN','https://a.espncdn.com/i/teamlogos/nfl/500/cin.png','["bengals","cin"]'),
('nfl','Cleveland Browns','CLE','https://a.espncdn.com/i/teamlogos/nfl/500/cle.png','["browns","cle"]'),
('nfl','Dallas Cowboys','DAL','https://a.espncdn.com/i/teamlogos/nfl/500/dal.png','["cowboys","dal"]'),
('nfl','Denver Broncos','DEN','https://a.espncdn.com/i/teamlogos/nfl/500/den.png','["broncos","den"]'),
('nfl','Detroit Lions','DET','https://a.espncdn.com/i/teamlogos/nfl/500/det.png','["lions","det"]'),
('nfl','Green Bay Packers','GB','https://a.espncdn.com/i/teamlogos/nfl/500/gb.png','["packers","green bay","gb"]'),
('nfl','Houston Texans','HOU','https://a.espncdn.com/i/teamlogos/nfl/500/hou.png','["texans","hou"]'),
('nfl','Indianapolis Colts','IND','https://a.espncdn.com/i/teamlogos/nfl/500/ind.png','["colts","ind"]'),
('nfl','Jacksonville Jaguars','JAX','https://a.espncdn.com/i/teamlogos/nfl/500/jax.png','["jaguars","jax"]'),
('nfl','Kansas City Chiefs','KC','https://a.espncdn.com/i/teamlogos/nfl/500/kc.png','["chiefs","kc"]'),
('nfl','Las Vegas Raiders','LV','https://a.espncdn.com/i/teamlogos/nfl/500/lv.png','["raiders","lv","oakland raiders"]'),
('nfl','Los Angeles Chargers','LAC','https://a.espncdn.com/i/teamlogos/nfl/500/lac.png','["chargers","lac"]'),
('nfl','Los Angeles Rams','LAR','https://a.espncdn.com/i/teamlogos/nfl/500/lar.png','["rams","lar"]'),
('nfl','Miami Dolphins','MIA','https://a.espncdn.com/i/teamlogos/nfl/500/mia.png','["dolphins","mia"]'),
('nfl','Minnesota Vikings','MIN','https://a.espncdn.com/i/teamlogos/nfl/500/min.png','["vikings","min"]'),
('nfl','New England Patriots','NE','https://a.espncdn.com/i/teamlogos/nfl/500/ne.png','["patriots","ne"]'),
('nfl','New Orleans Saints','NO','https://a.espncdn.com/i/teamlogos/nfl/500/no.png','["saints","nola saints","no"]'),
('nfl','New York Giants','NYG','https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png','["giants","nyg","ny giants"]'),
('nfl','New York Jets','NYJ','https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png','["jets","ny jets","nyj"]'),
('nfl','Philadelphia Eagles','PHI','https://a.espncdn.com/i/teamlogos/nfl/500/phi.png','["eagles","phi"]'),
('nfl','Pittsburgh Steelers','PIT','https://a.espncdn.com/i/teamlogos/nfl/500/pit.png','["steelers","pit"]'),
('nfl','San Francisco 49ers','SF','https://a.espncdn.com/i/teamlogos/nfl/500/sf.png','["49ers","sf"]'),
('nfl','Seattle Seahawks','SEA','https://a.espncdn.com/i/teamlogos/nfl/500/sea.png','["seahawks","sea"]'),
('nfl','Tampa Bay Buccaneers','TB','https://a.espncdn.com/i/teamlogos/nfl/500/tb.png','["buccaneers","tb","bucs"]'),
('nfl','Tennessee Titans','TEN','https://a.espncdn.com/i/teamlogos/nfl/500/ten.png','["titans","ten"]'),
('nfl','Washington Commanders','WAS','https://a.espncdn.com/i/teamlogos/nfl/500/wsh.png','["commanders","was","washington football team","redskins"]');

-- Verification
select league, count(*) as teams from teams group by league order by league;
