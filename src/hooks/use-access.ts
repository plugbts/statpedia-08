import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessFeature } from "@/lib/auth/access";
import { hasPro, hasPremium, normalizeTier } from "@/lib/auth/subscriptions";
import { isAdmin, isMod, isOwner } from "@/lib/auth/roles";

export function useAccess() {
  const { user, userSubscription, isAuthenticated } = useAuth();

  const role = user?.role || "user";
  const sub = normalizeTier(userSubscription);

  return useMemo(
    () => ({
      // raw
      role,
      subscription: sub,
      isAuthenticated,

      // role booleans
      isOwner: isOwner(role),
      isAdmin: isAdmin(role),
      isMod: isMod(role),

      // subscription booleans
      hasPro: hasPro(sub),
      hasPremium: hasPremium(sub),

      // feature check
      can: (feature: Parameters<typeof canAccessFeature>[0]["feature"]) =>
        canAccessFeature({ role, subscription: sub, feature }),
    }),
    [role, sub, isAuthenticated],
  );
}
