// supportedProps.ts (NO SUPABASE)
// Minimal placeholder implementation that returns an empty map.

export type SupportedProps = Record<string, Set<string>>;

export async function initializeSupportedProps(_supabaseUrl: string, _supabaseKey: string) {
  console.log("⚠️ initializeSupportedProps called, but Supabase is removed. Returning empty set.");
  return await loadSupportedProps();
}

export async function loadSupportedProps(): Promise<SupportedProps> {
  console.log("ℹ️ loadSupportedProps: Supabase removed. Returning empty supported props map.");
  return {};
}

export function getSupportedPropsForLeague(
  supportedProps: SupportedProps,
  league: string,
): Set<string> {
  return supportedProps[league.toLowerCase()] || new Set();
}

export function isPropTypeSupported(
  supportedProps: SupportedProps,
  league: string,
  propType: string,
): boolean {
  const leagueProps = getSupportedPropsForLeague(supportedProps, league);
  return leagueProps.has(propType.toLowerCase());
}
