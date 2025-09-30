-- Add unique constraint to display_name column in profiles table
-- First, check for existing duplicate display names and update them
UPDATE public.profiles p1
SET display_name = display_name || '_' || substring(user_id::text from 1 for 8)
WHERE EXISTS (
  SELECT 1 
  FROM public.profiles p2 
  WHERE p2.display_name = p1.display_name 
  AND p2.user_id != p1.user_id
  AND p2.created_at < p1.created_at
);

-- Add unique constraint
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_display_name_unique UNIQUE (display_name);