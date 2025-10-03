-- Table for tracking account terminations
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

ALTER TABLE public.account_terminations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins and owner can view terminations"
  ON public.account_terminations FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'owner')
  );

CREATE POLICY "Only admins and owner can manage terminations"
  ON public.account_terminations FOR ALL
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'owner')
  );

-- Table for IP and MAC address bans
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

ALTER TABLE public.banned_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins and owner can view banned addresses"
  ON public.banned_addresses FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'owner')
  );

CREATE POLICY "Only admins and owner can manage banned addresses"
  ON public.banned_addresses FOR ALL
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'owner')
  );

-- Table for Discord account linking
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

ALTER TABLE public.discord_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own Discord link"
  ON public.discord_links FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own Discord link"
  ON public.discord_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all Discord links"
  ON public.discord_links FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'owner')
  );

-- Table for tracking subscription extensions
CREATE TABLE IF NOT EXISTS public.subscription_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  extension_type TEXT NOT NULL,
  days_extended INTEGER NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reason TEXT
);

ALTER TABLE public.subscription_extensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own extensions"
  ON public.subscription_extensions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all extensions"
  ON public.subscription_extensions FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'owner')
  );

-- Table for admin actions audit
CREATE TABLE IF NOT EXISTS public.admin_actions_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  target_user_id UUID,
  details JSONB,
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.admin_actions_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins and owner can view audit logs"
  ON public.admin_actions_audit FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'owner')
  );

CREATE POLICY "Admins can insert audit logs"
  ON public.admin_actions_audit FOR INSERT
  WITH CHECK (auth.uid() = admin_id);

-- Function to check if user is owner
CREATE OR REPLACE FUNCTION public.is_owner(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(_user_id, 'owner');
$$;

-- Function to prevent owner role manipulation
CREATE OR REPLACE FUNCTION public.protect_owner_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_has_owner_role BOOLEAN;
BEGIN
  -- Check if target user has owner role
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = NEW.user_id AND subscription_tier = 'owner')
  ) INTO target_has_owner_role;

  -- Prevent anyone from granting owner role
  IF NEW.subscription_tier = 'owner')
    RAISE EXCEPTION 'Owner role cannot be granted';
  END IF;

  -- Prevent modification of owner role records
  IF TG_OP = 'UPDATE' AND OLD.subscription_tier = 'owner')
    RAISE EXCEPTION 'Owner role cannot be modified';
  END IF;

  -- Prevent deletion of owner role
  IF TG_OP = 'DELETE' AND OLD.subscription_tier = 'owner')
    RAISE EXCEPTION 'Owner role cannot be removed';
  END IF;

  -- Only owner can grant admin role
  IF NEW.subscription_tier = 'admin' OR subscription_tier = 'owner')
    RAISE EXCEPTION 'Only the owner can grant admin role';
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for owner role protection
DROP TRIGGER IF EXISTS protect_owner_role_trigger ON public.user_roles;
CREATE TRIGGER protect_owner_role_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_owner_role();

-- Function to prevent actions on owner account
CREATE OR REPLACE FUNCTION public.protect_owner_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Prevent termination of owner account
  IF public.is_owner(NEW.user_id) THEN
    RAISE EXCEPTION 'Owner account cannot be terminated';
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to protect owner from termination
CREATE TRIGGER protect_owner_from_termination
  BEFORE INSERT ON public.account_terminations
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_owner_account();

-- Update prevent_unauthorized_role_escalation to handle owner
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only owner can grant admin role (checked in protect_owner_role)
  
  -- Admins can grant moderator role
  IF NEW.role = 'moderator' AND NOT (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'owner')
  ) THEN
    RAISE EXCEPTION 'Only administrators can grant moderator role';
  END IF;
  
  -- Prevent users from changing their own role
  IF TG_OP = 'UPDATE' AND OLD.user_id = auth.uid() THEN
    RAISE EXCEPTION 'Users cannot change their own role';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_account_terminations_user_id ON public.account_terminations(user_id);
CREATE INDEX IF NOT EXISTS idx_account_terminations_is_active ON public.account_terminations(is_active);
CREATE INDEX IF NOT EXISTS idx_banned_addresses_value ON public.banned_addresses(address_value);
CREATE INDEX IF NOT EXISTS idx_discord_links_user_id ON public.discord_links(user_id);
CREATE INDEX IF NOT EXISTS idx_discord_links_discord_id ON public.discord_links(discord_id);
CREATE INDEX IF NOT EXISTS idx_subscription_extensions_user_id ON public.subscription_extensions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_audit_admin_id ON public.admin_actions_audit(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_audit_target_user_id ON public.admin_actions_audit(target_user_id);