-- Fix has_role function calls with proper CASCADE handling

-- Drop all dependent triggers and functions
DROP TRIGGER IF EXISTS check_role_escalation ON public.user_roles CASCADE;
DROP TRIGGER IF EXISTS prevent_unauthorized_role_escalation ON public.user_roles CASCADE;
DROP TRIGGER IF EXISTS protect_owner_role ON public.user_roles CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;

DROP FUNCTION IF EXISTS public.prevent_unauthorized_role_escalation() CASCADE;
DROP FUNCTION IF EXISTS public.protect_owner_role() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Recreate prevent_unauthorized_role_escalation with proper type casting
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.subscription_tier = 'admin' OR subscription_tier = 'owner')
    RAISE EXCEPTION 'Only administrators can grant moderator role';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.user_id = auth.uid() THEN
    RAISE EXCEPTION 'Users cannot change their own role';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER prevent_unauthorized_role_escalation
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_unauthorized_role_escalation();

-- Recreate protect_owner_role with proper type casting
CREATE OR REPLACE FUNCTION public.protect_owner_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE target_has_owner_role BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.user_id AND subscription_tier = 'owner')
  IF NEW.subscription_tier = 'owner')
    RAISE EXCEPTION 'Owner role cannot be granted';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.subscription_tier = 'owner')
    RAISE EXCEPTION 'Owner role cannot be modified';
  END IF;
  IF TG_OP = 'DELETE' AND OLD.subscription_tier = 'owner')
    RAISE EXCEPTION 'Owner role cannot be removed';
  END IF;
  IF NEW.subscription_tier = 'admin' OR subscription_tier = 'owner')
    RAISE EXCEPTION 'Only the owner can grant admin role';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER protect_owner_role
  BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.protect_owner_role();

-- Recreate handle_new_user with proper type casting
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::app_role);
  
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();