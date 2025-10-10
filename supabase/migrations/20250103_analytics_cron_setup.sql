-- Set up cron jobs for analytics refresh
-- This creates scheduled jobs to refresh materialized views

-- Create cron extension if not exists
create extension if not exists pg_cron;

-- Schedule analytics refresh every 15 minutes during active hours
-- Active hours: 6 AM to 11 PM EST (adjust timezone as needed)
select cron.schedule(
  'analytics-refresh-15min',
  '*/15 6-23 * * *', -- Every 15 minutes from 6 AM to 11 PM
  'select refresh_analytics_views();'
);

-- Schedule full refresh every hour during peak hours
-- Peak hours: 12 PM to 8 PM EST
select cron.schedule(
  'analytics-refresh-hourly',
  '0 12-20 * * *', -- Every hour from 12 PM to 8 PM
  'select refresh_analytics_views();'
);

-- Schedule daily deep refresh at 3 AM
select cron.schedule(
  'analytics-refresh-daily',
  '0 3 * * *', -- Every day at 3 AM
  'select refresh_analytics_views();'
);

-- View current cron jobs
-- select * from cron.job;

-- View cron job history
-- select * from cron.job_run_details order by start_time desc limit 10;

-- To remove a cron job:
-- select cron.unschedule('analytics-refresh-15min');

-- Alternative: Use Supabase Edge Function with webhook scheduling
-- Create a webhook trigger for post-ingestion refresh

-- Function to trigger refresh after prop ingestion
create or replace function trigger_analytics_refresh_after_props()
returns trigger language plpgsql as $$
begin
  -- Only refresh if this is a significant batch (more than 10 props)
  if (select count(*) from new_table) > 10 then
    -- Schedule a refresh in 5 minutes to allow for batch completion
    perform pg_notify('analytics_refresh', 'triggered_by_prop_ingestion');
  end if;
  return null;
end;
$$;

-- Create trigger for proplines table (if using triggers instead of cron)
-- Note: This is commented out as it might be too aggressive
-- create trigger analytics_refresh_trigger
--   after insert on proplines
--   for each statement
--   execute function trigger_analytics_refresh_after_props();

-- Create a manual refresh function with logging
create or replace function refresh_analytics_with_logging()
returns json language plpgsql as $$
declare
  start_time timestamptz;
  end_time timestamptz;
  duration_ms integer;
  views_refreshed text[] := array[
    'mv_player_baselines',
    'mv_team_prop_ranks',
    'mv_team_pace',
    'mv_prop_matchups',
    'mv_game_matchups'
  ];
begin
  start_time := clock_timestamp();
  
  -- Refresh all views
  refresh materialized view concurrently mv_player_baselines;
  refresh materialized view concurrently mv_team_prop_ranks;
  refresh materialized view concurrently mv_team_pace;
  refresh materialized view concurrently mv_prop_matchups;
  refresh materialized view concurrently mv_game_matchups;
  
  end_time := clock_timestamp();
  duration_ms := extract(milliseconds from (end_time - start_time));
  
  -- Log the refresh
  insert into analytics_refresh_logs (
    refresh_type,
    status,
    views_refreshed,
    duration_ms,
    triggered_by
  ) values (
    'manual',
    'success',
    views_refreshed,
    duration_ms,
    current_user::text
  );
  
  return json_build_object(
    'success', true,
    'duration_ms', duration_ms,
    'views_refreshed', views_refreshed,
    'refreshed_at', end_time
  );
exception when others then
  -- Log the error
  insert into analytics_refresh_logs (
    refresh_type,
    status,
    error_message,
    triggered_by
  ) values (
    'manual',
    'error',
    sqlstate || ': ' || sqlerrm,
    current_user::text
  );
  
  return json_build_object(
    'success', false,
    'error', sqlstate || ': ' || sqlerrm
  );
end;
$$;

-- Grant permissions
grant execute on function refresh_analytics_with_logging() to authenticated;
grant execute on function refresh_analytics_with_logging() to service_role;
