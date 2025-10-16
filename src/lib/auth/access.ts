import { hasPro, hasPremium, normalizeTier, SubscriptionTier } from "./subscriptions";
import { hasRoleAtLeast } from "./roles";

export type FeatureId =
  | "strikeout-center"
  | "most-likely"
  | "parlay-gen"
  | "analytics"
  | "backtest"
  | "admin"
  | "sync-test";

export type AccessDecision = {
  allowed: boolean;
  reason?: string;
  needed?: string;
};

export function canAccessFeature(params: {
  role?: string;
  subscription?: string;
  feature: FeatureId;
}): AccessDecision {
  const role = (params.role || "user").toLowerCase();
  const sub = normalizeTier(params.subscription);

  // Owner can do everything
  if (role === "owner") return { allowed: true };

  switch (params.feature) {
    case "parlay-gen":
      if (hasPremium(sub)) return { allowed: true };
      if (hasRoleAtLeast(role, "admin")) return { allowed: true };
      return { allowed: false, reason: "Premium required", needed: "premium" };
    case "strikeout-center":
    case "most-likely":
    case "analytics":
      if (hasPro(sub)) return { allowed: true };
      if (hasRoleAtLeast(role, "mod")) return { allowed: true };
      return { allowed: false, reason: "Pro required", needed: "pro" };
    case "backtest":
      if (hasPro(sub) || hasRoleAtLeast(role, "mod")) return { allowed: true };
      return { allowed: false, reason: "Pro required", needed: "pro" };
    case "admin":
      if (hasRoleAtLeast(role, "admin")) return { allowed: true };
      return { allowed: false, reason: "Admin required", needed: "admin" };
    case "sync-test":
      if (role === "owner") return { allowed: true };
      return { allowed: false, reason: "Owner required", needed: "owner" };
    default:
      return { allowed: true };
  }
}
