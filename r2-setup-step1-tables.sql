-- Step-by-Step R2 Usage Tracking Setup
-- Run each section separately in your Supabase SQL Editor

-- STEP 1: Create Tables First
-- Run this section first

-- R2 Usage Logs Table
CREATE TABLE IF NOT EXISTS public.r2_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bucket_name TEXT NOT NULL,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('GET', 'PUT', 'DELETE', 'HEAD', 'LIST')),
  bytes_transferred BIGINT DEFAULT 0,
  request_count INTEGER DEFAULT 1,
  cost_usd DECIMAL(10,6) DEFAULT 0,
  region TEXT,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- R2 Usage Summary Table (daily aggregations)
CREATE TABLE IF NOT EXISTS public.r2_usage_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bucket_name TEXT NOT NULL,
  usage_date DATE NOT NULL,
  total_requests BIGINT DEFAULT 0,
  total_bytes_transferred BIGINT DEFAULT 0,
  total_cost_usd DECIMAL(10,6) DEFAULT 0,
  get_requests BIGINT DEFAULT 0,
  put_requests BIGINT DEFAULT 0,
  delete_requests BIGINT DEFAULT 0,
  head_requests BIGINT DEFAULT 0,
  list_requests BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(bucket_name, usage_date)
);

-- R2 Plan Configuration Table
CREATE TABLE IF NOT EXISTS public.r2_plan_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_name TEXT NOT NULL UNIQUE,
  base_storage_gb DECIMAL(10,2) NOT NULL DEFAULT 10,
  base_class_a_operations INTEGER NOT NULL DEFAULT 1000000,
  base_class_b_operations INTEGER NOT NULL DEFAULT 10000000,
  base_egress_gb DECIMAL(10,2) NOT NULL DEFAULT 1,
  storage_price_per_gb DECIMAL(10,6) NOT NULL DEFAULT 0.015,
  class_a_price_per_million DECIMAL(10,6) NOT NULL DEFAULT 4.5,
  class_b_price_per_million DECIMAL(10,6) NOT NULL DEFAULT 0.36,
  egress_price_per_gb DECIMAL(10,6) NOT NULL DEFAULT 0.09,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- R2 Current Usage Tracking Table
CREATE TABLE IF NOT EXISTS public.r2_current_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bucket_name TEXT NOT NULL UNIQUE,
  current_month_start DATE NOT NULL DEFAULT date_trunc('month', CURRENT_DATE),
  storage_bytes BIGINT DEFAULT 0,
  class_a_operations INTEGER DEFAULT 0,
  class_b_operations INTEGER DEFAULT 0,
  egress_bytes BIGINT DEFAULT 0,
  estimated_cost_usd DECIMAL(10,6) DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
