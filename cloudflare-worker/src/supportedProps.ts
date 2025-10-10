// supportedProps.ts
import { createClient } from "@supabase/supabase-js";

let supabase: any = null;
export type SupportedProps = Record<string, Set<string>>;

export async function initializeSupportedProps(supabaseUrl: string, supabaseKey: string) {
  supabase = createClient(supabaseUrl, supabaseKey);
  return await loadSupportedProps();
}

export async function loadSupportedProps(): Promise<SupportedProps> {
  if (!supabase) {
    console.warn("⚠️ Supabase client not initialized for supported props");
    return {};
  }

  try {
    const { data, error } = await supabase
      .from("player_game_logs")
      .select("league, prop_type");

    if (error) {
      console.error("❌ Failed to load supported props:", error);
      return {};
    }

    const map: SupportedProps = {};
    data?.forEach((row: any) => {
      if (!row.league || !row.prop_type) return;
      
      const league = row.league.toLowerCase();
      if (!map[league]) map[league] = new Set();
      map[league].add(row.prop_type.toLowerCase());
    });

    // Log summary
    Object.entries(map).forEach(([league, props]) => {
      console.log(`📊 ${league.toUpperCase()}: ${props.size} supported prop types`);
    });

    console.log("✅ Supported props loaded for leagues:", Object.keys(map));
    return map;
  } catch (error) {
    console.error("❌ Error loading supported props:", error);
    return {};
  }
}

export function getSupportedPropsForLeague(supportedProps: SupportedProps, league: string): Set<string> {
  return supportedProps[league.toLowerCase()] || new Set();
}

export function isPropTypeSupported(supportedProps: SupportedProps, league: string, propType: string): boolean {
  const leagueProps = getSupportedPropsForLeague(supportedProps, league);
  return leagueProps.has(propType.toLowerCase());
}
