-- STEP 3: Enable RLS and Create Policies
-- Run this section after Step 2

-- Enable RLS on all tables
ALTER TABLE public.r2_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.r2_usage_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.r2_plan_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.r2_current_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for r2_usage_logs (admin only)
CREATE POLICY "Admins can view all R2 usage logs" 
ON public.r2_usage_logs 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND (subscription_tier = 'admin' OR subscription_tier = 'owner')
  )
);

-- RLS Policies for r2_usage_summary (admin only)
CREATE POLICY "Admins can view all R2 usage summary" 
ON public.r2_usage_summary 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND (subscription_tier = 'admin' OR subscription_tier = 'owner')
  )
);

-- RLS Policies for r2_plan_config (admin only)
CREATE POLICY "Admins can manage R2 plan config" 
ON public.r2_plan_config 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND (subscription_tier = 'admin' OR subscription_tier = 'owner')
  )
);

-- RLS Policies for r2_current_usage (admin only)
CREATE POLICY "Admins can view all R2 current usage" 
ON public.r2_current_usage 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND (subscription_tier = 'admin' OR subscription_tier = 'owner')
  )
);
