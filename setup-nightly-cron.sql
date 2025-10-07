-- Setup Cron Job for Nightly Data Pipeline
-- Run this in your Supabase SQL Editor after deploying the Edge Function

-- Step 1: Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 2: Enable http extension for making HTTP requests
CREATE EXTENSION IF NOT EXISTS http;

-- Step 3: Create the cron job to run daily at 5 AM UTC
-- Replace YOUR-PROJECT-REF with your actual Supabase project reference
-- Replace YOUR-SERVICE-ROLE-KEY with your actual service role key

SELECT cron.schedule(
  'nightly-job',                    -- Job name
  '0 5 * * *',                     -- Cron expression: 5 AM UTC daily
  $$
  SELECT net.http_post(
    url := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/nightly-job',
    headers := '{"Authorization": "Bearer YOUR-SERVICE-ROLE-KEY"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Step 4: Verify the cron job was created
SELECT * FROM cron.job WHERE jobname = 'nightly-job';

-- Step 5: (Optional) Create a function to manually trigger the job
CREATE OR REPLACE FUNCTION trigger_nightly_job()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT net.http_post(
    url := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/nightly-job',
    headers := '{"Authorization": "Bearer YOUR-SERVICE-ROLE-KEY"}'::jsonb,
    body := '{}'::jsonb
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION trigger_nightly_job() TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_nightly_job() TO anon;

-- Step 6: (Optional) Create a monitoring function to check job status
CREATE OR REPLACE FUNCTION check_nightly_job_status()
RETURNS TABLE(
  last_run timestamp with time zone,
  next_run timestamp with time zone,
  job_active boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.last_run,
    j.next_run,
    j.active as job_active
  FROM cron.job j
  WHERE j.jobname = 'nightly-job';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_nightly_job_status() TO authenticated;
GRANT EXECUTE ON FUNCTION check_nightly_job_status() TO anon;

-- Step 7: (Optional) Create a log table to track job runs
CREATE TABLE IF NOT EXISTS nightly_job_logs (
  id SERIAL PRIMARY KEY,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'running',
  game_logs_records INTEGER DEFAULT 0,
  prop_lines_records INTEGER DEFAULT 0,
  analytics_records INTEGER DEFAULT 0,
  error_message TEXT,
  execution_time_seconds INTEGER,
  
  INDEX idx_started_at (started_at),
  INDEX idx_status (status)
);

-- Enable RLS
ALTER TABLE nightly_job_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for anonymous access (public logs)
CREATE POLICY "Allow all access to nightly_job_logs" ON nightly_job_logs
FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON nightly_job_logs TO anon;
GRANT ALL ON nightly_job_logs TO authenticated;
GRANT USAGE ON SEQUENCE nightly_job_logs_id_seq TO anon;
GRANT USAGE ON SEQUENCE nightly_job_logs_id_seq TO authenticated;

-- Step 8: (Optional) Function to log job start
CREATE OR REPLACE FUNCTION log_nightly_job_start()
RETURNS INTEGER AS $$
DECLARE
  log_id INTEGER;
BEGIN
  INSERT INTO nightly_job_logs (started_at, status)
  VALUES (NOW(), 'running')
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: (Optional) Function to log job completion
CREATE OR REPLACE FUNCTION log_nightly_job_complete(
  p_log_id INTEGER,
  p_status VARCHAR(20),
  p_game_logs INTEGER DEFAULT 0,
  p_prop_lines INTEGER DEFAULT 0,
  p_analytics INTEGER DEFAULT 0,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  start_time TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT started_at INTO start_time
  FROM nightly_job_logs
  WHERE id = p_log_id;
  
  UPDATE nightly_job_logs
  SET 
    completed_at = NOW(),
    status = p_status,
    game_logs_records = p_game_logs,
    prop_lines_records = p_prop_lines,
    analytics_records = p_analytics,
    error_message = p_error_message,
    execution_time_seconds = EXTRACT(EPOCH FROM (NOW() - start_time))::INTEGER
  WHERE id = p_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION log_nightly_job_start() TO authenticated;
GRANT EXECUTE ON FUNCTION log_nightly_job_complete TO authenticated;
GRANT EXECUTE ON FUNCTION log_nightly_job_start() TO anon;
GRANT EXECUTE ON FUNCTION log_nightly_job_complete TO anon;

-- Step 10: (Optional) View for monitoring recent job runs
CREATE OR REPLACE VIEW nightly_job_summary AS
SELECT 
  id,
  started_at,
  completed_at,
  status,
  game_logs_records,
  prop_lines_records,
  analytics_records,
  execution_time_seconds,
  error_message,
  CASE 
    WHEN completed_at IS NOT NULL THEN
      EXTRACT(EPOCH FROM (completed_at - started_at))::INTEGER
    ELSE
      EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER
  END as total_execution_time_seconds
FROM nightly_job_logs
ORDER BY started_at DESC
LIMIT 10;

-- Grant access to view
GRANT SELECT ON nightly_job_summary TO authenticated;
GRANT SELECT ON nightly_job_summary TO anon;

-- Instructions for manual setup:
/*
1. Replace 'YOUR-PROJECT-REF' with your actual Supabase project reference
2. Replace 'YOUR-SERVICE-ROLE-KEY' with your actual service role key
3. Run this SQL in your Supabase SQL Editor
4. Check that the cron job was created: SELECT * FROM cron.job;
5. Monitor job runs: SELECT * FROM nightly_job_summary;
6. Manually trigger job: SELECT trigger_nightly_job();
7. Check job status: SELECT * FROM check_nightly_job_status();
*/
