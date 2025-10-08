// Resilient API fetcher with tiered fallbacks for empty NFL/NBA props
// Handles cases where primary queries return no data

function buildUrl(base: string, params: Record<string, string | number | boolean | undefined>) {
  const u = new URL(base);
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .forEach(([k, v]) => u.searchParams.set(k, String(v)));
  return u.toString();
}

export async function fetchEventsWithProps(env: any, leagueID: "NFL" | "NBA", opts?: {
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
  season?: number;   // e.g., 2025
  oddIDs?: string;   // comma-separated oddIDs with PLAYER_ID wildcard
  limit?: number;
}) {
  const base = "https://api.sportsgameodds.com/v2/events";
  const url = buildUrl(base, {
    apiKey: env.SPORTS_API_KEY,
    leagueID,
    oddsAvailable: true,
    dateFrom: opts?.dateFrom,
    dateTo: opts?.dateTo,
    season: opts?.season,
    oddIDs: opts?.oddIDs,
    limit: opts?.limit ?? 250,
  });
  
  console.log(`🔍 Fetching ${leagueID} events from: ${url}`);
  
  const res = await fetch(url);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`SGO ${leagueID} events failed: ${res.status} ${errorText}`);
  }
  
  const data = await res.json();
  console.log(`📊 ${leagueID} API returned ${data.length || 0} events`);
  
  return data; // returns events with markets and player props attached
}

// Resilient fetcher with tiered fallbacks
export async function fetchEventsWithFallbacks(env: any, leagueID: "NFL" | "NBA", season: number = 2025): Promise<any[]> {
  console.log(`🎯 Starting resilient fetch for ${leagueID} ${season}`);
  
  // Get current date for date range calculations
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  // Primary: Query events with player props for the current season window
  try {
    console.log(`🎯 Primary: Current season ${season} with date range`);
    const primaryEvents = await fetchEventsWithProps(env, leagueID, {
      season,
      dateFrom: twoWeeksAgo,
      dateTo: twoWeeksFromNow,
      oddIDs: "PLAYER_ID", // Fetch all player props
      limit: 250
    });
    
    if (primaryEvents && primaryEvents.length > 0) {
      console.log(`✅ Primary successful: ${primaryEvents.length} events`);
      return primaryEvents;
    }
    console.log(`⚠️ Primary returned 0 events`);
  } catch (error) {
    console.error(`❌ Primary failed:`, error);
  }
  
  // Fallback A: Widen date range (±14 days)
  try {
    console.log(`🔄 Fallback A: Widened date range`);
    const fallbackAEvents = await fetchEventsWithProps(env, leagueID, {
      season,
      dateFrom: twoWeeksAgo,
      dateTo: twoWeeksFromNow,
      oddIDs: "PLAYER_ID",
      limit: 500
    });
    
    if (fallbackAEvents && fallbackAEvents.length > 0) {
      console.log(`✅ Fallback A successful: ${fallbackAEvents.length} events`);
      return fallbackAEvents;
    }
    console.log(`⚠️ Fallback A returned 0 events`);
  } catch (error) {
    console.error(`❌ Fallback A failed:`, error);
  }
  
  // Fallback B: Switch to last season
  try {
    const lastSeason = season - 1;
    console.log(`🔄 Fallback B: Last season ${lastSeason}`);
    const fallbackBEvents = await fetchEventsWithProps(env, leagueID, {
      season: lastSeason,
      oddIDs: "PLAYER_ID",
      limit: 250
    });
    
    if (fallbackBEvents && fallbackBEvents.length > 0) {
      console.log(`✅ Fallback B successful: ${fallbackBEvents.length} events from ${lastSeason}`);
      return fallbackBEvents;
    }
    console.log(`⚠️ Fallback B returned 0 events`);
  } catch (error) {
    console.error(`❌ Fallback B failed:`, error);
  }
  
  // Fallback C: Drop extra filters, keep only leagueID + oddsAvailable=true
  try {
    console.log(`🔄 Fallback C: Minimal filters`);
    const fallbackCEvents = await fetchEventsWithProps(env, leagueID, {
      oddsAvailable: true,
      limit: 100
    });
    
    if (fallbackCEvents && fallbackCEvents.length > 0) {
      console.log(`✅ Fallback C successful: ${fallbackCEvents.length} events`);
      return fallbackCEvents;
    }
    console.log(`⚠️ Fallback C returned 0 events`);
  } catch (error) {
    console.error(`❌ Fallback C failed:`, error);
  }
  
  // All fallbacks failed
  console.log(`❌ All fallbacks failed for ${leagueID} ${season}`);
  return [];
}

// Utility function to get date range for current season
export function getSeasonDateRange(leagueID: "NFL" | "NBA", season: number): { dateFrom: string; dateTo: string } {
  if (leagueID === "NFL") {
    // NFL season typically runs September to January
    return {
      dateFrom: `${season}-09-01`,
      dateTo: `${season + 1}-02-01`
    };
  } else if (leagueID === "NBA") {
    // NBA season typically runs October to April
    return {
      dateFrom: `${season}-10-01`,
      dateTo: `${season + 1}-05-01`
    };
  }
  
  // Default to current year
  return {
    dateFrom: `${season}-01-01`,
    dateTo: `${season}-12-31`
  };
}

// Enhanced event processing with better error handling
export async function processEventsWithProps(events: any[], leagueID: "NFL" | "NBA"): Promise<{
  totalEvents: number;
  eventsWithProps: number;
  totalProps: number;
  processedProps: any[];
}> {
  let eventsWithProps = 0;
  let totalProps = 0;
  const processedProps: any[] = [];
  
  for (const event of events) {
    if (!event.markets || !Array.isArray(event.markets)) {
      continue;
    }
    
    let eventHasProps = false;
    
    for (const market of event.markets) {
      if (!market.odds || !Array.isArray(market.odds)) {
        continue;
      }
      
      for (const odd of market.odds) {
        // Check if this is a player prop (contains PLAYER_ID)
        if (odd.playerID && odd.playerID !== 'PLAYER_ID') {
          eventHasProps = true;
          totalProps++;
          
          // Process the prop
          const processedProp = {
            ...odd,
            eventId: event.id,
            eventDate: event.date,
            marketId: market.id,
            marketName: market.name,
            league: leagueID,
            processedAt: new Date().toISOString()
          };
          
          processedProps.push(processedProp);
        }
      }
    }
    
    if (eventHasProps) {
      eventsWithProps++;
    }
  }
  
  console.log(`📊 Processed ${events.length} events: ${eventsWithProps} with props, ${totalProps} total props`);
  
  return {
    totalEvents: events.length,
    eventsWithProps,
    totalProps,
    processedProps
  };
}
