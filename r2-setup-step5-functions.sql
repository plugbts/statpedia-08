-- STEP 5: Create Functions
-- Run this section after Step 4

-- Function to log R2 usage
CREATE OR REPLACE FUNCTION log_r2_usage(
  p_bucket_name TEXT,
  p_operation_type TEXT,
  p_bytes_transferred BIGINT DEFAULT 0,
  p_request_count INTEGER DEFAULT 1,
  p_cost_usd DECIMAL DEFAULT 0,
  p_region TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.r2_usage_logs (
    bucket_name,
    operation_type,
    bytes_transferred,
    request_count,
    cost_usd,
    region,
    user_agent,
    ip_address
  ) VALUES (
    p_bucket_name,
    p_operation_type,
    p_bytes_transferred,
    p_request_count,
    p_cost_usd,
    p_region,
    p_user_agent,
    p_ip_address
  ) RETURNING id INTO log_id;
  
  -- Update current usage tracking
  INSERT INTO public.r2_current_usage (
    bucket_name,
    storage_bytes,
    class_a_operations,
    class_b_operations,
    egress_bytes,
    estimated_cost_usd
  ) VALUES (
    p_bucket_name,
    CASE WHEN p_operation_type = 'PUT' THEN p_bytes_transferred ELSE 0 END,
    CASE WHEN p_operation_type IN ('PUT', 'DELETE') THEN p_request_count ELSE 0 END,
    CASE WHEN p_operation_type IN ('GET', 'HEAD', 'LIST') THEN p_request_count ELSE 0 END,
    CASE WHEN p_operation_type = 'GET' THEN p_bytes_transferred ELSE 0 END,
    p_cost_usd
  )
  ON CONFLICT (bucket_name) DO UPDATE SET
    storage_bytes = CASE 
      WHEN p_operation_type = 'PUT' THEN r2_current_usage.storage_bytes + p_bytes_transferred
      WHEN p_operation_type = 'DELETE' THEN GREATEST(0, r2_current_usage.storage_bytes - p_bytes_transferred)
      ELSE r2_current_usage.storage_bytes
    END,
    class_a_operations = r2_current_usage.class_a_operations + 
      CASE WHEN p_operation_type IN ('PUT', 'DELETE') THEN p_request_count ELSE 0 END,
    class_b_operations = r2_current_usage.class_b_operations + 
      CASE WHEN p_operation_type IN ('GET', 'HEAD', 'LIST') THEN p_request_count ELSE 0 END,
    egress_bytes = r2_current_usage.egress_bytes + 
      CASE WHEN p_operation_type = 'GET' THEN p_bytes_transferred ELSE 0 END,
    estimated_cost_usd = r2_current_usage.estimated_cost_usd + p_cost_usd,
    last_updated = now();
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
