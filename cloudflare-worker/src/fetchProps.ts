// Props fetching with integrated player name cleaning
// Fetches props from database and applies name cleaning

import { supabaseFetch } from "./supabaseFetch";
import { cleanPlayerNames, type RawPropRow, type CleanPropRow } from "./playerNames";
import { normalizeTeams, type RawRow, type CleanTeamRow } from "./teams";

/**
 * Fetch props for a specific league and date with cleaned player names
 */
export async function fetchPropsForDate(
  env: any, 
  league: string, 
  dateISO: string, 
  viewName: string = "player_props_api_view_with_streaks"
): Promise<CleanPropRow[]> {
  
  const { data, error } = await supabaseFetch(env, `${viewName}?league=eq.${league.toLowerCase()}&prop_date=eq.${dateISO}`);

  if (error) {
    console.error("[worker:fetch] supabase_error", error);
    throw error;
  }

  console.log(`[worker:fetch] fetched_rows=${data?.length ?? 0} league=${league} date=${dateISO}`);

  const withNames = cleanPlayerNames(data ?? [], "[worker:names]");
  return withNames;
}

/**
 * Fetch props for multiple leagues and dates with cleaned player names
 */
export async function fetchPropsForMultipleDates(
  env: any,
  league: string,
  dates: string[],
  viewName: string = "player_props_api_view_with_streaks"
): Promise<CleanPropRow[]> {
  
  const allProps: CleanPropRow[] = [];
  
  for (const dateISO of dates) {
    try {
      const dayProps = await fetchPropsForDate(env, league, dateISO, viewName);
      allProps.push(...dayProps);
    } catch (error) {
      console.warn(`⚠️ Failed to fetch props for ${league} on ${dateISO}:`, error);
    }
  }
  
  return allProps;
}

/**
 * Fetch props for a date range with cleaned player names
 */
export async function fetchPropsForDateRange(
  env: any,
  league: string,
  startDate: string,
  endDate: string,
  viewName: string = "player_props_api_view_with_streaks"
): Promise<CleanPropRow[]> {
  
  const { data, error } = await supabaseFetch(
    env, 
    `${viewName}?league=eq.${league.toLowerCase()}&prop_date=gte.${startDate}&prop_date=lte.${endDate}`
  );

  if (error) {
    console.error("[worker:fetch] supabase_error", error);
    throw error;
  }

  console.log(`[worker:fetch] fetched_rows=${data?.length ?? 0} league=${league} date_range=${startDate}_to_${endDate}`);

  const withNames = cleanPlayerNames(data ?? [], "[worker:names]");
  return withNames;
}

/**
 * Fetch recent props with cleaned player names
 */
export async function fetchRecentProps(
  env: any,
  league: string,
  days: number = 7,
  viewName: string = "player_props_api_view_with_streaks"
): Promise<CleanPropRow[]> {
  
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  return fetchPropsForDateRange(env, league, startDate, endDate, viewName);
}

/**
 * Fetch props with both player name cleaning and team normalization
 */
export async function fetchPropsWithFullCleaning(
  env: any,
  league: string,
  dateISO: string,
  viewName: string = "player_props_api_view_with_streaks"
): Promise<CleanTeamRow[]> {
  
  const { data, error } = await supabaseFetch(env, `${viewName}?league=eq.${league.toLowerCase()}&prop_date=eq.${dateISO}`);

  if (error) {
    console.error("[worker:fetch] supabase_error", error);
    throw error;
  }

  console.log(`[worker:fetch] fetched_rows=${data?.length ?? 0} league=${league} date=${dateISO}`);

  // First clean player names
  const withNames = cleanPlayerNames(data ?? [], "[worker:names]");
  console.log(`[worker:fetch] player names cleaned: ${withNames.length} props`);

  // Then normalize teams
  const withTeams = normalizeTeams(withNames, "[worker:teams]");
  console.log(`[worker:fetch] teams normalized: ${withTeams.length} props`);

  return withTeams;
}
