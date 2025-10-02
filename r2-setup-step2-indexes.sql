-- STEP 2: Create Indexes
-- Run this section after Step 1

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_r2_usage_logs_bucket_name ON public.r2_usage_logs(bucket_name);
CREATE INDEX IF NOT EXISTS idx_r2_usage_logs_created_at ON public.r2_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_r2_usage_logs_operation_type ON public.r2_usage_logs(operation_type);

CREATE INDEX IF NOT EXISTS idx_r2_usage_summary_bucket_date ON public.r2_usage_summary(bucket_name, usage_date);
CREATE INDEX IF NOT EXISTS idx_r2_usage_summary_usage_date ON public.r2_usage_summary(usage_date);

CREATE INDEX IF NOT EXISTS idx_r2_current_usage_bucket_name ON public.r2_current_usage(bucket_name);
CREATE INDEX IF NOT EXISTS idx_r2_current_usage_month_start ON public.r2_current_usage(current_month_start);
