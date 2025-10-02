-- Fixed API Usage Analysis Function
-- This version handles the correct column names and provides fallbacks

-- First, let's check what columns actually exist
SELECT 'Checking table structure...' as step;
SELECT 
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'api_usage_logs'
ORDER BY ordinal_position;

-- Create a simplified analysis function that works with existing columns
CREATE OR REPLACE FUNCTION get_api_usage_analysis_simple()
RETURNS TABLE (
  total_users BIGINT,
  total_requests_today BIGINT,
  total_requests_this_month BIGINT,
  avg_requests_per_user DECIMAL,
  most_active_endpoint TEXT,
  most_active_sport TEXT,
  total_cost_today DECIMAL,
  total_cost_this_month DECIMAL,
  cache_hit_rate DECIMAL,
  error_rate DECIMAL,
  top_users JSONB,
  usage_trends JSONB
) AS $$
DECLARE
  v_default_cost DECIMAL(8,6) := 0.001;
  v_timestamp_column TEXT;
BEGIN
  -- Determine which timestamp column exists
  SELECT column_name INTO v_timestamp_column
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
    AND table_name = 'api_usage_logs'
    AND column_name IN ('created_at', 'timestamp', 'log_time', 'date_created')
  ORDER BY 
    CASE column_name 
      WHEN 'created_at' THEN 1
      WHEN 'timestamp' THEN 2
      WHEN 'log_time' THEN 3
      WHEN 'date_created' THEN 4
      ELSE 5
    END
  LIMIT 1;

  -- If no timestamp column found, use a default
  IF v_timestamp_column IS NULL THEN
    v_timestamp_column := 'created_at';
  END IF;

  -- Build and execute dynamic query
  RETURN QUERY
  EXECUTE format('
    WITH daily_stats AS (
      SELECT 
        COUNT(DISTINCT user_id) as daily_users,
        COUNT(*) as daily_requests,
        SUM(
          CASE 
            WHEN cache_hit THEN 
              COALESCE(
                (SELECT cost_per_request_usd FROM public.api_plan_config WHERE is_active = true ORDER BY monthly_request_limit ASC LIMIT 1),
                %L
              ) * 
              (1 - COALESCE(
                (SELECT cache_hit_discount_percent FROM public.api_plan_config WHERE is_active = true ORDER BY monthly_request_limit ASC LIMIT 1),
                0
              ) / 100)
            ELSE 
              COALESCE(
                (SELECT cost_per_request_usd FROM public.api_plan_config WHERE is_active = true ORDER BY monthly_request_limit ASC LIMIT 1),
                %L
              )
          END
        ) as daily_cost,
        ROUND(AVG(CASE WHEN cache_hit THEN 1 ELSE 0 END) * 100, 2) as daily_cache_hit_rate,
        ROUND(AVG(CASE WHEN response_status >= 400 THEN 1 ELSE 0 END) * 100, 2) as daily_error_rate
      FROM public.api_usage_logs
      WHERE %I >= CURRENT_DATE
    ),
    monthly_stats AS (
      SELECT 
        COUNT(DISTINCT user_id) as monthly_users,
        COUNT(*) as monthly_requests,
        SUM(
          CASE 
            WHEN cache_hit THEN 
              COALESCE(
                (SELECT cost_per_request_usd FROM public.api_plan_config WHERE is_active = true ORDER BY monthly_request_limit ASC LIMIT 1),
                %L
              ) * 
              (1 - COALESCE(
                (SELECT cache_hit_discount_percent FROM public.api_plan_config WHERE is_active = true ORDER BY monthly_request_limit ASC LIMIT 1),
                0
              ) / 100)
            ELSE 
              COALESCE(
                (SELECT cost_per_request_usd FROM public.api_plan_config WHERE is_active = true ORDER BY monthly_request_limit ASC LIMIT 1),
                %L
              )
          END
        ) as monthly_cost
      FROM public.api_usage_logs
      WHERE %I >= date_trunc(''month'', CURRENT_DATE)
    ),
    endpoint_stats AS (
      SELECT endpoint, COUNT(*) as request_count
      FROM public.api_usage_logs
      WHERE %I >= date_trunc(''month'', CURRENT_DATE)
      GROUP BY endpoint
      ORDER BY request_count DESC
      LIMIT 1
    ),
    sport_stats AS (
      SELECT sport, COUNT(*) as request_count
      FROM public.api_usage_logs
      WHERE %I >= date_trunc(''month'', CURRENT_DATE)
        AND sport IS NOT NULL
      GROUP BY sport
      ORDER BY request_count DESC
      LIMIT 1
    ),
    top_users AS (
      SELECT 
        user_id,
        COUNT(*) as request_count,
        ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as rank
      FROM public.api_usage_logs
      WHERE %I >= date_trunc(''month'', CURRENT_DATE)
      GROUP BY user_id
      ORDER BY request_count DESC
      LIMIT 10
    ),
    usage_trends AS (
      SELECT 
        jsonb_object_agg(
          date_trunc(''day'', %I)::text,
          daily_count
        ) as trends
      FROM (
        SELECT 
          date_trunc(''day'', %I) as day,
          COUNT(*) as daily_count
        FROM public.api_usage_logs
        WHERE %I >= CURRENT_DATE - interval ''30 days''
        GROUP BY date_trunc(''day'', %I)
        ORDER BY day
      ) trend_data
    )
    SELECT 
      monthly_stats.monthly_users,
      daily_stats.daily_requests,
      monthly_stats.monthly_requests,
      ROUND(monthly_stats.monthly_requests::DECIMAL / NULLIF(monthly_stats.monthly_users, 0), 2),
      endpoint_stats.endpoint,
      sport_stats.sport,
      daily_stats.daily_cost,
      monthly_stats.monthly_cost,
      daily_stats.daily_cache_hit_rate,
      daily_stats.daily_error_rate,
      COALESCE(
        jsonb_object_agg(
          ''user_'' || tu.rank::text,
          jsonb_build_object(
            ''user_id'', tu.user_id,
            ''requests'', tu.request_count,
            ''rank'', tu.rank
          )
        ) FILTER (WHERE tu.user_id IS NOT NULL),
        ''{}''::jsonb
      ),
      COALESCE(usage_trends.trends, ''{}''::jsonb)
    FROM daily_stats, monthly_stats, endpoint_stats, sport_stats, top_users tu, usage_trends
  ', 
    v_default_cost, v_default_cost, v_timestamp_column,
    v_default_cost, v_default_cost, v_timestamp_column,
    v_timestamp_column, v_timestamp_column, v_timestamp_column,
    v_timestamp_column, v_timestamp_column, v_timestamp_column, v_timestamp_column
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_api_usage_analysis_simple() TO authenticated;

-- Test the function
SELECT 'Testing simplified analysis function...' as step;
SELECT * FROM get_api_usage_analysis_simple();
