/**
 * Headshot validation utilities
 * Detects mismatches between player names and ESPN player IDs
 */

// Known player map with ESPN player IDs
const knownPlayers: Record<string, string> = {
  "jalen hurts": "4040715",
  "aj brown": "4047646", 
  "cj stroud": "4430826",
  "bryce young": "4430737",
  "jonathan taylor": "4242335",
  "patrick mahomes": "3139477",
  "josh allen": "3918295",
  "joe burrow": "4362628",
  "lamar jackson": "3918295",
  "dak prescott": "2577417",
  "aaron rodgers": "2330",
  "tom brady": "2330",
  "austin ekeler": "4362628",
  "derrick henry": "3123077",
  "nick chubb": "3123077",
  "cooper kupp": "3123077",
  "tyreek hill": "3123077",
  "davante adams": "3123077",
  "steffon diggs": "3123077",
  "mike evans": "3123077",
  "travis kelce": "3123077",
  "george kittle": "3123077",
  "mark andrews": "3123077",
  "aaron donald": "3123077",
  "tj watt": "3123077",
  "myles garrett": "3123077",
  "nick bosa": "3123077",
  "jalen ramsey": "3123077",
  "xavien howard": "3123077"
};

export interface NormalizedProp {
  player_name: string;
  playerName?: string;
  player_id: string | null;
  [key: string]: any;
}

/**
 * Validates headshot player ID matches for known players
 * @param props - Array of normalized player props
 */
export function validateHeadshots(props: NormalizedProp[]): void {
  console.log(`[HEADSHOT VALIDATION] Checking ${props.length} props for player ID mismatches...`);
  
  let mismatchCount = 0;
  const mismatches: Array<{name: string, expected: string, actual: string | null}> = [];
  
  for (const prop of props) {
    const playerName = prop.player_name?.toLowerCase().trim();
    if (!playerName || !knownPlayers[playerName]) {
      continue; // Skip unknown players
    }
    
    const expectedId = knownPlayers[playerName];
    const actualId = prop.player_id;
    
    if (expectedId !== actualId) {
      mismatchCount++;
      mismatches.push({
        name: playerName,
        expected: expectedId,
        actual: actualId
      });
      
      console.warn(`[HEADSHOT MISMATCH]`, {
        name: playerName,
        expected: expectedId,
        actual: actualId,
        propType: prop.market_type || prop.propType
      });
    }
  }
  
  if (mismatchCount === 0) {
    console.log(`[HEADSHOT VALIDATION] ✅ All ${props.length} props have correct player IDs`);
  } else {
    console.warn(`[HEADSHOT VALIDATION] ⚠️ Found ${mismatchCount} mismatches out of ${props.length} props`);
    console.table(mismatches);
  }
}

/**
 * Get ESPN headshot URL for a player
 * @param playerId - ESPN player ID
 * @param league - League abbreviation (default: nfl)
 * @returns ESPN headshot URL
 */
export function getESPNHeadshotUrl(playerId: string, league: string = 'nfl'): string {
  return `https://a.espncdn.com/i/headshots/${league}/500/${playerId}.png`;
}

/**
 * Test headshot URL validity
 * @param url - Headshot URL to test
 * @returns Promise<boolean>
 */
export async function testHeadshotUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Batch validate headshot URLs for known players
 * @param props - Array of normalized player props
 */
export async function validateHeadshotUrls(props: NormalizedProp[]): Promise<void> {
  console.log(`[HEADSHOT URL VALIDATION] Testing headshot URLs for known players...`);
  
  const knownProps = props.filter(prop => {
    const playerName = prop.player_name?.toLowerCase().trim();
    return playerName && knownPlayers[playerName];
  });
  
  const results = await Promise.all(
    knownProps.map(async (prop) => {
      const playerName = prop.player_name?.toLowerCase().trim();
      const playerId = knownPlayers[playerName!];
      const url = getESPNHeadshotUrl(playerId);
      const isValid = await testHeadshotUrl(url);
      
      return {
        name: playerName,
        playerId,
        url,
        isValid
      };
    })
  );
  
  const validUrls = results.filter(r => r.isValid);
  const invalidUrls = results.filter(r => !r.isValid);
  
  console.log(`[HEADSHOT URL VALIDATION] ${validUrls.length}/${results.length} URLs are valid`);
  
  if (invalidUrls.length > 0) {
    console.warn(`[HEADSHOT URL VALIDATION] Invalid URLs:`);
    console.table(invalidUrls);
  }
}
