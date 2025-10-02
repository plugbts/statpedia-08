-- STEP 4: Insert Default Data
-- Run this section after Step 3

-- Insert default R2 plan configuration (Free tier)
INSERT INTO public.r2_plan_config (
  plan_name, 
  base_storage_gb, 
  base_class_a_operations, 
  base_class_b_operations, 
  base_egress_gb,
  storage_price_per_gb,
  class_a_price_per_million,
  class_b_price_per_million,
  egress_price_per_gb
) VALUES (
  'Free Tier',
  10.0,  -- 10 GB free storage
  1000000,  -- 1M Class A operations free
  10000000, -- 10M Class B operations free
  1.0,   -- 1 GB free egress
  0.015, -- $0.015 per GB storage
  4.5,   -- $4.5 per million Class A operations
  0.36,  -- $0.36 per million Class B operations
  0.09   -- $0.09 per GB egress
) ON CONFLICT (plan_name) DO NOTHING;
