// Database-backed team registry for dynamic team resolution
// Replaces hardcoded team mappings with database-driven approach

import { supabaseFetch } from "./supabaseFetch";

export type TeamInfo = {
  name: string;
  abbr: string;
  logo: string | null;
  aliases: string[];
};

const norm = (s?: string | null): string =>
  (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

// Cache for team registries by league
const registryCache = new Map<string, Record<string, TeamInfo>>();
const cacheExpiry = new Map<string, number>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function buildTeamRegistry(league: string, env: any): Promise<Record<string, TeamInfo>> {
  const cacheKey = league.toLowerCase();
  const now = Date.now();
  
  // Check cache first
  if (registryCache.has(cacheKey) && cacheExpiry.get(cacheKey)! > now) {
    console.log(`[teamRegistry] cache_hit league=${league}`);
    return registryCache.get(cacheKey)!;
  }

  console.log(`[teamRegistry] building registry for league=${league}`);

  try {
    const { data, error } = await supabaseFetch(env, `teams?league=eq.${league.toLowerCase()}`);

    if (error) {
      console.error("[teamRegistry] supabase_error", error);
      return {};
    }

    const reg: Record<string, TeamInfo> = {};
    (data ?? []).forEach((t: any) => {
      const aliases = Array.isArray(t.aliases) ? t.aliases.map(norm) : [];
      const info: TeamInfo = {
        name: t.team_name,
        abbr: t.abbreviation,
        logo: t.logo_url ?? null,
        aliases,
      };
      
      // Add canonical name mapping
      reg[norm(t.team_name)] = info;
      
      // Add alias mappings
      aliases.forEach(a => { 
        reg[a] = info; 
      });
      
      // Add abbreviation mapping
      reg[norm(t.abbreviation)] = info;
    });

    // Cache the result
    registryCache.set(cacheKey, reg);
    cacheExpiry.set(cacheKey, now + CACHE_TTL);

    console.log(`[teamRegistry] loaded=${Object.keys(reg).length} league=${league}`);
    console.log(`[teamRegistry] sample_keys=${Object.keys(reg).slice(0, 5).join(', ')}`);
    
    return reg;
  } catch (error) {
    console.error(`[teamRegistry] error building registry for ${league}:`, error);
    return {};
  }
}

export function resolveTeam(reg: Record<string, TeamInfo>, raw: string | null | undefined): TeamInfo | null {
  if (!raw) return null;
  
  const key = norm(raw);
  const result = reg[key] ?? null;
  
  if (result) {
    console.log(`[teamRegistry] resolved "${raw}" -> "${result.abbr}" (${result.name})`);
  } else {
    console.log(`[teamRegistry] unresolved "${raw}" (key: "${key}")`);
  }
  
  return result;
}

// Clear cache (useful for testing or forced refresh)
export function clearTeamRegistryCache(): void {
  registryCache.clear();
  cacheExpiry.clear();
  console.log("[teamRegistry] cache cleared");
}

// Get cache stats for debugging
export function getCacheStats(): { leagues: string[], totalKeys: number } {
  const leagues = Array.from(registryCache.keys());
  const totalKeys = Array.from(registryCache.values()).reduce((sum, reg) => sum + Object.keys(reg).length, 0);
  return { leagues, totalKeys };
}
