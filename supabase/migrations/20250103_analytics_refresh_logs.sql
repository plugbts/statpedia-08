-- Analytics refresh logging table
-- Tracks when materialized views are refreshed for monitoring

create table if not exists analytics_refresh_logs (
  id bigserial primary key,
  refresh_type text not null, -- 'scheduled', 'manual', 'triggered'
  status text not null, -- 'success', 'error', 'partial'
  refreshed_at timestamptz not null default now(),
  views_refreshed text[] not null default '{}',
  error_message text,
  duration_ms integer,
  triggered_by text, -- user_id or 'system'
  created_at timestamptz not null default now()
);

-- Index for efficient querying
create index if not exists idx_analytics_refresh_logs_refreshed_at 
on analytics_refresh_logs (refreshed_at desc);

create index if not exists idx_analytics_refresh_logs_status 
on analytics_refresh_logs (status);

-- RLS policies
alter table analytics_refresh_logs enable row level security;

-- Allow authenticated users to read logs
create policy "Users can view analytics refresh logs" 
on analytics_refresh_logs for select 
to authenticated 
using (true);

-- Allow service role to insert logs
create policy "Service role can insert analytics refresh logs" 
on analytics_refresh_logs for insert 
to service_role 
with check (true);

-- Function to get latest refresh status
create or replace function get_latest_analytics_refresh()
returns table (
  last_refresh timestamptz,
  status text,
  views_count integer,
  duration_ms integer
) language sql as $$
  select 
    refreshed_at as last_refresh,
    status,
    array_length(views_refreshed, 1) as views_count,
    duration_ms
  from analytics_refresh_logs 
  where status = 'success'
  order by refreshed_at desc 
  limit 1;
$$;

-- Function to get refresh history
create or replace function get_analytics_refresh_history(days integer default 7)
returns table (
  refreshed_at timestamptz,
  refresh_type text,
  status text,
  views_refreshed text[],
  duration_ms integer
) language sql as $$
  select 
    refreshed_at,
    refresh_type,
    status,
    views_refreshed,
    duration_ms
  from analytics_refresh_logs 
  where refreshed_at >= now() - interval '%s days'
  order by refreshed_at desc;
$$;

-- Grant permissions
grant execute on function get_latest_analytics_refresh() to authenticated;
grant execute on function get_analytics_refresh_history(integer) to authenticated;
grant select on analytics_refresh_logs to authenticated;
