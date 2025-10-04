-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS public.account_terminations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  terminated_by UUID REFERENCES auth.users(id),
  reason TEXT,
  terminated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reinstated_at TIMESTAMP WITH TIME ZONE,
  reinstated_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.banned_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address_type TEXT NOT NULL CHECK (address_type IN ('ip', 'mac')),
  address_value TEXT NOT NULL,
  banned_by UUID REFERENCES auth.users(id),
  reason TEXT,
  banned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(address_type, address_value)
);

CREATE TABLE IF NOT EXISTS public.discord_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  discord_id TEXT NOT NULL UNIQUE,
  discord_username TEXT,
  server_joined BOOLEAN DEFAULT false,
  linked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  subscription_extended BOOLEAN DEFAULT false,
  extension_granted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.subscription_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  extension_type TEXT NOT NULL,
  days_extended INTEGER NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reason TEXT
);

CREATE TABLE IF NOT EXISTS public.admin_actions_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  target_user_id UUID,
  details JSONB,
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.account_terminations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banned_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions_audit ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Only admins and owner can view terminations" ON public.account_terminations;
DROP POLICY IF EXISTS "Only admins and owner can manage terminations" ON public.account_terminations;
DROP POLICY IF EXISTS "Only admins and owner can view banned addresses" ON public.banned_addresses;
DROP POLICY IF EXISTS "Only admins and owner can manage banned addresses" ON public.banned_addresses;
DROP POLICY IF EXISTS "Users can view own Discord link" ON public.discord_links;
DROP POLICY IF EXISTS "Users can create own Discord link" ON public.discord_links;
DROP POLICY IF EXISTS "Admins can view all Discord links" ON public.discord_links;
DROP POLICY IF EXISTS "Users can view own extensions" ON public.subscription_extensions;
DROP POLICY IF EXISTS "Admins can view all extensions" ON public.subscription_extensions;
DROP POLICY IF EXISTS "Only admins and owner can view audit logs" ON public.admin_actions_audit;
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_actions_audit;

-- Create policies
CREATE POLICY "Only admins and owner can view terminations"
  ON public.account_terminations FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner'));

CREATE POLICY "Only admins and owner can manage terminations"
  ON public.account_terminations FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner'));

CREATE POLICY "Only admins and owner can view banned addresses"
  ON public.banned_addresses FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner'));

CREATE POLICY "Only admins and owner can manage banned addresses"
  ON public.banned_addresses FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner'));

CREATE POLICY "Users can view own Discord link"
  ON public.discord_links FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own Discord link"
  ON public.discord_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all Discord links"
  ON public.discord_links FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner'));

CREATE POLICY "Users can view own extensions"
  ON public.subscription_extensions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all extensions"
  ON public.subscription_extensions FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner'));

CREATE POLICY "Only admins and owner can view audit logs"
  ON public.admin_actions_audit FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner'));

CREATE POLICY "Admins can insert audit logs"
  ON public.admin_actions_audit FOR INSERT
  WITH CHECK (auth.uid() = admin_id);

-- Functions and triggers
CREATE OR REPLACE FUNCTION public.is_owner(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT has_role(_user_id, 'owner'); $$;

CREATE OR REPLACE FUNCTION public.protect_owner_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE target_has_owner_role BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'owner') INTO target_has_owner_role;
  IF NEW.role = 'owner' AND NOT target_has_owner_role THEN
    RAISE EXCEPTION 'Owner role cannot be granted';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.role = 'owner' THEN
    RAISE EXCEPTION 'Owner role cannot be modified';
  END IF;
  IF TG_OP = 'DELETE' AND OLD.role = 'owner' THEN
    RAISE EXCEPTION 'Owner role cannot be removed';
  END IF;
  IF NEW.role = 'admin' AND NOT public.is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Only the owner can grant admin role';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_owner_role_trigger ON public.user_roles;
CREATE TRIGGER protect_owner_role_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.protect_owner_role();

CREATE OR REPLACE FUNCTION public.protect_owner_account()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF public.is_owner(NEW.user_id) THEN
    RAISE EXCEPTION 'Owner account cannot be terminated';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_owner_from_termination ON public.account_terminations;
CREATE TRIGGER protect_owner_from_termination
  BEFORE INSERT ON public.account_terminations
  FOR EACH ROW EXECUTE FUNCTION public.protect_owner_account();

CREATE OR REPLACE FUNCTION public.prevent_unauthorized_role_escalation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.role = 'moderator' AND NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner')) THEN
    RAISE EXCEPTION 'Only administrators can grant moderator role';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.user_id = auth.uid() THEN
    RAISE EXCEPTION 'Users cannot change their own role';
  END IF;
  RETURN NEW;
END;
$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_account_terminations_user_id ON public.account_terminations(user_id);
CREATE INDEX IF NOT EXISTS idx_account_terminations_is_active ON public.account_terminations(is_active);
CREATE INDEX IF NOT EXISTS idx_banned_addresses_value ON public.banned_addresses(address_value);
CREATE INDEX IF NOT EXISTS idx_discord_links_user_id ON public.discord_links(user_id);
CREATE INDEX IF NOT EXISTS idx_discord_links_discord_id ON public.discord_links(discord_id);
CREATE INDEX IF NOT EXISTS idx_subscription_extensions_user_id ON public.subscription_extensions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_audit_admin_id ON public.admin_actions_audit(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_audit_target_user_id ON public.admin_actions_audit(target_user_id);