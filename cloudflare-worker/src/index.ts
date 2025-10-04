/**
 * Statpedia Multi-Market API - Cloudflare Worker
 * Clean mapping with guaranteed field structure for UI compatibility
 */

interface Env {
  PLAYER_PROPS_CACHE?: R2Bucket;
  SPORTSGAMEODDS_API_KEY: string;
  CACHE_TTL_SECONDS: string;
  MAX_EVENTS_PER_REQUEST: string;
  MAX_PROPS_PER_REQUEST: string;
}

const BASE_URL = "https://api.sportsgameodds.com/v2";

// Types
type BookData = {
  odds?: string;
  overUnder?: string;
  lastUpdatedAt?: string;
  available?: boolean;
  deeplink?: string;
};

type MarketSide = {
  oddID: string;
  opposingOddID?: string;
  marketName: string;
  statID: string;          // e.g. "passing_attempts"
  statEntityID: string;    // e.g. "JOE_FLACCO_1_NFL"
  periodID: string;        // e.g. "game"
  betTypeID: string;       // e.g. "ou"
  sideID: "over" | "under" | "yes" | "no";
  playerID?: string;       // present for player props
  started?: boolean;
  ended?: boolean;
  cancelled?: boolean;
  bookOddsAvailable?: boolean;
  fairOddsAvailable?: boolean;
  fairOdds?: string;       // e.g. "+104"
  bookOdds?: string;       // e.g. "-110"
  fairOverUnder?: string;  // e.g. "29.5"
  bookOverUnder?: string;  // e.g. "29.5"
  openFairOdds?: string;
  openBookOdds?: string;
  openFairOverUnder?: string;
  openBookOverUnder?: string;
  scoringSupported?: boolean;
  byBookmaker?: Record<string, BookData>;
};

type SportsGameOddsEvent = {
  eventID: string;
  leagueID: string;        // "NFL"
  sportID: string;         // "FOOTBALL"
  teams: {
    home: { names: { long: string; short: string } };
    away: { names: { long: string; short: string } };
  };
  scheduled: string;
  odds: Record<string, MarketSide>;  // keyed by oddID
  players: Record<string, { playerID: string; teamID: string; firstName: string; lastName: string; name: string }>;
};

function buildUpstreamUrl(path: string, params: URLSearchParams) {
  const url = new URL(path, BASE_URL);
  url.searchParams.set('oddsAvailable', 'true');

  ['league', 'date', 'bookmakerID', 'oddIDs'].forEach(k => {
    const v = params.get(k);
    if (v) url.searchParams.set(k, v);
  });
  return url.toString();
}

// Normalization functions
function normalizeEvent(ev: SportsGameOddsEvent) {
  const players = ev.players || {};
  const oddsDict = ev.odds || {};

  // Group markets by statID + playerID + periodID + betTypeID
  const groups: Record<string, MarketSide[]> = {};
  for (const oddID in oddsDict) {
    const m = oddsDict[oddID];
    const key = [
      m.statID || "",
      m.playerID || "",     // empty means team market; we still group it
      m.periodID || "",
      m.betTypeID || "",
    ].join("|");
    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
  }

  // Split into player props vs team props by presence of playerID
  const playerProps: any[] = [];
  const teamProps: any[] = [];

  for (const key in groups) {
    const markets = groups[key];
    const hasPlayer = markets.some(mm => !!mm.playerID);

    if (hasPlayer) {
      const normalized = normalizePlayerGroup(markets, players);
      if (normalized) playerProps.push(normalized);
    } else {
      const normalized = normalizeTeamGroup(markets);
      if (normalized) teamProps.push(normalized);
    }
  }

  return {
    eventID: ev.eventID,
    leagueID: ev.leagueID,
    start_time: ev.scheduled,
    home_team: ev.teams.home.names.long,
    away_team: ev.teams.away.names.long,
    team_props: teamProps,
    player_props: playerProps,
  };
}

function normalizePlayerGroup(markets: MarketSide[], players: SportsGameOddsEvent["players"]) {
  // Expect one Over and one Under side
  const over = markets.find(m => String(m.sideID).toLowerCase() === "over" || String(m.sideID).toLowerCase() === "yes");
  const under = markets.find(m => String(m.sideID).toLowerCase() === "under" || String(m.sideID).toLowerCase() === "no");

  // Use any side present to derive base fields
  const base = over || under;
  if (!base) return null;

  const player = base.playerID ? players[base.playerID] : undefined;
  const playerName = player?.name || cleanPlayerNameFromMarketName(base.marketName);
  const marketType = formatStatID(base.statID);

  // Resolve line: prefer bookOverUnder (string), fallback to fairOverUnder
  const lineStr = firstDefined(over?.bookOverUnder, under?.bookOverUnder, over?.fairOverUnder, under?.fairOverUnder);
  const line = lineStr != null ? parseFloat(lineStr) : null;

  // Collect all books across both sides
  const books: { bookmaker: string; side: string; price: string; line: number | null; deeplink?: string }[] = [];
  for (const side of [over, under]) {
    if (!side) continue;
    const byBook = side.byBookmaker || {};
    for (const [book, data] of Object.entries(byBook)) {
      const ln = firstDefined(data.overUnder, side.bookOverUnder, side.fairOverUnder);
      books.push({
        bookmaker: book,
        side: String(side.sideID).toLowerCase(),
        price: data.odds ?? side.bookOdds ?? side.fairOdds ?? "",
        line: ln != null ? parseFloat(ln as string) : null,
        deeplink: data.deeplink,
      });
    }
  }

  // Pick best odds per side
  const best_over = pickBest(books.filter(b => b.side === "over" || b.side === "yes"));
  const best_under = pickBest(books.filter(b => b.side === "under" || b.side === "no"));

  return {
    player_name: playerName,
    teamID: player?.teamID ?? null,
    market_type: marketType,
    line,
    best_over,
    best_under,
    books,
    // optional: include oddIDs for tracing
    oddIDs: {
      over: over?.oddID ?? null,
      under: under?.oddID ?? null,
      opposingOver: over?.opposingOddID ?? null,
      opposingUnder: under?.opposingOddID ?? null,
    },
    status: {
      started: !!(over?.started || under?.started),
      ended: !!(over?.ended || under?.ended),
      cancelled: !!(over?.cancelled || under?.cancelled),
    },
  };
}

function normalizeTeamGroup(markets: MarketSide[]) {
  // Team markets may have different shapes, but we can follow similar logic
  const over = markets.find(m => String(m.sideID).toLowerCase() === "over" || String(m.sideID).toLowerCase() === "yes");
  const under = markets.find(m => String(m.sideID).toLowerCase() === "under" || String(m.sideID).toLowerCase() === "no");
  const base = over || under;
  if (!base) return null;

  const marketType = formatStatID(base.statID);
  const lineStr = firstDefined(over?.bookOverUnder, under?.bookOverUnder, over?.fairOverUnder, under?.fairOverUnder);
  const line = lineStr != null ? parseFloat(lineStr) : null;

  const books: { bookmaker: string; side: string; price: string; line: number | null; deeplink?: string }[] = [];
  for (const side of [over, under]) {
    if (!side) continue;
    const byBook = side.byBookmaker || {};
    for (const [book, data] of Object.entries(byBook)) {
      const ln = firstDefined(data.overUnder, side.bookOverUnder, side.fairOverUnder);
      books.push({
        bookmaker: book,
        side: String(side.sideID).toLowerCase(),
        price: data.odds ?? side.bookOdds ?? side.fairOdds ?? "",
        line: ln != null ? parseFloat(ln as string) : null,
        deeplink: data.deeplink,
      });
    }
  }

  const best_over = pickBest(books.filter(b => b.side === "over" || b.side === "yes"));
  const best_under = pickBest(books.filter(b => b.side === "under" || b.side === "no"));

  return {
    market_type: marketType,
    line,
    best_over,
    best_under,
    books,
    oddIDs: {
      over: over?.oddID ?? null,
      under: under?.oddID ?? null,
      opposingOver: over?.opposingOddID ?? null,
      opposingUnder: under?.opposingOddID ?? null,
    },
    status: {
      started: !!(over?.started || under?.started),
      ended: !!(over?.ended || under?.ended),
      cancelled: !!(over?.cancelled || under?.cancelled),
    },
  };
}

// Helper functions
function formatStatID(statID: string) {
  return (statID || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function cleanPlayerNameFromMarketName(marketName: string) {
  // Fallback only; prefer players[playerID].name
  // E.g. "Joe Flacco Passing Attempts Over/Under" -> "Joe Flacco"
  return (marketName || "").replace(/\s+(Passing|Rushing|Receiving|Attempts|Yards|Touchdowns).*$/i, "");
}

function firstDefined<T>(...vals: (T | undefined | null)[]) {
  for (const v of vals) {
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

// Rank best American odds for bettor value:
// - For positive odds, higher is better (e.g., +120 > +110)
// - For negative odds, closer to zero is better (e.g., -105 > -120)
function compareAmericanOdds(a: string, b: string) {
  const na = parseInt(a, 10);
  const nb = parseInt(b, 10);
  if (isNaN(na) && isNaN(nb)) return 0;
  if (isNaN(na)) return -1;
  if (isNaN(nb)) return 1;

  // Convert to payout multiplier for fair comparison
  const payoutA = na > 0 ? 1 + na / 100 : 1 + 100 / Math.abs(na);
  const payoutB = nb > 0 ? 1 + nb / 100 : 1 + 100 / Math.abs(nb);
  return payoutA - payoutB;
}

function pickBest(entries: { price: string }[]) {
  if (!entries.length) return null;
  // Sort descending by bettor payout
  const sorted = entries.sort((x, y) => compareAmericanOdds(x.price, y.price)).reverse();
  return sorted[0];
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const startTime = Date.now();
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const url = new URL(request.url);
      const pathname = url.pathname;
      const searchParams = url.searchParams;
      
      // Handle /api/odds endpoint
      if (pathname === '/api/odds') {
        const league = searchParams.get('league');
        const date = searchParams.get('date');
        if (!league || !date) {
          return new Response(JSON.stringify({ error: 'Missing league or date' }), { 
            status: 400, 
            headers: corsHeaders 
          });
        }

        const upstreamUrl = buildUpstreamUrl('/events', searchParams);
        const headers = new Headers({ 'x-api-key': env.SPORTSGAMEODDS_API_KEY });

        try {
          const res = await fetch(upstreamUrl, { headers });
          if (!res.ok) {
            return new Response(JSON.stringify({ 
              error: 'SportsGameOdds upstream error', 
              status: res.status 
            }), { 
              status: 502, 
              headers: corsHeaders 
            });
          }
          const data = await res.json();

          // Strictly filter NFL events, then normalize
          console.log('Raw API response:', JSON.stringify(data, null, 2));
          const rawEvents = data.data || [];
          console.log('Raw events count:', rawEvents.length);
          
          const nflEvents = rawEvents.filter((ev: any) => String(ev.leagueID).toUpperCase() === "NFL");
          console.log('NFL events count:', nflEvents.length);
          
          const events = nflEvents.map(normalizeEvent);
          console.log('Normalized events count:', events.length);

          // Conditional caching: shorter TTL until player props appear
          const hasPlayerProps = events.some(ev => (ev.player_props?.length || 0) > 0);
          const ttl = hasPlayerProps ? 1800 : 300;

          return new Response(JSON.stringify({ events }), {
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'Cache-Control': `public, max-age=${ttl}`
            }
          });
        } catch (e: any) {
          return new Response(JSON.stringify({ 
            error: 'Fetch failed', 
            details: e?.message 
          }), { 
            status: 500, 
            headers: corsHeaders 
          });
        }
      }
      
      // Handle legacy /api/player-props endpoint
      const sport = searchParams.get('sport') || 'nfl';
      const endpoint = searchParams.get('endpoint') || 'player-props';
      const forceRefresh = searchParams.get('forceRefresh') === 'true';
      
      console.log(`🚀 ${endpoint} API Request: ${sport}${forceRefresh ? ' (force refresh)' : ''}`);
      
      const cacheKey = `${endpoint}-${sport}`;
      const cacheTtlSeconds = 300;

      // Check cache first (if R2 is available)
      if (!forceRefresh && env.PLAYER_PROPS_CACHE) {
        const cachedData = await env.PLAYER_PROPS_CACHE.get(cacheKey);
        if (cachedData) {
          console.log(`✅ Cache hit for ${cacheKey}`);
          const cachedJson = await cachedData.text();
          return new Response(cachedJson, {
            headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
          });
        }
      }

      console.log('Fetching fresh data from API...');

      // Call SportsGameOdds v2/events endpoint for props
      const legacyParams = new URLSearchParams();
      legacyParams.set('sport', sport);
      legacyParams.set('markets', 'player_props');
      const apiUrl = buildUpstreamUrl('/events', legacyParams);

      const apiResponse = await fetch(apiUrl, {
        headers: {
          'x-api-key': env.SPORTSGAMEODDS_API_KEY,
          'Content-Type': 'application/json',
        },
      });

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error(`❌ API Error ${apiResponse.status}:`, errorText);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: `API returned ${apiResponse.status}: ${errorText}`,
            data: []
          }),
          { status: apiResponse.status, headers: corsHeaders }
        );
      }

      const data = await apiResponse.json();
      console.log(`✅ API success: ${data?.data?.length || 0} events`);

      // Map to the UI's expected schema
      const props = data.data.flatMap((event: any) => {
        const homeTeam = event.teams?.home?.names?.short || event.teams?.home?.names?.medium || 'UNK';
        const awayTeam = event.teams?.away?.names?.short || event.teams?.away?.names?.medium || 'UNK';
        const homeTeamFull = event.teams?.home?.names?.long || homeTeam;
        const awayTeamFull = event.teams?.away?.names?.long || awayTeam;
        
        // Extract player props from odds
        const playerProps: any[] = [];
        
        for (const [propKey, propData] of Object.entries(event.odds || {})) {
          if (!propData || typeof propData !== 'object') continue;
          
          const prop = propData as any;
          
          // Skip team-level props (all, away, home) for player props
          if (['all', 'away', 'home'].includes(prop.statEntityID?.toLowerCase())) {
            continue;
          }
          
          // Look for player props (those with statEntityID that aren't team-level)
          if (!prop.statEntityID || prop.statEntityID.length < 3) {
            continue;
          }
          
          // Skip if not over/under prop
          if (!['over', 'under'].includes(prop.sideID)) {
            continue;
          }
          
          // Parse player name from statEntityID
          const playerName = prop.statEntityID
            .replace(/_1_NFL$/, '').replace(/_1_MLB$/, '').replace(/_1_NBA$/, '').replace(/_1_NHL$/, '').replace(/_1_WNBA$/, '')
            .replace(/_/g, ' ')
            .split(' ')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
          
          // Format prop type
          const propType = prop.statID?.replace(/_/g, ' ').replace(/\+/g, ' + ')
            .split(' ')
            .map((word: string) => {
              if (word.match(/[a-z][A-Z]/)) {
                return word.replace(/([a-z])([A-Z])/g, '$1 $2');
              }
              return word;
            })
            .join(' ')
            .split(' ')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ') || 'Unknown Prop';
          
          // Extract line and odds from bookmakers
          let line = 0;
          let overOdds = null;
          let underOdds = null;
          const availableSportsbooks: string[] = [];
          const allSportsbookOdds: any[] = [];
          
          for (const [bookmakerId, bookmakerData] of Object.entries(prop.byBookmaker || {})) {
            if (!bookmakerData || typeof bookmakerData !== 'object') continue;
            
            const bookmaker = bookmakerData as any;
            if (bookmaker.overUnder) {
              line = parseFloat(bookmaker.overUnder);
            }
            
            if (bookmaker.odds) {
              const odds = parseFloat(bookmaker.odds);
              if (prop.sideID === 'over') {
                overOdds = odds;
              } else if (prop.sideID === 'under') {
                underOdds = odds;
              }
            }
            
            availableSportsbooks.push(bookmakerId);
            allSportsbookOdds.push({
              sportsbook: bookmakerId,
              line: line,
              overOdds: prop.sideID === 'over' ? parseFloat(bookmaker.odds || '0') : null,
              underOdds: prop.sideID === 'under' ? parseFloat(bookmaker.odds || '0') : null,
              lastUpdate: bookmaker.lastUpdatedAt || new Date().toISOString()
            });
          }
          
          // Only add if we have both over and under odds
          if (overOdds !== null && underOdds !== null && line > 0) {
            playerProps.push({
              // Required fields for your UI
              id: `${event.eventID}-${prop.statEntityID}-${prop.statID}`,
              playerId: prop.statEntityID,
              playerName: playerName,
              team: homeTeamFull, // Simplified - using home team for now
              opponent: awayTeamFull,
              propType: propType,
              line: line,

              overOdds: overOdds,
              underOdds: underOdds,

              confidence: 0.5,       // fallback
              expectedValue: 0,      // fallback

              gameDate: event.scheduled?.split('T')[0] || new Date().toISOString().split('T')[0],
              gameTime: event.scheduled || new Date().toISOString(),
              sport: sport,

              availableSportsbooks: availableSportsbooks,

              // Extra but still required
              teamAbbr: homeTeam,
              opponentAbbr: awayTeam,
              gameId: event.eventID,
              
              // Additional fields for compatibility
              allSportsbookOdds: allSportsbookOdds,
              available: true,
              awayTeam: awayTeamFull,
              homeTeam: homeTeamFull,
              betType: 'player_prop',
              isExactAPIData: true,
              lastUpdate: new Date().toISOString(),
              marketName: prop.marketName || propType,
              market: prop.marketName || propType,
              marketId: prop.oddID || '',
              period: 'full_game',
              statEntity: prop.statEntityID
            });
          }
        }
        
        return playerProps;
      });

      console.log(`✅ Mapped ${props.length} player props`);

      // Create response
      const response = {
        success: true,
        data: props,
        cached: false,
        cacheKey,
        responseTime: Date.now() - startTime,
        totalEvents: data.data?.length || 0,
        totalProps: props.length
      };

      // Store in cache (if R2 is available)
      const responseJson = JSON.stringify(response);
      if (env.PLAYER_PROPS_CACHE) {
        try {
          await env.PLAYER_PROPS_CACHE.put(cacheKey, responseJson, {
        expirationTtl: cacheTtlSeconds,
      });
        } catch (cacheError) {
          console.warn('Cache storage failed:', cacheError);
        }
      }

      return new Response(responseJson, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' }
      });

    } catch (error) {
      console.error('❌ Error:', error);
      
      return new Response(JSON.stringify({
        success: false,
        data: [],
        cached: false,
        cacheKey: '',
        responseTime: Date.now() - startTime,
        totalEvents: 0,
        totalProps: 0,
        error: error.message || 'Unknown error'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  },
};
