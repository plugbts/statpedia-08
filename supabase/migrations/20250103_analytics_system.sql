-- Comprehensive Analytics System for StatPedia
-- Creates helper functions, indexes, materialized views, and API views for high-performance prop analytics

-- 1. Helper Functions and Indexes
-- =================================

-- 1.1 Normalize prop type function
create or replace function normalize_prop_type(input text)
returns text language sql immutable as $$
  select lower(trim(input));
$$;

-- 1.2 Indexes to accelerate joins and window functions
create index if not exists idx_logs_keys
on player_game_logs (league, season, player_id, team_id, opponent_team_id, prop_type, date);

create index if not exists idx_props_keys
on proplines (league, season, player_id, game_id, prop_type, date_normalized);

create index if not exists idx_props_league_date
on proplines (league, date_normalized);

create index if not exists idx_logs_league_date
on player_game_logs (league, date);

-- 2. Materialized Views
-- =====================

-- 2.1 Player baselines (rolling averages and season stats)
drop materialized view if exists mv_player_baselines cascade;

create materialized view mv_player_baselines as
with logs as (
  select
    lower(g.league) as league,
    g.season,
    g.player_id,
    g.team_id,
    normalize_prop_type(g.prop_type) as prop_type,
    g.date,
    g.value::numeric as stat_value
  from player_game_logs g
),
roll as (
  select
    league, season, player_id, team_id, prop_type, date, stat_value,
    avg(stat_value) over (
      partition by league, season, player_id, prop_type
      order by date rows between 9 preceding and current row
    ) as rolling_10,
    avg(stat_value) over (
      partition by league, season, player_id, prop_type
      order by date rows between 19 preceding and current row
    ) as rolling_20,
    avg(stat_value) over (partition by league, season, player_id, prop_type) as season_avg,
    stddev_pop(stat_value) over (partition by league, season, player_id, prop_type) as season_std
  from logs
)
select distinct on (league, season, player_id, prop_type)
  league, season, player_id, team_id, prop_type,
  rolling_10, rolling_20, season_avg, season_std
from roll
order by league, season, player_id, prop_type, date desc;

create index if not exists idx_mv_player_baselines_key
on mv_player_baselines (league, season, player_id, prop_type);

-- 2.2 Team offense/defense ranks per prop type
drop materialized view if exists mv_team_prop_ranks cascade;

create materialized view mv_team_prop_ranks as
with base as (
  select
    lower(g.league) as league,
    normalize_prop_type(g.prop_type) as prop_type,
    g.team_id,
    g.opponent_team_id,
    avg(g.value)::numeric as avg_value
  from player_game_logs g
  group by g.league, g.prop_type, g.team_id, g.opponent_team_id
),
offense as (
  select
    league, prop_type, team_id as subject_team,
    avg(avg_value) as avg_offense,
    rank() over (partition by league, prop_type order by avg(avg_value) desc) as offense_rank
  from base
  group by league, prop_type, team_id
),
defense as (
  select
    league, prop_type, opponent_team_id as subject_team,
    avg(avg_value) as avg_defense,
    rank() over (partition by league, prop_type order by avg(avg_value) asc) as defense_rank
  from base
  group by league, prop_type, opponent_team_id
)
select
  o.league,
  o.prop_type,
  o.subject_team,
  o.avg_offense,
  o.offense_rank,
  d.avg_defense,
  d.defense_rank
from offense o
join defense d using (league, prop_type, subject_team);

create index if not exists idx_mv_team_prop_ranks_key
on mv_team_prop_ranks (league, prop_type, subject_team);

-- 2.3 Team pace proxy
drop materialized view if exists mv_team_pace cascade;

create materialized view mv_team_pace as
with totals as (
  select
    lower(g.league) as league,
    g.team_id,
    avg(g.value)::numeric as avg_stat_proxy
  from player_game_logs g
  group by g.league, g.team_id
),
norm as (
  select
    league, team_id, avg_stat_proxy,
    (avg_stat_proxy - min(avg_stat_proxy) over (partition by league))
    / nullif(max(avg_stat_proxy) over (partition by league) - min(avg_stat_proxy) over (partition by league), 0) as pace_index
  from totals
)
select * from norm;

create index if not exists idx_mv_team_pace_key
on mv_team_pace (league, team_id);

-- 2.4 Prop matchup grades (league-aware weighting)
drop materialized view if exists mv_prop_matchups cascade;

create materialized view mv_prop_matchups as
with props as (
  select
    p.id as prop_id,
    lower(p.league) as league,
    p.season,
    p.player_id,
    p.game_id,
    p.date_normalized as prop_date,
    normalize_prop_type(p.prop_type) as prop_type,
    p.line::numeric as line
  from proplines p
),
joined as (
  select
    pr.prop_id, pr.league, pr.season, pr.player_id, pr.game_id, pr.prop_date, pr.prop_type, pr.line,
    b.team_id,
    gl.opponent_team_id,
    b.rolling_10, b.season_avg, b.season_std,
    r.offense_rank, r.avg_offense,
    r.defense_rank, r.avg_defense,
    pc.pace_index
  from props pr
  join mv_player_baselines b using (league, season, player_id, prop_type)
  join player_game_logs gl
    on gl.player_id = pr.player_id
   and gl.season = pr.season
   and lower(gl.league) = pr.league
   and gl.date between (pr.prop_date - interval '1 day') and (pr.prop_date + interval '1 day')
   and normalize_prop_type(gl.prop_type) = pr.prop_type
  join mv_team_prop_ranks r
    on r.league = pr.league
   and r.prop_type = pr.prop_type
   and r.subject_team = gl.opponent_team_id
  left join mv_team_pace pc
    on pc.league = pr.league
   and pc.team_id = b.team_id
),
line_adj as (
  select *,
    case when season_std is null or season_std = 0 then null
         else (line - season_avg) / season_std end as line_z
  from joined
),
percentiles as (
  select
    l.*,
    100.0 * (max(offense_rank) over (partition by league, prop_type) - offense_rank)
            / nullif(max(offense_rank) over (partition by league, prop_type) - 1, 0) as off_pct,
    100.0 * (max(defense_rank) over (partition by league, prop_type) - defense_rank)
            / nullif(max(defense_rank) over (partition by league, prop_type) - 1, 0) as def_ease_pct,
    greatest(0, least(100, 50 + 15 * coalesce(line_z, 0))) as line_pct,
    100.0 * coalesce(pc.pace_index, 0.5) as pace_pct
  from line_adj l
)
select
  prop_id, league, season, player_id, game_id, prop_date, prop_type, line,
  rolling_10, season_avg, season_std,
  offense_rank, avg_offense, off_pct,
  defense_rank, avg_defense, def_ease_pct,
  line_z, line_pct,
  pace_pct,
  round(
    case
      when league = 'nfl' then
        0.40 * def_ease_pct + 0.20 * off_pct + 0.20 * line_pct + 0.10 * pace_pct +
        0.10 * (case when rolling_10 is null or season_avg is null then 50
                     else 100.0 * rolling_10 / nullif(season_avg, 0) end)
      when league = 'nba' then
        0.25 * def_ease_pct + 0.25 * off_pct + 0.15 * line_pct + 0.30 * pace_pct +
        0.05 * (case when rolling_10 is null or season_avg is null then 50
                     else 100.0 * rolling_10 / nullif(season_avg, 0) end)
      when league = 'mlb' then
        0.35 * def_ease_pct + 0.20 * off_pct + 0.25 * line_pct + 0.10 * pace_pct +
        0.10 * (case when rolling_10 is null or season_avg is null then 50
                     else 100.0 * rolling_10 / nullif(season_avg, 0) end)
      when league = 'nhl' then
        0.35 * def_ease_pct + 0.20 * off_pct + 0.10 * line_pct + 0.25 * pace_pct +
        0.10 * (case when rolling_10 is null or season_avg is null then 50
                     else 100.0 * rolling_10 / nullif(season_avg, 0) end)
      else
        0.30 * def_ease_pct + 0.25 * off_pct + 0.20 * line_pct + 0.15 * pace_pct +
        0.10 * (case when rolling_10 is null or season_avg is null then 50
                     else 100.0 * rolling_10 / nullif(season_avg, 0) end)
    end, 1
  ) as matchup_grade
from percentiles;

create index if not exists idx_mv_prop_matchups_key
on mv_prop_matchups (league, prop_date, prop_type);

-- 2.5 Game-level matchup grades
drop materialized view if exists mv_game_matchups cascade;

create materialized view mv_game_matchups as
with player_team as (
  select distinct league, season, player_id, prop_type, team_id
  from mv_player_baselines
),
by_team as (
  select
    m.league, m.season, m.game_id, m.prop_date, m.prop_type,
    pt.team_id,
    avg(m.matchup_grade) as team_prop_grade
  from mv_prop_matchups m
  join player_team pt using (league, season, player_id, prop_type)
  group by m.league, m.season, m.game_id, m.prop_date, m.prop_type, pt.team_id
),
pairs as (
  select
    t1.league, t1.season, t1.game_id, t1.prop_date, t1.prop_type,
    t1.team_id as team_a,
    t2.team_id as team_b,
    t1.team_prop_grade as team_a_grade,
    t2.team_prop_grade as team_b_grade,
    round((t1.team_prop_grade + t2.team_prop_grade) / 2.0, 1) as game_prop_grade
  from by_team t1
  join by_team t2 using (league, season, game_id, prop_date, prop_type)
  where t1.team_id <> t2.team_id
)
select * from pairs;

create index if not exists idx_mv_game_matchups_key
on mv_game_matchups (league, prop_date, prop_type, game_id);

-- Set fillfactor for better performance
alter materialized view mv_player_baselines set (fillfactor = 90);
alter materialized view mv_team_prop_ranks set (fillfactor = 90);
alter materialized view mv_team_pace set (fillfactor = 90);
alter materialized view mv_prop_matchups set (fillfactor = 90);
alter materialized view mv_game_matchups set (fillfactor = 90);

-- 3. API View
-- ===========

drop view if exists player_props_api_view cascade;

create view player_props_api_view as
select
  p.id as prop_id,
  p.player_id,
  p.game_id,
  lower(p.league) as league,
  p.season,
  p.date_normalized as prop_date,
  normalize_prop_type(p.prop_type) as prop_type,
  p.line,
  p.odds,
  g.id as game_log_id,
  g.value as stat_value,
  g.date as game_date,
  g.team_id,
  g.opponent_team_id
from proplines p
join player_game_logs g
  on g.player_id = p.player_id
 and g.season = p.season
 and lower(g.league) = lower(p.league)
 and g.date between (p.date_normalized - interval '1 day') and (p.date_normalized + interval '1 day')
 and normalize_prop_type(g.prop_type) = normalize_prop_type(p.prop_type);

-- Set security invoker for RLS environments
alter view player_props_api_view set (security_invoker = true);

-- 4. Refresh Functions
-- ====================

-- Function to refresh all materialized views
create or replace function refresh_analytics_views()
returns void language plpgsql as $$
begin
  refresh materialized view concurrently mv_player_baselines;
  refresh materialized view concurrently mv_team_prop_ranks;
  refresh materialized view concurrently mv_team_pace;
  refresh materialized view concurrently mv_prop_matchups;
  refresh materialized view concurrently mv_game_matchups;
  
  raise notice 'All analytics materialized views refreshed successfully';
end;
$$;

-- Grant necessary permissions
grant execute on function refresh_analytics_views() to authenticated;
grant execute on function refresh_analytics_views() to service_role;
