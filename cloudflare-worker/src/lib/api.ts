// Resilient Event Fetcher with Fallback Strategies
// Always returns events/props even if primary query is empty

function buildUrl(base: string, params: Record<string, string | number | boolean | undefined>) {
  const u = new URL(base);
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .forEach(([k, v]) => u.searchParams.set(k, String(v)));
  return u.toString();
}

export async function fetchEventsWithProps(env: any, leagueID: string, opts?: {
  dateFrom?: string;
  dateTo?: string;
  season?: number;
  oddIDs?: string;
  limit?: number;
}) {
  const base = "https://api.sportsgameodds.com/v2/events";
  const url = buildUrl(base, {
    apiKey: env.SPORTSGAMEODDS_API_KEY,
    leagueID,
    oddsAvailable: true,
    dateFrom: opts?.dateFrom,
    dateTo: opts?.dateTo,
    season: opts?.season,
    oddIDs: opts?.oddIDs,
    limit: opts?.limit ?? 250,
  });
  
  console.log(`🔍 Fetching: ${url}`);
  
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Events fetch failed (${res.status}): ${errorText}`);
    }
    
    const data = await res.json();
    console.log(`✅ Fetched ${data?.length || 0} events for ${leagueID}`);
    return data || [];
    
  } catch (error) {
    console.error(`❌ API fetch error for ${leagueID}:`, error);
    throw error;
  }
}

// Helper functions for date manipulation
function ymd(d: Date): string { 
  return d.toISOString().slice(0, 10); 
}

function addDays(d: Date, n: number): Date { 
  const x = new Date(d); 
  x.setUTCDate(x.getUTCDate() + n); 
  return x; 
}

export async function getEventsWithFallbacks(env: any, leagueID: string, season: number, oddIDs?: string): Promise<{ events: any[]; tier: number }> {
  const today = new Date();
  const d7Past = ymd(addDays(today, -7));
  const d7Future = ymd(addDays(today, +7));
  const d14Past = ymd(addDays(today, -14));
  const d14Future = ymd(addDays(today, +14));

  console.log(`🔄 Starting fallback strategy for ${leagueID} ${season}`);

  // Tier 1: Current season, ±7 days
  try {
    console.log(`Tier 1: ${leagueID} ${season} (±7 days)`);
    let events = await fetchEventsWithProps(env, leagueID, { 
      season, 
      dateFrom: d7Past, 
      dateTo: d7Future, 
      oddIDs 
    });
    if (events?.length) {
      console.log(`✅ Tier 1 success: ${events.length} events`);
      return { events, tier: 1 };
    }
  } catch (error) {
    console.warn(`⚠️ Tier 1 failed for ${leagueID}:`, error.message);
  }

  // Tier 2: Current season, ±14 days
  try {
    console.log(`Tier 2: ${leagueID} ${season} (±14 days)`);
    let events = await fetchEventsWithProps(env, leagueID, { 
      season, 
      dateFrom: d14Past, 
      dateTo: d14Future, 
      oddIDs 
    });
    if (events?.length) {
      console.log(`✅ Tier 2 success: ${events.length} events`);
      return { events, tier: 2 };
    }
  } catch (error) {
    console.warn(`⚠️ Tier 2 failed for ${leagueID}:`, error.message);
  }

  // Tier 3: Previous season, ±14 days
  try {
    console.log(`Tier 3: ${leagueID} ${season - 1} (±14 days)`);
    let events = await fetchEventsWithProps(env, leagueID, { 
      season: season - 1, 
      dateFrom: d14Past, 
      dateTo: d14Future, 
      oddIDs 
    });
    if (events?.length) {
      console.log(`✅ Tier 3 success: ${events.length} events`);
      return { events, tier: 3 };
    }
  } catch (error) {
    console.warn(`⚠️ Tier 3 failed for ${leagueID}:`, error.message);
  }

  // Tier 4: Current season, ±14 days, no oddIDs filter
  try {
    console.log(`Tier 4: ${leagueID} ${season} (±14 days, no oddIDs)`);
    let events = await fetchEventsWithProps(env, leagueID, { 
      season, 
      dateFrom: d14Past, 
      dateTo: d14Future 
    });
    if (events?.length) {
      console.log(`✅ Tier 4 success: ${events.length} events`);
      return { events, tier: 4 };
    }
  } catch (error) {
    console.warn(`⚠️ Tier 4 failed for ${leagueID}:`, error.message);
  }

  // Tier 5: Previous season, ±14 days, no oddIDs filter
  try {
    console.log(`Tier 5: ${leagueID} ${season - 1} (±14 days, no oddIDs)`);
    let events = await fetchEventsWithProps(env, leagueID, { 
      season: season - 1, 
      dateFrom: d14Past, 
      dateTo: d14Future 
    });
    if (events?.length) {
      console.log(`✅ Tier 5 success: ${events.length} events`);
      return { events, tier: 5 };
    }
  } catch (error) {
    console.warn(`⚠️ Tier 5 failed for ${leagueID}:`, error.message);
  }

  console.warn(`❌ All fallback tiers failed for ${leagueID} ${season}`);
  return { events: [], tier: 0 };
}

// Enhanced fallback with more aggressive strategies
export async function getEventsWithAggressiveFallbacks(env: any, leagueID: string, season: number, oddIDs?: string): Promise<{ events: any[]; tier: number }> {
  // Try the standard fallbacks first
  const standardResult = await getEventsWithFallbacks(env, leagueID, season, oddIDs);
  if (standardResult.events.length > 0) {
    return standardResult;
  }

  // Additional aggressive fallbacks
  const today = new Date();
  const d30Past = ymd(addDays(today, -30));
  const d30Future = ymd(addDays(today, +30));
  const d90Past = ymd(addDays(today, -90));
  const d90Future = ymd(addDays(today, +90));

  // Tier 6: Current season, ±30 days
  try {
    console.log(`Tier 6: ${leagueID} ${season} (±30 days)`);
    let events = await fetchEventsWithProps(env, leagueID, { 
      season, 
      dateFrom: d30Past, 
      dateTo: d30Future, 
      oddIDs 
    });
    if (events?.length) {
      console.log(`✅ Tier 6 success: ${events.length} events`);
      return { events, tier: 6 };
    }
  } catch (error) {
    console.warn(`⚠️ Tier 6 failed for ${leagueID}:`, error.message);
  }

  // Tier 7: Current season, ±90 days
  try {
    console.log(`Tier 7: ${leagueID} ${season} (±90 days)`);
    let events = await fetchEventsWithProps(env, leagueID, { 
      season, 
      dateFrom: d90Past, 
      dateTo: d90Future, 
      oddIDs 
    });
    if (events?.length) {
      console.log(`✅ Tier 7 success: ${events.length} events`);
      return { events, tier: 7 };
    }
  } catch (error) {
    console.warn(`⚠️ Tier 7 failed for ${leagueID}:`, error.message);
  }

  // Tier 8: Previous season, ±90 days
  try {
    console.log(`Tier 8: ${leagueID} ${season - 1} (±90 days)`);
    let events = await fetchEventsWithProps(env, leagueID, { 
      season: season - 1, 
      dateFrom: d90Past, 
      dateTo: d90Future, 
      oddIDs 
    });
    if (events?.length) {
      console.log(`✅ Tier 8 success: ${events.length} events`);
      return { events, tier: 8 };
    }
  } catch (error) {
    console.warn(`⚠️ Tier 8 failed for ${leagueID}:`, error.message);
  }

  // Tier 9: No date filters, current season
  try {
    console.log(`Tier 9: ${leagueID} ${season} (no date filters)`);
    let events = await fetchEventsWithProps(env, leagueID, { 
      season, 
      oddIDs 
    });
    if (events?.length) {
      console.log(`✅ Tier 9 success: ${events.length} events`);
      return { events, tier: 9 };
    }
  } catch (error) {
    console.warn(`⚠️ Tier 9 failed for ${leagueID}:`, error.message);
  }

  // Tier 10: No date filters, previous season
  try {
    console.log(`Tier 10: ${leagueID} ${season - 1} (no date filters)`);
    let events = await fetchEventsWithProps(env, leagueID, { 
      season: season - 1, 
      oddIDs 
    });
    if (events?.length) {
      console.log(`✅ Tier 10 success: ${events.length} events`);
      return { events, tier: 10 };
    }
  } catch (error) {
    console.warn(`⚠️ Tier 10 failed for ${leagueID}:`, error.message);
  }

  console.warn(`❌ All aggressive fallback tiers failed for ${leagueID} ${season}`);
  return { events: [], tier: 0 };
}
