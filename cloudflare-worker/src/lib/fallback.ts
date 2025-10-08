// Fallback Strategy Module
// Re-exports the fallback functions for backward compatibility

export { getEventsWithFallbacks, getEventsWithAggressiveFallbacks } from "./api";

// Additional fallback utilities
export function getFallbackTierDescription(tier: number): string {
  const descriptions: Record<number, string> = {
    0: "No data found",
    1: "Current season, ±7 days",
    2: "Current season, ±14 days", 
    3: "Previous season, ±14 days",
    4: "Current season, ±14 days (no oddIDs)",
    5: "Previous season, ±14 days (no oddIDs)",
    6: "Current season, ±30 days",
    7: "Current season, ±90 days",
    8: "Previous season, ±90 days",
    9: "Current season (no date filters)",
    10: "Previous season (no date filters)"
  };
  
  return descriptions[tier] || `Unknown tier ${tier}`;
}

export function isSuccessfulTier(tier: number): boolean {
  return tier > 0;
}

export function getTierPriority(tier: number): number {
  // Lower tier numbers have higher priority (better data quality)
  return tier > 0 ? 11 - tier : 0;
}
