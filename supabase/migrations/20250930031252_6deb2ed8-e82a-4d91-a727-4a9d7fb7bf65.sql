-- Temporarily drop the protect_owner_role trigger
DROP TRIGGER IF EXISTS protect_owner_role ON public.user_roles;

-- Add owner role to plug account
INSERT INTO public.user_roles (user_id, role)
VALUES ('02b5f219-034a-4aa8-8c97-4214c7c91408', 'owner'::public.app_role)
ON CONFLICT (user_id, role) DO NOTHING;

-- Recreate the protect_owner_role trigger
CREATE TRIGGER protect_owner_role
  BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.protect_owner_role();