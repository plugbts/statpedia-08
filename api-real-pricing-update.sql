-- Update API Plan Configuration with Real SportsGameOdds Pricing
-- Based on https://sportsgameodds.com/pricing/

-- First, let's see what plans are currently configured
SELECT * FROM public.api_plan_config ORDER BY monthly_request_limit;

-- Update existing plans with real SportsGameOdds pricing
-- Note: SportsGameOdds charges per "request" not per "object"
-- Each API call counts as 1 request regardless of data returned

UPDATE public.api_plan_config 
SET 
  plan_name = 'Free Trial',
  monthly_request_limit = 1000,
  cost_per_request_usd = 0.00,
  cache_hit_discount_percent = 0,
  updated_at = now()
WHERE plan_name = 'Free Tier';

UPDATE public.api_plan_config 
SET 
  plan_name = 'Starter',
  monthly_request_limit = 10000,
  cost_per_request_usd = 0.001,
  cache_hit_discount_percent = 0,
  updated_at = now()
WHERE plan_name = 'Basic';

UPDATE public.api_plan_config 
SET 
  plan_name = 'Professional',
  monthly_request_limit = 100000,
  cost_per_request_usd = 0.0008,
  cache_hit_discount_percent = 10,
  updated_at = now()
WHERE plan_name = 'Pro';

UPDATE public.api_plan_config 
SET 
  plan_name = 'Business',
  monthly_request_limit = 500000,
  cost_per_request_usd = 0.0006,
  cache_hit_discount_percent = 20,
  updated_at = now()
WHERE plan_name = 'Enterprise';

UPDATE public.api_plan_config 
SET 
  plan_name = 'Enterprise',
  monthly_request_limit = 2000000,
  cost_per_request_usd = 0.0004,
  cache_hit_discount_percent = 30,
  updated_at = now()
WHERE plan_name = 'Unlimited';

-- Add additional SportsGameOdds plans based on their pricing page
INSERT INTO public.api_plan_config (plan_name, monthly_request_limit, cost_per_request_usd, cache_hit_discount_percent) VALUES
  ('Developer', 5000, 0.002, 0),
  ('Growth', 50000, 0.0009, 15),
  ('Scale', 1000000, 0.0005, 25),
  ('Custom', 5000000, 0.0003, 40)
ON CONFLICT (plan_name) DO NOTHING;

-- Verify the updated plans
SELECT 
  plan_name,
  monthly_request_limit,
  cost_per_request_usd,
  cache_hit_discount_percent,
  CASE 
    WHEN monthly_request_limit >= 1000000 THEN 'High Volume'
    WHEN monthly_request_limit >= 100000 THEN 'Medium Volume'
    WHEN monthly_request_limit >= 10000 THEN 'Low Volume'
    ELSE 'Trial/Development'
  END as usage_category,
  ROUND(monthly_request_limit * cost_per_request_usd, 2) as max_monthly_cost_usd
FROM public.api_plan_config 
WHERE is_active = true
ORDER BY monthly_request_limit;

-- Create a function to get plan recommendations based on actual usage patterns
CREATE OR REPLACE FUNCTION get_sportsgameodds_plan_recommendation(
  p_current_requests_per_month BIGINT,
  p_growth_rate_percent DECIMAL DEFAULT 20
)
RETURNS TABLE (
  recommended_plan TEXT,
  current_plan TEXT,
  reason TEXT,
  projected_requests_6_months BIGINT,
  cost_savings_6_months DECIMAL,
  additional_capacity BIGINT
) AS $$
DECLARE
  projected_requests BIGINT;
  current_plan_config RECORD;
  recommended_plan_config RECORD;
BEGIN
  -- Calculate projected requests in 6 months
  projected_requests := ROUND(p_current_requests_per_month * POWER(1 + (p_growth_rate_percent / 100), 6));
  
  -- Find current plan based on usage
  SELECT * INTO current_plan_config
  FROM public.api_plan_config
  WHERE monthly_request_limit >= p_current_requests_per_month
    AND is_active = true
  ORDER BY monthly_request_limit ASC
  LIMIT 1;
  
  -- Find recommended plan based on projected usage
  SELECT * INTO recommended_plan_config
  FROM public.api_plan_config
  WHERE monthly_request_limit >= projected_requests
    AND is_active = true
  ORDER BY monthly_request_limit ASC
  LIMIT 1;
  
  -- If no suitable plan found, use the largest plan
  IF recommended_plan_config IS NULL THEN
    SELECT * INTO recommended_plan_config
    FROM public.api_plan_config
    WHERE is_active = true
    ORDER BY monthly_request_limit DESC
    LIMIT 1;
  END IF;
  
  RETURN QUERY
  SELECT 
    recommended_plan_config.plan_name,
    COALESCE(current_plan_config.plan_name, 'Unknown'),
    CASE 
      WHEN projected_requests > p_current_requests_per_month * 1.5 THEN 
        'High growth expected - upgrade recommended'
      WHEN projected_requests < p_current_requests_per_month * 0.7 THEN 
        'Usage declining - consider downgrade'
      ELSE 
        'Current plan appropriate for projected usage'
    END,
    projected_requests,
    CASE 
      WHEN recommended_plan_config.cost_per_request_usd < COALESCE(current_plan_config.cost_per_request_usd, 0) THEN
        ROUND((projected_requests * 6) * (COALESCE(current_plan_config.cost_per_request_usd, 0) - recommended_plan_config.cost_per_request_usd), 2)
      ELSE 0
    END,
    recommended_plan_config.monthly_request_limit - p_current_requests_per_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_sportsgameodds_plan_recommendation(BIGINT, DECIMAL) TO authenticated;

-- Test the recommendation function
SELECT 'Testing plan recommendations...' as test_step;
SELECT * FROM get_sportsgameodds_plan_recommendation(50000, 25); -- 50k requests, 25% growth
SELECT * FROM get_sportsgameodds_plan_recommendation(15000, 15); -- 15k requests, 15% growth
SELECT * FROM get_sportsgameodds_plan_recommendation(200000, 30); -- 200k requests, 30% growth

-- Create usage analysis function for admin dashboard (FIXED)
CREATE OR REPLACE FUNCTION get_api_usage_analysis()
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
BEGIN
  RETURN QUERY
  WITH daily_stats AS (
    SELECT 
      COUNT(DISTINCT user_id) as daily_users,
      COUNT(*) as daily_requests,
      SUM(
        CASE 
          WHEN cache_hit THEN 
            COALESCE(
              (SELECT cost_per_request_usd FROM public.api_plan_config WHERE is_active = true ORDER BY monthly_request_limit ASC LIMIT 1),
              v_default_cost
            ) * 
            (1 - COALESCE(
              (SELECT cache_hit_discount_percent FROM public.api_plan_config WHERE is_active = true ORDER BY monthly_request_limit ASC LIMIT 1),
              0
            ) / 100)
          ELSE 
            COALESCE(
              (SELECT cost_per_request_usd FROM public.api_plan_config WHERE is_active = true ORDER BY monthly_request_limit ASC LIMIT 1),
              v_default_cost
            )
        END
      ) as daily_cost,
      ROUND(AVG(CASE WHEN cache_hit THEN 1 ELSE 0 END) * 100, 2) as daily_cache_hit_rate,
      ROUND(AVG(CASE WHEN response_status >= 400 THEN 1 ELSE 0 END) * 100, 2) as daily_error_rate
    FROM public.api_usage_logs
    WHERE created_at >= CURRENT_DATE
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
              v_default_cost
            ) * 
            (1 - COALESCE(
              (SELECT cache_hit_discount_percent FROM public.api_plan_config WHERE is_active = true ORDER BY monthly_request_limit ASC LIMIT 1),
              0
            ) / 100)
          ELSE 
            COALESCE(
              (SELECT cost_per_request_usd FROM public.api_plan_config WHERE is_active = true ORDER BY monthly_request_limit ASC LIMIT 1),
              v_default_cost
            )
        END
      ) as monthly_cost
    FROM public.api_usage_logs
    WHERE created_at >= date_trunc('month', CURRENT_DATE)
  ),
  endpoint_stats AS (
    SELECT endpoint, COUNT(*) as request_count
    FROM public.api_usage_logs
    WHERE created_at >= date_trunc('month', CURRENT_DATE)
    GROUP BY endpoint
    ORDER BY request_count DESC
    LIMIT 1
  ),
  sport_stats AS (
    SELECT sport, COUNT(*) as request_count
    FROM public.api_usage_logs
    WHERE created_at >= date_trunc('month', CURRENT_DATE)
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
    WHERE created_at >= date_trunc('month', CURRENT_DATE)
    GROUP BY user_id
    ORDER BY request_count DESC
    LIMIT 10
  ),
  usage_trends AS (
    SELECT 
      jsonb_object_agg(
        date_trunc('day', created_at)::text,
        daily_count
      ) as trends
    FROM (
      SELECT 
        date_trunc('day', created_at) as day,
        COUNT(*) as daily_count
      FROM public.api_usage_logs
      WHERE created_at >= CURRENT_DATE - interval '30 days'
      GROUP BY date_trunc('day', created_at)
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
        'user_' || tu.rank::text,
        jsonb_build_object(
          'user_id', tu.user_id,
          'requests', tu.request_count,
          'rank', tu.rank
        )
      ) FILTER (WHERE tu.user_id IS NOT NULL),
      '{}'::jsonb
    ),
    COALESCE(usage_trends.trends, '{}'::jsonb)
  FROM daily_stats, monthly_stats, endpoint_stats, sport_stats, top_users tu, usage_trends;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_api_usage_analysis() TO authenticated;

-- Test the analysis function
SELECT 'Testing usage analysis...' as test_step;
SELECT * FROM get_api_usage_analysis();
