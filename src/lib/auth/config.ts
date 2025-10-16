// Central auth configuration
// Owner emails can also be provided via env as comma-separated list: VITE_OWNER_EMAILS

const envOwners = (import.meta as any)?.env?.VITE_OWNER_EMAILS as string | undefined;

export const OWNER_EMAILS: string[] = envOwners
  ? envOwners
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  : ["lifesplugg@gmail.com"]; // default
