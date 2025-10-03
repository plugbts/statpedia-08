-- Phase 1: Fix profiles table RLS policies
-- Drop existing overly permissive policy
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles;

-- Create restricted policies for profiles
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view friends' profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.friendships
    WHERE (user_id = auth.uid() AND friend_id = profiles.user_id AND status = 'accepted')
       OR (friend_id = auth.uid() AND user_id = profiles.user_id AND status = 'accepted')
  )
);

-- Phase 2: Fix promo_codes table RLS policies
-- Drop existing overly permissive policy
CREATE POLICY "Everyone can view active promo codes" ON public.promo_codes;

-- Restrict promo code viewing - users should not see all details
CREATE POLICY "Users cannot directly view promo codes"
ON public.promo_codes
FOR SELECT
USING (false);

-- Only admins can manage promo codes (existing policy is fine)

-- Phase 3: Add audit logging for role changes
CREATE TABLE IF NOT EXISTS public.role_change_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  changed_by UUID REFERENCES auth.users(id),
  target_user UUID NOT NULL,
  old_role app_role,
  new_role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.role_change_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
ON public.role_change_audit
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for role change audit
CREATE OR REPLACE FUNCTION public.audit_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.role != NEW.role THEN
    INSERT INTO public.role_change_audit (changed_by, target_user, old_role, new_role)
    VALUES (auth.uid(), NEW.user_id, OLD.role, NEW.role);
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.role_change_audit (changed_by, target_user, old_role, new_role)
    VALUES (auth.uid(), NEW.user_id, NULL, NEW.role);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_role_change
AFTER INSERT OR UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.audit_role_changes();

-- Phase 4: Prevent non-admins from granting admin role
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only existing admins can grant admin role
  IF NEW.subscription_tier = 'admin' OR subscription_tier = 'owner')
    RAISE EXCEPTION 'Only administrators can grant admin role';
  END IF;
  
  -- Prevent users from changing their own role
  IF TG_OP = 'UPDATE' AND OLD.user_id = auth.uid() THEN
    RAISE EXCEPTION 'Users cannot change their own role';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_role_escalation
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_unauthorized_role_escalation();