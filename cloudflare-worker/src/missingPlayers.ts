// Missing Players Tracking System
// This module handles storing unmapped players for later reconciliation

interface MissingPlayer {
  player_name: string;
  team: string;
  league: string;
  normalized_name: string;
  generated_id: string;
  first_seen: string;
  last_seen: string;
  count: number;
  sample_odd_id?: string;
}

// Store missing players in Supabase for manual review
export async function storeMissingPlayer(
  env: any, 
  playerName: string, 
  team: string, 
  league: string, 
  generatedId: string,
  oddId?: string
): Promise<void> {
  try {
    const missingPlayer: MissingPlayer = {
      player_name: playerName,
      team: team,
      league: league,
      normalized_name: normalizePlayerName(playerName),
      generated_id: generatedId,
      first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      count: 1,
      sample_odd_id: oddId
    };

    // Try to upsert into missing_players table
    await fetch(`${env.SUPABASE_URL}/rest/v1/missing_players`, {
      method: 'POST',
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(missingPlayer)
    });

    console.log(`📝 Stored missing player: ${playerName} (${team})`);
  } catch (error) {
    console.error(`❌ Failed to store missing player ${playerName}:`, error);
  }
}

// Normalize player name for consistent tracking
function normalizePlayerName(name: string): string {
  return name.toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize spaces
    .replace(/\s(jr|sr|iii|iv|v)$/i, '') // Remove suffixes
    .trim();
}

// Get missing players for manual review
export async function getMissingPlayers(env: any, limit: number = 100): Promise<MissingPlayer[]> {
  try {
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/missing_players?order=count.desc&limit=${limit}`, {
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch missing players: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Failed to fetch missing players:', error);
    return [];
  }
}
