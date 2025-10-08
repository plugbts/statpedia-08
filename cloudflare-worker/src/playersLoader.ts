// Players Loader - Auto-populate PLAYER_ID_MAP from Supabase
import { supabaseFetch } from "./supabaseFetch";
import { normalizeName, generateNameVariations } from "./normalizeName";

interface Player {
  player_id: string;
  full_name: string;
  team: string;
  league: string;
  position?: string;
}

export async function loadPlayerIdMap(env: any): Promise<Record<string, string>> {
  try {
    console.log('🔄 Loading players from Supabase...');
    
    // Pull all players (paginate if large)
    const players = await supabaseFetch(env, "players", {
      query: "?select=player_id,full_name,team,league,position&limit=10000"
    });

    if (!players || !Array.isArray(players)) {
      console.error('❌ Failed to load players from Supabase');
      return {};
    }

    const map: Record<string, string> = {};
    let loadedCount = 0;
    let skippedCount = 0;

    for (const player of players as Player[]) {
      if (!player.full_name || !player.player_id) {
        skippedCount++;
        continue;
      }

      // Create primary mapping with normalized name
      const normalizedKey = normalizeName(player.full_name);
      map[normalizedKey] = player.player_id;
      loadedCount++;

      // Add variations for better matching
      const variations = generateNameVariations(player.full_name);
      for (const variation of variations) {
        if (variation !== normalizedKey && !map[variation]) {
          map[variation] = player.player_id;
        }
      }
    }

    console.log(`✅ Loaded ${loadedCount} players into PLAYER_ID_MAP (${Object.keys(map).length} total mappings)`);
    console.log(`⚠️ Skipped ${skippedCount} players due to missing data`);
    
    return map;
  } catch (error) {
    console.error('❌ Error loading player ID map:', error);
    return {};
  }
}

// Cache the player map to avoid repeated API calls
let playerMapCache: Record<string, string> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export async function getCachedPlayerIdMap(env: any): Promise<Record<string, string>> {
  const now = Date.now();
  
  // Return cached map if still valid
  if (playerMapCache && (now - cacheTimestamp) < CACHE_TTL) {
    return playerMapCache;
  }
  
  // Load fresh map and update cache
  playerMapCache = await loadPlayerIdMap(env);
  cacheTimestamp = now;
  
  return playerMapCache;
}

// Load players by league for targeted updates
export async function loadPlayerIdMapByLeague(env: any, league: string): Promise<Record<string, string>> {
  try {
    console.log(`🔄 Loading ${league} players from Supabase...`);
    
    const players = await supabaseFetch(env, "players", {
      query: `?select=player_id,full_name,team,league,position&league=eq.${league}&limit=5000`
    });

    if (!players || !Array.isArray(players)) {
      console.error(`❌ Failed to load ${league} players from Supabase`);
      return {};
    }

    const map: Record<string, string> = {};
    let loadedCount = 0;

    for (const player of players as Player[]) {
      if (!player.full_name || !player.player_id) continue;

      const normalizedKey = normalizeName(player.full_name);
      map[normalizedKey] = player.player_id;
      loadedCount++;

      // Add variations
      const variations = generateNameVariations(player.full_name);
      for (const variation of variations) {
        if (variation !== normalizedKey && !map[variation]) {
          map[variation] = player.player_id;
        }
      }
    }

    console.log(`✅ Loaded ${loadedCount} ${league} players (${Object.keys(map).length} total mappings)`);
    return map;
  } catch (error) {
    console.error(`❌ Error loading ${league} player ID map:`, error);
    return {};
  }
}

// Update missing players table with successful mappings
export async function updateMissingPlayersSuccess(env: any, playerName: string, canonicalId: string): Promise<void> {
  try {
    const normalizedName = normalizeName(playerName);
    
    // Remove from missing players table since we now have a mapping
    await fetch(`${env.SUPABASE_URL}/rest/v1/missing_players?normalized_name=eq.${normalizedName}`, {
      method: 'DELETE',
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`✅ Removed ${playerName} from missing players (mapped to ${canonicalId})`);
  } catch (error) {
    console.error(`❌ Failed to update missing players for ${playerName}:`, error);
  }
}
