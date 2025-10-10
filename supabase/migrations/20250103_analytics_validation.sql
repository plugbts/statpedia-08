-- Validation queries for analytics system
-- Run these after deploying the analytics system to verify everything works

-- 1. Test the normalize_prop_type function
select 'Testing normalize_prop_type function' as test_name;
select 
  normalize_prop_type('  RECEIVING YARDS  ') as test1,
  normalize_prop_type('Points') as test2,
  normalize_prop_type('') as test3,
  normalize_prop_type(null) as test4;

-- 2. Check if indexes were created
select 'Checking indexes' as test_name;
select 
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes 
where tablename in ('player_game_logs', 'proplines')
  and indexname like 'idx_%'
order by tablename, indexname;

-- 3. Check materialized views exist
select 'Checking materialized views' as test_name;
select 
  schemaname,
  matviewname,
  definition
from pg_matviews 
where matviewname like 'mv_%'
order by matviewname;

-- 4. Test materialized view queries (if data exists)
select 'Testing mv_player_baselines' as test_name;
select count(*) as row_count from mv_player_baselines limit 1;

select 'Testing mv_team_prop_ranks' as test_name;
select count(*) as row_count from mv_team_prop_ranks limit 1;

select 'Testing mv_team_pace' as test_name;
select count(*) as row_count from mv_team_pace limit 1;

select 'Testing mv_prop_matchups' as test_name;
select count(*) as row_count from mv_prop_matchups limit 1;

select 'Testing mv_game_matchups' as test_name;
select count(*) as row_count from mv_game_matchups limit 1;

-- 5. Test API view
select 'Testing player_props_api_view' as test_name;
select count(*) as row_count from player_props_api_view limit 1;

-- 6. Test refresh function
select 'Testing refresh_analytics_views function' as test_name;
select refresh_analytics_views();

-- 7. Sample data queries (run these with actual data)
/*
-- Sample query 1: Get top NFL props for today
select * from mv_prop_matchups 
where league = 'nfl' 
  and prop_date = current_date 
order by matchup_grade desc 
limit 10;

-- Sample query 2: Get game matchups for NBA today
select * from mv_game_matchups 
where league = 'nba' 
  and prop_date = current_date 
order by game_prop_grade desc 
limit 5;

-- Sample query 3: Get player baselines for a specific player
select * from mv_player_baselines 
where league = 'nfl' 
  and player_id = 'your-player-id'
order by prop_type;

-- Sample query 4: Get team ranks for a specific prop type
select * from mv_team_prop_ranks 
where league = 'nba' 
  and prop_type = 'points'
order by offense_rank;

-- Sample query 5: Get props with logs for today
select * from player_props_api_view 
where league = 'nfl' 
  and prop_date = current_date 
limit 10;
*/

-- 8. Performance test queries
select 'Performance test: Count by league' as test_name;
select 
  league,
  count(*) as prop_count,
  avg(matchup_grade) as avg_grade,
  max(matchup_grade) as max_grade,
  min(matchup_grade) as min_grade
from mv_prop_matchups 
group by league
order by league;

-- 9. Check refresh logs table
select 'Checking analytics_refresh_logs table' as test_name;
select count(*) as log_count from analytics_refresh_logs;

-- 10. Test helper functions
select 'Testing helper functions' as test_name;
select get_latest_analytics_refresh();

-- 11. Verify RLS policies
select 'Checking RLS policies' as test_name;
select 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
from pg_policies 
where tablename in ('analytics_refresh_logs')
order by tablename, policyname;

-- 12. Check permissions
select 'Checking function permissions' as test_name;
select 
  routine_name,
  routine_type,
  security_type,
  is_deterministic
from information_schema.routines 
where routine_name in (
  'normalize_prop_type',
  'refresh_analytics_views',
  'refresh_analytics_with_logging',
  'get_latest_analytics_refresh',
  'get_analytics_refresh_history'
)
order by routine_name;
