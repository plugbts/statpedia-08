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

function buildUpstreamUrl(path: string, params: URLSearchParams) {
  const url = new URL(path, BASE_URL);
  url.searchParams.set('oddsAvailable', 'true');

  ['league', 'date', 'bookmakerID', 'oddIDs'].forEach(k => {
    const v = params.get(k);
    if (v) url.searchParams.set(k, v);
  });
  return url.toString();
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

          // Inside /api/odds handler, after fetching upstream
          const events = (data.data || [])
            .filter((ev: any) => String(ev.leagueID || ev.league).toUpperCase() === 'NFL')
            .map((ev: any) => {
              const markets = Array.isArray(ev.markets) ? ev.markets : [];

              const teamProps = markets.filter((m: any) => !m.player_name);
              const playerProps = markets.filter((m: any) => !!m.player_name);

              return {
                id: ev.eventID,
                league: ev.leagueID || ev.league,
                start_time: ev.scheduled,
                home_team: ev.teams?.home?.names?.long || ev.teams?.home?.names?.short,
                away_team: ev.teams?.away?.names?.long || ev.teams?.away?.names?.short,
                team_props: teamProps.map(normalizeMarket),
                player_props: playerProps.map(normalizeMarket),
              };
            });

          // Helper: normalize any market into a consistent shape
          function normalizeMarket(m: any) {
            // Expected shape assumptions:
            // - m.type: market type (e.g., 'passing_yards', 'anytime_touchdown')
            // - m.line: primary market line
            // - m.outcomes: [{ side: 'over'|'under'|'yes'|'no', price, bookmaker, line? }, ...]
            // - m.player_name?: player
            // - m.team?: team
            const outcomes = Array.isArray(m.outcomes) ? m.outcomes : [];

            // Select best odds across books for each side
            const best = selectBestOutcomes(outcomes);

            return {
              market_type: m.type,
              player_name: m.player_name || null,
              team: m.team || null,
              line: resolveLine(m, outcomes),
              best_over: best.over,   // { price, bookmaker, line }
              best_under: best.under, // { price, bookmaker, line }
              books: outcomes.map(o => ({
                bookmaker: o.bookmaker,
                side: o.side,
                price: o.price,
                line: o.line ?? m.line ?? null,
              })),
            };
          }

          function resolveLine(m: any, outcomes: any[]) {
            // Prefer explicit outcome line; fallback to market-level line
            const lineFromOutcome = outcomes.find(o => o.line != null)?.line;
            return lineFromOutcome ?? m.line ?? null;
          }

          function selectBestOutcomes(outcomes: any[]) {
            // Best odds for OVER: highest positive or closest to zero negative (max price)
            const overCandidates = outcomes.filter(o => ['over', 'yes'].includes(String(o.side).toLowerCase()));
            const underCandidates = outcomes.filter(o => ['under', 'no'].includes(String(o.side).toLowerCase()));

            const bestOver = overCandidates.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity))[0] || null;
            const bestUnder = underCandidates.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity))[0] || null;

            return {
              over: bestOver ? { price: bestOver.price, bookmaker: bestOver.bookmaker, line: bestOver.line ?? null } : null,
              under: bestUnder ? { price: bestUnder.price, bookmaker: bestUnder.bookmaker, line: bestUnder.line ?? null } : null,
            };
          }

          return new Response(JSON.stringify({ events }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
