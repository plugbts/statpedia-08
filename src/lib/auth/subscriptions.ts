export type SubscriptionTier = "free" | "pro" | "premium";

export const normalizeTier = (tier?: string): SubscriptionTier => {
  const t = (tier || "free").toLowerCase();
  if (t === "pro" || t === "premium") return t;
  return "free";
};

export const hasPro = (tier?: string) => {
  const t = normalizeTier(tier);
  return t === "pro" || t === "premium";
};

export const hasPremium = (tier?: string) => normalizeTier(tier) === "premium";
