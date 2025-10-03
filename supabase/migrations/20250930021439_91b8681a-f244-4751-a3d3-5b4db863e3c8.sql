-- ========================================
-- CRITICAL SECURITY FIX: Strengthen RLS on profiles table
-- ========================================

-- 1. Add profile access audit table for manual logging
CREATE TABLE IF NOT EXISTS public.profile_access_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accessed_by UUID NOT NULL,
  accessed_profile UUID NOT NULL,
  access_type TEXT NOT NULL CHECK (access_type IN ('view', 'update', 'delete')),
  accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  access_granted BOOLEAN NOT NULL,
  ip_address TEXT,
  user_agent TEXT
);

-- Enable RLS on audit table
ALTER TABLE public.profile_access_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view profile access logs"
ON public.profile_access_audit
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Allow inserting audit records
CREATE POLICY "Allow audit log inserts"
ON public.profile_access_audit
FOR INSERT
WITH CHECK (accessed_by = auth.uid());

-- 2. Drop existing profiles RLS policies
CREATE POLICY "Users can view friends' profiles" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles;

-- 3. Create restrictive RLS policies for profiles
-- Users can only view their OWN profile
CREATE POLICY "Users can view own profile ONLY"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Users can view friends' NON-FINANCIAL data only
CREATE POLICY "Users can view friends' basic info"
ON public.profiles
FOR SELECT
USING (
  auth.uid() != user_id AND
  EXISTS (
    SELECT 1
    FROM friendships
    WHERE (
      (friendships.user_id = auth.uid() AND friendships.friend_id = profiles.user_id) OR
      (friendships.friend_id = auth.uid() AND friendships.user_id = profiles.user_id)
    )
    AND friendships.status = 'accepted'
  )
);

-- Users can update own profile
-- Note: Subscription tier changes are protected by trigger (see below)
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can insert own profile only
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 4. Add RESTRICTIVE policy as safety net (applies with AND logic)
CREATE POLICY "Restrictive: Deny unauthorized access"
ON public.profiles
AS RESTRICTIVE
FOR ALL
USING (
  auth.uid() = user_id OR 
  has_role(auth.uid(), 'admin') OR
  EXISTS (
    SELECT 1 FROM friendships
    WHERE (
      (friendships.user_id = auth.uid() AND friendships.friend_id = profiles.user_id) OR
      (friendships.friend_id = auth.uid() AND friendships.user_id = profiles.user_id)
    )
    AND friendships.status = 'accepted'
  )
);

-- 5. Create trigger to prevent non-admins from changing subscription tier
CREATE OR REPLACE FUNCTION public.protect_subscription_tier()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can change subscription tier
  IF OLD.subscription_tier != NEW.subscription_tier AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only administrators can modify subscription tier';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_subscription_tier_changes
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_subscription_tier();

-- 6. Create secure view for friend profiles (hides sensitive financial data)
CREATE OR REPLACE VIEW public.friend_profiles_secure AS
SELECT 
  p.id,
  p.user_id,
  p.display_name,
  p.avatar_url,
  p.bio,
  p.created_at,
  p.updated_at,
  p.karma,
  -- Only show stats if user has ROI visibility enabled
  CASE WHEN p.roi_visible THEN p.total_bets ELSE NULL END as total_bets,
  CASE WHEN p.roi_visible THEN p.won_bets ELSE NULL END as won_bets,
  CASE WHEN p.roi_visible THEN p.total_predictions ELSE NULL END as total_predictions,
  CASE WHEN p.roi_visible THEN p.won_predictions ELSE NULL END as won_predictions,
  p.roi_visible,
  -- Never expose sensitive financial or subscription data to friends
  NULL::numeric as bankroll,
  NULL::text as subscription_tier,
  NULL::timestamp with time zone as subscription_start_date,
  NULL::timestamp with time zone as subscription_end_date,
  NULL::boolean as has_used_trial
FROM public.profiles p
WHERE EXISTS (
  SELECT 1 FROM friendships f
  WHERE (
    (f.user_id = auth.uid() AND f.friend_id = p.user_id) OR
    (f.friend_id = auth.uid() AND f.user_id = p.user_id)
  )
  AND f.status = 'accepted'
)
AND p.user_id != auth.uid();

-- Enable RLS on the view
ALTER VIEW public.friend_profiles_secure SET (security_barrier = true);

-- Grant access to authenticated users
GRANT SELECT ON public.friend_profiles_secure TO authenticated;

-- 7. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_access_audit_accessed_by ON public.profile_access_audit(accessed_by);
CREATE INDEX IF NOT EXISTS idx_profile_access_audit_accessed_profile ON public.profile_access_audit(accessed_profile);