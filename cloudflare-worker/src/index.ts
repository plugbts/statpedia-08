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

// Types reflecting your raw API structures
type Player = {
  playerID: string;
  teamID: string;
  firstName: string;
  lastName: string;
  name: string;
};

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
  statID: string;
  statEntityID: string;
  periodID: string;
  betTypeID: string;
  sideID: "over" | "under" | "yes" | "no";
  playerID?: string;
  started?: boolean;
  ended?: boolean;
  cancelled?: boolean;
  bookOddsAvailable?: boolean;
  fairOddsAvailable?: boolean;
  fairOdds?: string;
  bookOdds?: string;
  fairOverUnder?: string;
  bookOverUnder?: string;
  openFairOdds?: string;
  openBookOdds?: string;
  openFairOverUnder?: string;
  openBookOverUnder?: string;
  scoringSupported?: boolean;
  byBookmaker?: Record<string, BookData>;
};

type SGEvent = {
  eventID: string;
  leagueID: string;  // "NFL"
  sportID: string;   // "FOOTBALL"
  teams: {
    home: { names: { long: string; short: string } };
    away: { names: { long: string; short: string } };
  };
  scheduled: string;
  odds: Record<string, MarketSide>;        // keyed by oddID
  players: Record<string, Player>;         // keyed by playerID
};

// Curated list of popular NFL player prop oddIDs
const DEFAULT_NFL_PLAYER_PROPS = [
  // Passing props
  "passing_yards-PLAYER_ID-game-ou-over,passing_yards-PLAYER_ID-game-ou-under",
  "passing_touchdowns-PLAYER_ID-game-ou-over,passing_touchdowns-PLAYER_ID-game-ou-under",
  "passing_attempts-PLAYER_ID-game-ou-over,passing_attempts-PLAYER_ID-game-ou-under",
  "passing_completions-PLAYER_ID-game-ou-over,passing_completions-PLAYER_ID-game-ou-under",
  "passing_interceptions-PLAYER_ID-game-ou-over,passing_interceptions-PLAYER_ID-game-ou-under",
  
  // Rushing props
  "rushing_yards-PLAYER_ID-game-ou-over,rushing_yards-PLAYER_ID-game-ou-under",
  "rushing_attempts-PLAYER_ID-game-ou-over,rushing_attempts-PLAYER_ID-game-ou-under",
  "rushing_touchdowns-PLAYER_ID-game-ou-over,rushing_touchdowns-PLAYER_ID-game-ou-under",
  
  // Receiving props
  "receiving_yards-PLAYER_ID-game-ou-over,receiving_yards-PLAYER_ID-game-ou-under",
  "receiving_receptions-PLAYER_ID-game-ou-over,receiving_receptions-PLAYER_ID-game-ou-under",
  "receiving_touchdowns-PLAYER_ID-game-ou-over,receiving_touchdowns-PLAYER_ID-game-ou-under",
  
  // Special props
  "first_touchdown-PLAYER_ID-game-yn-yes,first_touchdown-PLAYER_ID-game-yn-no",
  "anytime_touchdown-PLAYER_ID-game-yn-yes,anytime_touchdown-PLAYER_ID-game-yn-no"
].join(",");

// Build upstream URL with live markets
function buildUpstreamUrl(path: string, params: URLSearchParams) {
  const url = new URL(path, BASE_URL);

  url.searchParams.set("oddsAvailable", "true");
  
  // Handle league parameter mapping
  const league = params.get('league');
  if (league) url.searchParams.set('leagueID', league);
  
  // Handle date
  const date = params.get('date');
  if (date) url.searchParams.set('date', date);
  
  // Handle bookmakerID
  const bookmakerID = params.get('bookmakerID');
  if (bookmakerID) url.searchParams.set('bookmakerID', bookmakerID);
  
  // Handle oddIDs - use curated list if none provided and league is NFL
  let oddIDs = params.get('oddIDs');
  if (!oddIDs && league?.toUpperCase() === 'NFL') {
    oddIDs = DEFAULT_NFL_PLAYER_PROPS;
  }
  if (oddIDs) {
    url.searchParams.set('oddIDs', oddIDs);
  }

  return url.toString();
}

// Normalize one event into frontend-ready shape
function normalizeEvent(ev: SGEvent) {
  const players = ev.players || {};
  const oddsDict = ev.odds || {};

  // Group by statEntityID + statID + periodID + betTypeID (stable across sides)
  const groups: Record<string, MarketSide[]> = {};
  for (const oddID in oddsDict) {
    const m = oddsDict[oddID];
    const key = [m.statEntityID || "", m.statID || "", m.periodID || "", m.betTypeID || ""].join("|");
    (groups[key] ||= []).push(m);
  }

  const playerProps: any[] = [];
  const teamProps: any[] = [];

  for (const key in groups) {
    const markets = groups[key];
    const hasPlayer = markets.some(mm => !!mm.playerID);

    if (hasPlayer) {
      const norm = normalizePlayerGroup(markets, players);
      if (norm) playerProps.push(norm);
    } else {
      const norm = normalizeTeamGroup(markets);
      if (norm) teamProps.push(norm);
    }
  }

  return {
    eventID: ev.eventID,
    leagueID: ev.leagueID,
    start_time: ev.scheduled,
    home_team: ev.teams.home.names, // { long, short }
    away_team: ev.teams.away.names, // { long, short }
    team_props: teamProps,
    player_props: playerProps,
  };
}

// Normalize player markets (handles single-sided and empty byBookmaker)
function normalizePlayerGroup(markets: MarketSide[], players: Record<string, Player>) {
  const over = markets.find(m => isOverSide(m.sideID));
  const under = markets.find(m => isUnderSide(m.sideID));
  const base = over || under;
  if (!base) return null; // truly invalid group

  const player = base.playerID ? players[base.playerID] : undefined;
  const playerName = player?.name || extractNameFromMarket(base.marketName);
  const marketType = formatStatID(base.statID);

  const lineStr = firstDefined(over?.bookOverUnder, under?.bookOverUnder, over?.fairOverUnder, under?.fairOverUnder);
  const line = toNumberOrNull(lineStr);

  const books = collectBooks(over, under);

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

// Normalize team markets similarly
function normalizeTeamGroup(markets: MarketSide[]) {
  const over = markets.find(m => isOverSide(m.sideID));
  const under = markets.find(m => isUnderSide(m.sideID));
  const base = over || under;
  if (!base) return null;

  const marketType = formatStatID(base.statID);
  const lineStr = firstDefined(over?.bookOverUnder, under?.bookOverUnder, over?.fairOverUnder, under?.fairOverUnder);
  const line = toNumberOrNull(lineStr);

  const books = collectBooks(over, under);

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

// Collect per-book odds, and always add a consensus fallback using market-level bookOdds/bookOverUnder
function collectBooks(over?: MarketSide, under?: MarketSide) {
  const books: { bookmaker: string; side: string; price: string; line: number | null; deeplink?: string }[] = [];

  for (const side of [over, under]) {
    if (!side) continue;

    // Consensus fallback from market-level fields
    if (side.bookOdds || side.bookOverUnder) {
      books.push({
        bookmaker: "consensus",
        side: String(side.sideID).toLowerCase(),
        price: side.bookOdds ?? "",
        line: toNumberOrNull(side.bookOverUnder ?? side.fairOverUnder),
        deeplink: undefined,
      });
    }

    // Per-book odds if available
    const byBook = side.byBookmaker || {};
    for (const [book, data] of Object.entries(byBook)) {
      books.push({
        bookmaker: book,
        side: String(side.sideID).toLowerCase(),
        price: data.odds ?? side.bookOdds ?? side.fairOdds ?? "",
        line: toNumberOrNull(firstDefined(side.bookOverUnder, side.fairOverUnder, data.overUnder)),
        deeplink: data.deeplink,
      });
    }
  }

  return books;
}

function isOverSide(side: any) {
  const s = String(side || "").toLowerCase();
  return s === "over" || s === "yes";
}
function isUnderSide(side: any) {
  const s = String(side || "").toLowerCase();
  return s === "under" || s === "no";
}

function formatStatID(statID: string) {
  return (statID || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function extractNameFromMarket(marketName: string) {
  return (marketName || "").replace(/\s+(Passing|Rushing|Receiving|Attempts|Completions|Yards|Touchdowns|Interceptions|Receptions).*$/i, "");
}

function firstDefined<T>(...vals: (T | undefined | null)[]) {
  for (const v of vals) if (v !== undefined && v !== null) return v;
  return undefined;
}
function toNumberOrNull(s?: string | null) {
  if (s === undefined || s === null) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

// Pick best American odds by bettor payout multiplier
function pickBest(entries: { price: string }[]) {
  if (!entries.length) return null;
  const score = (oddsStr: string) => {
    const v = parseInt(oddsStr, 10);
    if (Number.isNaN(v)) return -Infinity;
    return v > 0 ? 1 + v / 100 : 1 + 100 / Math.abs(v);
  };
  return entries.reduce((best, cur) => (score(cur.price) > score(best.price) ? cur : best), entries[0]);
}

// Simple JSON responder
function respondJson(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Defensive wrapper: never drop an event entirely
function safeNormalizeEvent(ev: SGEvent) {
  try {
    return normalizeEvent(ev);
  } catch (err) {
    return {
      eventID: ev?.eventID ?? null,
      leagueID: ev?.leagueID ?? null,
      start_time: ev?.scheduled ?? null,
      home_team: ev?.teams?.home?.names ?? null,
      away_team: ev?.teams?.away?.names ?? null,
      team_props: [],
      player_props: [],
      _error: String(err),
    };
  }
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

        const upstreamUrl = buildUpstreamUrl('/v2/events', searchParams);
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

          const rawEvents: SGEvent[] = data?.data || [];
          const nflEvents = rawEvents.filter(ev => String(ev.leagueID).toUpperCase() === "NFL");
          const normalized = nflEvents.map(safeNormalizeEvent);

          const hasPlayerProps = normalized.some(ev => (ev.player_props?.length || 0) > 0);
          const ttl = hasPlayerProps ? 1800 : 300;

          // Temporary inline debug to verify normalization while logs aren't visible
          const debug = {
            upstream: { events: rawEvents.length },
            normalized: {
              events: normalized.length,
              playerPropsTotal: normalized.reduce((a, ev) => a + (ev.player_props?.length || 0), 0),
              teamPropsTotal: normalized.reduce((a, ev) => a + (ev.team_props?.length || 0), 0),
            },
          };

          return new Response(JSON.stringify({ 
            events: normalized,
            debug
          }), {
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
