-- Remove the friend_profiles_secure view to eliminate security definer warning
-- The RLS policies on the profiles table are already sufficient for security

DROP VIEW IF EXISTS public.friend_profiles_secure;