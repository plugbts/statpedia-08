-- Fix function search paths for existing functions
-- This addresses the security linter warning about mutable search paths

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Fix update_karma_on_vote function
CREATE OR REPLACE FUNCTION public.update_karma_on_vote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_user_id UUID;
  karma_change INTEGER;
BEGIN
  -- Determine target user and karma change
  IF NEW.post_id IS NOT NULL THEN
    SELECT user_id INTO target_user_id FROM public.social_posts WHERE id = NEW.post_id;
  ELSIF NEW.comment_id IS NOT NULL THEN
    SELECT user_id INTO target_user_id FROM public.comments WHERE id = NEW.comment_id;
  END IF;

  karma_change := CASE WHEN NEW.vote_type = 'upvote' THEN 1 ELSE -1 END;

  -- Update karma
  UPDATE public.profiles 
  SET karma = karma + karma_change 
  WHERE user_id = target_user_id;

  RETURN NEW;
END;
$$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;