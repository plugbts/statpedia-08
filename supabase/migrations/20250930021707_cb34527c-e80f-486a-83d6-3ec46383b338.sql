-- Fix security definer view warning by removing security_barrier
-- The view will still be secure because it relies on RLS policies on the profiles table

-- Drop and recreate the view without security_barrier
DROP VIEW IF EXISTS public.friend_profiles_secure;

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

-- Grant access to authenticated users
GRANT SELECT ON public.friend_profiles_secure TO authenticated;